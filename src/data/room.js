/* ---------- Cabinet interior ---------- */
export const ROOM = {
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
  { id: 'S1', item: 'espalier', ex: 'squat', at: [648, 430] },
  { id: 'S5', item: 'freeman', ex: 'squat_march', at: [960, 618] }
];
