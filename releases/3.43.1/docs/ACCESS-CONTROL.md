# Contrôle d’accès — Pimp My Koha

Pimp My Koha reste un système pré-plugin exécuté dans le navigateur du staff Koha. Il ne crée pas de droits serveur supplémentaires : les permissions Koha et les contrôles des API restent l’autorité finale.

## Rôles Pimp My Koha

- `staff` : rôle par défaut ; utilise les modules métier autorisés.
- `manager` : rôle optionnel pour restreindre certains modules métier.
- `admin` : ouvre la console Pimp My Koha et sa configuration.
- `developer` : hérite du rôle admin et peut utiliser les fonctions DEV.

Le rôle `developer` est **fail-closed** : une liste vide n’autorise personne.

## Configuration recommandée dans le bootstrap

```javascript
window.KohaToolsBootstrap = {
  access: {
    adminUsers: ["VOTRE_IDENTIFIANT_KOHA"],
    developerUsers: ["VOTRE_IDENTIFIANT_KOHA"]
  }
};
```

L’identifiant est lu depuis l’utilisateur réellement connecté à Koha (`data-loggedinusername`).

## Accès par module

Un module peut déclarer :

```json
"access": {
  "audience": "staff",
  "allowedUsernames": [],
  "deniedUsernames": []
}
```

Valeurs d’`audience` : `staff`, `manager`, `admin`, `developer`.

Un module peut aussi utiliser des capacités Koha détectables de manière fiable dans l’en-tête staff :

```json
"access": {
  "audience": "staff",
  "kohaAll": ["catalogue"],
  "kohaAny": []
}
```

Capacités actuellement détectées : `circulate`, `borrowers`, `catalogue`, `editcatalogue`, `acquisition`, `serials`, `reports`, `suggestions`, `tools`, `parameters` et `superlibrarian`. Un `superlibrarian` satisfait toutes ces capacités. Cette détection s’appuie sur l’interface native de Koha et reste volontairement limitée aux capacités observables de façon stable.

Le loader refuse alors d’initialiser un module non autorisé. Le routeur et la navigation appliquent la même règle.

## Limite de sécurité

Cette couche empêche l’affichage, le chargement et l’ouverture depuis Pimp My Koha. Elle ne remplace pas une authentification serveur. La détection des capacités Koha est une aide d’interface, pas une preuve de permission. Une opération REST Koha reste autorisée ou refusée par Koha avec les permissions du compte connecté.
