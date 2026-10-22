import { AudioSys } from '../audio/audio.js';
import { buildSeconds, sessionSeconds } from '../core/prefs.js';
import { G, curDate, persist, state } from '../core/save.js';
import { $, esc, eur, eur2, frSpace, pct, shuffle, wait } from '../core/utils.js';
import { CAB_LEVELS, ECO } from '../data/economy.js';
import { PLOTS } from '../data/town-map.js';
import { TownFX, UIFX } from '../fx/effects.js';
import { Fade } from '../fx/transitions.js';
import { Career } from './career.js';
import { book } from './month.js';
import { Quests } from './quests.js';
import { loanPayment } from './session.js';
import { Cam } from '../scenes/camera.js';
import { Intro } from '../scenes/intro.js';
import { Room } from '../scenes/room.js';
import { showTown } from '../scenes/scenes.js';
import { Town } from '../scenes/town.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { refreshGuide } from '../ui/guide.js';
import { shake, toast } from '../ui/helpers.js';
import { HUD, pay } from '../ui/hud.js';
import { ART } from '../ui/icons.js';
import { blocked, closeModal, openModal, showReward } from '../ui/modals.js';
import { Shop } from '../ui/shop.js';

/* ================= Your own cabinet: financing, construction, upgrades ================= */
export const Build = {
  apport: ECO.apportMin,
  onCard(lvl, el) {
    const c = Shop.cabCards()[lvl - 1];
    if (c.state === 'done') { AudioSys.tap(); toast(`Ton cabinet est déjà au niveau ${G.cab.level} !`); return; }
    if (c.state === 'building') { AudioSys.tap(); toast('Le chantier est en cours : regarde le terrain en ville !'); return; }
    if (c.state === 'locked') { AudioSys.wrong(); shake(el); toast(lvl === 1 ? Career.createHint(true) : esc(c.lockText)); return; }
    if (lvl === 1) { if (G.money < ECO.apportMin) { AudioSys.wrong(); shake(el); toast(`Il te faut au moins <b>${eur(ECO.apportMin)}</b> d'apport.`); return; } Shop.close(true); this.finance(); return; }
    if (G.money < CAB_LEVELS[lvl].cost) { AudioSys.wrong(); shake(el); toast(`Il te manque <b>${eur(CAB_LEVELS[lvl].cost - G.money)}</b>.`); return; }
    this.upgrade(lvl, el);
  },
  /* The bank meeting: choose your apport, see the loan and its monthly payment. */
  finance() {
    const max = Math.max(ECO.apportMin, Math.floor((G.money - 2000) / 1000) * 1000);
    const opts = [...new Set([ECO.apportMin, 30000, max].filter((v) => v >= ECO.apportMin && v <= Math.max(max, ECO.apportMin) && v <= CAB_LEVELS[1].cost))].sort((a, b) => a - b);
    if (!opts.includes(this.apport)) this.apport = opts[0];
    const cost = CAB_LEVELS[1].cost, P = cost - this.apport, L = { P, rate: ECO.loanRate, n: ECO.loanYears * 12 }, M = P > 0 ? loanPayment(L) : 0;
    const totalInt = M * L.n - P;
    $('fiBody').innerHTML = `<div class="fi-cost"><div class="fi-big">${eur(cost)}</div><div>${frSpace('Achat et aménagement du local, table de soins incluse')}</div></div>
      <h3>${frSpace('Ton apport personnel')}</h3>
      <div class="fi-opts">${opts.map((v) => `<button type="button" class="aopt${v === this.apport ? ' sel' : ''}" data-ap="${v}"><span>${eur(v)}</span><small>${frSpace(v === max && v > 30000 ? 'Presque toute ton épargne' : v === ECO.apportMin ? 'Le minimum de la banque (20 %)' : 'Un apport confortable')}</small></button>`).join('')}</div>
      <div class="fi-grid"><div class="fi-k"><small>Prêt bancaire</small><b>${eur(P)}</b></div><div class="fi-k"><small>Durée · taux</small><b>${ECO.loanYears} ans · ${pct(ECO.loanRate)}</b></div><div class="fi-k"><small>Mensualité</small><b>${eur2(Math.round(M * 100) / 100)}</b></div><div class="fi-k"><small>Coût des intérêts</small><b>${eur(totalInt)}</b></div></div>
      <ul class="fi-rules"><li>${frSpace("Le prêt arrive sur ton compte pro : ce n'est <b>pas une recette</b>, déclare-le comme un prêt !")}</li><li>${frSpace('Chaque mois, les <b>intérêts</b> sont déductibles, le <b>capital</b> remboursé ne l’est pas.')}</li><li>${frSpace(`Le local s'inscrit au registre des immobilisations et s'amortit sur ${CAB_LEVELS[1].years} ans.`)}</li></ul>
      <div class="fi-btns"><button type="button" class="btn btn-gray" data-fi="no">Plus tard</button><button type="button" class="btn btn-green" data-fi="go">Signer le prêt et construire</button></div>`;
    openModal('finance');
  },
  async create() {
    $('finance').hidden = true; state.busy = true;
    const cost = CAB_LEVELS[1].cost, P = cost - this.apport, d = curDate();
    await Talk.open(); await SCRIPTS.leaveAmbroise(); await Talk.close();
    if (P > 0) { G.loan = { P, rate: ECO.loanRate, n: ECO.loanYears * 12, bal: P, paid: 0, y: d.y, m: d.m }; book('Prêt bancaire reçu sur le compte pro', P, 'hors', 'pret'); G.money += P; }
    book(CAB_LEVELS[1].label, -cost, 'immo', 'immo', { years: CAB_LEVELS[1].years });
    G.immos.push({ id: 'cab1', label: CAB_LEVELS[1].label, price: cost, y: d.y, m: d.m, years: CAB_LEVELS[1].years, cat: CAB_LEVELS[1].cat });
    G.money -= cost;
    G.contract = null; G.phase = 'titulaire'; G.sess = { state: 'idle', t: 0, dur: sessionSeconds(), where: null };
    G.cab.build = { to: 1, t: 0, dur: buildSeconds(1) };
    persist(); HUD.tweenMoney(); HUD.render();
    await Quests.done('loan');
    if (state.screen !== 'town') await Fade.transition(async () => { showTown(); });
    Town.reset(); AudioSys.build(); TownFX.dust(PLOTS.C.cx, PLOTS.C.cy, 30);
    toast(`Le chantier de ton cabinet démarre : <b>${Math.round(buildSeconds(1))} secondes</b> ! Réponds aux passants en attendant.`, 4600);
    state.busy = false; refreshGuide();
  },
  async upgrade(lvl, el) {
    state.busy = true;
    const L = CAB_LEVELS[lvl], d = curDate();
    await pay(L.cost, el ? el.querySelector('.card-price') : null);
    book(L.label, -L.cost, 'immo', 'immo', { years: L.years });
    G.immos.push({ id: 'cab' + lvl, label: L.label, price: L.cost, y: d.y, m: d.m, years: L.years, cat: L.cat });
    G.cab.build = { to: lvl, t: 0, dur: buildSeconds(lvl) }; persist();
    Shop.render(); AudioSys.build(); await wait(400); Shop.close(true);
    if (state.screen !== 'town') await Fade.transition(async () => { showTown(); });
    Town.renderDom();
    toast(`Agrandissement lancé : <b>${Math.round(buildSeconds(lvl))} s</b> de chantier. Ton cabinet reste ouvert pendant les travaux !`, 4200);
    state.busy = false; refreshGuide();
  },
  tick(dt) {
    const b = G.cab.build; if (!b || Fade.active || Intro.active) return;
    b.t += dt;
    if (b.t >= b.dur && !state.busy && !blocked()) this.finish();
  },
  async finish() {
    const b = G.cab.build; if (!b || this.finishing) return; this.finishing = true;
    state.busy = true;
    G.cab.level = b.to; G.cab.build = null; persist();
    if (state.screen === 'cabinet' && b.to > 1) { Room.renderSlots(); }
    Town.pop.C = 0; Town.reset(); AudioSys.build(); TownFX.dust(PLOTS.C.cx, PLOTS.C.cy, 34);
    if (state.screen === 'town') { const q = Cam.toStage(PLOTS.C.cx, PLOTS.C.cy - 140); UIFX.burst(q.x, q.y, 90); }
    await wait(900);
    const L = CAB_LEVELS[b.to];
    await showReward({ ribbon: b.to === 1 ? 'Cabinet construit !' : `Niveau ${b.to} !`, art: 'cabinet', artHTML: ART.cabinet(b.to), title: b.to === 1 ? `Cabinet ${G.pseudo}` : `Cabinet niveau ${b.to}`, gains: L.unlocks, xp: 0 });
    await Quests.done(b.to === 1 ? 'build' : 'lvl' + b.to);
    await Talk.open(); await SCRIPTS['built' + b.to](); await Talk.close();
    if (b.to === 2 && !G.staff.mathieu && !G.hireOffer) { G.hireOffer = { ver: 1, bad: shuffle(['inscr', 'indep', 'argent', 'patientele', 'forme', 'rcp']).slice(0, 2).concat(Math.random() < 0.5 ? ['redev'] : []), state: 'wait', due: G.months + 1 }; persist(); }
    state.busy = false; this.finishing = false; HUD.render(); refreshGuide();
  }
};
$('finance').addEventListener('click', (e) => {
  const a = e.target.closest('[data-ap]'); if (a) { Build.apport = +a.dataset.ap; AudioSys.tap(); Build.finance(); return; }
  const b = e.target.closest('[data-fi]'); if (!b) return; AudioSys.tap();
  if (b.dataset.fi === 'go') Build.create(); else closeModal('finance');
});
document.querySelectorAll('.plot').forEach((g) => {
  const go = () => { if (blocked()) return; AudioSys.tap(); toast(g.dataset.plot === 'C' ? (Career.canCreate() ? 'Terrain constructible : ouvre la <b>Boutique › Bâtiments</b> pour y créer ton cabinet !' : 'Terrain à vendre… Ton futur cabinet ? Il te faudra un apport et de l’expérience.') : 'Terrain libre.'); };
  g.addEventListener('click', go);
  g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});
