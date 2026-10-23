import { $ } from './utils.js';

/* ================= Assets ================= */
export const ASSETS = {
  logo_clean: ['assets/logo_clean.webp', 184e3],
  title: ['assets/title.webp', 430e3], logo: ['assets/logo.webp', 86e3], pill: ['assets/pill.webp', 12e3],
  char_l: ['assets/char_l.webp', 87e3], char_w: ['assets/char_w.webp', 54e3], char_r: ['assets/char_r.webp', 53e3],
  town2: ['assets/town3.webp', 355e3], btnshop: ['assets/btnshop.webp', 9e3], btnquests: ['assets/btnquests.webp', 7e3],
  card_ordre: ['assets/card_ordre.webp', 79e3], card_cpam: ['assets/card_cpam.webp', 52e3],
  bld_l1: ['assets/bld_l1.webp', 63e3], bld_l2: ['assets/bld_l2.webp', 69e3], bld_l3: ['assets/bld_l3.webp', 75e3],
  bld_amb: ['assets/bld_amb.webp', 70e3], bld_pins: ['assets/bld_pins.webp', 63e3], bld_port: ['assets/bld_port.webp', 64e3],
  mentor_happy: ['assets/mentor_happy.webp', 76e3], mentor_think: ['assets/mentor_think.webp', 70e3], mentor_scared: ['assets/mentor_scared.webp', 74e3],
  player_happy: ['assets/player_happy.webp', 75e3], player_think: ['assets/player_think.webp', 65e3], player_scared: ['assets/player_scared.webp', 83e3],
  ambroise_happy: ['assets/ambroise_happy.webp', 85e3], ambroise_think: ['assets/ambroise_think.webp', 85e3], ambroise_scared: ['assets/ambroise_scared.webp', 99e3],
  mathieu_happy: ['assets/mathieu_happy.webp', 73e3], mathieu_think: ['assets/mathieu_think.webp', 75e3], mathieu_scared: ['assets/mathieu_scared.webp', 89e3],
  marvin_happy: ['assets/marvin_happy.webp', 126e3], marvin_think: ['assets/marvin_think.webp', 107e3], marvin_scared: ['assets/marvin_scared.webp', 124e3],
  menton_happy: ['assets/menton_happy.webp', 79e3], menton_think: ['assets/menton_think.webp', 81e3], menton_scared: ['assets/menton_scared.webp', 93e3],
  thomas_happy: ['assets/thomas_happy.webp', 80e3], thomas_think: ['assets/thomas_think.webp', 76e3], thomas_scared: ['assets/thomas_scared.webp', 98e3],
  julien_happy: ['assets/julien_happy.webp', 109e3], julien_think: ['assets/julien_think.webp', 94e3], julien_scared: ['assets/julien_scared.webp', 112e3],
  etienne_happy: ['assets/etienne_happy.webp', 61e3], etienne_think: ['assets/etienne_think.webp', 59e3], etienne_scared: ['assets/etienne_scared.webp', 76e3],
  goblin: ['assets/goblin.webp', 159e3], ordre_in: ['assets/ordre_in.webp', 261e3], donjon: ['assets/donjon.webp', 207e3],
  damien_happy: ['assets/damien_happy.webp', 103e3], damien_think: ['assets/damien_think.webp', 97e3], damien_scared: ['assets/damien_scared.webp', 98e3],
  qte_night: ['assets/qte_night.webp', 169e3], qte_logo: ['assets/qte_logo.webp', 47e3], qte_gauge: ['assets/qte_gauge.webp', 24e3],
  qd_kine: ['assets/qd_kine.webp', 207e3], qd_menton: ['assets/qd_menton.webp', 249e3], qd_goblin: ['assets/qd_goblin.webp', 204e3], qd_marvin: ['assets/qd_marvin.webp', 197e3],
  qte_bills: ['assets/qte_bills.webp', 59e3], qte_cards: ['assets/qte_cards.webp', 60e3], qte_lanes: ['assets/qte_lanes.webp', 101e3], qte_btns: ['assets/qte_btns.webp', 74e3],
  qte_text: ['assets/qte_text.webp', 279e3],
  intro1: ['assets/intro1.webp', 172e3], intro2: ['assets/intro2.webp', 157e3], intro3: ['assets/intro3.webp', 166e3],
  intro4: ['assets/intro4.webp', 147e3], intro5: ['assets/intro5.webp', 195e3], intro6: ['assets/intro6.webp', 174e3],
  cab_in: ['assets/cab_in.webp', 342e3], hud: ['assets/hud.webp', 34e3], table_premium: ['assets/table_premium.webp', 17e3],
  p_walk_side: ['assets/p_walk_side.webp', 171e3], p_walk_front: ['assets/p_walk_front.webp', 152e3], p_walk_back: ['assets/p_walk_back.webp', 138e3],
  p_squat: ['assets/p_squat.webp', 150e3], p_plank: ['assets/p_plank.webp', 160e3], p_pushup: ['assets/p_pushup.webp', 138e3],
  p_march: ['assets/p_march.webp', 170e3], p_squat_march: ['assets/p_squat_march.webp', 171e3],
  c12: ['assets/c12.webp', 157e3], c13: ['assets/c13.webp', 178e3], c14: ['assets/c14.webp', 182e3],
  c15: ['assets/c15.webp', 166e3], c16: ['assets/c16.webp', 146e3], c17: ['assets/c17.webp', 191e3],
  c18: ['assets/c18.webp', 178e3], c19: ['assets/c19.webp', 198e3], c20: ['assets/c20.webp', 200e3],
  c21: ['assets/c21.webp', 266e3], c22: ['assets/c22.webp', 254e3], c23: ['assets/c23.webp', 199e3],
  c24: ['assets/c24.webp', 211e3], c24s: ['assets/c24s.webp', 12e3], c25: ['assets/c25.webp', 241e3],
  c27: ['assets/c27.webp', 329e3], c28: ['assets/c28.webp', 321e3], c29: ['assets/c29.webp', 207e3], c30: ['assets/c30.webp', 244e3], c31: ['assets/c31.webp', 560e3],
  cars: ['assets/cars.webp', 51e3],
  eq_mat_blue: ['assets/eq_mat_blue.webp', 9e3], eq_mat_teal: ['assets/eq_mat_teal.webp', 9e3], eq_espalier: ['assets/eq_espalier.webp', 25e3],
  eq_step: ['assets/eq_step.webp', 8e3], eq_freeman: ['assets/eq_freeman.webp', 8e3], eq_chairs: ['assets/eq_chairs.webp', 21e3],
  eq_electro: ['assets/eq_electro.webp', 15e3], eq_sculpture: ['assets/eq_sculpture.webp', 14e3], eq_gun: ['assets/eq_gun.webp', 5e3], eq_computer: ['assets/eq_computer.webp', 9e3],
  ic_mat_blue: ['assets/ic_mat_blue.webp', 5e3], ic_mat_teal: ['assets/ic_mat_teal.webp', 5e3], ic_espalier: ['assets/ic_espalier.webp', 14e3],
  ic_step: ['assets/ic_step.webp', 7e3], ic_freeman: ['assets/ic_freeman.webp', 11e3], ic_chairs: ['assets/ic_chairs.webp', 11e3],
  ic_electro: ['assets/ic_electro.webp', 11e3], ic_sculpture: ['assets/ic_sculpture.webp', 7e3], ic_gun: ['assets/ic_gun.webp', 7e3],
  ic_computer: ['assets/ic_computer.webp', 6e3], ic_table: ['assets/ic_table.webp', 15e3],
  av_player: ['assets/av_player.webp', 11e3], av_pascale: ['assets/av_pascale.webp', 11e3], av_goblin: ['assets/av_goblin.webp', 11e3],
  av_ambroise: ['assets/av_ambroise.webp', 15e3], av_mathieu: ['assets/av_mathieu.webp', 13e3], av_marvin: ['assets/av_marvin.webp', 19e3], av_menton: ['assets/av_menton.webp', 13e3],
  av_thomas: ['assets/av_thomas.webp', 12e3], av_julien: ['assets/av_julien.webp', 15e3], av_etienne: ['assets/av_etienne.webp', 9e3], av_damien: ['assets/av_damien.webp', 13e3],
  music: ['assets/music.mp3', 1.52e6]
};
/* Themes loaded after the start screen, so they never slow the first load. */
export const LAZY_MUSIC = { urssaf: 'assets/urssaf.mp3', cnam: 'assets/cnam.mp3' };
export const URLS = {}, IMG = {};
const loaded = {}, expected = {};
for (const k in ASSETS) { loaded[k] = 0; expected[k] = ASSETS[k][1]; }
let musicData = null, decodeDone = false; export function takeMusicData() { const d = musicData; musicData = null; return d; } export function markDecoded() { decodeDone = true; setProgress(); }
function setProgress() {
  let a = 0, b = 0;
  for (const k in ASSETS) { a += Math.min(loaded[k], expected[k]); b += expected[k]; }
  const p = decodeDone ? 1 : Math.min(b ? a / b : 0, 0.97);
  const pc = Math.round(p * 100);
  $('barFill').style.width = pc + '%';
  $('barLabel').textContent = 'Chargement… ' + pc + ' %';
  document.querySelector('.bar').setAttribute('aria-valuenow', pc);
}
export async function fetchAsset(key) {
  const url = ASSETS[key][0];
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const len = +res.headers.get('content-length'); if (len) expected[key] = len;
    let blob;
    if (res.body && res.body.getReader) {
      const reader = res.body.getReader(); const chunks = [];
      for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); loaded[key] += value.length; setProgress(); }
      blob = new Blob(chunks, { type: res.headers.get('content-type') || '' });
    } else blob = await res.blob();
    loaded[key] = expected[key] = blob.size || expected[key]; setProgress();
    if (key === 'music') musicData = await blob.arrayBuffer();
    URLS[key] = URL.createObjectURL(blob);
  } catch (e) { URLS[key] = url; loaded[key] = expected[key]; setProgress(); }
  return URLS[key];
}
export function imgReady(img, src) {
  return new Promise((resolve) => {
    img.onload = () => resolve(); img.onerror = () => resolve(); img.src = src;
    if (img.decode) img.decode().then(resolve, () => {});
  });
}
/* Decoded Image objects, used by the canvases (sprites, equipment, cars, avatars). */
export function loadImg(key) {
  return new Promise((r) => { const i = new Image(); i.onload = () => { IMG[key] = i; r(); }; i.onerror = () => r(); i.src = URLS[key]; });
}
