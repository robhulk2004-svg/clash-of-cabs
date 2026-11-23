import { prefs } from '../core/prefs.js';
import { rand } from '../core/utils.js';
import { AudioSys } from './audio.js';

/* ================= Recorded sound effects (v6.3, the Kinédex) =================
   The sounds of the chest opening of Beast Brawl! (assets/sfx/*.mp3), fetched the first time the Kinédex or a chest needs
   them, then played instantly with WebAudio. The rest of the game keeps its synthesized notes (audio.js). */
const NAMES = ['whoosh', 'chest_land', 'chest_thud', 'chest_shake', 'chest_open', 'coins', 'gems', 'card_fly', 'surge', 'tick', 'card_flip',
  'rev_common', 'rev_legendary', 'rev_ultimate', 'new_card', 'reward', 'click', 'buy', 'error', 'deploy', 'swish'];
const GAIN = { click: 0.55, tick: 0.5, swish: 0.6, whoosh: 0.6, coins: 0.7, card_fly: 0.7, deploy: 0.75 };
const MIN_GAP = { coins: 0.06, tick: 0.03 };
const BUF = {}, last = {};
let voices = 0, out = null, job = null;

function bus() {
  const ctx = AudioSys.ctx; if (!ctx) return null;
  if (!out) { out = ctx.createGain(); out.gain.value = 0.62; out.connect(ctx.destination); }
  return out;
}
/* Fetch and decode every sound (about 0.4 MB), once. Never fails: a missing sound is just silent. */
export function loadKxSfx() {
  if (job) return job;
  return (job = Promise.all(NAMES.map((n) => fetch(`assets/sfx/${n}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((ab) => AudioSys.decodeAB(ab))
    .then((b) => { if (b) BUF[n] = b; }).catch(() => {}))).then(() => {}));
}
/* Play a sound. o: { v (volume), rate (speed and pitch), at (delay in s) }. Returns true if it played. */
export function play(name, o = {}) {
  const ctx = AudioSys.ctx;
  if (!ctx || !prefs.sfx || !BUF[name] || ctx.state !== 'running') return false;
  const now = ctx.currentTime, gap = MIN_GAP[name] || 0.02;
  if (!o.at && last[name] && now - last[name] < gap) return false;
  if (voices > 24) return false;
  last[name] = now + (o.at || 0);
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = BUF[name]; s.playbackRate.value = o.rate || 1;
  g.gain.value = (o.v === undefined ? 1 : o.v) * (GAIN[name] || 1);
  s.connect(g); g.connect(bus());
  voices++; s.onended = () => { voices--; };
  s.start(now + (o.at || 0));
  return true;
}
export const sfx = {
  click() { play('click', { rate: rand(0.97, 1.05) }); },
  back() { play('click', { rate: 0.82, v: 0.8 }); },
  error() { play('error'); },
  place() { play('deploy'); },
  pick() { play('swish', { v: 0.6, rate: 1.2 }); },
  buy() { play('buy'); }
};
