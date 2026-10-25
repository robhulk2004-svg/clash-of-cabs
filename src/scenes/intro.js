import { AudioSys } from '../audio/audio.js';
import { Score } from '../audio/score.js';
import { URLS, need } from '../core/assets.js';
import { coarse, layout, setFreezeLayout } from '../core/layout.js';
import { G, gx, persist } from '../core/save.js';
import { $, TEST, esc, frSpace, raf2, reduceMotion, wait } from '../core/utils.js';
import { UIFX } from '../fx/effects.js';
import { hideToast } from '../ui/helpers.js';

/* ================= Opening cinematic: the new graduate ================= */
const INTRO = [
  { img: 'intro1', kick: 'K2 → K5', text: "Cinq ans d'études. Anatomie, biomécanique, physiologie… et environ quatre mille cafés.", pan: 'a', tr: 'open' },
  { img: 'intro2', kick: 'En amphi', text: "Des heures de cours sur le contrôle moteur du genou. Il a même pris des notes. Parfois.", pan: 'b', tr: 'whip' },
  { img: 'intro3', kick: 'En stage', text: 'Les stages ! Ses premiers vrais patients… qui ne se doutaient de rien.', pan: 'c', tr: 'zoom' },
  { img: 'intro4', kick: 'Vie étudiante', text: "Les soirées de promo, pour… renforcer le lien social. C'est du biopsychosocial, ça compte.", pan: 'b', tr: 'flash' },
  { img: 'intro5', kick: 'Entraînement', text: "Sans oublier l'entretien du matériel de démonstration : lui-même.", pan: 'a', tr: 'slam' },
  { img: 'intro6', kick: 'Juin 2027', text: "DIPLÔMÉ ! Masseur-kinésithérapeute d'État. Maintenant… il va falloir gagner sa vie.", pan: 'c', tr: 'epic' }
];
/* the same story for the girl (introf1 … introf6) */
const INTRO_F = [
  { img: 'introf1', kick: 'K2 → K5', text: "Cinq ans d'études. Anatomie, biomécanique, physiologie… et environ quatre mille cafés.", pan: 'a', tr: 'open' },
  { img: 'introf2', kick: 'En amphi', text: 'Des heures de cours sur le contrôle moteur du genou. Elle a même pris des notes. Parfois.', pan: 'b', tr: 'whip' },
  { img: 'introf3', kick: 'En stage', text: 'Les stages ! Ses premiers vrais patients… qui ne se doutaient de rien.', pan: 'c', tr: 'zoom' },
  { img: 'introf4', kick: 'Vie étudiante', text: "Les soirées de promo, pour… renforcer le lien social. C'est du biopsychosocial, ça compte.", pan: 'b', tr: 'flash' },
  { img: 'introf5', kick: 'Entraînement', text: 'Sans oublier le renforcement musculaire : la meilleure preuve, c’est l’exemple.', pan: 'a', tr: 'slam' },
  { img: 'introf6', kick: 'Juin 2027', text: "DIPLÔMÉE ! Masseuse-kinésithérapeute d'État. Maintenant… il va falloir gagner sa vie.", pan: 'c', tr: 'epic' }
];
const list = () => (G.gender === 'f' ? INTRO_F : INTRO);
export const Intro = {
  active: false, i: 0, resolve: null, typing: null, timer: 0, skipAll: false,
  prepare() {
    const el = $('intro'); el.hidden = false; el.classList.add('on'); el.classList.remove('final');
    for (const k of ['A', 'B']) { $('inSlot' + k).className = 'in-slot'; $('inImg' + k).className = 'in-img'; }
    $('inImgA').src = URLS[list()[0].img]; $('inText').textContent = ''; $('inKick').textContent = ''; $('inStamp').className = 'in-stamp'; $('inRays').className = 'in-rays';
    $('inTitle').innerHTML = `<small>IFMK · de K2 à K5</small><b>${gx('Le nouveau diplômé', 'La nouvelle diplômée')}</b>`; $('inStamp').textContent = gx('Diplômé !', 'Diplômée !');
    $('inCap').classList.remove('in'); $('inDots').innerHTML = '';
  },
  play() {
    return new Promise(async (resolve) => {
      this.active = true; this.resolve = resolve; this.i = -1; this.skipAll = false;
      this.prepare(); await raf2();
      AudioSys.stopCurrent(1.2); Score.start();
      /* title card */
      const tc = $('inTitle'); tc.className = 'in-title show';
      await wait(TEST && TEST.fastWait ? 30 : 2600);
      tc.className = 'in-title out';
      if (this.skipAll) return;
      this.next();
    });
  },
  async next() {
    clearTimeout(this.timer);
    if (this.ending) return;
    this.i++; const gen = this.gen = (this.gen || 0) + 1;
    const L = list();
    if (this.i >= L.length || this.skipAll) { this.end(); return; }
    const s = L[this.i], front = this.i % 2 ? 'B' : 'A', back = this.i % 2 ? 'A' : 'B';
    const fs = $('inSlot' + front), fi = $('inImg' + front), bs = $('inSlot' + back);
    Score.go(this.i);
    fi.src = URLS[s.img]; fi.className = 'in-img pan-' + s.pan;
    fs.className = 'in-slot'; void fs.offsetWidth; fs.className = `in-slot front tr-${s.tr}`; fi.classList.add('kb');
    if (this.i > 0) { bs.className = `in-slot back out-${s.tr}`; }
    const fx = { open: () => AudioSys.whoosh(0.9, true), whip: () => AudioSys.whoosh(0.4, true), zoom: () => AudioSys.whoosh(0.7, false), flash: () => this.flash(0.35), slam: () => { this.flash(0.25); this.shake(); }, epic: () => this.epic() };
    (fx[s.tr] || fx.open)();
    const cap = $('inCap'); cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
    $('inKick').textContent = frSpace(s.kick);
    $('inDots').innerHTML = L.map((x, k) => `<span class="${k === this.i ? 'on' : k < this.i ? 'done' : ''}"></span>`).join('');
    await this.type(s.text);
    if (gen !== this.gen || this.ending) return;
    this.timer = setTimeout(() => this.next(), TEST && TEST.fastWait ? 50 : s.tr === 'epic' ? 5200 : 3400);
  },
  flash(peak) { const f = $('inFlash'); f.style.setProperty('--peak', peak); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); },
  shake() { const f = $('intro').querySelector('.in-frame'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); },
  /* the diploma: white flash, golden rays, confetti and the big stamp */
  epic() {
    const el = $('intro'); el.classList.add('final');
    this.flash(1); this.shake();
    $('inRays').className = 'in-rays show';
    setTimeout(() => { $('inStamp').className = 'in-stamp show'; AudioSys.stamp(); }, 650);
    const pop = (x, y, n) => UIFX.burst(x, y, n);
    setTimeout(() => { pop(380, 760, 90); pop(1540, 760, 90); }, 450);
    setTimeout(() => pop(960, 640, 120), 1300);
    setTimeout(() => { pop(260, 860, 60); pop(1660, 860, 60); }, 2400);
  },
  type(raw) {
    const text = frSpace(raw), el = $('inText'); $('intro').classList.remove('done');
    return new Promise((resolve) => {
      let i = 0;
      const finish = () => { i = text.length; el.innerHTML = esc(text); this.typing = null; $('intro').classList.add('done'); resolve(); };
      this.typing = finish;
      if (reduceMotion || (TEST && TEST.fastWait)) { finish(); return; }
      const step = () => {
        if (this.typing !== finish) return;
        i = Math.min(text.length, i + 1);
        el.innerHTML = `<span>${esc(text.slice(0, i))}</span><span class="rest">${esc(text.slice(i))}</span>`;
        if (i % 3 === 0 && /[A-Za-zÀ-ÿ]/.test(text[i - 1] || '')) AudioSys.voice('player', 'aeiou'[i % 5], { vol: 0.3, dur: 0.05 });
        if (i < text.length) setTimeout(step, '.!?…'.includes(text[i - 1]) ? 220 : 26); else finish();
      };
      step();
    });
  },
  tap() { if (!this.active || this.i < 0) return; if (this.typing) { this.typing(); return; } AudioSys.tap(); this.next(); },
  skip() { if (!this.active || this.ending) return; this.skipAll = true; this.gen++; if (this.typing) this.typing(); this.next(); },
  async end() {
    if (this.ending) return; this.ending = true;
    clearTimeout(this.timer);
    Score.stop(this.i >= list().length ? 3 : 1.2);
    const el = $('intro'); el.classList.remove('on');
    await wait(400); el.hidden = true; el.classList.remove('final');
    G.pseudo = await askName(); G.introDone = true; G.phase = 'demarches'; persist();
    if (AudioSys.playing) AudioSys.play(AudioSys.theme, 2.5);
    this.active = false; this.ending = false;
    const r = this.resolve; this.resolve = null; if (r) r();
  }
};
$('intro').addEventListener('pointerdown', (e) => { if (e.target.closest('#inSkip')) return; Intro.tap(); });
$('inSkip').addEventListener('click', (e) => { e.stopPropagation(); AudioSys.tap(); Intro.skip(); });

