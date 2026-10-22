import { AudioSys } from '../audio/audio.js';
import { furnishSeconds } from '../core/prefs.js';
import { G, persist, state } from '../core/save.js';
import { esc } from '../core/utils.js';
import { ITEMS } from '../data/shop-items.js';
import { Fade } from '../fx/transitions.js';
import { Intro } from '../scenes/intro.js';
import { Room } from '../scenes/room.js';
import { toast } from '../ui/helpers.js';
import { Shop } from '../ui/shop.js';

/* ================= Furniture of your cabinet: every item bought in the shop takes a while to be assembled ================= */
export const Furnish = {
  list() { return G.furnish || (G.furnish = {}); },
  pending(id) { return !!this.list()[id]; },
  progress(id) { const f = this.list()[id]; return f ? Math.min(1, f.t / f.dur) : 1; },
  left(id) { const f = this.list()[id]; return f ? Math.max(0, Math.ceil(f.dur - f.t)) : 0; },
  secs(id) { return Math.round(furnishSeconds(ITEMS[id].build || 10)); },
  begin(id, d) {
    this.list()[id] = { t: 0, dur: furnishSeconds(ITEMS[id].build || 10), y: d.y, m: d.m }; persist();
    if (state.screen === 'cabinet' && Room.cab === 'C') Room.dropCrate(id);
  },
  tick(dt) {
    const L = this.list(); if (Fade.active || Intro.active) return;
    for (const id in L) { L[id].t += dt; if (L[id].t >= L[id].dur) this.finish(id); }
  },
  finish(id) {
    const f = this.list()[id]; if (!f) return;
    G.owned[id] = { y: f.y, m: f.m }; delete this.list()[id]; persist();
    AudioSys.success();
    if (state.screen === 'cabinet' && Room.cab === 'C') Room.newItem(id);
    else Shop.pendingFlash.push(id);
    toast(`Montage terminé : <b>${esc(ITEMS[id].name)}</b> est prêt${ITEMS[id].kind === 'station' ? ' (un poste de plus !)' : ''}.`, 3600);
    if (state.shopOpen) Shop.render();
    Room.renderSlots(); Room.syncUi();
  },
  /* Admin: everything is assembled at once. */
  finishAll() { for (const id of Object.keys(this.list())) this.finish(id); }
};
