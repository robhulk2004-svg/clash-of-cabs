/* ---------- Remplacement offers (the job board) ---------- */
export const OFFER_DEFS = {
  pins1: { cab: 'A', months: 3, H: 5400, r: 0.20, km: 5, bad: ['ordre', 'cesse'], why: 'Mi-temps thérapeutique', pitch: "« Salut ! Mi-temps thérapeutique : je dois lever le pied pendant trois mois. Tu me remplacerais à l'IRSBC ? »" },
  stc1: { cab: 'X', months: 3, H: 6600, r: 0.22, km: 45, housing: true, bad: ['duree'], why: 'Désert médical', pitch: "« À Maransin, on manque cruellement de kinés. Logement offert pour le remplaçant ! »" },
  pins2: { cab: 'A', months: 2, H: 5600, r: 0.20, km: 5, bad: ['sortie'], why: 'Formation', pitch: "« Je pars deux mois en formation. Mon contrat est prêt, tu le lis ? »" },
  stc2: { cab: 'X', months: 3, H: 6800, r: 0.22, km: 45, housing: true, bad: [], extra: ['concurrence'], why: 'Désert médical', pitch: "« Les patients de Maransin te réclament ! Même contrat, même logement. »" },
  pins3: { cab: 'A', months: 3, H: 5800, r: 0.22, km: 5, bad: ['cps'], why: 'Arrêt maladie', pitch: "« Je suis en arrêt trois mois, j'ai besoin de toi ! »" }
};
/* v6: only Thomas (Mériniaque) and Julien (Maransin) look for remplaçants; Étienne doesn't need one */
export const BOARD_ORDER = ['pins1', 'stc1', 'pins2', 'stc2', 'pins3'];
/* ---------- The missions abroad (titulaire, during a trip): a month in the cabinet of Chad Cook, then of Suzie Taillebois ----------
   No NGAP there: the host pays you for each patient you treat. Suzie's mission on the Moon is the last one of the game. */
export const MISSIONS = {
  M: { who: 'chad', pay: 25, title: 'Un mois au Cook Physical Therapy', html: 'C’est la saison des rodéos : le cabinet de Chad déborde de patients ! Viens l’aider un mois : <b>25 € par patient</b>, payés directement par les patients, sans Sécurité sociale ni NGAP. Pendant ce temps, ton cabinet reste entre les mains de ton remplaçant.' },
  L: { who: 'suzie', pay: 30, title: 'Un mois au cabinet lunaire', html: 'Suzie a besoin d’aide : tous les astronautes de la base lunaire ont mal quelque part ! Tu soignes ses patients pendant un mois : <b>30 € par patient</b>. C’est la <b>dernière mission</b> du jeu…' }
};
