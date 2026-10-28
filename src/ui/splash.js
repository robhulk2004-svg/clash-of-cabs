import { prefs } from '../core/prefs.js';
import { $, TEST, wait } from '../core/utils.js';

/* ================= v6.1: the studio screen at launch, like the Supercell logo before Clash of Clans =================
   A black screen, the « Michigan » logo appears, a light sweeps across it with its jingle (eagle.mp3), it fades away.
   Then the loading screen shows with its own jingle (jingle.mp3).
   Browsers only play a sound after a first touch: when the sound is blocked, « Touche l'écran » waits for that touch
   (it also unlocks the music of the game, so the loading screen no longer needs a touch of its own). */
const el = $('splash');
const sound = (src, vol) => { const a = new Audio(src); a.volume = Math.min(1, vol); a.preload = 'auto'; return a; };
function soundAllowed() {
  try {
    if (navigator.getAutoplayPolicy) return navigator.getAutoplayPolicy('mediaelement') === 'allowed';
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return false;
    const c = new C(), ok = c.state === 'running'; c.close(); return ok;
  } catch (e) { return false; }
}
export const Splash = {
  active: !!el, touched: false, jingle: null, endAt: 0,
  skip() { if (el) el.remove(); this.active = false; },
  /* the loading screen stays at least until its jingle is over (or max ms after the logo) */
  jingleDone(max) {
    const j = this.jingle, left = Math.max(0, this.endAt + max - performance.now());
    if (!j || j.ended || j.paused) return wait(Math.min(left, 600));
    return Promise.race([new Promise((r) => j.addEventListener('ended', r, { once: true })), wait(left)]);
  },
  /* resolves once the logo is gone (the loading screen is then visible) */
  run(unlock) {
    if (!el) return Promise.resolve();
    if (TEST) { el.remove(); this.active = false; return Promise.resolve(); }
    const vol = prefs.sfx ? 0.9 * (prefs.volume / 0.6) : 0;
    const eagle = sound('assets/eagle.mp3', vol), jingle = sound('assets/jingle.mp3', vol * 0.85);
    this.jingle = jingle;
    return new Promise((resolve) => {
      const play = async () => {
        el.onpointerdown = null; removeEventListener('keydown', onKey);
        $('spHint').hidden = true;
        el.classList.add('sp-on');
        if (vol) eagle.play().catch(() => {});
        await wait(2150);
        el.classList.add('sp-out');
        if (vol) jingle.play().catch(() => {});
        await wait(500);
        el.remove(); this.active = false; this.endAt = performance.now(); resolve();
      };
      const onTouch = () => { this.touched = true; unlock && unlock(); play(); };
      const onKey = (e) => { if (['Enter', ' ', 'Spacebar', 'Escape'].includes(e.key)) { e.preventDefault(); onTouch(); } };
      /* is the sound allowed without a touch? (the browser remembers that the player came before) */
      if (!vol) { play(); return; }
      if (soundAllowed()) { this.touched = true; unlock && unlock(); play(); return; }
      $('spHint').hidden = false;
      el.onpointerdown = onTouch; addEventListener('keydown', onKey);
    });
  }
};
