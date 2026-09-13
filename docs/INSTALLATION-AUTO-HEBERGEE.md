# Installation auto-hébergée

1. Télécharger le ZIP attaché à la GitHub Release.
2. Vérifier son SHA-256 si souhaité.
3. Extraire `kohatools/` sur un hébergement HTTPS accessible depuis l'intranet Koha.
4. Ajouter dans `IntranetUserJS` le bootstrap local indiqué dans le README.
5. Ajouter `updateManifestUrl` pointant vers le `latest.json` GitHub Pages du projet pour recevoir les notifications de nouvelles releases.
6. Recharger Koha puis effectuer les tests et la validation.

## Mise à jour

1. Sauvegarder le dossier `kohatools/` actuellement publié.
2. Télécharger la nouvelle release et vérifier le SHA-256.
3. Remplacer le dossier publié.
4. Faire un rechargement forcé.
5. Contrôler la version et lancer les diagnostics.

## Rollback

Remettre la sauvegarde du dossier précédent. Les données Koha, les configurations Firestore et les profils externes ne doivent pas être supprimés lors d'un rollback de fichiers.
