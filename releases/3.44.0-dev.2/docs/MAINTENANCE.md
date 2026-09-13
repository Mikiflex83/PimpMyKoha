# Maintenance — Pimp My Koha 3.44.0-dev.2

La V3.42 introduit un état de référence avant mise à jour, une comparaison après mise à jour, des diagnostics par module et une instrumentation légère des performances.

## Avant une mise à jour Koha

1. Ouvrir **Administration > Maintenance**.
2. Cliquer **Créer / remplacer l’état avant mise à jour**.
3. Exporter éventuellement un diagnostic global.
4. Effectuer la mise à jour Koha.

## Après la mise à jour

Ouvrir **Maintenance**. Pimp My Koha compare la version Koha, la configuration, les prérequis, les états de santé et les erreurs d’initialisation. Seuls les modules dont l’état a réellement changé sont mis en avant.

L’absence de changement détectable n’est pas une preuve métier : les modules nécessitant une action réelle conservent le statut **Action à exercer** jusqu’à passage sur leur page de recette.

## Confidentialité du diagnostic

L’export de diagnostic ne contient pas les valeurs de configuration (clés Firebase, carte lecteur, contacts, etc.). Il exporte les identifiants de modules, états, versions, temps d’initialisation et diagnostics techniques nettoyés.

## V3.42 — recette ciblée et budgets

Après une mise à jour, la page Maintenance combine l’impact de la release, la comparaison avec l’état de référence et la stratégie d’intégration Koha pour proposer une recette ciblée. Les mesures de performance utilisent uniquement les services Pimp My Koha instrumentés (KohaAdapter, observers gérés, Firebase Budget, Resource Timing et télémétrie de chargement). Pimp My Koha ne remplace pas globalement `fetch`, `setTimeout` ou `MutationObserver`, afin de ne pas modifier le comportement de Koha ou de scripts tiers.
