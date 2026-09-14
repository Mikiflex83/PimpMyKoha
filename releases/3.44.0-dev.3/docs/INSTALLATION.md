# Installation V3.44 — pré-plugin

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

Ouvrir ensuite **Pimp My Koha → Administration → Préparer l’installation**. L’assistant indique uniquement ce qui doit être complété pour votre établissement. Un élément obligatoire manquant bloque uniquement le module concerné ; les autres restent utilisables.


## Assistant de première installation

L’assistant permet de copier les éléments à créer dans Koha, de tester ce qui a été renseigné, d’ouvrir directement les réglages du module et de détecter les bibliothèques, types de documents et catégories de lecteurs disponibles. La détection est une aide : aucune valeur n’est modifiée automatiquement.

Les détails techniques restent accessibles au mainteneur mais ne sont pas nécessaires au parcours normal d’un administrateur.
