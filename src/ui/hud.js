import { AudioSys } from '../audio/audio.js';
import { G, PHASES, PHASES_F, persist, xpNeed } from '../core/save.js';
import { $, esc, fmt, monthShort, wait } from '../core/utils.js';
import { Board } from '../game/board.js';
import { Formation } from '../game/formation.js';
import { Letters } from '../game/letters.js';
import { questsAllDone } from '../game/quests.js';
import { MONEY_PT, coinFlight, floatText, stageRect } from './helpers.js';
import { ICON } from './icons.js';
import { showLevelUp } from './modals.js';

/* ================= HUD ================= */
const staffCount = () => ((G.staff && G.staff.list) || []).length;
export const HUD = {
  shown: G.money,
  render() {
    $('hudLevel').textContent = G.level;
    const need = xpNeed(G.level);
    $('hudXpText').textContent = `${G.xp} / ${need}`;
    $('hudXpFill').style.width = Math.min(100, (G.xp / need) * 100) + '%';
    const m = $('hudMoney'); m.textContent = fmt(this.shown); m.classList.toggle('neg', this.shown < 0);
    $('hudPat').textContent = G.patients; $('hudAss').textContent = staffCount();
    const ps = $('hudPseudo'); ps.hidden = !G.pseudo; ps.textContent = G.pseudo ? `${G.pseudo} · ${(G.gender === 'f' ? PHASES_F : PHASES)[G.phase] || ''}` : '';
    const dc = $('hudDate'); dc.hidden = !G.date; if (G.date) dc.innerHTML = `${ICON.calendar}<span>${esc(monthShort(G.date))}</span>`;
    $('btnCompta').hidden = !G.journal.some((e) => e.cat !== 'hors') && !G.date;
    $('btnBoard').hidden = !(G.phase === 'rempl' || G.flags.boardShown && G.phase === 'assist' && !G.contract);
    $('btnBoard').querySelector('.gb-badge').hidden = !Board.newCount();
    $('btnBoard').querySelector('.gb-badge').textContent = Board.newCount();
    Letters.renderChip(); Formation.renderChip();
    const b = $('qBadge'), done = questsAllDone();
    b.classList.toggle('done', done); b.innerHTML = done ? ICON.tick : '!';
  },
  tweenMoney() {
    const from = this.shown, to = G.money, t0 = performance.now(), d = 800, el = $('hudMoney');
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
    const step = (t) => { const k = Math.min(1, (t - t0) / d); this.shown = from + (to - from) * (1 - Math.pow(1 - k, 3)); el.textContent = fmt(this.shown); el.classList.toggle('neg', this.shown < 0); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
};
export async function pay(price, el) {
  if (!price) return;
  const r = el ? stageRect(el) : { x: 900, y: 500, w: 120, h: 80 };
  G.money -= price; persist();
  AudioSys.coin(); floatText(1056, 112, `−${fmt(price)} €`, 'neg'); HUD.tweenMoney();
  await coinFlight(MONEY_PT.x, MONEY_PT.y, r.x + r.w / 2, r.y + r.h / 2, Math.min(10, 4 + Math.round(price / 300)));
}

export async function addXP(n) {
  if (!n) return;
  floatText(603, 118, `+${n} XP`, 'xp'); AudioSys.tick();
  G.xp += n; persist(); HUD.render();
  while (G.xp >= xpNeed(G.level)) {
    $('hudXpFill').style.width = '100%'; await wait(800);
    G.xp -= xpNeed(G.level); G.level += 1; persist(); HUD.render();
    await showLevelUp(G.level);
  }
}
