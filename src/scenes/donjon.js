import { AudioSys } from '../audio/audio.js';
import { prefs } from '../core/prefs.js';
import { URLS, need } from '../core/assets.js';
import { G, gx, persist, state } from '../core/save.js';
import { $, AH, AW, TEST, fmt, frSpace, rand, wait } from '../core/utils.js';
import { FRAUDE_SONG } from '../data/fraude-song.js';
import { FRAUDE } from '../data/fraude.js';
import { Fade } from '../fx/transitions.js';
import { book } from '../game/month.js';
import { charWalk, drawChar, drawShadow } from '../render/sprites.js';
import { Castle } from './castle.js';
import { setBackdrop, showOnly } from './scenes.js';
import { Talk, quiz, say } from '../story/talk.js';
import { SCRIPTS } from '../story/scripts.js';
import { Guide, refreshGuide } from '../ui/guide.js';
import { toast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { blocked } from '../ui/modals.js';

/* ================= Le cachot de la tour de l'Ordre =================
   On y finit quand la jauge de risque du mini-jeu « Fraude » est pleine ; on peut aussi y descendre depuis la tour. */
const CAGE = { x: 800, y: 612, r: 80, h: 240 };
const SPOT = { guard: [1135, 600], pascale: [575, 708], stairs: [818, 935], visit: [812, 790] };
const depth = (y) => 0.78 + 0.34 * (y - 500) / 400;

export const Donjon = {
  cv: $('donjonCv'), ctx: $('donjonCv').getContext('2d'), t: 0, people: [], cage: null, dust: [], shake: 0, music: null, talking: false, jailed: false,
  person(who, x, y, pose) { return { who, x, y, pose: pose || 'idle', pts: [], t: rand(0, 2), alpha: 1, flip: false }; },
  show(jailed) {
    state.screen = 'donjon'; Guide.hide(); this.jailed = jailed;
    showOnly('donjonScene'); setBackdrop('donjon');
    const bg = $('donjonBg'); if (bg.dataset.key !== 'donjon') { bg.src = URLS.donjon; bg.dataset.key = 'donjon'; }
    this.people = [this.person('damien', ...SPOT.guard, 'guard')];
    this.me = this.person('player', ...(jailed ? [CAGE.x, CAGE.y] : SPOT.visit), 'idle');
    this.people.push(this.me);
    this.cage = { drop: jailed ? -760 : -430, v: 0, target: jailed ? -760 : -430 };
    this.dust = []; this.renderUi(); HUD.render();
  },
  renderUi() {
    $('djTalk').hidden = this.jailed; $('djExit').hidden = this.jailed;
    $('djTitle').textContent = this.jailed ? 'Au cachot !' : "Le cachot de l'Ordre";
  },
  /* the pictures of the cachot (loaded in the background) */
  sheets() { return ['donjon', 'c31', 'c30', 'damien_happy', 'damien_think', 'damien_scared']; },
  /* ---------- free visit from the tower ---------- */
  async visit() {
    if (blocked()) return;
    state.busy = true; AudioSys.tap();
    await need(this.sheets());
    await Fade.transition(async () => { $('ordreScene').hidden = true; this.show(false); });
    state.busy = false;
    if (!G.flags.donjonSeen) { G.flags.donjonSeen = true; persist(); await this.talk(true); }
  },
  async exit() {
    if (blocked()) return;
    state.busy = true; AudioSys.tap(); this.stopMusic();
    await Fade.transition(async () => { $('donjonScene').hidden = true; Castle.show(); });
    state.busy = false; refreshGuide();
  },
  async talk(first) {
    if (blocked() || this.talking) return;
    this.talking = true; state.busy = true; AudioSys.tap();
    const d = this.people[0]; d.pose = 'point';
    await Talk.open(); await (first ? SCRIPTS.donjonHello() : SCRIPTS.donjonTalk()); await Talk.close();
    d.pose = 'guard'; state.busy = false; this.talking = false; refreshGuide();
  },
  /* ---------- caught: jail, sermon, fine ---------- */
  async jail({ loot, hits, buffer, free }) {
    state.busy = true; this.buf = buffer;
    await need(this.sheets());
    await Fade.transition(async () => { this.show(true); });
    this.playOutro();
    await wait(450);
    await this.dropCage();
    await wait(500);
    /* Pascale comes down the stairs */
    const P = this.person('pascale', ...SPOT.stairs, 'idle'); P.alpha = 0; this.people.push(P);
    await this.walk(P, [[SPOT.stairs[0], 820], SPOT.pascale]); P.pose = 'point'; P.flip = false;
    const priors = free ? 0 : (G.fraud && G.fraud.convictions) || 0;
    await Talk.open(); const right = await SCRIPTS.jailSermon(loot, priors); await Talk.close(true);
    if (right && !free) await addXP(right * 5);
    const fine = FRAUDE.jailFine + FRAUDE.jailFineStep * priors;
    await this.fineModal(loot, hits, fine, free);
    if (!free) {
      G.money -= fine; book('Amende pour fraude (cachot de l’Ordre)', -fine, 'hors', 'penalite');
      G.fraud = Object.assign(G.fraud || {}, { convictions: priors + 1, pending: null }); persist(); HUD.tweenMoney();
    }
    AudioSys.coin();
    /* freedom! */
    this.cage.target = -760; this.clang(0.5);
    await wait(900);
    this.me.pose = 'happy';
    P.pose = 'idle';
    await this.walk(this.me, [[CAGE.x, 760], SPOT.stairs]);
    this.stopMusic();
    await Fade.transition(async () => { $('donjonScene').hidden = true; Castle.show(); });
    state.busy = false;
    if (AudioSys.playing && !AudioSys.src) AudioSys.play(AudioSys.theme, 1.5);
    toast(frSpace(free ? `Mode libre : ta partie n'a pas bougé. Mais en vrai, c'était <b>${fmt(fine)} €</b> d'amende !` : `Tu es libre… et plus ${gx('léger', 'légère')} de <b>${fmt(fine)} €</b>. La fraude ne paie pas !`), 4200);
    refreshGuide();
  },
  fineModal(loot, hits, fine, free) {
    return new Promise((resolve) => {
      $('jfRows').innerHTML = frSpace(`
        <div class="jf-row"><span>Séances fictives facturées<small>${hits} séance${hits > 1 ? 's' : ''} jamais faite${hits > 1 ? 's' : ''}</small></span><b>${fmt(loot)} €</b></div>
        <div class="jf-row"><span>Saisies par la Sécu<small>Tu ne touches rien de tout ça</small></span><b class="neg">−${fmt(loot)} €</b></div>
        <div class="jf-row big"><span>Amende pour sortir du cachot<small>${free ? 'Mode libre : rien n’est débité' : (G.fraud && G.fraud.convictions) ? 'Récidive : l’amende augmente !' : 'Première fraude'}</small></span><b class="neg">−${fmt(fine)} €</b></div>`);
      $('jfNote').textContent = frSpace(FRAUDE.course);
      $('jfPay').textContent = free ? 'Sortir du cachot' : 'Payer et sortir';
      $('jailFine').hidden = false; AudioSys.stamp();
      $('jfPay').onclick = () => { AudioSys.tap(); $('jailFine').hidden = true; resolve(); };
    });
  },
  dropCage() {
    return new Promise((res) => { this.cage.target = 0; this.cage.v = 0; this.cage.onLand = res; setTimeout(res, 2500); });
  },
  walk(p, pts) { return new Promise((res) => { p.pts = pts.map((q) => q.slice()); p.done = res; setTimeout(res, 6000); }); },
  /* the cage hits the floor: a short metallic clank (noise + quickly fading inharmonic partials, no long pure tone) */
  clang(k = 1) {
    const ctx = AudioSys.ctx; if (!ctx || !prefs.sfx || !AudioSys.ok()) return;
    const t = ctx.currentTime, out = ctx.createGain(); out.gain.value = k; out.connect(AudioSys.sfxGain);
    const noise = (dur, type, freq, q, vol, at) => {
      const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 5);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = b; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
      s.connect(f); f.connect(g); g.connect(out); s.start(t + at);
    };
    noise(0.22, 'bandpass', 2600, 0.7, 0.55, 0);                       // impact
    for (let i = 0; i < 4; i++) noise(0.05, 'highpass', 4500, 0.7, 0.16, 0.07 + i * 0.055 + Math.random() * 0.02);   // chains rattling
    for (const [f, dur, v] of [[523, 0.2, 0.09], [1271, 0.14, 0.06], [2388, 0.09, 0.04], [3517, 0.06, 0.03]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * (0.98 + Math.random() * 0.04);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
    }
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';      // thud on the stone floor
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.25);
  },
  /* the end of the song, muffled, as if it came from upstairs; then the instrumental part loops (never the last ringing chord) */
  playOutro() {
    const buf = this.buf, ctx = AudioSys.ctx;
    if (!buf || !ctx || (TEST && TEST.fraude)) return;
    AudioSys.stopCurrent(0.3);
    const s = ctx.createBufferSource(); s.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    if (FRAUDE_SONG.loop) { s.loop = true; s.loopStart = FRAUDE_SONG.loop[0]; s.loopEnd = FRAUDE_SONG.loop[1]; }
    const g = ctx.createGain(); g.gain.value = prefs.music ? prefs.volume * 0.55 : 0;
    s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(ctx.currentTime + 0.1, FRAUDE_SONG.outro);
    this.music = { s, g };
  },
  stopMusic() {
    const m = this.music; this.music = null; if (!m) return;
    const t = AudioSys.ctx.currentTime; try { m.g.gain.setValueAtTime(m.g.gain.value, t); m.g.gain.linearRampToValueAtTime(0.0001, t + 0.6); m.s.stop(t + 0.7); } catch (e) {}
  },
  /* ---------- simulation & drawing (art coordinates) ---------- */
  update(dt) {
    this.t += dt; this.shake = Math.max(0, this.shake - dt);
    const cg = this.cage;
    if (cg) {
      if (cg.drop < cg.target) {
        cg.v += 2600 * dt; cg.drop = Math.min(cg.target, cg.drop + cg.v * dt);
        if (cg.drop >= cg.target && cg.target === 0) {
          this.shake = 0.5; this.clang(1);
          for (let i = 0; i < 26; i++) { const a = rand(0, Math.PI * 2); this.dust.push({ x: CAGE.x + Math.cos(a) * CAGE.r, y: CAGE.y + Math.sin(a) * CAGE.r * 0.4, vx: Math.cos(a) * rand(40, 140), vy: rand(-60, -10), r: rand(14, 30), life: 0, dur: rand(0.6, 1.2) }); }
          if (cg.onLand) { const f = cg.onLand; cg.onLand = null; f(); }
          this.me.pose = 'kneel';
        }
      } else if (cg.drop > cg.target) { cg.v = 0; cg.drop = Math.max(cg.target, cg.drop - 900 * dt); }
    }
    for (const p of this.people) {
      p.t += dt; p.alpha = Math.min(1, p.alpha + dt * 2.5);
      const tgt = p.pts[0];
      if (!tgt) { p.moving = false; if (p.done) { const f = p.done; p.done = null; f(); } continue; }
      const dx = tgt[0] - p.x, dy = tgt[1] - p.y, d = Math.hypot(dx, dy), st = 190 * dt * depth(p.y);
      if (d <= st) { p.x = tgt[0]; p.y = tgt[1]; p.pts.shift(); } else { p.x += (dx / d) * st; p.y += (dy / d) * st; p.vx = dx; p.vy = dy; }
      p.moving = true;
    }
    this.draw(dt);
  },
  draw(dt) {
    const c = this.ctx; c.clearRect(0, 0, AW, AH);
    c.save();
    if (this.shake > 0) c.translate(rand(-1, 1) * this.shake * 14, rand(-1, 1) * this.shake * 10);
    /* glow of the hot grate */
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(795, 590, 10, 795, 590, 260); g.addColorStop(0, `rgba(255,120,30,${0.22 + 0.08 * Math.sin(this.t * 3)})`); g.addColorStop(1, 'rgba(255,80,0,0)');
    c.fillStyle = g; c.fillRect(500, 380, 600, 420); c.restore();
    const cy = CAGE.y + (this.cage ? this.cage.drop : 0);
    this.drawCage(c, CAGE.x, cy, true);
    const list = this.people.slice().sort((a, b) => a.y - b.y);
    for (const p of list) {
      const s = depth(p.y) * (p.who === 'damien' ? 1.05 : p.who === 'player' ? 0.92 : 0.95);
      drawShadow(c, p.x, p.y, 40 * s, 12 * s, 0.3 * p.alpha);
      if (p.moving) { const [row, flip] = charWalk(p.who, p.vx || 0, p.vy || 1); drawChar(c, p.who, 'walk', p.t, p.x, p.y, s, { row, flip, alpha: p.alpha }); }
      else {
        let x = p.x; if (p === this.me && this.jailed && this.cage.drop === 0 && Talk.active) x += Math.sin(this.t * 30) * 1.5;
        drawChar(c, p.who, p.pose, p.t, x, p.y, s, { fps: p.who === 'damien' ? 1.2 : 0.8, alpha: p.alpha, flip: p.flip || (p.who === 'damien') });
      }
    }
    this.drawCage(c, CAGE.x, cy, false);
    for (const d of this.dust) {
      d.life += dt; d.x += d.vx * dt; d.y += d.vy * dt; const k = d.life / d.dur; if (k >= 1) continue;
      c.fillStyle = `rgba(200,170,140,${(1 - k) * 0.5})`; c.beginPath(); c.arc(d.x, d.y, d.r * (0.6 + k), 0, Math.PI * 2); c.fill();
    }
    this.dust = this.dust.filter((d) => d.life < d.dur);
    c.restore();
  },
  /* An iron cage drawn in two halves, so that the prisoner stands between the back and the front bars. */
  drawCage(c, cx, fy, back) {
    const r = CAGE.r, ry = r * 0.4, h = CAGE.h, top = fy - h, n = 14;
    c.save(); c.lineCap = 'round';
    const iron = back ? '#1c1a1f' : '#2e2a31', hl = 'rgba(255,165,80,0.6)';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, sa = Math.sin(a); if ((sa < 0) !== back) continue;
      const x = cx + Math.cos(a) * r, yb = fy + sa * ry, yt = top + sa * ry;
      c.strokeStyle = iron; c.lineWidth = back ? 5 : 8; c.beginPath(); c.moveTo(x, yb); c.lineTo(x, yt); c.stroke();
      if (!back) { c.strokeStyle = hl; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 2.5, yb - 4); c.lineTo(x - 2.5, yt + 4); c.stroke(); }
    }
    for (const yy of [fy, fy - h * 0.48, top]) {
      c.strokeStyle = iron; c.lineWidth = back ? 7 : 11; c.beginPath(); c.ellipse(cx, yy, r, ry, 0, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI); c.stroke();
      if (!back) { c.strokeStyle = hl; c.lineWidth = 2.5; c.beginPath(); c.ellipse(cx, yy - 3, r, ry, 0, 0.15, Math.PI - 0.15); c.stroke(); }
    }
    if (!back) {
      const apex = top - r * 0.75;
      c.strokeStyle = iron; c.lineWidth = 7;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3, x = cx + Math.cos(a) * r, y = top + Math.sin(a) * ry; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(cx + Math.cos(a) * r * 0.7, apex + 4, cx, apex); c.stroke(); }
      c.fillStyle = '#3a343c'; c.beginPath(); c.arc(cx, apex, 11, 0, Math.PI * 2); c.fill();
      /* chain up to the ceiling */
      c.strokeStyle = '#2a262c'; c.lineWidth = 5;
      for (let y = apex - 14, k = 0; y > -40; y -= 22, k++) { c.beginPath(); c.ellipse(cx, y, k % 2 ? 4 : 8, 11, 0, 0, Math.PI * 2); c.stroke(); }
    }
    c.restore();
  }
};
$('djTalk').addEventListener('click', () => Donjon.talk(false));
$('djExit').addEventListener('click', () => Donjon.exit());

