import { AudioSys } from '../audio/audio.js';
import { Decl } from '../compta/declaration.js';
import { need } from '../core/assets.js';
import { G, PRE_DATE, curDate, gx, jEntry, persist, state, workplace } from '../core/save.js';
import { $, deMois, deName, esc, fmt, frSpace, monthName, nextMonth, signed, wait } from '../core/utils.js';
import { ECO } from '../data/economy.js';
import { STOCK } from '../data/market.js';
import { ITEMS } from '../data/shop-items.js';
import { TOWN_CABS } from '../data/town-map.js';
import { Fraude } from './fraude.js';
import { Career } from './career.js';
import { Quests } from './quests.js';
import { assistH, assistPostes, loanPayment, rendement, titSlots } from './session.js';
import { staffList, staffName } from './staff.js';
import { charSheets } from '../render/sprites.js';
import { Room } from '../scenes/room.js';
import { Town } from '../scenes/town.js';
import { Incidents } from '../scenes/tribunal.js';
import { POLICIES } from '../story/buildings.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { refreshGuide } from '../ui/guide.js';
import { MONEY_PT, coinFlight, floatText, hideToast, toast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';

/* ================= End of month: books, summary, calendar, events ================= */
export function book(label, amount, cat, sub, extra) {
  const e = jEntry(G, curDate(), label, amount, cat, sub, extra);
  G.journal.push(e); return e;
}
const pc = (k) => Math.round(k * 100);
export const Month = {
  /* opt.trip: a long trip (maybe with a mission abroad) · opt.banned: interdiction d'exercer */
  async close(from, opt = {}) {
    state.busy = true;
    const d = { ...G.date }, ph = G.phase, rend = rendement(), lines = [], notes = [];
    const add = (label, amount, cat, sub, short) => { if (!amount) return; book(label, amount, cat, sub); lines.push([short || label, amount]); };
    const T = opt.trip || null, off = !!opt.banned;
    let revenu = 0, treated = 0, worked = !off;
    let collected = 0;   // money already in your pocket (the redevances you collected): shown, not added twice
    if (off) notes.push('Interdiction d’exercer : aucun soin, aucune recette ce mois-ci.');
    if (ph === 'rempl') {
      const c = G.contract, day = G.sess.day;
      if (!off) {
        const H = day ? Math.round(day.cash * ECO.halfDays) : Math.round(c.H * rend), retro = Math.round(H * c.r);
        const trips = c.housing ? 4 : ECO.days, km = Math.round(c.km * 2 * trips * ECO.kmRate);
        add(`Honoraires ${deMois(d.m)} (remplacement, ${cabShort(c.cab)})`, H, 'recette', 'honoraires', day ? `Honoraires encaissés (${ECO.halfDays} demi-journées)` : 'Honoraires encaissés');
        add(`Rétrocession versée à ${c.tit} (${pc(c.r)} %)`, -retro, 'depense', 'retroV', `Rétrocession à ${c.tit} (${pc(c.r)} %)`);
        add(`Frais kilométriques (${trips} allers-retours de ${c.km} km)`, -km, 'depense', 'km', 'Frais kilométriques');
        revenu = H - retro - km; treated = day ? Math.round(day.treated / 2) + Math.min(10, day.best) : Room.capacity(c.cab);
        notes.push('Ce ne sont pas tes patients : ils restent ceux du titulaire.');
      }
    } else if (ph === 'assist') {
      const c = G.contract, day = G.sess.day;
      if (!off) {
        const H = day ? Math.round(day.cash * ECO.halfDays) : Math.round(assistH() * rend), redev = Math.round(H * c.r), km = Math.round(c.km * 2 * ECO.days * ECO.kmRate);
        add(`Honoraires ${deMois(d.m)} (assistanat)`, H, 'recette', 'honoraires', day ? `Honoraires encaissés (${ECO.halfDays} demi-journées)` : 'Honoraires encaissés');
        const who = TOWN_CABS[c.cab] ? TOWN_CABS[c.cab].first : c.tit;
        add(`Redevance de collaboration à ${who} (${pc(c.r)} %)`, -redev, 'depense', 'redev', `Redevance à ${who} (${pc(c.r)} %)`);
        add(`Frais kilométriques (${ECO.days} allers-retours de ${c.km} km)`, -km, 'depense', 'km', 'Frais kilométriques');
        revenu = H - redev - km; treated = day ? Math.round(day.treated / 2) + Math.min(10, day.best) : 3;
        G.patients += 1; notes.push(`Patientèle +1 (celle ${deName(who)}, que tu soignes)`);
      }
    } else {
      const slots = titSlots(), away = T && !T.who, day = G.sess.day;
      /* your own half-day stands for the month; on a trip, your remplaçant works your postes */
      let H = off || away ? 0 : T ? Math.round(slots * ECO.slot * rend) : day ? Math.round(day.cash * ECO.halfDays) : Math.round(slots * ECO.slot * rend);
      let mine = 0;
      if (T && T.who) {
        /* a remplaçant treats your patients with HIS carte CPS, then gives you a rétrocession */
        mine = Math.round(H * T.r); worked = false;
        add(`Rétrocession ${deName(staffName(T.who))}, ton remplaçant (${pc(T.r)} %)`, mine, 'recette', 'retroR', `Rétrocession ${deName(staffName(T.who))} (${pc(T.r)} %)`);
        notes.push(`${staffName(T.who)} t'a remplacé${gx('', 'e')} : il a encaissé ${fmt(H)} € d'honoraires avec sa propre carte CPS.`);
      } else if (H) { mine = H; add(`Honoraires ${deMois(d.m)} (${slots} poste${slots > 1 ? 's' : ''})`, H, 'recette', 'honoraires', day ? `Honoraires encaissés (${ECO.halfDays} demi-journées)` : `Honoraires (${slots} poste${slots > 1 ? 's' : ''})`); }
      else if (away) { worked = false; notes.push('Cabinet fermé pendant ton voyage : aucune recette… mais les charges continuent.'); }
      /* a mission abroad (Chad Cook, Suzie Taillebois) */
      if (T && T.mission && T.mission.H) { add(`Honoraires de ta mission : ${T.mission.name}`, T.mission.H, 'recette', 'honoraires', `Mission : ${T.mission.name}`); mine += T.mission.H; worked = true; }
      /* your assistants keep working: their redevances were collected in the town, during the month */
      const got = Math.round(G.mine.sum || 0); let spare = 0;
      if (got) { lines.push(['Redevances de tes assistants (déjà récoltées)', got]); collected += got; }
      staffList().forEach((st, i) => { const ps = assistPostes(i); if (!ps) notes.push(`${staffName(st.who)} n'a aucun poste libre : équipe ou agrandis ton cabinet !`); spare += ps; });
      const gains = got;
      add('Charges du local (énergie, entretien, logiciel)', -ECO.local, 'depense', 'local', 'Charges du local');
      let interest = 0;
      if (G.loan && G.loan.bal > 0.5) {
        const L = G.loan, M = loanPayment(L); interest = Math.round(L.bal * L.rate / 12 * 100) / 100; const cap = Math.min(L.bal, Math.round((M - interest) * 100) / 100);
        add("Intérêts d'emprunt", -interest, 'depense', 'interets');
        add('Remboursement du capital emprunté', -cap, 'hors', 'capital', 'Capital remboursé (non déductible)');
        L.bal = Math.round((L.bal - cap) * 100) / 100; L.paid++;
      }
      revenu = mine + gains - ECO.local - interest; treated = (worked ? (day ? Math.round(day.treated / 2) + Math.min(10, day.best) : slots) : 0) + spare;
      if (worked) G.patients += 1;
      /* the consumables of your cabinet: one month of each */
      if (G.cab.level >= 1) {
        const lack = [], out = [];
        for (const id in STOCK) { if ((G.stock[id] || 0) > 0) { G.stock[id]--; if (!G.stock[id]) out.push(STOCK[id].name); } else lack.push(STOCK[id].lack); }
        if (lack.length) notes.push(`${lack.join(', ')} : rendement en baisse !`);
        if (out.length) notes.push(`Stock épuisé : ${out.join(', ')}. Réapprovisionne-toi au supermarché !`);
      }
    }
    const day = G.sess.day;
    if (day && !off && !(opt.trip)) {
      if (day.pecN) notes.push(`Prises en charge : ${day.pec} / ${day.pecN} pertinentes`);
      const gap = Math.round((day.cash - day.right) * ECO.halfDays);
      if (day.coded) notes.push(`Cotations : ${day.ok} / ${day.coded} justes${gap > 0 ? ` · ${fmt(gap)} € facturés en trop (gare au contrôle !)` : gap < 0 ? ` · ${fmt(-gap)} € perdus` : ''}`);
    }
    if (G.boost) { if (worked) notes.push(`${G.boost.name} : +${pc(G.boost.k)} % de rendement`); G.boost = null; }
    add('Cotisations sociales (URSSAF + CARPIMKO)', -Math.round(Math.max(0, revenu) * ECO.cotis), 'depense', 'cotis', 'Cotisations sociales');
    let choco = false;
    if (d.m === 12 && worked && !G.events['choco' + d.y]) { G.events['choco' + d.y] = choco = true; add('Chocolats offerts par les patients (avantage en nature)', 30, 'recette', 'chocolats', 'Chocolats de Noël (avantage en nature)'); }
    add('Vie perso : loyer, courses… (prélèvement personnel)', -ECO.perso[ph], 'hors', 'perso', 'Vie perso (prélèvement)');
    const net = lines.reduce((s, l) => s + l[1], 0);
    G.money += net - collected; G.mine.sum = 0;
    G.months++; if (ph === 'rempl') G.monthsRempl++; if (ph === 'assist') G.monthsAssist++;
    if (G.contract) G.contract.done++;
    for (const id in G.formations) if (G.formations[id] === 'owned') { G.formations[id] = 'done'; notes.push(`Formation suivie : ${ITEMS[id].name} (+10 %)`); }   // saves from v4
    persist();
    if (from) { floatText(from.x, from.y - 30, signed(net), net >= 0 ? 'pos' : 'neg', 1900); coinFlight(from.x, from.y, MONEY_PT.x, MONEY_PT.y, 8); }

    await this.summary(d, lines, net, notes);
    HUD.tweenMoney(); HUD.render();
    await addXP(10 + treated * 3);
    await Quests.done('session1');
    if (choco) { await Talk.open(); await SCRIPTS.chocolats(); await Talk.close(); }
    /* sometimes, something goes wrong during a séance */
    if (worked) await Incidents.maybe();

    /* Calendar */
    G.date = nextMonth(G.date); persist(); HUD.render();
    if (G.date.m === 1) { G.pendingDecl = G.date.y - 1; persist(); }
    if (G.pendingDecl) await Decl.run(G.pendingDecl);
    await this.annual();
    await Career.afterMonth();
    await Fraude.monthCheck();
    state.busy = false;
    Town.updateDom(); refreshGuide();
  },
  summary(d, lines, net, notes) {
    return new Promise((resolve) => {
      $('mRibbon').textContent = monthName(d);
      $('mLines').innerHTML = lines.map(([l, v]) => `<div class="ml"><span>${esc(frSpace(l))}</span><b class="${v >= 0 ? 'pos' : 'neg'}">${signed(v)}</b></div>`).join('') +
        `<div class="ml tot"><span>Ce qui te reste ce mois-ci</span><b class="${net >= 0 ? 'pos' : 'neg'}">${signed(net)}</b></div>`;
      $('mNote').textContent = frSpace(notes.join(' · ')); $('mNote').hidden = !notes.length;
      hideToast(); $('month').hidden = false; AudioSys.pop();
      $('mOk').onclick = () => { AudioSys.tap(); $('month').hidden = true; resolve(); };
      setTimeout(() => $('mOk').focus({ preventScroll: true }), 300);
    });
  },
  /* Yearly fees on their anniversary month. */
  async annual() {
    const d = G.date, msgs = [];
    const fee = (label, amount, sub) => { book(label, -amount, 'depense', sub); G.money -= amount; msgs.push(`${label} : <b>−${fmt(amount)} €</b>`); };
    if (d.m === 1 && d.y >= PRE_DATE.y + 1 && !G.events['ordre' + d.y]) { G.events['ordre' + d.y] = true; fee("Cotisation annuelle à l'Ordre", ECO.ordre, 'ordre'); }
    if (d.m === 6 && d.y >= PRE_DATE.y + 1 && !G.events['rcp' + d.y]) { G.events['rcp' + d.y] = true; fee('Assurance RCP (renouvellement)', ECO.rcp, 'assur'); }
    for (const id of ['aga', 'comptable', 'syndicat']) {
      const o = G.owned[id];
      if (o && d.m === o.m && d.y > o.y && !G.events[id + d.y]) { G.events[id + d.y] = true; fee(id === 'aga' ? 'Renouvellement AGA' : id === 'comptable' ? 'Honoraires du comptable' : 'Cotisation syndicale', ITEMS[id].price, ITEMS[id].sub); }
    }
    /* the optional contracts of Ninassurance (assurances) and of Alex Cloppe (CARPIMKO) */
    for (const id in POLICIES) {
      const o = G.owned['pol_' + id], P = POLICIES[id];
      if (o && d.m === o.m && d.y > o.y && !G.events['pol_' + id + d.y]) { G.events['pol_' + id + d.y] = true; fee(`${P.name} (renouvellement)`, P.price, P.sub); }
    }
    if (msgs.length) { persist(); HUD.tweenMoney(); toast(msgs.join('<br>'), 4600); await wait(800); }
  }
};
export const cabShort = (id) => (id === 'C' ? 'ton cabinet' : TOWN_CABS[id].short || TOWN_CABS[id].name);

/* ================= Somebody comes to see you (in town or inside the cabinet) ================= */
export const Visit = {
  async come(who, pose) {
    if (state.screen === 'cabinet') { await need(charSheets(who)); await Promise.race([Room.visit(who, pose), wait(6000)]); return 'room'; }
    if (state.screen !== 'town' || !Town.nodes) return null;
    await need(charSheets(who));
    const wp = workplace(), target = wp && Town.nodes['door_' + wp] ? 'door_' + wp : Town.nodes.door_ordre ? 'door_ordre' : Town.plainNodes()[0];
    const start = Town.entryNode(target), [x, y] = Town.nodes[start];
    const n = Town.npc(who, { x, y, speed: 130, alpha: 0 });
    await new Promise((res) => { Town.walkNpc(n, target, res); setTimeout(res, 7000); });
    n.pose = pose || 'idle';
    return n;
  },
  leave(v) {
    if (v === 'room') { Room.leaveVisitor(); return; }
    if (v && v.who && Town.nodes) { Town.walkNpc(v, Town.entryNode(Town.nearestNode(v.x, v.y)), () => { v.fade = -1; }); setTimeout(() => { v.fade = -1; }, 9000); }
  }
};
