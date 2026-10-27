import { ASSETS, LAZY_MUSIC, URLS } from '../core/assets.js';
import { prefs } from '../core/prefs.js';
import { G, state } from '../core/save.js';
import { MAPS } from '../data/worlds.js';
import { rand, wait } from '../core/utils.js';

/* ================= Audio: music themes, effects, abstract voices ================= */
const VOICES = {
  mentor: { base: 255, wave: 'sawtooth', fm: 1.18, spread: 0.14, dur: 0.085, vol: 0.55 },
  player: { base: 145, wave: 'sawtooth', fm: 0.94, spread: 0.16, dur: 0.09, vol: 0.55 },
  goblin: { base: 360, wave: 'square', fm: 1.5, spread: 0.32, dur: 0.07, vol: 0.32, vib: 26 },
  ambroise: { base: 165, wave: 'sawtooth', fm: 1.02, spread: 0.18, dur: 0.08, vol: 0.52 },
  mathieu: { base: 190, wave: 'sawtooth', fm: 1.08, spread: 0.2, dur: 0.075, vol: 0.5 },
  marvin: { base: 210, wave: 'square', fm: 1.22, spread: 0.26, dur: 0.07, vol: 0.34, vib: 9 },
  menton: { base: 108, wave: 'sawtooth', fm: 0.86, spread: 0.12, dur: 0.1, vol: 0.6 },
  thomas: { base: 175, wave: 'sawtooth', fm: 1.12, spread: 0.2, dur: 0.075, vol: 0.5 },
  julien: { base: 98, wave: 'sawtooth', fm: 0.8, spread: 0.1, dur: 0.11, vol: 0.62 },
  etienne: { base: 158, wave: 'triangle', fm: 1.0, spread: 0.24, dur: 0.08, vol: 0.62 },
  damien: { base: 132, wave: 'sawtooth', fm: 0.92, spread: 0.18, dur: 0.085, vol: 0.6 },
  patient: { base: 230, wave: 'triangle', fm: 1.1, spread: 0.22, dur: 0.08, vol: 0.6 },
  playerf: { base: 245, wave: 'sawtooth', fm: 1.12, spread: 0.18, dur: 0.08, vol: 0.5 },
  gabriel: { base: 170, wave: 'square', fm: 1.05, spread: 0.22, dur: 0.07, vol: 0.32 },
  mathis: { base: 185, wave: 'sawtooth', fm: 1.1, spread: 0.24, dur: 0.07, vol: 0.5 },
  paul: { base: 150, wave: 'triangle', fm: 0.95, spread: 0.2, dur: 0.09, vol: 0.62 },
  fee: { base: 420, wave: 'triangle', fm: 1.4, spread: 0.3, dur: 0.06, vol: 0.55, vib: 14 },
  sage: { base: 95, wave: 'sawtooth', fm: 0.78, spread: 0.1, dur: 0.12, vol: 0.6 },
  chad: { base: 85, wave: 'sawtooth', fm: 0.82, spread: 0.14, dur: 0.1, vol: 0.62 },
  clement: { base: 160, wave: 'sawtooth', fm: 1.06, spread: 0.2, dur: 0.075, vol: 0.5 },
  suzie: { base: 300, wave: 'triangle', fm: 1.3, spread: 0.34, dur: 0.065, vol: 0.6, vib: 7 },
  alien: { base: 520, wave: 'square', fm: 1.7, spread: 0.4, dur: 0.06, vol: 0.28, vib: 30 },
  cowboy: { base: 120, wave: 'sawtooth', fm: 0.88, spread: 0.16, dur: 0.09, vol: 0.55 },
  mini: { base: 260, wave: 'triangle', fm: 1.2, spread: 0.26, dur: 0.07, vol: 0.6 }
};
const VOWELS = { a: [800, 1250], e: [470, 1900], i: [310, 2300], o: [480, 900], u: [330, 820] };
export const AudioSys = {
  ctx: null, musicGain: null, sfxGain: null, voiceGain: null, buffers: {}, src: null, els: {}, playing: false, noise: null, ducked: false, theme: 'main', lazyStarted: false,
  init() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      this.ctx = new AC();
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0; this.musicGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.55; this.sfxGain.connect(this.ctx.destination);
      this.voiceGain = this.ctx.createGain(); this.voiceGain.gain.value = 0.85; this.voiceGain.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  decodeAB(ab) {
    if (!this.ctx || !ab) return Promise.resolve(null);
    return new Promise((res) => { try { const p = this.ctx.decodeAudioData(ab, res, () => res(null)); if (p && p.then) p.then(res, () => res(null)); } catch (e) { res(null); } });
  },
  async decode(ab) { this.buffers.main = await this.decodeAB(ab); },
  /* Fetch and decode one theme (the one you need first comes first), then the others in the background. */
  themeJobs: {},
  loadTheme(k) {
    if (!LAZY_MUSIC[k]) return Promise.resolve();
    if (this.themeJobs[k]) return this.themeJobs[k];
    return (this.themeJobs[k] = (async () => {
      try {
        const res = await fetch(LAZY_MUSIC[k]); if (!res.ok) throw 0;
        const blob = await res.blob(); URLS['m_' + k] = URL.createObjectURL(blob);
        if (this.ctx) this.buffers[k] = await this.decodeAB(await blob.arrayBuffer());
      } catch (e) { URLS['m_' + k] = LAZY_MUSIC[k]; }
      this.upgrade(k);
    })());
  },
  async loadThemes() {
    if (this.lazyStarted) return; this.lazyStarted = true;
    for (const k in LAZY_MUSIC) await this.loadTheme(k);
  },
  /* A theme that started on an <audio> element (its buffer was not ready) moves to the looping buffer as soon as it is decoded:
     an <audio> element read from the network or the offline cache may not loop (the file cannot be seeked back to 0). */
  upgrade(k) {
    const el = this.els[k], buf = this.buffers[k];
    if (!el || el.paused || !buf || !this.ctx || this.src || this.theme !== k || !this.playing) return;
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(this.musicGain);
    const t = this.ctx.currentTime, g = this.musicGain.gain; g.cancelScheduledValues(t); g.setValueAtTime(this.target(), t);
    s.start(0, (el.currentTime || 0) % buf.duration); this.src = s; el.pause();
  },
  ok() { return this.ctx && this.ctx.state === 'running'; },
  unlock() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); },
  target() { return prefs.volume * 0.9 * (this.ducked ? 0.45 : 1); },
  urlOf(name) { return name === 'main' ? (URLS.music || ASSETS.music[0]) : (URLS['m_' + name] || LAZY_MUSIC[name]); },
  startMusic() {
    if (!prefs.music || this.playing) return;
    this.playing = true; this.play(this.theme, 2.2);
  },
  play(name, fadeIn = 1) {
    const buf = this.buffers[name];
    if (this.ctx && buf) {
      const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(this.musicGain); s.start(); this.src = s;
      const t = this.ctx.currentTime, g = this.musicGain.gain; g.cancelScheduledValues(t); g.setValueAtTime(0.0001, t); g.linearRampToValueAtTime(this.target(), t + fadeIn);
    } else {
      let el = this.els[name];
      if (!el) {
        el = this.els[name] = new Audio(this.urlOf(name)); el.loop = true;
        /* safety net: if the element does not loop, start the theme again */
        el.addEventListener('ended', () => { if (this.playing && this.theme === name && !this.src) { if (this.buffers[name]) this.play(name, 0.3); else { el.currentTime = 0; el.play().catch(() => {}); } } });
      }
      el.volume = this.target(); el.currentTime = 0; el.play().catch(() => {});
      if (name !== 'main') this.loadTheme(name);
    }
  },
  stopCurrent(fade = 0.5) {
    if (this.src) { const s = this.src; this.src = null; if (this.ctx) { const t = this.ctx.currentTime, g = this.musicGain.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + fade); try { s.stop(t + fade + 0.05); } catch (e) {} } }
    for (const k in this.els) this.els[k].pause();
  },
  stopMusic() { if (!this.playing) return; this.playing = false; this.stopCurrent(0.5); },
  /* Switch to another theme (main, urssaf, cnam) with a short crossfade. */
  async setTheme(name) {
    if (name !== 'main' && !this.buffers[name]) await Promise.race([this.loadTheme(name), wait(2500)]);
    if (this.theme === name) return;
    this.theme = name;
    if (!this.playing) return;
    this.stopCurrent(0.45);
    await wait(380);
    if (this.playing && this.theme === name) this.play(name, 0.8);
  },
  setVolume() {
    if (this.src && this.ctx) { const t = this.ctx.currentTime; this.musicGain.gain.cancelScheduledValues(t); this.musicGain.gain.setTargetAtTime(this.target(), t, 0.15); }
    for (const k in this.els) this.els[k].volume = this.target();
  },
  duck(on) { this.ducked = on; this.setVolume(); },
  note(type, f, delay, dur, vol, f2) {
    if (!prefs.sfx || !this.ok()) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  },
  pop() { this.note('triangle', 420, 0, 0.16, 0.5, 980); this.note('sine', 900, 0.05, 0.1, 0.18, 1500); },
  tap() { this.note('sine', 1100, 0, 0.08, 0.28, 620); },
  coin() { this.note('square', 1318, 0, 0.09, 0.12); this.note('square', 1976, 0.07, 0.25, 0.12); },
  tick() { this.note('triangle', 2100, 0, 0.05, 0.08); },
  stamp() { this.note('sine', 150, 0, 0.22, 0.7, 55); this.note('triangle', 880, 0.06, 0.3, 0.14); this.note('triangle', 1320, 0.12, 0.36, 0.11); },
  right() { [523, 659, 784, 1047].forEach((f, i) => this.note('triangle', f, i * 0.07, 0.24, 0.24)); },
  wrong() { this.note('square', 240, 0, 0.18, 0.12, 200); this.note('square', 180, 0.16, 0.32, 0.12, 140); },
  success() { [659, 784, 988, 1319].forEach((f, i) => this.note('triangle', f, i * 0.08, 0.3, 0.2)); this.note('sine', 330, 0.3, 0.6, 0.18); },
  fanfare() { [523, 659, 784].forEach((f, i) => this.note('triangle', f, i * 0.11, 0.26, 0.24)); [1047, 1319, 1568].forEach((f) => this.note('triangle', f, 0.36, 0.9, 0.12)); this.note('sine', 262, 0.36, 1, 0.22); },
  build() { this.note('sine', 120, 0, 0.32, 0.8, 45); this.whoosh(0.5, false); [784, 988, 1175, 1568].forEach((f, i) => this.note('triangle', f, 0.35 + i * 0.08, 0.22, 0.16)); },
  hammer() { this.note('square', 220, 0, 0.06, 0.12, 120); this.note('triangle', 1400, 0.01, 0.05, 0.08); },
  cash() { this.note('square', 1568, 0, 0.07, 0.1); this.note('square', 2093, 0.06, 0.08, 0.1); this.note('triangle', 2637, 0.12, 0.35, 0.16); this.note('sine', 1319, 0.14, 0.4, 0.12); },
  horn() { this.note('square', 392, 0, 0.16, 0.09); this.note('square', 494, 0, 0.16, 0.07); this.note('square', 392, 0.22, 0.26, 0.09); this.note('square', 494, 0.22, 0.26, 0.07); },
  bell() { this.note('sine', 988, 0, 0.6, 0.3); this.note('sine', 784, 0.32, 0.8, 0.3); },
  ring() { for (let k = 0; k < 2; k++) for (let i = 0; i < 8; i++) this.note('square', i % 2 ? 1320 : 1100, k * 0.5 + i * 0.045, 0.045, 0.05); },
  chime() { [784, 1047, 1319].forEach((f, i) => this.note('sine', f, i * 0.12, 0.5, 0.22)); },
  page() { this.whoosh(0.35, true); },
  whoosh(dur = 0.8, up = true) {
    if (!prefs.sfx || !this.ok()) return;
    if (!this.noise) { const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.5, this.ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = b; }
    const t = this.ctx.currentTime, s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(up ? 280 : 1800, t); f.frequency.exponentialRampToValueAtTime(up ? 1800 : 260, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxGain); s.start(t); s.stop(t + dur + 0.05);
  },
  /* the theme that plays where you are */
  home() {
    if (state.screen === 'town') { const M = MAPS[G.map]; return M ? M.music : 'main'; }
    if (state.screen === 'interior' && state.interior === 'urssaf') return 'urssaf';
    return 'main';
  },
  /* One syllable of gibberish: an oscillator shaped by two vowel formants. */
  voice(whoId, vowel, opt = {}) {
    if (whoId === 'player' && G.gender === 'f') whoId = 'playerf';
    if (!prefs.voice || !this.ok()) return;
    const p = VOICES[whoId]; if (!p) return;
    const v = VOWELS[vowel] || VOWELS.a;
    const t = this.ctx.currentTime + 0.004 + (opt.delay || 0);
    const dur = opt.dur || p.dur;
    const f0 = p.base * (opt.mul || 1) * (1 + rand(-p.spread, p.spread) * (opt.steady ? 0.2 : 1));
    const o = this.ctx.createOscillator(); o.type = p.wave;
    o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (opt.glide || rand(0.9, 1.1)), t + dur);
    if (p.vib) { const l = this.ctx.createOscillator(), lg = this.ctx.createGain(); l.frequency.value = p.vib; lg.gain.value = f0 * 0.07; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.03); }
    const g = this.ctx.createGain(), vol = p.vol * (opt.vol || 1);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.setValueAtTime(vol, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const [fr, q, gain] of [[v[0] * p.fm, 4, 1], [v[1] * p.fm, 6, 0.7]]) {
      const b = this.ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fr; b.Q.value = q;
      const bg = this.ctx.createGain(); bg.gain.value = gain; o.connect(b); b.connect(bg); bg.connect(g);
    }
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700 * p.fm;
    const lg2 = this.ctx.createGain(); lg2.gain.value = 0.35; o.connect(lp); lp.connect(lg2); lg2.connect(g);
    g.connect(this.voiceGain); o.start(t); o.stop(t + dur + 0.03);
  },
  blip(whoId, ch, prog, question) {
    const c = ch.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const vowel = 'aeiou'.includes(c) ? c : 'aeiou'[(Math.random() * 5) | 0];
    const mul = (1 - prog * 0.1) * (question && prog > 0.7 ? 1.3 : 1);
    this.voice(whoId, vowel, { mul });
  },
  emote(whoId, expr, entering) {
    if (whoId === 'goblin') { if (entering) [0, 0.13, 0.26].forEach((d, i) => this.voice('goblin', 'e', { delay: d, mul: 1.25 - i * 0.08, dur: 0.09 })); return; }
    if (expr === 'scared') this.voice(whoId, 'a', { mul: 1.1, glide: 1.6, dur: 0.2, steady: true });
    else if (expr === 'think') this.voice(whoId, 'u', { mul: 0.95, glide: 0.82, dur: 0.32, vol: 0.8, steady: true });
    else if (entering) this.voice(whoId, 'o', { mul: 1.05, glide: 1.25, dur: 0.14, steady: true });
  }
};
document.addEventListener('visibilitychange', () => {
  if (!AudioSys.ctx || !state.started) return;
  if (document.hidden) AudioSys.ctx.suspend().catch(() => {}); else AudioSys.ctx.resume().catch(() => {});
  for (const k in AudioSys.els) { const el = AudioSys.els[k]; if (k === AudioSys.theme && AudioSys.playing) { document.hidden ? el.pause() : el.play().catch(() => {}); } }
});
