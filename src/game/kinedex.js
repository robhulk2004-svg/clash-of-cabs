import { G, persist } from '../core/save.js';
import { DUP_XP, KX, KX_IDS, MILESTONES, TEAM_SIZE, rollChest } from '../data/kinedex.js';

/* ================= Kinédex (v6.3): your collection of cards =================
   G.kdx.cards[id] = { at: its number in the order of discovery, n: how many times you found it }. Every card is worth the
   same: you simply collect them all (a duplicate turns into XP). G.kdx.team: your 8 favourite cards (the « deck » of
   Beast Brawl!). Cartes Vitale (G.cv) buy the chests. The screens are in ui/kinedex.js. */
export const Kdx = {
  card(id) { return G.kdx.cards[id] || null; },
  owned(id) { return !!G.kdx.cards[id]; },
  count() { return KX_IDS.filter((id) => this.owned(id)).length; },
  team() { return G.kdx.team.filter((id) => this.owned(id)); },
  /* adds a card: returns { isNew, found } (found: how many cards are in the Kinédex now) */
  addCard(id) {
    if (!KX[id]) return null;
    const c = G.kdx.cards[id];
    if (c) { c.n = (c.n || 1) + 1; return { isNew: false, found: this.count() }; }
    G.kdx.cards[id] = { at: (G.kdx.found = (G.kdx.found || 0) + 1), n: 1 };
    if (G.kdx.team.length < TEAM_SIZE && !G.kdx.team.includes(id)) G.kdx.team.push(id);
    G.kdx.fresh = [...new Set([...(G.kdx.fresh || []), id])];
    return { isNew: true, found: this.count() };
  },
  /* puts the content of a chest in your collection (before its opening scene, like Beast Brawl!).
     Each card gets isNew, found (the Kinédex after it), complete (it is the last one) and dup (the XP of a duplicate). */
  apply(loot) {
    loot.dupXp = 0;
    loot.cards = loot.cards.map((x) => {
      const r = this.addCard(x.id), dup = r.isNew ? 0 : DUP_XP; loot.dupXp += dup;
      return { ...x, ...r, dup, complete: r.isNew && r.found >= KX_IDS.length };
    });
    G.kdx.opened = (G.kdx.opened || 0) + 1;
    persist();
    return loot;
  },
  roll() { return rollChest('kine', (id) => this.owned(id)); },
  setTeam(plan) { G.kdx.team = plan.filter((id, i) => this.owned(id) && plan.indexOf(id) === i).slice(0, TEAM_SIZE); persist(); },
  /* rewards of the Kinédex that are due (cards discovered), not given yet */
  milestonesDue() { const n = this.count(); return MILESTONES.filter((m, i) => n >= m.n && i >= (G.kdx.mile || 0)); },
  nextMilestone() { return MILESTONES[G.kdx.mile || 0] || null; },
  /* the new cards you have not seen yet in the Kinédex (a badge on the HUD button) */
  freshCount() { return (G.kdx.fresh || []).length; },
  seen(id) { if (G.kdx.fresh && G.kdx.fresh.includes(id)) { G.kdx.fresh = G.kdx.fresh.filter((x) => x !== id); persist(); } },
  seenAll() { if (G.kdx.fresh && G.kdx.fresh.length) { G.kdx.fresh = []; persist(); } }
};
