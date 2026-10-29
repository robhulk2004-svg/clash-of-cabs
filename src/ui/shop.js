import { AudioSys } from '../audio/audio.js';
import { agaFor, dotation } from '../compta/ledger.js';
import { buildSeconds, formationSeconds } from '../core/prefs.js';
import { G, ORDER, allSteps, curDate, firstUndone, gx, persist, state } from '../core/save.js';
import { $, MONTHS, esc, eur, eur2, fmt, frSpace, pct, wait } from '../core/utils.js';
import { STEPS } from '../data/demarches.js';
import { CAB_LEVELS, ECO, MAX_CAB } from '../data/economy.js';
import { ROOM } from '../data/room.js';
import { ACC_LABEL, CLASSIFY_WHY, ITEMS, SHOP_ORDER } from '../data/shop-items.js';
import { Build } from '../game/build.js';
import { Career } from '../game/career.js';
import { Formation } from '../game/formation.js';
import { book } from '../game/month.js';
import { Quests } from '../game/quests.js';
import { Room } from '../scenes/room.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { Guide, refreshGuide } from './guide.js';
import { hideToast, shake, toast } from './helpers.js';
import { HUD, addXP, pay } from './hud.js';
import { ART, ICON, itemArt } from './icons.js';
import { blocked, showReward } from './modals.js';

