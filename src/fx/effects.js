import { G } from '../core/save.js';
import { $, AH, AW, SH, SW, rand, reduceMotion } from '../core/utils.js';
import { WATER } from '../data/worlds.js';
import { Cam } from '../scenes/camera.js';

/* ================= Effects ================= */
function glowSprite(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.22, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c;
}
const MOTE = glowSprite('rgba(255,232,150,.75)', 'rgba(255,200,90,0)');
const GLINT = glowSprite('rgba(220,245,255,.8)', 'rgba(160,220,255,0)');
function star(ctx, x, y, size, rot, alpha, sprite) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, -size, -size, size * 2, size * 2);
  ctx.fillStyle = '#fffef4'; ctx.beginPath();
  const L = size * 1.6, w = size * 0.16;
  ctx.moveTo(0, -L); ctx.quadraticCurveTo(w, -w, L, 0); ctx.quadraticCurveTo(w, w, 0, L); ctx.quadraticCurveTo(-w, w, -L, 0); ctx.quadraticCurveTo(-w, -w, 0, -L);
  ctx.fill(); ctx.restore();
}
export function sampleOpaque(img, rect, n, minA = 235, minLum = 150) {
  const pts = [];
  try {
    const c = document.createElement('canvas'); c.width = rect.w; c.height = rect.h; const g = c.getContext('2d');
    g.drawImage(img, 0, 0, rect.w, rect.h); const d = g.getImageData(0, 0, rect.w, rect.h).data;
    for (let i = 0; i < 6000 && pts.length < n; i++) {
      const x = (Math.random() * rect.w) | 0, y = (Math.random() * rect.h) | 0, o = (y * rect.w + x) * 4;
      if (d[o + 3] >= minA && 0.3 * d[o] + 0.59 * d[o + 1] + 0.11 * d[o + 2] >= minLum) pts.push([rect.x + x, rect.y + y]);
    }
  } catch (e) {}
  if (!pts.length) for (let i = 0; i < n; i++) pts.push([rect.x + Math.random() * rect.w, rect.y + Math.random() * rect.h]);
  return pts;
}
export const TitleFX = {
  ctx: $('fxTitle').getContext('2d'), motes: [], leaves: [], sparks: [], logoPts: [], pillPts: [], nextLeaf: 1.5, nextSpark: 2.4, t: 0, alpha: 0,
  setup() { this.motes = []; const n = reduceMotion ? 0 : 42; for (let i = 0; i < n; i++) this.motes.push(this.mote(true)); },
  mote(initial) { return { x: rand(0, AW), y: initial ? rand(0, AH) : AH + 20, r: rand(3, 9), vy: rand(10, 26), ph: rand(0, 6.28), tw: rand(0.6, 1.6), a: rand(0.35, 0.9) }; },
  leaf() { const l = Math.random() < 0.5; return { x: l ? rand(-20, 520) : rand(1150, AW + 20), y: -30, s: rand(11, 20), vy: rand(38, 62), sway: rand(25, 60), ph: rand(0, 6.28), rot: rand(0, 6.28), vr: rand(-1.6, 1.6), hue: rand(88, 118), life: 0 }; },
  drawLeaf(c, L) {
    c.save(); c.translate(L.x + Math.sin(L.ph) * L.sway, L.y); c.rotate(L.rot); c.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(L.ph * 1.3)));
    const s = L.s; c.beginPath(); c.moveTo(-s, 0); c.bezierCurveTo(-s * 0.4, -s * 0.75, s * 0.5, -s * 0.6, s, 0); c.bezierCurveTo(s * 0.5, s * 0.6, -s * 0.4, s * 0.75, -s, 0);
    const g = c.createLinearGradient(0, -s, 0, s); g.addColorStop(0, `hsl(${L.hue},70%,58%)`); g.addColorStop(1, `hsl(${L.hue + 10},72%,34%)`);
    c.fillStyle = g; c.fill(); c.strokeStyle = `hsla(${L.hue},60%,82%,.7)`; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-s * 0.9, 0); c.quadraticCurveTo(0, -s * 0.08, s * 0.92, 0); c.stroke(); c.restore();
  },
  update(dt) {
    const c = this.ctx; this.t += dt; this.alpha = Math.min(1, this.alpha + dt * 0.6);
    c.clearRect(0, 0, AW, AH); c.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      m.y -= m.vy * dt; m.ph += dt * 0.7; m.x += Math.sin(m.ph) * 0.25;
      if (m.y < -20) Object.assign(m, this.mote(false));
      c.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(this.t * m.tw * 2 + m.ph)) * this.alpha; c.drawImage(MOTE, m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
    }
    c.globalAlpha = 1; this.nextSpark -= dt;
    if (this.nextSpark <= 0 && this.logoPts.length) {
      const onPill = Math.random() < 0.3 && this.pillPts.length; const arr = onPill ? this.pillPts : this.logoPts; const p = arr[(Math.random() * arr.length) | 0];
      this.sparks.push({ x: p[0], y: p[1], life: 0, dur: rand(0.55, 0.85), size: rand(7, 13), rot: rand(0, 0.8) });
      this.nextSpark = reduceMotion ? 2.5 : rand(0.35, 1.1);
    }
    this.sparks = this.sparks.filter((s) => (s.life += dt) < s.dur);
    for (const s of this.sparks) { const k = s.life / s.dur, a = Math.sin(k * Math.PI); star(c, s.x, s.y, s.size * (0.4 + a * 0.8), s.rot + k * 1.2, a, MOTE); }
    c.globalCompositeOperation = 'source-over';
    if (!reduceMotion) {
      this.nextLeaf -= dt;
      if (this.nextLeaf <= 0 && this.leaves.length < 6) { this.leaves.push(this.leaf()); this.nextLeaf = rand(1.6, 3.6); }
      this.leaves = this.leaves.filter((L) => L.y < AH + 40);
      for (const L of this.leaves) { L.life += dt; L.y += L.vy * dt; L.ph += dt * 1.6; L.rot += L.vr * dt; c.globalAlpha = Math.min(1, L.life * 2) * 0.95; this.drawLeaf(c, L); }
      c.globalAlpha = 1;
    }
  }
};
/* Water glints and dust puffs in the town; the same dust works inside the cabinet. */
export const TownFX = {
  ctx: $('fxTown').getContext('2d'), glints: [], puffs: [], next: 0,
  dust(x, y, n = 26) {
    for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), sp = rand(60, 190); this.puffs.push({ x, y: y + rand(-10, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 - 20, r: rand(16, 34), life: 0, dur: rand(0.7, 1.2) }); }
  },
  update(dt) {
    const c = this.ctx, b = Cam.base(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, SW, SH);
    c.setTransform(b.sx, 0, 0, b.sy, b.tx, b.ty);
    this.next -= dt;
    const W = WATER[G.map] || [];
    if (this.next <= 0 && W.length) { const p = W[(Math.random() * W.length) | 0]; this.glints.push({ x: p[0], y: p[1], life: 0, dur: rand(0.6, 1.2), size: rand(3, 5.5) }); this.next = reduceMotion ? 1.2 : rand(0.05, 0.12); }
    c.globalCompositeOperation = 'lighter';
    this.glints = this.glints.filter((g) => (g.life += dt) < g.dur);
    for (const g of this.glints) { const k = g.life / g.dur, a = Math.sin(k * Math.PI); star(c, g.x, g.y, g.size * (0.5 + a * 0.7), 0.785, a * 0.9, GLINT); }
    c.globalCompositeOperation = 'source-over';
    drawPuffs(c, this.puffs, dt);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
};
export function drawPuffs(c, puffs, dt) {
  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i]; p.life += dt; if (p.life >= p.dur) { puffs.splice(i, 1); continue; }
    const k = p.life / p.dur; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94;
    c.globalAlpha = (1 - k) * 0.75; c.fillStyle = '#f1e6d2'; c.beginPath(); c.arc(p.x, p.y, p.r * (0.6 + k * 0.9), 0, 6.2832); c.fill();
  }
  c.globalAlpha = 1;
}
export const UIFX = {
  ctx: $('fxUI').getContext('2d'), parts: [],
  burst(x, y, n = 80) {
    if (reduceMotion) return;
    const cols = ['#ffd43a', '#5fb8ff', '#8be35c', '#ff7b6b', '#ffffff', '#c59bff'];
    for (let i = 0; i < n; i++) { const a = rand(-Math.PI, 0), sp = rand(380, 900); this.parts.push({ x, y, vx: Math.cos(a) * sp * rand(0.4, 1), vy: Math.sin(a) * sp, w: rand(10, 18), h: rand(6, 11), rot: rand(0, 6), vr: rand(-9, 9), c: cols[i % cols.length], life: 0, dur: rand(1.4, 2.3) }); }
  },
  update(dt) {
    if (!this.parts.length) return;
    const c = this.ctx; c.clearRect(0, 0, SW, SH);
    this.parts = this.parts.filter((p) => (p.life += dt) < p.dur);
    for (const p of this.parts) {
      p.vy += 900 * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = Math.min(1, (p.dur - p.life) * 2); c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.h / 2 * Math.abs(Math.cos(p.rot * 2)), p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 1); c.restore();
    }
    if (!this.parts.length) c.clearRect(0, 0, SW, SH);
  }
};
