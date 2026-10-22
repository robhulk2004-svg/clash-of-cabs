import { AudioSys } from './audio/audio.js';
import { Decl } from './compta/declaration.js';
import { Compta, dotation, impot, yearBooks } from './compta/ledger.js';
import { ASSETS, URLS, fetchAsset, imgReady, loadImg, markDecoded, takeMusicData } from './core/assets.js';
import { layout, stage } from './core/layout.js';
import { sessionSeconds } from './core/prefs.js';
import { G, PRE_DATE, freshSave, jEntry, persist, replaceSave, state, working } from './core/save.js';
import { $, TEST, frSpace, wait } from './core/utils.js';
import { TIPS } from './data/tips.js';
import { TitleFX, TownFX, UIFX, sampleOpaque } from './fx/effects.js';
import { Clouds, Fade } from './fx/transitions.js';
import { Board } from './game/board.js';
import { Build } from './game/build.js';
import { Career } from './game/career.js';
import { Contracts } from './game/contracts.js';
import { Day } from './game/day.js';
import { Formation } from './game/formation.js';
import { Fraude } from './game/fraude.js';
import { Furnish } from './game/furnish.js';
import { Incident } from './game/incident.js';
import { Syndic } from './game/syndicat.js';
import { Team, registerTeamActors } from './game/team.js';
import { Admin } from './ui/admin.js';
import { Letters } from './game/letters.js';
import { Month } from './game/month.js';
import { Quests, resetQuestTab } from './game/quests.js';
import { Session } from './game/session.js';
import { Calls, Hire } from './game/staff.js';
import { Street } from './game/street.js';
import { Cam } from './scenes/camera.js';
import { CASTLE_SCRIPTS, Castle } from './scenes/castle.js';
import { DONJON_SCRIPTS, Donjon } from './scenes/donjon.js';
import { Intro } from './scenes/intro.js';
import { Room } from './scenes/room.js';
import { Scenes, onTownEnter, setBackdrop, showTitle, showTown, titleScene } from './scenes/scenes.js';
import { Town } from './scenes/town.js';
import { CONFRERE_SCRIPTS } from './story/confreres.js';
import { SCRIPTS } from './story/scripts.js';
import { Talk } from './story/talk.js';
import { toast } from './ui/helpers.js';
import { HUD } from './ui/hud.js';
import { Guide } from './ui/guide.js';
import { ICON } from './ui/icons.js';
import { blocked, closeModal, modalOpen, openModal } from './ui/modals.js';
import { syncSettings } from './ui/settings.js';
import { Shop } from './ui/shop.js';

/* ================= Main loop ================= */
Object.assign(SCRIPTS, CONFRERE_SCRIPTS, CASTLE_SCRIPTS, DONJON_SCRIPTS); let lastT = 0, saveT = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - (lastT || t)) / 1000); lastT = t;
  saveT += dt; if (saveT > 4) { saveT = 0; if (state.started && (G.sess.state === 'run' || G.cab.build || G.letters.length)) persist(); }
  if (state.screen === 'title') TitleFX.update(dt);
  else if (state.screen === 'town') { TownFX.update(dt); Town.update(dt); Cam.update(dt); }
  else if (state.screen === 'cabinet') Room.update(dt);
  else if (state.screen === 'ordre') Castle.update(dt);
  else if (state.screen === 'donjon') Donjon.update(dt);
  if (Fraude.active) Fraude.update(dt);
  if (state.started && working()) { Session.update(dt); Letters.tick(dt); Build.tick(dt); Formation.tick(dt); Furnish.tick(dt); }
  if (!Guide.el.hidden && modalOpen() && !state.shopOpen) Guide.hide();   // a modal opened on top of the tutorial arrow
  UIFX.update(dt); Clouds.tick(t);
  requestAnimationFrame(frame);
}

