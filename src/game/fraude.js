import { AudioSys } from '../audio/audio.js';
import { IMG, URLS, need } from '../core/assets.js';
import { prefs } from '../core/prefs.js';
import { G, gx, persist, state } from '../core/save.js';
import { $, TEST, clamp, esc, fmt, frSpace, lerp, rand, randi, reduceMotion, wait } from '../core/utils.js';
import { FRAUDE_SONG as SONG } from '../data/fraude-song.js';
import { FRAUDE } from '../data/fraude.js';
import { Donjon } from '../scenes/donjon.js';
import { drawChar } from '../render/sprites.js';
import { Room } from '../scenes/room.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { refreshGuide } from '../ui/guide.js';
import { hideToast, toast } from '../ui/helpers.js';
import { HUD } from '../ui/hud.js';
import { blocked } from '../ui/modals.js';
import { book } from './month.js';

/* ================= Mini-jeu « Fraude à la sécu » : un jeu de rythme =================
   Des glissières lumineuses descendent les 4 couloirs, calées sur les temps de la chanson : le joueur appuie
   quand une glissière arrive sur sa flèche et la maintient jusqu'au bout. Chaque glissière attrapée = une séance
   fictive facturée. La jauge de risque se remplit avec la musique : pleine à la dernière note, la Sécu débarque. */
const W = 1920, H = 1080;
/* x = centre of the lane on its button; xt = centre at the top of the lane (the lane images lean towards the middle) */
const LANES = [
  { x: 585, xt: 617, col: '#ff3fb4', rgb: '255,63,180', hue: 322 },
  { x: 835, xt: 832, col: '#2f9bff', rgb: '47,155,255', hue: 210 },
  { x: 1085, xt: 1084, col: '#ffa41f', rgb: '255,164,31', hue: 35 },
  { x: 1335, xt: 1303, col: '#2fe36b', rgb: '47,227,107', hue: 140 }
];
const LANE_S = 1.12, LANE_BASE = 1068, BTN_Y = 958, LANE_TOP = 520, APPROACH = 1.6;
const WIN = { perfect: 0.09, ok: 0.24 };   // seconds around the start of a glissière: PARFAIT, then SUPER
const TAIL = 0.14;                           // letting go this close to the end still counts as held to the end
const KEYS = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3, d: 0, f: 1, j: 2, k: 3, D: 0, F: 1, J: 2, K: 3, q: 0, s: 1, Q: 0, S: 1 };
/* The four dancers: atlas, position of the feet on the stage, scale. */
const DANCERS = [
  { key: 'qd_goblin', x: 600, y: 505, s: 0.62, back: true, phase: 0.5 },
  { key: 'qd_marvin', x: 1330, y: 505, s: 0.62, back: true, flip: true, phase: 1.5 },
  { key: 'qd_kine', x: 300, y: 1060, s: 1.02, hero: true },
  { key: 'qd_menton', x: 1640, y: 1060, s: 1.0, flip: true, phase: 1 }
];
const TIERS = [0, 8, 20, 40];
const tierOf = (c) => (c >= TIERS[3] ? 3 : c >= TIERS[2] ? 2 : c >= TIERS[1] ? 1 : 0);
const META = () => FRAUDE.atlas;
/* perspective of the lanes: progress p (1 = on the button) -> height on screen, and half width of a lane there */
const yAt = (p) => LANE_TOP + (BTN_Y - LANE_TOP) * (p * p * 0.35 + p * 0.65);
const hwAt = (y) => 34 + ((Math.min(y, BTN_Y + 90) - LANE_TOP) / (BTN_Y - LANE_TOP)) * 70;
/* centre of a lane at height y: follows the slant of the lane image, so the glissières stay in their rail */
const cxAt = (L, y) => L.x + (L.xt - L.x) * (BTN_Y - y) / (BTN_Y - LANE_TOP);
/* the beats of the song (quarter notes) and the eighth notes between them */
const BEATS = SONG.beats, BEAT = (BEATS[BEATS.length - 1] - BEATS[0]) / (BEATS.length - 1);
const EIGHTHS = BEATS.flatMap((b, k) => (k + 1 < BEATS.length ? [b, (b + BEATS[k + 1]) / 2] : [b]));
const isDown = (k) => (((k - SONG.down0) % 4) + 4) % 4 === 0;

/* ---------- the game's lettering: images of words, digits, X, + and € (assets/qte_text.webp) ---------- */
const REF = 155;                                   // height of a digit in the sheet
const glyphs = (str) => [...String(str)].map((ch) => (/\d/.test(ch) ? ch : ch === '+' ? 'PLUS' : ch === '€' ? 'EURO' : ch === '×' ? 'X' : ' '));
function keysWidth(keys, h, gap) {
  const S = FRAUDE.text.s, k = h / REF; let w = 0;
  keys.forEach((key, i) => { w += (key === ' ' ? h * 0.28 : S[key] ? S[key][2] * k : 0) + (i ? gap * h : 0); });
  return w;
}
function sprHTML(keys, h, gap = -0.05) {
  const T = FRAUDE.text, k = h / REF;
  return keys.map((key, i) => {
    const m = i ? `margin-left:${(gap * h).toFixed(1)}px;` : '';
    if (key === ' ') return `<i class="fsp-sp" style="${m}width:${(h * 0.28).toFixed(1)}px"></i>`;
    const s = T.s[key]; if (!s) return '';
    return `<i class="fsp" style="${m}width:${(s[2] * k).toFixed(1)}px;height:${(s[3] * k).toFixed(1)}px;background-size:${(T.w * k).toFixed(1)}px ${(T.h * k).toFixed(1)}px;background-position:${(-s[0] * k).toFixed(1)}px ${(-s[1] * k).toFixed(1)}px"></i>`;
  }).join('');
}
function drawKeys(c, keys, x, y, h, gap = -0.05) {   // centred on (x, y)
  const S = FRAUDE.text.s, img = IMG.qte_text; if (!img) return;
  const k = h / REF; let cx = x - keysWidth(keys, h, gap) / 2;
  keys.forEach((key, i) => {
    if (i) cx += gap * h;
    if (key === ' ') { cx += h * 0.28; return; }
    const s = S[key]; if (!s) return;
    const w = s[2] * k, hh = s[3] * k;
    c.drawImage(img, s[0], s[1], s[2], s[3], cx, y - hh / 2, w, hh); cx += w;
  });
}

