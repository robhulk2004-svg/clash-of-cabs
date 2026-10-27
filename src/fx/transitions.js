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
  /* veh: picture of a vehicle that crosses the sky while the clouds are closed (a trip to another map)
     opt: { title: the destination (a banner), face: 1 if the picture looks to the right, -1 to the left, space: the rocket's starfield,
     onOpen: called as the clouds open (the arrival on the new map starts at once) } */
  async transition(mid, veh, opt = {}) {
    this.cv.classList.add('block');
    if (reduceMotion || (TEST && TEST.fastWait)) {
      const c = this.ctx, k0 = this.cv.width / SW; c.setTransform(k0, 0, 0, k0, 0, 0); c.fillStyle = '#eef5ff'; c.fillRect(0, 0, SW, SH);
      await mid(); await wait(150); c.clearRect(0, 0, SW, SH); this.cv.classList.remove('block');
      if (opt.onOpen) await opt.onOpen();
      return;
    }
    this.build(); AudioSys.whoosh(0.75, true);
    await this.run(760, true);
    const fly = veh || opt.space ? this.fly(veh, opt) : null;
    await mid(); await wait(260);
    if (fly) await fly;
    AudioSys.whoosh(0.95, false);
    const arr = opt.onOpen ? opt.onOpen() : null;
    await this.run(1000, false);
    this.cv.classList.remove('block');
    if (arr) await arr;
  },
  /* the vehicle crosses the screen with speed lines and the name of the destination */
  fly(src, opt = {}) {
    const fx = $('travelFx'), el = $('travelVeh'), f = opt.face === -1 ? -1 : 1;
    fx.classList.toggle('space', !!opt.space); $('travelTitle').textContent = opt.title || ''; fx.hidden = false;
    fx.classList.remove('go'); void fx.offsetWidth; fx.classList.add('go');
    AudioSys.whoosh(1.3, true);
    const jobs = [new Promise((r) => setTimeout(r, opt.space ? 2300 : 1900))];
    if (src) {
      el.src = src; el.hidden = false; el.classList.toggle('rocket', !!opt.space);
      const k = opt.space
        ? [{ transform: 'translate(700px, 1200px) rotate(-20deg) scale(.7)', opacity: 1 }, { transform: 'translate(700px, 300px) rotate(-20deg) scale(1)', opacity: 1, offset: 0.45 }, { transform: 'translate(720px, 180px) rotate(-18deg) scale(1.03)', opacity: 1, offset: 0.62 }, { transform: 'translate(700px, -1100px) rotate(-20deg) scale(1.2)', opacity: 1 }]
        : [{ transform: `translate(-760px, 260px) rotate(-8deg) scale(${f * 0.8}, .8)` }, { transform: `translate(380px, 70px) rotate(4deg) scale(${f * 1.05}, 1.05)`, offset: 0.32 },
          { transform: `translate(760px, 140px) rotate(-3deg) scale(${f * 1.08}, 1.08)`, offset: 0.55 }, { transform: `translate(1180px, 20px) rotate(5deg) scale(${f * 1.1}, 1.1)`, offset: 0.78 }, { transform: `translate(2500px, -160px) rotate(9deg) scale(${f * 1.2}, 1.2)` }];
      const a = el.animate(k, { duration: opt.space ? 2200 : 1750, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' });
      jobs.push(a.finished.then(() => { el.hidden = true; }, () => { el.hidden = true; }));
    }
    return Promise.all(jobs).then(() => { fx.hidden = true; fx.classList.remove('go', 'space'); });
  }
};

/* ================= Quick zoom-and-fade (town ↔ cabinet) ================= */
export const Fade = {
  active: false,
  async transition(mid, zoomFrom) {
    this.active = true;
    const f = $('fade');
    /* zoomFrom: { el, x, y } — the town zooms on that art point (a building) while the screen fades */
    const el = zoomFrom && zoomFrom.el;
    let anim = null;
    if (el && !reduceMotion) {
      const p = el.id === 'townScene' ? Cam.toStage(zoomFrom.x, zoomFrom.y) : { x: zoomFrom.x, y: zoomFrom.y };
      el.style.transformOrigin = `${p.x.toFixed(0)}px ${p.y.toFixed(0)}px`;
      anim = el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.6)' }], { duration: 420, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
    }
    AudioSys.whoosh(0.5, true);
    f.classList.add('on'); await wait(380);
    if (anim) anim.cancel();
    await mid();
    await wait(120);
    f.classList.remove('on'); await wait(330);
    this.active = false;
  }
};
