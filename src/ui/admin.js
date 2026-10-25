import { AudioSys } from '../audio/audio.js';
import { prefs, savePrefs, sessionSeconds } from '../core/prefs.js';
import { G, ORDER, START_DATE, persist, state } from '../core/save.js';
import { $, esc, frSpace } from '../core/utils.js';
import { CAB_LEVELS, ECO, MAX_CAB } from '../data/economy.js';
import { STOCK } from '../data/market.js';
import { QUESTS } from '../data/quests.js';
import { ITEMS } from '../data/shop-items.js';
import { CANDIDATES, HIRE_ORDER } from '../data/staff.js';
import { Board } from '../game/board.js';
import { Cotation, Cpam } from '../game/cotation.js';
import { Hire, staffList } from '../game/staff.js';
import { Room } from '../scenes/room.js';
import { Town } from '../scenes/town.js';
import { Travel } from '../scenes/travel.js';
import { Incidents } from '../scenes/tribunal.js';
import { toast } from './helpers.js';
import { HUD, addXP } from './hud.js';
import { closeModal, modalOpen, openModal } from './modals.js';

/* ================= Admin mode: jump anywhere in the game without replaying everything =================
   Secret: touch the Clash of Cab's logo (top left) 5 times, then the settings gear 3 times,
   with at most one second between two touches. Opening the game with ?admin also unlocks it. */
