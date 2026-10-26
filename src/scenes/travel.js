import { AudioSys } from '../audio/audio.js';
import { URLS, need } from '../core/assets.js';
import { G, persist, state, workplace } from '../core/save.js';
import { $, fmt, frSpace } from '../core/utils.js';
import { CANDIDATES } from '../data/staff.js';
import { MAPS } from '../data/worlds.js';
import { Clouds } from '../fx/transitions.js';
import { Board } from '../game/board.js';
import { Career } from '../game/career.js';
import { Market } from '../game/market.js';
import { Month, book } from '../game/month.js';
import { Quests } from '../game/quests.js';
import { freeCandidates } from '../game/staff.js';
import { charSheets } from '../render/sprites.js';
import { Castle } from './castle.js';
import { Interior } from './interior.js';
import { Scenes, showTown } from './scenes.js';
import { Town } from './town.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { Choice } from '../ui/choice.js';
import { refreshGuide } from '../ui/guide.js';
import { toast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { blocked } from '../ui/modals.js';
import { Shop } from '../ui/shop.js';

/* ================= Travelling between the maps: Maransin (vélo), La Réunion (bateau), le Michigan (jet privé) ================= */
const LABEL = { main: 'Retour en ville', maransin: 'Maransin', reunion: 'La Réunion', michigan: 'Michigan' };
const VEH = { maransin: 'velo', reunion: 'bateau', michigan: 'jet' };
const LOCK = {
  maransin: 'Maransin est à 45 km : achète un <b>vélo</b> dans la Boutique (onglet Véhicules)… ou signe un remplacement là-bas !',
  reunion: 'Pour rejoindre La Réunion, il te faut un <b>bateau</b> (Boutique, onglet Véhicules).',
  michigan: 'Le Michigan, c’est loin : il te faut un <b>jet privé</b> (Boutique, onglet Véhicules).'
};
/* the characters you meet on each map */
const MAP_NPCS = {
  maransin: [{ who: 'julien', at: [600, 690], pose: 'wave', bubble: 'Julien', act: 'julien' }],
  reunion: [{ who: 'mathieu', at: [410, 330], pose: 'wave', bubble: 'Mathieu', act: 'mathieu', poseFlip: true }],
  michigan: [{ who: 'chad', at: [1150, 640], pose: 'idle', bubble: 'Chad Cook', act: 'chad', k: 1.05 }]
};
export const Travel = {
  label(to) { return LABEL[to] || to; },
  open(to) {
    if (to === 'main') return true;
    if (to === 'maransin') return !!G.veh.velo || workplace() === 'X' || !!G.flags.adminMaps;
    if (to === 'reunion') return !!G.veh.bateau || !!G.flags.adminMaps;
    if (to === 'michigan') return !!G.veh.jet || !!G.flags.adminMaps;
    return false;
  },
  /* the pictures a map needs before it shows: the map, its characters, your cabinet (or its construction site) */
  sheetsFor(id) {
    const out = [MAPS[id].img, ...(MAP_NPCS[id] || []).flatMap((n) => charSheets(n.who))];
    if (id === 'main' && (G.cab.level >= 1 || G.cab.build)) out.push('cab_l' + Math.max(1, G.cab.level), ...(G.cab.level === 0 ? ['cab_s1', 'cab_s2', 'cab_s3', 'cab_s4', 'cab_s5'] : []));
    return out;
  },
  async go(to) {
    if (blocked()) return;
    if (!this.open(to)) { AudioSys.wrong(); toast(LOCK[to], 4600); setTimeout(() => { if (!blocked()) Shop.open('vehicules', VEH[to]); }, 900); return; }
    AudioSys.tap();
    const far = to === 'reunion' || to === 'michigan';
    if (far && !(await this.tripSetup(to))) return;
    state.busy = true;
    const from = G.map;
    await need(this.sheetsFor(to));
    const veh = to === 'main' ? (G.veh[VEH[from]] ? VEH[from] : null) : (G.veh[VEH[to]] ? VEH[to] : null);
    const look = to === 'main' ? MAPS.main.arrive[from] : MAPS[to].look;
    await Clouds.transition(async () => { G.map = to; persist(); showTown(look); }, veh ? URLS['veh_' + veh] : null);
    state.busy = false;
    if (to === 'main' && G.trip) await this.tripEnd();
    await this.arrived(to);
    refreshGuide();
  },
  /* titulaire: a long trip lasts a month — who looks after your patients? */
  async tripSetup(to) {
    if (G.phase !== 'titulaire' || G.cab.level < 1 || G.trip) return true;
    if (G.sess.state !== 'idle') { AudioSys.wrong(); toast('Termine d’abord ton mois de travail en cours avant de partir en voyage !', 3800); return false; }
    const opts = freeCandidates().map((w) => ({ label: `${CANDIDATES[w].name} te remplace`, sub: `${CANDIDATES[w].hobby} · il te reverse 25 % de rétrocession`, value: w, icon: `<img src="${URLS['av_' + w]}" alt="">` }));
    opts.push({ label: 'Je ferme le cabinet ce mois-ci', sub: 'Aucune recette… mais tes charges continuent', value: 'close' });
    const v = await Choice.ask({ kick: `Voyage : ${LABEL[to]}`, title: 'Qui soigne tes patients pendant ton absence ?', html: frSpace('Un voyage aussi loin, ça dure <b>un mois</b>. À ton retour, ton mois sera fait.'), opts, cancel: 'Rester ici', wide: true });
    if (v == null) return false;
    G.trip = { to, who: v === 'close' ? null : v, r: 0.25 }; persist();
    if (v !== 'close') {
      await Talk.open(); await SCRIPTS.tripRempl(v); await Talk.close();
      await Quests.done('rempla');
    }
    return true;
  },
  /* back home: the month of the trip is over */
  async tripEnd() {
    const T = G.trip; if (!T) return;
    state.busy = true;
    await Month.close({ x: 960, y: 420 }, { trip: T });
    G.trip = null; persist(); state.busy = false;
  },
  async arrived(to) {
    if (to === 'main') Career.onTownEnter();
    if (to === 'maransin' && !G.flags.visitMaransin) { G.flags.visitMaransin = true; persist(); await Talk.open(); await SCRIPTS.hiMaransin(); await Talk.close(); await Quests.done('maransin'); }
    if (to === 'reunion' && !G.flags.visitReunion) { G.flags.visitReunion = true; persist(); await Talk.open(); await SCRIPTS.hiReunion(); await Talk.close(); await Quests.done('reunion'); }
    if (to === 'michigan' && !G.flags.visitMichigan) { G.flags.visitMichigan = true; persist(); await this.chad(true); await Quests.done('michigan'); }
  },
  /* named characters standing on the current map */
  mapNpcs() {
    for (const d of MAP_NPCS[G.map] || []) {
      if (Town.findNpc(d.who)) continue;
      Town.npc(d.who, { x: d.at[0], y: d.at[1], pose: d.pose, alpha: 1, bubble: d.bubble, poseFlip: d.poseFlip, k: d.k, onClick: () => this.npcAct(d.act) });
    }
  },
  async npcAct(act) {
    if (blocked()) return;
    state.busy = true;
    if (act === 'julien') {
      await Talk.open(); await SCRIPTS.titTalk('X'); await Talk.close();
      state.busy = false;
      if (workplace() === 'X') Scenes.enterCabinet('X'); else if (Board.offerAt('X')) Board.open('X'); else refreshGuide();
      return;
    }
    if (act === 'mathieu') { await Talk.open(); await SCRIPTS.reunionTalk(); await Talk.close(); state.busy = false; return; }
    state.busy = false;
    if (act === 'chad') await this.chad(false);
  },
  /* Chad Cook, the most muscular kiné of the States, and his fraudulent trainings */
  async chad(first) {
    state.busy = true;
    const k = G.flags.chadPitch || 0;
    await Talk.open(); const p = await SCRIPTS.chadPitch(first, k); await Talk.close(true);
    const v = await Choice.ask({ kick: 'Chad Cook · formations', title: p.title, art: `<img src="${URLS.av_chad}" alt="" class="ch-av">`, html: frSpace(p.pitch), opts: [{ label: `J'achète (${fmt(p.price)} €)`, value: 'buy', cls: 'bad', disabled: G.money < p.price, sub: G.money < p.price ? 'Pas assez d’argent… heureusement !' : '' }, { label: 'Non merci, c’est une arnaque', value: 'no', cls: 'go' }] });
    G.flags.chadPitch = (k + 1) % 3; persist();
    await Talk.open();
    if (v === 'buy') {
      G.money -= p.price; book(`Formation de Chad Cook : « ${p.title} »`, -p.price, 'hors', 'arnaque'); persist(); HUD.tweenMoney();
      await SCRIPTS.chadBought(p);
    } else { await SCRIPTS.chadRefused(p); }
    await Talk.close();
    if (v !== 'buy') await addXP(10);
    state.busy = false; refreshGuide();
  },
  /* the buildings of the maps */
  async place(id) {
    const M = MAPS[G.map], P = M.places[id]; if (!P) return;
    if (P.act === 'ordre') return Castle.enter();
    if (['urssaf', 'carpimko', 'syndicats', 'assurances'].includes(P.act)) return Interior.enter(P.act);
    if (P.act === 'market') return Market.open(G.map);
    if (P.act === 'plot') return toast('Terrain à vendre… Un futur cabinet ? Le tien se construira sur le terrain près de la tour de l’Ordre.');
    if (P.act === 'eglise') return toast(G.map === 'maransin' ? 'Le clocher de Maransin sonne midi. Dans un désert médical, le kiné du village est un soignant précieux !' : 'La petite église de Saint-Gilles, au milieu des palmiers.', 3800);
    if (P.act === 'moulin') return toast('Le vieux moulin de Maransin tourne toujours… plus lentement qu’un patient lombalgique au réveil.', 3600);
    if (P.act === 'motel') return toast('Le motel affiche « complet ». Sur la porte, une affiche « WANTED » : un kiné qui facturait des séances fantômes…', 4200);
    if (P.act === 'paillote' || P.act === 'soinsReu') { state.busy = true; await Talk.open(); await (P.act === 'paillote' ? SCRIPTS.reunionFood() : SCRIPTS.reunionDom()); await Talk.close(); state.busy = false; if (P.act === 'paillote') Market.open('reunion'); return; }
    if (P.act === 'soinsMic') return this.chad(false);
  }
};