/* ================= Shop ================= */
const TABS = [
  { id: 'demarches', label: 'Démarches', icon: 'doc' },
  { id: 'batiments', label: 'Bâtiments', icon: 'house' },
  { id: 'materiel', label: 'Matériel', icon: 'dumbbell' },
  { id: 'services', label: 'Services', icon: 'services' },
  { id: 'vehicules', label: 'Véhicules', icon: 'car' }
];
const ownCab = () => G.phase === 'titulaire' && G.cab.level >= 1;
export const Shop = {
  tab: 'demarches', pendingFlash: [],
  stepState(id) { return G.steps[id] ? 'done' : id === firstUndone() ? 'ready' : 'locked'; },
  tabLocked(id) { return id !== 'demarches' && id !== 'vehicules' && !allSteps(); },
  itemState(id) {
    const it = ITEMS[id];
    if (it.kind === 'forbidden') return G.flags.googleTried ? 'done' : 'ready';
    if (it.kind === 'vehicle') return G.veh[it.veh] ? 'done' : G.money < it.price ? 'poor' : 'ready';
    if (G.owned[id] && (it.kind !== 'formation' || G.formations[id])) return 'done';
    if (it.needs === 'menton' && !G.q.menton) return 'locked';
    if (it.kind === 'formation' && G.formations[id]) return 'done';
    if (it.kind === 'formation' && G.training) return 'locked';
    if (!it.anyPhase && it.tab === 'materiel' && (!ownCab() || it.lvl > G.cab.level)) return 'locked';
    return G.money < it.price ? 'poor' : 'ready';
  },
  lockText(id) {
    const it = ITEMS[id];
    if (it.needs === 'menton') return 'Rencontre un syndiqué';
    if (it.kind === 'formation') return 'Une formation à la fois';
    if (!ownCab()) return 'Ton propre cabinet';
    return `Cabinet niv. ${it.lvl}`;
  },
  cabCards() {
    return Array.from({ length: MAX_CAB }, (x, i) => i + 1).map((lvl) => {
      const L = CAB_LEVELS[lvl], building = G.cab.build && G.cab.build.to === lvl;
      let st, lock = '';
      if (G.cab.level >= lvl) st = 'done';
      else if (building) st = 'building';
      else if (lvl === 1) { st = Career.canCreate() ? (G.money >= ECO.apportMin ? 'ready' : 'poor') : 'locked'; lock = Career.createHint(); }
      else if (G.cab.level < lvl - 1 || G.cab.build) { st = 'locked'; lock = G.cab.build ? 'Chantier en cours' : `Après le niveau ${lvl - 1}`; }
      else st = G.money >= L.cost ? 'ready' : 'poor';
      return { id: 'cab' + lvl, lvl, title: L.title, tag: `${L.unlocks.slice(0, 3).join(', ')}…`, price: L.cost, art: ART.cabinet(lvl), cat: 'bat', state: st, lockText: lock, time: Math.round(buildSeconds(lvl)) };
    });
  },
  cards() {
    if (this.tab === 'demarches') return ORDER.map((id) => { const s = STEPS[id]; return { id, n: s.n, title: s.title, tag: s.tag, price: s.price, art: ART[s.art](), cat: 'dem', state: this.stepState(id), lockText: `Après l'étape ${s.n - 1}` }; });
    if (this.tab === 'batiments') return this.cabCards();
    return SHOP_ORDER[this.tab].map((id) => { const it = ITEMS[id]; return { id, title: it.name, tag: it.tag, price: it.price, art: itemArt(id), cat: it.tab === 'services' ? 'svc' : 'mat', state: this.itemState(id), item: it, lockText: this.lockText(id) }; });
  },
  accChip(c) {
    const it = c.item; if (!it || c.state !== 'done') return '';
    if (it.kind === 'forbidden') return '<span class="card-acc som">Interdit par le code de déontologie</span>';
    if (it.acc === 'immo') return `<span class="card-acc imm">Immobilisation · ${it.years} ans</span>`;
    if (it.acc === 'somptu') return `<span class="card-acc som">${it.kind === 'vehicle' ? 'Non déductible (perso)' : 'Non déductible (somptuaire)'}</span>`;
    if (it.kind === 'formation') return `<span class="card-acc dep">${G.formations[c.id] === 'done' ? 'Suivie · +10 %' : 'Formation en cours…'}</span>`;
    return '<span class="card-acc dep">Dépense déductible</span>';
  },
  priceHTML(c) {
    if (c.state === 'done') {
      const word = c.cat === 'dem' ? 'Validé' : c.cat === 'bat' ? 'Construit' : c.item && c.item.kind === 'forbidden' ? 'Refusé' : c.item && c.item.kind === 'service' ? gx('Adhérent', 'Adhérente') : 'Acheté';
      return `${ICON.check}<b>${word}</b>`;
    }
    if (c.state === 'building') return `${ICON.hammer}<b>En chantier</b>`;
    if (c.state === 'locked') return `<b class="lvl">${esc(frSpace(c.lockText))}</b>`;
    if (!c.price) return '<b class="free">Gratuit</b>';
    return `${ICON.coin}<b${c.price >= 1e8 ? ' class="huge"' : ''}>${fmt(c.price)} €</b>${c.item && c.item.per ? '<small>/an</small>' : ''}`;
  },
  render() {
    $('shopTabs').innerHTML = TABS.map((t) => {
      const locked = this.tabLocked(t.id), isNew = !locked && t.id === 'batiments' && Career.canCreate() && !G.flags.batSeen;
      return `<button type="button" class="tab${t.id === this.tab ? ' active' : ''}${locked ? ' locked' : ''}" data-tab="${t.id}">${ICON[t.icon]}<span>${t.label}</span>${locked ? `<span class="tlock">${ICON.lock}</span>` : ''}${isNew ? '<span class="tnew">Nouveau</span>' : ''}</button>`;
    }).join('');
    const scroll = this.tab === 'materiel' || this.tab === 'services' || this.tab === 'batiments';
    const box = $('shopCards'); box.classList.toggle('scroll', scroll);
    box.innerHTML = this.cards().map((c) => `<button type="button" class="card ${c.cat} st-${c.state}" data-card="${c.id}" aria-label="${esc(c.title)}">${c.n ? `<span class="card-n">${c.n}</span>` : ''}${c.lvl ? `<span class="card-n">${c.lvl}</span>` : ''}<span class="card-title">${esc(frSpace(c.title))}</span><span class="card-art">${c.art}${c.state === 'locked' ? `<span class="card-lock">${ICON.lock}</span>` : ''}${c.state === 'done' ? `<span class="card-stamp">${c.cat === 'dem' ? 'Validé' : c.cat === 'bat' ? 'Construit' : c.item && c.item.kind === 'forbidden' ? 'Interdit' : 'À toi'}</span>` : ''}</span><span class="card-tag">${esc(frSpace(c.tag))}</span>${c.cat === 'bat' && c.state !== 'done' ? `<span class="card-acc imm">${ICON.hammer} ${frSpace(`Chantier : ${c.time} s`)}</span>` : ''}${this.accChip(c)}<span class="card-price">${this.priceHTML(c)}</span></button>`).join('');
    const foot = this.tab === 'materiel' ? (ownCab() ? 'Prix TTC. Seuil du petit matériel : <b>598 € TTC</b> (500 € HT). Le matériel se débloque avec le <b>niveau de ton cabinet</b>.' : "Tu exerces dans le cabinet d'un confrère : son matériel n'est pas le tien ! Seules tes blouses te suivent.")
      : this.tab === 'services' ? 'Les services se renouvellent chaque année, à la date anniversaire.'
      : this.tab === 'vehicules' ? 'Les flèches au bord de la carte mènent à Maransin, à La Réunion et au Michigan. Ces achats personnels ne sont pas déductibles.'
      : this.tab === 'batiments' ? (G.phase === 'titulaire' ? 'Chaque niveau agrandit ton cabinet. À partir du niveau 4, chaque niveau ajoute une salle (+1 poste de soins). Le chantier continue pendant que tu soignes.' : `Un cabinet coûte environ <b>${fmt(CAB_LEVELS[1].cost)} €</b> : tu le financeras avec ton apport et un prêt bancaire.`) : '';
    $('shopFoot').innerHTML = frSpace(foot);
    this.arrows();
  },
  arrows() {
    const box = $('shopCards'), scroll = box.classList.contains('scroll');
    const l = $('sLeft'), r = $('sRight');
    l.innerHTML = ICON.chevL; r.innerHTML = ICON.chevR;
    l.hidden = !scroll || box.scrollLeft < 10; r.hidden = !scroll || box.scrollLeft + box.clientWidth > box.scrollWidth - 10;
  },
  async open(tab, focusId) {
    if (state.shopOpen || blocked()) return;
    state.shopOpen = true; AudioSys.pop();
    this.tab = tab || (!allSteps() ? 'demarches' : G.phase === 'titulaire' ? 'materiel' : Career.canCreate() && !G.cab.level ? 'batiments' : 'services');
    if (this.tabLocked(this.tab)) this.tab = 'demarches';
    if (this.tab === 'batiments') G.flags.batSeen = true;
    this.render(); $('shop').hidden = false; Guide.hide();
    if (focusId) { const el = document.querySelector(`.card[data-card="${focusId}"]`); if (el) { $('shopCards').scrollLeft = Math.max(0, el.offsetLeft - 120); el.classList.add('shake'); } this.arrows(); }
    else if (this.tab === 'batiments' && G.cab.level > 2) { const el = document.querySelector(`.card[data-card="cab${Math.min(MAX_CAB, G.cab.level + 1)}"]`); if (el) $('shopCards').scrollLeft = Math.max(0, el.offsetLeft - 480); this.arrows(); }
    if (!G.shopIntro && !G.steps.rcp && this.tab === 'demarches') {
      state.busy = true; await wait(380);
      await Talk.open(); await SCRIPTS.shopIntro(); await Talk.close();
      G.shopIntro = true; persist(); state.busy = false;
    }
    refreshGuide();
  },
  close(silent) {
    if (!state.shopOpen) return;
    state.shopOpen = false; $('shop').hidden = true; if (!silent) AudioSys.tap();
    for (const id of this.pendingFlash) Room.newItem(id);
    this.pendingFlash = [];
    refreshGuide();
  },
  async onTab(id) {
    if (state.busy) return;
    if (this.tabLocked(id)) { AudioSys.wrong(); toast("Termine d'abord tes <b>5 démarches</b> !"); return; }
    if (this.tab !== id) { this.tab = id; if (id === 'batiments') G.flags.batSeen = true; AudioSys.tap(); this.render(); $('shopCards').scrollLeft = 0; this.arrows(); refreshGuide(); }
  },
  onCard(id, el) {
    if (state.busy) return;
    if (ORDER.includes(id)) {
      const st = this.stepState(id);
      if (st === 'done') { AudioSys.tap(); toast('Démarche déjà validée !'); return; }
      if (st === 'locked') { AudioSys.wrong(); shake(el); toast(`Fais d'abord : <b>${esc(STEPS[firstUndone()].title)}</b>`); return; }
      buyStep(id); return;
    }
    if (id.startsWith('cab')) { Build.onCard(+id.slice(3), el); return; }
    if (ITEMS[id]) buyItem(id, el);
  }
};
$('shop').addEventListener('click', (e) => {
  if (e.target.closest('.xbtn')) { if (!state.busy) Shop.close(); return; }
  if (e.target.closest('#sLeft')) { $('shopCards').scrollLeft -= 924; AudioSys.tap(); return; }
  if (e.target.closest('#sRight')) { $('shopCards').scrollLeft += 924; AudioSys.tap(); return; }
  const tab = e.target.closest('.tab'); if (tab) { Shop.onTab(tab.dataset.tab); return; }
  const card = e.target.closest('.card'); if (card) Shop.onCard(card.dataset.card, card);
});
$('shopCards').addEventListener('scroll', () => Shop.arrows(), { passive: true });

