# Pimp My Koha

**Pimp My Koha** est une distribution pré-plugin de modules indépendants destinée à enrichir l'intranet professionnel de Koha sans modifier le serveur Koha ni la base de données directement.

La distribution fournit notamment :

- un core léger et des services transversaux ;
- des modules activables/désactivables indépendamment ;
- des applications métier intégrées à l'interface Koha ;
- une configuration par defaults produit + profil d'installation + réglages administrateur ;
- des prérequis guidés (SQL, Firebase, plugin, paramètres locaux) ;
- des tests et un diagnostic après mise à jour de Koha ;
- un état de référence avant mise à jour et une comparaison ciblée après bascule ;
- une santé et des prérequis visibles module par module ;
- la provenance des réglages (produit / profil / installation / navigateur) ;
- une recherche de modules par besoin métier ;
- un canal de détection des nouvelles releases Pimp My Koha avec calcul d’impact ;
- des rôles Pimp My Koha (`staff`, `manager`, `admin`, `developer`) sans création de droits serveur ;
- trois canaux de distribution GitHub : **Stable / Canary / Dev** ;
- un mode DEV explicitement réservé aux usernames Koha autorisés.
- un assistant guidé de première installation ;
- des tests ciblés après mise à jour et des budgets de performance non invasifs.

> Pimp My Koha n'effectue aucune mise à jour silencieuse. L'établissement choisit explicitement la version utilisée.

## Installation : deux méthodes

### Méthode A — GitHub Pages, recommandée

Cette méthode évite d'héberger soi-même les fichiers Pimp My Koha. Chaque release stable reste disponible sous une URL versionnée :

```text
https://VOTRE-COMPTE.github.io/VOTRE-DEPOT/releases/3.44.0/
```

Dans `IntranetUserJS`, ajouter un bootstrap minimal :

```javascript
window.KohaToolsBootstrap = {
  deploymentMode: "fresh-install",
  installationId: "mon-reseau"
};

(function () {
  var s = document.createElement("script");
  s.src = "https://VOTRE-COMPTE.github.io/VOTRE-DEPOT/releases/3.44.0/bootstrap.js";
  s.async = false;
  document.head.appendChild(s);
})();
```

Le runtime détecte automatiquement le `latest.json` publié à la racine GitHub Pages et peut signaler qu'une nouvelle release est disponible.

**Pour mettre à jour tous les postes**, remplacer uniquement le numéro de version dans l'URL de `IntranetUserJS`, vers la version validée, après avoir lu les changements et effectué les tests souhaités.

Avantages :

- installation très courte ;
- toutes les releases restent disponibles pour rollback ;
- aucune copie manuelle de dizaines de fichiers ;
- cache navigateur efficace grâce aux URLs versionnées.

Voir [`docs/INSTALLATION-GITHUB-PAGES.md`](docs/INSTALLATION-GITHUB-PAGES.md) et [`docs/INSTALLATION-GITHUB-SANDBOX-CANAUX.md`](docs/INSTALLATION-GITHUB-SANDBOX-CANAUX.md).

### Méthode B — Auto-hébergement

Télécharger le ZIP de la release GitHub, extraire le dossier `kohatools/` sur l'hébergement statique de l'établissement, puis charger son `bootstrap.js` depuis `IntranetUserJS`.

Exemple :

```javascript
window.KohaToolsBootstrap = {
  deploymentMode: "fresh-install",
  installationId: "mon-reseau",
  updateManifestUrl: "https://VOTRE-COMPTE.github.io/VOTRE-DEPOT/latest.json"
};

(function () {
  var s = document.createElement("script");
  s.src = "https://koha.example.org/public/kohatools/bootstrap.js";
  s.async = false;
  document.head.appendChild(s);
})();
```

`updateManifestUrl` permet à l'installation auto-hébergée d'être informée des nouvelles versions publiées sur GitHub, sans autoriser GitHub à remplacer les fichiers locaux.

Pour mettre à jour : sauvegarder l'ancien dossier, remplacer `kohatools/` par celui de la nouvelle release, effectuer un rechargement forcé, puis utiliser **Administration → Mises à jour / Santé & diagnostics**.

Voir [`docs/INSTALLATION-AUTO-HEBERGEE.md`](docs/INSTALLATION-AUTO-HEBERGEE.md).

## Prérequis

- Koha intranet professionnel ;
- possibilité d'ajouter le petit bootstrap dans `IntranetUserJS` ;
- accès aux API Koha requis par les modules utilisés ;
- prérequis propres aux modules éventuellement activés (rapport SQL en lecture seule, Firebase, plugin, etc.).

Un prérequis manquant doit bloquer uniquement le module concerné, jamais tout Pimp My Koha.

## Mises à jour

Pimp My Koha vérifie au maximum une fois par jour le manifeste public `latest.json` lorsque le canal GitHub est configuré. L'administration affiche :

- version installée ;
- dernière release stable ;
- compatibilité Koha annoncée ;
- principaux changements ;
- lien vers la release et le ZIP ;
- bootstrap de la nouvelle version prêt à copier en mode GitHub Pages.

Aucune nouvelle version n'est appliquée automatiquement.

Voir [`docs/MISES-A-JOUR.md`](docs/MISES-A-JOUR.md).

## Publier une release

Le dépôt contient deux workflows GitHub Actions :

- `ci.yml` : contrôle du FULL-DIST à chaque push / pull request ;
- `release.yml` : à la publication d'une GitHub Release, valide le paquet, génère le ZIP et son SHA-256, ajoute les assets à la release et publie la version sous `gh-pages/releases/<version>/`.

Avant une release, modifier `release/release.json`. Une release `stable` utilise une GitHub Release normale ; une release `canary` ou `dev` doit être marquée **pre-release**. Le workflow met à jour uniquement le canal publié et conserve les autres canaux dans `latest.json`.

## Stable / Canary / Dev

- **Stable** : production, version explicitement épinglée recommandée ;
- **Canary** : prérelease de validation ;
- **Dev** : développement actif, accessible uniquement aux usernames déclarés développeurs.

Le `channel-loader.js` est destiné surtout aux sandbox : si le compte connecté n'est pas autorisé pour le canal demandé, il retombe automatiquement sur Stable. Le test local d’un module reste distinct du canal GitHub Canary.

Voir `FULL-DIST/kohatools/docs/ACCESS-CONTROL.md` et `FULL-DIST/kohatools/docs/CHANNELS.md`.

## Sécurité et données d'installation

Le dépôt public ne doit contenir **aucun profil d'établissement réel**. Seul `profiles/example.json` est publié ici. Les profils, identifiants de rapports, comptes techniques, adresses, backends Firebase et autres valeurs propres à un réseau restent hors du dépôt public.

## Licence

Voir [`LICENSE`](LICENSE).

## Avant la première publication publique

Le choix de licence du projet doit être validé par le propriétaire du dépôt. Voir [`docs/LICENCE-AVANT-PUBLICATION.md`](docs/LICENCE-AVANT-PUBLICATION.md). Le projet fournit un modèle MIT à titre de proposition, mais il n’est pas activé automatiquement.
