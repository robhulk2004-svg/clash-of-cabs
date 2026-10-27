import { AudioSys } from '../audio/audio.js';
import { prefs } from '../core/prefs.js';
import { G, persist, state, working } from '../core/save.js';
import { $, esc, frSpace, pick, rand, randi } from '../core/utils.js';
import { STREET_Q, askKey } from '../data/street-questions.js';
import { Quests } from './quests.js';
import { drawView8, drawWho } from '../render/sprites.js';
import { Cam } from '../scenes/camera.js';
import { Town } from '../scenes/town.js';
import { Guide, refreshGuide } from '../ui/guide.js';
import { hideToast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { blocked } from '../ui/modals.js';

/* ================= Passers-by stop you with a question ================= */
/* each kind of walker has its own voice */
function voiceOf(w, vowel, o = {}) {
  const v = { cw: 'cowboy', m: 'mini', al: 'alien' }[w.kind];
  if (v) AudioSys.voice(v, vowel, o); else AudioSys.voice('patient', vowel, { ...o, mul: /^p[02]/.test(w.kind) ? 0.8 : /^(q0|q3|p1)/.test(w.kind) ? 1.2 : 1 });
}
export const Street = {
  t: 4, w: null, q: null,
  tick(dt) {
    if (!working() || state.screen !== 'town' || blocked()) return;
    if (Town.walkers.some((w) => w.ask != null)) return;
    this.t -= dt; if (this.t > 0) return;
    this.t = rand(10, 18) * (prefs.fast ? 0.5 : 1);
    const cands = Town.walkers.filter((w) => w.alpha > 0.95 && !w.target && w.state !== 'enter' && Cam.visible(w.x, w.y - 110, 150));
    if (!cands.length) return;
    const w = pick(cands), key = askKey(w.kind), fits = (q) => (typeof key === 'number' ? q.t === key && !q.k : q.k === key);
    let pool = STREET_Q.map((q, i) => i).filter((i) => !G.street.asked.includes(i) && fits(STREET_Q[i]));
    if (!pool.length) pool = STREET_Q.map((q, i) => i).filter((i) => fits(STREET_Q[i]));
    if (!pool.length) return;
    w.ask = pick(pool); voiceOf(w, 'e', { glide: 1.3, dur: 0.16 });
  },
  open(w) {
    AudioSys.tap();
    this.w = w; const q = this.q = STREET_Q[w.ask];
    if (!G.street.asked.includes(w.ask)) G.street.asked.push(w.ask);
    if (G.street.asked.length >= STREET_Q.length) G.street.asked = [];
    persist();
    const cv = $('stCv'), c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
    const V = { cw: ['cowboy', 0.86], m: ['mini', 0.86], al: ['alien', 1.05] }[w.kind];
    if (V) drawView8(c, V[0], 0, cv.width / 2, cv.height - 8, V[1]); else drawWho(c, w.kind, 'walk_front', 0, cv.width / 2, cv.height - 8, 0.96, false, 1);
    $('stName').textContent = frSpace(`${w.name}, ${{ cw: 'un cowboy', m: 'un habitant de Saint-Gilles', al: 'un alien', q0: 'une passante', q3: 'une passante', p1: 'une passante' }[w.kind] || 'un passant'}`);
    $('stQ').textContent = frSpace('« ' + q.q + ' »');
    $('stOpts').innerHTML = q.o.map((o, k) => `<button type="button" class="qopt" data-sq="${k}"><span class="key">${'ABC'[k]}</span><span>${esc(frSpace(o))}</span></button>`).join('');
    $('stFb').hidden = true; $('stBtns').innerHTML = '';
    hideToast(); Guide.hide(); $('street').hidden = false; AudioSys.pop();
    for (let i = 0; i < 4; i++) voiceOf(w, 'aeiou'[randi(0, 4)], { delay: i * 0.1 });
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
