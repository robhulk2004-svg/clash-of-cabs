/* ---------- The cabinets of the town (and of Maransin) ----------
   map: where the cabinet stands · baked: drawn in the map picture (otherwise a building image on its plot)
   cx, cy: anchor (centre of the plot / of the building's foot) · door: where people go in · link: walking nodes in front of the door */
export const TOWN_CABS = {
  A: { name: 'Cabinet IRSBC', short: 'IRSBC', tit: 'Thomas Cassmoildeau', first: 'Thomas', who: 'thomas', map: 'main', baked: true, cx: 398, cy: 662, top: 585,
    poly: [[310, 612], [372, 578], [470, 600], [486, 680], [452, 738], [330, 728], [312, 682]], door: [436, 742], link: ['w11', 'w10'], icon: 'cab_l1',
    eq: ['mat_blue', 'step'], tag: '#2f9a12' },
  B: { name: 'Cabinet Ambroise', short: 'Ambroise', tit: 'Ambroise', first: 'Ambroise', who: 'ambroise', map: 'main', img: 'cab_l5', cx: 1155, cy: 588, door: [1215, 628], link: ['j25'], icon: 'cab_l5',
    eq: ['espalier', 'mat_blue', 'step', 'chairs', 'computer', 'table'], tag: '#e07a16' },
  C: { name: 'Mon cabinet', own: true, map: 'main', cx: 547, cy: 580, door: [605, 622], link: ['w4', 'w5'], tag: '#2a6fd6' },
  D: { name: 'Cabinet Basquaise', short: 'Basquaise', tit: 'Étienne Poulet', first: 'Étienne', who: 'etienne', map: 'main', baked: true, cx: 1378, cy: 722, top: 645,
    poly: [[1290, 672], [1352, 638], [1450, 660], [1466, 742], [1430, 798], [1310, 788], [1292, 742]], door: [1400, 800], link: ['j30', 'w32'], icon: 'cab_l1',
    eq: ['mat_blue', 'mat_teal', 'espalier', 'electro', 'step'], tag: '#c0291b' },
  X: { name: 'Maison de santé de Maransin', short: 'Maransin', tit: 'Julien Coulommiers', first: 'Julien', who: 'julien', map: 'maransin', baked: true, cx: 490, cy: 540, top: 420,
    poly: [[340, 470], [420, 415], [560, 410], [640, 470], [640, 560], [590, 625], [420, 620], [340, 560]], door: [565, 640], link: ['soins'], icon: 'cab_l2',
    eq: ['mat_blue', 'step', 'freeman', 'chairs'], tag: '#6a32c9' }
};
export const PLOTS = Object.fromEntries(Object.entries(TOWN_CABS).map(([k, c]) => [k, { cx: c.cx, cy: c.cy, map: c.map }]));
export const doorOf = (id) => TOWN_CABS[id].door.slice();
/* scale of the cabinet pictures (cab_l1 … cab_l9) drawn on a plot */
export const CAB_K = 0.6;
