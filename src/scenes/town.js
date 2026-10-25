import { AudioSys } from '../audio/audio.js';
import { IMG } from '../core/assets.js';
import { G, state, workplace } from '../core/save.js';
import { $, clamp, esc, lerp, pick, rand, randi } from '../core/utils.js';
import { META } from '../data/sprites.js';
import { STREET_NAMES } from '../data/street-questions.js';
import { CAB_K, TOWN_CABS } from '../data/town-map.js';
import { MAPS, MAP_H, MAP_W } from '../data/worlds.js';
import { TownFX } from '../fx/effects.js';
import { Board } from '../game/board.js';
import { Career } from '../game/career.js';
import { Letters } from '../game/letters.js';
import { Session } from '../game/session.js';
import { Hire } from '../game/staff.js';
import { Street } from '../game/street.js';
import { PATIENT_FPS, charWalk, drawCar, drawChar, drawPatient, drawShadow, walkView } from '../render/sprites.js';
import { Scenes } from './scenes.js';
import { Travel } from './travel.js';
import { toast } from '../ui/helpers.js';
import { ICON } from '../ui/icons.js';
import { blocked } from '../ui/modals.js';

/* ================= Living town: buildings, patients, named characters, cars — on four maps ================= */
const LANE = 8;
const SVGNS = 'http://www.w3.org/2000/svg';
export const curMap = () => MAPS[G.map] || MAPS.main;
/* Cabinets drawn on the current map (the player's one only once it exists or is being built). */
const drawnCabs = () => Object.keys(TOWN_CABS).filter((id) => { const C = TOWN_CABS[id]; if (C.map !== G.map || C.baked) return false; return id !== 'C' || G.cab.level >= 1 || !!G.cab.build; });
const cabsHere = () => Object.keys(TOWN_CABS).filter((id) => TOWN_CABS[id].map === G.map && (id !== 'C' || G.cab.level >= 1 || !!G.cab.build));
export function cabName(id) { return id === 'C' ? `Cabinet ${G.pseudo || 'à toi'}` : TOWN_CABS[id].name; }
export function cabImgKey(id) { if (id === 'C') return 'cab_l' + Math.max(1, G.cab.level); return TOWN_CABS[id].img; }
/* Box of a cabinet on the map (art coordinates). */
export function bldBox(id, key) {
  const C = TOWN_CABS[id];
  if (C.baked) { const xs = C.poly.map((p) => p[0]), ys = C.poly.map((p) => p[1]); const x = Math.min(...xs), y = Math.min(...ys); return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, bottom: Math.max(...ys) }; }
  key = key || cabImgKey(id);
  const m = META.cab[key] || [282, 208, 140, 148];
  const k = CAB_K, x = C.cx - m[2] * k, y = C.cy - m[3] * k;
  return { x, y, w: m[0] * k, h: m[1] * k, bottom: y + m[1] * k };
}
const polyStr = (P) => P.map((p) => p.join(',')).join(' ');
const ARROW_SVG = '<svg viewBox="0 0 100 100"><path d="M16 50 H72 M50 24 L78 50 L50 76" fill="none" stroke="#1a1f36" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 50 H72 M50 24 L78 50 L50 76" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/></svg>';
export const Town = {
  cv: $('townCv'), ctx: $('townCv').getContext('2d'),
  walkers: [], npcs: [], cars: [], nextCar: 1.5, nextWalker: 0, nodes: null, adj: null, pop: {}, offerCar: null, dom: null, t: 0, nextAsk: 6, shown: null,
  /* ---------- the walking graph of the current map (+ one node in front of each door) ---------- */
  buildGraph() {
    const M = curMap(), nodes = {}; for (const k in M.nav.nodes) nodes[k] = M.nav.nodes[k].slice();
    const edges = M.nav.edges.map((e) => e.slice());
    const door = (id, at, link) => { nodes['door_' + id] = at.slice(); for (const k of link) if (nodes[k]) edges.push(['door_' + id, k]); };
    for (const id of cabsHere()) door(id, TOWN_CABS[id].door, TOWN_CABS[id].link);
    for (const id in M.places) { const P = M.places[id]; if (P.link.length) door(id, P.door, P.link); }
    const adj = {}; for (const k in nodes) adj[k] = [];
    for (const [a, b] of edges) { if (adj[a] && adj[b]) { adj[a].push(b); adj[b].push(a); } }
    this.nodes = nodes; this.adj = adj;
  },
  plainNodes() { return Object.keys(this.nodes).filter((k) => !k.startsWith('door_') && this.adj[k].length); },
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
  /* a walking node at some distance from a point (where a character stops to talk to you) */
  nodeNear(x, y, dmin, dmax) {
    const c = this.plainNodes().map((k) => [k, Math.hypot(this.nodes[k][0] - x, this.nodes[k][1] - y)]).filter(([, d]) => d >= dmin && d <= dmax).sort((a, b) => a[1] - b[1]);
    return c.length ? c[0][0] : this.nearestNode(x, y);
  },
  /* Switch to another map: everybody of the previous map disappears. */
  enterMap(id) {
    if (this.shown === id && this.nodes) return;
    this.shown = id; this.walkers = []; this.npcs = []; this.cars = []; this.offerCar = null; this.pop = {}; this.nodes = null;
    TownFX.glints = []; TownFX.puffs = [];
  },
  reset() {
    if (this.shown !== G.map) this.enterMap(G.map);
    this.buildGraph();
    const M = curMap();
    for (const w of this.walkers) if (!this.nodes[w.at] || (w.to && !this.nodes[w.to])) { const k = pick(this.plainNodes()); w.at = k; [w.x, w.y] = this.nodes[k]; w.to = null; w.path = []; w.state = 'idle'; w.idle = 0.3; w.target = null; }
    while (this.walkers.length < M.walkers) this.spawnWalker(true);
    Travel.mapNpcs();
    this.renderDom();
  },
  spawnWalker(initial) {
    const n = pick(this.plainNodes()); const [x, y] = this.nodes[n];
    const t = randi(0, 3);
    const w = { t, name: pick(STREET_NAMES[t]), x, y, at: n, prev: null, to: null, path: [], speed: rand(22, 32), anim: rand(0, 2), alpha: initial ? 1 : 0, state: 'idle', idle: rand(0.2, initial ? 3 : 0.6), target: null, flip: Math.random() < 0.5, sheet: 'walk_front', ask: null, id: ++this.wid, lane: rand(-LANE, LANE) * 1.4, ox: 0, oy: 0, hat: G.map === 'michigan' && Math.random() < 0.8 };
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
  sendTo(id, n) {
    if (!this.nodes || !this.nodes['door_' + id]) return;
    const [dx, dy] = this.nodes['door_' + id];
    const cands = this.walkers.filter((w) => !w.target && w.ask == null && w.state !== 'enter' && w.alpha > 0.6).sort((a, b) => Math.hypot(a.x - dx, a.y - dy) - Math.hypot(b.x - dx, b.y - dy));
    let sent = 0;
    for (const w of cands) {
      if (sent >= n) break;
      const start = w.state === 'walk' && w.to ? w.to : w.at;
      const p = start === 'door_' + id ? [] : this.path(start, 'door_' + id);
      if (!p) continue;
      w.path = p; w.target = id; sent++;
      if (w.state !== 'walk') this.nextHop(w);
    }
  },

  /* ---------- Named characters ---------- */
  npc(who, opt = {}) {
    const n = Object.assign({ who, x: 0, y: 0, pts: [], speed: 55, t: rand(0, 2), state: 'idle', pose: 'idle', row: 1, flip: false, alpha: 0, fade: 1, bubble: null, onClick: null, onArrive: null, id: ++this.wid }, opt);
    this.npcs.push(n); this.renderDom(); return n;
  },
  /* Walk a character along the paths, from where he stands to a node. */
  walkNpc(n, toNode, then) {
    const from = this.nearestNode(n.x, n.y), p = this.path(from, toNode) || [];
    n.pts = [this.nodes[from], ...p.map((k) => this.nodes[k])].map((q) => q.slice());
    n.state = 'walk'; n.onArrive = then || null;
  },
  removeNpc(n) { this.npcs = this.npcs.filter((x) => x !== n); this.renderDom(); },
  findNpc(who) { return this.npcs.find((n) => n.who === who && n.fade >= 0); },
  /* where visitors come from: the edge of the map that is nearest to the target */
  entryNode(target) {
    const M = curMap(), t = this.nodes[target] || [MAP_W / 2, MAP_H / 2];
    const ends = (M.ends || []).filter((k) => this.nodes[k]);
    if (!ends.length) return this.plainNodes()[0];
    return ends.sort((a, b) => Math.hypot(this.nodes[a][0] - t[0], this.nodes[a][1] - t[1]) - Math.hypot(this.nodes[b][0] - t[0], this.nodes[b][1] - t[1]))[0];
  },

  /* ---------- Cars (main map only) ---------- */
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
      out.push([pts[i][0] + (nx / l) * LANE * 1.3, pts[i][1] + (ny / l) * LANE * 1.3]);
    }
    return out;
  },
  spawnCar(route, reverse) {
    const R = route || pick(curMap().routes); if (!R) return null;
    const base = reverse == null ? (Math.random() < 0.5 ? R.slice() : R.slice().reverse()) : reverse ? R.slice().reverse() : R.slice();
    const pts = this.laneOffset(base), cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const vmax = rand(55, 72);
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
    return [bd, best];
  },
  /* A candidate arrives by car in front of your cabinet with his contract. */
  spawnOfferCar() {
    if (this.offerCar || G.cab.level < 1 || G.map !== 'main') return;
    const door = TOWN_CABS.C.door; let best = null;
    for (const R of curMap().routes) for (const rev of [false, true]) {
      const car = this.spawnCar(R, rev); this.cars.pop();
      const [d, dist] = this.projectOn(car, door);
      if (d > 120 && (!best || dist < best.dist)) best = { R, rev, d, dist };
    }
    if (!best) return;
    const car = this.spawnCar(best.R, best.rev);
    car.offer = true; car.col = 2; car.stopD = best.d; car.d = Math.max(0, best.d - 240);
    this.offerCar = car; this.placeCar(car);
  },
  releaseOffer() { const car = this.offerCar; if (!car) return; car.state = 'leaving'; car.stopD = null; car.offer = null; this.offerCar = null; this.updateDom(); },

  /* ---------- Simulation ---------- */
  update(dt) {
    if (!this.nodes) return;
    this.t += dt;
    const M = curMap();
    for (const w of this.walkers) {
      w.anim += dt;
      if (w.state !== 'enter' && w.alpha < 1) w.alpha = Math.min(1, w.alpha + dt * 1.6);
      if (w.ask != null) { w.state = 'idle'; w.idle = 1; w.flip = false; w.sheet = 'walk_front'; continue; }   // waits for you
      if (w.state === 'idle') { w.idle -= dt; if (w.idle <= 0) this.nextHop(w); continue; }
      if (w.state === 'walk') {
        const node = this.nodes[w.to];
        if (!node) { w.to = null; w.state = 'idle'; w.idle = 0.2; continue; }
        const dx = node[0] - w.x, dy = node[1] - w.y, d = Math.hypot(dx, dy), step = w.speed * dt;
        /* walk on one side of the street: a small offset across the direction of walk */
        const l = d || 1, near = w.to.startsWith('door_') ? clamp(d / 40, 0, 1) : 1;
        w.ox = lerp(w.ox, (-dy / l) * w.lane * near, Math.min(1, dt * 3)); w.oy = lerp(w.oy, (dx / l) * w.lane * near, Math.min(1, dt * 3));
        if (d <= step) {
          w.x = node[0]; w.y = node[1]; w.prev = w.at; w.at = w.to; w.to = null;
          if (w.at.startsWith('door_')) { w.state = 'enter'; continue; }
          if (w.path.length) this.nextHop(w);
          else if (Math.random() < 0.3) { w.state = 'idle'; w.idle = rand(0.6, 2.6); }
          else this.nextHop(w);
        } else { w.x += (dx / d) * step; w.y += (dy / d) * step; [w.sheet, w.flip] = walkView(dx, dy); }
        continue;
      }
      if (w.state === 'enter') { w.alpha -= dt * 2.4; w.y -= dt * 8; if (w.alpha <= 0) w.dead = true; }
    }
    if (this.walkers.some((w) => w.dead)) this.walkers = this.walkers.filter((w) => !w.dead);
    this.nextWalker -= dt;
    if (this.walkers.length < M.walkers && this.nextWalker <= 0) { this.spawnWalker(false); this.nextWalker = rand(1.5, 4); }
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

    if (M.routes.length) {
      this.nextCar -= dt;
      if (this.nextCar <= 0) { if (this.cars.length < 4) this.spawnCar(); this.nextCar = rand(4, 9); }
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
    if (G.cab.build && G.map === 'main' && Math.random() < dt * 1.3) { const p = TOWN_CABS.C; TownFX.dust(p.cx + rand(-60, 50), p.cy + rand(0, 30), 5); AudioSys.hammer(); }
    this.draw(dt);
    this.updateDom();
  },
  draw(dt) {
    const c = this.ctx, M = curMap(); c.clearRect(0, 0, MAP_W, MAP_H);
    const items = [];
    for (const w of this.walkers) items.push([w.y + w.oy, 0, w]);
    for (const n of this.npcs) items.push([n.y, 3, n]);
    for (const car of this.cars) items.push([car.y, 1, car]);
    for (const id of drawnCabs()) items.push([TOWN_CABS[id].cy + 40, 2, id]);
    items.sort((a, b) => a[0] - b[0]);
    for (const [, kind, o] of items) {
      if (kind === 0) {
        const s = M.ws * (0.95 + 0.1 * o.y / MAP_H), moving = o.state === 'walk', x = o.x + o.ox, y = o.y + o.oy;
        drawShadow(c, x, y, 15 * s / 0.27, 5 * s / 0.27, 0.22 * o.alpha);
        drawPatient(c, o.sheet, o.t, moving ? Math.floor(o.anim * PATIENT_FPS.walk) : 0, x, y, s, o.flip, clamp(o.alpha, 0, 1));
        if (o.hat) this.drawHat(c, x, y, s, o.alpha, o.sheet === 'walk_side' ? (o.flip ? -1 : 1) : 0);
      } else if (kind === 3) {
        const s = M.cs * (0.95 + 0.1 * o.y / MAP_H) * (o.k || 1);
        drawShadow(c, o.x, o.y, 16 * s / 0.31, 5.5 * s / 0.31, 0.22 * o.alpha);
        if (o.state === 'walk') drawChar(c, o.who, 'walk', o.t, o.x, o.y, s, { row: o.row, flip: o.flip, alpha: o.alpha });
        else drawChar(c, o.who, o.pose, o.t, o.x, o.y, s, { alpha: o.alpha, flip: o.poseFlip });
      } else if (kind === 1) {
        const a = clamp(Math.min(o.d / 40, (o.total - o.d) / 40), 0, 1);
        drawShadow(c, o.x, o.y + 2, 30 * M.car / 0.34, 11 * M.car / 0.34, 0.2 * a);
        drawCar(c, o.col, o.view, o.flip, o.x, o.y, M.car, a);
      } else this.drawBuilding(c, o, dt);
    }
  },
  /* cowboy hats for the passers-by of the Michigan */
  drawHat(c, x, y, s, a, side) {
    const top = y - 192 * s;
    c.save(); c.globalAlpha = clamp(a, 0, 1); c.translate(x + side * 6 * s, top + 8 * s); c.scale(s / 0.25, s / 0.25);
    c.fillStyle = '#6b3d1c'; c.strokeStyle = '#2a1408'; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(0, 0, 22, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-11, 0); c.quadraticCurveTo(-12, -16, -4, -17); c.quadraticCurveTo(0, -12, 4, -17); c.quadraticCurveTo(12, -16, 11, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#c9822f'; c.fillRect(-10, -5, 20, 3);
    c.restore();
  },
  drawBuilding(c, id, dt) {
    const C = TOWN_CABS[id];
    if (id === 'C' && G.cab.build && G.cab.level === 0) { this.drawSite(c); return; }
    const key = cabImgKey(id), img = IMG[key]; if (!img) return;
    const b = bldBox(id, key);
    let k = 1;
    if (this.pop[id] != null) {
      this.pop[id] += dt || 0; const t = this.pop[id] / 0.7;
      k = t >= 1 ? 1 : t < 0.55 ? lerp(0.4, 1.1, t / 0.55) : lerp(1.1, 1, (t - 0.55) / 0.45);
      if (t >= 1) delete this.pop[id];
    }
    const ox = C.cx, oy = C.cy;
    c.save(); c.translate(ox, oy); c.scale(k, k); c.translate(-ox, -oy);
    c.drawImage(img, b.x, b.y, b.w, b.h);
    if (id === 'C' && G.cab.build) this.drawScaffold(c, b, G.cab.build.t / G.cab.build.dur);
    c.restore();
  },
  /* an extension in progress: scaffolding and a crane against the building */
  drawScaffold(c, b, k) {
    c.save(); c.globalAlpha = 0.95; c.strokeStyle = '#8a5a2b'; c.lineWidth = 3;
    const x0 = b.x + b.w * 0.18, x1 = b.x + b.w * 0.92, y0 = b.y + b.h * 0.12, y1 = b.bottom - b.h * 0.18;
    for (let i = 0; i <= 5; i++) { const x = lerp(x0, x1, i / 5); c.beginPath(); c.moveTo(x, y0 + (i / 5) * 18); c.lineTo(x, y1 - (1 - i / 5) * 12); c.stroke(); }
    c.lineWidth = 4; c.strokeStyle = '#c98a4a';
    for (let j = 1; j <= 3; j++) { const y = lerp(y0, y1, j / 4); c.beginPath(); c.moveTo(x0, y + 14); c.lineTo(x1, y - 6); c.stroke(); }
    c.fillStyle = 'rgba(40,110,200,.55)'; c.fillRect(lerp(x0, x1, 0.55), y0 + 20, (x1 - x0) * 0.3, (y1 - y0) * 0.5 * (1 - k * 0.6));
    c.restore();
    this.drawCrane(c, b);
  },
  drawCrane(c, b) {
    const cx = b.x + b.w * 0.95, top = b.y - 50;
    c.save(); c.strokeStyle = '#1a1f36'; c.lineWidth = 6; c.beginPath(); c.moveTo(cx, b.bottom - 25); c.lineTo(cx, top); c.stroke();
    c.strokeStyle = '#ffb81f'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, b.bottom - 25); c.lineTo(cx, top); c.stroke();
    const sw = Math.sin(this.t * 1.4) * 0.25, ax = cx - Math.cos(sw) * 110, ay = top + Math.sin(sw) * 15;
    c.strokeStyle = '#1a1f36'; c.lineWidth = 6; c.beginPath(); c.moveTo(cx + 22, top); c.lineTo(ax, ay); c.stroke();
    c.strokeStyle = '#ffb81f'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx + 22, top); c.lineTo(ax, ay); c.stroke();
    c.strokeStyle = '#1a1f36'; c.lineWidth = 2; c.beginPath(); c.moveTo(ax + 16, ay); c.lineTo(ax + 16, ay + 46 + Math.sin(this.t * 2) * 5); c.stroke();
    c.restore();
  },
  /* The first construction: the site goes through the stages of cabs.png (fence, foundations, scaffolding…). */
  drawSite(c) {
    const build = G.cab.build; if (!build) return;
    const k = clamp(build.t / build.dur, 0, 1), stage = Math.min(5, 1 + Math.floor(k * 5)), key = 'cab_s' + stage, img = IMG[key];
    if (!img) return;
    const m = META.cab[key], C = TOWN_CABS.C, s = CAB_K * 1.02;
    c.drawImage(img, C.cx - m[2] * s, C.cy - m[3] * s, m[0] * s, m[1] * s);
    if (stage >= 2) this.drawCrane(c, { x: C.cx - m[2] * s, y: C.cy - m[3] * s, w: m[0] * s, h: m[1] * s, bottom: C.cy - m[3] * s + m[1] * s });
  },

  /* ---------- DOM over the canvas: hit areas, labels, arrows, bubbles ---------- */
  renderDom() {
    const wrap = $('townDom'); if (!wrap) return; wrap.innerHTML = '';
    const M = curMap(), dom = { cabs: {}, walkers: {}, npcs: {}, arrows: {} };
    /* clickable buildings: polygons over the picture */
    const svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'hits'); svg.setAttribute('viewBox', `0 0 ${MAP_W} ${MAP_H}`);
    const addPoly = (pts, label, go) => {
      const p = document.createElementNS(SVGNS, 'polygon'); p.setAttribute('class', 'hit'); p.setAttribute('points', polyStr(pts)); p.setAttribute('role', 'button'); p.setAttribute('tabindex', '0'); p.setAttribute('aria-label', label);
      const fire = () => { if (blocked()) return; AudioSys.tap(); go(); };
      p.addEventListener('click', fire); p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); } });
      svg.appendChild(p); return p;
    };
    for (const id in M.places) { const P = M.places[id]; addPoly(P.poly, P.label, () => Travel.place(id)); }
    for (const id of cabsHere()) if (TOWN_CABS[id].baked) addPoly(TOWN_CABS[id].poly, cabName(id), () => onCabinetClick(id));
    if (G.map === 'main' && G.cab.level === 0 && !G.cab.build) {
      const C = TOWN_CABS.C; addPoly([[C.cx, C.cy - 68], [C.cx + 118, C.cy], [C.cx, C.cy + 68], [C.cx - 118, C.cy]], 'Terrain libre', () => onPlotClick());
    }
    wrap.appendChild(svg);
    for (const id of cabsHere()) {
      const b = bldBox(id), C = TOWN_CABS[id];
      if (!C.baked) {
        const hit = document.createElement('button'); hit.type = 'button'; hit.className = 'bldhit'; hit.setAttribute('aria-label', cabName(id));
        Object.assign(hit.style, { left: b.x + b.w * 0.1 + 'px', top: b.y + b.h * 0.05 + 'px', width: b.w * 0.8 + 'px', height: b.h * 0.85 + 'px' });
        hit.addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); onCabinetClick(id); });
        wrap.append(hit);
      }
      const label = document.createElement('div'); label.className = 'bld-label'; label.textContent = cabName(id);
      label.style.background = `linear-gradient(${C.tag}, ${C.tag})`;
      Object.assign(label.style, { left: C.cx + 'px', top: (C.baked ? b.bottom : C.cy + 40) + 4 + 'px' });
      const offer = document.createElement('button'); offer.type = 'button'; offer.className = 'bubble offer'; offer.hidden = true;
      offer.innerHTML = `<span class="b-in">${ICON.board}<span>Offre</span></span>`;
      Object.assign(offer.style, { left: C.cx + 34 + 'px', top: (C.top || b.y + b.h * 0.15) + 'px' });
      offer.addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); if (id === 'B' && assistDraft()) Career.offerAssist(); else Board.open(id); });
      wrap.append(label, offer);
      dom.cabs[id] = { label, offer };
    }
    /* roads to the other maps */
    for (const to in M.arrows) {
      const [x, y] = M.arrows[to], a = document.createElement('button'); a.type = 'button'; a.className = 'tarrow'; a.dataset.to = to;
      a.setAttribute('aria-label', `Partir : ${Travel.label(to)}`);
      a.innerHTML = `<span class="ta-ico">${ARROW_SVG}</span><span class="ta-lab">${esc(Travel.label(to))}</span><span class="ta-lock">${ICON.lock}</span>`;
      /* the arrow points out of the map */
      a.style.setProperty('--rot', (Math.atan2(y - MAP_H / 2, x - MAP_W / 2) * 180 / Math.PI).toFixed(0) + 'deg');
      Object.assign(a.style, { left: x + 'px', top: y + 'px' });
      /* the label goes where there is room: above near the bottom edge, beside near the left and right edges */
      a.classList.add(x < 170 ? 'lab-right' : x > MAP_W - 170 ? 'lab-left' : y > MAP_H - 200 ? 'lab-up' : 'lab-down');
      a.addEventListener('click', () => { if (blocked()) return; Travel.go(to); });
      wrap.appendChild(a); dom.arrows[to] = a;
    }
    /* work widget (session / construction) */
    const work = document.createElement('div'); work.className = 'work'; work.hidden = true;
    work.innerHTML = `<button type="button" class="bubble go"><span class="b-in">${ICON.play}<span class="go-txt">Accueillir</span></span></button>
      <div class="wbar" hidden><span class="wfill"></span><span class="wtxt"></span></div>
      <button type="button" class="bubble coin" hidden><span class="b-in">${ICON.coin}</span></button>`;
    /* your cabinet is on another map: the button takes you there */
    work.querySelector('.go').addEventListener('click', () => { if (blocked()) return; const wp = workplace(), C = wp && TOWN_CABS[wp]; if (C && C.map !== G.map) Travel.go(C.map); else Session.start(); });
    work.querySelector('.coin').addEventListener('click', () => { if (blocked()) return; Session.collect(); });
    wrap.appendChild(work); dom.work = work;
    const site = document.createElement('div'); site.className = 'work site'; site.hidden = true;
    site.innerHTML = `<div class="wbar build"><span class="wfill"></span><span class="wtxt"></span></div>`;
    wrap.appendChild(site); dom.site = site;
    const mail = document.createElement('button'); mail.type = 'button'; mail.className = 'bubble offer'; mail.hidden = true;
    mail.innerHTML = `<span class="b-in">${ICON.envelope}<span>Ordre</span></span>`; Object.assign(mail.style, { left: '835px', top: '60px' });
    mail.addEventListener('click', () => { if (blocked()) return; Letters.openReady(); });
    wrap.appendChild(mail); dom.mail = mail;
    const car = document.createElement('button'); car.type = 'button'; car.className = 'bubble offer'; car.hidden = true;
    car.innerHTML = `<span class="b-in">${ICON.envelope}<span class="car-who">Contrat</span></span>`;
    car.addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); Hire.open(); });
    wrap.appendChild(car); dom.car = car;
    this.dom = dom;
    this.updateDom(true);
  },
  /* Bubbles above walkers who want to ask something, and above clickable characters. */
  ensureBubble(map, key, make) { if (!map[key]) { map[key] = make(); $('townDom').appendChild(map[key]); } return map[key]; },
  /* where the work widget of a cabinet stands on this map: above it, or on the road that leads to its map */
  workPos(wp) {
    const C = TOWN_CABS[wp];
    if (C.map === G.map) { const b = bldBox(wp); return { x: C.cx, y: Math.max(40, (C.top || b.y) - 10) }; }
    const M = curMap(), to = C.map === 'main' || !M.arrows[C.map] ? 'main' : C.map, a = M.arrows[to] || M.arrows.main;
    return a ? { x: a[0], y: a[1] + (a[1] > 600 ? -70 : 120) } : null;
  },
  updateDom(force) {
    const d = this.dom; if (!d) return;
    for (const id in d.cabs) d.cabs[id].offer.hidden = !(Board.offerAt(id) || (id === 'B' && assistDraft())) || workplace() === id;
    for (const to in d.arrows) { const ok = Travel.open(to); d.arrows[to].classList.toggle('locked', !ok); d.arrows[to].classList.toggle('work', !!workplace() && TOWN_CABS[workplace()] && TOWN_CABS[workplace()].map === to); }
    /* session widget above the workplace */
    const wp = workplace(), w = d.work;
    const pos = wp ? this.workPos(wp) : null;
    w.hidden = !pos || state.screen !== 'town';
    if (!w.hidden) {
      w.style.left = pos.x + 'px'; w.style.top = pos.y + 'px';
      const st = G.sess.state, away = TOWN_CABS[wp].map !== G.map;
      const go = w.querySelector('.go'); go.hidden = st !== 'idle';
      const label = away ? 'Y aller' : 'Accueillir', gt = go.querySelector('.go-txt'); if (gt.textContent !== label) gt.textContent = label;
      w.querySelector('.coin').hidden = st !== 'ready';
      const bar = w.querySelector('.wbar'); bar.hidden = st !== 'run';
      if (st === 'run') { bar.querySelector('.wfill').style.width = (Session.progress() * 100).toFixed(1) + '%'; bar.querySelector('.wtxt').textContent = Session.label(); }
      w.classList.toggle('away', away);
    }
    const s = d.site, bd = G.cab.build;
    s.hidden = !bd || G.map !== 'main';
    if (!s.hidden) {
      const C = TOWN_CABS.C, b = bldBox('C');
      s.style.left = C.cx + 'px'; s.style.top = Math.max(60, (bd.to === 1 ? C.cy - 110 : b.y - 30)) + 'px';
      s.querySelector('.wfill').style.width = (clamp(bd.t / bd.dur, 0, 1) * 100).toFixed(1) + '%';
      s.querySelector('.wtxt').innerHTML = `${ICON.hammer}<span>${bd.to === 1 ? 'Construction' : 'Niveau ' + bd.to} · ${Math.ceil(Math.max(0, bd.dur - bd.t))} s</span>`;
      if (wp === 'C' && !w.hidden) w.style.top = parseFloat(s.style.top) + 62 + 'px';
    }
    d.mail.hidden = !Letters.ready().length || G.map !== 'main';
    const car = this.offerCar; d.car.hidden = !(car && car.state === 'parked');
    if (!d.car.hidden) { Object.assign(d.car.style, { left: car.x + 'px', top: car.y - 40 + 'px' }); const who = Hire.candidateName(); const el = d.car.querySelector('.car-who'); if (el.textContent !== who) el.textContent = who; }
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
      el.style.left = wk.x + wk.ox + 'px'; el.style.top = wk.y + wk.oy - 220 * curMap().ws - 8 + 'px';
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
      el.style.left = n.x + 'px'; el.style.top = n.y - 230 * curMap().cs * (n.k || 1) - 6 + 'px';
    }
    for (const id in d.npcs) if (!seenN.has(+id)) { d.npcs[id].remove(); delete d.npcs[id]; }
  }
};

const assistDraft = () => G.phase === 'rempl' && !G.contract && G.assistOffer && G.assistOffer.state === 'draft';
/* What happens when you touch a cabinet. */
function onCabinetClick(id) {
  const wp = workplace();
  if (id === wp) { Scenes.enterCabinet(id); return; }
  if (id === 'C') { toast(G.cab.build ? 'Ton cabinet est en chantier…' : 'Ton cabinet !'); return; }
  if (id === 'B' && assistDraft()) { Career.offerAssist(); return; }
  if (G.phase === 'demarches') { toast(`<b>${esc(TOWN_CABS[id].name)}</b> · ${esc(TOWN_CABS[id].tit)}. Termine d'abord tes démarches pour pouvoir exercer !`); return; }
  Scenes.enterCabinet(id);
}
function onPlotClick() {
  toast(Career.canCreate() ? 'Terrain constructible : ouvre la <b>Boutique › Bâtiments</b> pour y créer ton cabinet !' : 'Terrain à vendre… Ton futur cabinet ? Il te faudra un apport et de l’expérience.');
}
