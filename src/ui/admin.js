import { AudioSys } from '../audio/audio.js';
import { prefs, savePrefs, sessionSeconds } from '../core/prefs.js';
import { G, ORDER, START_DATE, persist, state } from '../core/save.js';
import { $, esc, frSpace } from '../core/utils.js';
import { CAB_LEVELS, ECO } from '../data/economy.js';
import { QUESTS } from '../data/quests.js';
import { ITEMS } from '../data/shop-items.js';
import { Board } from '../game/board.js';
import { Room } from '../scenes/room.js';
import { Town } from '../scenes/town.js';
import { toast } from './helpers.js';
import { HUD, addXP } from './hud.js';
import { openModal } from './modals.js';

/* ================= Admin mode: jump anywhere in the game without replaying everything =================
   Unlock: tap 5 times on the version line in the Réglages, or open the game with ?admin at the end of the link. */
const AUTO = 'coc-admin-autoplay';
const base = () => {
  G.introDone = true; G.tutoDone = true; G.shopIntro = true; if (!G.pseudo) G.pseudo = 'Admin';
  for (const k of ORDER) { G.steps[k] = true; G.paid[k] = true; }
  if (!G.date) G.date = { ...START_DATE };
  G.sess = { state: 'idle', t: 0, dur: sessionSeconds(), where: null }; G.letters = [];
};
const doneQuests = (...lists) => { for (const l of lists) for (const q of QUESTS[l]) G.q[q.id] = true; };
/* Changes of phase are applied, saved, then the game reloads straight into the town. */
function reloadTo() { persist(); try { sessionStorage.setItem(AUTO, '1'); } catch (e) {} location.reload(); }
const refresh = () => { if (state.screen === 'cabinet') { Room.renderSlots(); Room.renderTeam(); Room.syncUi(); } if (state.screen === 'town') Town.renderDom(); };

const ACTIONS = {
  money10: ['Argent', '+10 000 €', () => { G.money += 10000; }],
  money100: ['Argent', '+100 000 €', () => { G.money += 100000; }],
  level: ['Progression', '+1 niveau', async () => { await addXP(Math.max(1, 100 + (G.level - 1) * 60 - G.xp)); }],
  patients: ['Progression', '+50 patients', () => { G.patients += 50; }],
  quests: ['Progression', 'Valider les quêtes de la phase', () => { doneQuests(G.phase === 'rempl' ? 'rempl' : G.phase === 'assist' ? 'assist' : 'titulaire'); if (G.phase === 'rempl') doneQuests('rempl_bonus'); }],
  rempl: ['Sauter à…', 'Remplaçant (démarches faites)', () => { base(); G.phase = 'rempl'; G.contract = null; Board.init(); reloadTo(); }],
  assist: ['Sauter à…', 'Assistant chez Ambroise (6 mois faits)', () => {
    base(); doneQuests('rempl', 'rempl_bonus'); G.monthsRempl = Math.max(12, G.monthsRempl); G.monthsAssist = Math.max(ECO.assistMin, G.monthsAssist); G.months = Math.max(G.months, 18);
    G.phase = 'assist'; G.assistOffer = null; G.contract = { kind: 'assist', cab: 'B', tit: 'Ambroise', months: 9999, done: 0, r: ECO.assistRate, km: 3 }; G.money = Math.max(G.money, 25000); reloadTo();
  }],
  ...Object.fromEntries([1, 2, 3].map((l) => ['tit' + l, ['Sauter à…', `Titulaire · cabinet niveau ${l}`, () => {
    base(); doneQuests('rempl', 'rempl_bonus', 'assist'); G.monthsRempl = Math.max(12, G.monthsRempl); G.monthsAssist = Math.max(ECO.assistMin, G.monthsAssist); G.months = Math.max(G.months, 24);
    G.phase = 'titulaire'; G.contract = null; G.assistOffer = null; G.cab = { level: l, build: null };
    for (const q of ['loan', 'build']) G.q[q] = true; if (l >= 2) G.q.lvl2 = true; if (l >= 3) G.q.lvl3 = true;
    for (let k = 1; k <= l; k++) if (!G.immos.some((i) => i.id === 'cab' + k)) G.immos.push({ id: 'cab' + k, label: CAB_LEVELS[k].label, price: CAB_LEVELS[k].cost, y: G.date.y, m: G.date.m, years: CAB_LEVELS[k].years, cat: CAB_LEVELS[k].cat });
    G.money = Math.max(G.money, 30000); reloadTo();
  }]])),
  finish: ['Raccourcis', 'Terminer chantier, formation et avis de l’Ordre', () => { if (G.cab.build) G.cab.build.t = G.cab.build.dur; if (G.training) G.training.t = 0; G.letters.forEach((l) => { l.t = 0; }); }],
  allEq: ['Raccourcis', 'Tout le matériel de mon niveau', () => { if (G.phase !== 'titulaire') return 'Il faut être titulaire.'; for (const id in ITEMS) { const it = ITEMS[id]; if (it.tab === 'materiel' && it.lvl <= G.cab.level) G.owned[id] = G.owned[id] || { ...G.date }; } }],
  mathieu: ['Raccourcis', 'Recruter Mathieu', () => { if (G.phase !== 'titulaire' || G.cab.level < 1) return 'Il faut être titulaire avec un cabinet.'; G.staff.mathieu = G.staff.mathieu || { rate: ECO.mathieuRate, since: { ...G.date } }; G.hireOffer = null; G.q.mathieu = true; }],
  fast: ['Vitesse', 'Mode démo (3× plus rapide) oui / non', () => { prefs.fast = !prefs.fast; savePrefs(); return prefs.fast ? 'Mode démo activé.' : 'Mode démo coupé.'; }]
};

export const Admin = {
  unlocked() { return !!prefs.admin; },
  unlock() { prefs.admin = true; savePrefs(); $('adminBtn').hidden = false; AudioSys.success(); toast('Mode admin débloqué : bouton <b>Mode admin</b> dans les Réglages.'); },
  open() {
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
    const msg = await a[2]();
    persist(); HUD.tweenMoney(); HUD.render(); refresh();
    toast(typeof msg === 'string' ? msg : `Fait : <b>${esc(frSpace(a[1]))}</b>`, 2400);
  },
  /* after a phase jump: skip the loader and the title screen */
  autoplay() { try { if (sessionStorage.getItem(AUTO)) { sessionStorage.removeItem(AUTO); return true; } } catch (e) {} return false; }
};
$('admin').addEventListener('click', (e) => { const b = e.target.closest('[data-adm]'); if (b) Admin.run(b.dataset.adm); });
$('adminBtn').addEventListener('click', () => { $('settings').hidden = true; Admin.open(); });
{
  let taps = 0, tt = 0;
  document.querySelector('#settings .snote').addEventListener('click', () => { if (Admin.unlocked()) return; taps = Date.now() - tt < 1500 ? taps + 1 : 1; tt = Date.now(); if (taps >= 5) Admin.unlock(); });
  if (/[?&]admin\b/.test(location.search) && !prefs.admin) { prefs.admin = true; savePrefs(); }
  $('adminBtn').hidden = !prefs.admin;
}
