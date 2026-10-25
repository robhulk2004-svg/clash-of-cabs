import { stage } from '../core/layout.js';
import { state } from '../core/save.js';
import { $, clamp } from '../core/utils.js';
import { MAP_H, MAP_W } from '../data/worlds.js';
import { blocked } from '../ui/modals.js';

/* ================= Town camera: drag (or scroll) to move the view, pinch or Ctrl + wheel to zoom ================= */
const BX = 1.148325, BY = 1.147715, ZMIN = 1, ZMAX = 1.6;
/* the view may go a little beyond the top and left edges of the map, so that the roads painted there
   (arrows to the other destinations) come out from under the HUD */
const PAD_L = 150, PAD_T = 140;
export const Cam = {
  z: 1.15, x: 0, y: 0, drag: null, justDragged: false, vx: 0, vy: 0, pts: new Map(), pinch: null,
  lim() { return { minX: 1920 - MAP_W * BX * this.z, minY: 1080 - MAP_H * BY * this.z }; },
  clampXY() { const L = this.lim(); this.x = clamp(this.x, Math.min(0, L.minX), PAD_L); this.y = clamp(this.y, Math.min(0, L.minY), PAD_T); },
  base() { return { tx: this.x, ty: this.y, sx: BX * this.z, sy: BY * this.z }; },
  apply() { this.clampXY(); const b = this.base(); $('townArt').style.transform = `translate(${b.tx.toFixed(1)}px,${b.ty.toFixed(1)}px) scale(${b.sx},${b.sy})`; },
  center() { const L = this.lim(); this.x = L.minX * 0.5; this.y = L.minY * 0.5; this.apply(); },
  /* Look at an art point (e.g. the player's cabinet), as far as the limits allow. */
  look(ax, ay) { const b = this.base(); this.x = Math.min(0, 960 - ax * b.sx); this.y = Math.min(0, 560 - ay * b.sy); this.vx = this.vy = 0; this.apply(); },
  toStage(ax, ay) { const b = this.base(); return { x: b.tx + ax * b.sx, y: b.ty + ay * b.sy }; },
  toArt(sx, sy) { const b = this.base(); return { x: (sx - b.tx) / b.sx, y: (sy - b.ty) / b.sy }; },
  /* is an art point on screen (with a margin in stage pixels)? */
  visible(ax, ay, m = 0) { const p = this.toStage(ax, ay); return p.x > m && p.x < 1920 - m && p.y > m && p.y < 1080 - m; },
  scale() { return stage.getBoundingClientRect().width / 1920 || 1; },
  /* zoom around a stage point */
  zoomAt(z, sx, sy) {
    z = clamp(z, ZMIN, ZMAX); if (Math.abs(z - this.z) < 1e-4) return;
    const a = this.toArt(sx, sy); this.z = z; const b = this.base();
    this.x = sx - a.x * b.sx; this.y = sy - a.y * b.sy; this.apply();
  },
  stagePt(e) { const r = stage.getBoundingClientRect(), k = this.scale(); return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; },
  init() {
    const sc = $('townScene');
    sc.addEventListener('pointerdown', (e) => {
      if (state.screen !== 'town' || blocked()) return;
      this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pts.size === 2) {
        const [p, q] = [...this.pts.values()], mid = this.stagePt({ clientX: (p.x + q.x) / 2, clientY: (p.y + q.y) / 2 });
        this.pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), z: this.z, mid }; this.drag = null; return;
      }
      if (e.button !== 0) return;
      this.drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: this.x, y0: this.y, on: false, lx: e.clientX, ly: e.clientY, lt: performance.now() };
      this.vx = this.vy = 0;
    });
    sc.addEventListener('pointermove', (e) => {
      if (this.pts.has(e.pointerId)) this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch && this.pts.size === 2) {
        const [p, q] = [...this.pts.values()], d = Math.hypot(p.x - q.x, p.y - q.y);
        this.zoomAt(this.pinch.z * d / Math.max(10, this.pinch.d), this.pinch.mid.x, this.pinch.mid.y); this.justDragged = true; return;
      }
      const d = this.drag; if (!d || e.pointerId !== d.id) return;
      const k = this.scale(), dx = (e.clientX - d.sx) / k, dy = (e.clientY - d.sy) / k;
      if (!d.on && Math.hypot(dx, dy) > 9) { d.on = true; sc.classList.add('dragging'); try { sc.setPointerCapture(e.pointerId); } catch (err) {} }
      if (d.on) {
        this.x = d.x0 + dx; this.y = d.y0 + dy; this.apply();
        const now = performance.now(), dt = Math.max(1, now - d.lt);
        this.vx = ((e.clientX - d.lx) / k) / dt * 16; this.vy = ((e.clientY - d.ly) / k) / dt * 16; d.lx = e.clientX; d.ly = e.clientY; d.lt = now;
      }
    });
    const end = (e) => {
      this.pts.delete(e.pointerId);
      if (this.pinch) { if (this.pts.size < 2) { this.pinch = null; setTimeout(() => { this.justDragged = false; }, 80); } return; }
      const d = this.drag; if (!d || e.pointerId !== d.id) return;
      if (d.on) { this.justDragged = true; setTimeout(() => { this.justDragged = false; }, 60); sc.classList.remove('dragging'); }
      else this.vx = this.vy = 0;
      this.drag = null;
    };
    sc.addEventListener('pointerup', end); sc.addEventListener('pointercancel', end);
    /* a drag must not count as a click on a building or a bubble */
    sc.addEventListener('click', (e) => { if (this.justDragged) { e.stopPropagation(); e.preventDefault(); } }, true);
    sc.addEventListener('wheel', (e) => {
      if (state.screen !== 'town' || blocked()) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) { const p = this.stagePt(e); this.zoomAt(this.z * Math.exp(-e.deltaY * 0.004), p.x, p.y); return; }
      this.x -= (e.shiftKey ? e.deltaY : e.deltaX) * 0.6; this.y -= (e.shiftKey ? 0 : e.deltaY) * 0.6; this.vx = this.vy = 0; this.apply();
    }, { passive: false });
    addEventListener('keydown', (e) => {
      if (state.screen !== 'town' || blocked()) return;
      if (/INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return;
      const m = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }[e.key];
      if (m) { this.x += m[0]; this.y += m[1]; this.apply(); }
      if (e.key === '+' || e.key === '=') this.zoomAt(this.z * 1.12, 960, 540);
      if (e.key === '-' || e.key === '_') this.zoomAt(this.z / 1.12, 960, 540);
    });
    this.center();
  },
  /* inertia after a quick drag */
  update(dt) {
    if (this.drag || this.pinch || (Math.abs(this.vx) < 0.05 && Math.abs(this.vy) < 0.05)) return;
    this.x += this.vx * dt * 60; this.y += this.vy * dt * 60; this.apply();
    const f = Math.pow(0.0025, dt); this.vx *= f; this.vy *= f;
  }
};
