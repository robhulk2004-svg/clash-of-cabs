/* ================= Kinédex: building your team by dragging the cards (v6.3) =================
   The deck system of Beast Brawl!, the same gestures: hold a card a short moment and it lifts and follows the finger.
   Above the team, the cards move apart to make room for it (or the one it replaces fades if the team is full); out of the
   team, a card leaves it. When you let go, the card flies to its place and everybody slides to theirs. A short touch still
   opens the card, a vertical swipe still scrolls the list. */
import { stage } from '../core/layout.js';
import { $, clamp } from '../core/utils.js';
import { G } from '../core/save.js';
import { play, sfx } from '../audio/sfx.js';
import { TEAM_SIZE } from '../data/kinedex.js';
import { toast } from './helpers.js';

const HOLD = 150;            // ms of press before the card lifts (with a finger)
const EASE = 'cubic-bezier(.2,.9,.3,1.12)';
let P = null;                // finger on a card, not lifted yet
let D = null;                // card being dragged
let cur = null;              // the list on screen
let keepScroll = 0;          // scroll of the list, kept from one render to the next
let blockUntil = 0;          // right after a drag, the touch that ends it opens no card
let afterRender = null;      // what follows a drop, once the page is drawn again
let setTeam = null;          // (plan) => saves the team and draws the page again

/* the stage: its corner on the screen and its scale (screen pixels per stage pixel) */
const view = () => { const r = stage.getBoundingClientRect(); return { x: r.left, y: r.top, scale: r.width / 1920 || 1 }; };
export const dragBusy = () => !!D || performance.now() < blockUntil;
const layer = () => $('dragLayer') || (() => { const d = document.createElement('div'); d.id = 'dragLayer'; $('ui').appendChild(d); return d; })();
const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* no vibration */ } };
const toStage = (r) => { const v = view(); return { x: (r.left - v.x) / v.scale, y: (r.top - v.y) / v.scale, w: r.width / v.scale, h: r.height / v.scale }; };
const cells = (list) => [...list.querySelectorAll('.cc[data-id]')];

/* to call each time the Kinédex is drawn */
export function bindTeamDrag(list, onTeam) {
  setTeam = onTeam;
  if (D && !D.committing) abort();
  cur = list;
  const restore = () => { if (list.isConnected) list.scrollTop = keepScroll; };
  restore(); requestAnimationFrame(restore);
  list.addEventListener('scroll', () => { if (cur === list) keepScroll = list.scrollTop; }, { passive: true });
  list.addEventListener('pointerdown', (e) => down(e, list));
  list.addEventListener('pointermove', move);
  list.addEventListener('pointerup', up); list.addEventListener('pointercancel', cancel);
  list.addEventListener('touchmove', (e) => { if (D) e.preventDefault(); }, { passive: false });     // the list does not scroll under a lifted card
  list.addEventListener('contextmenu', (e) => { if (P || D) e.preventDefault(); });
  if (afterRender) { const fn = afterRender; afterRender = null; fn(list); }
}
export const resetScroll = () => { keepScroll = 0; };

function down(e, list) {
  if (P || D || !e.isPrimary || e.button > 0) return;
  const el = e.target.closest && e.target.closest('.cc[data-id]');
  if (!el || el.classList.contains('locked') || !list.contains(el)) return;
  P = { id: el.dataset.id, el, list, pid: e.pointerId, x: e.clientX, y: e.clientY, mouse: e.pointerType === 'mouse', timer: 0 };
  if (!P.mouse) { el.classList.add('held'); P.timer = setTimeout(() => { if (P) pickup(P.x, P.y); }, HOLD); }
}
function clearP() { if (!P) return; clearTimeout(P.timer); P.el.classList.remove('held'); P = null; }

