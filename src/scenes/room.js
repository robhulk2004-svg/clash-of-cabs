import { Fraude } from '../game/fraude.js';
import { AudioSys } from '../audio/audio.js';
import { IMG, URLS } from '../core/assets.js';
import { G, gx, state, workplace } from '../core/save.js';
import { $, AH, AW, KX, KY, clamp, esc, frSpace, lerp, pick, rand, randi } from '../core/utils.js';
import { ECO } from '../data/economy.js';
import { LAYOUTS, ROOM, STATIONS, useLayout } from '../data/room.js';
import { ITEMS } from '../data/shop-items.js';
import { META } from '../data/sprites.js';
import { TOWN_CABS } from '../data/town-map.js';
import { drawPuffs } from '../fx/effects.js';
import { Board } from '../game/board.js';
import { Day } from '../game/day.js';
import { Session, assistPostes } from '../game/session.js';
import { staffList, staffName } from '../game/staff.js';
import { PATIENT_FPS, charSheets, charWalk, depthK, drawChar, drawEq, drawShadow, drawWho, exFrames, pingPong, walkView } from '../render/sprites.js';
import { Confrere } from '../story/confreres.js';
import { Talk } from '../story/talk.js';
import { toast } from '../ui/helpers.js';
import { ICON } from '../ui/icons.js';
import { blocked } from '../ui/modals.js';
import { Shop } from '../ui/shop.js';

/* ================= Inside a cabinet: equipment, patients, the kinés (small sprites) =================
   v6: you treat your own patients on up to 3 postes; the kinés who work with you (the titulaire of the cabinet,
   your assistants) treat theirs on the other postes: you see them working, there is nothing to do. */
