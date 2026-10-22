/* ---------- Town: the cabinets, walking graph, roads ---------- */
export const PLOTS = { A: { cx: 1120, cy: 216 }, B: { cx: 1428, cy: 428 }, C: { cx: 1128, cy: 650 }, D: { cx: 668, cy: 690 } };
export const TOWN_CABS = {
  A: { name: 'Cabinet IRSBC', short: 'IRSBC', tit: 'Thomas Cassmoildeau', first: 'Thomas', who: 'thomas', img: 'bld_pins', eq: ['mat_blue', 'step'], tag: '#5E7A3A' },
  B: { name: 'Cabinet Ambroise', short: 'Ambroise', tit: 'Ambroise', first: 'Ambroise', who: 'ambroise', img: 'bld_amb', eq: ['espalier', 'mat_blue', 'step', 'chairs', 'computer', 'table'], tag: '#C27C2C' },
  C: { name: 'Mon cabinet', own: true, tag: '#3F8487' },
  D: { name: 'Cabinet Basquaise', short: 'Basquaise', tit: 'Étienne Poulet', first: 'Étienne', who: 'etienne', img: 'bld_port', eq: ['mat_blue', 'mat_teal', 'espalier', 'electro', 'step'], tag: '#A9502F' },
  X: { name: 'Cabinet de Maransin', short: 'Maransin', tit: 'Julien Coulommiers', first: 'Julien', who: 'julien', offmap: true, eq: ['mat_blue', 'step', 'freeman', 'chairs'], tag: '#4C5A33' }
};
export const SIGN_X = { x: 282, y: 600 };      // road sign towards Maransin (left edge of the map)
export const NAV_NODES = {
  n1: [470, 640], n2: [580, 600], D: [668, 690], n3: [760, 640], n4: [880, 520], n5: [960, 560], C: [1128, 650], n6: [1250, 640], n7: [1100, 740], n8: [850, 760],
  n9: [1040, 360], n10: [1010, 260], A: [1120, 216], n11: [1200, 330], n12: [1320, 460], B: [1428, 428], n13: [1520, 480], cas: [760, 455], n14: [880, 420], cw: [650, 500], n15: [610, 775], n16: [1300, 705]
};
export const NAV_EDGES = [['n1', 'n2'], ['n1', 'D'], ['n2', 'D'], ['n2', 'cw'], ['D', 'n3'], ['D', 'n8'], ['n3', 'n8'], ['n3', 'n4'], ['n3', 'n5'], ['n4', 'n5'], ['n4', 'n14'], ['n5', 'C'], ['n5', 'n9'], ['C', 'n6'], ['C', 'n7'], ['n7', 'n8'], ['n6', 'n12'], ['n12', 'B'], ['B', 'n13'], ['n12', 'n11'], ['n11', 'A'], ['A', 'n10'], ['n10', 'n9'], ['n9', 'n11'], ['n9', 'n14'], ['n14', 'cas'], ['cas', 'cw'], ['n1', 'n15'], ['n15', 'n8'], ['n15', 'D'], ['n6', 'n16'], ['n16', 'n7']];
/* When a building stands on a plot, its nodes disappear and its door links to the paths in front of it. */
export const PLOT_NAV = { A: { remove: ['A'], door: ['n10', 'n11'] }, B: { remove: ['B'], door: ['n12', 'n13'] }, C: { remove: ['C', 'n6'], door: ['n7', 'n16'] }, D: { remove: ['D', 'n3'], door: ['n8', 'n15'] } };
export const doorOf = (plot) => [PLOTS[plot].cx + 70, PLOTS[plot].cy + 45];
export const ROAD_SEGS = {
  'BL-J1': [[335, 628], [410, 607], [510, 568], [560, 550], [620, 538]],
  'BK-J1': [[245, 337], [350, 392], [450, 446], [550, 497], [620, 538]],
  'J1-J2': [[620, 538], [686, 531], [736, 512], [836, 474], [936, 437], [990, 400]],
  'J2-RE': [[990, 400], [1036, 401], [1086, 427], [1136, 457], [1186, 487], [1236, 515], [1290, 545]],
  'J2-UP': [[990, 400], [968, 350]]
};
export const ROAD_LINKS = { BL: [['J1', 'BL-J1']], BK: [['J1', 'BK-J1']], J1: [['BL', 'BL-J1'], ['BK', 'BK-J1'], ['J2', 'J1-J2']], J2: [['J1', 'J1-J2'], ['RE', 'J2-RE'], ['UP', 'J2-UP']], RE: [['J2', 'J2-RE']], UP: [['J2', 'J2-UP']] };
export const ROAD_ENDS = ['BL', 'BK', 'RE', 'UP'];
export const OFFER_STOPS = { C: { at: [1170, 478], from: 'BL', to: 'RE' }, D: { at: [740, 520], from: 'BL', to: 'UP' }, A: { at: [1060, 412], from: 'RE', to: 'BK' }, B: { at: [1230, 505], from: 'RE', to: 'BL' } };
