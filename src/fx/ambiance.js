import { G, state, working } from '../core/save.js';
import { $ } from '../core/utils.js';
import { Day } from '../game/day.js';

/* ================= Ambiance jour → crépuscule (DA « cosy village ») =================
   La lumière suit l'avancement de la journée de travail :
   jour pendant la première moitié, puis le soir tombe doucement jusqu'à la fin des séances.
   On écrit seulement une variable CSS --dusk (0 = jour, 1 = crépuscule) sur la scène ;
   tout le rendu est dans styles/da-cosy.css. */
export const Ambiance = {
  v: 0,
  target() {
    if (!state.started || !working()) return 0;
    const s = G.sess;
    if (s.state === 'ready' || s.state === 'closing') return 1;
    if (s.state !== 'run') return 0;
    const p = s.day ? Day.progress() : s.t / Math.max(1, s.dur);
    return Math.min(1, Math.max(0, (p - 0.45) / 0.5));
  },
  update(dt) {
    const t = this.target();
    if (t === this.v) return;
    const nv = this.v + (t - this.v) * Math.min(1, dt * 1.5);
    this.v = Math.abs(t - nv) < 0.003 ? t : nv;
    $('stage').style.setProperty('--dusk', this.v.toFixed(3));
  }
};
