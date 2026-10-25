/* ---------- Economy: 1 séance de jeu = 1 mois d'activité ---------- */
export const ECO = {
  cotis: 0.28,          // URSSAF (~20 %) + CARPIMKO (~10 %) : provisions sur le revenu du mois
  kmRate: 0.6, days: 20,
  perso: { rempl: 1600, assist: 1700, titulaire: 1800 },   // vie perso : prélèvement non déductible
  ordre: 280, rcp: 150, syndic: 180,
  microRate: 0.34, microMin: 305, microMax: 77700,
  slot: 2600,           // honoraires d'un mois pour un « poste » de patients au cabinet
  perKine: 3, local: 300,
  loanRate: 0.04, loanYears: 10, apportMin: 20000, assistMin: 6,
  assistRate: 0.25, mathieuRate: 0.25,
  halfDays: 40          // a working day in the game = one half-day (≈ 10 patients); a month = 40 half-days
};
/* Your cabinet, from level 1 to 9 (pictures cab_l1 … cab_l9). From level 4, each level adds a room (one more poste)
   and a small boost: a nicer cabinet attracts and keeps patients. */
export const CAB_LEVELS = [null,
  { lvl: 1, title: 'Créer ton cabinet', cost: 100000, years: 20, cat: 'Local et aménagement', label: 'Achat et aménagement du local (niveau 1)', unlocks: ['Table de soins', 'Tapis de gainage', 'Step', 'Ordinateur'] },
  { lvl: 2, title: 'Agrandir : niveau 2', cost: 20000, years: 10, cat: 'Agencements', label: 'Agrandissement du cabinet (niveau 2)', unlocks: ['2e étage', 'Espalier', 'Tapis de renforcement', 'Électrothérapie', "Fauteuils d'attente", 'Un assistant'] },
  { lvl: 3, title: 'Agrandir : niveau 3', cost: 35000, years: 10, cat: 'Agencements', label: 'Plateau technique (niveau 3)', unlocks: ['Plateau de Freeman', 'Table électrique premium', 'Un poste en plus'] },
  { lvl: 4, title: 'Niveau 4 : salle de réathlétisation', cost: 45000, years: 10, cat: 'Agencements', label: 'Salle de réathlétisation (niveau 4)', unlocks: ['+1 poste de soins', '+3 % de rendement'], boost: 0.03 },
  { lvl: 5, title: 'Niveau 5 : terrasse végétalisée', cost: 60000, years: 10, cat: 'Agencements', label: 'Terrasse et salle de groupe (niveau 5)', unlocks: ['+1 poste de soins', 'Un 2e assistant', '+3 % de rendement'], boost: 0.03 },
  { lvl: 6, title: 'Niveau 6 : balnéothérapie', cost: 80000, years: 10, cat: 'Agencements', label: 'Bassin de balnéothérapie (niveau 6)', unlocks: ['+1 poste de soins', 'Balnéothérapie', '+4 % de rendement'], boost: 0.04 },
  { lvl: 7, title: 'Niveau 7 : jardin thérapeutique', cost: 100000, years: 10, cat: 'Agencements', label: 'Jardin thérapeutique (niveau 7)', unlocks: ['+1 poste de soins', 'Parcours de marche', '+4 % de rendement'], boost: 0.04 },
  { lvl: 8, title: 'Niveau 8 : espace sport-santé', cost: 130000, years: 10, cat: 'Agencements', label: 'Espace sport-santé (niveau 8)', unlocks: ['+1 poste de soins', 'Un 3e assistant', '+5 % de rendement'], boost: 0.05 },
  { lvl: 9, title: 'Niveau 9 : centre de rééducation', cost: 180000, years: 10, cat: 'Agencements', label: 'Centre de rééducation complet (niveau 9)', unlocks: ['+1 poste de soins', 'Piscine sur le toit', '+6 % de rendement'], boost: 0.06 }
];
export const MAX_CAB = 9;
/* comfort of the building (levels 4 to 9) and rooms beyond the 6 postes of the ground floor */
export const cabBoost = (lvl) => CAB_LEVELS.slice(1, lvl + 1).reduce((s, L) => s + (L.boost || 0), 0);
export const extraPostes = (lvl) => Math.max(0, lvl - 3);
