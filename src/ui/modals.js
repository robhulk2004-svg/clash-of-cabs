import { AudioSys } from '../audio/audio.js';
import { Compta } from '../compta/ledger.js';
import { state } from '../core/save.js';
import { $, esc, frSpace } from '../core/utils.js';
import { UIFX } from '../fx/effects.js';
import { Clouds, Fade } from '../fx/transitions.js';
import { renderQuests } from '../game/quests.js';
import { Intro } from '../scenes/intro.js';
import { Talk } from '../story/talk.js';
import { Guide, refreshGuide } from './guide.js';
import { hideToast } from './helpers.js';
import { ART, ICON } from './icons.js';
import { syncSettings } from './settings.js';

/* ================= Modals ================= */
const MODALS = ['shop', 'quests', 'settings', 'form', 'reward', 'levelup', 'classify', 'month', 'contract', 'letter', 'call', 'd2035', 'compta', 'board', 'street', 'finance', 'dayEnd', 'fraude', 'jailFine', 'admin', 'choice', 'consult', 'market', 'gender'];
export const modalOpen = () => MODALS.some((id) => !$(id).hidden);
export const blocked = () => state.busy || Talk.active || modalOpen() || Fade.active || Clouds.anim || Intro.active;
export function openModal(id) {
  hideToast();
  if (id === 'quests') renderQuests();
  if (id === 'settings') syncSettings();
  if (id === 'compta') Compta.render();
  $(id).hidden = false; Guide.hide(); AudioSys.pop();
}
export function closeModal(id) { if ($(id).hidden) return; $(id).hidden = true; AudioSys.tap(); refreshGuide(); }
document.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => closeModal(el.dataset.close)));

/* ================= Reward & level up ================= */
export function showReward({ ribbon, art, artHTML, title, gains, xp, bonus, bonusText }) {
  return new Promise((resolve) => {
    $('rwRibbon').textContent = frSpace(ribbon);
    $('rwArt').innerHTML = artHTML || (ART[art] ? ART[art]() : '');
    $('rwTitle').textContent = frSpace(title);
    $('rwGains').innerHTML = (gains || []).map((g) => `<span class="chip">${ICON.check}${esc(frSpace(g))}</span>`).join('');
    $('rwXp').innerHTML = xp ? `${ICON.star}<span>+${xp} XP</span>` : ''; $('rwXp').hidden = !xp;
    $('rwBonus').textContent = bonusText ? frSpace(bonusText) : bonus ? frSpace('Dont +5 XP : bonne réponse du premier coup !') : '';
    $('rwBonus').hidden = !(bonus || bonusText);
    hideToast(); $('reward').hidden = false; AudioSys.success(); UIFX.burst(960, 330, 110);
    $('rwOk').onclick = () => { AudioSys.tap(); $('reward').hidden = true; resolve(); };
    setTimeout(() => $('rwOk').focus({ preventScroll: true }), 400);
  });
}
export function showLevelUp(level) {
  return new Promise((resolve) => {
    $('lvNum').textContent = level; $('lvSub').textContent = frSpace(`Tu passes au niveau ${level}`);
    $('lvUnlock').innerHTML = ''; $('lvUnlock').hidden = true;
    hideToast(); $('levelup').hidden = false; AudioSys.fanfare(); UIFX.burst(960, 420, 140);
    $('lvOk').onclick = () => { AudioSys.tap(); $('levelup').hidden = true; resolve(); };
    setTimeout(() => $('lvOk').focus({ preventScroll: true }), 400);
  });
}
