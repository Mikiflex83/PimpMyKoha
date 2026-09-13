# Pimp My Koha — guide clic par clic GitHub + sandbox

Ce guide part d’un dépôt GitHub inexistant et d’une sandbox Koha disposant d’un accès administrateur au staff.

## 0. Avant de commencer

Préparer :

1. votre compte GitHub ;
2. le nom du dépôt, recommandé : `pimp-my-koha` ;
3. votre **identifiant de connexion Koha** (le username, pas votre nom affiché) ;
4. l’archive Pimp My Koha contenant le dossier `GITHUB-PUBLIC`.

### Retrouver exactement votre username Koha

Sur Koha 25.11, l’identifiant connecté est celui affiché dans le menu utilisateur en haut à droite. Si vous avez un doute :

1. ouvrir Koha avec votre compte ;
2. ouvrir les outils développeur du navigateur (`F12`) ;
3. onglet **Console** ;
4. coller :

```javascript
document.querySelector('.loggedinusername[data-loggedinusername]')?.dataset.loggedinusername
```

La valeur retournée est celle à placer dans `adminUsers` et `developerUsers`.

Ne mettez jamais dans GitHub un mot de passe Koha, un token GitHub, une clé Firebase privée ou un profil Dracénie réel.

## 1. Créer le dépôt GitHub

1. Ouvrir GitHub.
2. Cliquer sur **+** en haut à droite.
3. Cliquer **New repository**.
4. Dans **Repository name**, saisir `pimp-my-koha`.
5. Choisir **Public**.
6. Ne pas ajouter de README, `.gitignore` ou licence depuis GitHub : le paquet contient déjà ces fichiers.
7. Cliquer **Create repository**.

La licence MIT est déjà active dans `LICENSE`. Vérifier qu’elle reste présente avant toute diffusion publique.

## 2. Mettre le contenu du paquet dans le dépôt

La méthode la plus simple graphiquement est GitHub Desktop.

1. Ouvrir **GitHub Desktop** et se connecter au compte GitHub.
2. **File → Clone repository**.
3. Onglet **GitHub.com**.
4. Sélectionner `pimp-my-koha`.
5. Choisir un dossier local puis **Clone**.
6. Dans l’archive Pimp My Koha, ouvrir `GITHUB-PUBLIC`.
7. Copier **le contenu** de `GITHUB-PUBLIC` dans le dossier cloné, pas le dossier `GITHUB-PUBLIC` lui-même.
8. Vérifier notamment la présence de `.github`, `FULL-DIST`, `scripts`, `release`, `install`, `README.md`.
9. Revenir dans GitHub Desktop.
10. Dans **Summary**, saisir `Pimp My Koha 3.43.1`.
11. Cliquer **Commit to main**.
12. Cliquer **Push origin**.

## 3. Autoriser le workflow de publication

1. Sur GitHub, ouvrir le dépôt.
2. **Settings → Actions → General**.
3. Descendre à **Workflow permissions**.
4. Choisir **Read and write permissions**.
5. Enregistrer avec **Save**.

## 4. Vérifier le contrôle automatique

1. Onglet **Actions** du dépôt.
2. Ouvrir **Validate Pimp My Koha**.
3. Le dernier run sur `main` doit être vert.
4. En cas de rouge, ne pas publier de release.

## 5. Publier la première Stable

1. Ouvrir **Releases** dans le dépôt.
2. Cliquer **Draft a new release**.
3. **Choose a tag → Create new tag**.
4. Saisir exactement `v3.43.1`.
5. Titre : `Pimp My Koha 3.43.1`.
6. Ne pas cocher **Set as a pre-release**.
7. Cliquer **Publish release**.
8. Aller dans **Actions** et vérifier que **Publish Pimp My Koha release** devient vert.

Le workflow construit le ZIP, son SHA-256, le runtime versionné et le manifeste des canaux.

## 6. Activer GitHub Pages

Après le premier workflow de release réussi :

1. **Settings → Pages**.
2. Dans **Build and deployment**, choisir **Deploy from a branch**.
3. Branche : `gh-pages`.
4. Dossier : `/ (root)`.
5. Cliquer **Save**.

Les URLs suivantes doivent ensuite répondre :

```text
https://VOTRE-COMPTE.github.io/pimp-my-koha/latest.json
https://VOTRE-COMPTE.github.io/pimp-my-koha/channel-loader.js
https://VOTRE-COMPTE.github.io/pimp-my-koha/releases/3.43.1/bootstrap.js
```

## 7. Installer Stable directement sur un Koha de production

Dans Koha :

