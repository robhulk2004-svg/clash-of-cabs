import { G, persist } from '../core/save.js';
import { JULIEN_SECRET, LORE } from '../data/lore.js';
import { say } from './talk.js';

/* ================= Lore (v6.2): the next little story of a character =================
   Lines come in turn (saved in G.flags.lore), so nobody repeats himself too soon. */
export const hasLore = (who) => !!(LORE[who] && LORE[who].length);
export function loreLine(who) {
  const L = LORE[who]; if (!L || !L.length) return null;
  const f = G.flags.lore || (G.flags.lore = {});
  const k = (f[who] = ((f[who] ?? -1) + 1) % L.length); persist();
  return L[k];
}
/* says it inside an open dialogue; `actor` is the portrait to show (Pascale is 'mentor', Alex Cloppe 'sage') */
export async function sayLore(who, actor = who) {
  const f = G.flags.lore || (G.flags.lore = {});
  /* Julien's secret: about one chat in five, once you know him a little */
  if (who === 'julien' && (f.julien ?? -1) >= 1 && Math.random() < 0.2) {
    f.julienSecret = (f.julienSecret || 0) + 1; persist();
    for (const [w, e, t] of JULIEN_SECRET) await say(w, e, t);
    return;
  }
  const l = loreLine(who); if (l) await say(actor, l[0], l[1]);
}
