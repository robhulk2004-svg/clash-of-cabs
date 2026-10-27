import { AudioSys } from '../audio/audio.js';
import { G, ORDER, allSteps, firstUndone, gx, persist } from '../core/save.js';
import { $, esc, fmt, frSpace } from '../core/utils.js';
import { STEPS } from '../data/demarches.js';
import { ECO } from '../data/economy.js';
import { QUESTS } from '../data/quests.js';
import { toast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { ICON } from '../ui/icons.js';

/* ================= Quests ================= */
let questTab = null; export function resetQuestTab() { questTab = null; }
const allQuests = () => [...QUESTS.rempl, ...QUESTS.rempl_bonus, ...QUESTS.assist, ...QUESTS.titulaire, ...QUESTS.bonus];
export const Quests = {
  async done(id) {
    if (G.q[id]) return;
    const q = allQuests().find((x) => x.id === id); if (!q) return;
    G.q[id] = true; persist(); HUD.render();
    toast(`Quête accomplie : <b>${esc(frSpace(q.title))}</b> · +${q.xp} XP`, 3200);
    AudioSys.success();
    await addXP(q.xp);
  }
};
const phaseList = () => (G.phase === 'rempl' ? QUESTS.rempl : G.phase === 'assist' ? QUESTS.assist : G.phase === 'titulaire' ? QUESTS.titulaire : null);
export function questsAllDone() { const l = phaseList(); return l ? l.every((q) => G.q[q.id]) : allSteps(); }
export function renderQuests() {
  const order = ['demarches', 'rempl', 'assist', 'titulaire'], cur = Math.max(1, order.indexOf(G.phase));
  const tab = questTab || (G.phase === 'intro' ? 'demarches' : G.phase);
  const tabs = [['demarches', gx('Diplômé', 'Diplômée')], ['rempl', gx('Remplaçant', 'Remplaçante')], ['assist', gx('Assistant', 'Assistante')], ['titulaire', 'Titulaire'], ['bonus', 'Bonus']];
  const nb = QUESTS.bonus.filter((q) => G.q[q.id]).length;
  let html = `<div class="qtabs">${tabs.map(([id, l], i) => `<button type="button" class="qtab${tab === id ? ' active' : ''}" data-qt="${id}"${id !== 'bonus' && i > cur ? ' disabled' : ''}>${l}${id === 'bonus' ? ` <small>${nb}/${QUESTS.bonus.length}</small>` : ''}</button>`).join('')}</div>`;
  if (tab === 'demarches') {
    const task = firstUndone();
    html += `<div class="qsub">${frSpace('Démarches post-diplôme · dans l’ordre')}</div>` + ORDER.map((id, i) => qRow({ n: i + 1, title: STEPS[id].title, done: !!G.steps[id], cur: task === id, xp: STEPS[id].xp })).join('');
  } else if (tab === 'bonus') {
    html += `<div class="qsub">${frSpace('Explore le monde : Mériniaque, Maransin, La Réunion, le Michigan… et la Lune')}</div>` + QUESTS.bonus.map((q) => qRow({ n: '★', title: q.title, done: !!G.q[q.id], cur: false, xp: q.xp, open: true })).join('');
    html += `<p class="qnote">${frSpace('Les bâtiments de la ville (URSSAF, CARPIMKO, syndicats, assurances, cabane de la CPAM) ont chacun leurs questions. Les flèches au bord de la carte mènent aux autres destinations.')}</p>`;
  } else {
    const list = QUESTS[tab], first = list.find((q) => !G.q[q.id]);
    const sub = { rempl: `Ton année de remplacement · ${Math.min(12, G.monthsRempl)} / 12 mois`, assist: `${gx('Assistant libéral', 'Assistante libérale')} chez Mathieu, à La Réunion · ${G.monthsAssist} mois`, titulaire: `Ton propre cabinet · niveau ${G.cab.level} / 9` }[tab];
    html += `<div class="qsub">${frSpace(sub)}</div>` + list.map((q, i) => qRow({ n: i + 1, title: q.title, done: !!G.q[q.id], cur: first === q, xp: q.xp, open: true })).join('');
    if (tab === 'rempl') html += `<div class="qsub">Bonus</div>` + QUESTS.rempl_bonus.map((q) => qRow({ n: '★', title: q.title, done: !!G.q[q.id], cur: false, xp: q.xp, open: true })).join('');
    const note = { rempl: 'La déclaration 2035 arrive en janvier. Après 12 mois de remplacement, une nouvelle proposition t’attend…', assist: `Pour créer ton cabinet : ${ECO.assistMin} mois d'assistanat et ${fmt(ECO.apportMin)} € d'apport.`, titulaire: 'Chaque niveau agrandit ton cabinet et débloque du matériel.' }[tab];
    html += `<p class="qnote">${frSpace(note)}</p>`;
  }
  $('qBody').innerHTML = html;
}
function qRow(r) {
  return `<div class="qrow${r.cur ? ' cur' : ''}${!r.done && !r.cur && !r.open ? ' locked' : ''}">${r.done ? `<span class="qi">${ICON.check}</span>` : r.cur || r.open ? `<span class="qn">${r.n}</span>` : `<span class="qi">${ICON.lock}</span>`}<span>${esc(frSpace(r.title))}</span><span class="qxp">${ICON.star}+${r.xp}</span></div>`;
}
$('qBody').addEventListener('click', (e) => { const t = e.target.closest('[data-qt]'); if (t && !t.disabled) { questTab = t.dataset.qt; AudioSys.tap(); renderQuests(); } });
