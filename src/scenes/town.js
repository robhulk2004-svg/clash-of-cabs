import { AudioSys } from '../audio/audio.js';
import { IMG } from '../core/assets.js';
import { G, state, workplace } from '../core/save.js';
import { $, AH, AW, clamp, esc, lerp, pick, rand, randi } from '../core/utils.js';
import { META } from '../data/sprites.js';
import { STREET_NAMES } from '../data/street-questions.js';
import { NAV_EDGES, NAV_NODES, OFFER_STOPS, PLOTS, PLOT_NAV, ROAD_ENDS, ROAD_LINKS, ROAD_SEGS, SIGN_X, TOWN_CABS, doorOf } from '../data/town-map.js';
import { TownFX } from '../fx/effects.js';
import { Board } from '../game/board.js';
import { Career } from '../game/career.js';
import { Letters } from '../game/letters.js';
import { Session } from '../game/session.js';
import { Hire } from '../game/staff.js';
import { Street } from '../game/street.js';
import { PATIENT_FPS, charWalk, drawCar, drawChar, drawPatient, drawShadow, walkView } from '../render/sprites.js';
import { Scenes } from './scenes.js';
import { toast } from '../ui/helpers.js';
import { Syndic, emblemImg } from '../game/syndicat.js';
import { Incident } from '../game/incident.js';
import { Castle } from './castle.js';
import { ICON } from '../ui/icons.js';
import { blocked } from '../ui/modals.js';