const AUTO = 'coc-admin-autoplay';
const base = () => {
  G.introDone = true; G.tutoDone = true; G.shopIntro = true; if (!G.pseudo) G.pseudo = 'Admin';
  for (const k of ORDER) { G.steps[k] = true; G.paid[k] = true; }
  if (!G.date) G.date = { ...START_DATE };
  G.sess = { state: 'idle', t: 0, dur: sessionSeconds(), where: null }; G.letters = []; G.trip = null; G.map = 'main';
};
const doneQuests = (...lists) => { for (const l of lists) for (const q of QUESTS[l]) G.q[q.id] = true; };
/* Changes of phase are applied, saved, then the game reloads straight into the town. */
function reloadTo() { persist(); try { sessionStorage.setItem(AUTO, '1'); } catch (e) {} location.reload(); }
const refresh = () => { if (state.screen === 'cabinet') { Room.renderSlots(); Room.renderTeam(); Room.syncUi(); } if (state.screen === 'town') Town.renderDom(); };
const titOnly = () => (G.phase !== 'titulaire' || G.cab.level < 1 ? 'Il faut être titulaire, avec un cabinet construit.' : null);
const toTit = (l) => {
  base(); doneQuests('rempl', 'rempl_bonus', 'assist'); G.monthsRempl = Math.max(12, G.monthsRempl); G.monthsAssist = Math.max(ECO.assistMin, G.monthsAssist); G.months = Math.max(G.months, 24);
  G.phase = 'titulaire'; G.contract = null; G.assistOffer = null; G.cab = { level: l, build: null };
  for (const q of ['loan', 'build']) G.q[q] = true; for (let k = 2; k <= l; k++) G.q['lvl' + k] = true;
  for (let k = 1; k <= l; k++) if (!G.immos.some((i) => i.id === 'cab' + k)) G.immos.push({ id: 'cab' + k, label: CAB_LEVELS[k].label, price: CAB_LEVELS[k].cost, y: G.date.y, m: G.date.m, years: CAB_LEVELS[k].years, cat: CAB_LEVELS[k].cat });
  for (const id in STOCK) G.stock[id] = Math.max(G.stock[id] || 0, 3);
  G.money = Math.max(G.money, 30000); reloadTo();
};
/* [group, label, action, closes the menu] */
const ACTIONS = {
  money10: ['Argent', '+10 000 €', () => { G.money += 10000; }],
  money100: ['Argent', '+100 000 €', () => { G.money += 100000; }],
  level: ['Progression', '+1 niveau', async () => { await addXP(Math.max(1, 100 + (G.level - 1) * 60 - G.xp)); }],
  patients: ['Progression', '+50 patients', () => { G.patients += 50; }],
  quests: ['Progression', 'Valider les quêtes de la phase', () => { doneQuests(G.phase === 'rempl' ? 'rempl' : G.phase === 'assist' ? 'assist' : 'titulaire'); if (G.phase === 'rempl') doneQuests('rempl_bonus'); }],
  dem: ['Sauter à…', 'Début des démarches', () => { G.introDone = true; G.tutoDone = true; if (!G.pseudo) G.pseudo = 'Admin'; G.phase = 'demarches'; G.steps = {}; G.paid = {}; G.contract = null; G.date = null; G.map = 'main'; reloadTo(); }],
  rempl: ['Sauter à…', 'Remplaçant (démarches faites)', () => { base(); G.phase = 'rempl'; G.contract = null; Board.init(); reloadTo(); }],
  assist: ['Sauter à…', 'Assistant chez Ambroise (6 mois faits)', () => {
    base(); doneQuests('rempl', 'rempl_bonus'); G.monthsRempl = Math.max(12, G.monthsRempl); G.monthsAssist = Math.max(ECO.assistMin, G.monthsAssist); G.months = Math.max(G.months, 18);
    G.phase = 'assist'; G.assistOffer = null; G.contract = { kind: 'assist', cab: 'B', tit: 'Ambroise', months: 9999, done: 0, r: ECO.assistRate, km: 3 }; G.money = Math.max(G.money, 25000); reloadTo();
  }],
  ...Object.fromEntries(Array.from({ length: MAX_CAB }, (x, i) => i + 1).map((l) => ['tit' + l, ['Titulaire · niveau du cabinet', `Niveau ${l}`, () => toTit(l)]])),
  maps: ['Destinations', 'Débloquer les 3 destinations', () => { G.flags.adminMaps = true; for (const v of ['velo', 'bateau', 'jet']) { G.veh[v] = true; G.owned[v] = G.owned[v] || { ...(G.date || START_DATE) }; } }],
  goMaransin: ['Destinations', 'Aller à Maransin', () => { G.flags.adminMaps = true; setTimeout(() => Travel.go('maransin'), 300); }, true],
  goReunion: ['Destinations', 'Aller à La Réunion', () => { G.flags.adminMaps = true; setTimeout(() => Travel.go('reunion'), 300); }, true],
  goMichigan: ['Destinations', 'Aller au Michigan', () => { G.flags.adminMaps = true; setTimeout(() => Travel.go('michigan'), 300); }, true],
  goMain: ['Destinations', 'Retour en ville', () => { setTimeout(() => Travel.go('main'), 300); }, true],
  stock: ['Cabinet', 'Fournitures pleines (6 mois)', () => { for (const id in STOCK) G.stock[id] = 6; }],
  noStock: ['Cabinet', 'Vider les fournitures', () => { for (const id in STOCK) G.stock[id] = 0; }],
  boost: ['Cabinet', 'Repas boost (+8 %)', () => { G.boost = { id: 'rougail', name: 'Rougail saucisse', k: 0.08, months: 1 }; }],
  finish: ['Cabinet', 'Terminer chantier, formation et avis de l’Ordre', () => { if (G.cab.build) G.cab.build.t = G.cab.build.dur; if (G.training) G.training.t = 0; G.letters.forEach((l) => { l.t = 0; }); }],
  allEq: ['Cabinet', 'Tout le matériel de mon niveau', () => { if (G.phase !== 'titulaire') return 'Il faut être titulaire.'; for (const id in ITEMS) { const it = ITEMS[id]; if (it.tab === 'materiel' && it.lvl <= G.cab.level) G.owned[id] = G.owned[id] || { ...G.date }; } }],
  ...Object.fromEntries(HIRE_ORDER.map((w) => ['hire_' + w, ['Équipe', `Recruter ${CANDIDATES[w].name}`, () => {
    const no = titOnly(); if (no) return no;
    if (staffList().some((s) => s.who === w)) return `${CANDIDATES[w].name} travaille déjà avec toi.`;
    G.staff.list.push({ who: w, rate: ECO.mathieuRate, since: { ...G.date } }); if (G.hireOffer && G.hireOffer.who === w) G.hireOffer = null; G.q.mathieu = true;
  }]])),
  candidate: ['Équipe', 'Faire venir le prochain candidat', () => {
    const no = titOnly(); if (no) return no;
    const who = HIRE_ORDER.find((w) => !staffList().some((s) => s.who === w)); if (!who) return 'Tous les candidats sont déjà recrutés.';
    G.hireOffer = { ver: 1, who, bad: ['indep', 'argent'], state: 'due', due: G.months }; Town.offerCar = null; Hire.check();
    return `${CANDIDATES[who].name} arrive en voiture devant ton cabinet.`;
  }],
  cotation: ['Événements', 'Coter une séance (test)', async () => { const r = await Cotation.ask(Cotation.draw(), { kick: 'Mode admin · cotation' }); Cotation.record(r, ECO.halfDays); }, true],
  cpam: ['Événements', 'Contrôle de la CPAM maintenant', async () => { if (!Cpam.unchecked().length) { const r = { ok: false, value: 34.26, right: 17.68, chosen: 'RAV 15,50', good: 'RAV 8,00', cs: 'lymph' }; Cotation.record(r, ECO.halfDays); } await Cpam.control(true); }, true],
  incident: ['Événements', 'Incident avec un patient', async () => { await Incidents.happen(null, false); }, true],
  tribunal: ['Événements', 'Convocation devant la chambre disciplinaire', () => {
    G.inc.hearing = { pt: Cotation.draw(), inc: 'chute', fault: 'neglige', stage: 'chambre', due: G.months, y: (G.date || START_DATE).y, m: (G.date || START_DATE).m };
    return 'Plainte déposée : va à la tour de l’Ordre, bouton « Audience ».';
  }],
  gender: ['Personnage', 'Changer garçon / fille', () => { G.gender = G.gender === 'f' ? 'm' : 'f'; return G.gender === 'f' ? 'Tu joues maintenant une kiné.' : 'Tu joues maintenant un kiné.'; }],
  fast: ['Vitesse', 'Mode démo (3× plus rapide) oui / non', () => { prefs.fast = !prefs.fast; savePrefs(); return prefs.fast ? 'Mode démo activé.' : 'Mode démo coupé.'; }]
};