export const Fraude = {
  active: false, phase: 'idle', buffer: null, loading: null, src: null, gain: null, filt: null,
  notes: [], cursor: 0, dcur: 0, parts: [], flyers: [], beams: [], spots: [], fx: [], press: [0, 0, 0, 0], flash: [0, 0, 0, 0],
  hold: [null, null, null, null], held: [0, 0, 0, 0], srcs: new Map(), tickFlash: [0, 0, 0, 0],
  combo: 0, best: 0, hits: 0, misses: 0, drops: 0, done: 0, cash: 0, risk: 0, riskShown: 0, lineIdx: -1, t: 0, lastNow: 0, vnow: null,
  shake: 0, redFlash: 0, downFlash: 0, bi: -1, bias: 0, sim: null, damien: null,
  /* ---------- availability (button in the cabinet) ---------- */
  canOffer() {
    const f = G.fraud || {};
    return Room.cab && G.sess.state === 'run' && G.sess.where === Room.cab && f.m !== G.months && !this.active;
  },
  /* ---------- the ready screen ---------- */
  /* free = launched from the settings: same mini-game, but nothing counts for the save */
  /* the pictures of the mini-game load in the background: wait for them, then put them in place */
  async pictures() {
    await need(['qte_night', 'qte_logo', 'qte_gauge', 'qte_text', 'qte_bills', 'qte_cards', 'qte_lanes', 'qte_btns', 'qd_kine', 'qd_menton', 'qd_goblin', 'qd_marvin']);
    $('frLogo').src = URLS.qte_logo; $('frReadyLogo').src = URLS.qte_logo; $('frGaugeImg').src = URLS.qte_gauge; $('frBg').src = URLS.qte_night;
    $('fraude').style.setProperty('--qt', `url("${URLS.qte_text}")`);
  },
  async open(free = false) {
    if (blocked() || this.active || this.opening) return;
    AudioSys.tap(); hideToast();
    this.opening = true; state.busy = true;
    await this.pictures();
    state.busy = false; this.opening = false;
    this.active = true; this.phase = 'ready'; this.free = !!free;
    const root = $('fraude'); root.hidden = false; root.classList.remove('caught', 'playing', 'ended');
    $('frReady').hidden = false; $('frEnd').hidden = true; $('frCount').innerHTML = '';
    $('frGo').disabled = false; $('frGo').querySelector('span').textContent = 'Lancer la fraude';
    $('frRules').innerHTML = frSpace(FRAUDE.rules.replace('{acte}', fmt(FRAUDE.acte)) + (this.free ? `<br><span class="fr-free">${FRAUDE.freeNote}</span>` : ''));
    $('frHonest').textContent = this.free ? 'Retour' : 'Rester honnête';
    this.resetPlay(); this.renderHud(); this.drawStatic();
    this.load();
  },
  load() {
    if (this.buffer || this.loading || !AudioSys.ctx || (TEST && TEST.fraude)) return this.loading;
    this.loading = fetch(SONG.src).then((r) => r.arrayBuffer()).then((ab) => AudioSys.decodeAB(ab)).then((b) => { this.buffer = b; }).catch(() => {});
    return this.loading;
  },
  honest() {
    AudioSys.tap(); this.close();
    if (!this.free) toast(frSpace(FRAUDE.honestToast), 3600);
  },
  close() {
    $('fraude').hidden = true; this.active = false; this.phase = 'idle'; this.stopAudio(0.3); this.releaseAll();
    if (AudioSys.playing && !AudioSys.src) AudioSys.play(AudioSys.theme, 1.5);
    Room.syncUi(); refreshGuide();
  },
  resetPlay() {
    const off = SONG.offset || 0;
    this.notes = SONG.notes.map(([t, l, d]) => {
      t += off;
      return { t, l, d, e: t + d, st: 0, q: 0, ti: 0, ticks: EIGHTHS.map((x) => x + off).filter((x) => x > t + 0.06 && x < t + d - 0.06) };
    });
    this.cursor = 0; this.dcur = 0; this.parts = []; this.flyers = []; this.fx = [];
    this.combo = 0; this.best = 0; this.hits = 0; this.misses = 0; this.drops = 0; this.done = 0; this.comboShown = -1; this.cashShown = -1;
    this.cash = 0; this.risk = 0; this.riskShown = 0; this.lineIdx = -1; this.shake = 0; this.redFlash = 0; this.downFlash = 0;
    this.bi = -1; this.bias = 0; this.vnow = null; this.lastNow = 0; this.damien = null;
    this.press = [0, 0, 0, 0]; this.flash = [0, 0, 0, 0]; this.tickFlash = [0, 0, 0, 0];
    this.hold = [null, null, null, null]; this.held = [0, 0, 0, 0]; this.srcs = new Map();
    this.dance = DANCERS.map((d, i) => ({ f: i, hold: 0, stumble: 0, flip: !!d.flip, spin: 0 }));
    this.beams = [0, 1, 2, 3].map((i) => ({ x: [250, 760, 1160, 1670][i], a: rand(-0.5, 0.5), sp: rand(0.35, 0.7) * (i % 2 ? 1 : -1), hue: i * 90 }));
    this.spots = Array.from({ length: 7 }, (_, i) => ({ x: rand(500, 1420), y: rand(640, 980), vx: rand(-120, 120), vy: rand(-50, 50), hue: i * 51, r: rand(90, 160) }));
    $('frL1').innerHTML = ''; $('frL2').innerHTML = '';
  },
  /* ---------- start: a count-in on the beats just before the song, then the music ---------- */
  async start() {
    if (this.phase !== 'ready') return;
    AudioSys.unlock();
    const go = $('frGo'); go.disabled = true;
    if (!this.buffer && !(TEST && TEST.fraude)) { go.querySelector('span').textContent = 'Chargement…'; await Promise.race([this.load(), wait(9000)]); }
    if (!this.active || this.phase !== 'ready') return;
    if (!this.free) { G.fraud = Object.assign(G.fraud || {}, { m: G.months, tries: ((G.fraud && G.fraud.tries) || 0) + 1 }); persist(); }
    $('frReady').hidden = true; $('fraude').classList.add('playing');
    AudioSys.stopCurrent(0.4);
    this.resetPlay();
    const lead = 2.5;
    if (this.buffer && AudioSys.ctx && !(TEST && TEST.fraude)) {
      const ctx = AudioSys.ctx;
      this.gain = ctx.createGain(); this.gain.gain.value = prefs.music ? Math.max(0.15, prefs.volume) : 0;
      this.filt = ctx.createBiquadFilter(); this.filt.type = 'lowpass'; this.filt.frequency.value = 20000;
      this.src = ctx.createBufferSource(); this.src.buffer = this.buffer;
      this.src.connect(this.filt); this.filt.connect(this.gain); this.gain.connect(ctx.destination);
      this.startAt = ctx.currentTime + lead; this.src.start(this.startAt); this.sim = null;
    } else this.sim = { t0: performance.now() + lead * 1000, speed: (TEST && TEST.fraude) || 1 };
    this.phase = 'count';
    /* 3, 2, 1, FRAUDE ! on the four beats that lead into the song */
    const c = $('frCount'), steps = ['3', '2', '1', 'FRAUDE'];
    for (let i = 0; i < 4; i++) {
      await this.until(BEATS[0] - BEAT * (4 - i));
      if (this.phase !== 'count') return;
      c.innerHTML = sprHTML([steps[i]], i < 3 ? 230 : 175); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
      this.downFlash = 1;
      if (i < 3) AudioSys.tick(); else AudioSys.pop();
    }
    this.phase = 'play';
    setTimeout(() => { if (c.querySelector('.fsp') && this.phase !== 'ready') c.innerHTML = ''; }, 700);
  },
  until(t) { return new Promise((res) => { const f = () => { if (!this.active || this.phase !== 'count' || this.now() >= t) res(); else requestAnimationFrame(f); }; f(); }); },
  /* position in the song as it is heard right now (output latency included when the browser tells it) */
  now() {
    if (this.sim) return ((performance.now() - this.sim.t0) / 1000) * this.sim.speed;
    const ctx = AudioSys.ctx; if (!ctx || this.startAt == null) return 0;
    let t = ctx.currentTime - (ctx.outputLatency || 0) - (ctx.baseLatency || 0) * 0.5;
    if (ctx.getOutputTimestamp) {
      const ts = ctx.getOutputTimestamp();
      if (ts && ts.contextTime > 0 && ts.performanceTime > 0) t = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    }
    return t - this.startAt;
  },
  stopAudio(fade = 0.4) {
    const s = this.src, g = this.gain; this.src = null; if (!s) return;
    const ctx = AudioSys.ctx, t = ctx.currentTime;
    try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + fade); s.stop(t + fade + 0.05); } catch (e) {}
  },
  /* ---------- input: a lane is pressed by a key or a finger, and released ---------- */
  laneDown(l, id, at) {
    if (this.phase !== 'play' || this.srcs.has(id)) return;
    this.srcs.set(id, l);
    if (this.held[l]++ > 0) return;
    this.press[l] = 1;
    const now = (at != null ? at : this.now()) - this.bias;
    let best = null, bd = 1e9;
    for (let k = this.cursor; k < this.notes.length; k++) {
      const n = this.notes[k]; if (n.t - now > WIN.ok) break;
      if (n.st || n.l !== l) continue;
      const d = now - n.t; if (Math.abs(d) < Math.abs(bd)) { bd = d; best = n; }
    }
    if (best && Math.abs(bd) <= WIN.ok) this.hit(best, bd);
    else this.sfx('ghost');
  },
  laneUp(id) {
    const l = this.srcs.get(id); if (l == null) return;
    this.srcs.delete(id);
    if (--this.held[l] > 0) return;
    this.held[l] = 0;
    const n = this.hold[l]; if (!n) return;
    if (this.now() >= n.e - TAIL) this.complete(n); else this.drop(n);
  },
  releaseAll() { for (const n of this.hold) if (n && n.st === 1) n.st = 4; this.srcs = new Map(); this.held = [0, 0, 0, 0]; this.hold = [null, null, null, null]; },
  /* ---------- scoring ---------- */
  hit(n, d) {
    n.st = 1; n.q = Math.abs(d) <= WIN.perfect ? 0 : 1; this.hold[n.l] = n;
    if (Math.abs(d) < 0.2) this.bias = clamp(this.bias + d * 0.12, -0.06, 0.06);   // follows a player who is always a bit early or late
    this.hits++; this.combo++; this.best = Math.max(this.best, this.combo);
    this.cash += FRAUDE.acte;
    const L = LANES[n.l];
    this.flash[n.l] = 1;
    this.judgeFx(n.l, n.q ? 'SUPER' : 'PARFAIT', n.q ? 0.9 : 1);
    this.cashPop(n.l, FRAUDE.acte);
    this.burst(L.x, BTN_Y, L.rgb, n.q ? 16 : 26, !n.q);
    if (!n.q && Math.random() < 0.35) this.spawnFlyer(true, L.x);
    this.sfx('hit', n.q);
    if (this.combo % 10 === 0) this.milestone(this.combo);
    this.renderHud();
  },
  tick(n) {
    this.cash += FRAUDE.tick; this.tickFlash[n.l] = 1;
    const L = LANES[n.l];
    this.burst(L.x + rand(-40, 40), BTN_Y - 20, Math.random() < 0.5 ? '255,215,80' : L.rgb, 7, true);
    this.sfx('tick');
    this.renderHud();
  },
  complete(n) {
    n.st = 2; this.hold[n.l] = null; this.done++;
    this.cash += FRAUDE.tick;
    const L = LANES[n.l], bonus = FRAUDE.tick * (n.ticks.length + 1);
    this.flash[n.l] = 1; this.tickFlash[n.l] = 1;
    this.addFx({ kind: 'ring', x: L.x, y: BTN_Y, rgb: L.rgb, dur: 0.45 });
    this.burst(L.x, BTN_Y - 10, L.rgb, n.ticks.length ? 24 : 10, true);
    if (n.ticks.length) { this.cashPop(n.l, bonus, true); this.sfx('done'); }
    this.renderHud();
  },
  drop(n) {
    n.st = 4; this.hold[n.l] = null; this.drops++;
    this.judgeFx(n.l, 'TROPTOT', 0.8);
    this.sfx('drop');
    this.renderHud();
  },
  miss(n) {
    n.st = 3; this.misses++;
    if (this.combo >= 10) { this.shake = Math.max(this.shake, 0.25); for (const d of this.dance) d.stumble = 0.6; }
    this.combo = 0;
    this.judgeFx(n.l, 'RATE', 0.9);
    this.redFlash = Math.min(1, this.redFlash + 0.3);
    for (const d of this.dance) d.stumble = Math.max(d.stumble, 0.4);
    this.sfx('miss');
    this.renderHud();
  },
  milestone(m) {
    const P = FRAUDE.praise, praise = m <= 40 ? P[m / 10 - 1] : P[2 + ((m / 10) % 2)];
    this.fx = this.fx.filter((f) => f.kind !== 'mile');
    this.addFx({ kind: 'mile', num: glyphs(m), praise, x: 960, y: 392, dur: 1.45, rise: 14, pop: 1, rot: rand(-0.1, 0.1) });
    this.shake = 0.5; AudioSys.success();
    for (let i = 0; i < 4; i++) this.burst(rand(500, 1420), rand(560, 900), LANES[i].rgb, 30, true);
    for (let i = 0; i < 6 + m / 5; i++) this.spawnFlyer(Math.random() < 0.6);
    for (const d of this.dance) { d.spin = 0.6; d.f = randi(0, 20); }
  },
  sfx(kind, q) {
    const n = (...a) => AudioSys.note(...a);
    if (kind === 'hit') { n('triangle', q ? 1319 : 1568, 0, 0.07, 0.07); n('sine', q ? 2637 : 3136, 0.005, 0.05, 0.035); }
    else if (kind === 'tick') n('sine', 2349, 0, 0.045, 0.03);
    else if (kind === 'done') { n('triangle', 1568, 0, 0.08, 0.06); n('triangle', 2093, 0.06, 0.16, 0.06); }
    else if (kind === 'drop') n('sine', 620, 0, 0.2, 0.06, 280);
    else if (kind === 'miss') n('square', 170, 0, 0.12, 0.045, 120);
    else if (kind === 'ghost') n('triangle', 220, 0, 0.06, 0.05, 150);
  },
  /* the automated test plays by itself (window.__COC_TEST.fraudeBot = probability of catching each glissière) */
  bot(now) {
    for (let k = this.cursor; k < this.notes.length; k++) {
      const n = this.notes[k]; if (n.t > now) break;
      if (n.st || n.bot) continue;
      n.bot = 1; if (Math.random() > TEST.fraudeBot) continue;
      this.laneUp('bot' + n.l); this.laneDown(n.l, 'bot' + n.l, n.t + this.bias + rand(-0.03, 0.03));
    }
    for (let l = 0; l < 4; l++) { const n = this.hold[l]; if (n && now >= n.e - 0.05) this.laneUp('bot' + l); }
  },
  /* ---------- update & draw (called by the main loop) ---------- */
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    if (this.phase === 'ready' || this.phase === 'ended') { this.drawStatic(dt); return; }
    const now = this.phase === 'caught' ? this.lastNow : this.now(); this.lastNow = now;
    /* smooth clock for the drawing (the audio clock moves by small jumps) */
    if (this.vnow == null || Math.abs(now - this.vnow) > 0.12 || this.phase === 'caught') this.vnow = now;
    else { this.vnow += dt * (this.sim ? this.sim.speed : 1); this.vnow += (now - this.vnow) * Math.min(1, dt * 10); }
    if (this.phase === 'play') {
      if (TEST && TEST.fraudeBot) this.bot(now);
      while (this.cursor < this.notes.length && this.notes[this.cursor].st) this.cursor++;
      for (let k = this.cursor; k < this.notes.length; k++) { const n = this.notes[k]; if (n.t > now) break; if (!n.st && now - this.bias - n.t > WIN.ok) this.miss(n); }
      for (let l = 0; l < 4; l++) {
        const n = this.hold[l]; if (!n) continue;
        while (n.ti < n.ticks.length && n.ticks[n.ti] <= now) { n.ti++; this.tick(n); }
        if (now >= n.e) this.complete(n);
        else if (!reduceMotion && Math.random() < 0.8) this.parts.push({ x: LANES[l].x + rand(-55, 55), y: BTN_Y - 30, vx: rand(-60, 60), vy: rand(-720, -380), life: 0, dur: rand(0.3, 0.55), r: rand(2, 5), rgb: Math.random() < 0.3 ? '255,255,255' : LANES[l].rgb, star: Math.random() < 0.3 });
      }
      /* the gauge simply follows the song: full on its very last note */
      this.risk = clamp(now / SONG.riskEnd, 0, 1);
      if (now >= SONG.riskEnd) this.caught();
    }
    this.riskShown += (this.risk - this.riskShown) * Math.min(1, dt * 6);
    /* beat clock (the real beats of the song) */
    const v = this.vnow;
    while (this.bi + 1 < BEATS.length && BEATS[this.bi + 1] <= v && this.phase !== 'caught') { this.bi++; this.onBeat(this.bi); }
    this.pulse = this.bi >= 0 && v >= BEATS[0] ? Math.exp(-((v - BEATS[this.bi]) / BEAT) * 5.5) : 0;
    for (let i = 0; i < 4; i++) { this.press[i] = Math.max(0, this.press[i] - dt * 6); this.flash[i] = Math.max(0, this.flash[i] - dt * 3.5); this.tickFlash[i] = Math.max(0, this.tickFlash[i] - dt * 5); }
    this.shake = Math.max(0, this.shake - dt); this.redFlash = Math.max(0, this.redFlash - dt * 1.4); this.downFlash = Math.max(0, this.downFlash - dt * 3);
    this.updateLyrics(v);
    this.renderGauge();
    this.draw(v, dt);
  },
  inChorus(now) { let k = 'verse'; for (const [t, s] of SONG.sections) if (now >= t) k = s; return k === 'chorus'; },
  onBeat(k) {
    const tier = tierOf(this.combo), chorus = this.inChorus(this.vnow), down = isDown(k);
    if (down) this.downFlash = 1;
    this.dance.forEach((d, i) => {
      if (d.stumble > 0) return;
      const every = tier >= 2 ? 1 : 2;
      if ((k + i) % every === 0) d.f++;
      if (tier >= 2 && down) d.flip = !d.flip;
    });
    const n = (chorus ? 2 : 0) + tier + (Math.random() < 0.5 ? 1 : 0);
    for (let j = 0; j < n; j++) this.spawnFlyer(Math.random() < 0.55);
    if (chorus && k % 2 === 0) this.burst(rand(200, 1720), rand(150, 380), `${randi(150, 255)},${randi(80, 255)},${randi(150, 255)}`, 10, false, true);
  },
  spawnFlyer(bill, x) {
    if (this.flyers.length > 90 || reduceMotion) return;
    const m = META()[bill ? 'qte_bills' : 'qte_cards'];
    this.flyers.push({ bill, f: randi(0, m.n - 1), x: x != null ? x + rand(-60, 60) : rand(60, 1860), y: x != null ? BTN_Y - 60 : rand(-160, -60), vx: rand(-40, 40), vy: x != null ? rand(-700, -450) : rand(90, 200), rot: rand(0, 6.28), vr: rand(-3, 3), sway: rand(0, 6.28), s: rand(0.55, 0.95), g: x != null ? 900 : 120 });
  },
  burst(x, y, rgb, n, star, soft) {
    if (reduceMotion) n = Math.min(n, 6);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(soft ? 60 : 180, soft ? 200 : 620);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (soft ? 0 : 160), life: 0, dur: rand(0.45, soft ? 1.4 : 0.9), r: rand(3, 8), rgb: Math.random() < 0.3 ? '255,255,255' : rgb, star: star && Math.random() < 0.5 });
    }
  },
  /* floating lettering: one judgment per lane (replaces the previous one), lanes staggered so neighbours never overlap */
  addFx(o) { this.fx.push(Object.assign({ life: 0, dur: 0.8, rise: 30, pop: 1 }, o)); },
  judgeFx(l, key, k = 1) {
    this.fx = this.fx.filter((f) => !(f.kind === 'judge' && f.lane === l));
    this.addFx({ kind: 'judge', lane: l, keys: [key], x: LANES[l].x, y: BTN_Y - 178 - (l % 2) * 42, h: 60 * k, dur: 0.75, rise: 26 });
  },
  cashPop(l, v, big) {
    this.fx = this.fx.filter((f) => !(f.kind === 'cash' && f.lane === l));
    this.addFx({ kind: 'cash', lane: l, keys: glyphs(`+${v} €`), x: LANES[l].x, y: BTN_Y - 262 - (l % 2) * 42, h: big ? 42 : 36, dur: 0.8, rise: 80 });
  },
  /* ---------- lyrics (karaoke) ---------- */
  updateLyrics(now) {
    const L = SONG.lines;
    let i = -1; for (let k = 0; k < L.length; k++) if (L[k].t - 0.25 <= now) i = k; else break;
    if (i !== this.lineIdx) {
      this.lineIdx = i;
      const cur = L[i], nxt = L[i + 1];
      const len = cur ? cur.w.map((x) => x[1]).join(' ').length : 0;
      $('frL1').className = 'fr-l1' + (cur && (cur.k === 'chorus' || cur.k === 'final') ? ' chorus' : '') + (len > 52 ? ' xl' : len > 36 ? ' l' : '');
      $('frL1').innerHTML = cur ? cur.w.map(([t, w], j) => `<span data-j="${j}">${esc(w)}</span>`).join(' ') : '';
      $('frL2').textContent = nxt ? nxt.w.map((x) => x[1]).join(' ') : '';
      if (cur) { const el = $('frL1'); el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); }
    }
    const cur = L[i]; if (!cur) return;
    const spans = $('frL1').children;
    cur.w.forEach(([t], j) => { const on = now >= t - 0.04; const s = spans[j]; if (s && s.classList.contains('on') !== on) s.classList.toggle('on', on); });
  },
  renderGauge() {
    const r = this.riskShown, el = $('frGFill');
    el.style.height = (r * 100).toFixed(2) + '%';
    $('frGTxt').textContent = Math.round(r * 100) + ' %';
    $('fraude').classList.toggle('alarm', r > 0.72 && this.phase === 'play');
  },
  renderHud() {
    const cash = Math.round(this.cash);
    if (cash !== this.cashShown) { this.cashShown = cash; $('frCash').innerHTML = sprHTML(glyphs(`${fmt(cash)} €`), 62); }
    $('frSub').textContent = frSpace(`${this.hits} séance${this.hits > 1 ? 's' : ''} fictive${this.hits > 1 ? 's' : ''}`);
    const c = $('frCombo');
    c.hidden = this.combo < 3;
    if (!c.hidden && this.comboShown !== this.combo) {
      this.comboShown = this.combo;
      c.innerHTML = `<div class="frc-n">${sprHTML(['X', ...glyphs(this.combo)], 92)}</div><div class="frc-l">${sprHTML(['COMBO'], 50)}</div>`;
      c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); c.dataset.tier = tierOf(this.combo);
    }
  },
  /* ---------- drawing ---------- */
  drawStatic(dt = 0) { this.pulse = 0.25 + 0.25 * Math.sin(this.t * 3); this.draw(-5, dt, true); },
  draw(now, dt, idle) {
    const bc = $('frBack').getContext('2d'), fc = $('frFront').getContext('2d');
    bc.clearRect(0, 0, W, H); fc.clearRect(0, 0, W, H);
    const pulse = this.pulse || 0, tier = tierOf(this.combo);
    const root = $('frRoot');
    if (this.shake > 0 && !reduceMotion) root.style.transform = `translate(${rand(-1, 1) * this.shake * 16}px,${rand(-1, 1) * this.shake * 12}px)`;
    else if (root.style.transform) root.style.transform = '';
    /* --- back: light beams, floor spots, beat glow --- */
    bc.save(); bc.globalCompositeOperation = 'lighter';
    const hueT = this.t * 40, beat = pulse + this.downFlash * 0.5;
    for (const b of this.beams) {
      b.a = Math.sin(this.t * b.sp + b.hue) * 0.55;
      const len = 1300, wdt = 170 + 80 * beat, x = b.x, y = -40, ang = Math.PI / 2 + b.a;
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      const nx = -Math.sin(ang) * wdt, ny = Math.cos(ang) * wdt;
      const g = bc.createLinearGradient(x, y, ex, ey), col = `hsla(${(b.hue + hueT) % 360},100%,62%,`;
      g.addColorStop(0, col + (0.32 + 0.25 * beat) + ')'); g.addColorStop(1, col + '0)');
      bc.fillStyle = g; bc.beginPath(); bc.moveTo(x - 8, y); bc.lineTo(ex + nx, ey + ny); bc.lineTo(ex - nx, ey - ny); bc.lineTo(x + 8, y); bc.closePath(); bc.fill();
    }
    for (const s of this.spots) {
      s.x += s.vx * dt; s.y += s.vy * dt; if (s.x < 450 || s.x > 1470) s.vx *= -1; if (s.y < 600 || s.y > 1000) s.vy *= -1;
      const g = bc.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * (1 + 0.3 * beat));
      g.addColorStop(0, `hsla(${(s.hue + hueT * 1.5) % 360},100%,60%,${0.28 + 0.2 * beat})`); g.addColorStop(1, 'hsla(0,0%,0%,0)');
      bc.fillStyle = g; bc.beginPath(); bc.ellipse(s.x, s.y, s.r * 1.6, s.r * 0.55, 0, 0, Math.PI * 2); bc.fill();
    }
    const gg = bc.createRadialGradient(960, 720, 50, 960, 720, 900); gg.addColorStop(0, `rgba(255,120,220,${0.10 + 0.16 * beat * (1 + tier * 0.3)})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
    bc.fillStyle = gg; bc.fillRect(0, 0, W, H);
    /* disco ball glints */
    for (let i = 0; i < 6; i++) { const a = this.t * 1.7 + i * 1.05, r = 60 + 30 * Math.sin(this.t * 3 + i); this.star(bc, 960 + Math.cos(a) * r * 1.6, 95 + Math.sin(a) * r * 0.6, 10 + 10 * beat, `hsla(${(i * 60 + hueT) % 360},100%,80%,0.9)`); }
    bc.restore();
    /* --- dancers --- */
    for (let i = 0; i < DANCERS.length; i++) this.drawDancer(bc, i, pulse, tier, dt);
    /* --- lanes, glissières, buttons --- */
    this.drawLanes(fc, now, pulse, dt, idle);
    /* --- flyers (bills & cards) --- */
    for (const f of this.flyers) {
      f.vy += f.g * dt; if (f.g > 200 && f.vy > 160) { f.g = 120; f.vy = Math.min(f.vy, 200); }
      f.sway += dt * 3; f.x += (f.vx + Math.sin(f.sway) * 60) * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      const m = META()[f.bill ? 'qte_bills' : 'qte_cards'], img = IMG[f.bill ? 'qte_bills' : 'qte_cards']; if (!img) continue;
      const sx = (f.f % m.cols) * m.cw, sy = Math.floor(f.f / m.cols) * m.ch;
      fc.save(); fc.translate(f.x, f.y); fc.rotate(f.rot * 0.25); fc.scale(f.s * Math.cos(f.sway * 0.7), f.s);
      fc.drawImage(img, sx, sy, m.cw, m.ch, -m.ax, -m.ay, m.cw, m.ch); fc.restore();
    }
    this.flyers = this.flyers.filter((f) => f.y < H + 160);
    /* --- particles --- */
    fc.save(); fc.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      p.life += dt; p.vy += 700 * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt;
      const k = 1 - p.life / p.dur; if (k <= 0) continue;
      if (p.star) this.star(fc, p.x, p.y, p.r * 2.2 * k + 2, `rgba(${p.rgb},${k})`);
      else { fc.fillStyle = `rgba(${p.rgb},${k})`; fc.beginPath(); fc.arc(p.x, p.y, p.r * (0.4 + k * 0.6), 0, Math.PI * 2); fc.fill(); }
    }
    fc.restore();
    this.parts = this.parts.filter((p) => p.life < p.dur);
    /* --- floating lettering (images) --- */
    for (const f of this.fx) {
      f.life += dt; const k = f.life / f.dur; if (k >= 1) continue;
      if (f.kind === 'ring') {
        fc.save(); fc.globalCompositeOperation = 'lighter'; fc.strokeStyle = `rgba(${f.rgb},${1 - k})`; fc.lineWidth = 14 * (1 - k);
        const r = 100 + 110 * k; fc.beginPath(); fc.ellipse(f.x, f.y, r, r * 0.6, 0, 0, Math.PI * 2); fc.stroke(); fc.restore(); continue;
      }
      const sc = f.pop * (k < 0.15 ? lerp(0.4, 1.15, k / 0.15) : lerp(1.15, 1, Math.min(1, (k - 0.15) * 4)));
      fc.save(); fc.globalAlpha = k > 0.72 ? (1 - k) / 0.28 : 1; fc.translate(f.x, f.y - f.rise * k); fc.scale(sc, sc);
      if (f.rot) fc.rotate(f.rot * (1 - Math.min(1, k * 3)));
      if (f.kind === 'mile') {
        const wn = keysWidth(f.num, 130, -0.05), wc = keysWidth(['COMBO'], 74, 0);
        drawKeys(fc, f.num, -wc / 2 - 6, -40, 130); drawKeys(fc, ['COMBO'], wn / 2 + 6, -34, 74);
        if (f.praise) drawKeys(fc, [f.praise], 0, 78, 104);
      }
      else drawKeys(fc, f.keys, 0, 0, f.h);
      fc.restore();
    }
    this.fx = this.fx.filter((f) => f.life < f.dur);
    /* red alarm vignette */
    const alarm = (this.riskShown > 0.72 && !idle ? (this.riskShown - 0.72) / 0.28 * (0.5 + 0.5 * Math.sin(this.t * 9)) : 0) + this.redFlash * 0.6 + (this.phase === 'caught' ? 0.5 + 0.5 * Math.sin(this.t * 10) : 0);
    if (alarm > 0.01) {
      const vg = fc.createRadialGradient(960, 540, 380, 960, 540, 1150); vg.addColorStop(0, 'rgba(255,0,0,0)'); vg.addColorStop(1, `rgba(255,20,20,${Math.min(0.7, alarm * 0.55)})`);
      fc.fillStyle = vg; fc.fillRect(0, 0, W, H);
    }
    if (this.damien) this.drawDamien(fc, dt);
  },
  star(c, x, y, r, col) {
    c.fillStyle = col; c.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.28 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
  },
  drawDancer(c, i, pulse, tier, dt) {
    const D = DANCERS[i], st = this.dance[i], m = META()[D.key], img = IMG[D.key]; if (!m || !img) return;
    st.stumble = Math.max(0, st.stumble - dt); st.spin = Math.max(0, st.spin - dt);
    const f = ((st.f % m.n) + m.n) % m.n, sx = (f % m.cols) * m.cw, sy = Math.floor(f / m.cols) * m.ch;
    const amp = [10, 18, 28, 40][tier] * (D.back ? 0.6 : 1), bounce = this.phase === 'caught' ? 0 : pulse * amp;
    const sqY = 1 - 0.05 * pulse, sqX = 1 + 0.035 * pulse;
    let s = D.s, x = D.x, y = D.y - bounce;
    if (st.stumble > 0) x += Math.sin(st.stumble * 60) * 10;
    if (this.phase === 'caught') x += Math.sin(this.t * 40 + i) * 4;
    /* shadow */
    c.save(); c.globalAlpha = 0.45; c.fillStyle = '#12001f'; c.beginPath(); c.ellipse(D.x, D.y + 4, 120 * s * (1 - 0.15 * pulse), 26 * s, 0, 0, Math.PI * 2); c.fill(); c.restore();
    /* aura with big combos */
    if (tier >= 2 && !D.back) {
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x, y - 220 * s, 20, x, y - 220 * s, 300 * s);
      g.addColorStop(0, `hsla(${(this.t * 120 + i * 90) % 360},100%,65%,${0.25 + 0.25 * pulse})`); g.addColorStop(1, 'hsla(0,0%,0%,0)');
      c.fillStyle = g; c.fillRect(x - 320 * s, y - 560 * s, 640 * s, 640 * s); c.restore();
    }
    c.save(); c.translate(x, y);
    const flip = st.flip !== !!D.flip ? -1 : 1, spin = st.spin > 0 ? Math.cos((0.6 - st.spin) / 0.6 * Math.PI * 2) : 1;
    c.scale(s * sqX * flip * spin, s * sqY);
    if (this.phase === 'caught') c.filter = 'saturate(.6) brightness(.85)';
    c.drawImage(img, sx, sy, m.cw, m.ch, -m.ax, -m.ay, m.cw, m.ch);
    c.restore();
  },
  drawLanes(c, now, pulse, dt, idle) {
    const lm = META().qte_lanes, li = IMG.qte_lanes, bm = META().qte_btns, bi = IMG.qte_btns;
    for (let l = 0; l < 4; l++) {
      const L = LANES[l], held = this.hold[l];
      if (li) {
        c.save(); c.globalAlpha = 0.92; c.translate(L.x, LANE_BASE); c.scale(LANE_S, LANE_S);
        c.drawImage(li, l * lm.cw, 0, lm.cw, lm.ch, -lm.ax, -lm.ay, lm.cw, lm.ch); c.restore();
      }
      const fl = this.flash[l] + this.press[l] * 0.4 + pulse * 0.12 + this.downFlash * 0.12 + (held ? 0.45 + 0.2 * this.tickFlash[l] : 0);
      if (fl > 0.02) {
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(0, LANE_TOP, 0, BTN_Y); g.addColorStop(0, `rgba(${L.rgb},0)`); g.addColorStop(1, `rgba(${L.rgb},${Math.min(0.8, fl * 0.6)})`);
        c.fillStyle = g; c.beginPath(); c.moveTo(L.xt - 34, LANE_TOP); c.lineTo(L.xt + 34, LANE_TOP); c.lineTo(L.x + 104, BTN_Y); c.lineTo(L.x - 104, BTN_Y); c.closePath(); c.fill(); c.restore();
      }
    }
    if (!idle) { this.drawBeatLines(c, now); this.drawSliders(c, now); }
    /* buttons */
    if (bi) for (let l = 0; l < 4; l++) {
      const L = LANES[l], held = this.hold[l], pr = Math.max(this.press[l], held ? 0.7 : 0);
      const sc = 0.86 * (1 - pr * 0.1 + this.flash[l] * 0.1 + (held ? 0.04 * this.tickFlash[l] : 0) + pulse * 0.025);
      if (held) {
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(L.x, BTN_Y, 10, L.x, BTN_Y, 190);
        g.addColorStop(0, `rgba(255,255,255,${0.45 + 0.25 * this.tickFlash[l]})`); g.addColorStop(0.35, `rgba(${L.rgb},0.45)`); g.addColorStop(1, `rgba(${L.rgb},0)`);
        c.fillStyle = g; c.beginPath(); c.ellipse(L.x, BTN_Y, 200, 130, 0, 0, Math.PI * 2); c.fill(); c.restore();
      }
      c.save(); c.translate(L.x, BTN_Y + pr * 8); c.scale(sc, sc * 0.96);
      c.drawImage(bi, l * bm.cw, 0, bm.cw, bm.ch, -bm.ax, -bm.ay, bm.cw, bm.ch);
      const glow = Math.max(this.flash[l], held ? 0.35 + 0.4 * this.tickFlash[l] : 0);
      if (glow > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = glow * 0.8; c.drawImage(bi, l * bm.cw, 0, bm.cw, bm.ch, -bm.ax, -bm.ay, bm.cw, bm.ch); }
      c.restore();
      if (this.flash[l] > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(${L.rgb},${this.flash[l]})`; c.lineWidth = 10 * this.flash[l]; c.beginPath(); c.ellipse(L.x, BTN_Y, 110 + (1 - this.flash[l]) * 70, (110 + (1 - this.flash[l]) * 70) * 0.62, 0, 0, Math.PI * 2); c.stroke(); c.restore(); }
    }
    if (!idle) this.drawRings(c, now);
  },
  /* lines across the lanes on every beat (stronger on the first beat of the bar): they reach the buttons exactly on the beat */
  drawBeatLines(c, now) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let k = Math.max(0, this.bi); k < BEATS.length; k++) {
      const dtb = BEATS[k] - now; if (dtb > APPROACH) break; if (dtb < 0) continue;
      const p = 1 - dtb / APPROACH, y = yAt(p), dn = isDown(k), a = (dn ? 0.55 : 0.24) * Math.min(1, p * 2.5);
      c.strokeStyle = dn ? `rgba(255,232,150,${a})` : `rgba(255,255,255,${a})`; c.lineWidth = (dn ? 5 : 2.5) * (0.5 + 0.5 * p);
      c.beginPath();
      for (const L of LANES) { const hw = hwAt(y) * 0.96, x = cxAt(L, y); c.moveTo(x - hw, y); c.lineTo(x + hw, y); }
      c.stroke();
    }
    c.restore();
  },
  /* the glissières: a glossy tube of light from the tail to the head; held ones are "eaten" by the button */
  drawSliders(c, now) {
    while (this.dcur < this.notes.length && this.notes[this.dcur].e + 1.2 < now) this.dcur++;
    const band = (L, p0, p1, wk) => {
      const N = 10; c.beginPath();
      for (let i = 0; i <= N; i++) { const y = yAt(p0 + (p1 - p0) * i / N), hw = hwAt(y) * wk, x = cxAt(L, y); if (i) c.lineTo(x - hw, y); else c.moveTo(x - hw, y); }
      for (let i = N; i >= 0; i--) { const y = yAt(p0 + (p1 - p0) * i / N), hw = hwAt(y) * wk; c.lineTo(cxAt(L, y) + hw, y); }
      c.closePath();
    };
    c.save();
    for (let k = this.dcur; k < this.notes.length; k++) {
      const n = this.notes[k]; if (n.t - now > APPROACH) break;
      if (n.st === 2) continue;
      const L = LANES[n.l], grey = n.st >= 3, held = n.st === 1;
      const ph = held ? 1 : 1 - (n.t - now) / APPROACH, pt = 1 - (n.e - now) / APPROACH;
      const p0 = Math.max(0, pt), p1 = Math.min(grey ? 1.3 : 1.12, ph);
      if (p1 <= p0) continue;
      const fade = grey ? clamp((1.3 - p1) / 0.3, 0, 1) : Math.min(1, 0.35 + p1 * 1.6);
      const yA = yAt(p0), yB = yAt(p1), hue = (now * 160 + n.t * 60 + L.hue) % 360;
      c.globalAlpha = fade;
      /* glow around, then a dark groove so that the light stands out on the neon lane */
      if (!grey) { c.globalCompositeOperation = 'lighter'; band(L, p0, p1, 0.95); c.fillStyle = `rgba(${L.rgb},${held ? 0.45 : 0.25})`; c.fill(); }
      c.globalCompositeOperation = 'source-over';
      band(L, p0, p1, 0.74); c.fillStyle = 'rgba(16,0,34,0.72)'; c.fill();
      if (grey) {
        band(L, p0, p1, 0.56); c.fillStyle = 'rgba(150,150,175,0.55)'; c.fill();
        c.lineWidth = 2; c.strokeStyle = 'rgba(40,30,60,0.8)'; c.stroke();
      } else {
        /* white-hot tube with a coloured rim: stands out on every neon lane */
        band(L, p0, p1, 0.6); c.fillStyle = L.col; c.fill();
        c.lineWidth = 3; c.strokeStyle = '#1d0430'; c.stroke();
        const g = c.createLinearGradient(0, yA, 0, yB);
        g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0.9)'); g.addColorStop(1, '#ffffff');
        band(L, p0, p1, 0.44); c.fillStyle = g; c.fill();
        /* multicolour shimmer running along the core */
        c.strokeStyle = `hsla(${hue},100%,62%,0.9)`; c.lineWidth = 5 * (0.5 + 0.5 * p1);
        c.beginPath(); c.moveTo(cxAt(L, yA), yA); c.lineTo(cxAt(L, yB), yB); c.stroke();
        /* eighth-note marks: the rhythm you are holding */
        c.strokeStyle = L.col;
        for (const tt of n.ticks) {
          const p = 1 - (tt - now) / APPROACH; if (p <= p0 || p >= p1) continue;
          const y = yAt(p), hw = hwAt(y) * 0.5, x = cxAt(L, y); c.lineWidth = 3 + 3 * p; c.beginPath(); c.moveTo(x - hw, y); c.lineTo(x + hw, y); c.stroke();
        }
      }
      /* rounded tail */
      if (pt >= 0) { const hw = hwAt(yA) * 0.6; c.fillStyle = grey ? 'rgba(150,150,175,0.6)' : `rgba(${L.rgb},0.85)`; c.beginPath(); c.ellipse(cxAt(L, yA), yA, hw, hw * 0.32, 0, 0, Math.PI * 2); c.fill(); }
      /* head: a big gem of light that must land on the button */
      if (!held) {
        const hw = hwAt(yB) * 0.9, xB = cxAt(L, yB);
        c.beginPath(); c.ellipse(xB, yB, hw, hw * 0.42, 0, 0, Math.PI * 2);
        if (grey) { c.fillStyle = 'rgba(175,175,195,0.75)'; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(40,30,60,0.9)'; c.stroke(); }
        else {
          c.save(); c.translate(xB, yB); c.scale(1, 0.42);
          const gr = c.createRadialGradient(0, -hw * 0.2, 0, 0, 0, hw);
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#ffffff'); gr.addColorStop(0.72, `hsl(${hue},100%,70%)`); gr.addColorStop(1, L.col);
          c.fillStyle = gr; c.fill(); c.restore();
          c.lineWidth = 4.5; c.strokeStyle = '#1d0430'; c.stroke();
          c.globalCompositeOperation = 'lighter';
          const gl = c.createRadialGradient(xB, yB, hw * 0.4, xB, yB, hw * 1.6);
          gl.addColorStop(0, `rgba(${L.rgb},0.55)`); gl.addColorStop(1, `rgba(${L.rgb},0)`);
          c.fillStyle = gl; c.beginPath(); c.ellipse(xB, yB, hw * 1.6, hw * 0.75, 0, 0, Math.PI * 2); c.fill();
          c.globalCompositeOperation = 'source-over';
        }
      }
      c.globalAlpha = 1;
    }
    c.restore();
  },
  /* a ring closes on the button as the next glissière arrives: it meets the rim exactly on time */
  drawRings(c, now) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let l = 0; l < 4; l++) {
      let n = null;
      for (let k = this.cursor; k < this.notes.length; k++) { const m = this.notes[k]; if (m.t - now > 0.8) break; if (!m.st && m.l === l) { n = m; break; } }
      if (!n || n.t < now) continue;
      const k = clamp((n.t - now) / 0.8, 0, 1), L = LANES[l], r = 98 * (1 + 0.8 * k);
      c.strokeStyle = `rgba(${L.rgb},${(1 - k) * 0.95})`; c.lineWidth = 3 + 7 * (1 - k);
      c.beginPath(); c.ellipse(L.x, BTN_Y, r, r * 0.6, 0, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  },
  /* ---------- stopping in time ---------- */
  async stop() {
    if (this.phase !== 'play' && this.phase !== 'count') return;
    AudioSys.tap();
    this.phase = 'ended'; this.releaseAll(); $('frCount').innerHTML = ''; $('fraude').classList.remove('playing', 'alarm'); $('fraude').classList.add('ended');
    if (this.src) { const ctx = AudioSys.ctx, t = ctx.currentTime; try { this.src.playbackRate.setValueAtTime(1, t); this.src.playbackRate.linearRampToValueAtTime(0.25, t + 0.5); } catch (e) {} this.stopAudio(0.55); }
    const loot = this.cash, risk = Math.round(this.risk * 100);
    if (loot > 0 && !this.free) {
      G.money += loot; book('Séances fictives facturées (fraude, à rembourser)', loot, 'hors', 'fraude');
      G.fraud.pending = { loot, risk: this.risk, m: G.months }; persist(); HUD.tweenMoney();
    }
    $('frEndTitle').textContent = loot ? 'Tu t’arrêtes à temps… ?' : 'Fraude annulée';
    $('frEndBody').innerHTML = frSpace(loot
      ? `Tu empoches <b>${fmt(loot)} €</b> de séances fictives (${this.hits} séance${this.hits > 1 ? 's' : ''} jamais faite${this.hits > 1 ? 's' : ''}). Risque d'être ${gx('repéré', 'repérée')} : <b>${risk} %</b>.<br><small>${esc(this.free ? FRAUDE.freeEnd : FRAUDE.escapeNote)}</small>`
      : `Aucune séance fictive facturée. ${esc(FRAUDE.honestToast)}`);
    $('frEnd').hidden = false;
  },
  endOk() { AudioSys.tap(); this.close(); },
  /* ---------- caught! Damien, chevalier de la Sécu ---------- */
  async caught() {
    if (this.phase === 'caught') return;
    this.phase = 'caught'; this.releaseAll(); $('fraude').classList.remove('playing', 'alarm'); $('fraude').classList.add('caught');
    const ctx = AudioSys.ctx;
    if (this.src && ctx) { const t = ctx.currentTime; try { this.src.playbackRate.setValueAtTime(1, t); this.src.playbackRate.exponentialRampToValueAtTime(0.08, t + 0.9); this.filt.frequency.exponentialRampToValueAtTime(400, t + 0.9); } catch (e) {} this.stopAudio(1.0); }
    this.scratch(); this.siren(2.4);
    this.shake = 1.2; this.redFlash = 1;
    await wait(900);
    this.damien = { x: 2150, y: BTN_Y + 60, tx: 1250, t: 0, pose: 'dash', s: 1.75 };
    await new Promise((res) => { this.damien.arrive = res; setTimeout(res, 2500); });
    this.damien.pose = 'point';
    state.busy = true;
    await Talk.open(); await SCRIPTS.fraudeCaught(this.cash); await Talk.close(true);
    state.busy = false;
    const loot = this.cash, hits = this.hits;
    $('fraude').hidden = true; this.active = false; this.phase = 'idle';
    await Donjon.jail({ loot, hits, buffer: this.buffer, free: this.free });
  },
  drawDamien(c, dt) {
    const d = this.damien; d.t += dt;
    if (d.pose === 'dash') {
      d.x += (d.tx - d.x) * Math.min(1, dt * 5);
      if (Math.abs(d.x - d.tx) < 8) { d.x = d.tx; d.pose = 'point'; this.shake = 0.6; for (let i = 0; i < 14; i++) this.burst(d.x + rand(-80, 80), d.y, '230,210,190', 1, false, true); if (d.arrive) { const f = d.arrive; d.arrive = null; f(); } }
      if (Math.random() < 0.6) this.burst(d.x + 60, d.y - 10, '220,200,180', 1, false, true);
    }
    c.save(); c.globalAlpha = 0.5; c.fillStyle = '#000'; c.beginPath(); c.ellipse(d.x, d.y + 4, 110, 26, 0, 0, Math.PI * 2); c.fill(); c.restore();
    drawCharSafe(c, 'damien', d.pose, d.t, d.x, d.y, d.s);
  },
  scratch() {
    const ctx = AudioSys.ctx; if (!ctx || !prefs.sfx) return;
    const t = ctx.currentTime, len = 0.5, b = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.22); f.frequency.exponentialRampToValueAtTime(2400, t + 0.45);
    const g = ctx.createGain(); g.gain.value = 0.9; s.connect(f); f.connect(g); g.connect(AudioSys.sfxGain); s.start(t);
  },
  /* police two-tone, soft (triangle wave through a low-pass, no harsh beeping) */
  siren(dur) {
    const ctx = AudioSys.ctx; if (!ctx || !prefs.sfx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'triangle'; f.type = 'lowpass'; f.frequency.value = 1700;
    for (let k = 0; k < dur / 0.45; k++) o.frequency.setValueAtTime(k % 2 ? 640 : 860, t + k * 0.45);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.1, t + 0.05); g.gain.setValueAtTime(0.1, t + dur - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(AudioSys.sfxGain); o.start(t); o.stop(t + dur + 0.05);
  },
  /* ---------- a month later, if you got away with it ---------- */
  async monthCheck() {
    const p = G.fraud && G.fraud.pending; if (!p || p.m >= G.months) return;
    G.fraud.pending = null; persist();
    if (Math.random() < p.risk) {
      const fine = FRAUDE.controlFine;
      await Talk.open(); await SCRIPTS.fraudeControl(p.loot, fine); await Talk.close();
      G.money -= p.loot + fine;
      book('Remboursement des séances fictives (indu)', -p.loot, 'hors', 'fraude');
      book('Pénalité pour fraude (contrôle CPAM)', -fine, 'hors', 'penalite');
      G.fraud.convictions = (G.fraud.convictions || 0) + 1; persist(); HUD.tweenMoney();
    } else toast(frSpace(FRAUDE.luckyToast), 4200);
  }
};
function drawCharSafe(c, who, pose, t, x, y, s) { drawChar(c, who, pose, t, x, y, s, { fps: 10 }); }

