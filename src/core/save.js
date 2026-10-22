/* ================= Save ================= */
export const ORDER = ['rcp', 'ordre', 'urssaf', 'carpimko', 'cpam'];
export const PRE_DATE = { y: 2027, m: 6 };        // diploma + démarches in June 2027
export const START_DATE = { y: 2027, m: 7 };      // first month of work
export const PHASES = { intro: 'Diplômé', demarches: 'Jeune diplômé', rempl: 'Remplaçant', assist: 'Assistant libéral', titulaire: 'Titulaire' };
export const freshSave = () => ({
  v: 4, phase: 'intro',
  introDone: false, tutoDone: false, shopIntro: false, steps: {}, paid: {}, quiz: {}, pseudo: '',
  money: 3000, xp: 0, level: 1, patients: 0,
  date: null, months: 0, monthsRempl: 0, monthsAssist: 0,
  journal: [], immos: [], owned: {}, classified: {}, formations: {},
  contract: null,              // current workplace contract
  board: [], boardSeen: {}, boardNext: 0,
  letters: [],                 // Ordre answers on their way (seconds left)
  sess: { state: 'idle', t: 0, dur: 15, where: null },
  cab: { level: 0, build: null },   // own cabinet on plot C
  loan: null,
  staff: { mathieu: null },
  hireOffer: null,
  decl: {}, pendingDecl: null,
  events: {}, q: {}, flags: {}, seq: 0,
  street: { asked: [], right: 0, total: 0 },
  calls: { asked: [], right: 0, total: 0 }
});
export let G = freshSave(); export function replaceSave(g) { G = g; }
const SAVE_KEY = 'coc-save-v4';
export let hadOldSave = false;
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s && s.v === 4) {
      const f = freshSave();
      G = Object.assign(f, s);
      for (const k of ['sess', 'cab', 'staff', 'street', 'calls']) G[k] = Object.assign(f[k], s[k] || {});
      if (G.sess.state === 'run' && G.sess.t >= G.sess.dur) G.sess.state = 'ready';
      /* saves made with the short-lived version 5: back to 3 cabinet levels, furniture being assembled is delivered */
      if (G.cab.level > 3) G.cab.level = 3;
      if (G.cab.build && G.cab.build.to > 3) G.cab.build = null;
      if (G.furnish) { for (const id in G.furnish) G.owned[id] = G.owned[id] || { y: G.furnish[id].y, m: G.furnish[id].m }; delete G.furnish; }
      return;
    }
  } catch (e) {}
  try { hadOldSave = !!(localStorage.getItem('coc-save-v3') || localStorage.getItem('coc-save-v2')); } catch (e) {}
}
export function jEntry(g, d, label, amount, cat, sub, extra) {
  g.seq = (g.seq || 0) + 1;
  return Object.assign({ n: g.seq, y: d.y, m: d.m, label, amount, cat, sub }, extra || {});
}
export const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {} };
loadSave();

export const allSteps = () => ORDER.every((k) => G.steps[k]);
export const firstUndone = () => ORDER.find((k) => !G.steps[k]);
export const xpNeed = (lvl) => 100 + (lvl - 1) * 60;
export const curDate = () => G.date || PRE_DATE;
const isPhase = (...p) => p.includes(G.phase);
export const working = () => isPhase('rempl', 'assist', 'titulaire');
/* Where the player treats patients right now: a town cabinet id, or null. */
export function workplace() {
  if (G.phase === 'titulaire') return G.cab.level >= 1 ? 'C' : null;
  return G.contract ? G.contract.cab : null;
}

export const state = { screen: 'loading', started: false, busy: false, shopOpen: false, roomCab: null };
