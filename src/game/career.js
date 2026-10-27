import { AudioSys } from '../audio/audio.js';
import { URLS, need } from '../core/assets.js';
import { sessionSeconds } from '../core/prefs.js';
import { G, START_DATE, gx, persist, state } from '../core/save.js';
import { deName, eur, fmt, frSpace, wait } from '../core/utils.js';
import { ECO } from '../data/economy.js';
import { MISSIONS } from '../data/offers.js';
import { TOWN_CABS, doorOf } from '../data/town-map.js';
import { Fade } from '../fx/transitions.js';
import { Board, offerDef } from './board.js';
import { Contracts } from './contracts.js';
import { Cpam } from './cotation.js';
import { Visit, book } from './month.js';
import { Quests } from './quests.js';
import { Hire } from './staff.js';
import { charSheets } from '../render/sprites.js';
import { Cam } from '../scenes/camera.js';
import { Room } from '../scenes/room.js';
import { showTown } from '../scenes/scenes.js';
import { Town } from '../scenes/town.js';
import { Incidents } from '../scenes/tribunal.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { Choice } from '../ui/choice.js';
import { refreshGuide } from '../ui/guide.js';
import { toast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { blocked, showReward } from '../ui/modals.js';

/* ================= The career: remplaçant (Thomas, Julien) → assistant (Mathieu, La Réunion) → titulaire (+ missions: Chad, Suzie) ================= */
export const Career = {
  canCreate() { return G.phase === 'assist' && G.monthsAssist >= ECO.assistMin && G.cab.level === 0 && !G.cab.build; },
  createHint(long) {
    if (G.phase === 'titulaire') return 'Déjà créé';
    if (G.phase !== 'assist') return long ? "D'abord une année de remplacement, puis de l'assistanat !" : 'Après l’assistanat';
    if (G.monthsAssist < ECO.assistMin) return long ? `Encore un peu d'expérience : <b>${G.monthsAssist} / ${ECO.assistMin} mois</b> d'assistanat.` : `Assistanat ${G.monthsAssist}/${ECO.assistMin} mois`;
    return long ? `Il te faut <b>${eur(ECO.apportMin)}</b> d'apport (tu as ${eur(G.money)}).` : `Apport ${fmt(G.money)} / ${fmt(ECO.apportMin)} €`;
  },
  /* End of the démarches: Mickael Menton (syndicats), then the remplacement year starts. */
  async toRempl() {
    await this.mentonCome();
    G.phase = 'rempl'; G.date = { ...START_DATE }; Board.init(); persist(); HUD.render();
    await Talk.open(); await SCRIPTS.remplIntro(); await Talk.close();
    await this.thomasWalk();
    HUD.render(); Town.updateDom(); refreshGuide();
  },
  /* Thomas comes out of his cabinet: he is looking for a remplaçant */
  async thomasWalk() {
    if (state.screen !== 'town' || G.map !== 'main' || !Town.nodes || !Town.nodes.door_A) { await Talk.open(); await SCRIPTS.thomasHello(); await Talk.close(); return; }
    await need(charSheets('thomas'));
    const [x, y] = doorOf('A'); await Cam.flyTo(x, y - 30, null, 700);
    const n = Town.npc('thomas', { x, y, speed: 55, alpha: 0 });
    await new Promise((res) => { Town.walkNpc(n, Town.nodeNear(x, y, 50, 180), res); setTimeout(res, 5000); });
    n.pose = 'wave';
    await Talk.open(); await SCRIPTS.thomasHello(); await Talk.close();
    Town.walkNpc(n, 'door_A', () => { n.fade = -1; });
  },
  async startRempl(o, rate) {
    const d = offerDef(o), C = TOWN_CABS[d.cab], first = !G.q.sign;
    if (G.flags.lastCab && G.flags.lastCab !== d.cab) await Quests.done('two');
    G.contract = { kind: 'rempl', cab: d.cab, tit: C.tit, months: d.months, done: 0, H: d.H, r: rate, km: d.km, housing: !!d.housing, extra: d.extra || [], def: o.def };
    G.sess = { state: 'idle', t: 0, dur: sessionSeconds(), where: null };
    persist();
    await showReward({ ribbon: 'Contrat signé !', artHTML: `<img src="${URLS[C.icon || C.img]}" alt="">`, title: C.name, gains: [`${d.months} mois de remplacement`, `Rétrocession : ${Math.round(rate * 100)} %`, d.housing ? 'Logement fourni' : `${d.km} km du domicile`], xp: 0 });
    await Quests.done('sign');
    const v = state.screen === 'town' && G.map === C.map ? await Visit.come(C.who, 'talk') : null;
    await Talk.open(); await SCRIPTS.titKeys(G.contract); await SCRIPTS.remplStart(G.contract, first); await Talk.close();
    if (v) Visit.leave(v);
    Town.renderDom();
  },
  /* After 12 months of remplacement: Mathieu comes from La Réunion with an offer of assistanat. */
  async toAssist() {
    for (const o of G.board) o.state = 'gone';
    G.assistOffer = { ver: 1, bad: ['indep'], state: 'draft' }; persist(); HUD.render(); Town.updateDom();
    const v = await Visit.come('mathieu');
    await Talk.open(); await SCRIPTS.assistOffer(); await Talk.close();
    Visit.leave(v);
    this.offerAssist();   // not awaited: the month is still closing (state.busy), the contract opens right after
  },
  assistDraft() { return G.phase === 'rempl' && !G.contract && !!G.assistOffer && G.assistOffer.state === 'draft'; },
  /* Re-open Mathieu's contract as soon as nothing else is on screen. */
  async offerAssist() {
    for (let i = 0; i < 600; i++) {
      if (!this.assistDraft()) return;
      if (!blocked()) { Contracts.open('assist', G.assistOffer); return; }
      await wait(250);
    }
  },
  async startAssist(rate) {
    G.phase = 'assist'; G.assistOffer = null;
    G.contract = { kind: 'assist', cab: 'R', tit: 'Mathieu Mopourmot', months: 9999, done: 0, r: rate, km: 4 };
    G.sess = { state: 'idle', t: 0, dur: sessionSeconds(), where: null };
    persist(); HUD.render();
    await showReward({ ribbon: gx('Assistant libéral !', 'Assistante libérale !'), artHTML: `<img class="photo" style="border-radius:50%;width:220px;height:220px" src="${URLS.av_mathieu}" alt="">`, title: 'Cabinet de Saint-Gilles · La Réunion', gains: ['Une patientèle stable', `Redevance : ${Math.round(rate * 100)} %`, 'Lettre-clé du DOM : 2,43 €'], xp: 0 });
    await Quests.done('asign');
    await Talk.open(); await SCRIPTS.assistStart(rate); await Talk.close();
    Town.renderDom(); refreshGuide();
  },
  /* Called after each month, once the calendar has moved on. */
  async afterMonth() {
    const ev = G.events, d = G.date;
    const talk = async (fn, ...a) => { await Talk.open(); const r = await SCRIPTS[fn](...a); await Talk.close(); return r; };
    if (G.phase === 'rempl') {
      if (G.monthsRempl === 1 && !ev.firstReceipts) { ev.firstReceipts = true; persist(); await talk('firstReceipts'); }
      if (G.monthsRempl === 2 && !ev.marvin1) {
        ev.marvin1 = true; persist(); AudioSys.setTheme('urssaf');
        const v = await Visit.come('marvin', 'idle'); const ok = await talk('marvinIntro'); Visit.leave(v); if (ok) await addXP(10);
      }
      if (G.monthsRempl === 3 && !ev.goblin) { ev.goblin = true; persist(); AudioSys.setTheme('cnam'); await wait(600); const ok = await talk('goblinCheck', G.contract ? G.contract.tit : 'ton titulaire'); if (ok) await addXP(15); }
      if (G.monthsRempl === 4 && !ev.amende) { ev.amende = true; book('Amende de stationnement (visite à domicile)', -35, 'hors', 'amende'); G.money -= 35; persist(); HUD.tweenMoney(); await talk('amende'); }
      if (d.y === START_DATE.y && d.m === 10 && !ev.agaReminder && !G.owned.aga) { ev.agaReminder = true; persist(); await talk('agaReminder'); }
      if (G.contract && G.contract.done >= G.contract.months) {
        const c = G.contract; await Talk.open(); await SCRIPTS.titBye(c); await SCRIPTS.remplEnd(c); await Talk.close();
        G.flags.lastCab = c.cab; G.contract = null; persist(); Board.refill();
        if (G.monthsRempl >= 12) { await Quests.done('year'); await this.toAssist(); }
        else if (state.screen === 'cabinet') await Fade.transition(async () => { showTown(); });
      }
    } else if (G.phase === 'assist') {
      if (G.monthsAssist === 3 && !ev.urssaf) {
        ev.urssaf = true; persist(); AudioSys.setTheme('urssaf');
        const v = await Visit.come('marvin', 'read'); if (v === 'room' && Room.visitor) Room.visitor.pose = 'read';
        const n = await talk('urssafControl'); Visit.leave(v);
        if (n < 2) { book('Majoration URSSAF (contrôle)', -150, 'hors', 'penalite'); G.money -= 150; persist(); HUD.tweenMoney(); }
        await Quests.done('urssaf');
      }
      if (G.monthsAssist >= ECO.assistMin) await Quests.done('six');
      if (G.money >= ECO.apportMin && G.monthsAssist >= 1) await Quests.done('apport');
      if (this.canCreate() && G.money >= ECO.apportMin && !ev.canCreate) { ev.canCreate = true; persist(); await talk('canCreate'); }
    } else if (G.phase === 'titulaire') {
      if (!ev.titFirst && G.cab.level >= 1) { ev.titFirst = true; persist(); await talk('titFirst'); }
      if (!ev.rocketHint && G.cab.level >= 5 && G.flags.visitMichigan) { ev.rocketHint = true; persist(); await talk('rocketHint'); }
      Hire.check();
    }
    /* v5: the Ordre after an incident, the goblin of the CPAM checks your cotations */
    await Incidents.afterMonth();
    if (Cpam.due()) await Cpam.control();
    persist(); HUD.render();
  },
  /* Mickael Menton, kiné and syndiqué, comes to talk about the syndicats right after your démarches. */
  async mentonCome() {
    if (G.q.menton) return;
    await need(charSheets('menton'));
    const v = await Visit.come('menton', 'talk');
    await this.mentonTalk();
    Visit.leave(v);
  },
  async mentonTalk() {
    const was = state.busy; state.busy = true;
    await Talk.open(); const ok = await SCRIPTS.menton(); await Talk.close();
    if (ok) await addXP(10);
    await Quests.done('menton'); state.busy = was; refreshGuide();
  },
  onTownEnter() {
    if (G.phase !== 'demarches' && G.phase !== 'intro' && !G.q.menton && G.map === 'main' && !state.busy) this.mentonCome();
    Hire.check();
  },

  /* ---------- Missions abroad: Chad Cook (Michigan), Suzie Taillebois (the Moon) ---------- */
  onMission() { return !!(G.mission && G.mission.state === 'work'); },
  /* the host offers you a mission: you are a titulaire on a trip to his map, and you haven't worked there yet */
  missionAt(cab) {
    const M = MISSIONS[cab], C = TOWN_CABS[cab];
    if (!M || !C || G.phase !== 'titulaire' || !G.trip || G.trip.to !== C.map || G.map !== C.map) return false;
    return !G.mission;
  },
  async missionOffer(cab) {
    if (blocked() || !this.missionAt(cab)) return;
    const M = MISSIONS[cab], C = TOWN_CABS[cab];
    state.busy = true;
    await need(['av_' + M.who, ...charSheets(M.who)]);
    await Talk.open(); await SCRIPTS['mission_' + cab](); await Talk.close(true);
    const v = await Choice.ask({ kick: `Mission · ${C.name}`, title: M.title, art: `<img src="${URLS['av_' + M.who]}" alt="" class="ch-av">`, html: frSpace(M.html), opts: [{ label: 'J’accepte la mission', value: 'yes', cls: 'go', sub: `${fmt(M.pay)} € par patient · une demi-journée = ton mois` }, { label: 'Pas maintenant', value: 'no' }] });
    if (v === 'yes') {
      G.mission = { cab, state: 'work' }; persist();
      toast(`Mission acceptée ! Touche <b>Accueillir</b> au-dessus du cabinet ${deName(C.first)}.`, 4200);
      if (Town.nodes) { const [x, y] = C.door; Cam.flyTo(x, y - 40, null, 700); }
    }
    state.busy = false; Town.renderDom(); refreshGuide();
  },
  /* the half-day of the mission is over: it is paid with the month of your trip */
  async missionDone(day) {
    const cab = G.mission.cab, C = TOWN_CABS[cab], H = Math.round(day.cash * ECO.halfDays);
    if (G.trip) G.trip.mission = { name: `${C.first} (${C.name})`, H };
    G.mission.state = 'done'; persist();
    state.busy = true;
    await Talk.open(); await SCRIPTS['missionEnd_' + cab](H); await Talk.close();
    state.busy = false;
    await addXP(40);
    await Quests.done(cab === 'M' ? 'missionM' : 'missionL');
    if (cab === 'L' && !G.flags.ending) await this.ending();
  },
  /* The end of the game: you have done everything, from your diploma to the Moon. */
  async ending() {
    G.flags.ending = true; persist();
    state.busy = true;
    await Talk.open(); await SCRIPTS.ending(); await Talk.close();
    AudioSys.fanfare();
    await showReward({ ribbon: 'Fin du jeu !', artHTML: `<img src="${URLS.fusee}" alt="" style="height:300px;width:auto;transform:rotate(-20deg)">`, title: gx('Kiné de l’espace', 'Kiné de l’espace'),
      gains: [`${G.months} mois de carrière`, `Prises en charge justes : ${G.consult.ok} / ${G.consult.n}`, `Cotations justes : ${G.ngap.ok} / ${G.ngap.n}`, `Cabinet niveau ${G.cab.level}`], xp: 100 });
    state.busy = false;
    toast('Merci d’avoir joué à <b>Clash of Cab’s</b> ! Tu peux continuer ta carrière autant que tu veux.', 5200);
    refreshGuide();
  }
};
