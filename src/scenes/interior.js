import { AudioSys } from '../audio/audio.js';
import { URLS, need } from '../core/assets.js';
import { G, curDate, gx, persist, state } from '../core/save.js';
import { $, AH, AW, esc, eur, fmt, frSpace, randi } from '../core/utils.js';
import { MAPS } from '../data/worlds.js';
import { Fade } from '../fx/transitions.js';
import { book } from '../game/month.js';
import { Quests } from '../game/quests.js';
import { charSheets, charWalk, drawChar, drawShadow } from '../render/sprites.js';
import { setBackdrop, showOnly, showTown } from './scenes.js';
import { BUILDINGS, POLICIES } from '../story/buildings.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk, quiz, say } from '../story/talk.js';
import { Choice, infoCard } from '../ui/choice.js';
import { Guide, refreshGuide } from '../ui/guide.js';
import { toast } from '../ui/helpers.js';
import { HUD, addXP, pay } from '../ui/hud.js';
import { ICON } from '../ui/icons.js';
import { blocked } from '../ui/modals.js';
import { Shop } from '../ui/shop.js';

/* ================= Inside an institution: URSSAF, CARPIMKO, syndicats, assurances =================
   The host stands behind the counter; you walk in from the door. */
const SPOT = { host: [835, 352], clip: 330, door: [835, 905], doorIn: [835, 800], meet: [835, 600] };
const depth = (y) => 0.6 + 0.36 * (y - 300) / 600;
const THEMES = { urssaf: 'urssaf' };
export const Interior = {
  cv: $('ibCv'), ctx: $('ibCv').getContext('2d'), id: null, t: 0, host: null, me: null, talking: false,
  async enter(id) {
    if (state.busy) return;
    const B = BUILDINGS[id]; if (!B) return;
    state.busy = true;
    const ex = ['fee', 'sage'].includes(B.host) ? ['happy', 'joy', 'scared'] : ['happy', 'think', 'scared'];
    await need(['in_' + id, ...charSheets(B.host), ...charSheets('player'), ...ex.map((e) => `${B.host}_${e}`), 'av_' + B.host]);
    const P = MAPS.main.places[id];
    await Fade.transition(async () => { this.show(id); }, P && G.map === 'main' ? { el: $('townArt'), x: P.door[0], y: P.door[1] - 60 } : null);
    state.busy = false;
    if (!G.flags['in_' + id]) { G.flags['in_' + id] = true; persist(); await this.hello(); }
    refreshGuide();
  },
  show(id) {
    this.id = id; const B = BUILDINGS[id];
    state.screen = 'interior'; state.interior = id; Guide.hide();
    showOnly('inScene'); setBackdrop('in_' + id);
    $('ibBg').src = URLS['in_' + id]; $('ibTitle').textContent = frSpace(B.title);
    this.host = { who: B.host, x: SPOT.host[0], y: SPOT.host[1], pose: 'idle', t: 0, pts: [] };
    this.me = { who: 'player', x: SPOT.door[0], y: SPOT.door[1], pts: [SPOT.doorIn.slice(), SPOT.meet.slice()], pose: 'idle', t: 0, alpha: 0 };
    if (THEMES[id]) AudioSys.setTheme(THEMES[id]);
    HUD.render(); this.renderUi();
  },
  async exit() {
    if (blocked()) return;
    state.busy = true; AudioSys.tap();
    const P = MAPS.main.places[this.id];
    await Fade.transition(async () => { showTown(P ? P.door : null); });
    state.busy = false; refreshGuide();
  },
  step(c, dt, speed) {
    c.t += dt;
    const tgt = c.pts[0]; if (!tgt) { c.moving = false; return; }
    const dx = tgt[0] - c.x, dy = tgt[1] - c.y, d = Math.hypot(dx, dy), st = speed * dt * depth(c.y);
    if (d <= st) { c.x = tgt[0]; c.y = tgt[1]; c.pts.shift(); } else { c.x += (dx / d) * st; c.y += (dy / d) * st; c.vx = dx; c.vy = dy; }
    c.moving = true;
  },
  update(dt) {
    this.t += dt;
    const M = this.me, H = this.host;
    if (M) { M.alpha = Math.min(1, M.alpha + dt * 2.5); this.step(M, dt, 220); }
    if (H) H.t += dt;
    this.draw();
  },
  draw() {
    const c = this.ctx; c.clearRect(0, 0, AW, AH);
    const H = this.host, M = this.me;
    if (H) {
      /* behind the counter: only what is above the desk shows */
      c.save(); c.beginPath(); c.rect(0, 0, AW, SPOT.clip); c.clip();
      drawChar(c, H.who, H.pose, H.t, H.x, H.y, depth(H.y) * 1.02, { fps: 0.8 });
      c.restore();
    }
    if (M) {
      const s = depth(M.y) * 0.95;
      drawShadow(c, M.x, M.y, 40 * s, 12 * s, 0.25 * M.alpha);
      if (M.moving) { const [row, flip] = charWalk('player', M.vx || 0, M.vy || -1); drawChar(c, 'player', 'walk', M.t, M.x, M.y, s, { row, flip, alpha: M.alpha }); }
      else drawChar(c, 'player', M.pose, M.t, M.x, M.y, s, { fps: 0.7, alpha: M.alpha });
    }
  },
  /* ---------- menu ---------- */
  services() {
    const id = this.id, out = [];
    if (id === 'urssaf') out.push({ k: 'cotis', label: 'Mes cotisations', sub: 'Ce que tu as versé cette année', icon: ICON.ledger });
    if (id === 'carpimko') out.push({ k: 'retraite', label: 'Ma future retraite', sub: 'Simulation', icon: ICON.calendar }, { k: 'pol_retraite', label: POLICIES.retraite.name, sub: G.owned.pol_retraite ? 'Souscrit' : `${fmt(POLICIES.retraite.price)} € / an`, icon: ICON.bank });
    if (id === 'syndicats') out.push({ k: 'syndic', label: G.owned.syndicat ? `Tu es ${gx('adhérent', 'adhérente')}` : 'Adhérer au syndicat', sub: G.owned.syndicat ? 'Relecture de tes contrats' : '180 € / an, déductible', icon: ICON.people });
    if (id === 'assurances') out.push({ k: 'contrats', label: 'Mes contrats', sub: 'RCP, protection juridique, prévoyance', icon: ICON.doc });
    return out;
  },
  renderUi() {
    const B = BUILDINGS[this.id]; if (!B) return;
    const left = B.quiz.filter((x, i) => !(G.flags['iq_' + this.id] || []).includes(i)).length;
    const btn = (k, cls, icon, label, sub) => `<button class="gbtn ${cls}" type="button" data-in="${k}">${icon}<span>${esc(frSpace(label))}</span>${sub ? `<small>${esc(frSpace(sub))}</small>` : ''}</button>`;
    $('ibMenu').innerHTML = btn('talk', 'green', ICON.excl, `Parler à ${B.hostName}`) + btn('quiz', 'yellow', ICON.ask, 'Une question ?', left ? `${left} à découvrir` : 'Toutes réussies !') +
      this.services().map((s) => btn(s.k, 'blue', s.icon, s.label, s.sub)).join('');
  },
  async hello() {
    const B = BUILDINGS[this.id];
    this.talking = true; state.busy = true; this.host.pose = 'talk';
    await Talk.open(); await say(B.host, B.hello[0], B.hello[1]); await say(B.host, 'think', 'Pose-moi tes questions quand tu veux : je connais mon sujet !'); await Talk.close(true);
    this.host.pose = 'idle'; state.busy = false; this.talking = false;
  },
  async talk() {
    if (blocked() || this.talking) return;
    const B = BUILDINGS[this.id];
    this.talking = true; state.busy = true; AudioSys.tap(); this.host.pose = 'talk';
    const k = (G.flags['it_' + this.id] = ((G.flags['it_' + this.id] ?? -1) + 1) % B.talk.length); persist();
    await Talk.open(); await say(B.host, B.talk[k][0], B.talk[k][1]); await Talk.close(true);
    this.host.pose = 'idle'; state.busy = false; this.talking = false; refreshGuide();
  },
  async quiz() {
    if (blocked() || this.talking) return;
    const B = BUILDINGS[this.id], key = 'iq_' + this.id, done = G.flags[key] || (G.flags[key] = []);
    let pool = B.quiz.map((x, i) => i).filter((i) => !done.includes(i)); if (!pool.length) pool = B.quiz.map((x, i) => i);
    const i = pool[randi(0, pool.length - 1)], Q = B.quiz[i];
    this.talking = true; state.busy = true; AudioSys.tap(); this.host.pose = 'think';
    await Talk.open();
    const ok = await quiz(B.host, 'think', Q.q, Q.o, Q.a);
    await say(B.host, ok ? 'happy' : 'think', (ok ? 'Exactement ! ' : 'Pas tout à fait. ') + Q.why);
    await Talk.close(true);
    if (ok && !done.includes(i)) { done.push(i); persist(); await addXP(10); }
    if (B.quiz.every((x, j) => done.includes(j))) await Quests.done('inst_' + this.id);
    this.host.pose = 'idle'; state.busy = false; this.talking = false; this.renderUi(); refreshGuide();
  },
  async service(k) {
    if (blocked() || this.talking) return;
    this.talking = true; AudioSys.tap();
    try {
      if (k === 'cotis') await this.cotis();
      else if (k === 'retraite') await this.retraite();
      else if (k === 'syndic') await this.syndic();
      else if (k === 'contrats') await this.contrats();
      else if (k.startsWith('pol_')) await this.policy(k.slice(4));
    } finally { this.talking = false; this.renderUi(); refreshGuide(); }
  },
  async cotis() {
    const y = curDate().y, paid = -G.journal.filter((e) => e.y === y && e.sub === 'cotis').reduce((s, e) => s + e.amount, 0);
    const rec = G.journal.filter((e) => e.y === y && (e.cat === 'recette' || e.cat === 'gains')).reduce((s, e) => s + e.amount, 0);
    await infoCard({ kick: 'URSSAF · CARPIMKO', title: `Tes cotisations ${y}`, art: `<img src="${URLS.av_marvin}" alt="" class="ch-av">`,
      html: `Recettes ${y} : <b>${eur(rec)}</b><br>Cotisations sociales provisionnées : <b>${eur(paid)}</b><br><small>${frSpace("Dans le jeu, tu mets de côté 28 % de ton revenu de chaque mois pour l'URSSAF et la CARPIMKO. Le cours conseille de prévoir environ 20 % pour l'URSSAF et 10 % pour la CARPIMKO, en plus de 30 % pour les impôts.")}</small>`, ok: 'Merci Marvin' });
  },
  async retraite() {
    const years = (G.months / 12).toFixed(1).replace('.', ',');
    await infoCard({ kick: 'CARPIMKO', title: 'Ta future retraite', art: `<img src="${URLS.av_sage}" alt="" class="ch-av">`,
      html: frSpace(`Tu as cotisé <b>${G.months} mois</b> (${years} ans). Une carrière complète dure plus de 40 ans… La retraite moyenne d'un kiné tourne autour de <b>1 500 € par mois</b>.<br><small>Système par points et par répartition : complète-la par une épargne personnelle, par exemple un contrat Madelin.</small>`), ok: 'Je vais y penser' });
  },
  async syndic() {
    if (G.owned.syndicat) { await infoCard({ kick: 'Syndicats', title: `Tu es ${gx('adhérent', 'adhérente')}`, html: frSpace("Ton syndicat relit tes contrats : touche le bouton « Syndicat » quand tu lis un contrat. Ta cotisation (180 € par an) est déductible."), art: `<img src="${URLS.av_menton}" alt="" class="ch-av">` }); return; }
    if (!G.q.menton) {
      /* the first time, M. Menton presents the syndicats (the same talk as in the street during the assistanat) */
      state.busy = true; this.host.pose = 'talk';
      await Talk.open(); const ok = await SCRIPTS.menton(); await Talk.close(true);
      this.host.pose = 'idle'; state.busy = false;
      if (ok) await addXP(10);
      await Quests.done('menton');
    }
    Shop.open('services', 'syndicat');
  },
  async contrats() {
    const rows = [['RCP (responsabilité civile professionnelle)', G.steps.rcp ? 'Souscrite · obligatoire' : 'À souscrire (démarches)'], ['Protection juridique', G.owned.pol_pj ? 'Souscrite' : 'Non souscrite'], ['Prévoyance Madelin', G.owned.pol_prev ? 'Souscrite' : 'Non souscrite']];
    const opts = [];
    if (!G.owned.pol_pj) opts.push({ label: `Souscrire : ${POLICIES.pj.name}`, sub: `${POLICIES.pj.price} € / an · ${POLICIES.pj.tag}`, value: 'pj' });
    if (!G.owned.pol_prev) opts.push({ label: `Souscrire : ${POLICIES.prev.name}`, sub: `${POLICIES.prev.price} € / an · ${POLICIES.prev.tag}`, value: 'prev' });
    const v = await Choice.ask({ kick: 'La fée des assurances', title: 'Tes contrats', art: `<img src="${URLS.av_fee}" alt="" class="ch-av">`, html: rows.map(([a, b]) => `${esc(frSpace(a))} : <b>${esc(frSpace(b))}</b>`).join('<br>'), opts, cancel: 'Fermer' });
    if (v) await this.policy(v);
  },
  async policy(id) {
    const P = POLICIES[id], key = 'pol_' + id;
    if (G.owned[key]) { toast(`Tu as déjà souscrit : <b>${esc(P.name)}</b>.`); return; }
    if (G.money < P.price) { AudioSys.wrong(); toast(`Il te manque <b>${eur(P.price - G.money)}</b>.`); return; }
    const ok = await Choice.ask({ kick: P.where === 'carpimko' ? 'CARPIMKO' : 'Assurances', title: P.name, html: frSpace(`${esc(P.tag)}. <b>${eur(P.price)} par an</b>.<br><small>${esc(P.why)}</small>`), opts: [{ label: 'Souscrire', value: true, cls: 'go' }], cancel: 'Non merci' });
    if (!ok) return;
    await pay(P.price, null);
    const d = curDate(); G.owned[key] = { y: d.y, m: d.m };
    book(P.name, -P.price, 'depense', P.sub); persist(); HUD.render(); AudioSys.stamp();
    toast(`Contrat souscrit : <b>${esc(P.name)}</b>. Il se renouvelle chaque année.`, 3600);
    await Quests.done('assure');
  }
};
$('ibMenu').addEventListener('click', (e) => {
  const b = e.target.closest('[data-in]'); if (!b || blocked()) return;
  const k = b.dataset.in;
  if (k === 'talk') Interior.talk(); else if (k === 'quiz') Interior.quiz(); else Interior.service(k);
});
$('ibExit').addEventListener('click', () => Interior.exit());
