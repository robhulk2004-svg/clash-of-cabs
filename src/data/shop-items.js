import { eur } from '../core/utils.js';

/* ---------- Shop: matériel & services (lvl = niveau du cabinet requis, build = secondes de montage) ---------- */
export const ITEMS = {
  mat_blue: { tab: 'materiel', build: 8, name: 'Tapis de gainage', price: 45, lvl: 1, kind: 'station', st: 'S3', icon: 'ic_mat_blue', tag: '+1 poste : gainage', acc: 'depense', sub: 'petitmat' },
  step: { tab: 'materiel', build: 10, name: 'Step', price: 79, lvl: 1, kind: 'station', st: 'S2', icon: 'ic_step', tag: '+1 poste : montées de marche', acc: 'depense', sub: 'petitmat' },
  computer: { tab: 'materiel', build: 15, name: 'Ordinateur + logiciel agréé', price: 990, lvl: 1, kind: 'boost', boost: 0.10, icon: 'ic_computer', tag: '+10 % : télétransmission', acc: 'immo', years: 3, cat: 'Micro-ordinateur' },
  blouses: { tab: 'materiel', name: 'Lot de blouses', price: 120, lvl: 0, kind: 'boost', boost: 0.05, svg: 'blouse', tag: '+5 % : tenue pro', acc: 'depense', sub: 'vetem', anyPhase: true },
  espalier: { tab: 'materiel', build: 25, name: 'Espalier', price: 390, lvl: 2, kind: 'station', st: 'S1', icon: 'ic_espalier', tag: '+1 poste : squats', acc: 'depense', sub: 'petitmat' },
  mat_teal: { tab: 'materiel', build: 8, name: 'Tapis de renforcement', price: 55, lvl: 2, kind: 'station', st: 'S4', icon: 'ic_mat_teal', tag: '+1 poste : pompes', acc: 'depense', sub: 'petitmat' },
  electro: { tab: 'materiel', build: 20, name: 'Électrothérapie', price: 1190, lvl: 2, kind: 'boost', boost: 0.10, icon: 'ic_electro', tag: '+10 % de rendement', acc: 'immo', years: 5, cat: 'Matériel' },
  chairs: { tab: 'materiel', build: 18, name: "Fauteuils d'attente", price: 690, lvl: 2, kind: 'boost', boost: 0.05, icon: 'ic_chairs', tag: '+5 % : salle d’attente', acc: 'immo', years: 10, cat: 'Mobilier' },
  freeman: { tab: 'materiel', build: 8, name: 'Plateau de Freeman', price: 35, lvl: 3, kind: 'station', st: 'S5', icon: 'ic_freeman', tag: '+1 poste : proprioception', acc: 'depense', sub: 'petitmat' },
  table: { tab: 'materiel', build: 35, name: 'Table électrique premium', price: 2390, lvl: 3, kind: 'boost', boost: 0.15, icon: 'ic_table', tag: '+15 % de rendement', acc: 'immo', years: 10, cat: 'Matériel' },
  gun: { tab: 'materiel', build: 12, name: 'Pistolet de massage en diamant', price: 2900, lvl: 1, kind: 'bling', icon: 'ic_gun', tag: '+0 % : mais ça brille…', acc: 'somptu' },
  sculpture: { tab: 'materiel', build: 30, name: "Sculpture d'art pour l'attente", price: 4500, lvl: 1, kind: 'bling', icon: 'ic_sculpture', tag: '+0 % : mais quel style…', acc: 'somptu' },
  aga: { tab: 'services', name: 'Adhésion à une AGA', price: 200, per: true, lvl: 0, kind: 'service', svg: 'aga', tag: 'Conseils + télétransmission de ta 2035', acc: 'depense', sub: 'honor' },
  comptable: { tab: 'services', name: 'Expert-comptable', price: 2500, per: true, lvl: 0, kind: 'service', svg: 'calc', tag: 'Il tient ta compta et ta 2035', acc: 'depense', sub: 'honor' },
  syndicat: { tab: 'services', name: 'Adhésion à un syndicat', price: 180, per: true, lvl: 0, kind: 'service', svg: 'syndic', tag: 'Conseils juridiques + relecture de contrats', acc: 'depense', sub: 'syndic', needs: 'menton' },
  f_lca: { tab: 'services', name: 'Formation genou & LCA', price: 450, lvl: 0, kind: 'formation', boost: 0.10, svg: 'cap', tag: '30 s de formation · +10 %', acc: 'depense', sub: 'formation' },
  f_tm: { tab: 'services', name: 'Formation thérapie manuelle', price: 520, lvl: 0, kind: 'formation', boost: 0.10, svg: 'cap', tag: '30 s de formation · +10 %', acc: 'depense', sub: 'formation' },
  google: { tab: 'services', name: 'Référencement Google prioritaire', price: 300, lvl: 0, kind: 'forbidden', svg: 'google', tag: 'Apparaître en 1er sur internet', acc: 'interdit' }
};
export const SHOP_ORDER = {
  materiel: ['mat_blue', 'step', 'computer', 'blouses', 'espalier', 'mat_teal', 'electro', 'chairs', 'freeman', 'table', 'gun', 'sculpture'],
  services: ['aga', 'comptable', 'syndicat', 'f_lca', 'f_tm', 'google']
};
export const ACC_LABEL = { depense: 'Dépense déductible', immo: 'Immobilisation', somptu: 'Non déductible' };
export const CLASSIFY_WHY = {
  petitmat: (it) => `Moins de 598 € TTC (500 € HT) : c'est du petit outillage. Tu déduis les ${eur(it.price)} en entier cette année.`,
  vetem: () => "Dépense déductible : les blouses sont les seuls vêtements qu'un kiné peut passer en frais professionnels.",
  honor: (it) => it === ITEMS.aga ? "Dépense déductible : la cotisation à l'AGA fait partie des honoraires ne constituant pas des rétrocessions." : "Dépense déductible : ce sont des honoraires versés à un autre professionnel libéral.",
  syndic: () => 'Dépense déductible : les cotisations syndicales et professionnelles sont déductibles.',
  formation: () => 'Dépense déductible : ce sont des frais de formation professionnelle.',
  somptu: (it) => it === ITEMS.gun ? 'Non déductible : c\'est une dépense somptuaire. Un pistolet de massage en diamant n’apporte rien à tes soins !' : "Non déductible : c'est une dépense d'agrément (somptuaire), comme une œuvre d'art pour la salle d'attente."
};
