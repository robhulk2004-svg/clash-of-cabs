import { AudioSys } from '../audio/audio.js';
import { G, persist, state } from '../core/save.js';
import { fmt } from '../core/utils.js';
import { ECO } from '../data/economy.js';
import { book } from './month.js';
import { assistPostes, rendement, staffBonus } from './session.js';
import { staffList } from './staff.js';
import { Cam } from '../scenes/camera.js';
import { TOWN_CABS } from '../data/town-map.js';
import { MONEY_PT, coinFlight, floatText, stageRect, toast } from '../ui/helpers.js';
import { HUD } from '../ui/hud.js';

/* ================= The redevances of your assistants pile up while you play, like a gold mine =================
   Each month, your assistants owe you a redevance: a share of the honoraires they cash on the postes you leave them.
   It accrues in real time (a whole month in FILL seconds), up to what they owe you for the month; touch the coins
   above your cabinet to collect it. In the books, it is booked as « gains divers » when you collect it. */
const FILL = 180;
export const Mine = {
  /* what your assistants owe you for a month */
  monthly() { return staffList().reduce((s, x, i) => s + Math.round(Math.round(assistPostes(i) * ECO.slot * rendement() * (1 + staffBonus(x.who))) * x.rate), 0); },
  on() { return G.phase === 'titulaire' && G.cab.level >= 1 && staffList().length > 0; },
  room() { return Math.max(0, this.monthly() - (G.mine.sum || 0)); },
  tick(dt) {
    if (!this.on()) { G.mine.at = Date.now(); return; }
    const M = this.monthly(); if (!M) return;
    G.mine.acc = Math.min(this.room(), (G.mine.acc || 0) + (M / FILL) * dt);
    G.mine.at = Date.now();
  },
  /* the time you were away (game closed) counts too, up to a whole month */
  catchUp() { if (G.mine.at && this.on()) this.tick(Math.min(FILL, Math.max(0, (Date.now() - G.mine.at) / 1000))); },
  amount() { return Math.floor(G.mine.acc || 0); },
  /* a coin shows after 10 seconds of work */
  ready() { if (!this.on()) return false; const M = this.monthly(); return M > 0 && this.amount() >= 1 && (G.mine.acc || 0) >= (M / FILL) * 10; },
  level() { const M = this.monthly() || 1, k = (G.mine.acc || 0) / M; return k > 0.6 ? 3 : k > 0.25 ? 2 : 1; },
  full() { const r = this.room(); return r > 0 && (G.mine.acc || 0) >= r - 0.5; },
  collect(el) {
    const a = this.amount(); if (a <= 0 || state.busy) return;
    G.mine.acc -= a; G.mine.sum = (G.mine.sum || 0) + a; G.money += a;
    book('Redevances de tes assistants (récoltées au cabinet)', a, 'gains', 'redevance');
    persist(); AudioSys.cash();
    const C = TOWN_CABS.C, p = el ? (() => { const r = stageRect(el); return { x: r.x, y: r.y - 30 }; })() : Cam.toStage(C.cx, C.cy - 60);
    floatText(p.x, p.y, `+${fmt(a)} €`, 'pos', 1400); coinFlight(p.x, p.y, MONEY_PT.x, MONEY_PT.y, Math.min(9, 3 + Math.round(a / 300)));
    HUD.tweenMoney(); HUD.render();
    if (!G.flags.mineTip) { G.flags.mineTip = true; persist(); toast('Les <b>redevances</b> de tes assistants ! Elles s’accumulent pendant que tu joues, jusqu’à un mois entier : reviens les récolter. Pour ta compta, ce sont des <b>gains divers</b>.', 5600); }
  }
};