function move(e) {
  if (D) { if (e.pointerId === D.pid) { D.px = e.clientX; D.py = e.clientY; } return; }
  if (!P || e.pointerId !== P.pid) return;
  const far = Math.hypot(e.clientX - P.x, e.clientY - P.y);
  if (P.mouse) { if (far > 5) pickup(e.clientX, e.clientY); return; }
  if (far > 9) clearP();          // the finger left before the card lifted: it is a scroll
}
function up(e) {
  if (D) { if (e.pointerId === D.pid) drop(); return; }
  if (P && e.pointerId === P.pid) clearP();
}
function cancel(e) {
  if (D) { if (e.pointerId === D.pid) { D.plan = null; drop(true); } return; }
  if (P && e.pointerId === P.pid) clearP();
}

/* safety net: if the release never reaches the list (finger lifted elsewhere, window left), the card never stays in the air */
addEventListener('pointerup', up); addEventListener('pointercancel', cancel);
addEventListener('blur', () => { clearP(); if (D && !D.committing) { D.plan = null; drop(true); } });

/* ---------- the card lifts ---------- */
function pickup(px, py) {
  const { id, el, list, pid } = P; clearTimeout(P.timer); el.classList.remove('held'); P = null;
  const grid = list.querySelector('.co-grid.deck'); if (!grid || !el.isConnected) return;
  try { list.setPointerCapture(pid); } catch (er) { /* nothing */ }
  const v = view(), r = el.getBoundingClientRect(), g = grid.getBoundingClientRect(), sc = v.scale, st = toStage(r);
  const ghost = el.cloneNode(true); ghost.classList.remove('held', 'up'); ghost.classList.add('drag-ghost'); ghost.removeAttribute('data-id');
  ghost.style.width = st.w + 'px';
  layer().append(ghost);
  const deck = G.kdx.team.slice(), src = deck.includes(id) ? 'deck' : 'col';
  D = {
    id, el, list, grid, pid, ghost, deck, src, plan: null, key: '', committing: false,
    px, py, ox: px - r.left, oy: py - r.top + 14 * sc,             // the card stays under the finger where it was taken, a bit higher
    gx: st.x, gy: st.y, vx: 0, tilt: 0, s: 1, w: st.w, h: st.h, last: performance.now(), raf: 0,
    slots: [...grid.children].slice(0, TEAM_SIZE).map((c) => { const b = c.getBoundingClientRect(); return { x: (b.left - g.left) / sc, y: (b.top - g.top) / sc, w: b.width / sc, h: b.height / sc }; }),
    mark: (() => { const m = document.createElement('div'); m.className = 'drop-slot'; m.innerHTML = '<span class="t">+</span>'; return m; })()
  };
  D.mark.hidden = true; grid.append(D.mark);
  el.classList.add('drag-src'); list.classList.add('dragging');
  play('card_flip', { v: 0.45, rate: 1.3 }); buzz(12);
  D.raf = requestAnimationFrame(loop);
}

