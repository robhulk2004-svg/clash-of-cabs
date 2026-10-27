import { AudioSys } from '../audio/audio.js';
import { URLS, need } from '../core/assets.js';
import { G, persist, state, workplace } from '../core/save.js';
import { $, TEST, fmt, frSpace, rand, reduceMotion, wait } from '../core/utils.js';
import { CANDIDATES } from '../data/staff.js';
import { TOWN_CABS } from '../data/town-map.js';
import { MAPS, MAP_H, MAP_W } from '../data/worlds.js';
import { Clouds } from '../fx/transitions.js';
import { Board } from '../game/board.js';
import { Career } from '../game/career.js';
import { Market } from '../game/market.js';
import { Month, book } from '../game/month.js';
import { Quests } from '../game/quests.js';
import { freeCandidates } from '../game/staff.js';
import { charSheets } from '../render/sprites.js';
import { Cam } from './camera.js';
import { Castle } from './castle.js';
import { Interior } from './interior.js';
import { Scenes, showTown } from './scenes.js';
import { Town } from './town.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { Choice } from '../ui/choice.js';
import { Guide, refreshGuide } from '../ui/guide.js';
import { toast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { blocked } from '../ui/modals.js';
import { Shop } from '../ui/shop.js';

/* ================= Travelling between the maps: Maransin (vélo), La Réunion (bateau), le Michigan (jet), la Lune (fusée) ================= */
const LABEL = { main: 'Mériniaque', maransin: 'Maransin', reunion: 'La Réunion', michigan: 'Michigan', moon: 'La Lune' };
export const VEH = { maransin: 'velo', reunion: 'bateau', michigan: 'jet', moon: 'fusee' };
const VEH_IMG = { velo: 'veh_velo', bateau: 'veh_bateau', jet: 'veh_jet', fusee: 'fusee' };
const FACE = { velo: 1, bateau: 1, jet: -1 };          // the picture looks to the right (1) or to the left (-1)
const LOCK = {
  maransin: 'Maransin est à 45 km : achète un <b>vélo</b> dans la Boutique (onglet Véhicules)… ou signe un remplacement là-bas !',
  reunion: 'Pour rejoindre La Réunion, il te faut un <b>bateau</b> (Boutique, onglet Véhicules).',
  michigan: 'Le Michigan, c’est loin : il te faut un <b>jet privé</b> (Boutique, onglet Véhicules).',
  moon: 'La Lune ! Il te faut une <b>fusée</b> (Boutique, onglet Véhicules). C’est la dernière étape du jeu… et elle coûte très cher !'
};
/* the kinés you meet on each map: they stroll along the paths */
const MAP_NPCS = {
  maransin: [{ who: 'julien', bubble: 'Julien', cab: 'X' }],
  reunion: [{ who: 'mathieu', bubble: 'Mathieu', cab: 'R' }],
  michigan: [{ who: 'chad', bubble: 'Chad Cook', cab: 'M', k: 1.05 }],
  moon: [{ who: 'suzie', bubble: 'Suzie', cab: 'L' }]
};
const fast = () => reduceMotion || (TEST && TEST.fastWait);
/* where you arrive on a map, coming from another one */
const arrival = (to, from) => (MAPS[to].arrive && (MAPS[to].arrive[from] || MAPS[to].arrive.main)) || MAPS[to].look;
export const Travel = {
  label(to) { return LABEL[to] || to; },
  open(to) {
    if (to === 'main') return true;
    if (G.flags.adminMaps) return true;
    if (to === 'maransin') return !!G.veh.velo || workplace() === 'X';
    if (to === 'reunion') return !!G.veh.bateau || workplace() === 'R';
    if (to === 'michigan') return !!G.veh.jet;
    if (to === 'moon') return !!G.veh.fusee;
    return false;
  },
  /* the pictures a map needs before it shows: the map, its characters, your cabinet (or its construction site) */
  sheetsFor(id) {
    const out = [MAPS[id].img, ...(MAP_NPCS[id] || []).flatMap((n) => charSheets(n.who))];
    const kinds = MAPS[id].walkerKinds || [];
    if (kinds.includes('cw')) out.push('v_cowboy'); if (kinds.includes('m')) out.push('v_mini'); if (kinds.includes('al')) out.push('v_alien');
    if (id === 'main') { out.push('cars8'); if (G.cab.level >= 1 || G.cab.build) out.push('cab_l' + Math.max(1, G.cab.level), ...(G.cab.level === 0 ? ['cab_s1', 'cab_s2', 'cab_s3', 'cab_s4', 'cab_s5'] : [])); }
    return out;
  },
  async go(to) {
    if (blocked()) return;
    if (to === G.map) return;
    if (!this.open(to)) { AudioSys.wrong(); toast(LOCK[to], 4600); setTimeout(() => { if (!blocked()) Shop.open('vehicules', VEH[to]); }, 900); return; }
    /* back from a long trip: the half-day you started there (a mission) must be over first */
    if (to === 'main' && G.trip && G.sess.state !== 'idle' && TOWN_CABS[G.sess.where] && TOWN_CABS[G.sess.where].map === G.map) {
      AudioSys.wrong(); toast(G.sess.state === 'ready' ? 'Touche d’abord la <b>pièce</b> au-dessus du cabinet pour finir ta demi-journée !' : 'Termine d’abord ta demi-journée de travail avant de rentrer !', 3800); return;
    }
    AudioSys.tap();
    const far = to === 'reunion' || to === 'michigan' || to === 'moon';
    if (far && !(await this.tripSetup(to))) return;
    state.busy = true; Guide.hide(); $('btnBoard').classList.remove('nudge'); $('btnShop').classList.remove('nudge');
    const from = G.map, veh = VEH[to === 'main' ? from : to] || 'velo', look = arrival(to, from);
    await need([...this.sheetsFor(to), VEH_IMG[veh]]);
    if (veh === 'fusee') await Cine.launch(from); else await Cine.depart(from, to, veh);
    await Clouds.transition(async () => { Cine.clear(); G.map = to; persist(); showTown(look); Cine.hold(look); },
      veh === 'fusee' ? URLS.fusee : URLS[VEH_IMG[veh]], { title: LABEL[to], face: FACE[veh], space: veh === 'fusee', onOpen: () => (veh === 'fusee' ? Cine.land(to, look) : Cine.arrive(to, from, veh, look)) });
    state.busy = false;
    if (to === 'main' && G.trip) await this.tripEnd();
    await this.arrived(to);
    refreshGuide();
  },
  /* titulaire: a long trip lasts a month — who looks after your patients? */
  async tripSetup(to) {
    if (G.phase !== 'titulaire' || G.cab.level < 1 || G.trip) return true;
    if (G.sess.state !== 'idle') { AudioSys.wrong(); toast('Termine d’abord ta journée de travail en cours avant de partir en voyage !', 3800); return false; }
    const opts = freeCandidates().slice(0, 4).map((w) => ({ label: `${CANDIDATES[w].name} te remplace`, sub: `${CANDIDATES[w].hobby} · il te reverse 25 % de rétrocession`, value: w, icon: `<img src="${URLS['av_' + w]}" alt="">` }));
    opts.push({ label: 'Je ferme le cabinet ce mois-ci', sub: 'Aucune recette… mais tes charges continuent', value: 'close' });
    const v = await Choice.ask({ kick: `Voyage : ${LABEL[to]}`, title: 'Qui soigne tes patients pendant ton absence ?', html: frSpace('Un voyage aussi loin, ça dure <b>un mois</b>. Tes assistants, eux, continuent de travailler au cabinet. À ton retour, ton mois sera fait.'), opts, cancel: 'Rester ici', wide: true });
    if (v == null) return false;
    G.trip = { to, who: v === 'close' ? null : v, r: 0.25 }; persist();
    if (v !== 'close') {
      await need(['av_' + v]);
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
    G.trip = null; G.mission = null; persist(); state.busy = false;
  },
  async arrived(to) {
    const wp = workplace(); if (wp && TOWN_CABS[wp].map === to && !G.flags['went_' + wp]) { G.flags['went_' + wp] = true; persist(); }
    if (to === 'main') Career.onTownEnter();
    if (to === 'maransin' && !G.flags.visitMaransin) { G.flags.visitMaransin = true; persist(); await Talk.open(); await SCRIPTS.hiMaransin(); await Talk.close(); await Quests.done('maransin'); }
    if (to === 'reunion' && !G.flags.visitReunion) { G.flags.visitReunion = true; persist(); await Talk.open(); await SCRIPTS.hiReunion(); await Talk.close(); await Quests.done('reunion'); }
    if (to === 'michigan' && !G.flags.visitMichigan) { G.flags.visitMichigan = true; persist(); await this.chad(true); await Quests.done('michigan'); }
    if (to === 'moon' && !G.flags.visitMoon) { G.flags.visitMoon = true; persist(); state.busy = true; await Talk.open(); await SCRIPTS.hiMoon(); await Talk.close(); state.busy = false; await Quests.done('moon'); }
    if ((to === 'michigan' || to === 'moon') && Career.missionAt(to === 'michigan' ? 'M' : 'L')) Career.missionOffer(to === 'michigan' ? 'M' : 'L');
  },
  /* named characters strolling on the current map */
  mapNpcs() {
    for (const d of MAP_NPCS[G.map] || []) {
      if (Town.findNpc(d.who)) continue;
      const C = TOWN_CABS[d.cab], k = Town.nodeNear(C.door[0], C.door[1], 40, 260), at = Town.nodes[k] || C.door;
      Town.npc(d.who, { x: at[0], y: at[1], alpha: 1, roam: true, bubble: d.bubble, k: d.k, pause: rand(0.5, 2.5), onClick: (n) => this.npcAct(d, n) });
    }
  },
  async npcAct(d, n) {
    if (blocked()) return;
    Town.holdNpc(n); n.busy = true;
    try {
      if (d.who === 'julien') {
        state.busy = true; await Talk.open(); await SCRIPTS.titTalk('X'); await Talk.close(); state.busy = false;
        if (workplace() === 'X') Scenes.enterCabinet('X'); else if (Board.offerAt('X')) Board.open('X');
      } else if (d.who === 'mathieu') {
        if (Career.assistDraft()) Career.offerAssist();
        else { state.busy = true; await Talk.open(); await SCRIPTS.reunionTalk(); await Talk.close(); state.busy = false; if (workplace() === 'R') Scenes.enterCabinet('R'); }
      } else if (d.who === 'chad') {
        if (Career.missionAt('M')) await Career.missionOffer('M'); else await this.chad(false);
      } else if (d.who === 'suzie') {
        if (Career.missionAt('L')) await Career.missionOffer('L'); else await this.suzie();
      }
    } finally { state.busy = false; n.busy = false; n.pause = 2.5; refreshGuide(); }
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
  /* Suzie Taillebois, the kiné of the Moon, and her four-year training to « déshifter » the « shiftés » aliens */
  async suzie() {
    state.busy = true;
    await Talk.open(); const p = await SCRIPTS.suzieTalk(); await Talk.close(true);
    if (p) {
      const v = await Choice.ask({ kick: 'Suzie Taillebois · formation', title: p.title, art: `<img src="${URLS.av_suzie}" alt="" class="ch-av">`, html: frSpace(p.pitch), opts: [{ label: `Je m'inscris (${fmt(p.price)} €)`, value: 'buy', cls: 'bad', disabled: G.money < p.price, sub: G.money < p.price ? 'Pas assez d’argent… pour cette fois !' : '' }, { label: 'Je vais y réfléchir…', value: 'no', cls: 'go' }] });
      await Talk.open();
      if (v === 'buy') { G.money -= p.price; book(`Formation de Suzie : « ${p.title} »`, -p.price, 'hors', 'arnaque'); persist(); HUD.tweenMoney(); await SCRIPTS.suzieBought(p); }
      else await SCRIPTS.suzieRefused(p);
      await Talk.close();
      if (v !== 'buy') await addXP(10);
    }
    state.busy = false; refreshGuide();
  },
  /* the buildings of the maps */
  async place(id) {
    const M = MAPS[G.map], P = M.places[id]; if (!P) return;
    if (P.act === 'ordre') return Castle.enter();
    if (['urssaf', 'carpimko', 'syndicats', 'assurances'].includes(P.act)) return Interior.enter(P.act);
    if (P.act === 'market') return Market.open(G.map);
    if (P.act === 'cpam') { state.busy = true; await Talk.open(); await SCRIPTS.cpamHut(); await Talk.close(); state.busy = false; refreshGuide(); return; }
    if (P.act === 'base') { if (this.open('moon')) return this.go('moon'); state.busy = true; await Talk.open(); await SCRIPTS.baseInfo(); await Talk.close(); state.busy = false; Shop.open('vehicules', 'fusee'); return; }
    if (P.act === 'rocket') return this.go('main');
    if (P.act === 'port') { if (this.open('reunion')) return this.go('reunion'); return toast('Le port de Mériniaque : les voiliers partent pour La Réunion. Il te faut un <b>bateau</b> (Boutique, onglet Véhicules).', 4200); }
    if (P.act === 'phare') return toast('Le phare de Mériniaque guide les bateaux… et les kinés qui cherchent leur voie !', 3600);
    if (P.act === 'plot') return toast('Terrain à vendre… Un futur cabinet ? Le tien se construira sur le terrain près de la tour de l’Ordre.');
    if (P.act === 'eglise') return toast(G.map === 'maransin' ? 'Le clocher de Maransin sonne midi. Dans un désert médical, le kiné du village est un soignant précieux !' : 'La petite église de Saint-Gilles, au milieu des palmiers.', 3800);
    if (P.act === 'moulin') return toast('Le vieux moulin de Maransin tourne toujours… plus lentement qu’un patient lombalgique au réveil.', 3600);
    if (P.act === 'motel') return toast('Le motel affiche « complet ». Sur la porte, une affiche « WANTED » : un kiné qui facturait des séances fantômes…', 4200);
    if (P.act === 'mine') return toast('La mine de cristaux lunaires. Les aliens y travaillent penchés toute la journée : Suzie dit que c’est pour ça qu’ils sont tous « shiftés »…', 4600);
    if (P.act === 'navette') return toast('La navette lunaire : elle relie les cratères. Ceinture obligatoire, même en apesanteur !', 3800);
    if (P.act === 'bassin') return toast('Le bassin lunaire : en faible gravité, la balnéothérapie devient presque du vol !', 3800);
    if (P.act === 'paillote') { state.busy = true; await Talk.open(); await SCRIPTS.reunionFood(); await Talk.close(); state.busy = false; Market.open('reunion'); }
  }
};

/* ================= Trip cinematics: the vehicle leaves along the arrow, arrives on the other map ================= */
const Cine = {
  layer: () => $('cineLayer'),
  img(src, cls) { const im = document.createElement('img'); im.className = 'cine-veh' + (cls ? ' ' + cls : ''); im.src = src; im.alt = ''; this.layer().appendChild(im); return im; },
  clear() { this.layer().innerHTML = ''; $('townScene').classList.remove('shake'); },
  /* a quick puff of smoke (stage pixels) */
  puff(x, y, dx = 0, dy = -40, s = 1, ms = 900) {
    const p = document.createElement('div'); p.className = 'cine-puff'; this.layer().appendChild(p);
    const a = p.animate([{ transform: `translate(${x}px,${y}px) scale(${0.3 * s})`, opacity: 0.95 }, { transform: `translate(${x + dx}px,${y + dy}px) scale(${1.4 * s})`, opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
    a.finished.then(() => p.remove(), () => p.remove());
  },
  /* the arrow's direction on a map (out of the map) */
  dir(map, to) { const A = MAPS[map].arrows[to]; if (!A) return null; const a = Math.atan2(A[1] - MAP_H / 2, A[0] - MAP_W / 2); return { A, dx: Math.cos(a), dy: Math.sin(a) }; },
  async depart(from, to, veh) {
    if (fast()) return;
    const D = this.dir(from, to); if (!D) return;
    await Cam.flyTo(D.A[0] - D.dx * 60, D.A[1] - D.dy * 60, Math.min(Cam.zmax(), Cam.z + 0.3), 620);
    const p = Cam.toStage(D.A[0], D.A[1]), f = (FACE[veh] || 1) * (D.dx < -0.15 ? -1 : 1), w = 300;
    const im = this.img(URLS[VEH_IMG[veh]]);
    for (let i = 0; i < 6; i++) setTimeout(() => this.puff(p.x - D.dx * 80 + rand(-30, 30), p.y + 40 + rand(-10, 10), -D.dx * 120, -40, 0.8), i * 60);
    AudioSys.whoosh(1, true); AudioSys.horn();
    const at = (k, s, extra = '') => `translate(${(p.x + D.dx * k - w / 2).toFixed(0)}px,${(p.y + D.dy * k * 0.8 - w * 0.35).toFixed(0)}px) scale(${f * s},${s})${extra}`;
    const a = im.animate([{ transform: at(-200, 0.55), opacity: 0 }, { transform: at(-60, 0.72), opacity: 1, offset: 0.25 }, { transform: at(30, 0.8, ' rotate(-3deg)'), opacity: 1, offset: 0.45 }, { transform: at(1300, 1.35, ' rotate(4deg)'), opacity: 1 }],
      { duration: 1150, easing: 'cubic-bezier(.55,0,.75,.4)', fill: 'forwards' });
    await a.finished.catch(() => {});
  },
  /* the camera of the new map starts close, then opens up */
  hold(look) { if (fast()) return; const M = MAPS[G.map]; Cam.z = Math.min(Cam.zmax(), (Cam.zOf[G.map] || M.z) + 0.5); Cam.look(look[0], look[1]); },
  async arrive(to, from, veh) {
    if (fast()) return;
    const M = MAPS[to], look = arrival(to, from), z = Cam.zOf[to] || M.z;
    const cam = Cam.flyTo(look[0], look[1], z, 1500);
    /* the vehicle comes in from the road (the arrow of this map that leads back) */
    const back = to === 'main' ? from : 'main', D = this.dir(to, back);
    let a = null;
    if (D) {
      const p = Cam.toStage(look[0], look[1]), w = 300, f = (FACE[veh] || 1) * (-D.dx < -0.15 ? -1 : 1);
      const im = this.img(URLS[VEH_IMG[veh]]);
      const at = (k, s) => `translate(${(p.x + D.dx * k - w / 2).toFixed(0)}px,${(p.y + D.dy * k * 0.8 - w * 0.35).toFixed(0)}px) scale(${f * s},${s})`;
      a = im.animate([{ transform: at(1100, 1.25), opacity: 1 }, { transform: at(60, 0.85), opacity: 1, offset: 0.7 }, { transform: at(0, 0.8), opacity: 1, offset: 0.82 }, { transform: at(0, 0.8), opacity: 0 }], { duration: 1500, easing: 'cubic-bezier(.2,.7,.35,1)', fill: 'forwards' });
      setTimeout(() => { for (let i = 0; i < 5; i++) this.puff(p.x + rand(-40, 40), p.y + 30, rand(-80, 80), -30, 0.7); AudioSys.horn(); }, 1050);
    }
    await Promise.all([cam, a ? a.finished.catch(() => {}) : null]);
    this.clear();
  },
  /* the rocket: from the base spatiale of Mériniaque (or from the pad of the Moon) */
  async launch(from) {
    if (fast()) return;
    const pad = from === 'moon' ? [866, 250] : [1290, 196];
    await Cam.flyTo(pad[0], pad[1] - 60, Math.min(Cam.zmax(), 2.2), 900);
    const p = Cam.toStage(pad[0], pad[1]), im = this.img(URLS.fusee, 'rocket'), w = 250;
    const at = (y, s, r = -20) => `translate(${(p.x - w / 2).toFixed(0)}px,${(p.y - w * 1.52 + y).toFixed(0)}px) rotate(${r}deg) scale(${s})`;
    AudioSys.whoosh(2.4, true); AudioSys.note('sawtooth', 70, 0, 2.6, 0.22, 40);
    $('townScene').classList.add('shake');
    const smoke = setInterval(() => { for (let i = 0; i < 3; i++) this.puff(p.x + rand(-70, 70), p.y + rand(-10, 20), rand(-260, 260), rand(-40, 20), 1.3, 1300); }, 90);
    const a = im.animate([{ transform: at(0, 0.9), opacity: 0 }, { transform: at(0, 0.9), opacity: 1, offset: 0.08 }, { transform: at(-6, 0.9, -19), offset: 0.3 }, { transform: at(-140, 0.95, -20), offset: 0.55 }, { transform: at(-1500, 1.1, -21) }],
      { duration: 2600, easing: 'cubic-bezier(.6,0,.9,.5)', fill: 'forwards' });
    await a.finished.catch(() => {});
    clearInterval(smoke); $('townScene').classList.remove('shake');
  },
  /* … and it lands on the other side, with retro-rockets */
  async land(to, look) {
    if (fast()) { return; }
    const pad = to === 'moon' ? [866, 250] : [1290, 196], M = MAPS[to];
    const cam = Cam.flyTo(pad[0], pad[1] - 40, Math.min(Cam.zmax(), (Cam.zOf[to] || M.z) + 0.3), 1400);
    await wait(250);
    const p = Cam.toStage(pad[0], pad[1]), im = this.img(URLS.fusee, 'rocket'), w = 250;
    const at = (y, s) => `translate(${(p.x - w / 2).toFixed(0)}px,${(p.y - w * 1.52 + y).toFixed(0)}px) rotate(-20deg) scale(${s})`;
    const a = im.animate([{ transform: at(-1300, 1.1) }, { transform: at(-120, 0.95), offset: 0.7 }, { transform: at(0, 0.9), offset: 0.92 }, { transform: at(0, 0.9), opacity: 0 }], { duration: 2100, easing: 'cubic-bezier(.2,.7,.35,1)', fill: 'forwards' });
    setTimeout(() => { for (let i = 0; i < 10; i++) this.puff(p.x + rand(-80, 80), p.y + rand(-6, 14), rand(-240, 240), rand(-30, 10), 1.1, 1100); AudioSys.whoosh(0.8, false); }, 1500);
    await Promise.all([cam, a.finished.catch(() => {})]);
    this.clear();
    if (look) await Cam.flyTo(look[0], look[1], Cam.zOf[to] || M.z, 900);
  }
};