/* ================= Buttons & keys ================= */
const hitActions = {
  hitCastle: () => Castle.enter(),
  hitDepot: () => toast(G.phase === 'titulaire' ? 'Ton entrepôt : ton matériel s’achète dans la <b>Boutique</b>, onglet Matériel.' : "L'entrepôt de matériel de la ville. Le tien viendra avec ton cabinet !")
};
for (const id in hitActions) {
  const el = $(id); const go = () => { if (blocked()) return; AudioSys.tap(); hitActions[id](); };
  el.addEventListener('click', go); el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
}
const PLUS = {
  money: () => (G.phase === 'rempl' ? 'Remplaçant : chaque mois de remplacement rapporte des honoraires… dont tu reverses une part au titulaire.' : G.phase === 'assist' ? "Assistant : tu gardes tes honoraires moins la redevance d'Ambroise. Économise pour ton apport !" : G.phase === 'titulaire' ? 'Titulaire : tes honoraires dépendent de tes postes de soins et de ton rendement.' : 'Pour gagner ta vie, il faudra soigner des patients !'),
  patients: () => `Ta patientèle : <b>${G.patients}</b>. Elle grandit quand tu réponds aux passants et quand tu soignes ${G.phase === 'rempl' ? '(mais en remplacement, les patients restent ceux du titulaire !)' : 'tes patients.'}`,
  staff: () => (G.phase === 'titulaire' ? (Team.open() ? null : 'Ton équipe se formera quand ton cabinet sera construit.') : "Recruter un assistant ? Il faudra d'abord avoir ton propre cabinet !")
};
document.querySelectorAll('[data-plus]').forEach((b) => b.addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); const m = PLUS[b.dataset.plus](); if (m) toast(m); }));
$('btnShop').addEventListener('click', () => { AudioSys.unlock(); Shop.open(); });
$('btnQuests').addEventListener('click', () => { if (blocked() || state.shopOpen) return; resetQuestTab(); openModal('quests'); });
$('btnCompta').addEventListener('click', () => { if (blocked()) return; Compta.tab = 'journal'; Compta.year = null; openModal('compta'); });
$('btnBoard').addEventListener('click', () => { if (blocked()) return; Board.open(); });
$('btnGear').addEventListener('click', () => { if (Talk.active || modalOpen() || Fade.active || Intro.active) return; openModal('settings'); });
$('btnExit').addEventListener('click', () => Scenes.exitCabinet());
$('btnSession').addEventListener('click', () => { AudioSys.unlock(); Session.start(); });
$('btnCollect').addEventListener('click', () => { if (blocked()) return; Session.collect(); });
$('btnCompta').innerHTML = `${ICON.ledger}<span>Compta</span>`;
$('btnOrdreExit').innerHTML = `${ICON.door}<span>Sortir</span>`;
$('btnBoard').innerHTML = `${ICON.board}<span>Offres</span><span class="gb-badge" hidden>0</span>`;
$('btnCollect').innerHTML = `${ICON.coin}<span class="bs-txt"><span>Encaisser le mois</span><small>Ta séance est terminée !</small></span>`;
addEventListener('keydown', (e) => {
  if (Intro.active) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Intro.tap(); } if (e.key === 'Escape') Intro.skip(); return; }
  if (Talk.active) {
    if (Talk.keyPick) { const k = { 1: 0, 2: 1, 3: 2, a: 0, b: 1, c: 2 }[e.key.toLowerCase()]; if (k != null) { e.preventDefault(); Talk.keyPick(k); return; } }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Talk.tap(); }
    return;
  }
  if (e.key === 'Escape') {
    for (const id of ['settings', 'quests', 'compta', 'board', 'finance', 'team', 'admin']) if (!$(id).hidden) { closeModal(id); return; }
    if (!$('syndic').hidden) { Syndic.close(null); return; }
    if (state.shopOpen && !state.busy) Shop.close();
  }
});

/* ================= Restart ================= */
function seedJournal() { if (!G.journal.length) G.journal.push(jEntry(G, PRE_DATE, 'Apport personnel : économies sur le compte pro', 3000, 'hors', 'apport')); }
export async function restartGame() {
  replaceSave(freshSave()); seedJournal(); persist();
  $('settings').hidden = true; Shop.close(true);
  Town.walkers = []; Town.cars = []; Town.npcs = []; Town.offerCar = null; Town.pop = {};
  HUD.shown = G.money; HUD.render();
  state.busy = true;
  await Clouds.transition(async () => { showTitle(); });
  state.busy = false;
}
/* ================= Boot ================= */

