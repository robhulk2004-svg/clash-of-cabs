import { $ } from './utils.js';

/* ================= Assets =================
   ASSETS are fetched before the title screen (with the progress bar).
   LATER assets are fetched in the background once the game has started (other maps, interiors, characters…);
   a scene that needs one of them waits for it with need([...]). */
export const ASSETS = {
  logo_clean: ['assets/logo_clean.webp', 184e3],
  title: ['assets/title.webp', 430e3], logo: ['assets/logo.webp', 86e3], logo_hud: ['assets/logo_hud.webp', 60e3], pill: ['assets/pill.webp', 14e3],
  char_l: ['assets/char_l.webp', 87e3], char_w: ['assets/char_w.webp', 54e3], char_r: ['assets/char_r.webp', 53e3],
  map_main: ['assets/map_main.webp', 885e3], fleche: ['assets/fleche.webp', 8e3], btnshop: ['assets/btnshop.webp', 9e3], btnquests: ['assets/btnquests.webp', 7e3],
  card_ordre: ['assets/card_ordre.webp', 79e3], card_cpam: ['assets/card_cpam.webp', 52e3],
  cab_l1: ['assets/cab_l1.webp', 19e3], cab_l5: ['assets/cab_l5.webp', 40e3],
  mentor_happy: ['assets/mentor_happy.webp', 76e3], mentor_think: ['assets/mentor_think.webp', 70e3], mentor_scared: ['assets/mentor_scared.webp', 74e3],
  player_happy: ['assets/player_happy.webp', 75e3], player_think: ['assets/player_think.webp', 65e3], player_scared: ['assets/player_scared.webp', 83e3],
  playerf_happy: ['assets/playerf_happy.webp', 60e3], playerf_joy: ['assets/playerf_joy.webp', 64e3], playerf_think: ['assets/playerf_think.webp', 61e3],
  goblin: ['assets/goblin.webp', 159e3],
  intro1: ['assets/intro1.webp', 172e3], intro2: ['assets/intro2.webp', 157e3], intro3: ['assets/intro3.webp', 166e3],
  intro4: ['assets/intro4.webp', 147e3], intro5: ['assets/intro5.webp', 195e3], intro6: ['assets/intro6.webp', 174e3],
  cab_in: ['assets/cab_in.webp', 342e3], hud: ['assets/hud.webp', 34e3], table_premium: ['assets/table_premium.webp', 17e3],
  p_walk_side: ['assets/p_walk_side.webp', 171e3], p_walk_front: ['assets/p_walk_front.webp', 152e3], p_walk_back: ['assets/p_walk_back.webp', 138e3],
  p_squat: ['assets/p_squat.webp', 150e3], p_plank: ['assets/p_plank.webp', 160e3], p_pushup: ['assets/p_pushup.webp', 138e3],
  p_march: ['assets/p_march.webp', 170e3], p_squat_march: ['assets/p_squat_march.webp', 171e3],
  q_walk_side: ['assets/q_walk_side.webp', 186e3], q_walk_front: ['assets/q_walk_front.webp', 142e3], q_walk_back: ['assets/q_walk_back.webp', 137e3],
  c45: ['assets/c45.webp', 180e3], c40: ['assets/c40.webp', 169e3],
  av_player: ['assets/av_player.webp', 11e3], av_playerf: ['assets/av_playerf.webp', 14e3], av_pascale: ['assets/av_pascale.webp', 11e3], av_goblin: ['assets/av_goblin.webp', 11e3],
  music: ['assets/music.mp3', 1.52e6]
};
export const LATER = {
  /* v6: cars, the exercises of the new patients, their portraits, the characters of the démarches */
  cars8: 0, q_squat: 0, q_plank: 0, q_lunge: 0, q_pushup: 0, q_crunch: 0,
  c41: 0, c42: 0, sage_happy: 0, sage_joy: 0, sage_think: 0, fee_happy: 0, fee_joy: 0, fee_think: 0, av_fee: 0, av_sage: 0,
  /* the town, the institutions and the characters you meet first */
  c30: 0, c46: 0, c47: 0, c48: 0, c49: 0, cab_in_X: 0, cab_in_R: 0, cab_in_M: 0, cab_in_L: 0,
  ambroise_happy: 0, ambroise_joy: 0, ambroise_think: 0, thomas_happy: 0, thomas_think: 0, thomas_scared: 0,
  etienne_happy: 0, etienne_joy: 0, etienne_think: 0, julien_happy: 0, julien_think: 0, julien_scared: 0,
  av_thomas: 0, av_etienne: 0, av_julien: 0, av_mathieu: 0, av_marvin: 0, av_menton: 0, av_damien: 0,
  in_ordre: 0, cab_l2: 0, cab_l3: 0, cab_l4: 0, cab_l6: 0, cab_l7: 0, cab_l8: 0, cab_l9: 0,
  cab_s1: 0, cab_s2: 0, cab_s3: 0, cab_s4: 0, cab_s5: 0, veh_velo: 0, veh_bateau: 0, veh_jet: 0,
  eq_mat_blue: 0, eq_mat_teal: 0, eq_espalier: 0, eq_step: 0, eq_freeman: 0, eq_chairs: 0, eq_electro: 0, eq_sculpture: 0, eq_gun: 0, eq_computer: 0,
  ic_mat_blue: 0, ic_mat_teal: 0, ic_espalier: 0, ic_step: 0, ic_freeman: 0, ic_chairs: 0, ic_electro: 0, ic_sculpture: 0, ic_gun: 0, ic_computer: 0, ic_table: 0,
  c12: 0, c13: 0, c14: 0, c21: 0, c22: 0, c23: 0, c31: 0, c36: 0,
  marvin_happy: 0, marvin_think: 0, marvin_scared: 0, menton_happy: 0, menton_think: 0, menton_scared: 0,
  mathieu_happy: 0, mathieu_joy: 0, mathieu_think: 0, damien_happy: 0, damien_think: 0, damien_scared: 0,
  in_urssaf: 0, in_carpimko: 0, in_syndicats: 0, in_assurances: 0, in_tribunal: 0, donjon: 0,
  map_maransin: 0, map_reunion: 0, map_michigan: 0, c39: 0, chad_happy: 0, chad_joy: 0, chad_think: 0, av_chad: 0,
  c33: 0, c34: 0, c35: 0, gabriel_happy: 0, gabriel_joy: 0, gabriel_think: 0, mathis_happy: 0, mathis_joy: 0, mathis_think: 0,
  paul_happy: 0, paul_joy: 0, paul_think: 0, av_gabriel: 0, av_mathis: 0, av_paul: 0,
  introf1: 0, introf2: 0, introf3: 0, introf4: 0, introf5: 0, introf6: 0,
  qte_night: 0, qte_logo: 0, qte_gauge: 0, qte_text: 0, qd_kine: 0, qd_menton: 0, qd_goblin: 0, qd_marvin: 0,
  qte_bills: 0, qte_cards: 0, qte_lanes: 0, qte_btns: 0,
  /* v6: Clément, the Moon, the cowboys, the minis of La Réunion */
  c43: 0, clement_happy: 0, clement_joy: 0, clement_think: 0, av_clement: 0, v_cowboy: 0, v_mini: 0,
  map_moon: 0, c44: 0, suzie_happy: 0, suzie_joy: 0, suzie_think: 0, av_suzie: 0, v_alien: 0, alien_happy: 0, alien_joy: 0, alien_think: 0, av_alien: 0, fusee: 0,
  c32: 0, av_ambroise: 0
};
for (let i = 0; i < 19; i++) for (const e of ['calm', 'happy', 'scared']) LATER[`pat${i}_${e}`] = 0;
/* Music themes, fetched after the start screen. */
export const LAZY_MUSIC = { urssaf: 'assets/urssaf.mp3', cnam: 'assets/cnam.mp3', maransin: 'assets/maransin.mp3', reunion: 'assets/reunion.mp3', michigan: 'assets/michigan.mp3', moon: 'assets/moon.mp3' };
export const URLS = {}, IMG = {};
/* images drawn on a canvas need a decoded Image object */
const CANVAS = /^(p_|q_|v_|eq_|av_|c\d|cab_|qd_|qte_|veh_|cars8$|table_premium$|fusee$)/;
const pathOf = (key) => (ASSETS[key] ? ASSETS[key][0] : `assets/${key}.webp`);
for (const k in LATER) URLS[k] = pathOf(k);
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
  const url = pathOf(key), core = !!ASSETS[key];
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const len = +res.headers.get('content-length'); if (len && core) expected[key] = len;
    let blob;
    if (core && res.body && res.body.getReader) {
      const reader = res.body.getReader(); const chunks = [];
      for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); loaded[key] += value.length; setProgress(); }
      blob = new Blob(chunks, { type: res.headers.get('content-type') || '' });
    } else blob = await res.blob();
    if (core) { loaded[key] = expected[key] = blob.size || expected[key]; setProgress(); }
    if (key === 'music') musicData = await blob.arrayBuffer();
    URLS[key] = URL.createObjectURL(blob);
  } catch (e) { URLS[key] = url; if (core) { loaded[key] = expected[key]; setProgress(); } }
  return URLS[key];
}
export function imgReady(img, src) {
  return new Promise((resolve) => {
    img.onload = () => resolve(); img.onerror = () => resolve(); img.src = src;
    if (img.decode) img.decode().then(resolve, () => {});
  });
}
/* Decoded Image objects, used by the canvases (sprites, equipment, cars, avatars) and to warm up the portraits. */
export function loadImg(key) {
  return new Promise((r) => { const i = new Image(); i.onload = () => { IMG[key] = i; r(); }; i.onerror = () => r(); i.src = URLS[key] || pathOf(key); });
}
export const isCanvasImg = (k) => CANVAS.test(k);
/* ---------- background loading of the LATER assets ---------- */
const jobs = {};
export function need(keys) {
  return Promise.all(keys.filter(Boolean).map((k) => {
    if (!jobs[k]) {
      if (ASSETS[k]) jobs[k] = IMG[k] || !CANVAS.test(k) ? Promise.resolve() : loadImg(k);
      else jobs[k] = fetchAsset(k).then(() => loadImg(k));
    }
    return jobs[k];
  }));
}
export async function loadLater() {
  const keys = Object.keys(LATER);
  for (let i = 0; i < keys.length; i += 6) await need(keys.slice(i, i + 6));
}
