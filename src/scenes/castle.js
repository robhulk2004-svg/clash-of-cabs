import { AudioSys } from '../audio/audio.js';
import { URLS, need } from '../core/assets.js';
import { G, persist, state } from '../core/save.js';
import { $, AH, AW, randi } from '../core/utils.js';
import { Fade } from '../fx/transitions.js';
import { Letters } from '../game/letters.js';
import { Donjon } from './donjon.js';
import { charSheets, charWalk, drawChar, drawShadow } from '../render/sprites.js';
import { setBackdrop, showOnly, showTown } from './scenes.js';
import { Tribunal } from './tribunal.js';
import { MAPS } from '../data/worlds.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk, quiz, say } from '../story/talk.js';
import { Guide, refreshGuide } from '../ui/guide.js';
import { toast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { ICON } from '../ui/icons.js';
import { blocked } from '../ui/modals.js';

/* ================= Inside the tower: the Conseil départemental de l'Ordre ================= */
/* Questions of Pascale Matué (déontologie). */
const ORDRE_QUIZ = [
  { q: 'Quel est le motif n° 1 des réclamations des patients contre les kinés ?', o: ['Les retards de rendez-vous', 'Les chutes au cabinet', 'Les brûlures'], a: 1, why: "N° 1 : les chutes. N° 2 : les brûlures (électrothérapie, compresses chaudes…). N° 3 : les complications pendant une séance." },
  { q: 'En exercice libéral, ton assurance responsabilité civile professionnelle est…', o: ['Conseillée', 'Obligatoire', 'Inutile si je suis prudent'], a: 1, why: "Obligatoire en libéral. Et pense à une complémentaire pour tes indemnités journalières en cas d'arrêt." },
  { q: 'Pour que ta responsabilité soit engagée, il faut…', o: ['Une plainte du patient, c’est tout', 'Une faute, un préjudice et un lien de causalité certain et direct', 'Un résultat décevant'], a: 1, why: 'Faute prouvée + dommage évalué + lien de causalité certain et direct (sauf force majeure, cas fortuit ou fait étranger).' },
  { q: 'Envers ton patient, tu as une obligation…', o: ['De résultat : il doit guérir', 'De moyens : des soins attentifs et conformes à la science', 'Aucune obligation'], a: 1, why: "Depuis l'arrêt Mercier : obligation de moyens. Tu dois des soins consciencieux, attentifs et conformes aux données acquises de la science." },
  { q: 'Combien de temps un patient peut-il agir contre toi ?', o: ['3 ans après la séance', '10 ans après la consolidation du dommage', '30 ans, toujours'], a: 1, why: 'Loi Kouchner : 10 ans à compter de la consolidation du dommage. Pour un mineur, 10 ans après sa majorité.' },
  { q: 'Une condamnation pénale (homicide involontaire, certificat mensonger…) : ton assurance paie ?', o: ['Oui, c’est son rôle', 'Non : la sanction pénale n’est pas couverte'], a: 1, why: "La responsabilité pénale punit une infraction, même sans préjudice. L'assurance ne couvre pas." },
  { q: 'Tu suspectes des violences chez une patiente. Ton attestation dit…', o: ['« Son mari la bat »', 'Ce que je constate et ce qu’elle m’a dit', 'Rien : je n’écris jamais'], a: 1, why: "On écrit ce que l'on CONSTATE, pas ce que l'on imagine : sinon, c'est un certificat mensonger." },
  { q: 'Un litige entre deux kinés libéraux relève de…', o: ["L'ordre judiciaire", "L'ordre administratif"], a: 0, why: "L'ordre judiciaire règle les litiges entre personnes privées. L'administratif, ceux avec la puissance publique." },
  { q: 'Peux-tu refuser des soins à un patient ?', o: ['Jamais', 'Oui, pour des raisons professionnelles ou personnelles'], a: 1, why: "C'est ton droit. Tu n'es pas tenu de le réorienter… mais c'est mieux de le faire si tu peux." }
];
const CASTLE = { throne: [835, 262], greet: [835, 276], meet: [835, 610], door: [835, 905], doorIn: [835, 790] };
const castleK = (y) => 0.6 + 0.36 * (y - 300) / 600;

export const Castle = {
  cv: $('ordreCv'), ctx: $('ordreCv').getContext('2d'), t: 0, pas: null, me: null, talking: false,
  async enter() {
    if (state.busy) return;
    state.busy = true;
    await need(['in_ordre', 'c30', ...charSheets('player')]);
    const P = MAPS.main.places.ordre;
    await Fade.transition(async () => { this.show(); }, G.map === 'main' ? { el: $('townScene'), x: P.door[0], y: P.door[1] - 80 } : null);
    state.busy = false;
    this.renderUi();
    if (!G.flags.castleFirst) { G.flags.castleFirst = true; persist(); await this.talk(true); }
    else if (Letters.ready().length) Letters.tick(0);
  },
  show() {
    state.screen = 'ordre'; Guide.hide();
    showOnly('ordreScene'); setBackdrop('in_ordre');
    const bg = $('ordreBg'); if (bg.dataset.key !== 'in_ordre') { bg.src = URLS.in_ordre; bg.dataset.key = 'in_ordre'; }
    this.pas = { x: CASTLE.throne[0], y: CASTLE.throne[1], pts: [], pose: 'throne', row: 3, flip: false, t: 0 };
    this.me = { x: CASTLE.door[0], y: CASTLE.door[1], pts: [CASTLE.doorIn.slice(), CASTLE.meet.slice()], pose: 'idle', row: 0, flip: false, t: 0, alpha: 0 };
    HUD.render(); this.renderUi();
  },
  async exit() {
    if (blocked()) return;
    state.busy = true; AudioSys.tap();
    await Fade.transition(async () => { $('ordreScene').hidden = true; showTown(MAPS.main.places.ordre.door); });
    state.busy = false; refreshGuide();
  },
  walkTo(c, pts) { return new Promise((res) => { c.pts = pts.map((p) => p.slice()); c.done = res; }); },
  step(c, dt, speed) {
    c.t += dt;
    const tgt = c.pts[0];
    if (!tgt) { if (c.done) { const f = c.done; c.done = null; f(); } return false; }
    const dx = tgt[0] - c.x, dy = tgt[1] - c.y, d = Math.hypot(dx, dy), st = speed * dt * castleK(c.y);
    if (d <= st) { c.x = tgt[0]; c.y = tgt[1]; c.pts.shift(); }
    else { c.x += (dx / d) * st; c.y += (dy / d) * st; c.vx = dx; c.vy = dy; }
    return true;
  },
  update(dt) {
    this.t += dt;
    const P = this.pas, M = this.me;
    if (M) { M.alpha = Math.min(1, M.alpha + dt * 2.5); M.moving = this.step(M, dt, 210); }
    if (P) P.moving = this.step(P, dt, 150);
    this.draw();
  },
  draw() {
    const c = this.ctx; c.clearRect(0, 0, AW, AH);
    const list = [this.pas, this.me].filter(Boolean).sort((a, b) => a.y - b.y);
    for (const ch of list) {
      const who = ch === this.pas ? 'pascale' : 'player', s = castleK(ch.y) * (who === 'player' ? 0.95 : 1);
      const a = ch.alpha == null ? 1 : ch.alpha;
      if (ch.pose !== 'throne' && who === 'player') drawShadow(c, ch.x, ch.y, 40 * s, 12 * s, 0.25 * a);
      if (ch.moving) { const [row, flip] = charWalk(who, ch.vx || 0, ch.vy || 1); drawChar(c, who, 'walk', ch.t, ch.x, ch.y, s, { row, flip, alpha: a }); }
      else drawChar(c, who, ch.pose, ch.t, ch.x, ch.y, s * (ch.pose === 'throne' ? 0.98 : 1), { fps: 0.8, alpha: a, flip: who === 'player' && ch.pose !== 'idle' });
    }
  },
  renderUi() {
    const n = G.letters.length, ready = Letters.ready().length;
    $('orMail').innerHTML = `${ICON.envelope}<span>${ready ? 'Ton avis est prêt !' : n ? `Avis en cours · ${Math.ceil(G.letters[0].t)} s` : 'Aucun avis en cours'}</span>`;
    $('orMail').classList.toggle('ready', !!ready);
    const left = ORDRE_QUIZ.filter((x, i) => !(G.flags.oq || []).includes(i)).length;
    $('orQuiz').innerHTML = `${ICON.ask}<span>Question de déontologie</span><small>${left ? `${left} à découvrir` : 'Toutes réussies !'}</small>`;
    const H = G.inc && G.inc.hearing, aud = $('orHearing');
    aud.hidden = !(H && H.due <= G.months);
    if (!aud.hidden) aud.innerHTML = `${ICON.flag}<span>${H.stage === 'concil' ? 'Conciliation' : 'Audience'}</span><small>${H.stage === 'concil' ? 'Ton patient t’attend' : 'Chambre disciplinaire'}</small>`;
  },
  /* Pascale stands up from her throne, comes down the steps, then goes back. */
  async rise() {
    const P = this.pas; if (P.pose !== 'throne') return;
    P.pose = 'wave'; P.y = CASTLE.greet[1]; AudioSys.whoosh(0.3, true); await new Promise((r) => setTimeout(r, 300));
    this.me.pose = 'talk';
  },
  async sit() {
    const P = this.pas; if (!P || P.pose === 'throne') return;
    P.y = CASTLE.throne[1]; P.pose = 'throne';
    if (this.me) this.me.pose = 'idle';
  },
  async talk(first) {
    if (blocked() || this.talking) return;
    this.talking = true; AudioSys.tap();
    if (!first && Letters.ready().length) { await this.rise(); this.talking = false; await Letters.announce(); this.sit(); this.renderUi(); return; }
    state.busy = true;
    await this.rise();
    await Talk.open();
    await (first ? SCRIPTS.castleHello() : SCRIPTS.castleTalk());
    await Talk.close();
    state.busy = false; this.talking = false; this.sit(); this.renderUi(); refreshGuide();
  },
  async quiz() {
    if (blocked() || this.talking) return;
    const done = G.flags.oq || (G.flags.oq = []);
    let pool = ORDRE_QUIZ.map((x, i) => i).filter((i) => !done.includes(i));
    if (!pool.length) pool = ORDRE_QUIZ.map((x, i) => i);
    const i = pool[randi(0, pool.length - 1)], Q = ORDRE_QUIZ[i];
    this.talking = true; state.busy = true; AudioSys.tap();
    await this.rise(); this.pas.pose = 'point';
    await Talk.open();
    const ok = await quiz('mentor', 'think', Q.q, Q.o, Q.a);
    await say('mentor', ok ? 'happy' : 'think', (ok ? 'Exactement ! ' : 'Pas tout à fait. ') + Q.why);
    await Talk.close();
    if (ok && !done.includes(i)) { done.push(i); persist(); await addXP(10); }
    state.busy = false; this.talking = false; this.sit(); this.renderUi(); refreshGuide();
  }
};
$('btnOrdreExit').addEventListener('click', () => Castle.exit());
$('orTalk').addEventListener('click', () => Castle.talk(false));
$('orDonjon').addEventListener('click', () => Donjon.visit());
$('orHearing').addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); Tribunal.open(); });
$('orQuiz').addEventListener('click', () => Castle.quiz());
$('orMail').addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); if (Letters.ready().length) Letters.announce(); else toast(G.letters.length ? `Le conseil étudie ton contrat : réponse dans <b>${Math.ceil(G.letters[0].t)} s</b>.` : "Aucun contrat à l'étude. Un doute sur un contrat ? Demande l'avis de l'Ordre depuis le contrat : c'est gratuit !"); });