const playBtn = $('playBtn');
playBtn.addEventListener('click', async () => {
  if (state.busy || state.screen !== 'title') return;
  state.busy = true; AudioSys.unlock(); AudioSys.pop();
  playBtn.classList.add('pressed'); await wait(140); playBtn.classList.remove('pressed');
  if (!G.introDone) {
    await Clouds.transition(async () => { titleScene.hidden = true; state.screen = 'intro'; Intro.prepare(); });
    state.busy = false;
    await Intro.play();
    state.busy = true;
    await Clouds.transition(async () => { showTown(); });
  } else await Clouds.transition(async () => { showTown(); });
  state.busy = false;
  onTownEnter();
});
async function boot() {
  seedJournal();
  if (G.sess.state === 'closing') G.sess = { state: 'idle', t: 0, dur: sessionSeconds(), where: null };
  if (G.sess.day && G.sess.state === 'run') Day.resume();
  persist();

  layout(); syncSettings(); HUD.render();
  AudioSys.init(); Cam.init(); requestAnimationFrame(frame);
  let tipI = 0; const tipEl = $('tipText');
  const tipTimer = setInterval(() => { tipEl.style.opacity = 0; setTimeout(() => { tipI = (tipI + 1) % TIPS.length; tipEl.textContent = frSpace(TIPS[tipI]); tipEl.style.opacity = 1; }, 350); }, 5200);
  tipEl.textContent = frSpace(TIPS[0]);

  await fetchAsset('logo_clean');
  await imgReady($('loaderLogo'), URLS.logo_clean); $('loaderLogo').classList.add('on');
  await Promise.all(Object.keys(ASSETS).filter((k) => k !== 'logo_clean').map(fetchAsset));
  await AudioSys.decode(takeMusicData());
  registerTeamActors();

  stage.style.setProperty('--logo-url', `url("${URLS.logo}")`);
  stage.style.setProperty('--pill-url', `url("${URLS.pill}")`);
  stage.style.setProperty('--hud-url', `url("${URLS.hud}")`);
  const canvasImgs = ['cars', 'table_premium', ...Object.keys(ASSETS).filter((k) => /^(p_|eq_|av_|c\d|bld_|qd_|qte_)/.test(k))];
  await Promise.all([
    imgReady($('titleBg'), URLS.title), imgReady($('logoImg'), URLS.logo), imgReady($('pillImg'), URLS.pill),
    imgReady($('char_l'), URLS.char_l), imgReady($('char_w'), URLS.char_w), imgReady($('char_r'), URLS.char_r),
    imgReady($('townBg'), URLS.town2), imgReady($('donjonBg'), URLS.donjon), imgReady($('cabBg'), URLS.cab_in), imgReady($('ordreBg'), URLS.ordre_in), imgReady($('hudImg'), URLS.hud),
    imgReady($('imgShop'), URLS.btnshop), imgReady($('imgQuests'), URLS.btnquests),
    ...canvasImgs.map(loadImg),
    ...Object.keys(ASSETS).filter((k) => /_(happy|think|scared)$|^goblin$|^card_|^intro\d|^ic_table|^ic_electro/.test(k)).map((k) => loadImg(k))
  ]);
  TitleFX.logoPts = sampleOpaque($('logoImg'), { x: 532, y: 6, w: 606, h: 312 }, 260, 240, 170);
  TitleFX.pillPts = sampleOpaque($('pillImg'), { x: 600, y: 710, w: 471, h: 123 }, 80, 240, 200);
  $('frLogo').src = URLS.qte_logo; $('frReadyLogo').src = URLS.qte_logo; $('frGaugeImg').src = URLS.qte_gauge; $('frBg').src = URLS.qte_night;
  markDecoded();
  await wait(250);
  const loader = $('loader'); loader.classList.add('ready'); setBackdrop('title');

  let viaKeyboard = false;
  const go = () => {
    if (state.started) return; state.started = true;
    loader.removeEventListener('pointerdown', go); removeEventListener('keydown', key); clearInterval(tipTimer);
    AudioSys.unlock(); AudioSys.startMusic(); AudioSys.pop();
    setTimeout(() => AudioSys.loadThemes(), 1500);

    showTitle();
    loader.classList.add('out'); setTimeout(() => { loader.hidden = true; }, 700);
    if (viaKeyboard) setTimeout(() => playBtn.focus({ preventScroll: true }), 2600);
  };
  const key = (e) => { if (['Enter', ' ', 'Spacebar'].includes(e.key)) { e.preventDefault(); viaKeyboard = true; go(); } };
  loader.addEventListener('pointerdown', go); addEventListener('keydown', key);
  /* admin mode: after a jump, go straight back into the town */
  if (Admin.autoplay()) { go(); setTimeout(() => playBtn.click(), 900); }
  /* Hooks for automated tests (only when window.__COC_TEST is set before loading) */
  if (TEST) window.__coc = { G: () => G, setG: (g) => { replaceSave(g); persist(); }, state, Session, Room, Town, Shop, Decl, Board, Contracts, Letters, Month, Calls, Street, Career, Build, Hire, Intro, yearBooks, impot, dotation, Scenes, AudioSys, Quests, Talk, SCRIPTS, Castle, Day, Cam, Formation, Fraude, Donjon, Team, Syndic, Incident, Furnish, Admin };
}

boot();

/* Installable app: offline cache (not on localhost, so that edits show up immediately while developing) */
if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  navigator.serviceWorker.register('sw.js').then((reg) => reg.update()).catch(() => {});
  /* a new version was installed while playing: reload once so that every file comes from the same version */
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded || state.started) return; reloaded = true; location.reload(); });
}
