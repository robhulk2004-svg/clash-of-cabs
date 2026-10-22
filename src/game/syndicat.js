import { AudioSys } from '../audio/audio.js';
import { G, persist } from '../core/save.js';
import { $, esc, frSpace } from '../core/utils.js';
import { ITEMS } from '../data/shop-items.js';
import { SYNDICATS, SYN_COSMETICS, SYN_LEVELS } from '../data/syndicats.js';
import { toast } from '../ui/helpers.js';
import { HUD } from '../ui/hud.js';
import { ICON } from '../ui/icons.js';
import { showReward } from '../ui/modals.js';

/* ================= Syndicats: choose a faction, earn syndicat XP, unlock perks and cosmetics ================= */
const EMBLEMS = {
  tree: (c, c2) => `<path d="M60,104 V70" stroke="#5b3a1e" stroke-width="12" stroke-linecap="round"/><circle cx="60" cy="46" r="30" fill="${c}"/><circle cx="36" cy="60" r="20" fill="${c}"/><circle cx="84" cy="60" r="20" fill="${c}"/><circle cx="52" cy="38" r="8" fill="${c2}"/><circle cx="74" cy="52" r="6" fill="${c2}"/><circle cx="42" cy="62" r="6" fill="${c2}"/>`,
  shield: (c, c2) => `<path d="M60,10 L100,24 V58 C100,84 82,102 60,112 C38,102 20,84 20,58 V24 Z" fill="${c}" stroke="#1a1f36" stroke-width="6"/><path d="M34,46 L60,72 L86,46" fill="none" stroke="${c2}" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/><path d="M60,22 l5,10 11,1 -8,7 2,11 -10,-6 -10,6 2,-11 -8,-7 11,-1z" fill="${c2}"/>`,
  hands: (c, c2) => `<path d="M14,92 H106" stroke="#1a1f36" stroke-width="7" stroke-linecap="round"/><path d="M26,92 V60 M46,92 V48 M74,92 V48 M94,92 V60" stroke="${c}" stroke-width="13" stroke-linecap="round"/><path d="M22,40 L60,16 L98,40 Z" fill="${c2}" stroke="#1a1f36" stroke-width="6" stroke-linejoin="round"/>`
};
export const emblemSVG = (id, size = 120) => { const S = SYNDICATS[id]; return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${EMBLEMS[S.emblem](S.col, S.col2)}</svg>`; };
const emblemImgs = {};
export function emblemImg(id) {
  if (!emblemImgs[id]) { const i = new Image(); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(emblemSVG(id, 240)); emblemImgs[id] = i; }
  return emblemImgs[id];
}
const st = () => G.syn || (G.syn = { id: null, xp: {} });

export const Syndic = {
  member() { return st().id && G.owned.syndicat ? st().id : null; },
  def() { const id = this.member(); return id ? SYNDICATS[id] : null; },
  short() { const d = this.def(); return d ? d.short : 'syndicat'; },
  /* « du Réseau », « du Bouclier », « de l’Agora » */
  deShort() { const s = this.short(); return s.startsWith('Le ') ? 'du ' + s.slice(3) : s.startsWith('L’') ? 'de l’' + s.slice(2) : 'de ' + s; },
  xp(id = this.member()) { return id ? st().xp[id] || 0 : 0; },
  level(id = this.member()) { if (!id) return 0; const x = this.xp(id); let l = 0; SYN_LEVELS.forEach((n, i) => { if (x >= n) l = i + 1; }); return l; },
  /* value of a perk unlocked at the current level (the best one if several) */
  perk(k) { const d = this.def(), l = this.level(); if (!d) return 0; return d.perks.filter((p) => p.k === k && p.lvl <= l).reduce((m, p) => Math.max(m, p.v), 0); },
  cosmetic(lvl) { return !!this.member() && this.level() >= lvl; },
  rendBonus() { return this.perk('rend'); },
  rcpDiscount() { return this.perk('rcp'); },
  xpBonus() { return this.perk('xp'); },
  formDiscount() { return this.perk('formDiscount'); },
  feeDiscount() { return this.perk('fee'); },
  async gain(n, why) {
    const id = this.member(); if (!id || !n) return;
    const before = this.level(); st().xp[id] = this.xp(id) + n; persist();
    const after = this.level();
    if (after > before) {
      const d = SYNDICATS[id], perk = d.perks.find((p) => p.lvl === after), cos = SYN_COSMETICS.find((c) => c.lvl === after);
      AudioSys.fanfare && AudioSys.fanfare();
      await showReward({ ribbon: `Syndicat · niveau ${after} !`, artHTML: emblemSVG(id, 220), title: d.name, gains: [perk && perk.t, cos && cos.t].filter(Boolean), xp: 0, bonusText: why ? `Grâce à : ${why}` : '' });
      HUD.render();
    }
  },
  /* ---------- picker / membership window ---------- */
  choose() {
    return new Promise((resolve) => { this.resolve = resolve; this.render(); $('syndic').hidden = false; AudioSys.pop(); });
  },
  view() { this.resolve = null; this.render(); $('syndic').hidden = false; AudioSys.pop(); },
  close(pick) { $('syndic').hidden = true; const r = this.resolve; this.resolve = null; if (r) r(pick || null); },
  render() {
    const cur = this.member(), fee = Math.round(ITEMS.syndicat.price * (1 - this.feeDiscount()));
    $('syBody').innerHTML = `<p class="sy-help">${frSpace(cur ? `Tu es adhérent du <b>${esc(SYNDICATS[cur].name)}</b>. Ton XP de syndicat grimpe quand tu travailles, réponds juste et vis les événements du jeu.` : 'Un syndicat <b>défend tes intérêts</b> (contrats, juridique, négociations). Choisis le tien : chacun a ses idées, ses avantages et ses couleurs. Cotisation <b>déductible</b>.')}</p>
      <div class="sy-cards">${Object.entries(SYNDICATS).map(([id, S]) => {
        const lvl = this.level(id), x = this.xp(id), mine = cur === id, next = SYN_LEVELS[lvl] ?? null;
        const bar = id in st().xp ? `<div class="sy-xp"><span style="width:${next == null ? 100 : Math.min(100, ((x - (SYN_LEVELS[lvl - 1] || 0)) / (next - (SYN_LEVELS[lvl - 1] || 0))) * 100)}%"></span><b>Niv. ${lvl} · ${x} XP${next != null ? ` / ${next}` : ' · max'}</b></div>` : '';
        return `<div class="sy-card${mine ? ' mine' : ''}" style="--sy:${S.col};--sy2:${S.col2}">
          <div class="sy-top">${emblemSVG(id, 92)}<div><b>${esc(frSpace(S.name))}</b><i>${esc(frSpace(S.motto))}</i></div></div>
          <p class="sy-pitch">${esc(frSpace(S.pitch))}</p>
          <div class="sy-vals">${S.values.map((v) => `<span>${esc(frSpace(v))}</span>`).join('')}</div>
          <ul class="sy-perks">${S.perks.map((p) => `<li class="${mine && lvl >= p.lvl ? 'on' : ''}"><span>${p.lvl}</span>${esc(frSpace(p.t))}</li>`).join('')}</ul>
          ${bar}
          <button type="button" class="btn sm ${mine ? 'btn-gray' : 'btn-green'}" data-sy="${id}"${mine ? ' disabled' : ''}>${mine ? 'Ton syndicat' : cur ? 'Changer pour celui-ci' : `Adhérer · ${fee} €/an`}</button>
        </div>`;
      }).join('')}</div>
      <p class="sy-note">${frSpace('Factions fictives inspirées des grandes sensibilités syndicales de la profession. Récompenses à chaque niveau : ' + SYN_COSMETICS.map((c) => c.t.toLowerCase()).join(' · ') + '.')}</p>`;
  },
  async pick(id) {
    if (this.resolve) { this.close(id); return; }
    /* already a member: switching is free until the next renewal, your XP stays with each syndicat */
    st().id = id; if (!(id in st().xp)) st().xp[id] = 0; persist(); AudioSys.stamp();
    toast(`Tu rejoins <b>${esc(SYNDICATS[id].name)}</b>. Ta cotisation actuelle reste valable jusqu’au renouvellement.`, 4200);
    this.render(); HUD.render();
  },
  joined(id) { st().id = id; if (!(id in st().xp)) st().xp[id] = 0; persist(); HUD.render(); },
  badgeHTML() { const id = this.member(); return id && this.cosmetic(1) ? `<span class="sy-badge" title="${esc(SYNDICATS[id].name)}">${emblemSVG(id, 34)}</span>` : ''; }
};
$('syndic').addEventListener('click', (e) => {
  if (e.target.closest('[data-sy-close]')) { AudioSys.tap(); Syndic.close(null); return; }
  const b = e.target.closest('[data-sy]'); if (b && !b.disabled) { AudioSys.tap(); Syndic.pick(b.dataset.sy); }
});
