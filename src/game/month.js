import { AudioSys } from '../audio/audio.js';
import { Decl } from '../compta/declaration.js';
import { G, PRE_DATE, curDate, jEntry, persist, state, workplace } from '../core/save.js';
import { $, deMois, esc, fmt, frSpace, monthName, nextMonth, signed, wait } from '../core/utils.js';
import { ECO } from '../data/economy.js';
import { ITEMS } from '../data/shop-items.js';
import { PLOTS, TOWN_CABS } from '../data/town-map.js';
import { Fraude } from './fraude.js';
import { Career } from './career.js';
import { Quests } from './quests.js';
import { assistH, loanPayment, mathieuSlots, rendement, titSlots } from './session.js';
import { Room } from '../scenes/room.js';
import { Town } from '../scenes/town.js';
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
export const Month = {
  async close(from) {
    state.busy = true;
    const d = { ...G.date }, ph = G.phase, rend = rendement(), lines = [], notes = [];
    const add = (label, amount, cat, sub, short) => { if (!amount) return; book(label, amount, cat, sub); lines.push([short || label, amount]); };
    let revenu = 0, treated = 0;
    if (ph === 'rempl') {
      const c = G.contract, day = G.sess.day, H = day ? day.cash * ECO.days : Math.round(c.H * rend), retro = Math.round(H * c.r);
      const trips = c.housing ? 4 : ECO.days, km = Math.round(c.km * 2 * trips * ECO.kmRate);
      add(`Honoraires ${deMois(d.m)} (remplacement, ${cabShort(c.cab)})`, H, 'recette', 'honoraires', day ? `Honoraires encaissés (${ECO.days} jours × ${fmt(day.cash)} €)` : 'Honoraires encaissés');
      add(`Rétrocession versée à ${c.tit} (${Math.round(c.r * 100)} %)`, -retro, 'depense', 'retroV', `Rétrocession à ${c.tit} (${Math.round(c.r * 100)} %)`);
      add(`Frais kilométriques (${trips} allers-retours de ${c.km} km)`, -km, 'depense', 'km', 'Frais kilométriques');
      revenu = H - retro - km; treated = day ? Math.round(day.treated / 2) + Math.min(10, day.best) : Room.capacity(c.cab);
      notes.push('Ce ne sont pas tes patients : ils restent ceux du titulaire.');
    } else if (ph === 'assist') {
      const c = G.contract, day = G.sess.day, H = day ? day.cash * ECO.days : Math.round(assistH() * rend), redev = Math.round(H * c.r), km = Math.round(c.km * 2 * ECO.days * ECO.kmRate);
      add(`Honoraires ${deMois(d.m)} (assistanat)`, H, 'recette', 'honoraires', day ? `Honoraires encaissés (${ECO.days} jours × ${fmt(day.cash)} €)` : 'Honoraires encaissés');
      add(`Redevance de collaboration à Ambroise (${Math.round(c.r * 100)} %)`, -redev, 'depense', 'redev', `Redevance à Ambroise (${Math.round(c.r * 100)} %)`);
      add(`Frais kilométriques (${ECO.days} allers-retours de ${c.km} km)`, -km, 'depense', 'km', 'Frais kilométriques');
      revenu = H - redev - km; treated = day ? Math.round(day.treated / 2) + Math.min(10, day.best) : 3;
      G.patients += 1; notes.push('Patientèle +1 (celle d’Ambroise, que tu soignes)');
    } else {
      const slots = titSlots(), H = Math.round(slots * ECO.slot * rend);
      add(`Honoraires ${deMois(d.m)} (${slots} poste${slots > 1 ? 's' : ''})`, H, 'recette', 'honoraires', `Honoraires (${slots} poste${slots > 1 ? 's' : ''})`);
      let gains = 0;
      if (G.staff.mathieu) {
        const ms = mathieuSlots(), HM = Math.round(ms * ECO.slot * rend); gains = Math.round(HM * G.staff.mathieu.rate);
        add(`Redevance de Mathieu (${Math.round(G.staff.mathieu.rate * 100)} %)`, gains, 'gains', 'redevance', 'Redevance de Mathieu (gains divers)');
        if (!ms) notes.push("Mathieu n'a aucun poste libre : achète du matériel !");
      }
      add('Charges du local (énergie, entretien, logiciel)', -ECO.local, 'depense', 'local', 'Charges du local');
      let interest = 0;
      if (G.loan && G.loan.bal > 0.5) {
        const L = G.loan, M = loanPayment(L); interest = Math.round(L.bal * L.rate / 12 * 100) / 100; const cap = Math.min(L.bal, Math.round((M - interest) * 100) / 100);
        add("Intérêts d'emprunt", -interest, 'depense', 'interets');
        add('Remboursement du capital emprunté', -cap, 'hors', 'capital', 'Capital remboursé (non déductible)');
        L.bal = Math.round((L.bal - cap) * 100) / 100; L.paid++;
      }
      revenu = H + gains - ECO.local - interest; treated = slots + mathieuSlots();
      G.patients += 1;
    }
    add('Cotisations sociales (URSSAF + CARPIMKO)', -Math.round(Math.max(0, revenu) * ECO.cotis), 'depense', 'cotis', 'Cotisations sociales');
    let choco = false;
    if (d.m === 12 && !G.events['choco' + d.y]) { G.events['choco' + d.y] = choco = true; add('Chocolats offerts par les patients (avantage en nature)', 30, 'recette', 'chocolats', 'Chocolats de Noël (avantage en nature)'); }
    add('Vie perso : loyer, courses… (prélèvement personnel)', -ECO.perso[ph], 'hors', 'perso', 'Vie perso (prélèvement)');
    const net = lines.reduce((s, l) => s + l[1], 0);
    G.money += net;
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
    if (msgs.length) { persist(); HUD.tweenMoney(); toast(msgs.join('<br>'), 4600); await wait(800); }
  }
};
export const cabShort = (id) => (id === 'C' ? 'ton cabinet' : TOWN_CABS[id].short || TOWN_CABS[id].name);

/* ================= Somebody comes to see you (in town or inside the cabinet) ================= */
export const Visit = {
  async come(who, pose) {
    if (state.screen === 'cabinet') { await Promise.race([Room.visit(who, pose), wait(6000)]); return 'room'; }
    const wp = workplace(), target = wp && PLOTS[wp] ? 'door_' + wp : 'n5';
    const n = Town.npc(who, { x: 335, y: 628, speed: 95, alpha: 0 });
    await new Promise((res) => { Town.walkNpc(n, Town.nodes[target] ? target : 'n5', res); setTimeout(res, 9000); });
    n.pose = pose || 'idle';
    return n;
  },
  leave(v) {
    if (v === 'room') { Room.leaveVisitor(); return; }
    if (v && v.who) { Town.walkNpc(v, 'n1', () => { v.fade = -1; }); }
  }
};