const KINE_S = 0.95;
const KINDS = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'p2'];   // q8 (the bodybuilder) only strolls in the streets
export const Room = {
  cv: $('roomCv'), ctx: $('roomCv').getContext('2d'),
  cab: null, people: [], puffs: [], t: 0, flash: {}, visitor: null, host: null,
  /* Equipment of a cabinet: fixed for the confrères, bought by you in your own cabinet. */
  owns(id, cab = this.cab) {
    if (cab === 'C') return !!G.owned[id];
    if (LAYOUTS[cab]) return false;          // v6.1: its furniture is drawn in the picture of the cabinet
    const C = TOWN_CABS[cab]; return !!(C && C.eq && C.eq.includes(id));
  },
  stations(cab = this.cab) { return LAYOUTS[cab] ? LAYOUTS[cab].stations : STATIONS.filter((s) => !s.item || this.owns(s.item, cab)); },
  /* the titulaire of a confrère's cabinet, when he works there (your visit, your assistanat, your mission) */
  hostOf(cab = this.cab) {
    const C = TOWN_CABS[cab]; if (!C || !C.who || cab === 'C') return null;
    if (this.visitMode(cab)) return C.who;
    if (cab === 'R' && G.phase === 'assist' && workplace() === 'R') return C.who;
    if (G.mission && G.mission.cab === cab && workplace() === cab) return C.who;
    return null;
  },
  /* Kinés working in this cabinet now. */
  kines(cab = this.cab) {
    const out = [];
    if (workplace() === cab) out.push('player');
    const h = this.hostOf(cab); if (h) out.push(h);
    if (cab === 'C') for (const s of staffList()) out.push(s.who);
    return out;
  },
  /* where each kiné stands: you, the titulaire of the cabinet, then your assistants */
  kinePos(who) {
    if (who === 'player') return ROOM.kine.player;
    const i = staffList().findIndex((s) => s.who === who);
    if (i < 0 || this.cab !== 'C') return ROOM.kine.host;
    return ROOM.staff[i % ROOM.staff.length];
  },
  /* the pictures a cabinet needs (most of them load in the background) */
  sheetsFor(cab) {
    const k = new Set(['p_walk_side', 'p_walk_front', 'p_walk_back', 'p_squat', 'p_plank', 'p_pushup', 'p_march', 'p_squat_march',
      'q_walk_side', 'q_walk_front', 'q_walk_back', 'q_squat', 'q_plank', 'q_lunge', 'q_pushup', 'q_crunch', 'table_premium', (LAYOUTS[cab] || ROOM).bg || 'cab_in']);
    for (const id in ROOM.eq) k.add('eq_' + id);
    const C = TOWN_CABS[cab];
    for (const w of [...this.kines(cab), 'player', ...(C && C.who ? [C.who] : [])]) for (const s of charSheets(w)) k.add(s);
    return [...k];
  },
  /* You pop in at a confrère's: he is working with his own patients. */
  visitMode(cab = this.cab) { return !!cab && cab !== 'C' && workplace() !== cab && !!(TOWN_CABS[cab] && TOWN_CABS[cab].who) && !(G.phase === 'rempl' && G.contract && G.contract.cab === cab); },
  /* your own postes, then those of the kinés who work with you */
  mine(cab = this.cab) { return workplace() === cab ? Math.min(ECO.perKine, this.stations(cab).length) : 0; },
  capacity(cab = this.cab) { return Math.min(this.stations(cab).length, this.kines(cab).length * ECO.perKine); },
  /* the postes of the others: the host (3 at most), your assistants (the postes you can give them) */
  decorStations(cab = this.cab) {
    const st = this.stations(cab), from = this.mine(cab);
    let n = 0;
    if (this.hostOf(cab)) n += ECO.perKine;
    if (cab === 'C') staffList().forEach((s, i) => { n += assistPostes(i); });
    return st.slice(from, Math.min(st.length, from + n));
  },
  queuers() { return this.people.filter((p) => p.role === 'queue'); },
  enter(cab) {
    this.cab = cab; this.people = []; this.visitor = null; this.host = null;
    const L = useLayout(cab), bg = $('cabBg'), src = URLS[L.bg] || `assets/${L.bg}.webp`; if (bg.getAttribute('src') !== src) bg.src = src;
    const h = this.hostOf(cab);
    if (h) { const at = ROOM.kine.host.slice(); this.host = { who: h, x: at[0], y: at[1], home: at, pts: [], t: 0, pause: 2, row: 0, flip: false, pose: 'coach' }; }
    this.placeDecor(true);
    if (G.sess.day && G.sess.where === cab) Day.syncRoom(true);
    this.renderSlots(); this.renderTeam(); this.syncUi();
  },
  person(x, y, role, alpha) {
    return { kind: pick(KINDS), x, y, role, state: 'idle', path: [], alpha, fade: 0, anim: rand(0, 2), sheet: 'walk_side', flip: false, speed: 135, station: null, then: null };
  },
  /* which exercise a patient does at a station (the new patients lunge instead of marching, and some do crunches) */
  exFor(kind, s) { return kind && kind[0] === 'q' && s.ex === 'plank' && Math.random() < 0.5 ? 'crunch' : s.ex; },
  /* the patients of the other kinés, busy at their postes */
  placeDecor(instant) {
    this.people = this.people.filter((p) => p.role !== 'decor');
    for (const s of this.decorStations()) {
      const p = this.person(s.at[0], s.at[1], 'decor', instant ? 1 : 0); p.fade = instant ? 0 : 1;
      p.station = s; p.state = 'exercise'; p.sheet = this.exFor(p.kind, s); p.anim = rand(0, 1);
      this.people.push(p);
    }
  },
  endSession() { this.syncUi(); },
  walk(p, pts, then) { p.path = pts.map((q) => q.slice()); p.state = 'walk'; p.then = then || null; },
  headOf(p) { const s = 0.9 * depthK(p.y); return { x: p.x * KX, y: (p.y - 170 * s) * KY }; },
  dust(x, y) { for (let i = 0; i < 22; i++) { const a = rand(0, Math.PI * 2), sp = rand(60, 170); this.puffs.push({ x, y: y + rand(-8, 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 - 20, r: rand(14, 28), life: 0, dur: rand(0.6, 1.1) }); } },
  newItem(id) {
    this.flash[id] = 0; const pos = ROOM.eq[id];
    if (pos) this.dust(pos[0], pos[1]); else if (id === 'table') this.dust(1270, 520);
    if (ITEMS[id] && ITEMS[id].kind === 'station') this.placeDecor(false);
    this.renderSlots(); this.syncUi();
  },
  /* The titulaire walks from one patient to the next and coaches them. */
  wander(h, dt) {
    h.t += dt;
    const tgt = h.pts[0];
    if (!tgt) {
      h.pause -= dt;
      if (h.pause <= 0 && !Talk.active) {
        const busy = this.people.filter((p) => p.state === 'exercise' && p.station && p.role === 'decor');
        const go = Math.random() < 0.25 || !busy.length ? h.home : (() => { const p = busy[randi(0, busy.length - 1)]; return [p.station.at[0] + 70, p.station.at[1] + 34]; })();
        h.pts = [go.slice()]; h.pause = rand(2.5, 4.5);
      }
      return;
    }
    const dx = tgt[0] - h.x, dy = tgt[1] - h.y, d = Math.hypot(dx, dy), st = 120 * dt;
    if (d <= st) { h.x = tgt[0]; h.y = tgt[1]; h.pts.shift(); h.pose = ['coach', 'talk', 'think'][randi(0, 2)]; h.faceL = true; }
    else { h.x += (dx / d) * st; h.y += (dy / d) * st; [h.row, h.flip] = charWalk(h.who, dx, dy); }
  },
  /* A visitor (Marvin, the goblin…) walks in from the door. */
  visit(who, pose) {
    return new Promise((resolve) => {
      const [x, y] = ROOM.doorOut;
      this.visitor = { who, x, y, pts: [ROOM.doorIn.slice(), ROOM.visit.slice()], t: 0, state: 'walk', row: 1, flip: false, pose: pose || 'idle', alpha: 0, done: resolve };
      AudioSys.bell();
    });
  },
  leaveVisitor() { const v = this.visitor; if (!v) return; v.pts = [ROOM.doorIn.slice(), ROOM.doorOut.slice()]; v.state = 'walk'; v.leaving = true; v.done = null; },

  update(dt) {
    this.t += dt;
    if (G.sess.day && G.sess.where === this.cab) Day.syncRoom(false);
    if (this.host) this.wander(this.host, dt);
    for (const p of this.people) {
      p.anim += dt;
      if (p.fade > 0) { p.alpha = Math.min(1, p.alpha + dt * 2.2); if (p.alpha >= 1) p.fade = 0; }
      if (p.state === 'walk') {
        const tgt = p.path[0];
        if (!tgt) { p.state = 'idle'; const f = p.then; p.then = null; if (f) f(); continue; }
        const dx = tgt[0] - p.x, dy = tgt[1] - p.y, d = Math.hypot(dx, dy), step = p.speed * dt;
        if (d <= step) { p.x = tgt[0]; p.y = tgt[1]; p.path.shift(); if (!p.path.length) { p.state = 'idle'; const f = p.then; p.then = null; if (f) f(); } }
        else { p.x += (dx / d) * step; p.y += (dy / d) * step; [p.sheet, p.flip] = walkView(dx, dy); }
        if (p.role === 'leave') { const dd = Math.hypot(p.x - ROOM.doorOut[0], p.y - ROOM.doorOut[1]); if (dd < 90) p.alpha = Math.min(p.alpha, dd / 90); }
      }
    }
    if (this.people.some((p) => p.dead)) this.people = this.people.filter((p) => !p.dead);
    const v = this.visitor;
    if (v) {
      v.t += dt; v.alpha = v.leaving ? v.alpha : Math.min(1, v.alpha + dt * 2.5);
      if (v.state === 'walk') {
        const tgt = v.pts[0];
        if (!tgt) { v.state = 'pose'; if (v.leaving) this.visitor = null; else if (v.done) { const f = v.done; v.done = null; f(); } }
        else {
          const dx = tgt[0] - v.x, dy = tgt[1] - v.y, d = Math.hypot(dx, dy), step = 150 * dt;
          if (d <= step) { v.x = tgt[0]; v.y = tgt[1]; v.pts.shift(); } else { v.x += (dx / d) * step; v.y += (dy / d) * step; [v.row, v.flip] = charWalk(v.who, dx, dy); }
          if (v.leaving) { const dd = Math.hypot(v.x - ROOM.doorOut[0], v.y - ROOM.doorOut[1]); if (dd < 90) v.alpha = Math.min(v.alpha, dd / 90); }
        }
      }
    }
    for (const k in this.flash) { this.flash[k] += dt; if (this.flash[k] > 0.8) delete this.flash[k]; }
    this.draw(dt);
    this.updateUi();
  },
  draw(dt) {
    const c = this.ctx; c.clearRect(0, 0, AW, AH);
    if (this.owns('table') && IMG.table_premium) { const tp = META.tablePremium; c.drawImage(IMG.table_premium, tp.x, tp.y, tp.w, tp.h); }
    const items = [];
    for (const id in ROOM.eq) if (this.owns(id)) items.push([ROOM.eq[id][1], 'eq', id]);
    for (const p of this.people) {
      let key = p.y;
      if (p.state === 'exercise' && p.station && p.station.item) key = Math.max(key, ROOM.eq[p.station.item][1] + 1);
      items.push([key, 'p', p]);
    }
    for (const k of this.kines()) if (!(this.host && this.host.who === k)) items.push([this.kinePos(k)[1], 'k', k]);
    if (this.host) items.push([this.host.y, 'h', this.host]);
    if (this.visitMode()) items.push([ROOM.visit[1] + 40, 'g', null]);
    if (this.visitor) items.push([this.visitor.y, 'v', this.visitor]);
    items.sort((a, b) => a[0] - b[0]);
    const dayHere = !!G.sess.day && G.sess.where === this.cab;
    for (const it of items) {
      if (it[1] === 'eq') {
        const id = it[2], [x, y] = ROOM.eq[id], f = this.flash[id];
        const k = f == null ? 1 : f < 0.35 ? lerp(0.3, 1.12, f / 0.35) : lerp(1.12, 1, Math.min(1, (f - 0.35) / 0.45));
        drawEq(c, id, x, y, k, 1);
      } else if (it[1] === 'p') this.drawPerson(c, it[2]);
      else if (it[1] === 'k') this.drawKine(c, it[2]);
      else if (it[1] === 'h') { const h = it[2], s = KINE_S * depthK(h.y); drawShadow(c, h.x, h.y, 42 * s, 13 * s, 0.24); if (h.pts.length) drawChar(c, h.who, 'walk', h.t, h.x, h.y, s, { row: h.row, flip: h.flip }); else drawChar(c, h.who, h.pose, h.t, h.x, h.y, s, { fps: 0.8, flip: h.faceL }); }
      else if (it[1] === 'g') { const [gx, gy] = [ROOM.visit[0] + 40, ROOM.visit[1] + 40], s = KINE_S * depthK(gy); drawShadow(c, gx, gy, 42 * s, 13 * s, 0.24); drawChar(c, 'player', 'idle', this.t, gx, gy, s, { fps: 0.7 }); }
      else { const v = it[2], s = KINE_S * depthK(v.y); drawShadow(c, v.x, v.y, 40 * s, 12 * s, 0.22 * v.alpha); if (v.state === 'walk') drawChar(c, v.who, 'walk', v.t, v.x, v.y, s, { row: v.row, flip: v.flip, alpha: v.alpha }); else drawChar(c, v.who, v.pose, v.t, v.x, v.y, s, { alpha: v.alpha, flip: true }); }
    }
    drawPuffs(c, this.puffs, dt || 0);
    /* the progress of your séances */
    if (dayHere && G.sess.state === 'run') {
      for (const p of this.people) if (p.role === 'session' && p.state === 'exercise' && !p.done) {
        const prog = clamp(p.prog || 0, 0, 1), s = 0.9 * depthK(p.y), hx = p.x, hy = p.y - 186 * s - 22;
        c.save(); c.lineWidth = 8; c.lineCap = 'round'; c.strokeStyle = 'rgba(11,20,42,.55)'; c.beginPath(); c.arc(hx, hy, 18, 0, 6.2832); c.stroke();
        c.strokeStyle = '#8be35c'; c.beginPath(); c.arc(hx, hy, 18, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); c.stroke(); c.restore();
      }
    }
  },
  drawPerson(c, p) {
    const s = 0.9 * depthK(p.y);
    if (p.state === 'exercise') {
      const fps = PATIENT_FPS[p.sheet] || 4;
      drawShadow(c, p.x, p.y, 34 * s, 11 * s, 0.2 * p.alpha);
      drawWho(c, p.kind, p.sheet, pingPong(p.anim, fps, exFrames(p.kind, p.sheet)), p.x, p.y, s, p.flip, p.alpha);
      return;
    }
    const moving = p.state === 'walk';
    drawShadow(c, p.x, p.y, 30 * s, 10 * s, 0.2 * p.alpha);
    drawWho(c, p.kind, p.sheet, moving ? Math.floor(p.anim * PATIENT_FPS.walk) : 0, p.x, p.y, s, p.flip, p.alpha);
  },
  drawKine(c, who) {
    const [x, y] = this.kinePos(who), s = KINE_S * depthK(y), t = this.t + ({ ambroise: 1.3, clement: 2.1, gabriel: 0.7, mathis: 2.9, paul: 1.7 }[who] || 0);
    drawShadow(c, x, y, 42 * s, 13 * s, 0.24);
    const dayRun = !!G.sess.day && G.sess.where === this.cab && G.sess.state === 'run';
    let pose = 'idle', fps = 0.7;
    if (who === 'player') { if (dayRun) { pose = 'talk'; fps = 1.1; } }
    else if (who === 'gabriel') { pose = ['coach', 'tablet', 'cheer'][Math.floor(t / 4) % 3]; fps = 0.8; }
    else if (who === 'mathis') { pose = ['coach', 'point', 'cheer'][Math.floor(t / 4) % 3]; fps = 0.8; }
    else if (who === 'ambroise') { pose = ['coach', 'massage', 'point', 'happy'][Math.floor(t / 4) % 4]; fps = 0.8; }
    else if (who === 'paul') { pose = 'idle'; fps = 0.7; }
    else { pose = ['coach', 'talk', 'idle'][Math.floor(t / 4) % 3]; fps = 0.8; }
    drawChar(c, who, pose, t, x, y, s, { fps, flip: who === 'player' });
  },

  /* ---------- DOM: equipment slots, team panel, buttons ---------- */
  renderSlots() {
    const wrap = $('slots'); wrap.innerHTML = '';
    if (this.cab !== 'C' || G.cab.level < 1) return;
    for (const id of ['mat_blue', 'step', 'espalier', 'mat_teal', 'freeman', 'electro', 'chairs']) {
      if (G.owned[id] || ITEMS[id].lvl > G.cab.level) continue;
      const [x, y] = ROOM.eq[id];
      const b = document.createElement('button'); b.type = 'button'; b.className = 'slotplus'; b.innerHTML = ICON.plus;
      b.style.left = x + 'px'; b.style.top = y - 30 + 'px';
      b.setAttribute('aria-label', `Acheter : ${ITEMS[id].name}`);
      b.addEventListener('click', () => { if (blocked()) return; Shop.open('materiel', id); });
      wrap.appendChild(b);
    }
  },
  renderTeam() {
    const wrap = $('teamPanel'); const rows = [];
    const C = TOWN_CABS[this.cab] || {}, h = this.hostOf();
    for (const k of this.kines()) {
      if (k === 'player') rows.push({ av: gx('av_player', 'av_playerf'), name: G.pseudo || 'Toi', sub: G.mission && G.mission.state === 'work' ? 'En mission' : G.phase === 'rempl' ? `${gx('Remplaçant', 'Remplaçante')} · ${Math.round(G.contract.r * 100)} % reversés` : G.phase === 'assist' ? `${gx('Assistant', 'Assistante')} · ${Math.round(G.contract.r * 100)} % de redevance` : 'Titulaire', who: 'player' });
      else if (k === h && !this.visitMode()) rows.push({ av: 'av_' + k, name: C.tit, sub: 'Titulaire du cabinet', who: 'host2' });
      const st = this.cab === 'C' && staffList().find((x) => x.who === k);
      if (st) rows.push({ av: 'av_' + k, name: staffName(k), sub: `Assistant · ${Math.round(st.rate * 100)} %`, who: 'staff:' + k });
    }
    if (G.phase === 'rempl' && workplace() === this.cab) rows.push({ av: C.who ? 'av_' + C.who : null, name: C.tit, sub: 'Absent : il a cessé son activité', who: 'tit', away: true });
    if (this.visitMode()) { rows.push({ av: 'av_' + C.who, name: C.tit, sub: 'Titulaire · chez lui', who: 'host' }); rows.push({ av: gx('av_player', 'av_playerf'), name: G.pseudo || 'Toi', sub: 'En visite', who: 'guest' }); }
    wrap.innerHTML = rows.map((r) => `<button type="button" class="tm${r.away ? ' away' : ''}" data-who="${r.who}">${r.av ? `<img src="${URLS[r.av] || `assets/${r.av}.webp`}" alt="">` : `<span class="tm-ph">${ICON.suitcase}</span>`}<span>${esc(r.name)}<small>${esc(frSpace(r.sub))}</small></span></button>`).join('');
  },
  syncUi() {
    if (state.screen !== 'cabinet') return;
    const exit = $('btnExit'); exit.innerHTML = `${ICON.door}<span>Sortir</span>`;
    $('btnLeave').hidden = true;
    this.updateUi(true);
  },
  updateUi(force) {
    if (state.screen !== 'cabinet') return;
    const mine = workplace() === this.cab, st = G.sess.state, go = $('btnSession'), bar = $('sessionBar'), coin = $('btnCollect');
    const day = !!G.sess.day && G.sess.where === this.cab;
    const tripOff = mine && this.cab === 'C' && !!G.trip;
    go.hidden = !mine || st !== 'idle' || tripOff; bar.hidden = !mine || st !== 'run' || day; coin.hidden = !mine || st !== 'ready';
    const key = `${this.mine()}|${G.phase}|${G.mission ? G.mission.state : ''}`;
    if (!go.hidden && (force || go.dataset.k !== key)) {
      const n = this.mine(); go.dataset.k = key;
      go.innerHTML = `${ICON.play}<span class="bs-txt"><span>Commencer la demi-journée</span><small>${Day.agenda(this.cab)} patients prévus · ${n} poste${n > 1 ? 's' : ''}</small></span>`;
    }
    if (!coin.hidden && coin.dataset.day !== String(day)) {
      coin.dataset.day = String(day);
      coin.innerHTML = `${ICON.coin}<span class="bs-txt"><span>Faire les comptes</span><small>Ta demi-journée est terminée !</small></span>`;
    }
    Day.renderUi();
    const fb = $('btnFraud'), fo = mine && Fraude.canOffer(); if (fb.hidden === fo) fb.hidden = !fo;
    const vm = this.visitMode(), tb = $('btnTalkTit'), ob = $('btnOfferTit');
    tb.hidden = !vm; ob.hidden = !vm || !Board.offerAt(this.cab);
    if (vm && tb.dataset.cab !== this.cab) { tb.dataset.cab = this.cab; const C = TOWN_CABS[this.cab]; tb.innerHTML = `<img src="${URLS['av_' + C.who] || `assets/av_${C.who}.webp`}" alt=""><span>Parler à ${esc(C.first)}</span>`; ob.innerHTML = `${ICON.board}<span>Voir son offre</span>`; }
    if (!bar.hidden) {
      $('sbFill').style.width = (Session.progress() * 100).toFixed(1) + '%';
      $('sbTime').textContent = Session.label();
    }
  }
};
$('teamPanel').addEventListener('click', (e) => {
  const b = e.target.closest('.tm'); if (!b || blocked()) return; AudioSys.tap();
  const w = b.dataset.who, C = TOWN_CABS[Room.cab] || {};
  if (w === 'player') toast(G.mission && G.mission.state === 'work' ? `En mission chez <b>${esc(C.first)}</b> : il te paie pour chaque patient soigné.` : G.phase === 'rempl' ? `Toi, <b>${gx('remplaçant', 'remplaçante')}</b> : tu encaisses les honoraires avec TA carte CPS et tu reverses <b>${Math.round(G.contract.r * 100)} %</b> au titulaire.` : G.phase === 'assist' ? `Toi, <b>${gx('assistant libéral', 'assistante libérale')}</b> : tu soignes la patientèle de ${esc(C.first || 'ton titulaire')} et tu lui verses <b>${Math.round(G.contract.r * 100)} %</b> de redevance.` : `Toi, <b>titulaire</b> : tu gardes tous tes honoraires… et toutes les charges !`);
  if (w === 'host2') toast(`${esc(C.first)}, titulaire : c'est son cabinet, sa patientèle et son matériel. Tu y exerces sans en être ${gx('propriétaire', 'propriétaire')}.`);
  if (w.startsWith('staff:')) { const k = w.slice(6), st = staffList().find((x) => x.who === k); if (st) toast(`${esc(staffName(k))}, ton assistant : il soigne ta patientèle avec sa propre carte CPS et te reverse <b>${Math.round(st.rate * 100)} %</b>. Récolte ses redevances au-dessus de ton cabinet !`); }
  if (w === 'tit') toast(`Pendant un remplacement, le titulaire cesse toute activité de soin : tu es ${gx('seul', 'seule')} aux commandes.`);
  if (w === 'host') Confrere.talk();
  if (w === 'guest') toast(`Tu es en visite chez ${esc(C.first)}. Ici, ce ne sont pas tes patients !`);
});

$('btnFraud').addEventListener('click', () => { if (blocked()) return; Fraude.open(); });
