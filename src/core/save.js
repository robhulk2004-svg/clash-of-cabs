/* ================= Save ================= */
export const ORDER = ['rcp', 'ordre', 'urssaf', 'carpimko', 'cpam'];
export const PRE_DATE = { y: 2027, m: 6 };        // diploma + démarches in June 2027
export const START_DATE = { y: 2027, m: 7 };      // first month of work
export const PHASES = { intro: 'Diplômé', demarches: 'Jeune diplômé', rempl: 'Remplaçant', assist: 'Assistant libéral', titulaire: 'Titulaire' };
export const PHASES_F = { intro: 'Diplômée', demarches: 'Jeune diplômée', rempl: 'Remplaçante', assist: 'Assistante libérale', titulaire: 'Titulaire' };
export const freshSave = () => ({
  v: 4, phase: 'intro', gender: 'm',
  introDone: false, tutoDone: false, shopIntro: false, steps: {}, paid: {}, quiz: {}, pseudo: '',
  money: 3000, xp: 0, level: 1, patients: 0,
  date: null, months: 0, monthsRempl: 0, monthsAssist: 0,
  journal: [], immos: [], owned: {}, classified: {}, formations: {},
  contract: null,              // current workplace contract
  board: [], boardSeen: {}, boardNext: 0,
  letters: [],                 // Ordre answers on their way (seconds left)
  sess: { state: 'idle', t: 0, dur: 15, where: null },
  cab: { level: 0, build: null },   // own cabinet on plot C (levels 1 to 9)
  loan: null,
  staff: { list: [] },         // assistants of your cabinet: { who, rate, since }
  hireOffer: null,
  map: 'main',                 // the map you are looking at
  veh: {},                     // vehicles bought (vélo, bateau, jet)
  stock: { huile: 0, sopalin: 0, gel: 0, elastiques: 0 },   // consumables, in months of use
  boost: null,                 // food from the supermarket: { id, k, months }
  ngap: { log: [], n: 0, ok: 0, checked: 0, last: 0 },      // séances you coded (NGAP), CPAM controls
  inc: { pending: null, hearing: null, record: [], banned: 0, n: 0 },   // incidents with patients, the Ordre's tribunal
  trip: null,                  // titulaire on a trip: who replaces you (and the pay of a mission abroad)
  mission: null,               // v6: a mission abroad (Chad, Suzie): { cab, state: 'work' | 'done' }
  mine: { acc: 0, sum: 0, at: 0 },                          // v6: redevances of your assistants piling up (collected this month: sum)
  consult: { n: 0, ok: 0, recent: [] },                     // v6: prises en charge answered / right, last cases seen
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
      for (const k of ['sess', 'cab', 'staff', 'street', 'calls', 'stock', 'ngap', 'inc', 'mine', 'consult']) G[k] = Object.assign(f[k], s[k] || {});
      if (G.sess.state === 'run' && G.sess.t >= G.sess.dur) G.sess.state = 'ready';
      /* saves of version 4: Mathieu joins the list of assistants, everyone was a boy, the town is the new map */
      if (G.staff.mathieu) { G.staff.list.push({ who: 'mathieu', rate: G.staff.mathieu.rate, since: G.staff.mathieu.since }); }
      delete G.staff.mathieu;
      if (!G.gender) G.gender = 'm';
      if (G.cab.level > 9) G.cab.level = 9;
      if (G.cab.build && G.cab.build.to > 9) G.cab.build = null;
      if (G.furnish) { for (const id in G.furnish) G.owned[id] = G.owned[id] || { y: G.furnish[id].y, m: G.furnish[id].m }; delete G.furnish; }
      if (!['main', 'maransin', 'reunion', 'michigan', 'moon'].includes(G.map)) G.map = 'main';
      /* saves of version 5: Ambroise no longer has a cabinet (B); Mathieu (La Réunion) hires the assistants */
      if (G.contract && G.contract.cab === 'B') {
        if (G.contract.kind === 'assist') Object.assign(G.contract, { cab: 'R', tit: 'Mathieu Mopourmot', km: 4 });
        else Object.assign(G.contract, { cab: 'A', tit: 'Thomas Cassmoildeau' });
        if (G.sess.where === 'B') G.sess = { state: 'idle', t: 0, dur: 15, where: null };
      }
      G.board = (G.board || []).filter((o) => !/^(amb|port)/.test(o.def));
      for (const st of G.staff.list) if (st.who === 'mathieu') st.who = 'ambroise';
      if (G.hireOffer && G.hireOffer.who === 'mathieu') G.hireOffer.who = 'ambroise';
      if (G.q.mathieu) G.q.hire1 = true;
      if (G.sess.state === 'run' && !G.sess.day) G.sess.state = 'ready';
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
/* « il / elle » : texts addressed to the player (boy or girl) */
export const fem = () => G.gender === 'f';
export const gx = (m, f) => (G.gender === 'f' ? f : m);
export const curDate = () => G.date || PRE_DATE;
const isPhase = (...p) => p.includes(G.phase);
export const working = () => isPhase('rempl', 'assist', 'titulaire');
/* Where the player treats patients right now: a town cabinet id, or null. */
export function workplace() {
  if (G.mission && G.mission.state === 'work') return G.mission.cab;
  if (G.phase === 'titulaire') return G.cab.level >= 1 ? 'C' : null;
  return G.contract ? G.contract.cab : null;
}

export const state = { screen: 'loading', started: false, busy: false, shopOpen: false, roomCab: null };