/* ---------- while dragging ---------- */
function loop(now) {
  if (!D || D.committing) return;
  if (!D.list.isConnected) { abort(); return; }            // the Kinédex was closed while holding a card
  D.raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - D.last) / 1000); D.last = now;
  const v = view(), sc = v.scale, lr = D.list.getBoundingClientRect();
  // the list scrolls by itself when the card comes near its top or bottom edge
  const zone = 130 * sc, top = lr.top + zone - D.py, bot = D.py - (lr.bottom - zone);
  if (top > 0) D.list.scrollTop -= clamp(top / zone, 0, 1.4) * 900 * dt; else if (bot > 0) D.list.scrollTop += clamp(bot / zone, 0, 1.4) * 900 * dt;
  // the card follows the finger, leaning in the direction of the move
  const tx = (D.px - D.ox - v.x) / sc, ty = (D.py - D.oy - v.y) / sc, f = 1 - Math.exp(-dt * 38), x0 = D.gx;
  D.gx += (tx - D.gx) * f; D.gy += (ty - D.gy) * f;
  D.vx += ((D.gx - x0) / Math.max(dt, 0.001) - D.vx) * (1 - Math.exp(-dt * 14));
  D.tilt += (clamp(D.vx * 0.012, -13, 13) - D.tilt) * (1 - Math.exp(-dt * 12));
  D.s += (1.12 - D.s) * (1 - Math.exp(-dt * 20));
  D.ghost.style.transform = `translate3d(${D.gx}px,${D.gy}px,0) rotate(${D.tilt}deg) scale(${D.s})`;
  // where would the card fall?
  const g = D.grid.getBoundingClientRect(), cx = D.gx * sc + v.x + D.w * sc / 2, cy = D.gy * sc + v.y + D.h * sc * 0.42, m = 34 * sc;
  const inDeck = cx > g.left - m && cx < g.right + m && cy > g.top - m && cy < g.bottom + m && cy > lr.top - m && cy < lr.bottom + m;
  let plan = null, out = null, at = -1;
  if (inDeck) {
    const full = D.deck.length >= TEAM_SIZE, max = D.src === 'deck' ? D.deck.length - 1 : full ? TEAM_SIZE - 1 : D.deck.length;
    let best = 1e9;
    D.slots.forEach((s, i) => { const d = Math.hypot(g.left + (s.x + s.w / 2) * sc - cx, g.top + (s.y + s.h * 0.42) * sc - cy); if (d < best) { best = d; at = i; } });
    at = Math.min(at, max);            // above an empty slot: after the cards
    if (D.src === 'deck') { plan = D.deck.filter((x) => x !== D.id); plan.splice(at, 0, D.id); }
    else if (full) { out = D.deck[at]; plan = D.deck.slice(); plan[at] = D.id; }
    else { plan = D.deck.slice(); plan.splice(at, 0, D.id); }
  } else if (D.src === 'deck' && D.deck.length > 1) plan = D.deck.filter((x) => x !== D.id);       // out of the team: it leaves it
  const key = plan ? plan.join() : '';
  if (key !== D.key) { if (D.key !== '' || key !== D.deck.join()) play('tick', { v: 0.22, rate: 1.25 }); D.key = key; D.plan = plan; D.out = out; preview(); }
}

/* The cards of the team move to where they will be after the drop; a frame marks the place of the held card */
function preview() {
  const { plan, deck, slots, grid, list, id, mark } = D;
  const kids = [...grid.children].slice(0, TEAM_SIZE);
  kids.forEach((c, i) => {
    const cid = c.dataset.id; c.classList.remove('leaving', 'covered'); c.style.transform = ''; c.style.zIndex = '';
    if (!cid) { if (plan && i < plan.length) c.classList.add('covered'); return; }          // an empty slot about to be taken
    if (cid === id || !plan) return;
    const j = plan.indexOf(cid);
    if (j < 0) { c.classList.add('leaving'); return; }
    if (j !== i && slots[j]) { c.style.transform = `translate(${slots[j].x - slots[i].x}px,${slots[j].y - slots[i].y}px)`; c.style.zIndex = '1'; }
  });
  const leaves = !!plan && !plan.includes(id), k = !plan ? (D.src === 'deck' ? deck.indexOf(id) : -1) : leaves ? plan.length : plan.indexOf(id), s = slots[k];
  mark.hidden = !s; mark.classList.toggle('out', leaves || !plan);
  if (s) Object.assign(mark.style, { left: s.x - grid.clientLeft + 'px', top: s.y - grid.clientTop + 'px', width: s.w + 'px', height: s.w * (480 / 330) + 'px' });
  grid.classList.toggle('drop-hot', !!plan && !leaves);
  list.classList.toggle('drop-out', leaves);
}
function clearPreview() {
  const { grid, list, mark } = D;
  [...grid.children].forEach((c) => { c.classList.remove('leaving', 'covered'); c.style.transform = ''; c.style.zIndex = ''; });
  mark.remove(); grid.classList.remove('drop-hot'); list.classList.remove('drop-out');
  setTimeout(() => list.classList.remove('dragging'), 260);        // the time for the cards to slide back smoothly
}

