import { Fraude } from '../game/fraude.js';
import { AudioSys } from '../audio/audio.js';
import { IMG, URLS } from '../core/assets.js';
import { G, state, workplace } from '../core/save.js';
import { $, AH, AW, KX, KY, clamp, esc, frSpace, lerp, rand, randi } from '../core/utils.js';
import { ECO } from '../data/economy.js';
import { ROOM, STATIONS } from '../data/room.js';
import { ITEMS } from '../data/shop-items.js';
import { META } from '../data/sprites.js';
import { TOWN_CABS } from '../data/town-map.js';
import { drawPuffs } from '../fx/effects.js';
import { Board } from '../game/board.js';
import { DAY, Day, isDayPhase } from '../game/day.js';
import { Session, rendement } from '../game/session.js';
import { PATIENT_FPS, charWalk, depthK, drawChar, drawEq, drawPatient, drawShadow, pingPong, walkView } from '../render/sprites.js';
import { Confrere } from '../story/confreres.js';
import { Talk } from '../story/talk.js';
import { toast } from '../ui/helpers.js';
import { ICON } from '../ui/icons.js';
import { blocked } from '../ui/modals.js';
import { Shop } from '../ui/shop.js';

/* ================= Inside a cabinet: equipment, patients, the kinés (small sprites) ================= */
const KINE_S = 0.95;
export const Room = {
  cv: $('roomCv'), ctx: $('roomCv').getContext('2d'),
  cab: null, people: [], puffs: [], t: 0, flash: {}, visitor: null,
  /* Equipment of a cabinet: fixed for the confrères, bought by you in your own cabinet. */
  owns(id, cab = this.cab) {
    if (cab === 'C') return !!G.owned[id];
    const C = TOWN_CABS[cab]; return !!(C && C.eq && C.eq.includes(id));
  },
  stations(cab = this.cab) { return STATIONS.filter((s) => !s.item || this.owns(s.item, cab)); },
  /* Kinés working in this cabinet now. */
  kines(cab = this.cab) {
    const out = [];
    if (workplace() === cab) out.push('player');
    if (cab === 'B' && G.phase === 'assist') out.push('ambroise');
    if (cab === 'C' && G.staff.mathieu) out.push('mathieu');
    if (this.visitMode(cab)) out.push(TOWN_CABS[cab].who);
    return out;
  },
  /* You pop in at a confrère's: he is working with his own patients. */
  visitMode(cab = this.cab) { return !!cab && cab !== 'C' && workplace() !== cab && !!(TOWN_CABS[cab] && TOWN_CABS[cab].who) && !(G.phase === 'rempl' && G.contract && G.contract.cab === cab); },
  capacity(cab = this.cab) { return Math.min(this.stations(cab).length, this.kines(cab).length * ECO.perKine); },
  queuers() { return this.people.filter((p) => p.role === 'queue'); },
  enter(cab) {
    this.cab = cab; this.people = []; this.visitor = null; this.host = null;
    if (this.visitMode(cab)) { const w = TOWN_CABS[cab].who, at = (ROOM.kine[w] || ROOM.kine.player).slice(); this.host = { who: w, x: at[0], y: at[1], home: at, pts: [], t: 0, pause: 2, row: 0, flip: false, pose: 'coach' }; }
    const n = this.capacity(cab), here = G.sess.where === cab;
    if (G.sess.day && here) Day.syncRoom(true);
    else if (here && (G.sess.state === 'run' || G.sess.state === 'ready')) this.placeAtStations(n, true);
    else if (workplace() === cab && !isDayPhase()) for (let i = 0; i < n; i++) { const [x, y] = ROOM.queue[i]; this.people.push(this.person(x, y, 'queue', 1)); }
    else if (this.visitMode(cab)) this.placeAtStations(n, true);
    this.renderSlots(); this.renderTeam(); this.syncUi();
  },
  person(x, y, role, alpha) {
    return { t: randi(0, 3), x, y, role, state: 'idle', path: [], alpha, fade: 0, anim: rand(0, 2), sheet: 'walk_side', flip: false, speed: 135, station: null, then: null };
  },
  placeAtStations(n, instant) {
    const st = this.stations();
    for (let i = 0; i < n; i++) {
      const s = st[i]; const p = this.person(s.at[0], s.at[1], 'session', 1);
      p.station = s; p.state = 'exercise'; p.sheet = s.ex; p.anim = rand(0, 1);
      this.people.push(p);
    }
  },
  /* Patients waiting in line go to the stations. */
  startSession() {
    const st = this.stations(), q = this.queuers();
    q.forEach((p, i) => {
      const s = st[i]; if (!s) return;
      p.role = 'session'; p.station = s;
      const pts = []; if (s.id === 'S1') pts.push([660, 540]); pts.push(s.at);
      this.walk(p, pts, () => { p.state = 'exercise'; p.sheet = s.ex; p.flip = false; p.anim = rand(0, 1); });
    });
    this.renderSlots(); this.renderTeam(); this.syncUi();
  },
  endSession() {
    for (const p of this.people.filter((x) => x.role === 'session')) { p.role = 'leave'; this.walk(p, [[p.x + 24, p.y + 26], ROOM.doorIn, ROOM.doorOut], () => { p.dead = true; }); }
    this.syncUi();
  },
  /* New patients come in for the next month. */
  refill() {
    if (workplace() !== this.cab) return;
    const n = this.capacity() - this.queuers().length;
    for (let i = 0; i < n; i++) {
      const [x, y] = ROOM.doorOut, p = this.person(x, y, 'queue', 0); p.fade = 1; this.people.push(p);
      const spot = ROOM.queue[this.queuers().length - 1];
      setTimeout(() => this.walk(p, [ROOM.doorIn, spot], () => { p.sheet = 'walk_side'; p.flip = false; }), i * 450);
    }
  },
  walk(p, pts, then) { p.path = pts.map((q) => q.slice()); p.state = 'walk'; p.then = then || null; },
  headOf(p) { const s = 0.9 * depthK(p.y); return { x: p.x * KX, y: (p.y - 170 * s) * KY }; },
  dust(x, y) { for (let i = 0; i < 22; i++) { const a = rand(0, Math.PI * 2), sp = rand(60, 170); this.puffs.push({ x, y: y + rand(-8, 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 - 20, r: rand(14, 28), life: 0, dur: rand(0.6, 1.1) }); } },
  newItem(id) {
    this.flash[id] = 0; const pos = ROOM.eq[id];
    if (pos) this.dust(pos[0], pos[1]); else if (id === 'table') this.dust(1270, 520);
    if (ITEMS[id] && ITEMS[id].kind === 'station') this.refill();
    this.renderSlots(); this.syncUi();
  },
  /* The titulaire walks from one patient to the next and coaches them. */
  wander(h, dt) {
    h.t += dt;
    const tgt = h.pts[0];
    if (!tgt) {
      h.pause -= dt;
      if (h.pause <= 0 && !Talk.active) {
        const busy = this.people.filter((p) => p.state === 'exercise' && p.station);
        const go = Math.random() < 0.25 || !busy.length ? h.home : (() => { const p = busy[randi(0, busy.length - 1)]; return [p.station.at[0] + 70, p.station.at[1] + 34]; })();
        h.pts = [go.slice()]; h.pause = rand(2.5, 4.5);
      }
      return;
    }
    const dx = tgt[0] - h.x, dy = tgt[1] - h.y, d = Math.hypot(dx, dy), st = 120 * dt;
    if (d <= st) { h.x = tgt[0]; h.y = tgt[1]; h.pts.shift(); h.pose = ['coach', 'talk', 'think'][randi(0, 2)]; h.faceL = true; }
    else { h.x += (dx / d) * st; h.y += (dy / d) * st; [h.row, h.flip] = charWalk(h.who, dx, dy); }
  },
  /* A visitor (Marvin, M. Menton…) walks in from the door. */
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
    for (const k of this.kines()) if (!(this.host && this.host.who === k)) items.push([(ROOM.kine[k] || ROOM.kine.player)[1], 'k', k]);
    if (this.host) items.push([this.host.y, 'h', this.host]);
    if (this.visitMode()) items.push([ROOM.visit[1] + 40, 'g', null]);
    if (this.visitor) items.push([this.visitor.y, 'v', this.visitor]);
    items.sort((a, b) => a[0] - b[0]);
    const dayHere = !!G.sess.day && G.sess.where === this.cab;
    const running = (G.sess.where === this.cab && G.sess.state === 'run' && (!dayHere || Day.busyCount() > 0)) || this.visitMode();
    for (const it of items) {
      if (it[1] === 'eq') {
        const id = it[2], [x, y] = ROOM.eq[id], f = this.flash[id];
        const k = f == null ? 1 : f < 0.35 ? lerp(0.3, 1.12, f / 0.35) : lerp(1.12, 1, Math.min(1, (f - 0.35) / 0.45));
        drawEq(c, id, x, y, k, 1);
      } else if (it[1] === 'p') this.drawPerson(c, it[2]);
      else if (it[1] === 'k') this.drawKine(c, it[2], running);
      else if (it[1] === 'h') { const h = it[2], s = KINE_S * depthK(h.y); drawShadow(c, h.x, h.y, 42 * s, 13 * s, 0.24); if (h.pts.length) drawChar(c, h.who, 'walk', h.t, h.x, h.y, s, { row: h.row, flip: h.flip }); else drawChar(c, h.who, h.pose, h.t, h.x, h.y, s, { fps: 0.8, flip: h.faceL }); }
      else if (it[1] === 'g') { const [gx, gy] = [ROOM.visit[0] + 40, ROOM.visit[1] + 40], s = KINE_S * depthK(gy); drawShadow(c, gx, gy, 42 * s, 13 * s, 0.24); drawChar(c, 'player', 'idle', this.t, gx, gy, s, { fps: 0.7 }); }
      else { const v = it[2], s = KINE_S * depthK(v.y); drawShadow(c, v.x, v.y, 40 * s, 12 * s, 0.22 * v.alpha); if (v.state === 'walk') drawChar(c, v.who, 'walk', v.t, v.x, v.y, s, { row: v.row, flip: v.flip, alpha: v.alpha }); else drawChar(c, v.who, v.pose, v.t, v.x, v.y, s, { alpha: v.alpha, flip: true }); }
    }
    drawPuffs(c, this.puffs, dt || 0);
    if (running && !this.visitMode()) {
      for (const p of this.people) if (p.role === 'session' && p.state === 'exercise' && !(dayHere && p.done)) {
        const prog = dayHere ? clamp(p.prog || 0, 0, 1) : Session.progress();
        const s = 0.9 * depthK(p.y), hx = p.x, hy = p.y - 186 * s - 22;
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
      drawPatient(c, p.sheet, p.t, pingPong(p.anim, fps), p.x, p.y, s, p.flip, p.alpha);
      return;
    }
    const moving = p.state === 'walk';
    drawShadow(c, p.x, p.y, 30 * s, 10 * s, 0.2 * p.alpha);
    drawPatient(c, p.sheet, p.t, moving ? Math.floor(p.anim * PATIENT_FPS.walk) : 0, p.x, p.y, s, p.flip, p.alpha);
  },
  drawKine(c, who, running) {
    const [x, y] = ROOM.kine[who] || ROOM.kine.player, s = KINE_S * depthK(y), t = this.t + (who === 'ambroise' ? 1.3 : who === 'mathieu' ? 2.1 : 0);
    drawShadow(c, x, y, 42 * s, 13 * s, 0.24);
    let pose = 'idle', fps = 0.7;
    if (running) { pose = who === 'ambroise' ? 'coach' : 'talk'; fps = who === 'ambroise' ? 0.45 : 1.1; if (who === 'mathieu' && Math.floor(t / 6) % 2) pose = 'kneel'; }
    if (running && ['thomas', 'julien', 'etienne'].includes(who)) { pose = ['coach', 'talk', 'idle'][Math.floor(t / 4) % 3]; fps = 0.8; }
    drawChar(c, who, pose, t, x, y, s, { fps, flip: who === 'player' || (who !== 'ambroise' && who !== 'mathieu' && this.visitMode()) });
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
    for (const k of this.kines()) {
      if (k === 'player') rows.push({ av: 'av_player', name: G.pseudo || 'Toi', sub: G.phase === 'rempl' ? `Remplaçant · ${Math.round(G.contract.r * 100)} % reversés` : G.phase === 'assist' ? `Assistant · ${Math.round(G.contract.r * 100)} % de redevance` : 'Titulaire', who: 'player' });
      if (k === 'ambroise') rows.push({ av: 'av_ambroise', name: 'Ambroise', sub: 'Titulaire du cabinet', who: 'ambroise' });
      if (k === 'mathieu') rows.push({ av: 'av_mathieu', name: 'Mathieu', sub: `Assistant · ${Math.round(G.staff.mathieu.rate * 100)} %`, who: 'mathieu' });
    }
    if (G.phase === 'rempl' && workplace() === this.cab) { const C = TOWN_CABS[this.cab]; rows.push({ av: C.who ? 'av_' + C.who : null, name: C.tit, sub: 'Absent : il a cessé son activité', who: 'tit', away: true }); }
    if (this.visitMode()) { const C = TOWN_CABS[this.cab]; rows.push({ av: 'av_' + C.who, name: C.tit, sub: 'Titulaire · chez lui', who: 'host' }); rows.push({ av: 'av_player', name: G.pseudo || 'Toi', sub: 'En visite', who: 'guest' }); }
    wrap.innerHTML = rows.map((r) => `<button type="button" class="tm${r.away ? ' away' : ''}" data-who="${r.who}">${r.av ? `<img src="${URLS[r.av]}" alt="">` : `<span class="tm-ph">${ICON.suitcase}</span>`}<span>${esc(r.name)}<small>${esc(frSpace(r.sub))}</small></span></button>`).join('');
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
    go.hidden = !mine || st !== 'idle'; bar.hidden = !mine || st !== 'run' || day; coin.hidden = !mine || st !== 'ready';
    const key = `${this.capacity()}|${G.phase}`;
    if (!go.hidden && (force || go.dataset.k !== key)) {
      const n = this.capacity(); go.dataset.k = key;
      go.innerHTML = isDayPhase()
        ? `${ICON.play}<span class="bs-txt"><span>Commencer la journée</span><small>${Math.round(DAY.P0 * rendement())} patients prévus · ${n} postes</small></span>`
        : `${ICON.play}<span class="bs-txt"><span>Accueillir les patients</span><small>${n} patient${n > 1 ? 's' : ''} · 1 mois de travail</small></span>`;
    }
    if (!coin.hidden && coin.dataset.day !== String(day)) {
      coin.dataset.day = String(day);
      coin.innerHTML = day ? `${ICON.coin}<span class="bs-txt"><span>Faire les comptes</span><small>Ta journée est terminée !</small></span>` : `${ICON.coin}<span class="bs-txt"><span>Encaisser le mois</span><small>Ta séance est terminée !</small></span>`;
    }
    Day.renderUi();
    const fb = $('btnFraud'), fo = mine && Fraude.canOffer(); if (fb.hidden === fo) fb.hidden = !fo;
    const vm = this.visitMode(), tb = $('btnTalkTit'), ob = $('btnOfferTit');
    tb.hidden = !vm; ob.hidden = !vm || !Board.offerAt(this.cab);
    if (vm && tb.dataset.cab !== this.cab) { tb.dataset.cab = this.cab; const C = TOWN_CABS[this.cab]; tb.innerHTML = `<img src="${URLS['av_' + C.who]}" alt=""><span>Parler à ${esc(C.first)}</span>`; ob.innerHTML = `${ICON.board}<span>Voir son offre</span>`; }
    if (!bar.hidden) {
      $('sbFill').style.width = (Session.progress() * 100).toFixed(1) + '%';
      $('sbTime').textContent = Session.label();
    }
  }
};
$('teamPanel').addEventListener('click', (e) => {
  const b = e.target.closest('.tm'); if (!b || blocked()) return; AudioSys.tap();
  const w = b.dataset.who;
  if (w === 'player') toast(G.phase === 'rempl' ? `Toi, <b>remplaçant</b> : tu encaisses les honoraires avec TA carte CPS et tu reverses <b>${Math.round(G.contract.r * 100)} %</b> au titulaire.` : G.phase === 'assist' ? `Toi, <b>assistant libéral</b> : tu soignes la patientèle d'Ambroise et tu lui verses <b>${Math.round(G.contract.r * 100)} %</b> de redevance.` : `Toi, <b>titulaire</b> : tu gardes tous tes honoraires… et toutes les charges !`);
  if (w === 'ambroise') toast("Ambroise, titulaire : c'est son cabinet, sa patientèle et son matériel. Tu y exerces sans en être propriétaire.");
  if (w === 'mathieu') toast(`Mathieu, ton assistant : il soigne ta patientèle et te reverse <b>${Math.round(G.staff.mathieu.rate * 100)} %</b> (gains divers).`);
  if (w === 'tit') toast('Pendant un remplacement, le titulaire cesse toute activité de soin : tu es seul aux commandes.');
  if (w === 'host') Confrere.talk();
  if (w === 'guest') toast(`Tu es en visite chez ${esc(TOWN_CABS[Room.cab].first)}. Ici, ce ne sont pas tes patients !`);
});

$('btnFraud').addEventListener('click', () => { if (blocked()) return; Fraude.open(); });
