/* ---------- The supermarkets (Maransin, La Réunion) and the gas station (Michigan) ---------- */
const O = 'stroke="#1a1f36" stroke-width="6" stroke-linejoin="round"';
const svg = (inner) => `<svg viewBox="0 0 100 100">${inner}</svg>`;
export const MK_ICON = {
  huile: svg(`<rect x="34" y="8" width="32" height="14" rx="4" fill="#f2c94c" ${O}/><path d="M28 30 Q28 22 36 22 H64 Q72 22 72 30 V86 Q72 94 64 94 H36 Q28 94 28 86 Z" fill="#f6d36b" ${O}/><path d="M38 52 H62 V76 H38 Z" fill="#fff4c9" stroke="#c98a1a" stroke-width="4"/><circle cx="50" cy="64" r="6" fill="#e0a31a"/>`),
  sopalin: svg(`<ellipse cx="50" cy="20" rx="26" ry="10" fill="#fff" ${O}/><path d="M24 20 V80 Q24 90 50 90 Q76 90 76 80 V20" fill="#f4f7fb" ${O}/><ellipse cx="50" cy="20" rx="8" ry="3.5" fill="#b9c4d4"/><path d="M24 52 Q50 60 76 52" fill="none" stroke="#7fb4e8" stroke-width="5"/>`),
  gel: svg(`<path d="M44 6 H58 V18 H70 V24 H44 Z" fill="#5fb2ff" ${O}/><rect x="46" y="24" width="10" height="12" fill="#5fb2ff" ${O}/><path d="M30 44 Q30 36 38 36 H62 Q70 36 70 44 V86 Q70 94 62 94 H38 Q30 94 30 86 Z" fill="#c8ecff" ${O}/><path d="M40 58 h20 M50 48 v20" stroke="#2a6fd6" stroke-width="7" stroke-linecap="round"/>`),
  elastiques: svg(`<path d="M18 70 Q10 30 50 26 Q90 22 82 62" fill="none" stroke="#1a1f36" stroke-width="16" stroke-linecap="round"/><path d="M18 70 Q10 30 50 26 Q90 22 82 62" fill="none" stroke="#ff6b8a" stroke-width="8" stroke-linecap="round"/><path d="M26 82 Q24 50 54 46 Q80 44 76 76" fill="none" stroke="#1a1f36" stroke-width="16" stroke-linecap="round"/><path d="M26 82 Q24 50 54 46 Q80 44 76 76" fill="none" stroke="#4fd06b" stroke-width="8" stroke-linecap="round"/>`),
  fruits: svg(`<path d="M14 54 H86 L76 90 H24 Z" fill="#c98a4a" ${O}/><circle cx="36" cy="44" r="14" fill="#ff5a4a" ${O}/><circle cx="62" cy="42" r="14" fill="#8be35c" ${O}/><path d="M48 30 Q58 14 74 22 Q66 40 48 30 Z" fill="#ffd43a" ${O}/>`),
  cafe: svg(`<path d="M20 36 H70 V70 Q70 88 45 88 Q20 88 20 70 Z" fill="#fff" ${O}/><path d="M70 44 Q88 44 86 58 Q84 70 70 68" fill="none" stroke="#1a1f36" stroke-width="7"/><ellipse cx="45" cy="38" rx="22" ry="5" fill="#6b3d1c"/><path d="M36 22 Q32 14 38 8 M52 22 Q48 14 54 8" fill="none" stroke="#9aa6b8" stroke-width="5" stroke-linecap="round"/>`),
  fromage: svg(`<path d="M10 70 L60 24 L90 50 L90 78 L10 78 Z" fill="#ffd75a" ${O}/><circle cx="40" cy="62" r="6" fill="#e0a31a"/><circle cx="66" cy="66" r="5" fill="#e0a31a"/><circle cx="72" cy="50" r="4" fill="#e0a31a"/>`),
  barres: svg(`<rect x="14" y="30" width="72" height="40" rx="10" fill="#c98a4a" ${O}/><path d="M26 40 l8 6 M44 38 l6 8 M60 42 l8 4 M30 58 l8 -4 M52 60 l6 -6" stroke="#7a4a1a" stroke-width="5" stroke-linecap="round"/>`),
  samoussas: svg(`<path d="M14 80 L50 14 L86 80 Z" fill="#f2b04c" ${O}/><path d="M32 70 L50 36 L68 70" fill="none" stroke="#c97a1a" stroke-width="5"/>`),
  rougail: svg(`<path d="M12 46 H88 Q88 84 50 84 Q12 84 12 46 Z" fill="#c0392b" ${O}/><ellipse cx="50" cy="46" rx="38" ry="9" fill="#e8562f" ${O}/><circle cx="36" cy="46" r="5" fill="#7a2a12"/><circle cx="56" cy="44" r="5" fill="#7a2a12"/><circle cx="68" cy="48" r="4" fill="#7a2a12"/>`),
  letchis: svg(`<circle cx="38" cy="56" r="20" fill="#e8415a" ${O}/><circle cx="64" cy="48" r="18" fill="#ff6b7d" ${O}/><path d="M60 30 Q66 14 80 14" fill="none" stroke="#2f9a12" stroke-width="6" stroke-linecap="round"/>`),
  goyavier: svg(`<path d="M30 20 H70 L64 90 H36 Z" fill="#ff8a7a" ${O}/><path d="M33 44 H67" stroke="#fff" stroke-width="5"/><path d="M58 8 V30" stroke="#1a1f36" stroke-width="6" stroke-linecap="round"/>`),
  burger: svg(`<path d="M14 46 Q14 16 50 16 Q86 16 86 46 Z" fill="#f2b04c" ${O}/><rect x="12" y="46" width="76" height="10" rx="5" fill="#4fd06b" ${O}/><rect x="14" y="56" width="72" height="14" rx="6" fill="#7a3d1c" ${O}/><path d="M16 70 H84 Q84 86 50 86 Q16 86 16 70 Z" fill="#f2b04c" ${O}/>`),
  pancakes: svg(`<ellipse cx="50" cy="74" rx="38" ry="12" fill="#e0a35a" ${O}/><ellipse cx="50" cy="60" rx="36" ry="11" fill="#f2c27a" ${O}/><ellipse cx="50" cy="46" rx="34" ry="10" fill="#f6d39a" ${O}/><path d="M36 42 Q50 52 62 40 L60 60" fill="none" stroke="#a0521a" stroke-width="6" stroke-linecap="round"/>`),
  energy: svg(`<rect x="30" y="14" width="40" height="76" rx="8" fill="#2a6fd6" ${O}/><path d="M54 30 L40 54 H52 L46 76 L62 48 H50 Z" fill="#ffd43a"/>`),
  donuts: svg(`<circle cx="50" cy="52" r="34" fill="#f2b04c" ${O}/><path d="M22 46 Q30 22 50 20 Q72 20 80 44 Q72 54 62 46 Q50 60 40 48 Q30 56 22 46 Z" fill="#ff7ab6"/><circle cx="50" cy="52" r="10" fill="#1f2a44" ${O}/>`)
};
/* consumables: months of use per pack; without them, your own cabinet works less well */
export const STOCK = {
  huile: { name: 'Huile de massage (5 L)', price: 39, months: 3, malus: 0.05, lack: "Plus d'huile de massage" },
  sopalin: { name: 'Essuie-tout (carton de 24 rouleaux)', price: 29, months: 3, malus: 0.03, lack: "Plus d'essuie-tout" },
  gel: { name: 'Gel hydroalcoolique (5 L)', price: 25, months: 3, malus: 0.05, lack: 'Plus de gel hydroalcoolique' },
  elastiques: { name: 'Kit d’élastiques de rééducation', price: 49, months: 6, malus: 0.05, lack: 'Élastiques usés' }
};
/* food: a boost for your next month of work (a personal expense, not deductible) */
export const FOOD = {
  maransin: [{ id: 'fruits', name: 'Corbeille de fruits', price: 12, k: 0.05 }, { id: 'cafe', name: 'Café en grains (1 kg)', price: 14, k: 0.06 }, { id: 'fromage', name: 'Fromage du terroir', price: 9, k: 0.05 }, { id: 'barres', name: 'Barres de céréales', price: 6, k: 0.04 }],
  reunion: [{ id: 'samoussas', name: 'Samoussas', price: 6, k: 0.06 }, { id: 'rougail', name: 'Rougail saucisse', price: 11, k: 0.08 }, { id: 'letchis', name: 'Letchis frais', price: 7, k: 0.05 }, { id: 'goyavier', name: 'Jus de goyavier', price: 4, k: 0.04 }],
  michigan: [{ id: 'burger', name: 'Burger XXL', price: 12, k: 0.08 }, { id: 'pancakes', name: "Pancakes au sirop d'érable", price: 9, k: 0.06 }, { id: 'energy', name: 'Boisson énergisante', price: 4, k: 0.05 }, { id: 'donuts', name: 'Donuts', price: 6, k: 0.04 }]
};
export const MARKET_NAME = { maransin: 'Supermarché de Maransin', reunion: 'Supermarché de Saint-Gilles', michigan: 'Station-service du Michigan' };