/* ---------- drop ---------- */
function drop(cancelled) {
  const d = D; cancelAnimationFrame(d.raf);
  try { d.list.releasePointerCapture(d.pid); } catch (er) { /* nothing */ }
  blockUntil = performance.now() + 380;
  const changed = d.plan && d.plan.join() !== d.deck.join();
  if (!changed) {            // nothing changes: the card goes back where it came from
    if (!cancelled && d.src === 'deck' && !d.plan && d.deck.length <= 1) { sfx.error(); toast('Ton équipe doit garder au moins une carte.'); }
    clearPreview(); D = null;
    flyTo(d.ghost, d, d.el.isConnected ? toStage(d.el.getBoundingClientRect()) : null, () => { d.el.classList.remove('drag-src'); }, 230);
    return;
  }
  // the state before: where each card is on screen (temporary arrangement included)
  d.committing = true;
  const first = new Map(); cells(d.list).forEach((c) => first.set(c.dataset.id, c.getBoundingClientRect()));
  const joins = d.plan.includes(d.id), out = d.out;
  keepScroll = d.list.scrollTop;
  afterRender = (list) => {
    const sc = view().scale;
    for (const c of cells(list)) {
      const a = first.get(c.dataset.id), cid = c.dataset.id; if (!a) continue;
      if (cid === d.id) { land(c, d, joins); continue; }
      const b = c.getBoundingClientRect(), dx = (a.left - b.left) / sc, dy = (a.top - b.top) / sc;
      if (Math.abs(dx) + Math.abs(dy) < 1.5 && cid !== out) continue;
      c.style.zIndex = '2';
      const an = c.animate([{ transform: `translate(${dx}px,${dy}px)${cid === out ? ' scale(.86)' : ''}`, opacity: cid === out ? 0.6 : 1 }, { transform: 'none', opacity: 1 }], { duration: cid === out ? 380 : 280, easing: EASE });
      an.onfinish = an.oncancel = () => { c.style.zIndex = ''; };
    }
  };
  D = null;
  if (setTeam) setTeam(d.plan);            // the page is drawn again, then afterRender animates from the old arrangement to the new one
  if (afterRender) { afterRender = null; d.ghost.remove(); }      // (page not drawn again: nothing to animate)
}
/* The held card joins its new place, which waits for it, hidden */
function land(c, d, joins) {
  c.style.visibility = 'hidden';
  const v = view(), b = c.getBoundingClientRect(), lr = (cur || c).getBoundingClientRect(), to = toStage(b);
  if (b.top > lr.bottom - 30 * v.scale || b.bottom < lr.top + 30 * v.scale) {       // its place is out of sight: it flies to the edge and fades
    to.y = (clamp(b.top, lr.top - b.height * 0.5, lr.bottom - b.height * 0.5) - v.y) / v.scale; to.fade = true;
  }
  flyTo(d.ghost, d, to, () => {
    c.style.visibility = ''; c.classList.add('landed'); setTimeout(() => c.classList.remove('landed'), 420);
    const card = c.querySelector('.cc-card'); if (card) { const ring = document.createElement('i'); ring.className = 'land-ring' + (joins ? '' : ' out'); card.append(ring); setTimeout(() => ring.remove(), 460); }
    if (joins) { sfx.place(); buzz(10); } else sfx.back();
  }, 210);
}
function flyTo(ghost, d, to, done, ms) {
  if (!to) { ghost.remove(); done(); return; }
  const an = ghost.animate([{ transform: `translate3d(${d.gx}px,${d.gy}px,0) rotate(${d.tilt}deg) scale(${d.s})` }, { transform: `translate3d(${to.x}px,${to.y}px,0) rotate(0deg) scale(${to.fade ? 0.7 : 1})`, opacity: to.fade ? 0 : 1 }], { duration: ms, easing: 'cubic-bezier(.3,1.25,.5,1)', fill: 'forwards' });
  let ended = false; const end = () => { if (ended) return; ended = true; ghost.remove(); done(); };
  an.onfinish = end; an.oncancel = end; setTimeout(end, ms + 120);
}
/* The Kinédex was drawn again for another reason while a card was held: put it back without changing anything */
function abort() {
  const d = D; D = null; cancelAnimationFrame(d.raf); d.ghost.remove(); if (d.mark) d.mark.remove();
  blockUntil = performance.now() + 200;
}
