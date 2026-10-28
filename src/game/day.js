import { AudioSys } from '../audio/audio.js';
import { URLS } from '../core/assets.js';
import { prefs } from '../core/prefs.js';
import { G, gx, persist, state, working } from '../core/save.js';
import { $, KX, KY, TEST, clamp, deName, esc, eur2, fmt, frSpace, rand, reduceMotion, wait } from '../core/utils.js';
import { ECO } from '../data/economy.js';
import { NGAP } from '../data/ngap.js';
import { MISSIONS } from '../data/offers.js';
import { ROOM } from '../data/room.js';
import { TOWN_CABS } from '../data/town-map.js';
import { Fade } from '../fx/transitions.js';
import { AVG_SEANCE, Consult } from './consult.js';
import { Cotation } from './cotation.js';
import { assistH, rendement, titSlots } from './session.js';
import { Calls, hasStaff } from './staff.js';
import { Intro } from '../scenes/intro.js';
import { Room } from '../scenes/room.js';
import { Town } from '../scenes/town.js';
import { Talk } from '../story/talk.js';
import { Guide, refreshGuide } from '../ui/guide.js';
import { floatText, hideToast, toast } from '../ui/helpers.js';
import { ICON } from '../ui/icons.js';
import { blocked, modalOpen } from '../ui/modals.js';

/* ================= A working half-day: patients arrive, explain their problem, you treat them ================= */
/* One half-day stands for each of the 40 half-days of the month. Touch « Soigner »: the next patient tells you what is
   wrong, you choose the right prise en charge, then the cotation (NGAP 2026), and the séance starts. When it is over,
   cash it with YOUR carte CPS. Four right prises en charge in a row (a combo): one more patient fits in your agenda.
   When you are not in the cabinet, the day goes on by itself (always the right choices… but no combo). */
