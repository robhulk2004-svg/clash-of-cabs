import { AudioSys } from '../audio/audio.js';
import { sessionSeconds } from '../core/prefs.js';
import { G, persist, state, workplace } from '../core/save.js';
import { clamp } from '../core/utils.js';
import { ECO } from '../data/economy.js';
import { ITEMS } from '../data/shop-items.js';
import { PLOTS, SIGN_X } from '../data/town-map.js';
import { UIFX } from '../fx/effects.js';
import { Fade } from '../fx/transitions.js';
import { Day, DayEnd, isDayPhase } from './day.js';
import { Month } from './month.js';
import { Calls } from './staff.js';
import { Cam } from '../scenes/camera.js';
import { Intro } from '../scenes/intro.js';
import { Room } from '../scenes/room.js';
import { Town, bldBox } from '../scenes/town.js';
import { Guide, refreshGuide } from '../ui/guide.js';
import { toast } from '../ui/helpers.js';
import { HUD } from '../ui/hud.js';
import { blocked } from '../ui/modals.js';

/* ================= Sessions: welcome patients, 15 s, collect = one month of work ================= */
export function rendement() {
  let r = 1;
  if (G.owned.blouses) r += ITEMS.blouses.boost;
  for (const id in G.formations) if (G.formations[id] === 'done') r += ITEMS[id].boost;
  if (G.phase === 'titulaire') {
    for (const id in ITEMS) { const it = ITEMS[id]; if (it.kind === 'boost' && id !== 'blouses' && G.owned[id]) r += it.boost; }
    r += Math.min(0.2, G.patients / 250);
  }
  return r;
}
/* Monthly honoraires of the assistant: Ambroise's patientèle fills his agenda month after month. */
export const assistH = () => Math.min(9500, 7000 + 250 * G.monthsAssist);
export const titSlots = () => Math.min(ECO.perKine, Room.stations('C').length);
export const mathieuSlots = () => (G.staff.mathieu ? Math.min(ECO.perKine, Math.max(0, Room.stations('C').length - ECO.perKine)) : 0);
export const loanPayment = (L) => { const r = L.rate / 12; return (L.P * r) / (1 - Math.pow(1 + r, -L.n)); };

export const Session = {
  callDone: false,
  progress() { return G.sess.day ? Day.progress() : clamp(G.sess.t / (G.sess.dur || 1), 0, 1); },
  label() { return G.sess.day ? `${G.sess.day.treated}/${Day.total()} patients` : Math.ceil(Math.max(0, G.sess.dur - G.sess.t)) + ' s'; },
  canStart() { return !!workplace() && G.sess.state === 'idle' && !(G.phase === 'titulaire' && G.cab.level < 1); },
  start() {
    if (blocked()) return;
    const wp = workplace();
    if (!wp) { AudioSys.wrong(); toast(G.phase === 'rempl' ? "Signe d'abord un <b>contrat de remplacement</b> : consulte les offres !" : 'Pas de cabinet où travailler pour l’instant.'); return; }
    if (G.sess.state !== 'idle') return;
    AudioSys.unlock();
    if (isDayPhase()) {
      Day.start(wp);
      if (state.screen === 'cabinet' && Room.cab === wp) { Room.people = Room.people.filter((p) => p.sid); Day.syncRoom(); }
      AudioSys.chime(); Guide.hide(); Town.updateDom(); Room.syncUi();
      if (state.screen === 'cabinet' && !G.flags.dayRoomTip) { G.flags.dayRoomTip = true; persist(); toast('Touche <b>Soigner</b> dès qu’un poste se libère, puis touche la <b>carte</b> au-dessus du patient pour encaisser. Enchaîne vite : <b>combo</b> !', 5200); }
      if (state.screen === 'town' && !G.flags.dayTip) { G.flags.dayTip = true; persist(); toast('Ta journée commence ! Entre dans le cabinet pour <b>enchaîner les séances</b> toi-même et faire des <b>combos</b>… ou laisse-la tourner pendant que tu fais autre chose.', 5200); }
      refreshGuide(); return;
    }
    G.sess = { state: 'run', t: 0, dur: sessionSeconds(), where: wp }; persist();
    this.callDone = !(G.staff.mathieu && G.months % 3 === 1 && G.calls.total < 8);
    if (state.screen === 'cabinet' && Room.cab === wp) Room.startSession();
    if (PLOTS[wp]) Town.sendTo(wp, 2);
    AudioSys.chime(); Guide.hide(); Town.updateDom();
    if (state.screen === 'town' && !G.flags.sessTip) { G.flags.sessTip = true; persist(); toast('Tes patients sont là ! Pendant la séance, tu peux continuer à jouer : <b>réponds aux passants</b>, consulte tes offres…', 4600); }
    refreshGuide();
  },
  update(dt) {
    const s = G.sess; if (s.state !== 'run') return;
    if (s.day) { Day.update(dt); return; }
    if (!Fade.active && !Intro.active) s.t += dt;
    if (!this.callDone && s.t / s.dur > 0.4 && !blocked()) { this.callDone = true; Calls.ring(); }
    if (s.t >= s.dur) {
      s.state = 'ready'; persist(); AudioSys.coin(); AudioSys.bell();
      if (!G.flags.collectTip) { G.flags.collectTip = true; toast('Séance terminée ! Touche la <b>pièce</b> pour encaisser ton mois de travail.', 4200); }
      Town.updateDom(); refreshGuide();
    }
  },
  async collect() {
    if (G.sess.state !== 'ready' || state.busy) return;
    G.sess.state = 'closing';
    const wp = G.sess.where;
    if (state.screen === 'cabinet' && Room.cab === wp) Room.endSession();
    const from = state.screen === 'cabinet' ? { x: 1046, y: 860 } : (() => { if (wp === 'X') return Cam.toStage(SIGN_X.x, SIGN_X.y); const b = bldBox(wp); return Cam.toStage(PLOTS[wp].cx, b.y); })();
    AudioSys.cash(); UIFX.burst(from.x, from.y, 50);
    if (G.sess.day) { state.busy = true; await DayEnd.show(G.sess.day); state.busy = false; }
    await Month.close(from);
    G.sess = { state: 'idle', t: 0, dur: sessionSeconds(), where: null }; persist(); Day.reset();
    if (state.screen === 'cabinet') { if (!isDayPhase()) Room.refill(); Room.renderTeam(); Room.renderSlots(); Room.syncUi(); }
    Town.updateDom(); HUD.render(); refreshGuide();
  }
};