/* The player chooses: a boy or a girl (before the cinematic, which is not the same). */
export function chooseGender() {
  return new Promise((resolve) => {
    $('gdImgM').src = URLS.player_happy; $('gdImgF').src = URLS.playerf_happy;
    hideToast(); $('gender').hidden = false; AudioSys.pop();
    $('gender').onclick = async (e) => {
      const b = e.target.closest('[data-gd]'); if (!b) return;
      AudioSys.stamp(); G.gender = b.dataset.gd; persist();
      $('gender').hidden = true; $('gender').onclick = null;
      if (G.gender === 'f') need(INTRO_F.map((x) => x.img));
      resolve(G.gender);
    };
  });
}
export const introImages = () => list().map((x) => x.img);
/* The player chooses the name of the young kiné. */
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} '’._-]{1,15}$/u;
function askName() {
  return new Promise((resolve) => {
    const form = $('pseudoForm'), input = $('pseudoInput'), err = $('fErr');
    $('formImg').src = URLS[gx('player_happy', 'playerf_happy')]; input.value = G.pseudo || ''; err.textContent = '';
    $('formTitle').textContent = gx('Le nouveau diplômé', 'La nouvelle diplômée');
    $('fChips').innerHTML = gx(['Kiné Moustache', 'Léo Kiné', 'Hugo Rééduc'], ['Kiné Chignon', 'Léa Kiné', 'Emma Rééduc']).map((s) => `<button type="button" class="fchip">${esc(s)}</button>`).join('');
    $('fChips').onclick = (e) => { const c = e.target.closest('.fchip'); if (c) { input.value = c.textContent; err.textContent = ''; AudioSys.tap(); } };
    hideToast(); $('form').hidden = false; AudioSys.pop();
    if (!coarse && !TEST) setTimeout(() => input.focus({ preventScroll: true }), 300);
    form.onsubmit = (e) => {
      e.preventDefault();
      const v = input.value.trim().replace(/\s+/g, ' ');
      if (!NAME_RE.test(v)) { err.textContent = frSpace('Entre 2 et 16 caractères : lettres, chiffres, espaces ou tirets.'); AudioSys.wrong(); return; }
      input.blur(); setFreezeLayout(false); layout();
      $('form').hidden = true; AudioSys.stamp(); resolve(v);
    };
  });
}
$('pseudoInput').addEventListener('focus', () => { setFreezeLayout(true); });
$('pseudoInput').addEventListener('blur', () => { setFreezeLayout(false); setTimeout(layout, 200); });
