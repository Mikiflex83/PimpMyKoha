# Canaux Stable, Canary et Dev

Pimp My Koha distingue deux mécanismes.

## 1. Canal de distribution GitHub

- `stable` : production ; version explicitement épinglée recommandée.
- `canary` : prérelease destinée à une recette élargie.
- `dev` : développement actif ; réservé aux usernames développeur déclarés.

Une release `stable` est une GitHub Release normale. Une release `canary` ou `dev` doit être marquée **prerelease**.

## 2. Canary module local

Le Canary historique de Pimp My Koha reste disponible : il remplace localement un module historique par sa candidate KohaTools dans un navigateur, sans basculer toute l’installation. Son contrôle est désormais réservé au rôle `developer`. Son état est stocké séparément pour chaque username Koha afin qu’un compte agent utilisant le même navigateur ne puisse pas hériter d’un Canary lancé par le développeur.

## Sandbox multi-utilisateurs

La sandbox peut charger `channel-loader.js` avec `channel: "dev"`. Le loader vérifie le username Koha :

- développeur explicitement autorisé + release DEV publiée → DEV ;
- autre utilisateur → Stable ;
- développeur autorisé mais aucune release DEV publiée → Stable.

Ainsi un même Koha de test permet de voir l’expérience développeur et l’expérience agent sans modifier `IntranetUserJS` entre les comptes.