/* the secret sequence: 5 × logo, then 3 × gear, at most one second apart */
const SEQ = { logo: 0, gear: 0, t: 0 };
export const Admin = {
  unlocked() { return !!prefs.admin; },
  unlock() { if (!prefs.admin) { prefs.admin = true; savePrefs(); } $('adminBtn').hidden = false; },
  logoTap() {
    const now = Date.now();
    if (now - SEQ.t > 1000 || SEQ.gear) { SEQ.logo = 0; SEQ.gear = 0; }
    SEQ.logo++; SEQ.t = now;
    const l = $('hudLogo'); l.classList.remove('bump'); void l.offsetWidth; l.classList.add('bump');
  },
  /* returns true when the touch belongs to the secret sequence (the settings must not open) */
  gearTap() {
    const now = Date.now();
    if (SEQ.logo >= 5 && now - SEQ.t <= 1000) {
      SEQ.gear++; SEQ.t = now;
      if (SEQ.gear >= 3) { SEQ.logo = 0; SEQ.gear = 0; this.unlock(); AudioSys.success(); this.open(); }
      else AudioSys.tick();
      return true;
    }
    SEQ.logo = 0; SEQ.gear = 0;
    return false;
  },
  open() {
    if (state.busy) return;
    for (const id of ['settings', 'quests', 'compta', 'board', 'market']) if (!$(id).hidden) closeModal(id);
    const groups = {};
    for (const [k, [g, label]] of Object.entries(ACTIONS)) (groups[g] = groups[g] || []).push(`<button type="button" class="btn sm btn-blue" data-adm="${k}">${esc(frSpace(label))}</button>`);
    $('admBody').innerHTML = `<p class="adm-help">${frSpace('Outils pour tester le jeu sans tout refaire. Les sauts de phase rechargent le jeu directement en ville. Pense à « Recommencer la partie » pour revenir à une vraie partie.')}</p>` +
      Object.entries(groups).map(([g, btns]) => `<div class="adm-g"><h3>${esc(g)}</h3><div class="adm-btns">${btns.join('')}</div></div>`).join('');
    openModal('admin');
  },
  async run(k) {
    if (state.busy) return;
    const a = ACTIONS[k]; if (!a) return;
    AudioSys.tap();
    if (a[3]) { closeModal('admin'); if (modalOpen()) return; }
    const msg = await a[2]();
    persist(); HUD.tweenMoney(); HUD.render(); refresh();
    if (!a[3]) toast(typeof msg === 'string' ? msg : `Fait : <b>${esc(frSpace(a[1]))}</b>`, 2400);
    else if (typeof msg === 'string') toast(msg, 2400);
  },
  /* after a phase jump: skip the loader and the title screen */
  autoplay() { try { if (sessionStorage.getItem(AUTO)) { sessionStorage.removeItem(AUTO); return true; } } catch (e) {} return false; }
};
$('admin').addEventListener('click', (e) => { const b = e.target.closest('[data-adm]'); if (b) Admin.run(b.dataset.adm); });
$('adminBtn').addEventListener('click', () => { $('settings').hidden = true; Admin.open(); });
if (/[?&]admin\b/.test(location.search) && !prefs.admin) { prefs.admin = true; savePrefs(); }
$('adminBtn').hidden = !prefs.admin;
