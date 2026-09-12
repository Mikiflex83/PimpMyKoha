# Installation V3.42 — pré-plugin

1. Publier le dossier `kohatools/` sur un hébergement HTTPS statique.
2. Créer un profil `profiles/<installation-id>.json` à partir de `profiles/example.json`.
3. Dans IntranetUserJS, définir uniquement le contrat hôte puis charger `bootstrap.js` :

```js
window.KohaToolsBootstrap = {
  deploymentMode: "fresh-install",
  assetRoot: "https://static.exemple.fr/kohatools/",
  installationId: "reseau-x",
  profileUrl: "https://static.exemple.fr/kohatools/profiles/reseau-x.json"
};
var s=document.createElement("script");
s.src=window.KohaToolsBootstrap.assetRoot+"bootstrap.js";
document.head.appendChild(s);
```

Aucune page Koha personnalisée n’est à créer. Les applications utilisent des pages virtuelles `mainpage.pl#kt/module/<id>`.

Ouvrir ensuite `mainpage.pl#kt/module/installation-preflight`. Chaque module indique ses seuls raccordements locaux. Un prérequis obligatoire manquant bloque ce module uniquement. Les valeurs métier/visuelles sont déjà fournies par `product-defaults.json`.


## Assistant V3.42

La page `installation-preflight` permet désormais de copier les prérequis, tester les rapports SQL configurés, ouvrir directement la configuration du module et tenter de détecter les bibliothèques, types de documents et catégories lecteurs via l’API Koha. La détection est une aide : aucune valeur n’est écrite automatiquement.
