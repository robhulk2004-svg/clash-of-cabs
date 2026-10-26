import { AudioSys } from '../audio/audio.js';
import { URLS } from '../core/assets.js';
import { sessionSeconds } from '../core/prefs.js';
import { G, START_DATE, gx, persist, state } from '../core/save.js';
import { eur, fmt, wait } from '../core/utils.js';
import { ECO } from '../data/economy.js';
import { TOWN_CABS, doorOf } from '../data/town-map.js';
import { need } from '../core/assets.js';
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
import { refreshGuide } from '../ui/guide.js';
import { toast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { blocked, showReward } from '../ui/modals.js';

/* ================= The career: remplaçant → assistant → titulaire ================= */
export const Career = {
  canCreate() { return G.phase === 'assist' && G.monthsAssist >= ECO.assistMin && G.cab.level === 0 && !G.cab.build; },
  createHint(long) {
    if (G.phase === 'titulaire') return 'Déjà créé';
    if (G.phase !== 'assist') return long ? "D'abord une année de remplacement, puis de l'assistanat !" : 'Après l’assistanat';
    if (G.monthsAssist < ECO.assistMin) return long ? `Encore un peu d'expérience : <b>${G.monthsAssist} / ${ECO.assistMin} mois</b> d'assistanat.` : `Assistanat ${G.monthsAssist}/${ECO.assistMin} mois`;
    return long ? `Il te faut <b>${eur(ECO.apportMin)}</b> d'apport (tu as ${eur(G.money)}).` : `Apport ${fmt(G.money)} / ${fmt(ECO.apportMin)} €`;
  },
  /* End of the démarches: the remplacement year starts. */
  async toRempl() {
    G.phase = 'rempl'; G.date = { ...START_DATE }; Board.init(); persist(); HUD.render();
    await Talk.open(); await SCRIPTS.remplIntro(); await Talk.close();
    await this.ambroiseWalk();
    HUD.render(); Town.updateDom(); refreshGuide();
  },
  async ambroiseWalk() {
    if (state.screen !== 'town' || G.map !== 'main' || !Town.nodes || !Town.nodes.door_B) { await Talk.open(); await SCRIPTS.ambroiseHello(); await Talk.close(); return; }
    await need(charSheets('ambroise'));
    const [x, y] = doorOf('B'); Cam.look(x, y);
    const n = Town.npc('ambroise', { x, y, speed: 80, alpha: 0 });
    await new Promise((res) => { Town.walkNpc(n, Town.nodeNear(x, y, 90, 260), res); setTimeout(res, 5000); });
    n.pose = 'idle';
    await Talk.open(); await SCRIPTS.ambroiseHello(); await Talk.close();
    Town.walkNpc(n, 'door_B', () => { n.fade = -1; });
  },
  async startRempl(o, rate) {
    const d = offerDef(o), C = TOWN_CABS[d.cab], first = !G.q.sign;
    if (G.flags.lastCab && G.flags.lastCab !== d.cab) await Quests.done('two');
    G.contract = { kind: 'rempl', cab: d.cab, tit: C.tit, months: d.months, done: 0, H: d.H, r: rate, km: d.km, housing: !!d.housing, extra: d.extra || [], def: o.def };
    G.sess = { state: 'idle', t: 0, dur: sessionSeconds(), where: null };
    persist();
    await showReward({ ribbon: 'Contrat signé !', artHTML: `<img src="${URLS[C.icon || C.img]}" alt="">`, title: C.name, gains: [`${d.months} mois de remplacement`, `Rétrocession : ${Math.round(rate * 100)} %`, d.housing ? 'Logement fourni' : `${d.km} km du domicile`], xp: 0 });
    await Quests.done('sign');
    const v = state.screen === 'town' ? await Visit.come(TOWN_CABS[G.contract.cab].who, 'talk') : null;
    await Talk.open(); await SCRIPTS.titKeys(G.contract); await SCRIPTS.remplStart(G.contract, first); await Talk.close();
    if (v) Visit.leave(v);
    Town.renderDom();
  },
  async toAssist() {
    for (const o of G.board) o.state = 'gone';
    G.assistOffer = { ver: 1, bad: ['indep'], state: 'draft' }; persist(); HUD.render(); Town.updateDom();
    const v = await Visit.come('ambroise');
    await Talk.open(); await SCRIPTS.assistOffer(); await Talk.close();
    Visit.leave(v);
    this.offerAssist();   // not awaited: the month is still closing (state.busy), the contract opens right after
  },
  /* Re-open Ambroise's contract as soon as nothing else is on screen. */
  async offerAssist() {
    for (let i = 0; i < 600; i++) {
      if (G.phase !== 'rempl' || !G.assistOffer || G.assistOffer.state !== 'draft' || G.contract) return;
      if (!blocked()) { Contracts.open('assist', G.assistOffer); return; }
      await wait(250);
    }
  },
  async startAssist(rate) {
    G.phase = 'assist'; G.assistOffer = null;
    G.contract = { kind: 'assist', cab: 'B', tit: 'Ambroise', months: 9999, done: 0, r: rate, km: 3 };
    G.sess = { state: 'idle', t: 0, dur: sessionSeconds(), where: null };
    persist(); HUD.render();
    await showReward({ ribbon: gx('Assistant libéral !', 'Assistante libérale !'), artHTML: `<img class="photo" style="border-radius:50%;width:220px;height:220px" src="${URLS.av_ambroise}" alt="">`, title: 'Cabinet Ambroise', gains: ['Une patientèle stable', `Redevance : ${Math.round(rate * 100)} %`, 'Ambroise travaille avec toi'], xp: 0 });
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
      if (G.monthsAssist === 1 && !ev.menton) { ev.menton = true; persist(); await this.mentonCome(); }
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
      Hire.check();
    }
    /* v5: the Ordre after an incident, the goblin of the CPAM checks your cotations */
    await Incidents.afterMonth();
    if (Cpam.due()) await Cpam.control();
    persist(); HUD.render();
  },
  /* M. Menton waits in the street with something to tell you. */
  async mentonCome() {
    if (G.q.menton) return;
    await need(charSheets('menton'));
    if (state.screen === 'cabinet') { await Room.visit('menton', 'talk'); await this.mentonTalk(); Room.leaveVisitor(); return; }
    if (state.screen !== 'town' || G.map !== 'main' || !Town.nodes || Town.findNpc('menton')) return;
    const [x, y] = doorOf('B'), target = Town.nodeNear(x, y, 60, 240), start = Town.entryNode(target), [sx, sy] = Town.nodes[start];
    const n = Town.npc('menton', { x: sx, y: sy, speed: 90, alpha: 0, bubble: 'Les syndicats ?' });
    Town.walkNpc(n, target, () => { n.pose = 'talk'; });
    n.onClick = async () => { n.bubble = null; Town.renderDom(); await this.mentonTalk(); Town.walkNpc(n, start, () => { n.fade = -1; }); };
    toast("Un monsieur en costume t'attend dans la rue, près du cabinet d'Ambroise : <b>M. Menton</b> veut te parler !", 4000);
  },
  async mentonTalk() {
    const was = state.busy; state.busy = true;
    await Talk.open(); const ok = await SCRIPTS.menton(); await Talk.close();
    if (ok) await addXP(10);
    await Quests.done('menton'); state.busy = was; refreshGuide();
  },
  onTownEnter() {
    if (G.phase === 'assist' && G.events.menton && !G.q.menton && G.map === 'main' && !Town.findNpc('menton')) this.mentonCome();
    Hire.check();
  }
};
