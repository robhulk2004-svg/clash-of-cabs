import { eur } from '../core/utils.js';

/* ---------- Shop: matériel & services (lvl = niveau du cabinet requis) ---------- */
export const ITEMS = {
  mat_blue: { tab: 'materiel', name: 'Tapis de gainage', price: 45, lvl: 1, kind: 'station', st: 'S3', icon: 'ic_mat_blue', tag: '+1 poste : gainage', acc: 'depense', sub: 'petitmat' },
  step: { tab: 'materiel', name: 'Step', price: 79, lvl: 1, kind: 'station', st: 'S2', icon: 'ic_step', tag: '+1 poste : montées de marche', acc: 'depense', sub: 'petitmat' },
  computer: { tab: 'materiel', name: 'Ordinateur + logiciel agréé', price: 990, lvl: 1, kind: 'boost', boost: 0.10, icon: 'ic_computer', tag: '+10 % : télétransmission', acc: 'immo', years: 3, cat: 'Micro-ordinateur' },
  blouses: { tab: 'materiel', name: 'Lot de blouses', price: 120, lvl: 0, kind: 'boost', boost: 0.05, svg: 'blouse', tag: '+5 % : tenue pro', acc: 'depense', sub: 'vetem', anyPhase: true },
  espalier: { tab: 'materiel', name: 'Espalier', price: 390, lvl: 2, kind: 'station', st: 'S1', icon: 'ic_espalier', tag: '+1 poste : squats', acc: 'depense', sub: 'petitmat' },
  mat_teal: { tab: 'materiel', name: 'Tapis de renforcement', price: 55, lvl: 2, kind: 'station', st: 'S4', icon: 'ic_mat_teal', tag: '+1 poste : pompes', acc: 'depense', sub: 'petitmat' },
  electro: { tab: 'materiel', name: 'Électrothérapie', price: 1190, lvl: 2, kind: 'boost', boost: 0.10, icon: 'ic_electro', tag: '+10 % de rendement', acc: 'immo', years: 5, cat: 'Matériel' },
  chairs: { tab: 'materiel', name: "Fauteuils d'attente", price: 690, lvl: 2, kind: 'boost', boost: 0.05, icon: 'ic_chairs', tag: '+5 % : salle d’attente', acc: 'immo', years: 10, cat: 'Mobilier' },
  freeman: { tab: 'materiel', name: 'Plateau de Freeman', price: 35, lvl: 3, kind: 'station', st: 'S5', icon: 'ic_freeman', tag: '+1 poste : proprioception', acc: 'depense', sub: 'petitmat' },
  table: { tab: 'materiel', name: 'Table électrique premium', price: 2390, lvl: 3, kind: 'boost', boost: 0.15, icon: 'ic_table', tag: '+15 % de rendement', acc: 'immo', years: 10, cat: 'Matériel' },
  gun: { tab: 'materiel', name: 'Pistolet de massage en diamant', price: 2900, lvl: 1, kind: 'bling', icon: 'ic_gun', tag: '+0 % : mais ça brille…', acc: 'somptu' },
  sculpture: { tab: 'materiel', name: "Sculpture d'art pour l'attente", price: 4500, lvl: 1, kind: 'bling', icon: 'ic_sculpture', tag: '+0 % : mais quel style…', acc: 'somptu' },
  aga: { tab: 'services', name: 'Adhésion à une AGA', price: 200, per: true, lvl: 0, kind: 'service', svg: 'aga', tag: 'Conseils + télétransmission de ta 2035', acc: 'depense', sub: 'honor' },
  comptable: { tab: 'services', name: 'Expert-comptable', price: 2500, per: true, lvl: 0, kind: 'service', svg: 'calc', tag: 'Il tient ta compta et ta 2035', acc: 'depense', sub: 'honor' },
  syndicat: { tab: 'services', name: 'Adhésion à un syndicat', price: 180, per: true, lvl: 0, kind: 'service', svg: 'syndic', tag: 'Conseils juridiques + relecture de contrats', acc: 'depense', sub: 'syndic', needs: 'menton' },
  f_lca: { tab: 'services', name: 'Formation genou & LCA', price: 450, lvl: 0, kind: 'formation', boost: 0.10, svg: 'cap', tag: '30 s de formation · +10 %', acc: 'depense', sub: 'formation' },
  f_tm: { tab: 'services', name: 'Formation thérapie manuelle', price: 520, lvl: 0, kind: 'formation', boost: 0.10, svg: 'cap', tag: '30 s de formation · +10 %', acc: 'depense', sub: 'formation' },
  google: { tab: 'services', name: 'Référencement Google prioritaire', price: 300, lvl: 0, kind: 'forbidden', svg: 'google', tag: 'Apparaître en 1er sur internet', acc: 'interdit' },
  /* v5: vehicles to reach the other maps (personal purchases) */
  velo: { tab: 'vehicules', name: 'Vélo électrique', price: 1290, lvl: 0, kind: 'vehicle', veh: 'velo', my: 'Ton vélo électrique', icon: 'veh_velo', tag: 'Direction Maransin, 45 km à travers champs', acc: 'somptu', anyPhase: true },
  bateau: { tab: 'vehicules', name: 'Voilier de croisière', price: 24900, lvl: 0, kind: 'vehicle', veh: 'bateau', my: 'Ton voilier', icon: 'veh_bateau', tag: 'Cap sur La Réunion', acc: 'somptu', anyPhase: true },
  jet: { tab: 'vehicules', name: 'Jet privé (en multipropriété)', price: 89000, lvl: 0, kind: 'vehicle', veh: 'jet', my: 'Ta part de jet privé', icon: 'veh_jet', tag: 'Direction le Michigan', acc: 'somptu', anyPhase: true },
  /* v6: the end of the game */
  fusee: { tab: 'vehicules', name: 'Fusée lunaire', price: 400000, lvl: 0, kind: 'vehicle', veh: 'fusee', my: 'Ta fusée', icon: 'fusee', tag: 'Direction la Lune : la dernière aventure !', acc: 'somptu', anyPhase: true }
};
export const SHOP_ORDER = {
  materiel: ['mat_blue', 'step', 'computer', 'blouses', 'espalier', 'mat_teal', 'electro', 'chairs', 'freeman', 'table', 'gun', 'sculpture'],
  services: ['aga', 'comptable', 'syndicat', 'f_lca', 'f_tm', 'google'],
  vehicules: ['velo', 'bateau', 'jet', 'fusee']
};
export const ACC_LABEL = { depense: 'Dépense déductible', immo: 'Immobilisation', somptu: 'Non déductible' };
export const CLASSIFY_WHY = {
  petitmat: (it) => `Moins de 598 € TTC (500 € HT) : c'est du petit outillage. Tu déduis les ${eur(it.price)} en entier cette année.`,
  vetem: () => "Dépense déductible : les blouses sont les seuls vêtements qu'un kiné peut passer en frais professionnels.",
  honor: (it) => it === ITEMS.aga ? "Dépense déductible : la cotisation à l'AGA fait partie des honoraires ne constituant pas des rétrocessions." : "Dépense déductible : ce sont des honoraires versés à un autre professionnel libéral.",
  syndic: () => 'Dépense déductible : les cotisations syndicales et professionnelles sont déductibles.',
  formation: () => 'Dépense déductible : ce sont des frais de formation professionnelle.',
  somptu: (it) => it.kind === 'vehicle' ? `Non déductible : ${it.my.charAt(0).toLowerCase() + it.my.slice(1)} sert à tes voyages personnels, c'est une dépense privée. (Un véhicule vraiment utilisé pour ton activité pourrait, lui, être amorti ou ouvrir droit à des frais kilométriques.)` : it === ITEMS.gun ? 'Non déductible : c\'est une dépense somptuaire. Un pistolet de massage en diamant n’apporte rien à tes soins !' : "Non déductible : c'est une dépense d'agrément (somptuaire), comme une œuvre d'art pour la salle d'attente."
};
