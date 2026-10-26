import { AudioSys } from '../audio/audio.js';
import { prefs } from '../core/prefs.js';
import { G, persist, state, working } from '../core/save.js';
import { $, esc, frSpace, pick, rand, randi } from '../core/utils.js';
import { STREET_Q } from '../data/street-questions.js';
import { Quests } from './quests.js';
import { drawPatient } from '../render/sprites.js';
import { Cam } from '../scenes/camera.js';
import { Town } from '../scenes/town.js';
import { Guide, refreshGuide } from '../ui/guide.js';
import { hideToast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { blocked } from '../ui/modals.js';

/* ================= Passers-by stop you with a question ================= */
export const Street = {
  t: 4, w: null, q: null,
  tick(dt) {
    if (!working() || state.screen !== 'town' || blocked()) return;
    if (Town.walkers.some((w) => w.ask != null)) return;
    this.t -= dt; if (this.t > 0) return;
    this.t = rand(10, 18) * (prefs.fast ? 0.5 : 1);
    const cands = Town.walkers.filter((w) => w.alpha > 0.95 && !w.target && w.state !== 'enter' && Cam.visible(w.x, w.y - 110, 150));
    if (!cands.length) return;
    const w = pick(cands);
    let pool = STREET_Q.map((q, i) => i).filter((i) => !G.street.asked.includes(i) && STREET_Q[i].t === w.t);
    if (!pool.length) pool = STREET_Q.map((q, i) => i).filter((i) => STREET_Q[i].t === w.t);
    w.ask = pick(pool); AudioSys.voice('patient', 'e', { mul: w.t < 2 ? 0.8 : 1.15, glide: 1.3, dur: 0.16 });
  },
  open(w) {
    AudioSys.tap();
    this.w = w; const q = this.q = STREET_Q[w.ask];
    if (!G.street.asked.includes(w.ask)) G.street.asked.push(w.ask);
    if (G.street.asked.length >= STREET_Q.length) G.street.asked = [];
    persist();
    const cv = $('stCv'), c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
    drawPatient(c, 'walk_front', w.t, 0, cv.width / 2, cv.height - 8, 0.96, false, 1);
    $('stName').textContent = frSpace(`${w.name}, ${w.t % 2 ? 'une passante' : 'un passant'}`);
    $('stQ').textContent = frSpace('« ' + q.q + ' »');
    $('stOpts').innerHTML = q.o.map((o, k) => `<button type="button" class="qopt" data-sq="${k}"><span class="key">${'ABC'[k]}</span><span>${esc(frSpace(o))}</span></button>`).join('');
    $('stFb').hidden = true; $('stBtns').innerHTML = '';
    hideToast(); Guide.hide(); $('street').hidden = false; AudioSys.pop();
    for (let i = 0; i < 4; i++) AudioSys.voice('patient', 'aeiou'[randi(0, 4)], { delay: i * 0.1, mul: w.t < 2 ? 0.8 : 1.15 });
  },
  async answer(k) {
    const q = this.q, ok = k === q.a;
    $('stOpts').querySelectorAll('.qopt').forEach((b, j) => { b.disabled = true; if (j === q.a) b.classList.add('right'); else if (j === k) b.classList.add('wrong'); });
    ok ? AudioSys.right() : AudioSys.wrong();
    G.street.total++; if (ok) { G.street.right++; G.patients += 1; }
    persist(); HUD.render();
    const fb = $('stFb'); fb.hidden = false;
    fb.innerHTML = `<b>${ok ? 'Merci, docteur… euh, kiné !' : 'Ah bon ? Pourtant…'}</b> ${esc(frSpace(q.why))}${ok ? ' <b>+1 patient</b> (bouche-à-oreille)' : ''}`;
    $('stBtns').innerHTML = '<button type="button" class="btn sm btn-green" data-sq="close">Au revoir !</button>';
    this.ok = ok;
  },
  async close() {
    $('street').hidden = true; AudioSys.tap();
    if (this.w) { this.w.ask = null; this.w.idle = 0.2; this.w.state = 'idle'; }
    this.t = rand(8, 14);
    if (this.ok) await addXP(10);
    this.ok = false;
    await Quests.done('street');
    refreshGuide();
  }
};
$('street').addEventListener('click', (e) => {
  const b = e.target.closest('[data-sq]'); if (!b || b.disabled) return;
  if (b.dataset.sq === 'close') Street.close(); else Street.answer(+b.dataset.sq);
});