1. **Administration**.
2. **Préférences système**.
3. Rechercher `IntranetUserJS`.
4. Sauvegarder d’abord la valeur actuelle dans un fichier texte.
5. Ajouter le bootstrap en remplaçant `VOTRE-COMPTE`, le dépôt et `VOTRE_IDENTIFIANT_KOHA`.

```javascript
window.KohaToolsBootstrap = {
  deploymentMode: "fresh-install",
  installationId: "mon-reseau",
  access: {
    adminUsers: ["VOTRE_IDENTIFIANT_KOHA"],
    developerUsers: ["VOTRE_IDENTIFIANT_KOHA"]
  }
};
(function () {
  var s = document.createElement("script");
  s.src = "https://VOTRE-COMPTE.github.io/pimp-my-koha/releases/3.43.1/bootstrap.js";
  s.async = false;
  document.head.appendChild(s);
})();
```

6. Cliquer **Save all** / **Enregistrer toutes les préférences**.
7. Recharger le staff Koha avec un rechargement forcé.

Cette installation est **épinglée en 3.43.1** : une nouvelle release GitHub ne remplace rien automatiquement.

## 8. Installer la sandbox avec sélection Stable / Canary / Dev

Pour la sandbox, utiliser le sélecteur de canal à la place du bootstrap direct.

Dans `IntranetUserJS` :

```javascript
window.PimpMyKohaChannelBootstrap = {
  manifestUrl: "https://VOTRE-COMPTE.github.io/pimp-my-koha/latest.json",
  channel: "dev",
  stableVersion: "3.43.1",
  installationId: "sandbox-koha",
  adminUsers: ["VOTRE_IDENTIFIANT_KOHA"],
  developerUsers: ["VOTRE_IDENTIFIANT_KOHA"],
  deploymentMode: "fresh-install"
};
(function () {
  var s = document.createElement("script");
  s.src = "https://VOTRE-COMPTE.github.io/pimp-my-koha/channel-loader.js";
  s.async = false;
  document.head.appendChild(s);
})();
```

Résultat attendu :

- connecté avec `VOTRE_IDENTIFIANT_KOHA` : DEV si une release DEV existe, sinon Stable ;
- connecté avec un autre compte : Stable ;
- aucun autre compte ne reçoit les outils DEV.

## 9. Publier une Canary

Avant la release, mettre par exemple :

```json
{
  "version": "3.44.0-canary.1",
  "channel": "canary"
}
```

Puis :

1. Commit + push sur `main`.
2. Vérifier le workflow de validation vert.
3. **Releases → Draft a new release**.
4. Tag `v3.44.0-canary.1`.
5. Cocher **Set as a pre-release**.
6. Publier.

Le canal Stable reste inchangé.

## 10. Publier une DEV

Même principe :

```json
{
  "version": "3.44.0-dev.1",
  "channel": "dev"
}
```

Créer la release `v3.44.0-dev.1` en cochant **pre-release**.

Seuls les usernames présents dans `developerUsers` peuvent sélectionner DEV via le sélecteur de sandbox. Le code du dépôt reste public puisque le projet est public ; c’est l’exécution et l’interface DEV qui sont réservées.

## 11. Comprendre les rôles avant le test

Pimp My Koha utilise quatre niveaux :

- `staff` : fonctionnement métier normal ;
- `manager` : niveau optionnel pour des modules que vous voulez réserver à des responsables ;
- `admin` : administration/configuration de Pimp My Koha ;
- `developer` : administration + outils de développement.

Ces rôles **n’ajoutent aucun droit Koha**. Pimp My Koha peut aussi utiliser, lorsqu’un module le demande, des capacités visibles dans l’interface Koha (`circulate`, `catalogue`, `editcatalogue`, `reports`, `parameters`, etc.). Les appels REST et les opérations sensibles restent toujours contrôlés par Koha.

## 12. Tester avec deux comptes

1. Avec votre compte développeur, ouvrir la sandbox.
2. Ouvrir Pimp My Koha → **Administration → Développement**.
3. Vérifier le rôle `developer` et le canal `dev`.
4. Se déconnecter.
5. Se connecter avec un compte agent de test non listé.
6. Vérifier que la section Développement n’existe pas et que le runtime sélectionné est Stable.
7. Tester ensuite les pages métier avec ce compte pour reproduire l’expérience réelle des agents.

## 13. Rollback

### Production Stable épinglée

Dans `IntranetUserJS`, remettre simplement l’ancienne URL versionnée, par exemple :

```text
.../releases/3.43.1/bootstrap.js
```

### Sandbox par canal

- passer `channel: "dev"` à `channel: "canary"` ou `channel: "stable"` ;
- ou conserver `channel: "dev"` : si DEV n’est pas disponible, le sélecteur retombe sur Stable.

Aucune release ne supprime les précédentes de `gh-pages/releases/`.
