import { AudioSys } from '../audio/audio.js';
import { URLS } from '../core/assets.js';
import { G, curDate, persist, state } from '../core/save.js';
import { $, esc, frSpace, pct, shuffle } from '../core/utils.js';
import { ASSISTANTS, CAND_BAD, TEAM_MAX } from '../data/assistants.js';
import { ECO } from '../data/economy.js';
import { registerPortraits } from '../render/portraits.js';
import { ACTOR_NAMES } from '../story/talk.js';
import { toast } from '../ui/helpers.js';
import { HUD } from '../ui/hud.js';
import { ICON } from '../ui/icons.js';
import { closeModal, openModal } from '../ui/modals.js';
import { VOICES } from '../audio/audio.js';
import { Contracts } from './contracts.js';
import { Room } from '../scenes/room.js';

/* ================= Your team of assistants (Mathieu first, then up to 4 with a bigger cabinet) ================= */
export const MATHIEU = { name: 'Mathieu', spec: 'Polyvalent', skill: 1, perk: {}, pitch: '' };
export const firstName = (id) => (id === 'mathieu' ? 'Mathieu' : ASSISTANTS[id].name.split(' ')[0]);
export const fullName = (id) => (id === 'mathieu' ? 'Mathieu' : ASSISTANTS[id].name);
export const defOf = (id) => (id === 'mathieu' ? MATHIEU : ASSISTANTS[id]);
/* Everybody working in your cabinet, in arrival order: [{ id, rate, since }] */
export function assistants() {
  const out = []; if (G.staff.mathieu) out.push({ id: 'mathieu', ...G.staff.mathieu });
  return out.concat(G.staff.team || []);
}
export const teamMax = () => TEAM_MAX[Math.min(TEAM_MAX.length - 1, G.cab.level)] || 0;
/* Assistants share your plateau technique on staggered hours (evenings, Saturdays…). */
export const assistSlots = (a) => Math.min(ECO.perKine, Room.stations('C').length) * ECO.teamShare * defOf(a.id).skill;
export const teamPerk = (k) => assistants().reduce((s, a) => s + (defOf(a.id).perk[k] || 0), 0);

/* Portraits, names and voices of the new assistants, registered once at start. */
export function registerTeamActors() {
  const base = VOICES.mathieu;
  Object.entries(ASSISTANTS).forEach(([id, A], i) => {
    registerPortraits(id, A.look);
    ACTOR_NAMES[id] = A.name;
    VOICES[id] = { ...base, base: A.f ? 230 + (i % 4) * 14 : 130 + (i % 4) * 16, fm: 1 + (i % 3) * 0.06 };
  });
}

