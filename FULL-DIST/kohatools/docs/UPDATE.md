# Mise à jour de Pimp My Koha

## Principe

Une installation utilise toujours une version explicitement choisie. Le service `updates` peut consulter un `latest.json` public et signaler une nouvelle release, mais il ne remplace jamais silencieusement le runtime.

## GitHub Pages

Le bootstrap est chargé depuis une URL versionnée :

```text
.../releases/<version>/bootstrap.js
```

Après lecture des notes de release et recette, modifier le numéro de version dans `IntranetUserJS`. Tous les postes prendront la nouvelle version au prochain chargement.

Le rollback consiste à remettre l'ancien numéro de version.

## Auto-hébergement

1. sauvegarder le dossier KohaTools actuellement publié ;
2. télécharger et vérifier la nouvelle release ;
3. remplacer le dossier publié ;
4. rechargement forcé ;
5. vérifier la version puis lancer la santé/recette ;
6. en cas de problème, restaurer le dossier précédent.

Pour recevoir les notifications GitHub tout en restant auto-hébergé, définir `KohaToolsBootstrap.updateManifestUrl` vers le `latest.json` du dépôt officiel.

## Configuration

Ne jamais remplacer un profil d'installation par `product-defaults.json`. Les migrations de configuration sont versionnées par `configSchemaVersion` et doivent rester idempotentes.


## Impact de release V3.42

Le manifeste de release peut contenir un bloc `impact` calculé automatiquement par GitHub Actions à partir du tag stable précédent. L’administration distingue les modules modifiés et ceux qui sont actifs dans l’installation. Avant la bascule, **Préparer la mise à jour** enregistre un état de référence local.

Après la bascule, ouvrir **Administration → Maintenance** pour comparer l’état et lancer uniquement les diagnostics nécessaires.
