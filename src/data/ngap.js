/* ---------- NGAP 2026 : la cotation des actes de masso-kinésithérapie ----------
   Valeur des lettres-clés (RAM, RIC, NMI, ARL…) : 2,21 € en métropole, 2,43 € dans les DOM.
   Coefficients en vigueur en 2026 (avenant 7, revalorisé au 1er juillet 2025 pour les actes AMS 7,5,
   puis au 1er juillet 2026 pour TER). Sources : annexe de l'avenant 7 (Ordre des MK), NGAP 2026.
   La cotation dépend de la prescription : région, opéré ou non, pathologie.
   Membres : R… = acte soumis à référentiel (accord préalable au-delà d'un nombre de séances), V… = acte hors référentiel
   (lecture du schéma NGAP de Cegedim, qui ne définit que le R : « R - Référentiel (1re lettre sauf Rachis) »).
   Les cas cliniques et leurs cotations sont dans data/cases.js. */
export const NGAP = { value: 2.21, valueDom: 2.43, ifd: 2.5 };
export const KEYS = {
  RAM: 'Rachis, sans chirurgie',
  RAO: 'Rachis opéré',
  RIM: 'Membre inférieur, sans chirurgie (acte du référentiel)',
  RIC: 'Membre inférieur, chirurgie (acte du référentiel)',
  VIM: 'Membre inférieur, sans chirurgie (hors référentiel)',
  VIC: 'Membre inférieur, chirurgie (hors référentiel)',
  RSM: 'Membre supérieur, sans chirurgie (acte du référentiel)',
  RSC: 'Membre supérieur, chirurgie (acte du référentiel)',
  VSM: 'Membre supérieur, sans chirurgie (hors référentiel)',
  VSC: 'Membre supérieur, chirurgie (hors référentiel)',
  TER: 'Plusieurs territoires (2 ou plus)',
  NMI: 'Neurologie (et rhumatismes inflammatoires)',
  ARL: 'Respiratoire, ORL, vestibulaire',
  RAV: 'Vasculaire (lymphœdème…)',
  RAB: 'Abdominal et périnéal',
  RPE: 'Personne âgée (déambulation)',
  PLL: 'Soins palliatifs',
  AMK: 'Bilans et suppléments'
};
export const coefStr = (c) => c.toFixed(2).replace('.', ',');
export const cotStr = (key, c) => `${key} ${coefStr(c)}`;