/* ---------- Classification quiz before the first purchase of an item ---------- */
const Classify = {
  why(id) {
    const it = ITEMS[id], d = curDate();
    if (it.acc === 'immo') {
      const im = { price: it.price, years: it.years, y: d.y, m: d.m }, dot = dotation(im, d.y);
      return `Plus de 598 € TTC : c'est une immobilisation (${it.cat.toLowerCase()}), amortie sur ${it.years} ans, soit ${eur2(it.price / it.years)} par an. Prorata temporis : achetée en ${MONTHS[d.m - 1]}, tu déduis ${13 - d.m}/12 de l'annuité en ${d.y}, soit ${eur2(dot)}.`;
    }
    if (it.acc === 'somptu') return CLASSIFY_WHY.somptu(it);
    return (CLASSIFY_WHY[it.sub] || (() => 'Dépense déductible.'))(it);
  },
  ask(id) {
    return new Promise((resolve) => {
      const it = ITEMS[id], known = id in G.classified;
      $('clTitle').innerHTML = frSpace(`${esc(it.name)} · ${eur(it.price)} TTC${it.per ? ' par an' : ''}`);
      $('clArt').innerHTML = itemArt(id);
      $('clTxt').innerHTML = frSpace(known ? 'Rappel : voici comment cet achat entre dans ta compta.' : 'Avant de payer : comment ranges-tu cet achat dans ta compta ?');
      const opts = [['depense', 'Dépense déductible', 'déduite en entier cette année'], ['immo', 'Immobilisation', 'amortie sur plusieurs années'], ['somptu', 'Non déductible', 'ni dépense, ni amortissement']];
      const box = $('clOpts'), fb = $('clFb'), btns = $('clBtns');
      fb.hidden = true; btns.innerHTML = '';
      const finish = (ok) => {
        fb.hidden = false; fb.innerHTML = `<b>${ACC_LABEL[it.acc]}</b> · ${esc(frSpace(this.why(id)))}`;
        btns.innerHTML = '';
        const buy = document.createElement('button'); buy.type = 'button'; buy.className = 'btn sm btn-green'; buy.textContent = 'Acheter';
        const no = document.createElement('button'); no.type = 'button'; no.className = 'btn sm btn-gray'; no.textContent = 'Annuler';
        buy.onclick = () => { AudioSys.tap(); $('classify').hidden = true; resolve({ buy: true, ok }); };
        no.onclick = () => { AudioSys.tap(); $('classify').hidden = true; resolve({ buy: false, ok }); };
        btns.append(no, buy);
      };
      if (known) { box.innerHTML = ''; box.hidden = true; finish(null); }
      else {
        box.hidden = false;
        box.innerHTML = opts.map(([k, l, s], i) => `<button type="button" class="qopt" data-acc="${k}"><span class="key">${'ABC'[i]}</span><span>${l}<small>${frSpace(s)}</small></span></button>`).join('');
        box.onclick = (e) => {
          const b = e.target.closest('.qopt'); if (!b || b.disabled) return;
          const ok = b.dataset.acc === it.acc;
          box.querySelectorAll('.qopt').forEach((q) => { q.disabled = true; if (q.dataset.acc === it.acc) q.classList.add('right'); });
          if (!ok) b.classList.add('wrong');
          ok ? AudioSys.right() : AudioSys.wrong();
          G.classified[id] = ok; persist();
          finish(ok);
        };
      }
      hideToast(); $('classify').hidden = false; AudioSys.pop();
    });
  }
};