export const Team = {
  /* A few candidates show up each month while a place is free. */
  refresh(force) {
    const s = G.staff;
    if (!s.cands) s.cands = [];
    const taken = new Set(assistants().map((a) => a.id));
    s.cands = s.cands.filter((c) => !taken.has(c.id));
    if (!force && s.cands.length >= 3) return;
    const pool = shuffle(Object.keys(ASSISTANTS).filter((id) => !taken.has(id) && !s.cands.some((c) => c.id === id)));
    while (s.cands.length < 3 && pool.length) {
      const id = pool.pop(), r = Math.random();
      s.cands.push({ id, ver: 1, state: 'open', bad: r < 0.35 ? [] : shuffle(CAND_BAD).slice(0, r < 0.75 ? 1 : 2).concat(Math.random() < 0.3 ? ['redev'] : []) });
    }
    persist();
  },
  monthly() {
    if (G.phase !== 'titulaire') return;
    const s = G.staff; if (!s.cands) s.cands = [];
    /* one candidate leaves, a new one comes */
    if (s.cands.length && Math.random() < 0.5) s.cands.shift();
    if (G.staff.mathieu && assistants().length < teamMax()) {
      const before = s.cands.length; this.refresh();
      if (s.cands.length > before && !G.flags.candTip) { G.flags.candTip = true; persist(); toast('Des kinés veulent devenir tes assistants ! Touche le <b>+</b> à côté de « Assistants ».', 4600); }
    }
  },
  canRecruit() { return G.phase === 'titulaire' && !!G.staff.mathieu && assistants().length < teamMax(); },
  open() {
    if (G.phase !== 'titulaire' || G.cab.level < 1) return false;
    if (this.canRecruit()) this.refresh();
    this.render(); openModal('team'); return true;
  },
  render() {
    const list = assistants(), max = teamMax(), s = G.staff;
    const card = (a) => {
      const D = defOf(a.id), perk = this.perkText(D);
      return `<div class="tmc"><img src="${URLS['av_' + a.id]}" alt=""><div class="tmc-t"><b>${esc(fullName(a.id))}</b><small>${esc(frSpace(D.spec))} · redevance ${pct(a.rate)}</small>${perk ? `<span class="tmc-perk">${ICON.star}${esc(frSpace(perk))}</span>` : ''}</div>${a.id === 'mathieu' ? '' : `<button type="button" class="btn sm btn-gray" data-tm-fire="${a.id}">Se séparer</button>`}</div>`;
    };
    let html = `<div class="tm-head">${frSpace(`Ton équipe : <b>${list.length} / ${max}</b> assistant${max > 1 ? 's' : ''}`)}<small>${frSpace(max < 4 ? `Agrandis ton cabinet pour accueillir plus d’assistants (${TEAM_MAX.map((n, l) => (l >= 2 ? `niv. ${l} : ${n}` : '')).filter(Boolean).join(' · ')}).` : 'Ton cabinet est au maximum : 4 assistants !')}</small></div>`;
    html += `<div class="tm-list">${list.map(card).join('') || `<p class="tm-empty">${frSpace(G.cab.level < 2 ? 'Un assistant pourra te rejoindre quand ton cabinet sera au <b>niveau 2</b>.' : 'Mathieu, ton premier assistant, va bientôt venir te proposer son contrat : surveille la route devant ton cabinet !')}</p>`}</div>`;
    if (G.staff.mathieu && list.length < max) {
      this.refresh();
      html += `<h3 class="tm-h3">${frSpace('Candidatures')}</h3><div class="tm-cands">${(s.cands || []).map((c) => {
        const D = ASSISTANTS[c.id], perk = this.perkText(D);
        return `<button type="button" class="tm-cand" data-tm-cand="${c.id}"${c.state === 'ordre' ? ' disabled' : ''}><img src="${URLS['av_' + c.id]}" alt=""><b>${esc(D.name)}</b><small>${esc(frSpace(D.spec))}</small><span class="tmc-perk">${ICON.star}${esc(frSpace(perk))}</span><q>${esc(frSpace(D.pitch))}</q><span class="tm-go">${c.state === 'ordre' ? `${ICON.envelope} Avis de l’Ordre en cours` : `${ICON.board} Lire son contrat${c.ver > 1 ? ' corrigé' : ''}`}</span></button>`;
      }).join('')}</div>`;
    } else if (G.staff.mathieu && list.length >= max && max < 4) html += `<p class="tm-empty">${frSpace(`Plus de place pour l’instant : passe au <b>niveau ${G.cab.level + 1}</b> pour recruter un nouvel assistant.`)}</p>`;
    html += `<p class="tm-note">${frSpace('Tes assistants libéraux encaissent leurs honoraires avec leur propre carte CPS et te reversent une <b>redevance</b> (gains divers sur ta 2035). Ils partagent ton plateau technique en horaires décalés.')}</p>`;
    $('tmBody').innerHTML = html;
  },
  perkText(D) {
    const p = D.perk || {};
    if (p.patients) return `+${p.patients} patients par mois (bouche-à-oreille)`;
    if (p.xp) return `+${p.xp} XP par mois (il partage ses connaissances)`.replace('il partage', D.f ? 'elle partage' : 'il partage');
    if (p.rend) return `+${Math.round(p.rend * 100)} % de rendement pour tout le cabinet`;
    return '';
  },
  async read(id) {
    const c = (G.staff.cands || []).find((x) => x.id === id); if (!c || c.state === 'ordre') return;
    closeModal('team'); await Contracts.open('hire', c);
  },
  async hired(c, rate) {
    G.staff.team = (G.staff.team || []).concat([{ id: c.id, rate, since: { ...curDate() } }]);
    G.staff.cands = (G.staff.cands || []).filter((x) => x.id !== c.id); persist();
  },
  /* The Ordre answered about a candidate's contract: back to the list, corrected if needed. */
  afterAvis(id, bad) { const c = (G.staff.cands || []).find((x) => x.id === id); if (c) { c.state = 'open'; c.bad = []; if (bad) c.ver = 2; persist(); } },
  rejected(c, corrected) {
    const x = (G.staff.cands || []).find((y) => y.id === c.id);
    if (x) { if (corrected) { x.ver = 2; x.bad = []; x.state = 'open'; } else G.staff.cands = G.staff.cands.filter((y) => y !== x); }
    persist();
  },
  fire(id) {
    if (state.busy) return;
    const btn = document.querySelector(`[data-tm-fire="${id}"]`);
    if (btn && !btn.dataset.armed) { btn.dataset.armed = '1'; btn.textContent = 'Sûr ?'; AudioSys.wrong(); return; }
    G.staff.team = (G.staff.team || []).filter((a) => a.id !== id); persist();
    AudioSys.tap(); toast(`${esc(fullName(id))} quitte ton cabinet. Fin du contrat, dans le respect du préavis prévu.`);
    HUD.render(); Room.renderTeam(); this.render();
  }
};
$('team').addEventListener('click', (e) => {
  const c = e.target.closest('[data-tm-cand]'); if (c && !c.disabled) { AudioSys.tap(); Team.read(c.dataset.tmCand); return; }
  const f = e.target.closest('[data-tm-fire]'); if (f) Team.fire(f.dataset.tmFire);
});
