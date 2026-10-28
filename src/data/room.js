/* ---------- Cabinet interior ---------- */
export const ROOM = {
  bg: 'cab_in',
  doorOut: [470, 650], doorIn: [560, 610],
  queue: [[600, 662], [670, 700], [740, 738], [810, 776], [880, 814], [950, 852]],
  kine: { player: [1215, 700], host: [700, 612] },          // you, and the titulaire of a confrère's cabinet when he is there
  staff: [[745, 455], [890, 478], [585, 532]],     // your assistants, in the order of hiring
  visit: [930, 590],
  eq: { espalier: [598, 402], step: [880, 348], mat_blue: [1005, 462], mat_teal: [770, 552], freeman: [960, 628], electro: [1085, 365], chairs: [672, 300], sculpture: [818, 252], gun: [470, 372], computer: [372, 392] }
};
export const STATIONS = [
  { id: 'T', item: null, ex: 'squat', at: [1080, 648] },
  { id: 'S3', item: 'mat_blue', ex: 'plank', at: [1005, 462] },
  { id: 'S2', item: 'step', ex: 'march', at: [878, 334] },
  { id: 'S4', item: 'mat_teal', ex: 'pushup', at: [770, 552] },
  { id: 'S1', item: 'espalier', ex: 'squat', at: [648, 430], via: [660, 540] },
  { id: 'S5', item: 'freeman', ex: 'squat_march', at: [960, 618] }
];

/* ---------- v6.1: the cabinets of Julien (Maransin), Mathieu (La Réunion), Chad (Michigan) and Suzie (the Moon)
   have their own picture, with their furniture drawn in it: their own door, waiting line and postes ----------
   at: where the feet of a patient (or a kiné) stand, in the coordinates of the picture (1672 x 941). */
export const LAYOUTS = {
  X: {
    bg: 'cab_in_X', doorOut: [385, 780], doorIn: [515, 588],
    queue: [[585, 612], [645, 640], [705, 668], [765, 696], [825, 724], [885, 752]],
    kine: { player: [1010, 610], host: [700, 540] }, visit: [860, 610],
    stations: [
      { id: 'T', ex: 'squat', at: [935, 545] }, { id: 'S3', ex: 'plank', at: [1290, 640] }, { id: 'S1', ex: 'squat', at: [1185, 472] },
      { id: 'S4', ex: 'pushup', at: [880, 690] }, { id: 'S2', ex: 'march', at: [815, 470] }, { id: 'S5', ex: 'squat_march', at: [1160, 592] }
    ]
  },
  R: {
    bg: 'cab_in_R', doorOut: [300, 765], doorIn: [505, 560],
    queue: [[560, 585], [620, 572], [680, 559], [740, 546], [800, 533], [860, 520]],
    kine: { player: [1050, 480], host: [660, 455] }, visit: [880, 560],
    stations: [
      { id: 'T', ex: 'squat', at: [880, 505] }, { id: 'S3', ex: 'plank', at: [1360, 615] }, { id: 'S1', ex: 'squat', at: [1240, 445] },
      { id: 'S4', ex: 'pushup', at: [1130, 600] }, { id: 'S2', ex: 'march', at: [760, 430] }, { id: 'S5', ex: 'squat_march', at: [990, 600] }
    ]
  },
  M: {
    bg: 'cab_in_M', doorOut: [330, 800], doorIn: [520, 590],
    queue: [[575, 580], [630, 556], [685, 532], [740, 508], [795, 484], [850, 460]],
    kine: { player: [1170, 545], host: [640, 520] }, visit: [900, 600],
    stations: [
      { id: 'T', ex: 'squat', at: [900, 505] }, { id: 'S3', ex: 'plank', at: [1350, 650] }, { id: 'S1', ex: 'squat', at: [1300, 505] },
      { id: 'S4', ex: 'pushup', at: [1100, 625] }, { id: 'S2', ex: 'march', at: [1010, 560] }, { id: 'S5', ex: 'squat_march', at: [1230, 600] }
    ]
  },
  L: {
    bg: 'cab_in_L', doorOut: [400, 820], doorIn: [575, 565],
    queue: [[630, 548], [690, 536], [750, 524], [810, 512], [870, 500], [930, 488]],
    kine: { player: [985, 405], host: [705, 470] }, visit: [880, 470],
    stations: [
      { id: 'T', ex: 'squat', at: [790, 392] }, { id: 'S3', ex: 'plank', at: [1300, 585] }, { id: 'S1', ex: 'squat', at: [1165, 480] },
      { id: 'S4', ex: 'pushup', at: [1020, 520] }, { id: 'S2', ex: 'march', at: [1125, 405] }, { id: 'S5', ex: 'squat_march', at: [1150, 590] }
    ]
  }
};
/* the layout of the cabinet you are in: the one of its picture, or the classic one */
const BASE = { bg: 'cab_in', doorOut: ROOM.doorOut, doorIn: ROOM.doorIn, queue: ROOM.queue, kine: ROOM.kine, visit: ROOM.visit };
export function useLayout(cab) { const L = LAYOUTS[cab] || BASE; for (const k in BASE) ROOM[k] = L[k]; return L; }