async function buyItem(id, el) {
  const it = ITEMS[id], st = Shop.itemState(id);
  if (st === 'done') { AudioSys.tap(); toast(it.kind === 'forbidden' ? "Interdit : on ne paie pas pour être référencé en premier !" : it.kind === 'service' ? `Tu es déjà ${gx('adhérent', 'adhérente')}.` : it.kind === 'vehicle' ? 'Il est à toi : touche la flèche au bord de la carte pour partir !' : 'Tu as déjà cet équipement.'); return; }
  if (st === 'locked') { AudioSys.wrong(); shake(el); toast(it.needs === 'menton' ? "Tu ne sais pas encore à quoi servent les syndicats… Mickael Menton viendra t'en parler." : !ownCab() ? "Ce matériel irait dans <b>ton propre cabinet</b> : pour l'instant, tu travailles chez un confrère !" : `Disponible avec ton <b>cabinet niveau ${it.lvl}</b>.`); return; }
  if (it.kind === 'forbidden') {
    state.busy = true;
    await Talk.open(); await SCRIPTS.google(); await Talk.close();
    G.flags.googleTried = true; persist(); Shop.render();
    await addXP(10);
    state.busy = false; return;
  }
  if (G.money < it.price) { AudioSys.wrong(); shake(el); toast(`Il te manque <b>${eur(it.price - G.money)}</b> : soigne encore quelques patients !`); return; }
  state.busy = true; Guide.hide();
  const first = !(id in G.classified);
  const res = await Classify.ask(id);
  if (first && res.ok) await addXP(5);
  if (!res.buy) { state.busy = false; refreshGuide(); return; }
  const cardEl = document.querySelector(`.card[data-card="${id}"]`);
  await pay(it.price, cardEl ? cardEl.querySelector('.card-price') : null);
  const d = curDate();
  G.owned[id] = { y: d.y, m: d.m };
  if (it.kind === 'vehicle') G.veh[it.veh] = true;
  if (it.acc === 'immo') { book(it.name, -it.price, 'immo', 'immo', { years: it.years }); G.immos.push({ id, label: it.name, price: it.price, y: d.y, m: d.m, years: it.years, cat: it.cat }); }
  else if (it.acc === 'somptu') { if (it.kind === 'vehicle') book(`${it.name} (achat personnel)`, -it.price, 'hors', 'perso'); else book(it.name + ' (somptuaire)', -it.price, 'hors', 'somptu'); }
  else book(it.name, -it.price, 'depense', it.sub);
  if (it.kind === 'formation') Formation.begin(id);
  persist(); HUD.render();
  Shop.render();
  const stamp = document.querySelector(`.card[data-card="${id}"] .card-stamp`); if (stamp) stamp.classList.add('in');
  AudioSys.stamp();
  if (ROOM.eq[id] || id === 'table') Shop.pendingFlash.push(id);
  if (it.tab === 'materiel' && it.kind !== 'bling') await Quests.done('materiel');
  if (id === 'aga') await Quests.done('aga');
  const msg = it.msg || {
    station: 'Nouveau poste dans ton cabinet : un patient de plus par séance !',
    boost: `Ton rendement augmente de <b>${pct(it.boost || 0)}</b> !`,
    bling: "C'est joli… mais ça ne soigne personne, et ce n'est pas déductible !",
    service: id === 'aga' ? (agaFor(d.y) ? `Te voilà ${gx('adhérent', 'adhérente')} : ton AGA télétransmettra ta 2035.` : `${gx('Adhérent', 'Adhérente')} ! Attention : passé ton 5e mois d'activité, l'AGA ne vaut que pour l'an prochain.`) : id === 'syndicat' ? `${gx('Adhérent', 'Adhérente')} ! Ton syndicat relira tes contrats (bouton « Syndicat »).` : 'Ton comptable tiendra ta compta et ta 2035.',
    vehicle: 'Il est à toi ! Touche la <b>flèche</b> au bord de la carte pour partir.',
    formation: `Formation lancée : <b>${Math.round(formationSeconds())} s</b>. Tu peux continuer à travailler pendant ce temps !`
  }[it.kind];
  if (msg) toast(msg, 3800);
  state.busy = false; Room.renderSlots(); Room.syncUi(); refreshGuide();
}

/* ---------- The démarches post-diplôme ---------- */
async function buyStep(id) {
  state.busy = true; Guide.hide();
  const st = STEPS[id], cardEl = document.querySelector(`.card[data-card="${id}"]`);
  if (!G.paid[id]) {
    if (st.price > 0) await pay(st.price, cardEl.querySelector('.card-price')); else AudioSys.pop();
    if (id === 'rcp') book('Assurance RCP (1re année)', -st.price, 'depense', 'assur');
    G.paid[id] = true; persist();
  }
  await Talk.open(); const ok = await SCRIPTS[id](); await Talk.close();
  G.steps[id] = true; G.quiz[id] = ok; persist();
  Shop.render();
  const stamp = document.querySelector(`.card[data-card="${id}"] .card-stamp`); if (stamp) stamp.classList.add('in');
  AudioSys.stamp(); await wait(500);
  const xp = st.xp + (ok ? 5 : 0);
  await showReward({ ribbon: 'Démarche validée !', art: st.art, title: st.title, gains: st.gains, xp, bonus: ok });
  await addXP(xp);
  if (allSteps()) { Shop.close(true); await Career.toRempl(); }
  state.busy = false; refreshGuide();
}
