import { AudioSys } from '../audio/audio.js';
import { URLS, need } from '../core/assets.js';
import { G, curDate, gx, persist, state } from '../core/save.js';
import { $, AH, AW, esc, frSpace, pick, shuffle, wait } from '../core/utils.js';
import { FAULTS, INCIDENTS, REACTIONS, SANCTIONS, TRIBUNAL_Q } from '../data/incidents.js';
import { Fade } from '../fx/transitions.js';
import { Cotation, patientArt } from '../game/cotation.js';
import { book } from '../game/month.js';
import { Quests } from '../game/quests.js';
import { charSheets, charWalk, drawChar, drawShadow, drawWho } from '../render/sprites.js';
import { Castle } from './castle.js';
import { setBackdrop, showOnly } from './scenes.js';
import { Talk, quiz, say } from '../story/talk.js';
import { Choice } from '../ui/choice.js';
import { Guide, refreshGuide } from '../ui/guide.js';
import { toast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { ICON } from '../ui/icons.js';
import { blocked } from '../ui/modals.js';

/* ================= Incidents with patients, conciliation and the chambre disciplinaire de l'Ordre ================= */
/* « {n} », « {Il} », « {le} »… : the patient (and {me}, {e}: you) */
export function fillPat(s, pt) {
  const f = pt.sex === 'f';
  return s.replace(/\{n\}/g, pt.name).replace(/\{Il\}/g, f ? 'Elle' : 'Il').replace(/\{il\}/g, f ? 'elle' : 'il').replace(/\{le\}/g, f ? 'la' : 'le')
    .replace(/\{lui\}/g, 'lui').replace(/\{sil\}/g, f ? 'si elle' : 's’il').replace(/\{me\}/g, G.pseudo || 'Mon kiné').replace(/\{e\}/g, G.gender === 'f' ? 'e' : '');
}
/* the sprite of a patient (v6 patients have a kind; older saves: from the age and the sex) */
const kindOf = (pt) => pt.kind || (pt.age >= 60 ? (pt.sex === 'f' ? 'p1' : 'p0') : pt.sex === 'f' ? 'p3' : 'p2');
export const Incidents = {
  /* At the end of a month of work: sometimes, something goes wrong during a séance. */
  async maybe() {
    const I = G.inc; if (I.hearing || I.pending) return;
    const first = !I.n && G.months >= 5, since = G.months - (I.last || 0);
    const worn = G.phase === 'titulaire' && G.cab.level >= 1 && !(G.stock && G.stock.elastiques > 0);
    const chance = since >= 4 ? (worn ? 0.22 : 0.1) : 0;
    if (!first && Math.random() >= chance) return;
    await this.happen(null, worn);
  },
  async happen(pt, worn) {
    pt = pt || Cotation.draw();
    const I = G.inc; I.n = (I.n || 0) + 1; I.last = G.months; persist();
    const inc = worn ? INCIDENTS.find((x) => x.id === 'elastique') : pick(INCIDENTS.filter((x) => !x.worn));
    await need([`pat${pt.img}_scared`, `pat${pt.img}_happy`, `pat${pt.img}_calm`]);
    AudioSys.wrong();
    const opts = shuffle(REACTIONS.map((r, i) => ({ label: fillPat(r.label, pt), value: i })));
    const k = await Choice.ask({ kick: 'Incident pendant une séance', title: inc.title, art: patientArt(pt, 'scared', 210), html: frSpace(esc(fillPat(inc.text, pt))) + '<br><b>' + frSpace('Que fais-tu ?') + '</b>', opts, wide: true });
    const R = REACTIONS[k];
    Talk.patient = pt;
    await Talk.open();
    if (!R.fault) {
      await say('patient', 'happy', `Merci de vous être occupé${gx('', 'e')} de moi aussi vite… et de prendre de mes nouvelles.`);
      await say('mentor', 'happy', "Parfait. Tu as déclaré l'incident à ton assurance RCP : c'est elle qui gère la réclamation du patient, sur le plan civil. Et tu as tout noté dans le dossier.");
      await say('mentor', 'think', "Les chutes sont le motif n° 1 des réclamations, les brûlures le n° 2, les complications pendant une séance le n° 3. La majorité arrive pendant les soins classiques, au cabinet.");
      await Talk.close();
      G.patients += 1; persist(); HUD.render();
      await addXP(15); await Quests.done('incident');
      return;
    }
    await say('patient', 'scared', 'Bon… si vous le dites…');
    await say('mentor', 'scared', FAULTS[R.fault].why);
    await Talk.close();
    I.hearing = { pt, inc: inc.id, fault: R.fault, stage: 'concil', due: G.months + 1, y: curDate().y, m: curDate().m }; persist();
    toast('Le patient n’en restera peut-être pas là…', 3200);
  },
  /* After the month: a letter from the Ordre */
  async afterMonth() {
    const H = G.inc.hearing; if (!H || H.due > G.months || H.told === G.months) return;
    /* nobody came to the conciliation: the complaint goes on to the chambre disciplinaire */
    const missed = H.stage === 'concil' && H.told != null && G.months - H.due >= 2;
    if (missed) H.stage = 'chambre';
    /* nobody came to the hearing either: the chambre judges without you */
    if (H.stage === 'chambre' && !missed && G.months - H.due >= 4) {
      const { s: sanc, prior } = sentence(FAULTS[H.fault].base + 1);
      Talk.patient = H.pt;
      await Talk.open();
      await say('mentor', 'scared', fillPat(`${G.pseudo}, tu ne t'es pas ${gx('présenté', 'présentée')} à l'audience : la chambre disciplinaire a jugé la plainte de {n} sans toi. Décision : ${SANCTIONS[sanc].name.toLowerCase()}. ${SANCTIONS[sanc].text}${prior ? ' Ton sursis précédent tombe : ce mois d’interdiction s’applique maintenant.' : ''}`, H.pt));
      await say('mentor', 'think', "Quand on est convoqué devant la chambre disciplinaire, on y va… et on peut se faire assister d'un avocat. Ne pas se défendre, c'est laisser les autres décider à ta place.");
      await Talk.close();
      return;
    }
    H.told = G.months; persist();
    Talk.patient = H.pt;
    await Talk.open();
    if (missed) await say('mentor', 'scared', fillPat(`${G.pseudo}, tu ne t'es pas ${gx('présenté', 'présentée')} à la conciliation avec {n}. Je dresse un procès-verbal de non-conciliation : la plainte part devant la chambre disciplinaire de première instance. L'audience se tiendra à la tour de l'Ordre.`, H.pt));
    else if (H.stage === 'concil') await say('mentor', 'think', fillPat(`${G.pseudo}, ici Pascale Matué. {n} a saisi le conseil départemental de l'Ordre après l'incident au cabinet. Avant toute procédure, je vous convoque pour une conciliation, à la tour de l'Ordre.`, H.pt));
    else await say('mentor', 'scared', fillPat(`${G.pseudo}, la chambre disciplinaire de première instance t'attend à la tour de l'Ordre pour juger la plainte de {n}.`, H.pt));
    await Talk.close();
    toast(`Rends-toi à la <b>tour de l’Ordre</b> : touche « ${H.stage === 'concil' ? 'Conciliation' : 'Audience'} ».`, 4200);
  },
  /* sanctions that apply: an interdiction d'exercer for the coming month */
  banned() { return G.inc.banned > 0; }
};

/* the decision of the chambre: a score (seriousness of the fault, wrong answers, a lawyer or not) → a sanction.
   A sanction with sursis falls due if a new interdiction d'exercer is pronounced within 5 years. */
function sentence(score) {
  const s = score <= 0.25 ? 'relaxe' : score <= 1 ? 'avertissement' : score <= 1.75 ? 'blame' : score <= 2.25 ? 'sursis' : 'ferme';
  /* a sursis given less than 5 years ago falls when a new interdiction d'exercer is pronounced: its month applies now */
  const d = curDate(), recent = (r) => (d.y - r.y) * 12 + d.m - r.m <= 60;
  const falls = s === 'sursis' || s === 'ferme' ? (G.inc.record || []).filter((r) => r.s === 'sursis' && !r.used && recent(r)) : [];
  for (const r of falls) r.used = true;
  G.inc.record.push({ y: d.y, m: d.m, s });
  G.inc.banned = (G.inc.banned || 0) + (s === 'ferme' ? 1 : 0) + falls.length;
  G.inc.hearing = null; persist();
  return { s, prior: falls.length > 0 };
}
/* ---------- the tribunal room of the tower ---------- */
const POS = { pascale: [835, 262], damien: [1030, 270], clip: 286, bar: [835, 520], door: [835, 905], doorIn: [835, 800], plaintiff: [470, 560] };
const depth = (y) => 0.6 + 0.36 * (y - 300) / 600;
export const Tribunal = {
  cv: $('tribCv'), ctx: $('tribCv').getContext('2d'), t: 0, me: null, pt: null,
  show(pt) {
    state.screen = 'tribunal'; Guide.hide(); this.pt = pt;
    showOnly('tribScene'); setBackdrop('in_tribunal'); $('tribBg').src = URLS.in_tribunal;
    this.me = { x: POS.door[0], y: POS.door[1], pts: [POS.doorIn.slice(), POS.bar.slice()], t: 0, alpha: 0, pose: 'idle' };
    this.judges = { p: 'idle', d: 'guard' };
    HUD.render();
  },
  update(dt) {
    this.t += dt; const M = this.me;
    if (M) {
      M.t += dt; M.alpha = Math.min(1, M.alpha + dt * 2.5);
      const tgt = M.pts[0];
      if (tgt) { const dx = tgt[0] - M.x, dy = tgt[1] - M.y, d = Math.hypot(dx, dy), st = 210 * dt * depth(M.y); if (d <= st) { M.x = tgt[0]; M.y = tgt[1]; M.pts.shift(); } else { M.x += dx / d * st; M.y += dy / d * st; M.vx = dx; M.vy = dy; } M.moving = true; } else M.moving = false;
    }
    this.draw();
  },
  draw() {
    const c = this.ctx; c.clearRect(0, 0, AW, AH);
    c.save(); c.beginPath(); c.rect(0, 0, AW, POS.clip); c.clip();
    drawChar(c, 'pascale', this.judges.p, this.t, POS.pascale[0], POS.pascale[1], depth(POS.pascale[1]) * 1.05, { fps: 0.8 });
    drawChar(c, 'damien', this.judges.d, this.t + 1, POS.damien[0], POS.damien[1], depth(POS.damien[1]) * 0.78, { fps: 0.8, flip: true });
    c.restore();
    if (this.pt) { const s = depth(POS.plaintiff[1]) * 0.98; drawShadow(c, POS.plaintiff[0], POS.plaintiff[1], 34 * s, 10 * s, 0.25); drawWho(c, kindOf(this.pt), 'walk_front', 0, POS.plaintiff[0], POS.plaintiff[1], s, false, 1); }
    const M = this.me;
    if (M) {
      const s = depth(M.y) * 0.95;
      drawShadow(c, M.x, M.y, 40 * s, 12 * s, 0.25 * M.alpha);
      if (M.moving) { const [row, flip] = charWalk('player', M.vx || 0, M.vy || -1); drawChar(c, 'player', 'walk', M.t, M.x, M.y, s, { row, flip, alpha: M.alpha }); }
      else drawChar(c, 'player', M.pose, M.t, M.x, M.y, s, { fps: 0.7, alpha: M.alpha });
    }
  },
  /* from the tower: conciliation, or the hearing */
  async open() {
    const H = G.inc.hearing; if (!H || blocked()) return;
    if (H.stage === 'concil') { await this.conciliation(H); return; }
    await this.hearing(H);
  },
  async conciliation(H) {
    state.busy = true; Talk.patient = H.pt;
    await need([`pat${H.pt.img}_scared`, `pat${H.pt.img}_calm`, `pat${H.pt.img}_happy`]);
    const F = FAULTS[H.fault];
    await Talk.open();
    await say('mentor', 'think', fillPat("Nous sommes réunis pour une conciliation entre {n} et toi. Ce n'est pas encore une plainte jugée : l'objectif, c'est de trouver un accord.", H.pt));
    await say('patient', 'scared', fillPat(F.plainte, H.pt));
    const ok = await quiz('mentor', 'think', 'Que réponds-tu ?', ["Je reconnais les faits, je présente mes excuses et je déclare enfin l'incident à mon assurance RCP", "Je nie tout : je n'ai rien fait de mal"], 0);
    if (ok && H.fault !== 'silence') {
      await say('patient', 'happy', "Merci de le reconnaître. C'est tout ce que je voulais.");
      await say('mentor', 'happy', "Conciliation totale : nous signons un procès-verbal de conciliation et l'affaire est classée sans suite. Ton assurance RCP indemnisera le patient si besoin.");
      await Talk.close();
      G.inc.hearing = null; persist(); await addXP(15); await Quests.done('incident');
      state.busy = false; Castle.renderUi(); refreshGuide(); return;
    }
    if (H.fault === 'silence' && ok) await say('mentor', 'scared', "Tes excuses sont notées… mais acheter le silence d'un patient manque à la probité. Le conseil départemental s'associe à la plainte.");
    else await say('mentor', 'scared', 'Pas de conciliation : je dresse un procès-verbal de non-conciliation.');
    await say('mentor', 'think', "L'affaire part devant la chambre disciplinaire de première instance. Rendez-vous dans la salle d'audience, ici même.");
    await Talk.close();
    H.stage = 'chambre'; persist();
    state.busy = false; Castle.renderUi(); refreshGuide();
  },
  async hearing(H) {
    state.busy = true; Talk.patient = H.pt;
    await need(['in_tribunal', 'c30', 'c31', ...charSheets('player'), 'p_walk_front', 'q_walk_front', `pat${H.pt.img}_scared`, `pat${H.pt.img}_calm`, 'damien_happy', 'damien_think', 'damien_scared']);
    await Fade.transition(async () => { $('ordreScene').hidden = true; this.show(H.pt); });
    await wait(900);
    const F = FAULTS[H.fault], inc = INCIDENTS.find((x) => x.id === H.inc);
    this.judges.p = 'point';
    await Talk.open();
    await say('mentor', 'think', fillPat(`Audience de la chambre disciplinaire de première instance. Plainte de {n} contre ${G.pseudo}, après « ${inc.title.toLowerCase()} » au cabinet.`, H.pt));
    await say('patient', 'scared', fillPat(F.plainte, H.pt));
    await say('damien', 'think', 'Chevalier de l’Ordre… et assesseur de cette chambre pour l’occasion. Défends-toi bien.');
    if (!G.flags.chambreNote) { G.flags.chambreNote = true; persist(); await say('mentor', 'happy', "Petite précision : en vrai, la chambre disciplinaire de première instance est présidée par un magistrat des tribunaux administratifs, et le conseil départemental qui a transmis la plainte n'y juge pas. Pour le jeu, Damien et moi siégeons !"); }
    await Talk.close(true);
    /* a lawyer? */
    const pj = !!G.owned.pol_pj;
    const law = await Choice.ask({ kick: 'Chambre disciplinaire', title: 'Te faire assister d’un avocat ?', art: `<span class="ch-ico">${ICON.doc}</span>`, html: frSpace("Devant la chambre disciplinaire, l'avocat n'est pas obligatoire… mais il est vivement recommandé."),
      opts: [pj ? { label: 'Oui, avec ma protection juridique', sub: 'Ton assurance prend en charge les frais d’avocat', value: 'pj' } : { label: 'Oui, je paie un avocat', sub: '600 € de frais d’avocat (déductibles)', value: 'pay' }, { label: 'Non, je me défends seul' + gx('', 'e'), sub: 'Gratuit', value: 'none' }] });
    if (law === 'pay') { G.money -= 600; book('Honoraires d’avocat (chambre disciplinaire)', -600, 'depense', 'contentieux'); persist(); HUD.tweenMoney(); }
    /* two questions */
    let wrong = 0; const qs = shuffle(TRIBUNAL_Q).slice(0, 2);
    this.judges.p = 'think';
    await Talk.open();
    for (const Q of qs) {
      const ok = await quiz('mentor', 'think', Q.q, Q.o, Q.a);
      await say('mentor', ok ? 'happy' : 'scared', (ok ? 'Bien. ' : 'Non. ') + Q.why);
      if (!ok) wrong++;
    }
    await say('damien', 'think', 'La chambre se retire pour délibérer…');
    await Talk.close(true);
    AudioSys.whoosh(0.8, true); await wait(1200);
    /* verdict */
    const { s, prior } = sentence(F.base + wrong * 0.5 - (law === 'none' ? 0 : 0.5));
    this.judges.p = 'point'; this.judges.d = s === 'relaxe' ? 'cheer' : 'point';
    await Talk.open();
    await say('mentor', s === 'relaxe' ? 'happy' : 'think', `La chambre a rendu sa décision : ${SANCTIONS[s].name.toLowerCase()}. ${SANCTIONS[s].text}${prior ? ' Ton sursis précédent tombe : ce mois d’interdiction s’applique maintenant.' : ''}`);
    await say('mentor', 'think', "Les sanctions possibles : avertissement, blâme, interdiction temporaire d'exercer (3 ans au plus, avec ou sans sursis), radiation. Elles ne s'assurent pas. L'indemnisation du patient, elle, relève de ton assurance RCP.");
    await say('damien', s === 'relaxe' ? 'happy' : 'scared', s === 'relaxe' ? 'Relaxe ! Mais la prochaine fois, déclare tout incident à ton assurance, et tout de suite.' : 'Retiens la leçon : un incident, on le prend en charge, on le note, on le déclare à sa RCP… et on prend des nouvelles du patient.');
    await Talk.close();
    await addXP(10 - wrong * 5 > 0 ? 10 - wrong * 5 : 0);
    await Fade.transition(async () => { $('tribScene').hidden = true; Castle.show(); });
    state.busy = false; refreshGuide();
  }
};
