import { CAB_SHAPES } from './worlds.js';

/* ---------- The cabinets of the five maps ----------
   map: where the cabinet stands · baked: drawn in the map picture (hit area and halo: CAB_SHAPES of data/worlds.js),
   otherwise a building picture on its plot (your own cabinet, C) · cx, cy: anchor (centre of the plot / foot of the building)
   top: where the bubbles go · door: where people go in · link: walking nodes in front of the door · who: the kiné who works there
   Only Thomas, Julien, Mathieu, Chad and Suzie can hire you (in this order); Étienne is a confrère you can visit. */
const S = (k) => ({ poly: CAB_SHAPES[k].poly, halo: CAB_SHAPES[k].halo });
export const TOWN_CABS = {
  A: { name: 'Cabinet IRSBC', short: 'IRSBC', tit: 'Thomas Cassmoildeau', first: 'Thomas', who: 'thomas', map: 'main', baked: true, cx: 570, cy: 639, top: 594,
    door: [595, 681], link: ['w11', 'w10'], icon: 'cab_l1', eq: ['mat_blue', 'step'], tag: '#2f9a12', ...S('A') },
  C: { name: 'Mon cabinet', own: true, map: 'main', cx: 649, cy: 589, door: [680, 612], link: ['w4', 'w5'], tag: '#2a6fd6' },
  D: { name: 'Cabinet Basquaise', short: 'Basquaise', tit: 'Étienne Poulet', first: 'Étienne', who: 'etienne', map: 'main', baked: true, cx: 1118, cy: 667, top: 623,
    door: [1131, 713], link: ['j30', 'w32'], icon: 'cab_l1', eq: ['mat_blue', 'mat_teal', 'espalier', 'electro', 'step'], tag: '#c0291b', ...S('D') },
  X: { name: 'Maison de santé de Maransin', short: 'Maransin', tit: 'Julien Coulommiers', first: 'Julien', who: 'julien', map: 'maransin', baked: true, cx: 543, cy: 560, top: 456,
    door: [603, 640], link: ['soins'], icon: 'cab_l2', eq: ['mat_blue', 'step', 'freeman', 'chairs'], tag: '#6a32c9', ...S('X') },
  R: { name: 'Cabinet de Saint-Gilles', short: 'Saint-Gilles', tit: 'Mathieu Mopourmot', first: 'Mathieu', who: 'mathieu', map: 'reunion', baked: true, cx: 465, cy: 556, top: 464,
    door: [490, 628], link: ['soins'], icon: 'cab_l2', eq: ['mat_blue', 'step', 'espalier', 'mat_teal', 'chairs'], tag: '#0f8fb5', dom: true, ...S('R') },
  M: { name: 'Cook Physical Therapy', short: 'Chad Cook', tit: 'Chad Cook', first: 'Chad', who: 'chad', map: 'michigan', baked: true, cx: 386, cy: 560, top: 423,
    door: [446, 640], link: ['soins'], icon: 'cab_l2', eq: ['mat_blue', 'step', 'espalier', 'mat_teal', 'electro'], tag: '#b5651d', usa: true, ...S('M') },
  L: { name: 'Cabinet lunaire', short: 'la Lune', tit: 'Suzie Taillebois', first: 'Suzie', who: 'suzie', map: 'moon', baked: true, cx: 867, cy: 500, top: 375,
    door: [905, 592], link: ['soins'], icon: 'cab_l2', eq: ['mat_blue', 'step', 'espalier', 'mat_teal', 'freeman'], tag: '#7a3fd0', moon: true, ...S('L') }
};
export const PLOTS = Object.fromEntries(Object.entries(TOWN_CABS).map(([k, c]) => [k, { cx: c.cx, cy: c.cy, map: c.map }]));
export const doorOf = (id) => TOWN_CABS[id].door.slice();
/* scale of the cabinet pictures (cab_l1 … cab_l9) drawn on your plot */
export const CAB_K = 0.41;
