import { AudioSys } from '../audio/audio.js';
import { Decl } from '../compta/declaration.js';
import { URLS, need } from '../core/assets.js';
import { backdrop } from '../core/layout.js';
import { G, hadOldSave, persist, state } from '../core/save.js';
import { $, esc, reduceMotion, wait } from '../core/utils.js';
import { TOWN_CABS } from '../data/town-map.js';
import { MAPS } from '../data/worlds.js';
import { TitleFX } from '../fx/effects.js';
import { Fade } from '../fx/transitions.js';
import { Career } from '../game/career.js';
import { Month } from '../game/month.js';
import { Hire } from '../game/staff.js';
import { Cam } from './camera.js';
import { Room } from './room.js';
import { Town } from './town.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { Guide, refreshGuide } from '../ui/guide.js';
import { toast } from '../ui/helpers.js';
import { HUD } from '../ui/hud.js';
import { blocked } from '../ui/modals.js';

/* ================= Scenes ================= */
export const titleScene = $('titleScene'), townScene = $('townScene'), cabScene = $('cabScene');
const SCENES = ['titleScene', 'townScene', 'cabScene', 'ordreScene', 'donjonScene', 'inScene', 'tribScene'];
export function showOnly(id, hud = true) { for (const s of SCENES) $(s).hidden = s !== id; $('hudLayer').hidden = !hud; }
export function setBackdrop(key) { backdrop.style.backgroundImage = `url("${URLS[key]}")`; backdrop.classList.add('on'); }
export function showTitle() {
  state.screen = 'title'; Guide.hide();
  showOnly('titleScene', false); setBackdrop('title');
  TitleFX.alpha = 0; TitleFX.setup();
  titleScene.classList.remove('idle', 'intro'); void titleScene.offsetWidth; titleScene.classList.add('intro');
  const cam = titleScene.querySelector('.cam');
  const onEnd = (e) => { if (e.target !== cam) return; cam.removeEventListener('animationend', onEnd); titleScene.classList.replace('intro', 'idle'); };
  cam.addEventListener('animationend', onEnd);
  if (reduceMotion) titleScene.classList.replace('intro', 'idle');
}
/* The town (or one of the other maps). `look`: art point to centre the camera on. */
export function showTown(look) {
  const M = MAPS[G.map] || MAPS.main;
  state.screen = 'town'; state.roomCab = null;
  showOnly('townScene'); setBackdrop(M.img);
  const bg = $('townBg'); if (bg.dataset.key !== M.img) { bg.src = URLS[M.img]; bg.dataset.key = M.img; }
  townScene.dataset.map = G.map;
  Town.reset(); HUD.render(); Hire.check();
  if (look) Cam.look(look[0], look[1]); else Cam.apply();
  const theme = M.music; if (AudioSys.theme !== theme && !Talk.active) AudioSys.setTheme(theme);
}
function showCabinet(cab) {
  state.screen = 'cabinet'; state.roomCab = cab;
  showOnly('cabScene'); setBackdrop('cab_in');
  Town.offerCar = null; Town.cars = Town.cars.filter((c) => !c.offer);
  Room.enter(cab); HUD.render();
}
export const Scenes = {
  async enterCabinet(cab) {
    if (state.busy) return;
    state.busy = true;
    const C = TOWN_CABS[cab];
    await need(Room.sheetsFor(cab));
    await Fade.transition(async () => { showCabinet(cab); }, C && C.map === G.map ? { el: $('townArt'), x: C.cx, y: C.cy - 40 } : null);
    state.busy = false;
    if (cab === 'C' && !G.flags.cabFirstOwn) { G.flags.cabFirstOwn = true; persist(); toast('Bienvenue chez toi ! Les <b>+</b> lumineux montrent où installer ton matériel.', 4200); }
    Room.syncUi(); refreshGuide();
  },
  async exitCabinet() {
    if (blocked()) return;
    state.busy = true; AudioSys.tap();
    const C = TOWN_CABS[Room.cab];
    await Fade.transition(async () => { showTown(C && C.map === G.map ? [C.cx, C.cy] : null); });
    state.busy = false; refreshGuide();
  }
};
export async function onTownEnter() {
  state.busy = true;
  HUD.shown = G.money; HUD.render();
  await wait(350);
  if (G.phase === 'demarches' && !G.tutoDone) { await Talk.open(); await SCRIPTS.welcome(); await Talk.close(); G.tutoDone = true; persist(); }
  else if (G.pseudo) toast(`Content de te revoir, <b>${esc(G.pseudo)}</b> !`);
  if (hadOldSave && !G.flags.v4note) { G.flags.v4note = true; persist(); await wait(1000); toast(`Nouvelle version : ta carrière commence maintenant <b>dès le diplôme</b> !`, 4800); }
  if (G.introDone && !G.flags.v5note && G.months > 0) { G.flags.v5note = true; persist(); await wait(800); toast('Nouveautés : une nouvelle ville, trois destinations (flèches au bord de la carte), la cotation NGAP… Bonne visite !', 4800); }
  state.busy = false;
  if (G.pendingDecl) { state.busy = true; await Decl.run(G.pendingDecl); await Month.annual(); state.busy = false; }
  if (G.phase === 'rempl' && G.assistOffer && !G.contract) Career.offerAssist();
  Career.onTownEnter();
  refreshGuide();
}
