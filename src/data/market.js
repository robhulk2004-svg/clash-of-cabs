/* ---------- The supermarkets (Maransin, La Réunion) and the gas station (Michigan) ---------- */
/* v6: the pictures of kit.png, aliments.png, aliments1.png and aliments2.png (assets/mk_*.webp) */
const IC = (id) => `<img src="assets/mk_${id}.webp" alt="" loading="lazy">`;
export const MK_ICON = Object.fromEntries(['huile', 'sopalin', 'gel', 'elastiques', 'fruits', 'cafe', 'fromage', 'cereales', 'rougail', 'samoussas', 'letchis', 'goyave', 'burger', 'pancakes', 'energy', 'donuts'].map((id) => [id, IC(id)]));
MK_ICON.barres = MK_ICON.cereales; MK_ICON.goyavier = MK_ICON.goyave;   // names of version 5
/* consumables: months of use per pack; without them, your own cabinet works less well */
export const STOCK = {
  huile: { name: 'Huile de massage (5 L)', price: 39, months: 3, malus: 0.05, lack: "Plus d'huile de massage" },
  sopalin: { name: 'Essuie-tout (carton de 24 rouleaux)', price: 29, months: 3, malus: 0.03, lack: "Plus d'essuie-tout" },
  gel: { name: 'Gel hydroalcoolique (5 L)', price: 25, months: 3, malus: 0.05, lack: 'Plus de gel hydroalcoolique' },
  elastiques: { name: 'Kit d’élastiques de rééducation', price: 49, months: 6, malus: 0.05, lack: 'Élastiques usés' }
};
/* food: a boost for your next month of work (a personal expense, not deductible) */
export const FOOD = {
  maransin: [{ id: 'fruits', name: 'Corbeille de fruits', price: 12, k: 0.05 }, { id: 'cafe', name: 'Café en grains (1 kg)', price: 14, k: 0.06 }, { id: 'fromage', name: 'Fromage du terroir', price: 9, k: 0.05 }, { id: 'cereales', name: 'Bol de céréales', price: 6, k: 0.04 }],
  reunion: [{ id: 'samoussas', name: 'Samoussas', price: 6, k: 0.06 }, { id: 'rougail', name: 'Rougail saucisse', price: 11, k: 0.08 }, { id: 'letchis', name: 'Letchis frais', price: 7, k: 0.05 }, { id: 'goyave', name: 'Jus de goyave', price: 4, k: 0.04 }],
  michigan: [{ id: 'burger', name: 'Burger XXL', price: 12, k: 0.08 }, { id: 'pancakes', name: "Pancakes au sirop d'érable", price: 9, k: 0.06 }, { id: 'energy', name: 'Boisson énergisante', price: 4, k: 0.05 }, { id: 'donuts', name: 'Donuts', price: 6, k: 0.04 }],
  /* on the Moon, everything comes from the Earth… by rocket */
  moon: [{ id: 'cafe', name: 'Café de la Terre (livré en fusée)', price: 42, k: 0.06 }, { id: 'fruits', name: 'Fruits de la Terre (livrés en fusée)', price: 36, k: 0.05 }, { id: 'pancakes', name: 'Pancakes lyophilisés', price: 27, k: 0.06 }, { id: 'energy', name: 'Boisson énergisante spatiale', price: 12, k: 0.05 }]
};
export const MARKET_NAME = { maransin: 'Supermarché de Maransin', reunion: 'Supermarché de Saint-Gilles', michigan: 'Station-service du Michigan', moon: 'Supermarché lunaire' };
