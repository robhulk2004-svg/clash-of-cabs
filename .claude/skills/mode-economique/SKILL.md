---
name: mode-economique
description: Mode économe en tokens. Pour chaque tâche, choisit automatiquement le plus petit modèle Claude qui la fait correctement (Haiku, Sonnet ou Opus) et délègue les sous-tâches légères à un sous-agent sur ce modèle. À utiliser quand l'utilisateur demande un mode économique, un choix automatique de modèle, ou d'économiser des tokens.
---

# Mode économe en tokens

Ce mode choisit le modèle le plus économe qui fait correctement le travail. Il ne peut pas changer le modèle de la conversation en cours : c'est le sélecteur de l'application qui le fait. Il agit donc sur les **sous-agents** que tu lances toi-même, avec le paramètre `model`.

## Grille de décision

| Niveau | `model` | Quand l'utiliser |
|---|---|---|
| Léger | `haiku` | Recherche de fichiers ou de texte, lecture et résumé de fichiers, extraction, tri, reformatage, petites corrections mécaniques, tâches répétitives sur beaucoup d'éléments |
| Standard | `sonnet` | Défaut pour le reste : écriture de code courant, modifications dans plusieurs fichiers, rédaction de contenu pédagogique, analyse de données classique |
| Avancé | `opus` | Raisonnement long ou multi-étapes, architecture, bugs difficiles, décisions à fort enjeu, relecture critique, contenu où une erreur de fond coûte cher |

Règle : prendre le plus petit niveau qui suffit. La difficulté du raisonnement compte, pas la longueur du texte ni le nombre de fichiers.

## Procédure

1. **Découper** la demande en sous-tâches.
2. **Classer** chaque sous-tâche selon la grille.
3. **Déléguer** les sous-tâches légères (`haiku`) et, si c'est utile, les tâches standard (`sonnet`) à un sous-agent, avec le paramètre `model` correspondant. Garde pour toi la coordination et les décisions.
4. **Garder** pour la conversation principale les étapes qui demandent du jugement et qui dépendent du contexte déjà établi.
5. **Escalader** d'un cran si le résultat d'un niveau léger est insuffisant (incomplet, faux, ou contradictoire). Dis en une phrase pourquoi.
6. **Annoncer** en une ligne, avant de commencer, le découpage choisi (ex. « recherche en Haiku, modification en Sonnet »), sans demander de confirmation sauf action risquée ou irréversible.

## Cas particuliers

- **Tâche unique et simple** : ne lance pas de sous-agent pour rien. Un sous-agent a un coût de démarrage ; pour une lecture ou une retouche d'un fichier, fais-la directement.
- **Recherche large dans le code** : sous-agent `haiku` (type `Explore` si disponible).
- **Demande explicite de l'utilisateur** pour un modèle précis : respecte-la.
- **Contenu pédagogique (kinésithérapie, réglementation française)** : rédaction en `sonnet` au minimum ; vérification des points réglementaires en `opus`. En cas de doute, signale-le plutôt que d'inventer.

## À ne pas faire

- Ne pas utiliser `opus` par défaut « au cas où » : c'est plus lent et plus coûteux pour un gain nul sur les tâches simples.
- Ne pas demander à l'utilisateur quel modèle prendre pour chaque sous-tâche : le choix se fait ici, automatiquement.
- Ne pas présenter de chiffre d'économie de tokens sans l'avoir mesuré.
