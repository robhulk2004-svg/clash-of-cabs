import { AudioSys } from '../audio/audio.js';
import { $, SH, SW, TEST, rand, reduceMotion, wait } from '../core/utils.js';
import { Cam } from '../scenes/camera.js';

/* ================= Cloud transition (title ↔ town) ================= */
export const Clouds = {
  cv: $('clouds'), ctx: $('clouds').getContext('2d'), puffs: [], anim: null,
  build() {
    const w = SW, h = SH, R = w * 0.105, puffs = [];
    const shape = [[0, 0, 1], [-0.78, 0.22, 0.72], [0.8, 0.2, 0.74], [-0.36, -0.46, 0.66], [0.42, -0.42, 0.6], [-1.28, 0.42, 0.5], [1.3, 0.4, 0.52], [0, 0.46, 0.8]];
    let row = 0;
    for (let y = -R * 0.3; y <= h + R * 0.9; y += R * 1.05, row++) {
      for (let x = -R * 1.2 + (row % 2) * R * 0.85; x <= w + R * 1.2; x += R * 1.7) {
        const cx = x + rand(-0.25, 0.25) * R, cy = y + rand(-0.2, 0.2) * R, r = R * rand(0.85, 1.15), left = cx < w / 2;
        const off = (left ? cx + r * 2.2 : w - cx + r * 2.2) + rand(0, w * 0.22);
        puffs.push({ x: cx, y: cy, r, circles: shape.map(([dx, dy, s]) => [dx * r * rand(0.9, 1.1), dy * r * rand(0.9, 1.1), s * r * rand(0.9, 1.08)]), sx: left ? -off : off, d: rand(0, 0.26) });
      }
    }
    puffs.sort((a, b) => a.y - b.y); this.puffs = puffs;
  },
  path(c, p, x, y, dy) { c.beginPath(); for (const [ox, oy, rr] of p.circles) { c.moveTo(x + ox + rr, y + oy + dy); c.arc(x + ox, y + oy + dy, rr, 0, 6.2832); } },
  draw(P, closing) {
    const c = this.ctx, k0 = this.cv.width / SW; c.setTransform(k0, 0, 0, k0, 0, 0); c.clearRect(0, 0, SW, SH);
    const base = closing ? Math.max(0, (P - 0.8) / 0.2) : Math.max(0, 1 - P / 0.1);
    if (base > 0) { c.globalAlpha = Math.min(1, base); c.fillStyle = '#eef5ff'; c.fillRect(0, 0, SW, SH); c.globalAlpha = 1; }
    for (const p of this.puffs) {
      let k = Math.min(1, Math.max(0, (P - p.d) / (1 - 0.26)));
      k = closing ? 1 - Math.pow(1 - k, 3) : k * k * k;
      const x = p.x + (closing ? p.sx * (1 - k) : p.sx * k), y = p.y, r = p.r;
      if (x + r * 2 < -10 || x - r * 2 > SW + 10) continue;
      this.path(c, p, x, y, r * 0.2); c.fillStyle = 'rgba(126,160,210,.45)'; c.fill();
      const g = c.createLinearGradient(0, y - r * 1.1, 0, y + r * 1.2); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#f6f9ff'); g.addColorStop(0.82, '#dde9f8'); g.addColorStop(1, '#c6d9f1');
      this.path(c, p, x, y, 0); c.fillStyle = g; c.fill();
    }
  },
  run(dur, closing) { return new Promise((resolve) => { this.anim = { start: performance.now(), dur, closing, resolve }; }); },
  tick(t) {
    const a = this.anim; if (!a) return;
    const P = Math.min(1, (t - a.start) / a.dur); this.draw(P, a.closing);
    if (P >= 1) { this.anim = null; if (!a.closing) this.ctx.clearRect(0, 0, SW, SH); a.resolve(); }
  },
  /* veh: picture of a vehicle that crosses the sky while the clouds are closed (a trip to another map) */
  async transition(mid, veh) {
    this.cv.classList.add('block');
    if (reduceMotion || (TEST && TEST.fastWait)) {
      const c = this.ctx, k0 = this.cv.width / SW; c.setTransform(k0, 0, 0, k0, 0, 0); c.fillStyle = '#eef5ff'; c.fillRect(0, 0, SW, SH);
      await mid(); await wait(150); c.clearRect(0, 0, SW, SH); this.cv.classList.remove('block'); return;
    }
    this.build(); AudioSys.whoosh(0.75, true);
    await this.run(760, true);
    const fly = veh ? this.fly(veh) : null;
    await mid(); await wait(260);
    if (fly) await fly;
    AudioSys.whoosh(0.95, false); await this.run(1000, false);
    this.cv.classList.remove('block');
  },
  fly(src) {
    const el = $('travelVeh'); el.src = src; el.hidden = false; AudioSys.whoosh(1.2, true);
    const a = el.animate([{ transform: 'translate(-700px, 120px) rotate(-4deg)', opacity: 0 }, { transform: 'translate(560px, -20px) rotate(2deg)', opacity: 1, offset: 0.2 }, { transform: 'translate(1180px, 30px) rotate(-2deg)', opacity: 1, offset: 0.8 }, { transform: 'translate(2400px, -80px) rotate(4deg)', opacity: 0 }], { duration: 1500, easing: 'ease-in-out' });
    return a.finished.then(() => { el.hidden = true; }, () => { el.hidden = true; });
  }
};

/* ================= Quick zoom-and-fade (town ↔ cabinet) ================= */
export const Fade = {
  active: false,
  async transition(mid, zoomFrom) {
    this.active = true;
    const f = $('fade');
    const art = zoomFrom && zoomFrom.el;
    if (art && !reduceMotion) {
      /* zoom about the given art point while keeping the base scale and a 0 0 origin */
      const B = art.id === 'townArt' && typeof Cam !== 'undefined' ? Cam.base() : { tx: 0, ty: 0, sx: 1.148325, sy: 1.147715 };
      const sx = B.sx, sy = B.sy, z = 1.6, x = zoomFrom.x, y = zoomFrom.y;
      art.animate([{ transform: `translate(${B.tx}px,${B.ty}px) scale(${sx},${sy})` }, { transform: `translate(${B.tx + sx * (1 - z) * x}px,${B.ty + sy * (1 - z) * y}px) scale(${sx * z},${sy * z})` }], { duration: 420, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
    }
    AudioSys.whoosh(0.5, true);
    f.classList.add('on'); await wait(380);
    if (art) art.getAnimations().forEach((a) => a.cancel());
    await mid();
    await wait(120);
    f.classList.remove('on'); await wait(330);
    this.active = false;
  }
};
