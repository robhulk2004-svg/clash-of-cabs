import { IMG } from '../core/assets.js';
import { G } from '../core/save.js';
import { META } from '../data/sprites.js';

/* ================= Sprite helpers (atlases rendered offline in the game's dimetric style) ================= */
export const depthK = (y) => 0.82 + 0.30 * (y - 250) / 600;      // perspective inside the cabinet
const EQ_PPU = 115;                                          // room pixels per metre for the 3D props
export const PATIENT_FPS = { walk: 7, squat: 4.2, plank: 2.6, pushup: 3.6, march: 5, squat_march: 4.6, lunge: 4.2, crunch: 3.2 };
export function drawShadow(c, x, y, rx, ry, a = 0.2) {
  c.save(); c.globalAlpha *= a; c.fillStyle = '#1b1406'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.2832); c.fill(); c.restore();
}
export function drawPatient(c, sheet, row, frame, x, y, s, flip, alpha = 1) {
  const m = META.p[sheet], img = IMG['p_' + sheet]; if (!img || alpha <= 0) return;
  c.save(); c.globalAlpha = alpha; c.translate(x, y); if (flip) c.scale(-1, 1);
  c.drawImage(img, (frame % 4) * m.cw, row * m.ch, m.cw, m.ch, -m.ax * s, -m.ay * s, m.cw * s, m.ch * s);
  c.restore();
}
/* v6: the new patients (young adults). q_* sheets, one row per patient: 0 the girl with a backpack, 1 the blond guy,
   2 the curly guy, 3 the sporty girl. Their exercises: squat, plank, pushup, lunge, crunch. */
export function drawQ(c, sheet, row, frame, x, y, s, flip, alpha = 1) {
  const m = META.q[sheet], img = IMG['q_' + sheet]; if (!m || !img || alpha <= 0) return;
  const n = (m.rn && m.rn[row]) || 4;
  c.save(); c.globalAlpha = alpha; c.translate(x, y); if (flip) c.scale(-1, 1);
  c.drawImage(img, (frame % n) * m.cw, row * m.ch, m.cw, m.ch, -m.ax * s, -m.ay * s, m.cw * s, m.ch * s);
  c.restore();
}
/* the exercise of a station, for the new patients (they lunge instead of marching) */
const Q_EX = { squat: 'squat', plank: 'plank', pushup: 'pushup', march: 'lunge', squat_march: 'lunge', lunge: 'lunge', crunch: 'crunch' };
/* how many frames an exercise has for this kind of patient */
export function exFrames(kind, sheet) {
  if (kind && kind[0] === 'q') { const m = META.q[Q_EX[sheet] || sheet]; return (m && m.rn && m.rn[+kind[1]]) || 4; }
  return 4;
}
/* Any patient: kind 'q0'…'q3' (v6 young adults) or 'p0'…'p3' (v5 sheets: old man, old woman, adult man, young woman). */
export function drawWho(c, kind, sheet, frame, x, y, s, flip, alpha = 1) {
  if (kind && kind[0] === 'q') drawQ(c, sheet.startsWith('walk') ? sheet : Q_EX[sheet] || 'squat', +kind[1], frame, x, y, s, flip, alpha);
  else drawPatient(c, sheet, kind ? +kind.slice(1) : 0, frame, x, y, s, flip, alpha);
}
/* Eight views (cars, cowboys, minis, aliens): 0 front, 1 front-right, 2 right, 3 back-right, 4 back, 5 back-left, 6 left, 7 front-left. */
export const dir8 = (vx, vy) => (((2 - Math.round(Math.atan2(vy, vx) / (Math.PI / 4))) % 8) + 8) % 8;
/* the small walkers of the other maps have one picture per view: they hop as they walk */
export function drawView8(c, key, view, x, y, s, opt = {}) {
  const m = META.v[key], img = IMG['v_' + key]; if (!m || !img) return;
  const a = opt.alpha == null ? 1 : opt.alpha; if (a <= 0) return;
  const S = s / (m.k || 1);
  c.save(); c.globalAlpha = a; c.translate(x, y - (opt.hop || 0)); if (opt.tilt) c.rotate(opt.tilt); if (opt.sy) c.scale(1, opt.sy);
  c.drawImage(img, (view % 8) * m.cw, 0, m.cw, m.ch, -m.ax * S, -m.ay * S, m.cw * S, m.ch * S);
  c.restore();
}
export function drawCar8(c, row, view, x, y, s, alpha = 1) {
  const m = META.cars8, img = IMG.cars8; if (!m || !img || alpha <= 0) return;
  const S = s / (m.k || 1);
  c.save(); c.globalAlpha = alpha;
  c.drawImage(img, (view % 8) * m.cw, (row % m.rn.length) * m.ch, m.cw, m.ch, x - m.ax * S, y - m.ay * S, m.cw * S, m.ch * S);
  c.restore();
}
/* Choose a walk view from the velocity: profile for mostly horizontal moves, front or back otherwise. */
export function walkView(vx, vy) {
  if (Math.abs(vx) >= 1.4 * Math.abs(vy)) return ['walk_side', vx < 0];
  return [vy > 0 ? 'walk_front' : 'walk_back', false];
}
/* Exercises loop back and forth through their 4 frames. */
export const pingPong = (t, fps, n = 4) => { const P = 2 * n - 2, k = Math.floor(t * fps) % P; return k < n ? k : P - k; };
function eqScale(name, y) { return (EQ_PPU / META.eq[name].ppu) * depthK(y); }
export function drawEq(c, name, x, y, k = 1, alpha = 1) {
  const m = META.eq[name], img = IMG['eq_' + name]; if (!img || alpha <= 0) return;
  const s = eqScale(name, y) * k;
  c.save(); c.globalAlpha = alpha; c.drawImage(img, x - m.ax * s, y - m.ay * s, m.w * s, m.h * s); c.restore();
}

