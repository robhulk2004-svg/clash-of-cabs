import { AudioSys } from '../audio/audio.js';
import { URLS } from '../core/assets.js';
import { G } from '../core/save.js';
import { $, MENTOR, TEST, esc, frSpace, raf2, reduceMotion, wait } from '../core/utils.js';
import { Guide } from '../ui/guide.js';
import { hideToast } from '../ui/helpers.js';

/* ================= Dialogue engine ================= */
const ACTOR_NAMES = { mentor: MENTOR, goblin: 'Gobelin de la CPAM', ambroise: 'Ambroise', mathieu: 'Mathieu Mopourmot', marvin: "Marvin · URSSAF", menton: 'Mickael Menton', thomas: 'Thomas Cassmoildeau', julien: 'Julien Coulommiers', etienne: 'Étienne Poulet', damien: 'Damien · Chevalier de la Sécu',
  fee: 'Ninassurance · Assurances', sage: 'Alex Cloppe · CARPIMKO', chad: 'Chad Cook', gabriel: 'Gabriel', mathis: 'Mathis', paul: 'Paul', clement: 'Clément Bingo', suzie: 'Suzie Taillebois', alien: 'Un alien' };
const ACTOR_THEME = { marvin: 'urssaf', goblin: 'cnam' };
/* portraits drawn for each character: which expressions exist, and what to show instead */
const EXPRS = { mentor: ['happy', 'think', 'scared'], playerf: ['happy', 'joy', 'think'], ambroise: ['happy', 'joy', 'think'], gabriel: ['happy', 'joy', 'think'], mathis: ['happy', 'joy', 'think'], paul: ['happy', 'joy', 'think'], chad: ['happy', 'joy', 'think'], fee: ['happy', 'joy', 'think'], sage: ['happy', 'joy', 'think'], clement: ['happy', 'joy', 'think'], suzie: ['happy', 'joy', 'think'], alien: ['happy', 'joy', 'think'] };
function portraitKey(w, expr) {
  if (w === 'player' && G.gender === 'f') w = 'playerf';
  const E = EXPRS[w]; let e = expr || 'happy';
  if (E && !E.includes(e)) e = e === 'scared' ? (E.includes('think') ? 'think' : 'happy') : e === 'think' ? 'happy' : 'happy';
  return `${w}_${e}`;
}
export const Talk = {
  active: false, waiting: null, typing: null, asking: false, keyPick: null,
  el: $('talk'), box: $('talkBox'), text: $('talkText'), plate: $('nameplate'), choices: $('choices'),
  slots: { left: { el: $('actorL'), who: null, expr: null }, right: { el: $('actorR'), who: null, expr: null } },
  async open() {
    if (this.active) return;
    this.active = true; Guide.hide(); hideToast();
    this.el.hidden = false; this.text.innerHTML = ''; this.plate.style.visibility = 'hidden'; this.box.classList.remove('done');
    await raf2(); this.el.classList.add('on'); AudioSys.duck(true); await wait(220);
  },
  async close(keepTheme) {
    if (!this.active) return;
    this.el.classList.remove('on');
    for (const s of Object.values(this.slots)) { s.el.classList.remove('in', 'behind', 'bust'); s.who = null; s.expr = null; }
    AudioSys.duck(false); if (!keepTheme) AudioSys.setTheme(AudioSys.home()); await wait(400);
    this.el.hidden = true; this.active = false;
  },
  patient: null,
  name(w) { if (w === 'patient') return this.patient ? this.patient.name : 'Le patient'; return ACTOR_NAMES[w] || (G.pseudo || 'Toi'); },
  src(w, expr) {
    if (w === 'goblin') return URLS.goblin;
    if (w === 'patient') { const p = this.patient || { img: 0 }, e = expr === 'scared' ? 'scared' : expr === 'happy' ? 'happy' : 'calm'; return URLS[`pat${p.img}_${e}`] || `assets/pat${p.img}_${e}.webp`; }
    const k = portraitKey(w, expr); return URLS[k] || `assets/${k}.webp`;
  },
  async actor(w, expr) {
    const side = w === 'player' ? 'right' : 'left', s = this.slots[side];
    if (ACTOR_THEME[w]) AudioSys.setTheme(ACTOR_THEME[w]);
    if (s.who !== w) {
      if (s.who) { s.el.classList.remove('in'); await wait(320); }
      s.el.src = this.src(w, expr); s.who = w; s.expr = expr; s.el.classList.toggle('patient', w === 'patient');
      await raf2(); s.el.classList.add('in'); AudioSys.emote(w, expr, true);
    } else if (s.expr !== expr) {
      s.el.src = this.src(w, expr); s.expr = expr;
      s.el.classList.remove('bump'); void s.el.offsetWidth; s.el.classList.add('bump'); AudioSys.emote(w, expr, false);
    }
    s.el.classList.remove('behind');
    const o = this.slots[side === 'left' ? 'right' : 'left']; if (o.who) o.el.classList.add('behind');
    this.plate.textContent = this.name(w); this.plate.className = 'nameplate ' + (w === 'player' && G.gender === 'f' ? 'playerf player' : w) + (side === 'right' ? ' right' : '');
    this.plate.style.visibility = 'visible';
  },
  type(w, raw) {
    const text = frSpace(raw);
    this.box.classList.remove('done'); $('sr').textContent = `${this.name(w)} : ${text}`;
    return new Promise((resolve) => {
      let i = 0, last = performance.now(), acc = 0, letters = 0;
      const total = text.length, question = /\?\s*$/.test(text);
      const render = () => { this.text.innerHTML = `<span>${esc(text.slice(0, i))}</span><span class="rest">${esc(text.slice(i))}</span>`; };
      const finish = () => { i = total; render(); this.typing = null; this.box.classList.add('done'); resolve(); };
      this.typing = finish;
      render(); this.fit();
      if (reduceMotion || (TEST && TEST.fastWait)) { finish(); return; }
      const step = (t) => {
        if (this.typing !== finish) return;
        acc += Math.min(80, t - last); last = t;
        while (acc >= 0 && i < total) {
          const ch = text[i]; i++;
          acc -= '.!?…'.includes(ch) ? 240 : ',;:'.includes(ch) ? 120 : 1000 / 46;
          if (/[A-Za-zÀ-ÿ]/.test(ch) && letters++ % 3 === 0) AudioSys.blip(w, ch, i / total, question);
        }
        render();
        if (i >= total) finish(); else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  },
  /* Long lines shrink so that they always stay inside the dialogue box. */
  fit() {
    const t = this.text, b = this.box, cs = getComputedStyle(b);
    const avail = b.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    let fs = 39; t.style.fontSize = '';
    while (t.scrollHeight > avail + 2 && fs > 25) { fs -= 2; t.style.fontSize = fs + 'px'; }
  },
  async say(w, expr, raw) {
    await this.actor(w, expr); await this.type(w, raw);
    return new Promise((res) => { this.waiting = res; });
  },
  async ask(w, expr, raw, options, correct) {
    await this.actor(w, expr);
    this.asking = true;
    await this.type(w, raw);
    this.box.classList.remove('done');
    const pick = await new Promise((res) => {
      this.choices.innerHTML = '';
      options.forEach((o, k) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.style.animationDelay = k * 90 + 'ms';
        b.innerHTML = `<span class="key">${'ABC'[k]}</span><span>${esc(frSpace(o))}</span>`;
        b.addEventListener('click', (e) => { e.stopPropagation(); res(k); });
        this.choices.appendChild(b);
      });
      this.choices.hidden = false; this.keyPick = (k) => { if (k < options.length) res(k); };
    });
    this.keyPick = null;
    const btns = [...this.choices.children], ok = pick === correct;
    btns.forEach((b) => { b.disabled = true; });
    btns[pick].classList.add(ok ? 'right' : 'wrong'); if (!ok) btns[correct].classList.add('right');
    ok ? AudioSys.right() : AudioSys.wrong();
    await wait(ok ? 800 : 1400);
    this.choices.hidden = true; this.choices.innerHTML = ''; this.asking = false;
    return ok;
  },
  tap() {
    if (!this.active) return;
    if (this.typing) { this.typing(); return; }
    if (this.asking) return;
    if (this.waiting) { const w = this.waiting; this.waiting = null; AudioSys.tap(); w(); }
  }
};
$('talk').addEventListener('pointerdown', (e) => { if (e.target.closest('.choice')) return; Talk.tap(); });
export const say = (w, e, t) => Talk.say(w, e, t);
export const quiz = (w, e, q, opts, correct) => Talk.ask(w, e, q, opts, correct);
