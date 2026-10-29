import { AudioSys } from '../audio/audio.js';
import { IMG, URLS } from '../core/assets.js';
import { G, state, workplace } from '../core/save.js';
import { $, clamp, esc, fmt, lerp, pick, rand, randi } from '../core/utils.js';
import { META } from '../data/sprites.js';
import { NAMES } from '../data/street-questions.js';
import { CAB_K, TOWN_CABS } from '../data/town-map.js';
import { MAPS, MAP_H, MAP_W } from '../data/worlds.js';
import { TownFX } from '../fx/effects.js';
import { Board } from '../game/board.js';
import { Career } from '../game/career.js';
import { Letters } from '../game/letters.js';
import { Mine } from '../game/mine.js';
import { Session } from '../game/session.js';
import { Hire } from '../game/staff.js';
import { Street } from '../game/street.js';
import { PATIENT_FPS, charWalk, dir8, drawCar8, drawChar, drawShadow, drawView8, drawWho, walkView } from '../render/sprites.js';
import { Cam } from './camera.js';
import { Scenes } from './scenes.js';
import { Travel } from './travel.js';
import { CabMenu } from '../ui/cabmenu.js';
import { toast } from '../ui/helpers.js';
import { ICON } from '../ui/icons.js';
import { blocked } from '../ui/modals.js';

/* ================= Living town: buildings, patients, named characters, cars — on five maps =================
   v6: the map picture moves with the camera (CSS transform); the sprites are drawn on two screen-sized canvases with the
   same camera; bubbles, labels and arrows are DOM elements placed in screen pixels, so they keep their size when you zoom. */
