# Canaux de mises à jour

Le fichier `latest.json` publié par GitHub Pages est le contrat public de release. Depuis la V3.43, il conserve séparément les canaux `stable`, `canary` et `dev`.

Pimp My Koha le consulte en lecture seule. Le contrôle est limité par défaut à une fois toutes les 24 heures et peut être relancé manuellement depuis l'administration.

## Principes

- aucune installation automatique silencieuse ;
- un simple `git push` ne modifie aucune installation ;
- une release `stable` est une GitHub Release normale ;
- une release `canary` ou `dev` est une GitHub **pre-release** ;
- publier Canary ou Dev ne déplace jamais Stable ;
- une production GitHub Pages reste de préférence épinglée à une version Stable ;
- une sandbox peut utiliser `channel-loader.js` pour sélectionner Dev/Canary selon le compte Koha connecté ;
- un compte non autorisé pour le canal demandé retombe sur Stable ;
- le mode auto-hébergé ne remplace jamais ses fichiers tout seul ;
- le rollback utilise toujours une release antérieure connue.

## `latest.json`

Le workflow de release le génère automatiquement. Il contient :

- la version actuellement publiée pour chaque canal ;
- les métadonnées des releases connues ;
- les notes et l'impact calculé ;
- la compatibilité Koha annoncée ;
- l'URL du runtime ;
- l'URL du ZIP et son SHA-256.

## Deux Canary différents

Le **canal GitHub Canary** distribue une prérelease complète. Le **Canary module** de Pimp My Koha reste un mécanisme local, module par module, réservé au rôle développeur. Les deux mécanismes sont indépendants.