export const CASTLE_SCRIPTS = {
  async ordreAvis(who, bad, first) {
    await say('mentor', 'happy', `${G.pseudo} ! Ici Pascale Matué, présidente du conseil départemental de l'Ordre. Notre avis sur ton contrat avec ${who} est rendu.`);
    if (first) await say('mentor', 'think', "Rappel : l'avis de l'Ordre est gratuit. Le conseil vérifie que le contrat respecte le code de déontologie… et te protège des clauses pièges.");
    await say('mentor', bad ? 'scared' : 'happy', bad ? 'Il y a des points à corriger. Lis bien notre courrier !' : 'Bonne nouvelle : rien à signaler. Voici notre courrier.');
  },
  async castleHello() {
    await say('mentor', 'happy', `Bienvenue dans la tour de l'Ordre, ${G.pseudo} ! Ici siège le conseil départemental, et oui, c'est moi qui le préside.`);
    await say('mentor', 'think', "Nos deux missions : administrative (le Tableau, les inscriptions, tes contrats) et disciplinaire (faire respecter le code de déontologie).");
    await say('mentor', 'happy', "Tu peux venir me poser des questions de déontologie quand tu veux. Et quand tu nous soumets un contrat, je te préviens dès que l'avis est rendu !");
  },
  async castleTalk() {
    const lines = [
      ['think', "Tout contrat d'exercice est écrit et transmis au conseil départemental, qui a un mois pour vérifier sa conformité. Pas de contre-lettre : c'est interdit !"],
      ['happy', "L'Ordre est consulté par les ministres sur les questions de la profession. Les syndicats, eux, défendent les intérêts des kinés : ce n'est pas le même rôle."],
      ['think', "Ta cotisation ordinale est une charge déductible. Elle est gratuite la première année après le diplôme, n'oublie pas de la payer ensuite."],
      ['happy', "La loi permet maintenant à l'Ordre de porter plainte à ta place pour des faits dans un cabinet ou une structure : tu peux rester anonyme."],
      ['think', "Un sinistre, c'est la réclamation d'un patient après un dommage lié à un soin. La majorité arrive lors des soins classiques au cabinet : chutes et brûlures en tête."]
    ];
    const k = (G.flags.castleLine = ((G.flags.castleLine || 0) + 1) % lines.length); persist();
    if (G.letters.length) await say('mentor', 'think', `Ton contrat est à l'étude : réponse dans ${Math.ceil(G.letters[0].t)} secondes. Patience !`);
    await say('mentor', lines[k][0], lines[k][1]);
  }
};
