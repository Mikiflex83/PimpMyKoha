# Pimp My Koha / KohaTools — V3.43.0

Distribution pré-plugin multi-installations.

- `bootstrap.js` + `loader.js` : point d'entrée officiel.
- `config/product-defaults.json` : defaults produit riches, sans raccordement client.
- `profiles/` : raccordements propres à chaque installation.
- `modules/` et `apps/` : modules métier indépendants.
- `prerequisites/` : SQL, règles Firebase, index et instructions copiables.
- `admin/panel.js` : unique interface d'administration, intégrée dans Koha.
- `docs/INSTALLATION.md` : installation neuve.
- `docs/MIGRATION-DRACENIE.md` : migration de l'installation historique.

Le mode `fresh-install` ne charge jamais silencieusement un module legacy. Un prérequis obligatoire manquant bloque uniquement le module concerné.

## Distribution, accès et mises à jour

V3.43.0 ajoute la distribution GitHub **Stable / Canary / Dev** et une couche d’accès Pimp My Koha. Le rôle `developer` doit toujours être explicitement associé à un username Koha ; les outils DEV ne sont chargés que sur le canal Dev. Le Canary module local est également réservé au développeur et stocké par compte Koha.

Une release n’est jamais installée silencieusement : la production GitHub Pages reste épinglée à une version et l’auto-hébergement conserve la maîtrise de ses fichiers. Voir `docs/UPDATE.md`, `docs/ACCESS-CONTROL.md` et `docs/CHANNELS.md`.
