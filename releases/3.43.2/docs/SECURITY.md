# Sécurité — V3.42

- Aucun mode d'écriture distante `anonymous-test`, `none` ou `public` n'est accepté par le core.
- Les backends Firebase métier sont propres aux modules ; aucun backend métier central n'est imposé.
- Les identifiants Firebase Web ne sont pas des secrets d'administration. Les écritures reposent sur Firebase Authentication + Security Rules.
- Les règles distribuées dans `prerequisites/firebase/` sont fermées par défaut : aucune règle `allow ... if true` n'est présente.
- Les SQL fournis dans `prerequisites/sql/` sont SELECT-only.

## Contrôles d'accès Firebase

Les modules qui écrivent ou lisent des données protégées utilisent un UID Firebase technique. Selon le module, l'utilisateur crée automatiquement une demande `pending` ou l'interface affiche l'UID à approuver. L'approbation se fait côté Firebase, jamais par un mot de passe embarqué dans JavaScript.

Collections/nœuds d'accès utilisés :

- Qualité : `quality_access_requests/{uid}` (`member` / `admin`).
- RDV & sondages : `rdv_access/{uid}` ; l'UID est affiché dans l'interface d'administration et doit être créé/approuvé côté Firebase.
- Arborescence : `collections_tree_access/{uid}`.
- Fréquentation : `attendance_access/{uid}`.
- Assistance : `assistance_access/{uid}` (Realtime Database).
- Partage interne : `internal_share_access/{uid}` (Realtime Database).
- Journal de suivi : `journal_access/{uid}`.

Les fichiers de règles copiables sont fournis par le préflight. Les règles réellement déployées dans chaque projet Firebase restent à contrôler lors de la recette d'installation.

## Données et confidentialité

- La Cartographie adhérents reste bloquée en fresh-install tant que la validation de confidentialité n'est pas explicitement renseignée.
- Aucune adresse ne doit être journalisée.
- Les modules Qualité n'envoient pas de données personnelles métier dans leur mémoire Firebase ; leurs règles limitent les champs partageables à des dimensions abstraites.
