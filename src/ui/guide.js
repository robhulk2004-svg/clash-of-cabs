import { G, firstUndone, state } from '../core/save.js';
import { $ } from '../core/utils.js';
import { ECO } from '../data/economy.js';
import { Fade } from '../fx/transitions.js';
import { Career } from '../game/career.js';
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
      const w = document.querySelector('#townDom .work'); if (!w || w.hidden) return Guide.hide();
      const b = w.querySelector(G.sess.state === 'ready' ? '.coin' : '.go'); if (!b || b.hidden) return Guide.hide();
      const r = b.querySelector('.b-in').getBoundingClientRect(), st = $('stage').getBoundingClientRect(), k = 1920 / st.width;
      return Guide.show({ x: (r.left - st.left) * k, y: (r.top - st.top) * k, w: r.width * k, h: r.height * k, dim: false, r: 24, small: true });
    }
  }
  if (G.phase === 'titulaire' && G.cab.level >= 1 && !G.q.materiel) {
    shopBtn.classList.add('nudge');
    return Guide.show({ ...artRect(1476, 775, 175, 146), dim: false, r: 36 });
  }
  return Guide.hide();
}
