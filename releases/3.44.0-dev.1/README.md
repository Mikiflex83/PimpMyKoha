# Pimp My Koha / KohaTools — V3.44.0-dev.1

Distribution pré-plugin multi-installations.

- `bootstrap.js` + `loader.js` : point d'entrée officiel.
- `config/product-defaults.json` : defaults produit riches, sans raccordement client.
- `profiles/` : raccordements propres à chaque installation.
- `modules/` et `apps/` : modules métier indépendants.
- `prerequisites/` : SQL, règles Firebase, index et instructions copiables.
- `admin/panel.js` : unique interface d'administration, intégrée dans Koha.
- `docs/INSTALLATION.md` : installation neuve.
- L’espace **Migration des anciens modules** de l’administration : reprise contrôlée d’une installation historique.

Le mode `fresh-install` ne charge jamais silencieusement un module legacy. Un prérequis obligatoire manquant bloque uniquement le module concerné.

## Distribution, accès et mises à jour

V3.44.0-dev.1 consolide le parcours de mise en production : modules normaux séparés de la migration, configuration simplifiée, droits alignés sur Koha, tests et validation communs à tous les types de modules, prérequis isolés par fonction et première installation guidée. Le rôle `developer` reste explicitement associé à un compte Koha et les essais locaux restent limités au navigateur du mainteneur.

Une release n’est jamais installée silencieusement : la production GitHub Pages reste épinglée à une version et l’auto-hébergement conserve la maîtrise de ses fichiers. Voir `docs/UPDATE.md`, `docs/ACCESS-CONTROL.md` et `docs/CHANNELS.md`.
