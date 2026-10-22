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
  teamShare: 0.75       // part du plateau qu'un assistant utilise (horaires décalés)
};
export const CAB_LEVELS = [null,
  { lvl: 1, title: 'Créer ton cabinet', cost: 100000, img: 'bld_l1', years: 20, cat: 'Local et aménagement', label: 'Achat et aménagement du local (niveau 1)', unlocks: ['Table de soins', 'Tapis de gainage', 'Step', 'Ordinateur'] },
  { lvl: 2, title: 'Agrandir : niveau 2', cost: 20000, img: 'bld_l2', years: 10, cat: 'Agencements', label: 'Agrandissement du cabinet (niveau 2)', unlocks: ['2e étage', 'Espalier', 'Tapis de renforcement', 'Électrothérapie', "Fauteuils d'attente", 'Un assistant'] },
  { lvl: 3, title: 'Agrandir : niveau 3', cost: 35000, img: 'bld_l3', years: 10, cat: 'Agencements', label: 'Plateau technique (niveau 3)', unlocks: ['3e étage', 'Plateau de Freeman', 'Table électrique premium', 'Un 2e assistant'] },
  { lvl: 4, title: 'Agrandir : niveau 4', cost: 50000, img: 'bld_l4', years: 10, cat: 'Agencements', label: 'Extension du cabinet (niveau 4)', unlocks: ['4e étage', 'Un 3e assistant', 'Une équipe qui grandit'] },
  { lvl: 5, title: 'Agrandir : niveau 5', cost: 80000, img: 'bld_l5', years: 10, cat: 'Agencements', label: 'Centre de rééducation (niveau 5)', unlocks: ['5e étage', 'Un 4e assistant', 'Le plus grand cabinet de la ville'] }
];