/* ================= Dialogues (merged into SCRIPTS in main.js) ================= */
export const DONJON_SCRIPTS = {
  async fraudeCaught(loot) {
    await say('damien', 'scared', 'HALTE ! Damien, chevalier de la Sécu. Musique, lumières… et des séances que personne n’a jamais faites ?');
    await say('player', 'scared', 'C’est… c’est de la balnéothérapie ! Hors nomenclature !');
    await say('damien', 'think', '« Hors nomenclature », ça veut dire que l’acte n’a pas de cotation dans la NGAP. Pas que tu peux facturer ce que tu veux !');
    await say('damien', 'scared', `${fmt(loot)} € de séances fictives… Direction le cachot de la tour de l’Ordre !`);
  },
  async jailSermon(loot, priors) {
    await say('mentor', 'scared', priors ? 'Encore toi ?! Tu récidives ? Le conseil va finir par te connaître par cœur…' : gx('Mon jeune confrère… Au cachot, déjà ?', 'Ma jeune consœur… Au cachot, déjà ?'));
    await say('mentor', 'think', 'Ajouter des séances à des patients qui ne les ont pas faites, c’est l’exemple même de la fraude. Ta responsabilité « sécurité sociale » est engagée : indemnitaire et/ou pénale.');
    await say('mentor', 'think', 'Et les responsabilités s’accumulent ! Devant la chambre disciplinaire : avertissement, blâme, interdiction temporaire d’exercer jusqu’à trois ans… voire radiation.');
    await say('damien', 'think', 'Le droit à l’erreur existe, pour une erreur de bonne foi. Mais quand c’est volontaire, ce sont des pénalités lourdes… parfois la prison.');
    let right = 0;
    const q1 = await quiz('damien', 'think', 'Dans ta chanson, tu t’achètes une Rolex « pour chronométrer tes séances ». C’est une dépense déductible ?', ['Oui : c’est un outil de travail', 'Non : c’est une dépense somptuaire'], 1);
    await say('damien', q1 ? 'happy' : 'scared', (q1 ? 'Bien ! ' : 'Raté ! ') + 'Les dépenses ne doivent pas être somptuaires : lustre en cristal, pistolet de massage en diamant… et Rolex !');
    const q2 = await quiz('damien', 'think', 'Et ton « repas d’affaires » aux fruits de mer, avec tes potes et ta mère ?', ['Déductible en totalité', 'Non : un repas d’affaires se prend avec la sphère professionnelle'], 1);
    await say('damien', q2 ? 'happy' : 'scared', (q2 ? 'Exact. ' : 'Non ! ') + 'Repas d’affaires = sphère professionnelle, avec les noms des convives au dos de la facture. Ta mère, c’est une dépense personnelle.');
    right = (q1 ? 1 : 0) + (q2 ? 1 : 0);
    await say('damien', 'happy', 'Pour sortir : les séances fictives sont saisies… et tu paies l’amende. Ça pique, hein ?');
    return right;
  },
  async fraudeControl(loot, fine) {
    await say('goblin', '', 'Hé hé hé… Contrôle de l’Assurance maladie ! Des séances sans patients, ça se voit sur ta carte CPS, tu sais…');
    await say('goblin', '', `Tu rembourses les ${fmt(loot)} € perçus à tort… plus ${fmt(fine)} € de pénalité. Hé hé !`);
    await say('mentor', 'think', 'Facturer des séances qui n’ont pas eu lieu, c’est une fraude : ta responsabilité est engagée, indemnitaire et/ou pénale. Ça ne valait pas le coup !');
  },
  async donjonHello() {
    await say('damien', 'happy', `Bienvenue au cachot de l’Ordre, ${G.pseudo} ! Damien, chevalier de la Sécu. Ici, on accueille les fraudeurs.`);
    await say('damien', 'think', 'Tant que tu factures uniquement les séances que tu fais vraiment, tu ne me reverras jamais. Promis.');
  },
  async donjonTalk() {
    const lines = [
      ['think', '« Hors nomenclature » ne veut pas dire « non thérapeutique » : c’est un acte sans cotation dans la NGAP, donc non remboursé.'],
      ['happy', 'Un ticket de carte bancaire n’est pas un justificatif : demande une note ou une facture !'],
      ['think', 'Garde tes justificatifs au moins 6 ans : un contrôle peut remonter sur les 5 dernières années, plus l’année en cours.'],
      ['scared', 'Dix mille euros de luminaire pour le cabinet ? Somptuaire. Pas déductible !'],
      ['think', 'Ajouter des séances qu’un patient n’a pas faites, c’est une fraude : responsabilité indemnitaire et/ou pénale.']
    ];
    const k = (G.flags.damienLine = ((G.flags.damienLine || 0) + 1) % lines.length); persist();
    if (G.fraud && G.fraud.convictions) await say('damien', 'happy', `Tiens, ${gx('un habitué', 'une habituée')} ! ${G.fraud.convictions} passage${G.fraud.convictions > 1 ? 's' : ''} au cachot… je t’ai à l’œil.`);
    await say('damien', lines[k][0], lines[k][1]);
  }
};