const LANE = 6;
const SVGNS = 'http://www.w3.org/2000/svg';
export const curMap = () => MAPS[G.map] || MAPS.main;
/* the small walkers of the other maps: an 8-view picture, a size factor, how high they hop */
const V8 = { cw: ['cowboy', 0.92, 1], m: ['mini', 0.9, 1], al: ['alien', 1, 0.45] };
/* Cabinets drawn on the current map (the player's one only once it exists or is being built). */
const ownShown = () => G.cab.level >= 1 || !!G.cab.build;
const drawnCabs = () => Object.keys(TOWN_CABS).filter((id) => { const C = TOWN_CABS[id]; return C.map === G.map && !C.baked && (id !== 'C' || ownShown()); });
const cabsHere = () => Object.keys(TOWN_CABS).filter((id) => TOWN_CABS[id].map === G.map && (id !== 'C' || ownShown()));
export function cabName(id) { return id === 'C' ? `Cabinet ${G.pseudo || 'à toi'}` : TOWN_CABS[id].name; }
/* the emblem of the Ordre on its tower (also painted in the picture, at a lower definition) */
const SIGNS = { main: [{ key: 'ordre_sign', x: 754.67, y: 376.67, w: 113.33, h: 115.33 }] };
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
const polyStr = (P) => P.map((p) => p.map((v) => +v.toFixed(1)).join(',')).join(' ');
/* where the arrows to the other maps point: out of the map, or up into the sky for the rocket */
const arrowAngle = (to, x, y) => (to === 'moon' || G.map === 'moon' ? -90 : Math.atan2(y - MAP_H / 2, x - MAP_W / 2) * 180 / Math.PI);
export const Town = {
  cv: $('townCv'), ctx: $('townCv').getContext('2d'),
  walkers: [], npcs: [], cars: [], nextCar: 1.5, nextWalker: 0, nodes: null, adj: null, pop: {}, offerCar: null, dom: null, t: 0, shown: null, hover: null, pins: [], gT: '',
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
    this.shown = id; this.walkers = []; this.npcs = []; this.cars = []; this.offerCar = null; this.pop = {}; this.nodes = null; this.hover = null;
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
    const kind = pick(curMap().walkerKinds || ['q0', 'q1', 'q2', 'q3']);
    const w = { kind, name: pick(NAMES[kind] || NAMES.q0), x, y, at: n, prev: null, to: null, path: [], speed: rand(16, 24) * (kind === 'al' ? 0.8 : 1), anim: rand(0, 2), alpha: initial ? 1 : 0,
      state: 'idle', idle: rand(0.2, initial ? 3 : 0.6), target: null, flip: Math.random() < 0.5, sheet: 'walk_front', view: 0, ask: null, id: ++this.wid, lane: rand(-LANE, LANE) * 1.3, ox: 0, oy: 0 };
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
    const cands = this.walkers.filter((w) => !w.target && w.ask == null && w.state !== 'enter' && w.alpha > 0.6 && !V8[w.kind]).sort((a, b) => Math.hypot(a.x - dx, a.y - dy) - Math.hypot(b.x - dx, b.y - dy));
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
    const n = Object.assign({ who, x: 0, y: 0, pts: [], speed: 40, t: rand(0, 2), state: 'idle', pose: 'idle', row: 1, flip: false, alpha: 0, fade: 1, bubble: null, onClick: null, onArrive: null, id: ++this.wid, roam: false, pause: rand(1, 3) }, opt);
    this.npcs.push(n); this.renderDom(); return n;
  },
  /* Walk a character along the paths, from where he stands to a node. */
  walkNpc(n, toNode, then) {
    const from = this.nearestNode(n.x, n.y), p = this.path(from, toNode) || [];
    n.pts = [this.nodes[from], ...p.map((k) => this.nodes[k])].map((q) => q.slice());
    n.state = 'walk'; n.onArrive = then || null;
  },
  /* the characters of the other maps stroll along the paths, and stop now and then */
  roamNpc(n) {
    const here = this.nearestNode(n.x, n.y), cands = this.plainNodes().filter((k) => { const d = Math.hypot(this.nodes[k][0] - n.x, this.nodes[k][1] - n.y); return k !== here && d > 60 && d < 420; });
    if (!cands.length) { n.pause = 3; return; }
    this.walkNpc(n, pick(cands), () => { n.pause = rand(2, 5); n.pose = pick(['idle', 'idle', 'talk', 'think']); });
  },
  /* stop a strolling character (you touched him) */
  holdNpc(n) { if (!n) return; n.pts = []; n.state = 'idle'; n.onArrive = null; n.pause = 6; n.pose = 'talk'; },
  removeNpc(n) { this.npcs = this.npcs.filter((x) => x !== n); this.renderDom(); },
  findNpc(who) { return this.npcs.find((n) => n.who === who && n.fade >= 0); },
  /* where visitors come from: the edge of the map that is nearest to the target */
  entryNode(target) {
    const M = curMap(), t = this.nodes[target] || [MAP_W / 2, MAP_H / 2];
    const ends = (M.ends || []).filter((k) => this.nodes[k]);
    if (!ends.length) return this.plainNodes()[0];
    return ends.sort((a, b) => Math.hypot(this.nodes[a][0] - t[0], this.nodes[a][1] - t[1]) - Math.hypot(this.nodes[b][0] - t[0], this.nodes[b][1] - t[1]))[0];
  },

  /* ---------- Cars (main map only): six colours, eight views ---------- */
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
    const vmax = rand(38, 52);
    const car = { row: randi(0, 5), pts, cum, total: cum[cum.length - 1], d: 0, v: vmax, vmax, stopD: null, state: 'drive', offer: null, x: pts[0][0], y: pts[0][1], view: 0 };
    this.cars.push(car); this.placeCar(car); return car;
  },
  placeCar(car) {
    const { pts, cum } = car; let i = 0;
    while (i < cum.length - 2 && cum[i + 1] < car.d) i++;
    const seg = cum[i + 1] - cum[i] || 1, k = clamp((car.d - cum[i]) / seg, 0, 1);
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
    car.x = pts[i][0] + dx * k; car.y = pts[i][1] + dy * k;
    if (dx || dy) car.view = dir8(dx, dy);
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
      if (d > 90 && (!best || dist < best.dist)) best = { R, rev, d, dist };
    }
    if (!best) return;
    const car = this.spawnCar(best.R, best.rev);
    car.offer = true; car.row = 2; car.stopD = best.d; car.d = Math.max(0, best.d - 170);
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
      if (w.ask != null) { w.state = 'idle'; w.idle = 1; w.flip = false; w.sheet = 'walk_front'; w.view = 0; continue; }   // waits for you
      if (w.state === 'idle') { w.idle -= dt; if (w.idle <= 0) this.nextHop(w); continue; }
      if (w.state === 'walk') {
        const node = this.nodes[w.to];
        if (!node) { w.to = null; w.state = 'idle'; w.idle = 0.2; continue; }
        const dx = node[0] - w.x, dy = node[1] - w.y, d = Math.hypot(dx, dy), step = w.speed * dt;
        /* walk on one side of the street: a small offset across the direction of walk */
        const l = d || 1, near = w.to.startsWith('door_') ? clamp(d / 30, 0, 1) : 1;
        w.ox = lerp(w.ox, (-dy / l) * w.lane * near, Math.min(1, dt * 3)); w.oy = lerp(w.oy, (dx / l) * w.lane * near, Math.min(1, dt * 3));
        if (d <= step) {
          w.x = node[0]; w.y = node[1]; w.prev = w.at; w.at = w.to; w.to = null;
          if (w.at.startsWith('door_')) { w.state = 'enter'; continue; }
          if (w.path.length) this.nextHop(w);
          else if (Math.random() < 0.3) { w.state = 'idle'; w.idle = rand(0.6, 2.6); }
          else this.nextHop(w);
        } else { w.x += (dx / d) * step; w.y += (dy / d) * step; [w.sheet, w.flip] = walkView(dx, dy); w.view = dir8(dx, dy); }
        continue;
      }
      if (w.state === 'enter') { w.alpha -= dt * 2.4; w.y -= dt * 6; if (w.alpha <= 0) w.dead = true; }
    }
    if (this.walkers.some((w) => w.dead)) this.walkers = this.walkers.filter((w) => !w.dead);
    this.nextWalker -= dt;
    if (this.walkers.length < M.walkers && this.nextWalker <= 0) { this.spawnWalker(false); this.nextWalker = rand(1.5, 4); }
    Street.tick(dt);
    for (const n of this.npcs) {
      n.t += dt;
      if (n.fade > 0) n.alpha = Math.min(1, n.alpha + dt * 2); else if (n.fade < 0) { n.alpha -= dt * 2; if (n.alpha <= 0) n.dead = true; }
      if (n.state !== 'walk') { if (n.roam && !n.busy && n.fade >= 0) { n.pause -= dt; if (n.pause <= 0) this.roamNpc(n); } continue; }
      const tgt = n.pts[0];
      if (!tgt) { n.state = 'idle'; const f = n.onArrive; n.onArrive = null; if (f) f(n); continue; }
      const dx = tgt[0] - n.x, dy = tgt[1] - n.y, d = Math.hypot(dx, dy), step = n.speed * dt;
      if (d <= step) { n.x = tgt[0]; n.y = tgt[1]; n.pts.shift(); }
      else { n.x += (dx / d) * step; n.y += (dy / d) * step; [n.row, n.flip] = charWalk(n.who, dx, dy); }
    }
    if (this.npcs.some((n) => n.dead)) { this.npcs = this.npcs.filter((n) => !n.dead); this.renderDom(); }

    if (M.routes.length) {
      this.nextCar -= dt;
      if (this.nextCar <= 0) { if (this.cars.length < 5) this.spawnCar(); this.nextCar = rand(3, 7); }
    }
    for (const car of this.cars) {
      if (car.state === 'drive' && car.stopD != null) {
        const rem = car.stopD - car.d;
        if (rem <= 0.5) { car.d = car.stopD; car.v = 0; car.state = 'parked'; AudioSys.horn(); this.updateDom(); }
        else car.v = Math.min(car.vmax, Math.sqrt(2 * 70 * rem) + 3, car.v + 90 * dt);
      } else if (car.state !== 'parked') car.v = Math.min(car.vmax, car.v + 55 * dt);
      if (car.state !== 'parked') car.d += car.v * dt;
      if (car.d >= car.total) car.dead = true; else this.placeCar(car);
    }
    if (this.cars.some((c) => c.dead)) this.cars = this.cars.filter((c) => !c.dead);
    if (G.cab.build && G.map === 'main' && Math.random() < dt * 1.3) { const p = TOWN_CABS.C; TownFX.dust(p.cx + rand(-40, 34), p.cy + rand(0, 20), 5); AudioSys.hammer(); }
    this.draw(dt);
    this.updateDom();
  },
  draw(dt) {
    const c = this.ctx, M = curMap(), b = Cam.base(), V = Cam.view(120);
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 1920, 1080);
    c.setTransform(b.sx, 0, 0, b.sy, b.tx, b.ty);
    const inView = (x, y) => x > V.x0 && x < V.x1 && y > V.y0 && y < V.y1 + 60;
    const items = [];
    for (const w of this.walkers) if (inView(w.x, w.y)) items.push([w.y + w.oy, 0, w]);
    for (const n of this.npcs) if (inView(n.x, n.y)) items.push([n.y, 3, n]);
    for (const car of this.cars) if (inView(car.x, car.y)) items.push([car.y, 1, car]);
    for (const id of drawnCabs()) items.push([TOWN_CABS[id].cy + 26, 2, id]);
    items.sort((a, b2) => a[0] - b2[0]);
    for (const [, kind, o] of items) {
      if (kind === 0) this.drawWalker(c, o, M);
      else if (kind === 3) {
        const s = M.cs * (0.95 + 0.1 * o.y / MAP_H) * (o.k || 1);
        drawShadow(c, o.x, o.y, 16 * s / 0.31, 5.5 * s / 0.31, 0.22 * o.alpha);
        if (o.state === 'walk') drawChar(c, o.who, 'walk', o.t, o.x, o.y, s, { row: o.row, flip: o.flip, alpha: o.alpha });
        else drawChar(c, o.who, o.pose, o.t, o.x, o.y, s, { alpha: o.alpha, flip: o.poseFlip });
      } else if (kind === 1) {
        const a = clamp(Math.min(o.d / 30, (o.total - o.d) / 30), 0, 1);
        drawShadow(c, o.x, o.y - 2, 20 * M.car / 0.15, 8 * M.car / 0.15, 0.22 * a);
        drawCar8(c, o.row, o.view, o.x, o.y, M.car, a);
      } else this.drawBuilding(c, o, dt);
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
  },
  drawWalker(c, w, M) {
    const s = M.ws * (0.95 + 0.1 * w.y / MAP_H), moving = w.state === 'walk', x = w.x + w.ox, y = w.y + w.oy, a = clamp(w.alpha, 0, 1);
    const v = V8[w.kind];
    if (v) {
      const [key, k, hopK] = v, ph = w.anim * (key === 'alien' ? 6 : 8.5), S = s * k;
      const hop = moving ? Math.abs(Math.sin(ph)) * 26 * S * hopK : 0;
      const sy = key === 'alien' ? 1 + Math.sin(ph * (moving ? 1 : 0.35)) * (moving ? 0.07 : 0.03) : moving ? 1 : 1 + Math.sin(w.anim * 2.2) * 0.012;
      drawShadow(c, x, y, 13 * S / 0.27 * (1 - hop / (90 * S + 1) * 0.2), 4.5 * S / 0.27, 0.22 * a);
      drawView8(c, key, w.view, x, y, S, { hop, tilt: moving && key !== 'alien' ? Math.sin(ph) * 0.07 : 0, alpha: a, sy });
      return;
    }
    drawShadow(c, x, y, 15 * s / 0.27, 5 * s / 0.27, 0.22 * a);
    drawWho(c, w.kind, w.sheet, moving ? Math.floor(w.anim * PATIENT_FPS.walk) : 0, x, y, s, w.flip, a);
  },
  /* height of a walker's head above his feet, in art units (for his bubble) */
  headOf(w) { const M = curMap(), v = V8[w.kind]; return v ? (v[0] === 'alien' ? 150 : 200) * M.ws * v[1] : 190 * M.ws; },
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
    /* touched or hovered: the building glows along its own outline */
    if (this.hover === id) { c.save(); c.shadowColor = 'rgba(255,236,150,1)'; c.shadowBlur = 26 * Cam.base().sx; c.drawImage(img, b.x, b.y, b.w, b.h); c.drawImage(img, b.x, b.y, b.w, b.h); c.restore(); }
    c.drawImage(img, b.x, b.y, b.w, b.h);
    if (id === 'C' && G.cab.build) this.drawScaffold(c, b, G.cab.build.t / G.cab.build.dur);
    c.restore();
  },
  /* an extension in progress: scaffolding and a crane against the building */
  drawScaffold(c, b, k) {
    c.save(); c.globalAlpha = 0.95; c.strokeStyle = '#8a5a2b'; c.lineWidth = 2;
    const x0 = b.x + b.w * 0.18, x1 = b.x + b.w * 0.92, y0 = b.y + b.h * 0.12, y1 = b.bottom - b.h * 0.18;
    for (let i = 0; i <= 5; i++) { const x = lerp(x0, x1, i / 5); c.beginPath(); c.moveTo(x, y0 + (i / 5) * 12); c.lineTo(x, y1 - (1 - i / 5) * 8); c.stroke(); }
    c.lineWidth = 2.6; c.strokeStyle = '#c98a4a';
    for (let j = 1; j <= 3; j++) { const y = lerp(y0, y1, j / 4); c.beginPath(); c.moveTo(x0, y + 10); c.lineTo(x1, y - 4); c.stroke(); }
    c.fillStyle = 'rgba(40,110,200,.55)'; c.fillRect(lerp(x0, x1, 0.55), y0 + 14, (x1 - x0) * 0.3, (y1 - y0) * 0.5 * (1 - k * 0.6));
    c.restore();
    this.drawCrane(c, b);
  },
  drawCrane(c, b) {
    const cx = b.x + b.w * 0.95, top = b.y - 34;
    c.save(); c.strokeStyle = '#1a1f36'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx, b.bottom - 17); c.lineTo(cx, top); c.stroke();
    c.strokeStyle = '#ffb81f'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, b.bottom - 17); c.lineTo(cx, top); c.stroke();
    const sw = Math.sin(this.t * 1.4) * 0.25, ax = cx - Math.cos(sw) * 75, ay = top + Math.sin(sw) * 10;
    c.strokeStyle = '#1a1f36'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx + 15, top); c.lineTo(ax, ay); c.stroke();
    c.strokeStyle = '#ffb81f'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx + 15, top); c.lineTo(ax, ay); c.stroke();
    c.strokeStyle = '#1a1f36'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(ax + 11, ay); c.lineTo(ax + 11, ay + 31 + Math.sin(this.t * 2) * 3); c.stroke();
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

  /* ---------- DOM over the canvases (screen pixels): hit areas, halos, labels, arrows, bubbles ---------- */
  /* pin a DOM element to an art point; dy, dx: offsets in screen pixels */
  pin(el, ax, ay, dy = 0, dx = 0) { el._pin = [ax, ay, dy, dx]; if (!this.pins.includes(el)) this.pins.push(el); return el; },
  layout() {
    const b = Cam.base();
    for (const el of this.pins) {
      const p = el._pin; if (!p || el.hidden) continue;
      const x = Math.round((b.tx + p[0] * b.sx + (p[3] || 0)) * 2) / 2, y = Math.round((b.ty + p[1] * b.sy + p[2]) * 2) / 2;
      if (el._x !== x) { el.style.left = x + 'px'; el._x = x; }
      if (el._y !== y) { el.style.top = y + 'px'; el._y = y; }
    }
    const g = this.dom && this.dom.g, tr = `matrix(${b.sx} 0 0 ${b.sy} ${b.tx.toFixed(2)} ${b.ty.toFixed(2)})`;
    if (g && this.gT !== tr) { g.setAttribute('transform', tr); this.gT = tr; }
  },
  /* the glow of a building (picture cut along its outline), shown when you hover or touch it */
  glow(key, on) {
    const d = this.dom; if (!d) return;
    if (key === 'cab:C') { this.hover = on ? 'C' : this.hover === 'C' ? null : this.hover; return; }
    const h = d.halos[key]; if (h) h.classList.toggle('on', on);
    const l = d.tips[key]; if (l) l.classList.toggle('on', on);
  },
  renderDom() {
    const wrap = $('townDom'); if (!wrap) return; wrap.innerHTML = ''; this.pins = [];
    const halos = $('townHalos'); halos.innerHTML = '';
    const M = curMap(), dom = { cabs: {}, walkers: {}, npcs: {}, arrows: {}, halos: {}, tips: {} };
    /* v6.2: signs drawn in high definition over the picture (they stay sharp when you zoom) */
    for (const S of SIGNS[G.map] || []) {
      const im = document.createElement('img'); im.className = 'hd-sign'; im.alt = ''; im.decoding = 'async'; im.src = URLS[S.key] || `assets/${S.key}.webp`;
      Object.assign(im.style, { left: S.x + 'px', top: S.y + 'px', width: S.w + 'px', height: S.h + 'px' }); halos.appendChild(im);
    }
    /* clickable buildings: polygons over the picture (art coordinates in a group that follows the camera) */
    const svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'hits'); svg.setAttribute('viewBox', '0 0 1920 1080');
    const g = document.createElementNS(SVGNS, 'g'); svg.appendChild(g); dom.g = g; this.gT = '';
    const addHalo = (key, H) => {
      if (!H) return;
      const im = document.createElement('img'); im.className = 'halo'; im.alt = ''; im.decoding = 'async'; im.src = URLS[H[0]] || `assets/${H[0]}.webp`;
      Object.assign(im.style, { left: H[1] + 'px', top: H[2] + 'px', width: H[3] + 'px', height: H[4] + 'px' });
      halos.appendChild(im); dom.halos[key] = im;
    };
    const addPoly = (key, pts, label, go, flat) => {
      const p = document.createElementNS(SVGNS, 'polygon'); p.setAttribute('class', 'hit' + (flat ? ' flat' : '')); p.setAttribute('points', polyStr(pts)); p.setAttribute('role', 'button'); p.setAttribute('tabindex', '0'); p.setAttribute('aria-label', label);
      let tmr = 0;
      const fire = () => { if (blocked()) return; AudioSys.tap(); go(); };
      p.addEventListener('click', fire); p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); } });
      p.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') this.glow(key, true); });
      p.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this.glow(key, false); });
      p.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { this.glow(key, true); clearTimeout(tmr); tmr = setTimeout(() => this.glow(key, false), 700); } });
      p.addEventListener('focus', () => this.glow(key, true)); p.addEventListener('blur', () => this.glow(key, false));
      g.appendChild(p); return p;
    };
    /* the name of a building, shown with its glow */
    const addTip = (key, x, y, text) => {
      const t = document.createElement('div'); t.className = 'bld-tip'; t.textContent = text; wrap.appendChild(t); dom.tips[key] = t; this.pin(t, x, y, -10);
    };
    for (const id in M.places) {
      const P = M.places[id];
      addHalo('pl:' + id, P.halo);
      addPoly('pl:' + id, P.poly, P.label, () => Travel.place(id), !P.halo);
      if (P.halo) addTip('pl:' + id, P.halo[1] + P.halo[3] / 2, P.halo[2] + 8, P.label);
    }
    for (const id of cabsHere()) if (TOWN_CABS[id].baked) { addHalo('cab:' + id, TOWN_CABS[id].halo); addPoly('cab:' + id, TOWN_CABS[id].poly, cabName(id), () => onCabinetClick(id)); }
    if (G.map === 'main' && G.cab.level === 0 && !G.cab.build) {
      const C = TOWN_CABS.C; addPoly('plotC', [[C.cx, C.cy - 46], [C.cx + 81, C.cy], [C.cx, C.cy + 46], [C.cx - 81, C.cy]], 'Terrain libre', () => onPlotClick(), true);
    }
    wrap.appendChild(svg);
    for (const id of cabsHere()) {
      const b = bldBox(id), C = TOWN_CABS[id];
      if (!C.baked) {
        const hit = document.createElement('button'); hit.type = 'button'; hit.className = 'bldhit'; hit.dataset.cab = id; hit.setAttribute('aria-label', cabName(id));
        hit._size = [b.w * 0.8, b.h * 0.85];
        hit.addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); onCabinetClick(id); });
        hit.addEventListener('pointerenter', () => this.glow('cab:C', true)); hit.addEventListener('pointerleave', () => this.glow('cab:C', false));
        hit.addEventListener('focus', () => this.glow('cab:C', true)); hit.addEventListener('blur', () => this.glow('cab:C', false));
        wrap.append(hit); dom.hitC = hit; dom.hitBox = b;
      }
      const label = document.createElement('div'); label.className = 'bld-label'; label.textContent = cabName(id);
      label.style.background = `linear-gradient(${C.tag}, ${C.tag})`;
      this.pin(label, C.cx, b.bottom, C.baked ? 6 : -4);
      const offer = document.createElement('button'); offer.type = 'button'; offer.className = 'bubble offer'; offer.hidden = true;
      offer.innerHTML = `<span class="b-in">${ICON.board}<span>Offre</span></span>`;
      this.pin(offer, C.cx + 20, C.top || b.y + b.h * 0.15);
      offer.addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); onOfferClick(id); });
      wrap.append(label, offer);
      dom.cabs[id] = { label, offer };
    }
    /* roads to the other maps: a golden arrow (fleche.png) that points out of the map, or up to the sky for the rocket */
    for (const to in M.arrows) {
      const [x, y] = M.arrows[to], a = document.createElement('button'); a.type = 'button'; a.className = 'tarrow'; a.dataset.to = to;
      a.setAttribute('aria-label', `Partir : ${Travel.label(to)}`);
      const ang = arrowAngle(to, x, y);
      a.innerHTML = `<span class="ta-rot" style="transform:rotate(${(ang - 90).toFixed(0)}deg)"><img class="ta-img" src="${URLS.fleche || 'assets/fleche.webp'}" alt=""></span><span class="ta-lab">${esc(Travel.label(to))}<span class="ta-lock">${ICON.lock}</span></span>`;
      /* the label goes on the side away from the arrow's tip */
      const r = ang * Math.PI / 180; a.style.setProperty('--lx', (-Math.cos(r) * 78).toFixed(0) + 'px'); a.style.setProperty('--ly', (-Math.sin(r) * 70).toFixed(0) + 'px');
      a.addEventListener('click', () => { if (blocked()) return; Travel.go(to); });
      wrap.appendChild(a); dom.arrows[to] = a; this.pin(a, x, y);
    }
    /* work widget (session / construction) */
    const work = document.createElement('div'); work.className = 'work'; work.hidden = true;
    work.innerHTML = `<button type="button" class="bubble go"><span class="b-in">${ICON.play}<span class="go-txt">Accueillir</span></span></button>
      <div class="wbar" hidden><span class="wfill"></span><span class="wtxt"></span></div>
      <button type="button" class="bubble coin" hidden><span class="b-in">${ICON.coin}</span></button>`;
    /* your cabinet is on another map: the button takes you there */
    work.querySelector('.go').addEventListener('click', () => { if (blocked()) return; const wp = workplace(), C = wp && TOWN_CABS[wp]; if (C && C.map !== G.map) Travel.go(C.map); else Session.start(); });
    work.querySelector('.coin').addEventListener('click', () => { if (blocked()) return; Session.collect(); });
    wrap.appendChild(work); dom.work = work; this.pins.push(work);
    const site = document.createElement('div'); site.className = 'work site'; site.hidden = true;
    site.innerHTML = `<div class="wbar build"><span class="wfill"></span><span class="wtxt"></span></div>`;
    wrap.appendChild(site); dom.site = site;
    /* the redevances of your assistants pile up above your cabinet (like a gold mine) */
    const mine = document.createElement('button'); mine.type = 'button'; mine.className = 'bubble mine'; mine.hidden = true; mine.setAttribute('aria-label', 'Récolter les redevances de tes assistants');
    mine.innerHTML = `<span class="b-in"><span class="mn-coins">${ICON.coin}${ICON.coin}${ICON.coin}</span><span class="mn-txt"></span></span>`;
    mine.addEventListener('click', () => { if (blocked()) return; Mine.collect(mine); });
    wrap.appendChild(mine); dom.mine = mine;
    const mail = document.createElement('button'); mail.type = 'button'; mail.className = 'bubble offer'; mail.hidden = true;
    mail.innerHTML = `<span class="b-in">${ICON.envelope}<span>Ordre</span></span>`;
    mail.addEventListener('click', () => { if (blocked()) return; Letters.openReady(); });
    wrap.appendChild(mail); dom.mail = mail;
    if (M.places.ordre) { const H = M.places.ordre.halo; this.pin(mail, H[1] + H[3] / 2, H[2] + 40); }
    const car = document.createElement('button'); car.type = 'button'; car.className = 'bubble offer'; car.hidden = true;
    car.innerHTML = `<span class="b-in">${ICON.envelope}<span class="car-who">Contrat</span></span>`;
    car.addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); Hire.open(); });
    wrap.appendChild(car); dom.car = car;
    this.dom = dom;
    this.updateDom(true);
  },
  /* Bubbles above walkers who want to ask something, and above clickable characters. */
  ensureBubble(map, key, make) { if (!map[key]) { map[key] = make(); $('townDom').appendChild(map[key]); this.pins.push(map[key]); } return map[key]; },
  /* where the work widget of a cabinet stands on this map: above it, or on the road that leads to its map */
  workPos(wp) {
    const C = TOWN_CABS[wp];
    if (C.map === G.map) { const b = bldBox(wp); return { x: C.cx, y: Math.max(30, (C.top || b.y) - 7) }; }
    const M = curMap(), to = C.map === 'main' || !M.arrows[C.map] ? 'main' : C.map, a = M.arrows[to] || M.arrows.main;
    return a ? { x: a[0], y: a[1] - 48 } : null;
  },
  updateDom(force) {
    const d = this.dom; if (!d) return;
    for (const id in d.cabs) d.cabs[id].offer.hidden = !offerHere(id) || workplace() === id;
    for (const to in d.arrows) { const ok = Travel.open(to); d.arrows[to].classList.toggle('locked', !ok); d.arrows[to].classList.toggle('work', !!workplace() && TOWN_CABS[workplace()] && TOWN_CABS[workplace()].map === to); }
    /* your own cabinet (a picture on its plot): its hit box follows the camera */
    if (d.hitC) { const b = d.hitBox, s = Cam.base(); Object.assign(d.hitC.style, { left: (s.tx + (b.x + b.w * 0.1) * s.sx).toFixed(1) + 'px', top: (s.ty + (b.y + b.h * 0.05) * s.sy).toFixed(1) + 'px', width: (d.hitC._size[0] * s.sx).toFixed(1) + 'px', height: (d.hitC._size[1] * s.sy).toFixed(1) + 'px' }); }
    /* session widget above the workplace */
    const wp = workplace(), w = d.work;
    const pos = wp ? this.workPos(wp) : null;
    w.hidden = !pos || state.screen !== 'town';
    if (!w.hidden) {
      w._pin = [pos.x, pos.y, 0];
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
      this.pin(s, C.cx, bd.to === 1 ? C.cy - 75 : b.y - 20);
      s.querySelector('.wfill').style.width = (clamp(bd.t / bd.dur, 0, 1) * 100).toFixed(1) + '%';
      s.querySelector('.wtxt').innerHTML = `${ICON.hammer}<span>${bd.to === 1 ? 'Construction' : 'Niveau ' + bd.to} · ${Math.ceil(Math.max(0, bd.dur - bd.t))} s</span>`;
      if (wp === 'C' && !w.hidden) w._pin = [pos.x, pos.y, 62];
    }
    /* the mine: redevances of your assistants, above your cabinet */
    const mn = d.mine, show = G.map === 'main' && Mine.ready() && state.screen === 'town';
    if (mn.hidden === show) mn.hidden = !show;
    if (show) {
      const C = TOWN_CABS.C, b = bldBox('C'), lv = Mine.level();
      /* above the « Accueillir » bubble (or the session bar) when both show */
      this.pin(mn, C.cx, (C.top || b.y) + 4, wp === 'C' && !w.hidden ? (w._pin[2] || 0) - 24 - Math.round(w.offsetHeight || 96) : 0);
      const txt = `+${fmt(Mine.amount())} €`, el = mn.querySelector('.mn-txt'); if (el.textContent !== txt) el.textContent = txt;
      if (mn.dataset.lv !== String(lv)) { mn.dataset.lv = lv; mn.classList.remove('grow'); void mn.offsetWidth; mn.classList.add('grow'); }
      mn.classList.toggle('full', Mine.full());
    }
    d.mail.hidden = !Letters.ready().length || G.map !== 'main';
    const car = this.offerCar; d.car.hidden = !(car && car.state === 'parked');
    if (!d.car.hidden) { this.pin(d.car, car.x, car.y - 26); const who = Hire.candidateName(); const el = d.car.querySelector('.car-who'); if (el.textContent !== who) el.textContent = who; }
    /* walkers with a question */
    const seen = new Set();
    for (const wk of this.walkers) if (wk.ask != null) {
      seen.add(wk.id);
      const el = this.ensureBubble(d.walkers, wk.id, () => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'bubble ask'; b.setAttribute('aria-label', 'Un passant a une question');
        b.innerHTML = `<span class="b-in">${ICON.ask}</span>`; const id = wk.id;
        b.addEventListener('click', () => { if (blocked()) return; const w2 = this.walkers.find((x) => x.id === id); if (w2) Street.open(w2); });
        return b;
      });
      el._pin = [wk.x + wk.ox, wk.y + wk.oy - this.headOf(wk), -6];
    }
    for (const id in d.walkers) if (!seen.has(+id)) { this.unpin(d.walkers[id]); delete d.walkers[id]; }
    const seenN = new Set();
    for (const n of this.npcs) if (n.bubble && n.alpha > 0.5) {
      seenN.add(n.id);
      const el = this.ensureBubble(d.npcs, n.id, () => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'bubble npc';
        b.innerHTML = `<span class="b-in">${ICON.excl}<span class="npc-txt"></span></span>`; const id = n.id;
        b.addEventListener('click', () => { if (blocked()) return; const n2 = this.npcs.find((x) => x.id === id); if (n2 && n2.onClick) { AudioSys.tap(); n2.onClick(n2); } });
        return b;
      });
      const t = el.querySelector('.npc-txt'); if (t.textContent !== n.bubble) t.textContent = n.bubble;
      el._pin = [n.x, n.y - 215 * curMap().cs * (n.k || 1), -4];
    }
    for (const id in d.npcs) if (!seenN.has(+id)) { this.unpin(d.npcs[id]); delete d.npcs[id]; }
    this.layout();
  },
  unpin(el) { el.remove(); this.pins = this.pins.filter((x) => x !== el); },
  /* the screen rectangle of a place or a cabinet (for the tutorial arrow) */
  rectOf(key) {
    const d = this.dom; if (!d) return null;
    const H = key.startsWith('cab:') ? (TOWN_CABS[key.slice(4)] || {}).halo : (curMap().places[key.slice(3)] || {}).halo;
    if (!H) return null;
    const a = Cam.toStage(H[1], H[2]), b = Cam.toStage(H[1] + H[3], H[2] + H[4]);
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
  },
  /* the tutorial makes a building pulse */
  nudge(key) { const d = this.dom; if (!d) return; for (const k in d.halos) d.halos[k].classList.toggle('nudge', k === key); }
};