/* ================= Living town: cabinets, patients, named characters, cars ================= */
const CAR_SCALE = 0.34, LANE = 9, WALKERS = 9, BLD_K = 330 / 494, CHAR_TOWN = 0.31;
const PLOT_POLY = { A: [[1118, 118], [1330, 222], [1112, 320], [918, 215]], B: [[1430, 318], [1645, 437], [1425, 540], [1218, 415]], C: [[1135, 532], [1337, 665], [1115, 768], [918, 648]], D: [[675, 574], [882, 707], [660, 810], [462, 655]] };
/* Cabinets standing in town (plot C only once the player has built it). */
const builtPlots = () => ['A', 'B', 'D'].concat(G.cab.level >= 1 ? ['C'] : []);
function cabName(id) { return id === 'C' ? `Cabinet ${G.pseudo || 'à toi'}` : TOWN_CABS[id].name; }
function bldImgKey(id) { return id === 'C' ? 'bld_l' + Math.max(1, G.cab.level) : TOWN_CABS[id].img; }
/* Geometry of the vector buildings (tools/buildings.mjs), converted to town coordinates. */
const FLOOR_H = (n) => 160 + 88 * (n - 1);
export function bldGeo(key, b) {
  const H = (META.bld[key] || [494, 398])[1], k = b.w / 494, P = (x, y) => [b.x + x * k, b.y + y * k];
  const F = P(266, H - 46), LB = P(82, H - 126), RB = P(466, H - 134), BK = P(282, H - 214), fl = Math.round((H - 398) / 88) + 1;
  return { F, LB, RB, BK, k, h: FLOOR_H(fl) * k, top: (p) => p[1] - FLOOR_H(fl) * k };
}
export function bldBox(id, key) {
  const p = PLOTS[id], sz = META.bld[key || bldImgKey(id)] || [494, 398];
  const W = sz[0] * BLD_K, H = sz[1] * BLD_K, left = p.cx - 330 * 0.55, bottom = p.cy + 69;
  return { x: left, y: bottom - H, w: W, h: H, bottom };
}
export const Town = {
  cv: $('townCv'), ctx: $('townCv').getContext('2d'),
  walkers: [], npcs: [], cars: [], nextCar: 1.5, nextWalker: 0, nodes: null, adj: null, pop: {}, offerCar: null, dom: null, t: 0, nextAsk: 6,
  buildGraph() {
    const nodes = {}; for (const k in NAV_NODES) nodes[k] = NAV_NODES[k];
    let edges = NAV_EDGES.slice();
    const plots = builtPlots().concat(G.cab.build && G.cab.level === 0 ? ['C'] : []);
    for (const plot of plots) for (const r of PLOT_NAV[plot].remove) delete nodes[r];
    edges = edges.filter(([a, b]) => nodes[a] && nodes[b]);
    for (const plot of plots) { nodes['door_' + plot] = doorOf(plot); for (const k of PLOT_NAV[plot].door) edges.push(['door_' + plot, k]); }
    const adj = {}; for (const k in nodes) adj[k] = [];
    for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
    this.nodes = nodes; this.adj = adj;
  },
  plainNodes() { return Object.keys(this.nodes).filter((k) => !k.startsWith('door_')); },
  /* Shortest hop path (BFS) from a node (excluded) to a target node (included). */
  path(from, to) {
    if (!this.adj[from] || !this.adj[to]) return null;
    const prev = { [from]: null }, q = [from];
    while (q.length) { const n = q.shift(); if (n === to) break; for (const m of this.adj[n]) if (!(m in prev)) { prev[m] = n; q.push(m); } }
    if (!(to in prev)) return null;
    const out = []; for (let n = to; n !== from; n = prev[n]) out.unshift(n);
    return out;
  },
  nearestNode(x, y) { let best = null, bd = Infinity; for (const k of this.plainNodes()) { const [nx, ny] = this.nodes[k]; const d = Math.hypot(nx - x, ny - y); if (d < bd) { bd = d; best = k; } } return best; },
  reset() {
    this.buildGraph();
    for (const w of this.walkers) if (!this.nodes[w.at] || (w.to && !this.nodes[w.to])) { const k = pick(this.plainNodes()); w.at = k; [w.x, w.y] = this.nodes[k]; w.to = null; w.path = []; w.state = 'idle'; w.idle = 0.3; w.target = null; }
    while (this.walkers.length < WALKERS) this.spawnWalker(true);
    this.renderDom();
  },
  spawnWalker(initial) {
    const n = pick(this.plainNodes()); const [x, y] = this.nodes[n];
    const t = randi(0, 3);
    const w = { t, name: pick(STREET_NAMES[t]), x, y, at: n, prev: null, to: null, path: [], speed: rand(24, 34), anim: rand(0, 2), alpha: initial ? 1 : 0, state: 'idle', idle: rand(0.2, initial ? 3 : 0.6), target: null, flip: Math.random() < 0.5, sheet: 'walk_front', ask: null, id: ++this.wid };
    this.walkers.push(w); return w;
  },
  wid: 0,
  nextHop(w) {
    if (w.path.length) w.to = w.path.shift();
    else {
      const all = this.adj[w.at].filter((k) => !k.startsWith('door_'));
      const opts = all.length > 1 ? all.filter((k) => k !== w.prev) : all;
      if (!opts.length) { w.state = 'idle'; w.idle = 1; return; }
      w.to = pick(opts);
    }
    w.state = 'walk';
  },
  /* A few passers-by walk into the cabinet when a session starts. */
  sendTo(plot, n) {
    if (!this.nodes || !this.nodes['door_' + plot]) return;
    const [dx, dy] = this.nodes['door_' + plot];
    const cands = this.walkers.filter((w) => !w.target && w.ask == null && w.state !== 'enter' && w.alpha > 0.6).sort((a, b) => Math.hypot(a.x - dx, a.y - dy) - Math.hypot(b.x - dx, b.y - dy));
    let sent = 0;
    for (const w of cands) {
      if (sent >= n) break;
      const start = w.state === 'walk' && w.to ? w.to : w.at;
      const p = start === 'door_' + plot ? [] : this.path(start, 'door_' + plot);
      if (!p) continue;
      w.path = p; w.target = plot; sent++;
      if (w.state !== 'walk') this.nextHop(w);
    }
  },

  /* ---------- Named characters ---------- */
  npc(who, opt = {}) {
    const n = Object.assign({ who, x: 0, y: 0, pts: [], speed: 60, t: rand(0, 2), state: 'idle', pose: 'idle', row: 1, flip: false, alpha: 0, fade: 1, bubble: null, onClick: null, onArrive: null, id: ++this.wid }, opt);
    this.npcs.push(n); this.renderDom(); return n;
  },
  /* Walk a character along the town paths, from a node (or point) to a node. */
  walkNpc(n, toNode, then) {
    const from = this.nearestNode(n.x, n.y), p = this.path(from, toNode) || [];
    n.pts = [this.nodes[from], ...p.map((k) => this.nodes[k])].map((q) => q.slice());
    n.state = 'walk'; n.onArrive = then || null;
  },
  removeNpc(n) { this.npcs = this.npcs.filter((x) => x !== n); this.renderDom(); },
  findNpc(who) { return this.npcs.find((n) => n.who === who); },

  /* ---------- Roads ---------- */
  roadRoute(a, b) {
    const prev = { [a]: null }, q = [a];
    while (q.length) { const n = q.shift(); if (n === b) break; for (const [m, seg] of ROAD_LINKS[n]) if (!(m in prev)) { prev[m] = [n, seg]; q.push(m); } }
    const hops = []; for (let n = b; n !== a; n = prev[n][0]) hops.unshift([prev[n][0], n, prev[n][1]]);
    const pts = [];
    for (const [from, , seg] of hops) {
      let p = ROAD_SEGS[seg].slice(); if (!seg.startsWith(from + '-')) p = p.reverse();
      if (pts.length) p = p.slice(1);
      pts.push(...p);
    }
    return pts;
  },
  laneOffset(pts) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      let nx = 0, ny = 0;
      for (const [a, b] of [[i - 1, i], [i, i + 1]]) {
        if (a < 0 || b >= pts.length) continue;
        const dx = pts[b][0] - pts[a][0], dy = pts[b][1] - pts[a][1], l = Math.hypot(dx, dy) || 1;
        nx += -dy / l; ny += dx / l;
      }
      const l = Math.hypot(nx, ny) || 1;
      out.push([pts[i][0] + (nx / l) * LANE, pts[i][1] + (ny / l) * LANE]);
    }
    return out;
  },
  spawnCar(from, to) {
    const pts = this.laneOffset(this.roadRoute(from, to)), cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const vmax = rand(62, 80);
    const car = { col: randi(0, 4), pts, cum, total: cum[cum.length - 1], d: 0, v: vmax, vmax, stopD: null, state: 'drive', offer: null, x: pts[0][0], y: pts[0][1], view: 0, flip: false };
    this.cars.push(car); this.placeCar(car); return car;
  },
  placeCar(car) {
    const { pts, cum } = car; let i = 0;
    while (i < cum.length - 2 && cum[i + 1] < car.d) i++;
    const seg = cum[i + 1] - cum[i] || 1, k = clamp((car.d - cum[i]) / seg, 0, 1);
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
    car.x = pts[i][0] + dx * k; car.y = pts[i][1] + dy * k;
    car.view = dy >= 0 ? 0 : 1; car.flip = dx < 0;
  },
  projectOn(car, p) {
    let best = Infinity, bd = 0;
    for (let i = 0; i < car.pts.length - 1; i++) {
      const [ax, ay] = car.pts[i], [bx, by] = car.pts[i + 1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      const t = clamp(((p[0] - ax) * dx + (p[1] - ay) * dy) / l2, 0, 1), qx = ax + dx * t, qy = ay + dy * t, dd = Math.hypot(p[0] - qx, p[1] - qy);
      if (dd < best) { best = dd; bd = car.cum[i] + Math.sqrt(l2) * t; }
    }
    return bd;
  },
  /* Mathieu arrives by car in front of your cabinet with his contract. */
  spawnOfferCar() {
    if (this.offerCar || G.cab.level < 1) return;
    const st = OFFER_STOPS.C, car = this.spawnCar(st.from, st.to);
    car.offer = true; car.col = 2; car.stopD = this.projectOn(car, st.at); car.d = Math.max(0, car.stopD - 240);
    this.offerCar = car; this.placeCar(car);
  },
  releaseOffer() { const car = this.offerCar; if (!car) return; car.state = 'leaving'; car.stopD = null; car.offer = null; this.offerCar = null; this.updateDom(); },

  /* ---------- Simulation ---------- */
  update(dt) {
    if (!this.nodes) return;
    this.t += dt;
    for (const w of this.walkers) {
      w.anim += dt;
      if (w.state !== 'enter' && w.alpha < 1) w.alpha = Math.min(1, w.alpha + dt * 1.6);
      if (w.ask != null) { w.state = 'idle'; w.idle = 1; w.flip = false; w.sheet = 'walk_front'; continue; }   // waits for you
      if (w.state === 'idle') { w.idle -= dt; if (w.idle <= 0) this.nextHop(w); continue; }
      if (w.state === 'walk') {
        const node = this.nodes[w.to];
        if (!node) { w.to = null; w.state = 'idle'; w.idle = 0.2; continue; }
        const dx = node[0] - w.x, dy = node[1] - w.y, d = Math.hypot(dx, dy), step = w.speed * dt;
        if (d <= step) {
          w.x = node[0]; w.y = node[1]; w.prev = w.at; w.at = w.to; w.to = null;
          if (w.at.startsWith('door_')) { w.state = 'enter'; continue; }
          if (w.path.length) this.nextHop(w);
          else if (Math.random() < 0.35) { w.state = 'idle'; w.idle = rand(0.6, 2.6); }
          else this.nextHop(w);
        } else { w.x += (dx / d) * step; w.y += (dy / d) * step; [w.sheet, w.flip] = walkView(dx, dy); }
        continue;
      }
      if (w.state === 'enter') { w.alpha -= dt * 2.4; w.y -= dt * 10; w.x += dt * 6; if (w.alpha <= 0) w.dead = true; }
    }
    if (this.walkers.some((w) => w.dead)) this.walkers = this.walkers.filter((w) => !w.dead);
    this.nextWalker -= dt;
    if (this.walkers.length < WALKERS && this.nextWalker <= 0) { this.spawnWalker(false); this.nextWalker = rand(1.5, 4); }
    Street.tick(dt);
    for (const n of this.npcs) {
      n.t += dt;
      if (n.fade > 0) n.alpha = Math.min(1, n.alpha + dt * 2); else if (n.fade < 0) { n.alpha -= dt * 2; if (n.alpha <= 0) n.dead = true; }
      if (n.state !== 'walk') continue;
      const tgt = n.pts[0];
      if (!tgt) { n.state = 'idle'; const f = n.onArrive; n.onArrive = null; if (f) f(n); continue; }
      const dx = tgt[0] - n.x, dy = tgt[1] - n.y, d = Math.hypot(dx, dy), step = n.speed * dt;
      if (d <= step) { n.x = tgt[0]; n.y = tgt[1]; n.pts.shift(); }
      else { n.x += (dx / d) * step; n.y += (dy / d) * step; [n.row, n.flip] = charWalk(n.who, dx, dy); }
    }
    if (this.npcs.some((n) => n.dead)) { this.npcs = this.npcs.filter((n) => !n.dead); this.renderDom(); }

    this.nextCar -= dt;
    if (this.nextCar <= 0) {
      if (this.cars.length < 3) { const a = pick(ROAD_ENDS); let b = pick(ROAD_ENDS); while (b === a) b = pick(ROAD_ENDS); this.spawnCar(a, b); }
      this.nextCar = rand(5, 11);
    }
    for (const car of this.cars) {
      if (car.state === 'drive' && car.stopD != null) {
        const rem = car.stopD - car.d;
        if (rem <= 0.5) { car.d = car.stopD; car.v = 0; car.state = 'parked'; AudioSys.horn(); this.updateDom(); }
        else car.v = Math.min(car.vmax, Math.sqrt(2 * 90 * rem) + 4, car.v + 120 * dt);
      } else if (car.state !== 'parked') car.v = Math.min(car.vmax, car.v + 70 * dt);
      if (car.state !== 'parked') car.d += car.v * dt;
      if (car.d >= car.total) car.dead = true; else this.placeCar(car);
    }
    if (this.cars.some((c) => c.dead)) this.cars = this.cars.filter((c) => !c.dead);
    if (G.cab.build && Math.random() < dt * 1.3) { const p = PLOTS.C; TownFX.dust(p.cx + rand(-80, 60), p.cy + rand(0, 40), 6); AudioSys.hammer(); }
    this.draw(dt);
    this.updateDom();
  },
  draw(dt) {
    const c = this.ctx; c.clearRect(0, 0, AW, AH);
    if (G.cab.build && G.cab.level === 0) this.drawSite(c);
    const items = [];
    for (const w of this.walkers) items.push([w.y, 0, w]);
    for (const n of this.npcs) items.push([n.y, 3, n]);
    for (const car of this.cars) items.push([car.y, 1, car]);
    for (const id of builtPlots()) items.push([PLOTS[id].cy + 30, 2, id]);
    if (G.cab.build && G.cab.level === 0) items.push([PLOTS.C.cy + 30, 4, 'C']);
    items.sort((a, b) => a[0] - b[0]);
    for (const [, kind, o] of items) {
      if (kind === 0) {
        const s = 0.28 + 0.05 * (o.y - 200) / 700, moving = o.state === 'walk';
        drawShadow(c, o.x, o.y, 15 * s / 0.27, 5 * s / 0.27, 0.22 * o.alpha);
        drawPatient(c, o.sheet, o.t, moving ? Math.floor(o.anim * PATIENT_FPS.walk) : 0, o.x, o.y, s, o.flip, clamp(o.alpha, 0, 1));
      } else if (kind === 3) {
        const s = CHAR_TOWN * (0.92 + 0.12 * (o.y - 200) / 700);
        drawShadow(c, o.x, o.y, 16, 5.5, 0.22 * o.alpha);
        if (o.state === 'walk') drawChar(c, o.who, 'walk', o.t, o.x, o.y, s, { row: o.row, flip: o.flip, alpha: o.alpha });
        else drawChar(c, o.who, o.pose, o.t, o.x, o.y, s, { alpha: o.alpha, flip: o.poseFlip });
      } else if (kind === 1) {
        const a = clamp(Math.min(o.d / 40, (o.total - o.d) / 40), 0, 1);
        drawShadow(c, o.x, o.y + 2, 30, 11, 0.2 * a);
        drawCar(c, o.col, o.view, o.flip, o.x, o.y, CAR_SCALE, a);
      } else if (kind === 2) this.drawBuilding(c, o, dt);
      else this.drawRising(c);
    }
  },
  drawBuilding(c, id, dt) {
    const key = bldImgKey(id), img = IMG[key]; if (!img) return;
    const b = bldBox(id, key), p = PLOTS[id];
    let k = 1;
    if (this.pop[id] != null) {
      this.pop[id] += dt || 0; const t = this.pop[id] / 0.7;
      k = t >= 1 ? 1 : t < 0.55 ? lerp(0.4, 1.1, t / 0.55) : lerp(1.1, 1, (t - 0.55) / 0.45);
      if (t >= 1) delete this.pop[id];
    }
    const ox = p.cx - 16, oy = b.bottom - 20;
    c.save(); c.translate(ox, oy); c.scale(k, k); c.translate(-ox, -oy);
    c.drawImage(img, b.x, b.y, b.w, b.h);
    if (id === 'C' && !(G.cab.build && G.cab.level >= 1)) this.drawDecor(c, b);
    if (id === 'C' && G.cab.build) this.drawConstruction(c, G.cab.build);
    c.restore();
  },
  /* Roof dressing of your cabinet: flags from level 3, and your syndicat's pennant and banner. */
  drawDecor(c, b) {
    const g = bldGeo('bld_l' + Math.max(1, G.cab.level), b), syn = Syndic.def();
    if (G.cab.level >= 3) for (const [fx, fy, col] of [[g.BK[0] - 30, g.top(g.BK) + 6, '#2a6fd6'], [g.RB[0] - 30, g.top(g.RB) + 4, '#ffd43a']]) this.flag(c, fx, fy, col, null, 44);
    if (syn && Syndic.cosmetic(2)) this.flag(c, g.F[0] + 4, g.top(g.F) + 4, syn.col, syn.col2, 64, Syndic.member());
    if (syn && Syndic.cosmetic(4)) {
      /* banner on the left face + doormat in the syndicat's colours */
      c.save(); c.translate(g.LB[0], g.LB[1]); c.transform(1, 0.4348 * 1, 0, 1, 0, 0);
      const k = b.w / 494; c.fillStyle = syn.col; c.strokeStyle = '#1a1f36'; c.lineWidth = 2;
      c.fillRect(30 * k, -152 * k, 120 * k, 14 * k); c.strokeRect(30 * k, -152 * k, 120 * k, 14 * k);
      c.fillStyle = syn.col2; c.fillRect(30 * k, -146 * k, 120 * k, 3 * k); c.restore();
    }
  },
  flag(c, fx, fy, col, col2, hgt, emblem) {
    c.save(); c.strokeStyle = '#1a1f36'; c.lineWidth = 3; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy - hgt); c.stroke();
    const w = emblem ? 48 : 32, hh = emblem ? 30 : 18, wave = (i) => Math.sin(this.t * 6 + i * 0.7) * 2.5;
    c.beginPath(); c.moveTo(fx, fy - hgt);
    for (let i = 0; i <= 8; i++) c.lineTo(fx + (i * w) / 8, fy - hgt + wave(i));
    for (let i = 8; i >= 0; i--) c.lineTo(fx + (i * w) / 8, fy - hgt + hh + wave(i));
    c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2.4; c.stroke();
    if (col2) { c.strokeStyle = col2; c.lineWidth = 3; c.beginPath(); c.moveTo(fx + 2, fy - hgt + hh - 5 + wave(1)); c.lineTo(fx + w - 2, fy - hgt + hh - 5 + wave(8)); c.stroke(); }
    if (emblem) { const im = emblemImg(emblem); if (im.complete && im.naturalWidth) c.drawImage(im, fx + w / 2 - 12, fy - hgt + 2 + wave(4), 24, 24); }
    c.restore();
  },
  /* First construction: dirt patch and fence around the plot. */
  drawSite(c) {
    const P = PLOT_POLY.C;
    c.save(); c.beginPath(); P.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
    c.fillStyle = 'rgba(196,150,92,.9)'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#7a5226'; c.stroke();
    c.strokeStyle = '#6b4320'; c.lineWidth = 4;
    for (const [a, bb] of [[P[2], P[3]], [P[1], P[2]]]) for (let i = 0; i <= 8; i++) { const x = lerp(a[0], bb[0], i / 8), y = lerp(a[1], bb[1], i / 8); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 18); c.stroke(); }
    c.restore();
  },
  drawRising(c) { const bd = G.cab.build; if (bd) this.drawConstruction(c, bd); },
  /* Construction site: a dashed blueprint of the final building, floors rising one by one behind the scaffolding,
     a tower crane lifting blocks and welding sparks. Used for the first build and every extension. */
  drawConstruction(c, bd) {
    const key = 'bld_l' + bd.to, img = IMG[key]; if (!img) return;
    const b = bldBox('C', key), g = bldGeo(key, b), k = clamp(bd.t / bd.dur, 0, 1);
    const fromH = bd.to > 1 ? FLOOR_H(bd.to - 1) : 0, toH = FLOOR_H(bd.to);
    /* floors snap in one after the other with a little bounce */
    const seg = k;
    const e = (x) => (x < 0.85 ? (x / 0.85) * 1.05 : 1.05 - 0.05 * ((x - 0.85) / 0.15));
    const hNow = lerp(fromH, toH + 30, e(Math.min(1, seg)));
    const topY = g.F[1] - hNow * g.k;
    /* blueprint */
    c.save(); c.setLineDash([10, 8]); c.lineDashOffset = -this.t * 30; c.strokeStyle = 'rgba(80,200,255,.85)'; c.lineWidth = 2.5;
    const H = toH * g.k, up = (p) => [p[0], p[1] - H];
    c.beginPath();
    for (const [p, q] of [[g.LB, g.F], [g.F, g.RB], [up(g.LB), up(g.F)], [up(g.F), up(g.RB)], [up(g.RB), up(g.BK)], [up(g.BK), up(g.LB)], [g.LB, up(g.LB)], [g.F, up(g.F)], [g.RB, up(g.RB)]]) { c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); }
    c.stroke(); c.restore();
    /* the building rises (the new image covers the old one from the ground up to the current height) */
    c.save(); c.beginPath(); c.rect(b.x - 30, topY, b.w + 60, b.bottom - topY + 10); c.clip();
    c.globalAlpha = 0.95; c.drawImage(img, b.x, b.y, b.w, b.h); c.restore();
    /* scaffolding along both faces, up to the current height */
    c.save(); c.strokeStyle = 'rgba(138,90,43,.95)'; c.lineWidth = 3.5;
    const hs = Math.max(20, hNow * g.k);
    for (const [a, z] of [[g.LB, g.F], [g.F, g.RB]]) {
      for (let i = 0; i <= 4; i++) { const p = [lerp(a[0], z[0], i / 4), lerp(a[1], z[1], i / 4) + 6]; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0], p[1] - hs - 10); c.stroke(); }
      c.strokeStyle = 'rgba(201,138,74,.95)'; c.lineWidth = 5;
      for (let y = 30; y < hs + 10; y += 42 * g.k * 1.6) { c.beginPath(); c.moveTo(a[0], a[1] + 6 - y); c.lineTo(z[0], z[1] + 6 - y); c.stroke(); }
      c.strokeStyle = 'rgba(138,90,43,.95)'; c.lineWidth = 3.5;
    }
    c.restore();
    /* tower crane behind the building */
    const cx = g.BK[0] + 40, base = g.BK[1] + 10, top = g.BK[1] - H - 34;
    c.save(); c.lineWidth = 7; c.strokeStyle = '#1a1f36'; c.beginPath(); c.moveTo(cx, base); c.lineTo(cx, top); c.stroke();
    c.lineWidth = 4; c.strokeStyle = '#ffb81f'; c.beginPath(); c.moveTo(cx, base); c.lineTo(cx, top); c.stroke();
    for (let y = base - 14; y > top + 6; y -= 18) { c.beginPath(); c.moveTo(cx - 5, y); c.lineTo(cx + 5, y - 9); c.strokeStyle = '#1a1f36'; c.lineWidth = 1.6; c.stroke(); }
    const sw = Math.sin(this.t * 0.9) * 0.55, len = 170, ax = cx - Math.cos(sw) * len, ay = top + Math.sin(sw) * 26, bx = cx + Math.cos(sw) * 50, by = top - Math.sin(sw) * 8;
    c.lineWidth = 7; c.strokeStyle = '#1a1f36'; c.beginPath(); c.moveTo(bx, by); c.lineTo(ax, ay); c.stroke();
    c.lineWidth = 4; c.strokeStyle = '#ffb81f'; c.beginPath(); c.moveTo(bx, by); c.lineTo(ax, ay); c.stroke();
    c.fillStyle = '#5b6274'; c.fillRect(bx - 8, by - 6, 18, 14);
    const tx = lerp(cx, ax, 0.65 + 0.2 * Math.sin(this.t * 0.6)), ty = lerp(top, ay, 0.65), drop = 50 + 40 * (0.5 + 0.5 * Math.sin(this.t * 1.3));
    c.lineWidth = 2; c.strokeStyle = '#1a1f36'; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx, ty + drop); c.stroke();
    c.fillStyle = '#e7d7c2'; c.strokeStyle = '#5b4a3a'; c.lineWidth = 2; c.fillRect(tx - 12, ty + drop, 24, 16); c.strokeRect(tx - 12, ty + drop, 24, 16);
    c.restore();
    /* welding sparks at the top of the walls */
    if (Math.random() < 0.5) this.sparks.push({ x: lerp(g.LB[0], g.RB[0], Math.random()), y: topY + 30 + Math.random() * 20, vx: rand(-60, 60), vy: rand(-120, -40), life: 0 });
    c.save(); this.sparks = this.sparks.filter((p) => (p.life += 1 / 60) < 0.6);
    for (const p of this.sparks) { p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 260 / 60; c.globalAlpha = 1 - p.life / 0.6; c.fillStyle = p.life < 0.2 ? '#fff6b0' : '#ffb81f'; c.fillRect(p.x, p.y, 3, 3); }
    c.restore();
  },
  sparks: [],

  /* ---------- DOM over the canvas: hit areas, labels, bubbles ---------- */
  renderDom() {
    const wrap = $('townDom'); if (!wrap) return; wrap.innerHTML = '';
    document.querySelectorAll('.plot').forEach((g) => g.classList.toggle('used', builtPlots().includes(g.dataset.plot) || (g.dataset.plot === 'C' && !!G.cab.build)));
    const dom = { cabs: {}, walkers: {}, npcs: {} };
    for (const id of builtPlots()) {
      const b = bldBox(id), p = PLOTS[id];
      const hit = document.createElement('button'); hit.type = 'button'; hit.className = 'bldhit'; hit.setAttribute('aria-label', cabName(id));
      Object.assign(hit.style, { left: b.x + b.w * 0.1 + 'px', top: b.y + b.h * 0.08 + 'px', width: b.w * 0.8 + 'px', height: b.h * 0.86 + 'px' });
      hit.addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); onCabinetClick(id); });
      const label = document.createElement('div'); label.className = 'bld-label'; label.textContent = cabName(id);
      label.style.background = `linear-gradient(${TOWN_CABS[id].tag}, ${TOWN_CABS[id].tag})`;
      Object.assign(label.style, { left: p.cx + 'px', top: p.cy + 76 + 'px' });
      const offer = document.createElement('button'); offer.type = 'button'; offer.className = 'bubble offer'; offer.hidden = true;
      offer.innerHTML = `<span class="b-in">${ICON.board}<span>Offre</span></span>`;
      Object.assign(offer.style, { left: p.cx + 40 + 'px', top: b.y + b.h * 0.18 + 'px' });
      offer.addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); if (id === 'B' && assistDraft()) Career.offerAssist(); else Board.open(id); });
      wrap.append(hit, label, offer);
      dom.cabs[id] = { hit, label, offer };
    }
    /* Maransin is out of town (45 km): a sign at the edge of the map */
    const sign = document.createElement('button'); sign.type = 'button'; sign.className = 'tsign'; sign.hidden = true;
    sign.innerHTML = `<span>Maransin</span><small>45 km</small>`; Object.assign(sign.style, { left: SIGN_X.x + 'px', top: SIGN_X.y + 'px' });
    sign.addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); onCabinetClick('X'); });
    wrap.appendChild(sign); dom.sign = sign;
    /* work widget (session / construction) */
    const work = document.createElement('div'); work.className = 'work'; work.hidden = true;
    work.innerHTML = `<button type="button" class="bubble go"><span class="b-in">${ICON.play}<span>Accueillir</span></span></button>
      <div class="wbar" hidden><span class="wfill"></span><span class="wtxt"></span></div>
      <button type="button" class="bubble coin" hidden><span class="b-in">${ICON.coin}</span></button>`;
    work.querySelector('.go').addEventListener('click', () => { if (blocked()) return; Session.start(); });
    work.querySelector('.coin').addEventListener('click', () => { if (blocked()) return; Session.collect(); });
    wrap.appendChild(work); dom.work = work;
    const site = document.createElement('div'); site.className = 'work site'; site.hidden = true;
    site.innerHTML = `<div class="wbar build"><span class="wfill"></span><span class="wtxt"></span></div>`;
    wrap.appendChild(site); dom.site = site;
    const mail = document.createElement('button'); mail.type = 'button'; mail.className = 'bubble offer'; mail.hidden = true;
    mail.innerHTML = `<span class="b-in">${ICON.envelope}<span>Ordre</span></span>`; Object.assign(mail.style, { left: '660px', top: '120px' });
    mail.addEventListener('click', () => { if (blocked()) return; Letters.openReady(); });
    wrap.appendChild(mail); dom.mail = mail;
    /* incident easter egg: the Ordre summons you */
    const alarm = document.createElement('button'); alarm.type = 'button'; alarm.className = 'bubble npc alarm'; alarm.hidden = true;
    alarm.innerHTML = `<span class="b-in">${ICON.excl}<span>Clique vite sur le château des kinés !</span></span>`; Object.assign(alarm.style, { left: '640px', top: '370px' });
    alarm.addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); Castle.enter(); });
    wrap.appendChild(alarm); dom.alarm = alarm;
    const car = document.createElement('button'); car.type = 'button'; car.className = 'bubble offer'; car.hidden = true;
    car.innerHTML = `<span class="b-in">${ICON.envelope}<span>Mathieu</span></span>`;
    car.addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); Hire.open(); });
    wrap.appendChild(car); dom.car = car;
    this.dom = dom;
    this.updateDom(true);
  },
  /* Bubbles above walkers who want to ask something, and above clickable characters. */
  ensureBubble(map, key, make) { if (!map[key]) { map[key] = make(); $('townDom').appendChild(map[key]); } return map[key]; },
  updateDom(force) {
    const d = this.dom; if (!d) return;
    for (const id in d.cabs) d.cabs[id].offer.hidden = !(Board.offerAt(id) || (id === 'B' && assistDraft())) || workplace() === id;
    d.sign.hidden = !(Board.offerAt('X') || workplace() === 'X');
    if (!d.sign.hidden) d.sign.classList.toggle('hasoffer', !!Board.offerAt('X') && workplace() !== 'X');
    /* session widget above the workplace */
    const wp = workplace(), w = d.work;
    w.hidden = !wp || state.screen !== 'town';
    if (!w.hidden) {
      const pos = wp === 'X' ? { x: SIGN_X.x + 40, y: SIGN_X.y - 30 } : (() => { const b = bldBox(wp); return { x: PLOTS[wp].cx - 10, y: Math.max(b.y + 10, wp === 'C' ? 455 : 150) }; })();
      w.style.left = pos.x + 'px'; w.style.top = pos.y + 'px';
      const st = G.sess.state;
      w.querySelector('.go').hidden = st !== 'idle';
      w.querySelector('.coin').hidden = st !== 'ready';
      const bar = w.querySelector('.wbar'); bar.hidden = st !== 'run';
      if (st === 'run') { bar.querySelector('.wfill').style.width = (Session.progress() * 100).toFixed(1) + '%'; bar.querySelector('.wtxt').textContent = Session.label(); }
    }
    const s = d.site, bd = G.cab.build;
    s.hidden = !bd;
    if (bd) {
      const b = bldBox('C', bd.to === 1 ? 'bld_l1' : bldImgKey('C'));
      s.style.left = PLOTS.C.cx - 10 + 'px'; s.style.top = Math.max(bd.to === 1 ? b.y - 60 : b.y - 40, 420) + 'px';
      s.querySelector('.wfill').style.width = (clamp(bd.t / bd.dur, 0, 1) * 100).toFixed(1) + '%';
      s.querySelector('.wtxt').innerHTML = `${ICON.hammer}<span>${bd.to === 1 ? 'Construction' : 'Niveau ' + bd.to} · ${Math.ceil(Math.max(0, bd.dur - bd.t))} s</span>`;
      if (wp === 'C' && !w.hidden) w.style.top = parseFloat(s.style.top) + 66 + 'px';
    }
    d.mail.hidden = !Letters.ready().length || Incident.pending();
    d.alarm.hidden = !Incident.pending();
    const car = this.offerCar; d.car.hidden = !(car && car.state === 'parked');
    if (!d.car.hidden) Object.assign(d.car.style, { left: car.x + 'px', top: car.y - 44 + 'px' });
    /* walkers with a question */
    const seen = new Set();
    for (const wk of this.walkers) if (wk.ask != null) {
      seen.add(wk.id);
      const el = this.ensureBubble(d.walkers, wk.id, () => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'bubble ask'; b.setAttribute('aria-label', 'Un patient a une question');
        b.innerHTML = `<span class="b-in">${ICON.ask}</span>`; const id = wk.id;
        b.addEventListener('click', () => { if (blocked()) return; const w2 = this.walkers.find((x) => x.id === id); if (w2) Street.open(w2); });
        return b;
      });
      el.style.left = wk.x + 'px'; el.style.top = wk.y - 58 + 'px';
    }
    for (const id in d.walkers) if (!seen.has(+id)) { d.walkers[id].remove(); delete d.walkers[id]; }
    const seenN = new Set();
    for (const n of this.npcs) if (n.bubble && n.alpha > 0.5) {
      seenN.add(n.id);
      const el = this.ensureBubble(d.npcs, n.id, () => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'bubble npc';
        b.innerHTML = `<span class="b-in">${ICON.excl}<span>${esc(n.bubble)}</span></span>`; const id = n.id;
        b.addEventListener('click', () => { if (blocked()) return; const n2 = this.npcs.find((x) => x.id === id); if (n2 && n2.onClick) { AudioSys.tap(); n2.onClick(n2); } });
        return b;
      });
      el.style.left = n.x + 'px'; el.style.top = n.y - 66 + 'px';
    }
    for (const id in d.npcs) if (!seenN.has(+id)) { d.npcs[id].remove(); delete d.npcs[id]; }
  }
};

const assistDraft = () => G.phase === 'rempl' && !G.contract && G.assistOffer && G.assistOffer.state === 'draft';
/* What happens when you touch a cabinet in town. */
function onCabinetClick(id) {
  const wp = workplace();
  if (id === wp) { Scenes.enterCabinet(id); return; }
  if (id === 'C') { toast(G.cab.build ? 'Ton cabinet est en chantier…' : 'Ton cabinet !'); return; }
  if (id === 'B' && assistDraft()) { Career.offerAssist(); return; }
  if (G.phase === 'demarches') { toast(`<b>${esc(TOWN_CABS[id].name)}</b> · ${esc(TOWN_CABS[id].tit)}. Termine d'abord tes démarches pour pouvoir exercer !`); return; }
  Scenes.enterCabinet(id);
}
