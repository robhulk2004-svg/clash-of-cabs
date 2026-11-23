import { AudioSys } from '../audio/audio.js';
import { stage } from '../core/layout.js';
import { $, KX, KY, TEST, frSpace, rand, reduceMotion } from '../core/utils.js';
import { Cam } from '../scenes/camera.js';
import { ICON } from './icons.js';

/* ================= Small UI helpers ================= */
let toastTimer = 0;
export function hideToast() { clearTimeout(toastTimer); $('toast').classList.remove('show'); }
export function toast(html, ms = 3400) {
  const t = $('toast'); t.innerHTML = frSpace(html); t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
export function stageRect(el) {
  let x = 0, y = 0, e = el;
  while (e && e !== stage) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
  /* elements inside a scaled .art layer: convert from art units to stage pixels */
  if (el.closest && el.closest('.art')) {
    let ax = 0, ay = 0, e2 = el; const art = el.closest('.art');
    while (e2 && e2 !== art) { ax += e2.offsetLeft; ay += e2.offsetTop; e2 = e2.offsetParent; }
    if (art.id === 'townArt' && typeof Cam !== 'undefined') { const b = Cam.base(); return { x: b.tx + ax * b.sx, y: b.ty + ay * b.sy, w: el.offsetWidth * b.sx, h: el.offsetHeight * b.sy }; }
    return { x: ax * KX, y: ay * KY, w: el.offsetWidth * KX, h: el.offsetHeight * KY };
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
export const artRect = (x, y, w, h) => ({ x: x * KX, y: y * KY, w: w * KX, h: h * KY });
export function floatText(x, y, html, cls, dur = 1500) {
  const d = document.createElement('div'); d.className = 'float-txt ' + (cls || ''); d.innerHTML = html;
  d.style.left = x + 'px'; d.style.top = y + 'px'; $('flyLayer').appendChild(d);
  const a = d.animate([{ transform: 'translate(-50%,0) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-24px) scale(1.1)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,-80px) scale(1)', opacity: 0 }], { duration: dur, easing: 'ease-out' });
  a.finished.then(() => d.remove(), () => d.remove());
}
export async function coinFlight(fx, fy, tx, ty, n = 8) {
  if (reduceMotion || (TEST && TEST.fastWait)) return;
  const jobs = [];
  for (let k = 0; k < n; k++) {
    const c = document.createElement('div'); c.className = 'fly-coin'; c.innerHTML = ICON.coin; $('flyLayer').appendChild(c);
    const mx = (fx + tx) / 2 + rand(-120, 120), my = Math.min(fy, ty) - rand(40, 160);
    const a = c.animate([
      { transform: `translate(${fx - 30}px, ${fy - 30}px) scale(.5)`, opacity: 0 },
      { transform: `translate(${mx - 30}px, ${my - 30}px) scale(1.15)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${tx - 30}px, ${ty - 30}px) scale(.7)`, opacity: 1 }
    ], { duration: 700 + k * 55, easing: 'cubic-bezier(.45,0,.6,1)', fill: 'forwards' });
    jobs.push(a.finished.then(() => { c.remove(); AudioSys.tick(); }, () => c.remove()));
  }
  await Promise.all(jobs);
}
export function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
export const MONEY_PT = { x: 729, y: 64 };   // stage position of the money counter