const r2 = (n) => Math.round(n * 100) / 100;
export const DAY = { gap: [1.3, 2.6], first: 0.5, dur: 3.0, autoStart: 2.0, autoCollect: 1.3, roomCollect: 5, win: 1.5, step: 4, maxBonus: 2 };
/* v6: every working phase plays its days like this (remplaçant, assistant, titulaire, missions abroad) */
export const isDayPhase = () => working();
export const Day = {
  pts: [], clock: 0, next: 0, startSince: null, seq: 0, pulse: 0, consulting: false,
  get d() { return G.sess.day; },
  on() { return !!(G.sess.day && (G.sess.state === 'run' || G.sess.state === 'ready')); },
  here() { return state.screen === 'cabinet' && Room.cab === G.sess.where && this.on(); },
  manual() { return state.screen === 'cabinet' && Room.cab === G.sess.where; },
  total() { const d = this.d; return d ? d.agenda + d.bonus : 0; },
  progress() { const d = this.d; return d ? clamp(d.treated / Math.max(1, this.total()), 0, 1) : 0; },
  /* where you work today: a cabinet of the DOM (lettre-clé at 2,43 €), a mission abroad (paid per patient, no NGAP) */
  ctx(where = G.sess.where) {
    const C = TOWN_CABS[where] || {}, M = G.mission && G.mission.state === 'work' && G.mission.cab === where ? MISSIONS[where] : null;
    return { dom: !!C.dom, pay: M ? M.pay : 0, where: M ? C.name : '' };
  },
  /* patients in the agenda of a half-day: the monthly honoraires of the cabinet, divided by the value of an average séance */
  agenda(where = G.sess.where) {
    const c = this.ctx(where);
    if (c.pay) return 9;
    const H = G.phase === 'rempl' ? G.contract.H : G.phase === 'assist' ? assistH() : titSlots() * ECO.slot;
    const avg = AVG_SEANCE * (c.dom ? NGAP.valueDom / NGAP.value : 1);
    return clamp(Math.round(H / (ECO.halfDays * avg) * rendement()), 4, 14);
  },
  share() { return G.phase === 'titulaire' ? 0 : G.contract ? G.contract.r : 0.25; },
  start(where) {
    G.sess = { state: 'run', t: 0, dur: 0, where, day: { agenda: this.agenda(where), bonus: 0, arrived: 0, treated: 0, cash: 0, right: 0, coded: 0, ok: 0, combo: 0, best: 0, pec: 0, pecN: 0, reori: 0, called: false } };
    this.reset(); persist();
  },
  reset() { this.pts = []; this.clock = 0; this.next = DAY.first; this.startSince = null; this.consulting = false; },
  /* after a reload, patients that were in the room come back */
  resume() { const d = this.d; if (!d) return; this.reset(); d.arrived = d.treated; },
  /* your postes: up to 3 (the other ones belong to the kinés who work with you) */
  stations() { return Math.min(ECO.perKine, Room.stations(G.sess.where).length); },
  freeStation() {
    const used = new Set(this.pts.filter((p) => p.station >= 0).map((p) => p.station));
    for (let i = 0; i < this.stations(); i++) if (!used.has(i)) return i;
    return -1;
  },
  canStart() { return !this.consulting && this.pts.some((p) => p.st === 'queue') && this.freeStation() >= 0; },
  arrive() {
    const d = this.d; d.arrived++;
    this.pts.push({ id: ++this.seq, st: 'queue', t: 0, at: this.clock, station: -1, pt: Consult.draw(), value: 0, right: 0 });
    if (state.screen === 'town' && TOWN_CABS[G.sess.where].map === G.map) Town.sendTo(G.sess.where, 1);
    if (this.manual()) AudioSys.bell();
  },
  update(dt) {
    const d = this.d; if (!d || G.sess.state !== 'run') return;
    const manual = this.manual();
    if (Fade.active || Intro.active || Talk.active || this.consulting || (manual && (modalOpen() || state.busy))) return;
    dt *= (TEST && TEST.day) || (prefs.fast ? 1.6 : 1);
    this.clock += dt; this.pulse = Math.max(0, this.pulse - dt);
    const total = this.total();
    this.next -= dt;
    if (this.next <= 0 && d.arrived < total) { this.arrive(); this.next = rand(DAY.gap[0], DAY.gap[1]) * (manual ? 1 : 1.25); }
    for (const p of this.pts) if (p.st === 'seance') { p.t += dt; if (p.t >= DAY.dur) { p.st = 'done'; p.avail = this.clock; if (manual) AudioSys.coin(); } }
    /* away from the cabinet: the patients are treated without you */
    if (!manual) {
      const can = this.canStart();
      if (can && this.startSince == null) this.startSince = this.clock;
      if (!can) this.startSince = null;
      if (can && this.clock - this.startSince >= DAY.autoStart) { this.startSince = null; this.autoStart(); }
    }
    for (const p of this.pts.slice()) if (p.st === 'done' && this.clock - p.avail >= (manual ? DAY.roomCollect : DAY.autoCollect)) this.collect(p, false);
    /* titulaire: now and then, an assistant phones you with a clinical question */
    if (G.phase === 'titulaire' && !d.called && hasStaff() && this.progress() > 0.4 && G.months % 3 === 1 && G.calls.total < 8 && !blocked()) { d.called = true; Calls.ring(); }
    if (d.arrived >= total && !this.pts.length) this.finish();
  },
  /* « Soigner »: the next patient tells you what is wrong. */
  async startNext(byPlayer) {
    if (!this.canStart()) { if (byPlayer) AudioSys.tick(); return false; }
    const d = this.d, p = this.pts.find((x) => x.st === 'queue');
    p.st = 'consult'; p.station = this.freeStation(); this.consulting = true;
    if (byPlayer) AudioSys.tap();
    await Cotation.intro();
    const res = await Consult.ask(p.pt, { ...this.ctx(), n: d.treated + 1, of: this.total() });
    this.consulting = false;
    if (this.d !== d) return true;
    this.apply(p, res, true);
    refreshGuide();
    return true;
  },
  autoStart() {
    const p = this.pts.find((x) => x.st === 'queue'); if (!p) return;
    p.station = this.freeStation();
    const v = Consult.rightValue(p.pt, this.ctx()), reo = !v && !this.ctx().pay;
    this.apply(p, { pecOk: true, reorient: reo, value: v, right: v, cot: null }, false);
  },
  /* the outcome of a consultation: a séance starts, or the patient is sent back to his doctor */
  apply(p, res, byPlayer) {
    const d = this.d;
    if (byPlayer) {
      d.pecN++; if (res.pecOk) d.pec++;
      if (res.cot) { Cotation.record(res.cot, ECO.halfDays); d.coded++; if (res.cot.ok) d.ok++; }
      this.rhythm(res.pecOk);
    } else if (d.combo && this.manual()) this.breakCombo();
    if (res.reorient) {
      d.reori++; d.treated++; p.st = 'leave'; this.pts = this.pts.filter((x) => x !== p);
      if (this.manual()) floatText(960, 300, 'Patient réorienté vers son médecin', res.pecOk ? 'pos' : 'neg', 1500);
      persist(); return;
    }
    p.value = res.value; p.right = res.right; p.st = 'seance'; p.t = 0;
    persist();
  },
  /* combo: right prises en charge in a row */
  rhythm(ok) {
    const d = this.d;
    if (!ok) { if (d.combo) this.breakCombo(); return; }
    d.combo++; d.best = Math.max(d.best, d.combo); this.pulse = 0.35;
    if (d.combo % DAY.step === 0) {
      if (d.bonus < DAY.maxBonus) {
        d.bonus++; AudioSys.success();
        floatText(960, 340, `Combo ×${d.combo} : un patient de plus dans ton agenda !`, 'pos big', 2200);
      } else floatText(960, 340, `Combo ×${d.combo} !`, 'pos big', 1400);
    }
  },
  breakCombo() { const d = this.d; if (d.combo >= 3) floatText(960, 340, 'Combo perdu…', 'neg', 1100); d.combo = 0; },
  /* The séance is over: cash it with your carte CPS. */
  collect(p, byPlayer) {
    const d = this.d; if (!p || p.st !== 'done') return;
    d.cash = r2(d.cash + p.value); d.right = r2(d.right + p.right); d.treated++;
    this.pts = this.pts.filter((x) => x !== p);
    if (this.manual()) {
      const s = Room.stations()[p.station];
      if (s) { const q = { x: s.at[0] * KX, y: (s.at[1] - 200) * KY }; floatText(q.x, q.y, `${ICON.card}+${eur2(p.value)}`, 'pos cps', 1300); }
      AudioSys.cash();
    }
    persist();
  },
  finish() {
    G.sess.state = 'ready'; persist(); AudioSys.coin(); AudioSys.bell();
    if (state.screen !== 'cabinet' || Room.cab !== G.sess.where) toast('Demi-journée terminée ! Touche la <b>pièce</b> au-dessus du cabinet pour faire tes comptes.', 4200);
    Town.updateDom(); refreshGuide();
  },

  /* ---------- the patients you see in the cabinet ---------- */
  syncRoom(instant) {
    const st = Room.stations(), alive = new Set();
    let k = 0;
    for (const p of this.pts) {
      alive.add(p.id);
      let v = Room.people.find((x) => x.sid === p.id);
      if (p.st === 'queue' || p.st === 'consult') {
        const spot = ROOM.queue[Math.min(k, ROOM.queue.length - 1)]; k++;
        if (!v) {
          v = instant ? Room.person(spot[0], spot[1], 'queue', 1) : Room.person(ROOM.doorOut[0], ROOM.doorOut[1], 'queue', 0);
          v.sid = p.id; v.spot = spot; v.kind = p.pt.kind; if (!instant) { v.fade = 1; Room.walk(v, [ROOM.doorIn, spot], () => { v.sheet = 'walk_side'; v.flip = false; }); }
          Room.people.push(v);
        } else if (v.spot !== spot && v.state !== 'walk') { v.spot = spot; Room.walk(v, [spot], () => { v.sheet = 'walk_side'; v.flip = false; }); }
      } else {
        const s = st[p.station] || st[0];
        if (!v) {
          v = Room.person(s.at[0], s.at[1], 'session', instant ? 1 : 0); v.sid = p.id; v.kind = p.pt.kind; v.station = s; v.state = 'exercise'; v.sheet = Room.exFor(v.kind, s); v.fade = instant ? 0 : 1;
          Room.people.push(v);
        } else if (v.role === 'queue') {
          v.role = 'session'; v.station = s;
          const pts = []; if (s.via) pts.push(s.via); pts.push(s.at);
          Room.walk(v, pts, () => { v.state = 'exercise'; v.sheet = Room.exFor(v.kind, s); v.flip = false; v.anim = rand(0, 1); });
        }
        v.prog = p.st === 'done' ? 1 : p.t / DAY.dur; v.done = p.st === 'done';
      }
    }
    for (const v of Room.people) if (v.sid && !alive.has(v.sid) && v.role !== 'leave') {
      v.role = 'leave'; v.done = false; Room.walk(v, [[v.x + 24, v.y + 26], ROOM.doorIn, ROOM.doorOut], () => { v.dead = true; });
    }
  },
  /* DOM: big « Soigner » button, cash buttons over finished séances, combo */
  renderUi() {
    const here = this.here(), d = this.d, running = here && G.sess.state === 'run';
    const bar = $('dayBar'); bar.hidden = !running;
    $('dayCombo').hidden = !running || !d.combo;
    const box = $('dayCoins');
    if (!running) { if (box.childElementCount) box.innerHTML = ''; return; }
    const total = this.total();
    $('dayCount').textContent = `${d.treated} / ${total}`;
    $('dayCash').textContent = `${fmt(d.cash)} €`;
    $('dayFill').style.width = (this.progress() * 100).toFixed(1) + '%';
    const care = $('btnCare'), can = this.canStart(), waiting = this.pts.some((p) => p.st === 'queue');
    care.classList.toggle('off', !can); care.classList.toggle('hot', can);
    $('careSub').textContent = can ? 'Le patient suivant t’explique son problème' : waiting ? 'Tous tes postes sont pris' : d.arrived < total ? 'En attente du prochain patient…' : 'Plus de patients aujourd’hui';
    if (d.combo) { const c = $('dayCombo'); c.innerHTML = `Combo <b>×${d.combo}</b><small>${d.bonus < DAY.maxBonus ? `${DAY.step - (d.combo % DAY.step)} bonne${DAY.step - (d.combo % DAY.step) > 1 ? 's' : ''} prise${DAY.step - (d.combo % DAY.step) > 1 ? 's' : ''} en charge pour un patient de plus` : 'agenda plein !'}</small>`; c.classList.toggle('pop', this.pulse > 0); }
    /* cash buttons */
    const st = Room.stations(), want = new Map();
    for (const p of this.pts) if (p.st === 'done') want.set(p.id, p);
    for (const b of [...box.children]) if (!want.has(+b.dataset.id)) b.remove();
    for (const [id, p] of want) {
      let b = box.querySelector(`[data-id="${id}"]`);
      if (!b) {
        b = document.createElement('button'); b.type = 'button'; b.className = 'dcoin'; b.dataset.id = id;
        b.innerHTML = `${ICON.card}<span>${eur2(p.value)}</span>`; b.setAttribute('aria-label', 'Encaisser la séance avec ta carte CPS');
        const s = st[p.station] || st[0]; b.style.left = s.at[0] + 'px'; b.style.top = s.at[1] - 250 + 'px';
        box.appendChild(b);
      }
      b.classList.toggle('hot', this.clock - p.avail <= DAY.win);
    }
  }
};
$('btnCare').addEventListener('click', () => { if (blocked() || !Day.here()) return; Day.startNext(true); });
$('dayCoins').addEventListener('click', (e) => {
  const b = e.target.closest('.dcoin'); if (!b || blocked()) return;
  const p = Day.pts.find((x) => x.id === +b.dataset.id); if (p) Day.collect(p, true);
});
addEventListener('keydown', (e) => {
  if (!Day.here() || G.sess.state !== 'run' || blocked()) return;
  if (e.key === ' ' || e.key === 'Enter') { if (document.activeElement && document.activeElement.tagName === 'BUTTON' && document.activeElement.id !== 'btnCare') return; e.preventDefault(); Day.startNext(true); }
  if (e.key === 'e' || e.key === 'E') { const p = Day.pts.filter((x) => x.st === 'done').sort((a, b) => a.avail - b.avail)[0]; if (p) Day.collect(p, true); }
});