$('frGo').addEventListener('click', () => Fraude.start());
$('frHonest').addEventListener('click', () => Fraude.honest());
$('frStop').addEventListener('click', () => Fraude.stop());
$('frEndOk').addEventListener('click', () => Fraude.endOk());
$('setFraude').addEventListener('click', () => {
  if (state.busy || Fraude.active) return;
  $('settings').hidden = true;
  Fraude.open(true);
});
/* fingers on the 4 pads (several at once), keyboard arrows or D F J K: press = catch, release = let go */
const pads = $('frPads');
pads.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('[data-l]'); if (!b) return;
  e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (err) {}
  Fraude.laneDown(+b.dataset.l, 'p' + e.pointerId);
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) pads.addEventListener(ev, (e) => Fraude.laneUp('p' + e.pointerId));
addEventListener('keydown', (e) => {
  if (!Fraude.active || Fraude.phase !== 'play' || e.repeat) return;
  const l = KEYS[e.key]; if (l == null) return;
  e.preventDefault(); Fraude.laneDown(l, 'k' + e.key.toLowerCase());
});
addEventListener('keyup', (e) => { if (Fraude.active && KEYS[e.key] != null) Fraude.laneUp('k' + e.key.toLowerCase()); });
addEventListener('blur', () => { if (Fraude.active) Fraude.releaseAll(); });