/* ================= Named characters (small sprites cut from the provided sheets) =================
   Each pose row holds 4 frames; walk sheets give side / front / back rows. */
const CHARS = {
  player: { walk: { sheet: 'c45', right: 0, front: 1, left: 2, back: 3, fps: 7 }, idle: ['c45', 1, 1], talk: ['c45', 1, 1], happy: ['c45', 1, 1], kneel: ['c45', 1, 1] },
  playerf: { walk: { sheet: 'c40', right: 1, left: 2, front: 3, back: 4, fps: 7 }, idle: ['c40', 0, 0, 0, 0.84], talk: ['c40', 0, 0, 0, 0.84], happy: ['c40', 0, 0, 0, 0.84], kneel: ['c40', 0, 0, 0, 0.84] },
  ambroise: { walk: { sheet: 'c32', right: 0, front: 1, back: 2, fps: 9 }, idle: ['c32', 3, 0, 0, 0.84], talk: ['c32', 3, 2, 0, 0.84], coach: ['c32', 3, 2, 0, 0.84], happy: ['c32', 3, 1, 0, 0.84], wave: ['c32', 3, 1, 0, 0.84], think: ['c32', 3, 3, 0, 0.84], cheer: ['c32', 3, 4, 0, 0.84], massage: ['c32', 3, 4, 0, 0.84], point: ['c32', 3, 5, 0, 0.84], tablet: ['c32', 3, 6, 0, 0.84], sit: ['c32', 3, 7, 0, 0.84], scared: ['c32', 4, 0], panic: ['c32', 4, 1], angry: ['c32', 4, 2], laugh: ['c32', 4, 3], sad: ['c32', 4, 4] },
  mathieu: { walk: { sheet: 'c18', right: 0, front: 1, left: 2, back: 3 }, idle: ['c19', 0], think: ['c19', 1], talk: ['c19', 2], kneel: ['c20', 3], wave: ['c19', 2], happy: ['c19', 0], coach: ['c19', 2] },
  marvin: { walk: { sheet: 'c23', right: 0, left: 1, front: 2, back: 3 }, idle: ['c21', 0], angry: ['c21', 1], scared: ['c21', 2], happy: ['c21', 3], read: ['c22', 0], write: ['c22', 1], point: ['c22', 2], stamp: ['c22', 3], talk: ['c21', 3], think: ['c22', 0] },
  menton: { walk: { sheet: 'c12', right: 0, front: 1, left: 2, back: 3 }, idle: ['c13', 0], think: ['c13', 1], talk: ['c13', 2], scared: ['c13', 3], clip: ['c14', 0], point: ['c14', 2], happy: ['c14', 3] },
  /* the confrères of the town and the president of the Ordre */
  thomas: { walk: { sheet: 'c27', right: 0, left: 1, back: 2, fps: 11 }, idle: ['c27', 3], talk: ['c27', 4, 0], happy: ['c27', 4, 1], think: ['c27', 4, 2], wave: ['c27', 4, 3], coach: ['c27', 3] },
  julien: { walk: { sheet: 'c28', right: 0, left: 1, back: 2, fps: 11 }, idle: ['c28', 4, 0], talk: ['c28', 4, 4], wave: ['c28', 4, 5], think: ['c28', 4, 6], happy: ['c28', 4, 8], point: ['c28', 4, 10], read: ['c28', 4, 11], scared: ['c28', 4, 12], coach: ['c28', 4, 3] },
  etienne: { walk: { sheet: 'c29', right: 0, left: 1, back: 2, fps: 8 }, idle: ['c29', 3], wave: ['c29', 4, 1], happy: ['c29', 4, 2], talk: ['c29', 4, 3], think: ['c29', 4, 4], tablet: ['c29', 4, 5], massage: ['c29', 4, 6, 3], coach: ['c29', 4, 3], cheer: ['c29', 4, 9] },
  damien: { walk: { sheet: 'c31', front: 0, back: 1, left: 2, fps: 14 }, idle: ['c31', 3, 0], point: ['c31', 3, 1], laugh: ['c31', 3, 2], think: ['c31', 3, 3], shock: ['c31', 3, 4], guard: ['c31', 3, 5], slash: ['c31', 3, 6], jump: ['c31', 3, 7], dizzy: ['c31', 4, 0], kneel: ['c31', 4, 1], win: ['c31', 4, 2], cheer: ['c31', 4, 3], dash: ['c31', 4, 4, 2], spin: ['c31', 4, 6] },
  pascale: { walk: { sheet: 'c30', right: 0, left: 1, back: 2, front: 3, fps: 9 }, idle: ['c30', 4, 0], wave: ['c30', 4, 1], think: ['c30', 4, 2], happy: ['c30', 4, 3], point: ['c30', 4, 4], talk: ['c30', 4, 4], clip: ['c30', 4, 5], throne: ['c30', 4, 6] },
  /* v5: the new possible assistants / remplaçants */
  gabriel: { walk: { sheet: 'c33', right: 0, front: 1, left: 2, back: 3, fps: 9 }, idle: ['c33', 4, 0], happy: ['c33', 4, 1], wave: ['c33', 4, 1], cheer: ['c33', 4, 2], think: ['c33', 4, 3], point: ['c33', 4, 4], talk: ['c33', 4, 5], coach: ['c33', 4, 5], tablet: ['c33', 4, 6], sit: ['c33', 4, 7], kneel: ['c33', 4, 6] },
  mathis: { walk: { sheet: 'c34', right: 0, front: 1, left: 2, back: 3, fps: 9 }, idle: ['c34', 4, 0, 0, 1.13], happy: ['c34', 4, 1, 0, 1.13], wave: ['c34', 4, 1, 0, 1.13], cheer: ['c34', 4, 2, 0, 1.13], think: ['c34', 4, 3, 0, 1.13], point: ['c34', 4, 4, 0, 1.13], coach: ['c34', 4, 5, 0, 1.13], talk: ['c34', 4, 4, 0, 1.13], tablet: ['c34', 4, 6, 0, 1.13], sit: ['c34', 4, 7], kneel: ['c34', 4, 6, 0, 1.13] },
  paul: { walk: { sheet: 'c35', right: 0, front: 1, left: 2, back: 3, fps: 9 }, idle: ['c35', 1, 0], talk: ['c35', 1, 0], coach: ['c35', 1, 0], happy: ['c35', 1, 0], kneel: ['c35', 1, 0], cross: ['c35', 4, 0, 0, 0.6], point: ['c35', 4, 1, 0, 0.6], think: ['c35', 4, 2, 0, 0.6], laugh: ['c35', 4, 3, 0, 0.6] },
  /* the goblin of the CPAM, Chad Cook (Ninassurance, Alex Cloppe, Clément and Suzie are just below) */
  goblin: { walk: { sheet: 'c36', right: 0, front: 1, left: 2, back: 3, fps: 10 }, idle: ['c36', 1, 0], talk: ['c36', 1, 0], read: ['c36', 1, 0], cross: ['c36', 4, 0, 0, 0.62], thumb: ['c36', 4, 1, 0, 0.62], think: ['c36', 4, 3, 0, 0.62], laugh: ['c36', 4, 4, 0, 0.62], point: ['c36', 4, 5, 0, 0.62], scared: ['c36', 4, 6, 0, 0.62], write: ['c36', 4, 7, 0, 0.62] },
  /* v6: Ninassurance (assurances) and Alex Cloppe (CARPIMKO) replace the fée and the sage */
  fee: { walk: { sheet: 'c42', right: 0, front: 1, left: 2, back: 3, fps: 10 }, idle: ['c42', 4, 0] },
  sage: { walk: { sheet: 'c41', right: 0, front: 1, back: 2, fps: 10 }, idle: ['c41', 3, 0] },
  clement: { walk: { sheet: 'c43', right: 0, front: 1, back: 2, fps: 10 }, idle: ['c43', 3, 0] },
  suzie: { walk: { sheet: 'c44', right: 0, front: 1, left: 2, back: 3, fps: 7 }, idle: ['c44', 1, 1] },
  chad: { walk: { sheet: 'c39', right: 0, front: 1, left: 2, back: 3, fps: 10 }, idle: ['c39', 1, 0], talk: ['c39', 1, 0], cross: ['c39', 4, 0, 0, 0.62], point: ['c39', 4, 1, 0, 0.62], think: ['c39', 4, 2, 0, 0.62], laugh: ['c39', 4, 3, 0, 0.62], angry: ['c39', 4, 4, 0, 0.62], scared: ['c39', 4, 5, 0, 0.62] }
};
export const hasChar = (who) => !!CHARS[who];
/* the atlases a character needs (for need([...]) before a scene shows him) */
export function charSheets(who) {
  const def = CHARS[who === 'player' && G.gender === 'f' ? 'playerf' : who]; if (!def) return [];
  const out = new Set([def.walk.sheet]);
  for (const k in def) if (Array.isArray(def[k])) out.add(def[k][0]);
  return [...out];
}
const rowLen = (sheet, row) => { const m = META.c[sheet]; return (m && m.rn && m.rn[row]) || 4; };
/* Which walk row and mirror to use for a velocity. */
export function charWalk(who, vx, vy) {
  if (who === 'player' && G.gender === 'f') who = 'playerf';
  const w = CHARS[who].walk;
  if (Math.abs(vx) >= 1.2 * Math.abs(vy)) {
    if (vx > 0) return w.right != null ? [w.right, false] : [w.left, true];
    return w.left != null ? [w.left, false] : [w.right, true];
  }
  if (vy > 0 && w.front == null) return vx >= 0 ? (w.right != null ? [w.right, false] : [w.left, true]) : (w.left != null ? [w.left, false] : [w.right, true]);
  return vy > 0 ? [w.front, false] : [w.back, false];
}
/* Draw a character. anim: 'walk' (row from charWalk) or a pose name; t: animation clock in seconds. */
export function drawChar(c, who, anim, t, x, y, s, opt = {}) {
  if (who === 'player' && G.gender === 'f') who = 'playerf';
  const def = CHARS[who]; if (!def) return;
  let sheet, row, frame;
  if (anim === 'walk') { sheet = def.walk.sheet; row = opt.row; const n = rowLen(sheet, row); frame = opt.moving === false ? Math.min(1, n - 1) : Math.floor(t * (def.walk.fps || 7)) % n; }
  else {
    const p = def[anim] || def.idle; sheet = p[0]; row = p[1];
    frame = p[2] != null ? (p[3] ? p[2] + Math.floor(t * (opt.fps || 0.9)) % p[3] : p[2]) : Math.floor(t * (opt.fps || 0.9)) % rowLen(sheet, row);
    if (p[4]) s *= p[4];
  }
  const m = META.c[sheet], img = IMG[sheet]; if (!m || !img) return;
  c.save(); c.globalAlpha = opt.alpha == null ? 1 : opt.alpha; c.translate(x, y); if (opt.flip) c.scale(-1, 1);
  c.drawImage(img, frame * m.cw, row * m.ch, m.cw, m.ch, -m.ax * s, -m.ay * s, m.cw * s, m.ch * s);
  c.restore();
}
