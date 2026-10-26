/* ---------- Incidents with patients (course « déontologie » : sinistres et réclamations) ----------
   N°1 : les chutes · N°2 : les brûlures (électrothérapie, compresses chaudes…) · N°3 : les complications pendant une séance */
export const INCIDENTS = [
  { id: 'chute', title: 'Une chute au cabinet', text: '{n} perd l’équilibre pendant un exercice sur le plateau de Freeman et chute lourdement. {Il} se tient le poignet en grimaçant.' },
  { id: 'elastique', title: 'L’élastique a lâché', text: 'Pendant un exercice de renforcement, l’élastique usé casse d’un coup : {n} tombe en arrière et se fait mal au poignet.', worn: true },
  { id: 'brulure', title: 'Une brûlure', text: 'En fin de séance d’électrothérapie, {n} découvre une rougeur qui brûle sous une électrode.' },
  { id: 'chaud', title: 'Une compresse trop chaude', text: '{n} se plaint : la compresse chaude posée sur son épaule a laissé une brûlure superficielle.' },
  { id: 'malaise', title: 'Un malaise', text: 'Pendant l’effort, {n} devient tout pâle et doit s’asseoir : {il} se sent très mal.' }
];
/* How you react. fault: null (good reaction) or the kind of fault */
export const REACTIONS = [
  { label: 'Je {le} prends en charge (secours si besoin), je note tout dans son dossier, je déclare l’incident à mon assurance RCP et je prendrai de ses nouvelles', fault: null },
  { label: 'Ce n’est rien ! On termine la séance comme si de rien n’était', fault: 'neglige' },
  { label: 'Je {lui} fais signer une décharge : comme ça, je ne suis pas responsable', fault: 'decharge' },
  { label: 'Je {lui} offre la séance… {sil} promet de ne rien dire à personne', fault: 'silence' }
];
export const FAULTS = {
  neglige: { base: 1, plainte: '{me} ne s’est même pas inquiété{e} de ma blessure. On a continué la séance comme si de rien n’était !', why: 'Minimiser un incident et ne pas le déclarer, c’est manquer à ton obligation de sécurité envers le patient.' },
  decharge: { base: 1, plainte: '{me} m’a fait signer un papier pour ne pas être responsable… alors que je venais de me blesser au cabinet !', why: 'Une décharge ne t’exonère de rien : ta responsabilité reste engagée s’il y a faute, préjudice et lien de causalité.' },
  silence: { base: 2, plainte: '{me} m’a offert la séance pour que je me taise. Ce n’est pas honnête !', why: 'Acheter le silence d’un patient manque à la probité : c’est grave, et le conseil départemental s’associe à la plainte.' }
};
/* Questions of the chambre disciplinaire */
export const TRIBUNAL_Q = [
  { q: 'Pour que ta responsabilité soit engagée, il faut…', o: ['Une plainte du patient, c’est tout', 'Une faute, un préjudice et un lien de causalité certain et direct', 'Un résultat décevant'], a: 1, why: 'Faute prouvée + dommage évalué + lien de causalité certain et direct (sauf force majeure, cas fortuit ou fait étranger).' },
  { q: 'Envers ton patient, tu as une obligation…', o: ['De résultat : il doit guérir', 'De moyens et de sécurité : des soins attentifs, conformes aux données de la science'], a: 1, why: 'Obligation de moyens (et de sécurité), pas de résultat.' },
  { q: 'Une décharge signée par le patient…', o: ['Te protège de tout', 'Ne t’exonère pas de ta responsabilité', 'Remplace ton assurance RCP'], a: 1, why: 'On ne s’exonère pas de sa responsabilité avec une décharge.' },
  { q: 'Quelles sanctions la chambre disciplinaire peut-elle prononcer ?', o: ['Avertissement, blâme, interdiction temporaire d’exercer, radiation', 'Une amende et de la prison', 'Aucune : l’Ordre n’a pas ce pouvoir'], a: 0, why: 'Avertissement, blâme, interdiction temporaire d’exercer (avec ou sans sursis, 3 ans au plus) ou radiation. La prison, c’est le pénal.' },
  { q: 'Ton assurance RCP paiera la sanction disciplinaire ?', o: ['Oui, c’est son rôle', 'Non : elle indemnise le patient (le civil), pas la sanction'], a: 1, why: 'La RCP répare le dommage du patient. Une sanction disciplinaire ou pénale ne s’assure pas.' },
  { q: 'En cas d’incident pendant une séance, tu dois…', o: ['Attendre de voir si le patient se plaint', 'Déclarer l’incident à ta RCP et prendre régulièrement des nouvelles du patient'], a: 1, why: 'Déclare tout incident à ton assureur et suis ton patient : c’est le conseil du cours.' },
  { q: 'Combien de temps un patient peut-il agir contre toi ?', o: ['3 ans après la séance', '10 ans après la consolidation du dommage'], a: 1, why: 'Depuis l’affaire Mercier et la loi Kouchner : 10 ans à compter de la consolidation du dommage.' }
];
export const SANCTIONS = {
  relaxe: { name: 'Relaxe', text: 'La chambre ne retient aucune faute disciplinaire.' },
  avertissement: { name: 'Avertissement', text: 'La plus légère des sanctions : elle reste dans ton dossier.' },
  blame: { name: 'Blâme', text: 'Un blâme : tu ne pourras pas faire partie d’un conseil de l’Ordre pendant 3 ans.' },
  sursis: { name: 'Interdiction d’exercer d’un mois avec sursis', text: 'Tu continues de travailler… mais en cas de nouvelle faute dans les 5 ans, ce mois d’interdiction pourra s’ajouter à ta nouvelle sanction.' },
  ferme: { name: 'Interdiction d’exercer pendant un mois', text: 'Le mois prochain, tu n’as pas le droit de soigner : aucune recette, mais tes charges continuent.' }
};
