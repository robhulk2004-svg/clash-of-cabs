/* ---------- NGAP 2026 : la cotation des actes de masso-kinésithérapie ----------
   Valeur des lettres-clés (RAM, RIC, NMI, ARL…) : 2,21 € en métropole, 2,43 € dans les DOM.
   Coefficients en vigueur en 2026 (avenant 7, revalorisé au 1er juillet 2025 pour les actes AMS 7,5,
   puis au 1er juillet 2026 pour TER). Sources : annexe de l'avenant 7 (Ordre des MK), NGAP 2026.
   La cotation dépend de la prescription : région, opéré ou non, pathologie. */
export const NGAP = { value: 2.21, valueDom: 2.43, ifd: 2.5 };
export const KEYS = {
  RAM: 'Rachis, sans chirurgie',
  RAO: 'Rachis opéré',
  RIM: 'Membre inférieur, sans chirurgie',
  RIC: 'Membre inférieur, chirurgie',
  RSM: 'Membre supérieur, sans chirurgie',
  RSC: 'Membre supérieur, chirurgie',
  TER: 'Plusieurs territoires (2 ou plus)',
  NMI: 'Neurologie (et rhumatismes inflammatoires)',
  ARL: 'Respiratoire, ORL, vestibulaire',
  RAV: 'Vasculaire (lymphœdème…)',
  RAB: 'Abdominal et périnéal',
  RPE: 'Personne âgée (déambulation)',
  PLL: 'Soins palliatifs',
  AMK: 'Bilans et suppléments'
};
/* rx: the prescription · key + c: the right cotation · alts: wrong cotations that look alike · age / sex: who can have it */
export const CASES = [
  { id: 'lomb', rx: 'Lombalgie commune', key: 'RAM', c: 8.09, alts: [['RAO', 8.09], ['RAM', 8.13]], age: [18, 90], why: 'Rachis non opéré : RAM. La lombalgie commune est cotée RAM 8,09 (au-delà de 15 séances, demande d’accord préalable).' },
  { id: 'cerv', rx: 'Cervicalgie non spécifique, sans atteinte neurologique', key: 'RAM', c: 8.07, alts: [['RAM', 8.09], ['NMI', 8.07]], age: [18, 90], why: 'Rachis cervical non opéré, sans atteinte neurologique : RAM 8,07.' },
  { id: 'coup', rx: 'Traumatisme cervical récent (« coup du lapin »), sans lésion neurologique', key: 'RAM', c: 8.08, alts: [['RAO', 8.08], ['NMI', 8.5]], age: [16, 80], why: 'Traumatisme cervical récent sans lésion neurologique : rachis non opéré, RAM 8,08.' },
  { id: 'arthro', rx: 'Arthrodèse lombaire : rachis lombosacré opéré', key: 'RAO', c: 8.09, alts: [['RAM', 8.09], ['RIC', 8.09]], age: [30, 85], why: 'Rachis opéré : RAO. Le rachis lombosacré opéré est coté RAO 8,09.' },
  { id: 'pth', rx: 'Prothèse totale de hanche', key: 'RIC', c: 8.10, alts: [['RIM', 8.10], ['RIC', 8.12]], age: [50, 95], why: 'Membre inférieur opéré : RIC. Prothèse totale de hanche : RIC 8,10.' },
  { id: 'ptg', rx: 'Prothèse totale de genou', key: 'RIC', c: 8.12, alts: [['RIC', 8.10], ['RIM', 8.12]], age: [50, 95], why: 'Membre inférieur opéré : RIC. Prothèse de genou (totale ou unicompartimentaire) : RIC 8,12.' },
  { id: 'lca', rx: 'Reconstruction du ligament croisé antérieur (LCA)', key: 'RIC', c: 8.08, alts: [['RIM', 8.08], ['RIC', 8.12]], age: [15, 45], why: 'Membre inférieur opéré : RIC. Reconstruction du LCA : RIC 8,08.' },
  { id: 'menisc', rx: 'Méniscectomie isolée sous arthroscopie', key: 'RIC', c: 8.09, alts: [['RIM', 8.09], ['RIC', 8.08]], age: [18, 70], why: 'Membre inférieur opéré : RIC. Méniscectomie isolée par arthroscopie : RIC 8,09.' },
  { id: 'entorse', rx: 'Entorse externe récente de la cheville, non opérée', key: 'RIM', c: 8.10, alts: [['RIC', 8.11], ['RIM', 8.12]], age: [15, 60], why: 'Membre inférieur sans chirurgie : RIM. Entorse externe récente de cheville non opérée : RIM 8,10 (RIC 8,11 si elle est opérée).' },
  { id: 'entorseOp', rx: 'Entorse externe récente de la cheville, opérée', key: 'RIC', c: 8.11, alts: [['RIM', 8.10], ['RIC', 8.08]], age: [16, 60], why: 'Opérée, donc chirurgie : RIC 8,11 (non opérée, ce serait RIM 8,10).' },
  { id: 'coiffe', rx: 'Tendinopathie de la coiffe des rotateurs, non opérée', key: 'RSM', c: 8.09, alts: [['RSC', 8.11], ['RIM', 8.09]], age: [25, 85], why: 'Membre supérieur sans chirurgie : RSM. Tendinopathie de la coiffe non opérée : RSM 8,09.' },
  { id: 'coiffeOp', rx: 'Réparation de la coiffe des rotateurs (réinsertion, suture)', key: 'RSC', c: 8.11, alts: [['RSM', 8.09], ['RSC', 8.09]], age: [35, 85], why: 'Membre supérieur opéré : RSC. Réparation de la coiffe : RSC 8,11.' },
  { id: 'carpien', rx: 'Syndrome du canal carpien opéré (libération du nerf médian)', key: 'RSC', c: 8.09, alts: [['RSM', 8.09], ['NMI', 8.5]], age: [25, 85], why: 'Membre supérieur opéré : RSC. Libération du nerf médian au canal carpien : RSC 8,09.' },
  { id: 'ter', rx: 'Atteinte de l’épaule et du genou (2 territoires), sans chirurgie', key: 'TER', c: 9.79, alts: [['TER', 9.81], ['RSM', 8.09]], age: [25, 85], why: 'Deux territoires ou plus, sans chirurgie : TER 9,79 depuis le 1er juillet 2026 (9,81 avec chirurgie).' },
  { id: 'hemi', rx: 'Hémiplégie après un AVC', key: 'NMI', c: 9.0, alts: [['NMI', 8.5], ['RPE', 8.5]], age: [40, 95], why: 'Neurologie : NMI. Hémiplégie : NMI 9,00.' },
  { id: 'vestib', rx: 'Rééducation vestibulaire (vertiges)', key: 'ARL', c: 8.0, alts: [['NMI', 8.0], ['ARL', 8.5]], age: [20, 90], why: 'La rééducation vestibulaire est cotée avec les actes respiratoires et ORL : ARL 8,00.' },
  { id: 'bpco', rx: 'BPCO : réadaptation respiratoire individuelle (séquence de 20 séances)', key: 'ARL', c: 28.0, alts: [['ARL', 20.0], ['ARL', 8.5]], age: [45, 90], why: 'BPCO, réadaptation individuelle : ARL 28,00 par séance (ARL 20,00 en groupe de 2 à 4 patients).' },
  { id: 'perinee', rx: 'Rééducation périnéo-sphinctérienne', key: 'RAB', c: 8.5, alts: [['RAB', 8.0], ['ARL', 8.5]], age: [20, 85], why: 'Abdominal et périnéal : RAB. Rééducation périnéo-sphinctérienne : RAB 8,50.' },
  { id: 'deamb', rx: 'Rééducation de la déambulation du sujet âgé', key: 'RPE', c: 8.5, alts: [['RPE', 6.0], ['NMI', 8.5]], age: [70, 99], why: 'Personne âgée : RPE 8,50. Attention, la séance courte RPE 6 a été supprimée au 1er juillet 2025.' },
  { id: 'lymph', rx: 'Lymphœdème d’un membre', key: 'RAV', c: 8.0, alts: [['RAV', 9.0], ['RAV', 15.5]], age: [30, 90], why: 'Vasculaire : RAV. Lymphœdème d’un membre : RAV 8,00 (deux membres : RAV 9,00).' },
  { id: 'sein', rx: 'Lymphœdème du bras après un cancer du sein (phase intensive)', key: 'RAV', c: 15.5, alts: [['RAV', 8.0], ['RAV', 9.0]], age: [30, 90], sex: 'f', why: 'Lymphœdème du membre supérieur après cancer du sein, en phase intensive : RAV 15,50.' },
  { id: 'palli', rx: 'Soins palliatifs, à domicile', key: 'PLL', c: 12.0, alts: [['NMI', 12.0], ['RPE', 8.5]], age: [55, 99], home: true, why: 'Soins palliatifs : PLL 12,00, une cotation forfaitaire par jour. À domicile, on ajoute l’indemnité de déplacement IFD (2,50 €).' },
  { id: 'bdk', rx: 'Bilan-diagnostic kinésithérapique avant une rééducation de l’épaule', key: 'AMK', c: 10.7, alts: [['AMK', 10.8], ['RSM', 10.7]], age: [20, 90], why: 'Le bilan-diagnostic kinésithérapique reste coté en AMK : AMK 10,7 pour l’appareil locomoteur (AMK 10,8 en neurologie).' }
];
/* The patients of the pictures (patients.webp): sex, ages they can have, first names. */
const YM = ['Lucas', 'Hugo', 'Nathan', 'Théo', 'Léo', 'Enzo', 'Louis', 'Arthur', 'Maxime', 'Baptiste', 'Jules', 'Raphaël'];
const YF = ['Léa', 'Manon', 'Chloé', 'Emma', 'Inès', 'Camille', 'Jade', 'Zoé', 'Lina', 'Clara', 'Louise', 'Sarah'];
const AM = ['Nicolas', 'Sébastien', 'Christophe', 'Stéphane', 'Laurent', 'Olivier', 'Frédéric', 'David', 'Vincent', 'Jérôme', 'Guillaume'];
const SM = ['Jean', 'Michel', 'Bernard', 'Gérard', 'Alain', 'Jacques', 'Daniel', 'Patrick', 'Pierre', 'Claude', 'René'];
const SF = ['Monique', 'Françoise', 'Jacqueline', 'Martine', 'Christiane', 'Josette', 'Simone', 'Colette', 'Odette', 'Denise', 'Yvette'];
export const PATIENTS = [
  { sex: 'm', age: [19, 27], names: YM }, { sex: 'f', age: [21, 34], names: YF }, { sex: 'm', age: [30, 44], names: AM },
  { sex: 'f', age: [72, 92], names: SF }, { sex: 'm', age: [48, 64], names: AM }, { sex: 'm', age: [15, 17], names: YM },
  { sex: 'f', age: [25, 39], names: YF }, { sex: 'f', age: [15, 17], names: YF }, { sex: 'm', age: [66, 88], names: SM },
  { sex: 'f', age: [20, 31], names: YF }
];
export const coefStr = (c) => c.toFixed(2).replace('.', ',');
export const cotStr = (key, c) => `${key} ${coefStr(c)}`;
