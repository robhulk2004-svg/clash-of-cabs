import { G, firstUndone, state, workplace } from '../core/save.js';
import { TOWN_CABS } from '../data/town-map.js';
import { $ } from '../core/utils.js';
import { ECO } from '../data/economy.js';
import { Fade } from '../fx/transitions.js';
import { Career } from '../game/career.js';
import { Cam } from '../scenes/camera.js';
import { Intro } from '../scenes/intro.js';
import { Talk } from '../story/talk.js';
import { artRect, stageRect } from './helpers.js';
import { ICON } from './icons.js';
import { modalOpen } from './modals.js';
import { Shop } from './shop.js';

/* ================= Tutorial guide (arrow + spotlight) ================= */
export const Guide = {
  el: $('guide'), spot: document.querySelector('#guide .spot'), arrow: $('guideArrow'),
  show(t) {
    const pad = t.pad == null ? 12 : t.pad;
    this.el.hidden = false;
    Object.assign(this.spot.style, { left: t.x - pad + 'px', top: t.y - pad + 'px', width: t.w + pad * 2 + 'px', height: t.h + pad * 2 + 'px', borderRadius: (t.r == null ? 30 : t.r) + 'px' });
    this.spot.classList.toggle('nodim', !t.dim);
    const small = !!t.small, aw = small ? 80 : 110, ah = small ? 93 : 128;
    const up = !small && t.y - pad - ah - 12 < 0;
    this.arrow.innerHTML = ICON.arrow; this.arrow.classList.toggle('up', up); this.arrow.classList.toggle('small', small);
    this.arrow.style.left = t.x + t.w / 2 - aw / 2 + 'px';
    this.arrow.style.top = (small ? t.y + 14 - ah : up ? t.y + t.h + pad + 6 : t.y - pad - ah - 8) + 'px';
  },
  hide() { this.el.hidden = true; }
};
/* the bubble of your workplace in the town (« Accueillir », « Y aller » or the coin), in stage pixels.
   When it is off screen or hidden under the buttons of the HUD, the camera first brings it into view. */
let revealed = null;
function bubbleRect(sel) {
  const b = document.querySelector('#townDom .work ' + sel); if (!b || b.hidden || b.closest('[hidden]')) return null;
  const r = b.querySelector('.b-in').getBoundingClientRect(), st = $('stage').getBoundingClientRect(), k = 1920 / st.width;
  const t = { x: (r.left - st.left) * k, y: (r.top - st.top) * k, w: r.width * k, h: r.height * k, dim: false, r: 24, small: true };
  const safe = t.x > 220 && t.y > 150 && t.x + t.w < 1880 && t.y + t.h < 1040 && !(t.x + t.w > 1640 && t.y + t.h > 840);
  const w = b.closest('.work'), key = w && w._pin ? `${G.map}:${w._pin[0]}:${w._pin[1]}` : null;
  if (safe || !key || revealed === key) return t;
  if (!Cam.anim) { revealed = key; Cam.flyTo(w._pin[0], w._pin[1] + 60, null, 650).then(() => refreshGuide()); }
  return null;
}
export function refreshGuide() {
  const shopBtn = $('btnShop'); shopBtn.classList.remove('nudge'); $('btnBoard').classList.remove('nudge');
  if (!['town', 'cabinet'].includes(state.screen) || Talk.active || modalOpen() && !state.shopOpen || state.busy || Fade.active || Intro.active) return Guide.hide();
  if (G.phase === 'demarches') {
    if (state.screen !== 'town') return Guide.hide();
    const task = firstUndone(); if (!task) return Guide.hide();
    if (state.shopOpen) {
      if (Shop.tab !== 'demarches') return Guide.show({ ...stageRect(document.querySelector('.tab[data-tab="demarches"]')), dim: true, r: 30 });
      const card = document.querySelector(`.card[data-card="${task}"]`);
      return card ? Guide.show({ ...stageRect(card), dim: true, r: 34, small: true }) : Guide.hide();
    }
    shopBtn.classList.add('nudge');
    return Guide.show({ ...artRect(1476, 775, 175, 146), dim: true, r: 36 });
  }
  if (state.shopOpen) return Guide.hide();
  /* the assistant can now create a cabinet: the Boutique blinks until the Bâtiments tab has been seen */
  if (!G.flags.batSeen && Career.canCreate() && G.money >= ECO.apportMin) shopBtn.classList.add('nudge');
  if (G.phase === 'rempl') {
    if (!G.q.sign) {
      if (state.screen !== 'town' || G.q.board) return Guide.hide();
      $('btnBoard').classList.add('nudge');
      return Guide.show({ ...stageRect($('btnBoard')), dim: true, r: 30 });
    }
    /* between two contracts (maybe far from the town): the next offers are on the board */
    if (!G.contract && G.monthsRempl < 12 && state.screen === 'town' && G.board.some((o) => o.state !== 'gone')) $('btnBoard').classList.add('nudge');
    if (!G.q.session1 && G.sess.state !== 'run') {
      if (state.screen === 'cabinet') { const el = G.sess.state === 'ready' ? $('btnCollect') : $('btnSession'); return el.hidden ? Guide.hide() : Guide.show({ ...stageRect(el), dim: false, r: 34 }); }
      const t = bubbleRect(G.sess.state === 'ready' ? '.coin' : '.go'); return t ? Guide.show(t) : Guide.hide();
    }
  }
  /* your workplace is on another map (Maransin, La Réunion): the bubble on its road shows the way, the first time */
  const wp = workplace(), C = wp && TOWN_CABS[wp];
  if (state.screen === 'town' && C && wp !== 'C' && C.map !== G.map && G.sess.state === 'idle' && !G.flags['went_' + wp]) {
    const t = bubbleRect('.go'); if (t) return Guide.show(t);
  }
  /* a mission abroad (Chad, Suzie): « Accueillir » above the cabinet of your host, then the coin */
  if (state.screen === 'town' && Career.onMission() && C && C.map === G.map && G.sess.state !== 'run') {
    const t = bubbleRect(G.sess.state === 'ready' ? '.coin' : '.go'); if (t) return Guide.show(t);
  }
  if (G.phase === 'titulaire' && G.cab.level >= 1 && !G.q.materiel) {
    shopBtn.classList.add('nudge');
    return Guide.show({ ...artRect(1476, 775, 175, 146), dim: false, r: 36 });
  }
  return Guide.hide();
}
