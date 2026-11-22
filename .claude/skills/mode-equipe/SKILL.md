---
name: mode-equipe
description: Mode équipe. Claude joue le rôle de chef d'orchestre : il lance plusieurs sous-agents, leur confie des rôles, leur permet de se parler entre eux via SendMessage, puis rassemble leurs résultats. À utiliser quand l'utilisateur demande plusieurs agents qui collaborent, un chef qui coordonne, ou une tâche à découper entre plusieurs agents qui échangent.
---

# Mode équipe

Dans ce mode, la conversation principale est le **chef d'orchestre**. Elle crée les sous-agents, définit le travail de chacun, suit l'avancement et décide quand c'est fini. Les sous-agents travaillent en parallèle et peuvent s'envoyer des messages entre eux.

## Outils

- **Lancer** un sous-agent : outil `Agent` (paramètre `subagent_type` si besoin, `model` selon le mode économique : `haiku` léger, `sonnet` standard, `opus` avancé).
- **Se parler** : outil `SendMessage` avec `to` = nom du destinataire. Un message texte brut n'est pas vu par les autres agents : il faut toujours appeler `SendMessage`.
- **Trouver les agents** : `ListAgents` liste les agents joignables et indique s'ils sont occupés ou inactifs. Ne pas l'appeler en boucle.
- **Suivre le travail** : `TaskCreate`, `TaskUpdate`, `TaskList`, si la tâche est assez longue pour le justifier.

## Déroulé

1. **Cadrer** : reformuler l'objectif final en une phrase et définir ce qui compte comme « fini ».
2. **Découper** en rôles distincts et peu nombreux (2 à 4 agents en général). Exemples : un agent qui recherche, un qui rédige, un qui relit. Un rôle = une responsabilité claire.
3. **Lancer** les agents, chacun avec un brief complet : rôle, objectif, fichiers concernés, format attendu de la réponse, et les noms des autres agents avec qui il doit se coordonner.
4. **Laisser les agents se parler** pour les échanges utiles : demandes d'information, validation d'un point, transmission d'un résultat. Chaque message commence par une première ligne qui dit de quoi il s'agit.
5. **Arbitrer** : quand deux agents sont en désaccord, ou qu'un agent est bloqué, c'est le chef qui tranche, sur la base du brief initial.
6. **Vérifier** les résultats avant de les accepter. Un résultat d'agent n'est pas une vérité : relire, tester si possible.
7. **Rassembler** : produire une synthèse unique pour l'utilisateur. Dire qui a fait quoi, ce qui a été vérifié et ce qui reste ouvert.

## Garde-fous

- **Pas de boucle infinie** : si deux agents se renvoient le même message sans progrès après 3 échanges, le chef arrête l'échange et tranche.
- **Périmètre** : chaque agent ne modifie que les fichiers de son rôle. Les conflits d'écriture sont évités en confiant un seul écrivain par fichier.
- **Coût** : une équipe consomme nettement plus de tokens qu'un seul agent. Ne pas créer d'équipe pour une tâche qu'un seul agent fait bien.
- **Actions risquées** : les agents ne poussent, ne suppriment et n'envoient rien à l'extérieur sans accord explicite de l'utilisateur, relayé par le chef.
- **Permissions** : un agent ne demande jamais à un autre d'agir à sa place sur une action refusée ou bloquée. Le chef le remonte à l'utilisateur.
- **Fin** : quand l'objectif est atteint ou qu'un agent reste bloqué, le chef arrête les agents restants et rend un bilan.

## Brief type pour un sous-agent

```
Rôle : <nom du rôle>
Objectif : <ce qu'il doit produire>
Périmètre : <fichiers ou sujets>
Coordination : écris à <nom> pour <raison> ; réponds à <nom> si il te sollicite.
Format de réponse : <liste, fichier, résumé en N lignes…>
Fin : <critère clair>
```

## À ne pas faire

- Ne pas lancer une équipe « au cas où » pour une question simple.
- Ne pas laisser deux agents écrire dans le même fichier en même temps.
- Ne pas présenter comme acquis un résultat non vérifié.