/* ================= End of the half-day: what you cashed, what goes to the titulaire, what is left ================= */
export const DayEnd = {
  show(d) {
    return new Promise(async (resolve) => {
      const where = G.sess.where, C = TOWN_CABS[where] || {}, mission = !!Day.ctx(where).pay, tit = G.phase === 'titulaire';
      const assist = G.phase === 'assist', r = tit || mission ? 0 : G.contract.r;
      const cash = d.cash, part = Math.round(cash * r), net = cash - part, n = d.treated - (d.reori || 0);
      $('deTitle').textContent = frSpace(mission ? `Fin de mission · ${C.name}` : tit ? 'Fin de demi-journée · ton cabinet' : assist ? `Fin de demi-journée · assistanat chez ${C.first}` : `Fin de demi-journée · ${C.name}`);
      $('deMeAv').src = URLS[gx('av_player', 'av_playerf')];
      const share = !!part;
      $('dayEnd').classList.toggle('solo', !share);
      if (share) {
        $('deTitAv').src = URLS['av_' + C.who];
        $('deTitName').textContent = frSpace(`Coffre ${deName(C.first)}`);
        $('dePartSub').textContent = frSpace(assist ? `Redevance ${Math.round(r * 100)} %` : `Rétrocession ${Math.round(r * 100)} %`);
      }
      $('deCashSub').textContent = frSpace(`Encaissé : ${n} séance${n > 1 ? 's' : ''}${mission ? '' : ` cotée${n > 1 ? 's' : ''}`}${d.reori ? ` · ${d.reori} réorienté${d.reori > 1 ? 's' : ''}` : ''}`);
      $('deCash').textContent = '0 €'; $('dePart').textContent = '0 €';
      $('deNet').innerHTML = frSpace(`Net de la demi-journée : <b>${fmt(net)} €</b>`); $('deNet').classList.remove('in');
      $('deExpl').innerHTML = frSpace(mission
        ? `Ici, pas de Sécurité sociale ni de NGAP : ${esc(C.first)} te paie <b>${eur2(Day.ctx(where).pay)}</b> par patient soigné. Ta mission d'un mois sera comptée à ton retour en France.`
        : tit ? `C'est ton cabinet : tu gardes <b>tous tes honoraires</b>… et tu paies toutes les charges (local, prêt, cotisations). Tes assistants, eux, te versent leur redevance au fil du mois.`
        : assist ? `C'est toi qui encaisses tes honoraires, avec <b>ta carte CPS</b>. Puis tu verses à ${esc(C.first)} sa <b>redevance</b> : elle est assimilée à un loyer, ce n'est pas une rétrocession.`
        : `C'est <b>${gx('toi, le remplaçant', 'toi, la remplaçante')}</b>, qui encaisses tous les honoraires avec <b>ta propre carte CPS</b>. Ensuite, tu reverses sa <b>rétrocession</b> à ${esc(C.first)} : sur ta 2035, elle viendra en déduction de tes recettes.`);
      $('deMonth').innerHTML = frSpace(`Sur le mois (${ECO.halfDays} demi-journées comme celle-ci) : <b>${fmt(cash * ECO.halfDays)} €</b> encaissés${share ? `, <b>${fmt(part * ECO.halfDays)} €</b> reversés` : ''}.`)
        + (d.pecN ? `<br>${frSpace(`Prises en charge : <b>${d.pec} / ${d.pecN}</b> pertinentes`)}` : '')
        + (d.coded ? ` · ${frSpace(`cotations : <b>${d.ok} / ${d.coded}</b> justes${d.ok < d.coded ? ' (gare au contrôle de la CPAM !)' : ''}`)}` : '')
        + (d.best >= DAY.step ? `<br>${frSpace(`Meilleur combo : ×${d.best}${d.bonus ? ` · ${d.bonus} patient${d.bonus > 1 ? 's' : ''} en plus grâce à tes bonnes prises en charge !` : ''}`)}` : '');
      $('deMonth').classList.remove('in'); $('deChestIco').innerHTML = ICON.chest; $('deActes').innerHTML = '';
      const ok = $('deOk'); ok.disabled = true; ok.textContent = mission ? 'Continuer' : 'Voir mon mois';
      hideToast(); Guide.hide(); $('dayEnd').hidden = false; AudioSys.pop();
      let skip = false; const panel = $('dayEnd').querySelector('.panel');
      panel.onclick = (e) => { if (e.target.closest('#deOk')) return; skip = true; };
      const fast = skip || reduceMotion || (TEST && TEST.fastWait);
      const tween = (el, from, to, ms) => new Promise((res) => {
        if (skip || fast) { el.textContent = `${fmt(to)} €`; res(); return; }
        const t0 = performance.now();
        const st = (t) => { const k = Math.min(1, (t - t0) / ms); el.textContent = `${fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))))} €`; if (k < 1 && !skip) requestAnimationFrame(st); else { el.textContent = `${fmt(to)} €`; res(); } };
        requestAnimationFrame(st);
      });
      const flyCoins = async (fromEl, toEl, count) => {
        if (skip || fast) return;
        const box = $('dayEnd').querySelector('.de-row').getBoundingClientRect(), a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect(), k = box.width / $('dayEnd').querySelector('.de-row').offsetWidth;
        const layer = $('deFly'); const jobs = [];
        for (let i = 0; i < count; i++) {
          const c = document.createElement('div'); c.className = 'de-coin'; c.innerHTML = ICON.coin; layer.appendChild(c);
          const x0 = (a.left + a.width / 2 - box.left) / k, y0 = (a.top + a.height / 2 - box.top) / k, x1 = (b.left + b.width / 2 - box.left) / k, y1 = (b.top + b.height / 2 - box.top) / k;
          const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 90 - rand(0, 60);
          const anim = c.animate([{ transform: `translate(${x0}px,${y0}px) scale(.6)`, opacity: 0 }, { transform: `translate(${mx}px,${my}px) scale(1.15)`, opacity: 1, offset: 0.5 }, { transform: `translate(${x1}px,${y1}px) scale(.7)`, opacity: 0.9 }], { duration: 620, delay: i * 70, easing: 'cubic-bezier(.3,.1,.4,1)', fill: 'both' });
          jobs.push(anim.finished.then(() => { c.remove(); AudioSys.coin(); }, () => c.remove()));
        }
        await Promise.all(jobs);
      };
      /* 1. the séances, cashed with your carte CPS */
      await wait(fast ? 0 : 350);
      $('deActes').innerHTML = ''; for (let i = 0; i < n; i++) { const s = document.createElement('span'); s.className = 'de-acte'; s.innerHTML = ICON.card; s.style.animationDelay = (fast ? 0 : i * 60) + 'ms'; $('deActes').appendChild(s); }
      AudioSys.cash();
      await Promise.all([flyCoins($('deActes'), $('deCash'), Math.min(10, n)), tween($('deCash'), 0, cash, 900)]);
      await wait(skip || fast ? 0 : 300);
      /* 2. the share of the titulaire goes to his safe */
      if (share) {
        $('deChest').classList.add('open');
        await Promise.all([flyCoins($('deCash'), $('deChestIco'), Math.max(2, Math.round(10 * r))), tween($('dePart'), 0, part, 800)]);
        $('deChest').classList.remove('open');
      }
      /* 3. what is left for you */
      await wait(skip || fast ? 0 : 200);
      $('deNet').classList.add('in'); $('deMonth').classList.add('in'); AudioSys.success();
      ok.disabled = false; setTimeout(() => ok.focus({ preventScroll: true }), 100);
      ok.onclick = () => { AudioSys.tap(); $('dayEnd').hidden = true; panel.onclick = null; resolve(); };
    });
  }
};
