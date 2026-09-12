# Installation via GitHub Pages

1. Vérifier que la release visée est déclarée compatible avec votre branche Koha.
2. Dans Koha, sauvegarder la valeur actuelle de `IntranetUserJS`.
3. Ajouter le bootstrap documenté dans le README en remplaçant `VOTRE-COMPTE`, `VOTRE-DEPOT`, la version et `installationId`.
4. Recharger l'intranet Koha avec un rechargement forcé.
5. Ouvrir Pimp My Koha et vérifier la version affichée.
6. Ouvrir **Administration → Mises à jour** puis **Santé & diagnostics**.
7. Configurer uniquement les prérequis locaux demandés par les modules activés.
8. Pour une sandbox Stable/Canary/Dev, utiliser plutôt `INSTALLATION-GITHUB-SANDBOX-CANAUX.md`.

## CSP / sécurité navigateur

L'installation Koha doit autoriser le chargement des assets HTTPS depuis le domaine GitHub Pages utilisé. Si la politique CSP de votre établissement interdit ce domaine, utilisez la méthode auto-hébergée ou faites autoriser explicitement la source par votre administrateur Koha.

## Mise à jour

Une installation GitHub Pages reste épinglée à une version. Pour changer de release, modifier uniquement le segment de version dans l'URL du `bootstrap.js` dans `IntranetUserJS`.

## Rollback

Remettre l'ancienne version dans cette URL. Les anciennes releases restent sous leur répertoire versionné sur GitHub Pages.


## Accès administrateur et développeur

Sur une installation neuve, déclarez explicitement les usernames autorisés dans le bootstrap. Une liste développeur vide n'autorise personne. Les droits REST et serveur restent ceux de Koha.
