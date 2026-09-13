# Maintenance — Pimp My Koha 3.44.0

La V3.42 a introduit un état de référence avant mise à jour, une comparaison après mise à jour, des diagnostics par module et une instrumentation légère des performances.

## Avant une mise à jour Koha

1. Ouvrir **Administration > Maintenance**.
2. Cliquer **Créer / remplacer l’état avant mise à jour**.
3. Exporter éventuellement un diagnostic global.
4. Effectuer la mise à jour Koha.

## Après la mise à jour

Ouvrir **Maintenance**. Pimp My Koha compare la version Koha, la configuration, les prérequis, les états de santé et les erreurs d’initialisation. Seuls les modules dont l’état a réellement changé sont mis en avant.

L’absence de changement détectable n’est pas une preuve métier : les modules nécessitant une action réelle conservent le statut **Action à exercer** jusqu’à passage sur leur page de test.

## Confidentialité du diagnostic

L’export de diagnostic ne contient pas les valeurs de configuration (clés Firebase, carte lecteur, contacts, etc.). Il exporte les identifiants de modules, états, versions, temps d’initialisation et diagnostics techniques nettoyés.


La V3.43 ajoute le contrôle d’accès Pimp My Koha et les canaux GitHub Stable / Canary / Dev sans modifier la procédure de maintenance avant/après mise à jour Koha.
