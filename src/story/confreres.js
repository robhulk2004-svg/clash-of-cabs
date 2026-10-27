import { AudioSys } from '../audio/audio.js';
import { G, persist, state } from '../core/save.js';
import { $ } from '../core/utils.js';
import { TOWN_CABS } from '../data/town-map.js';
import { Board, offerDef } from '../game/board.js';
import { Room } from '../scenes/room.js';
import { SCRIPTS } from './scripts.js';
import { Talk, say } from './talk.js';
import { refreshGuide } from '../ui/guide.js';
import { blocked } from '../ui/modals.js';

/* ================= The confrères: Thomas (IRSBC), Étienne (Basquaise), Julien (Maransin), Mathieu (La Réunion), Chad (Michigan), Suzie (the Moon) ================= */
/* Their advice: gestion de cabinet, déontologie. */
const CONFRERES = {
  thomas: {
    hello: "Salut ! Thomas Cassmoildeau, titulaire du Cabinet IRSBC. Mes patients sont adorables… surtout ceux du lundi matin.",
    keys: "Voilà les clés et le code de l'alarme. Et tu factures avec TA propre carte CPS, pas la mienne, hein !",
    bye: "Merci pour le remplacement ! Je reprends mes patients : tu m'as laissé des dossiers nickel pour la continuité des soins.",
    tips: [
      "Avant chaque remplacement, je préviens le conseil départemental de l'Ordre et je lui transmets le contrat. C'est obligatoire !",
      "Pendant que tu me remplaces, je cesse toute activité de soin. Sauf dérogation de l'Ordre, on ne soigne pas à deux sur le même contrat.",
      "Garde tes documents professionnels au moins 6 ans : un contrôle peut remonter sur les 5 dernières années, plus l'année en cours."
    ]
  },
  etienne: {
    hello: "Étienne Poulet, du Cabinet Basquaise ! Ici, l'agenda déborde : tu ne vas pas t'ennuyer.",
    keys: "Mon agenda est plein du matin au soir. Garde le rythme : un patient sort, le suivant entre !",
    bye: "Génial, merci ! Le cabinet tourne encore mieux qu'avant. Et n'oublie pas : ta rétrocession est une charge déductible.",
    tips: [
      "Le remplaçant n'a aucune charge fixe, mais ses revenus sont instables. Mets de côté dès les premiers mois !",
      "Un achat de moins de 500 € HT, soit 598 € TTC, se déduit tout de suite. Au-delà, il s'amortit.",
      "Toute somme qui arrive sur ton compte pro est une recette… jusqu'à preuve du contraire. Un prêt se déclare comme un prêt !"
    ]
  },
  julien: {
    hello: "Julien Coulommiers, kiné à la maison de santé de Maransin. Un vrai désert médical : certains patients font 30 km pour venir.",
    keys: "Le logement est juste au-dessus de la maison de santé. Le café est fort, les patients aussi. Bienvenue à Maransin !",
    bye: "Maransin te dit merci ! Les patients te réclament déjà. Reviens quand tu veux.",
    tips: [
      "Tes trajets restent professionnels, même au-delà de 40 km : c'est la règle pour les remplaçants.",
      "Un logement fourni, c'est un vrai avantage : tu ne fais l'aller-retour que le week-end.",
      "Une clause de non-concurrence signée t'engage. Lis tes contrats avant de signer, et au moindre doute, demande l'avis de l'Ordre."
    ]
  },
  mathieu: {
    hello: "Mathieu Mopourmot, kiné à Saint-Gilles ! Ici, les patients arrivent en tongs et repartent en courant.",
    keys: "Voilà les clés ! Le cabinet ouvre à 7 h : avant la chaleur.",
    bye: "Merci pour tout ! Mes patients te réclament déjà.",
    tips: [
      "Dans les DOM, la lettre-clé vaut 2,43 € au lieu de 2,21 € : même NGAP, mêmes coefficients, seule la valeur change.",
      "Pour mes visites dans les cirques, j'ajoute des indemnités kilométriques : en montagne, elles sont plus élevées qu'en plaine.",
      "L'assistant soigne la patientèle du titulaire et lui verse une redevance, assimilée à un loyer. En partant, il ne l'emporte pas !"
    ]
  },
  chad: {
    hello: "Yo ! Chad Cook, le kiné le plus musclé des States !",
    keys: "Les clés, bro. Et ne touche pas à mes haltères en or.",
    bye: "Respect, bro. Reviens quand tu veux.",
    tips: [
      "Ici, pas de Sécu : les patients paient cash. Chez toi, en France, tu factures avec ta carte CPS et l'Assurance Maladie rembourse sa part.",
      "Mes formations sont les meilleures du monde. Enfin… c'est ce que dit ma pub. En France, la vraie formation continue, c'est le DPC, avec des organismes enregistrés.",
      "Une séance qui n'a pas eu lieu ne se facture pas. Même au Michigan, bro. Surtout au Michigan, en fait : le shérif veille."
    ]
  },
  suzie: {
    hello: "Suzie Taillebois, la seule kiné de la Lune ! Bienvenue dans mon cabinet lunaire !",
    keys: "Les clés du cabinet lunaire ! Attention à la porte : elle flotte un peu.",
    bye: "Merci ! Les aliens t'ont adoré.",
    tips: [
      "En faible gravité, mes patients perdent du muscle : je leur fais faire du renforcement tous les jours. Ça, au moins, ça marche vraiment !",
      "Mon déshiftage est miraculeux… Bon, je n'ai aucune étude pour le prouver. Mais les aliens sourient !",
      "Même sur la Lune, on écoute le patient, on cherche les drapeaux rouges, et on réoriente quand il le faut."
    ]
  }
};
export const CONFRERE_SCRIPTS = {
  /* the titulaire sends his draft contract */
  async titPitch(cab, o) {
    const C = TOWN_CABS[cab], w = C.who, L = CONFRERES[w];
    if (!G.events['met_' + w]) { G.events['met_' + w] = true; persist(); await say(w, 'happy', L.hello); }
    await say(w, 'think', offerDef(o).pitch.replace(/[«»]/g, '').trim());
  },
  async titKeys(c) { const w = TOWN_CABS[c.cab].who; await say(w, 'happy', CONFRERES[w].keys); },
  async titBye(c) { const w = TOWN_CABS[c.cab].who; await say(w, 'happy', CONFRERES[w].bye); },
  /* a chat during a visit */
  async titTalk(cab) {
    const C = TOWN_CABS[cab], w = C.who, L = CONFRERES[w];
    if (!G.events['met_' + w]) { G.events['met_' + w] = true; persist(); await say(w, 'happy', L.hello); }
    const k = (G.events['tip_' + w] = ((G.events['tip_' + w] || 0) + 1) % L.tips.length); persist();
    await say(w, 'think', L.tips[k]);
    if (Board.offerAt(cab)) await say(w, 'happy', "Au fait, je cherche un remplaçant ! Mon offre est sur le tableau : jette un œil.");
    else if (G.phase === 'rempl' && !G.contract && G.monthsRempl < 12 && Board.open_().length) await say(w, 'happy', "Tu cherches ton prochain remplacement ? Les offres des confrères sont sur le tableau « Offres », à gauche de l'écran.");
  }
};
export const Confrere = {
  async talk() {
    const cab = Room.cab; if (blocked() || !Room.visitMode(cab)) return;
    state.busy = true; AudioSys.tap();
    await Talk.open(); await SCRIPTS.titTalk(cab); await Talk.close();
    state.busy = false; Room.syncUi(); refreshGuide();
  }
};
$('btnTalkTit').addEventListener('click', () => Confrere.talk());
$('btnOfferTit').addEventListener('click', () => { if (blocked()) return; AudioSys.tap(); Board.open(Room.cab); });
