import { AudioSys } from '../audio/audio.js';
import { URLS } from '../core/assets.js';
import { G, curDate, persist, state } from '../core/save.js';
import { $, TEST, esc, frSpace, pick, reduceMotion } from '../core/utils.js';
import { CALLS } from '../data/calls.js';
import { Contracts } from './contracts.js';
import { Quests } from './quests.js';
import { Town } from '../scenes/town.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { hideToast, toast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { ICON } from '../ui/icons.js';
import { showReward } from '../ui/modals.js';

/* ================= Recruiting Mathieu (your own cabinet, level 2) ================= */
export const Hire = {
  check() {
    const h = G.hireOffer;
    if (!h || G.staff.mathieu || G.phase !== 'titulaire') return;
    if (h.state === 'wait' && h.due <= G.months) { h.state = 'due'; persist(); }
    if (h.state === 'due' && state.screen === 'town' && !Town.offerCar) Town.spawnOfferCar();
  },
  open() { const h = G.hireOffer; if (!h || h.state !== 'due') return; Contracts.open('hire', h); },
  async hired(rate) {
    G.staff.mathieu = { rate, since: { ...curDate() } }; G.hireOffer = null; persist();
    await showReward({ ribbon: 'Assistant recruté !', artHTML: `<img class="photo" style="border-radius:50%;width:220px;height:220px" src="${URLS.av_mathieu}" alt="">`, title: 'Mathieu', gains: ['Il soigne ta patientèle', `Redevance de ${Math.round(rate * 100)} %`], xp: 0 });
    await Talk.open(); await SCRIPTS.mathieuHired(rate); await Talk.close();
    await Quests.done('mathieu');
    HUD.render();
  }
};

/* ================= Mathieu phones with a clinical question ================= */
export const Calls = {
  q: null,
  next() {
    let pool = CALLS.map((c, i) => i).filter((i) => !G.calls.asked.includes(i));
    if (!pool.length) { G.calls.asked = []; pool = CALLS.map((c, i) => i); }
    const i = pick(pool); G.calls.asked.push(i); persist(); return i;
  },
  ring() {
    if (!$('call').hidden || !G.staff.mathieu) return;
    this.q = CALLS[this.next()];
    const ph = $('phone'); ph.classList.remove('talking');
    $('phAv').src = URLS.av_mathieu; $('phName').textContent = 'Mathieu'; $('phRole').textContent = frSpace('Ton assistant, au cabinet');
    $('phTop').textContent = 'Appel entrant…';
    $('phMsg').hidden = true; $('phOpts').hidden = true; $('phFb').hidden = true; $('phBtns').hidden = false;
    $('phBtns').innerHTML = `<button type="button" class="ph-call no" data-ph="no" aria-label="Refuser l'appel">${ICON.hangup}</button><button type="button" class="ph-call ok" data-ph="ok" aria-label="Décrocher">${ICON.phone}</button>`;
    hideToast(); $('call').hidden = false; AudioSys.ring();
    this.ringTimer = setInterval(() => AudioSys.ring(), 1500);
  },
  stopRing() { clearInterval(this.ringTimer); },
  async pickUp() {
    this.stopRing(); AudioSys.tap();
    $('phone').classList.add('talking'); $('phTop').textContent = 'En ligne'; $('phBtns').hidden = true;
    const msg = $('phMsg'); msg.hidden = false;
    await this.type(msg, 'Allô ? C\'est Mathieu. J\'ai une question… ' + this.q.q);
    const box = $('phOpts'); box.hidden = false;
    box.innerHTML = this.q.o.map((o, k) => `<button type="button" class="qopt" data-ans="${k}"><span class="key">${'ABC'[k]}</span><span>${esc(frSpace(o))}</span></button>`).join('');
  },
  type(el, raw) {
    const text = frSpace(raw);
    return new Promise((resolve) => {
      if (reduceMotion || (TEST && TEST.fastWait)) { el.textContent = text; resolve(); return; }
      let i = 0, letters = 0;
      const step = () => {
        i = Math.min(text.length, i + 2);
        el.innerHTML = `<span>${esc(text.slice(0, i))}</span><span class="rest">${esc(text.slice(i))}</span>`;
        if (/[A-Za-zÀ-ÿ]/.test(text[i - 1] || '') && letters++ % 2 === 0) AudioSys.blip('mathieu', text[i - 1], i / text.length, true);
        if (i < text.length) setTimeout(step, 28); else resolve();
      };
      step();
    });
  },
  answer(k) {
    const box = $('phOpts'), ok = k === this.q.a;
    box.querySelectorAll('.qopt').forEach((b, j) => { b.disabled = true; if (j === this.q.a) b.classList.add('right'); else if (j === k) b.classList.add('wrong'); });
    ok ? AudioSys.right() : AudioSys.wrong();
    G.calls.total++; if (ok) { G.calls.right++; G.patients += 2; }
    persist(); HUD.render();
    const fb = $('phFb'); fb.hidden = false;
    fb.innerHTML = `<b>${ok ? 'Merci, c\'est clair !' : 'Ah… tu es sûr ?'}</b> ${esc(frSpace(this.q.why))}${ok ? ' <b>+2 patients</b> (bouche-à-oreille).' : ''}`;
    const btns = $('phBtns'); btns.hidden = false;
    btns.innerHTML = `<button type="button" class="ph-call no" data-ph="end" aria-label="Raccrocher">${ICON.hangup}</button>`;
    this.wasRight = ok;
  },
  async end(declined) {
    this.stopRing(); $('call').hidden = true; AudioSys.tap();
    if (declined) { toast('Mathieu devra se débrouiller seul…'); return; }
    if (this.wasRight) await addXP(10);
  }
};
$('call').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ph]');
  if (b) { const v = b.dataset.ph; if (v === 'ok') Calls.pickUp(); else Calls.end(v === 'no'); return; }
  const a = e.target.closest('[data-ans]'); if (a && !a.disabled) Calls.answer(+a.dataset.ans);
});