/* an offer is waiting at this cabinet: a remplacement on the board, the assistanat at Mathieu's, a mission (Chad, Suzie) */
function offerHere(id) {
  if (Board.offerAt(id)) return true;
  if (id === 'R' && Career.assistDraft()) return true;
  return Career.missionAt(id);
}
function onOfferClick(id) {
  if (id === 'R' && Career.assistDraft()) { Career.offerAssist(); return; }
  if (Career.missionAt(id)) { Career.missionOffer(id); return; }
  Board.open(id);
}
/* What happens when you touch a cabinet. */
function onCabinetClick(id) {
  const wp = workplace();
  /* v6.1: your own cabinet opens its menu (go in, upgrade it, finish its works) */
  if (id === 'C' && (G.cab.level >= 1 || G.cab.build)) { CabMenu.show(); return; }
  if (id === wp) { Scenes.enterCabinet(id); return; }
  if (id === 'R' && Career.assistDraft()) { Career.offerAssist(); return; }
  if (Career.missionAt(id)) { Career.missionOffer(id); return; }
  if (G.phase === 'demarches') { toast(`<b>${esc(TOWN_CABS[id].name)}</b> · ${esc(TOWN_CABS[id].tit)}. Termine d'abord tes démarches pour pouvoir exercer !`); return; }
  Scenes.enterCabinet(id);
}
function onPlotClick() {
  toast(Career.canCreate() ? 'Terrain constructible : ouvre la <b>Boutique › Bâtiments</b> pour y créer ton cabinet !' : 'Terrain à vendre… Ton futur cabinet ? Il te faudra un apport et de l’expérience.');
}
