# Pimp My Koha 3.44.0 — état local consolidé

## Statut

**PRÉ-PRODUCTION — tests locaux OK. Validation réelle sur sandbox Koha encore requise.**

Cette copie consolide le lot 3.44 préparé précédemment et les corrections issues de l’audit des parcours utilisateurs. Elle n’a pas encore été commitée sur GitHub.

## Parcours retenus

- **Agent** : utilise uniquement les améliorations et applications auxquelles ses droits Koha donnent accès. Il n’accède pas à la configuration globale de Pimp My Koha.
- **Administrateur** : active, prépare, règle et enregistre les modules de l’établissement. Il dispose des tests et validations sans jargon de développement.
- **Développeur / mainteneur** : dispose en plus de la migration, du test local, des informations techniques et des outils DEV.
- Le rôle `manager` reste disponible dans le moteur mais n’est pas présenté comme un parcours standard en 3.44.0.

## Changements consolidés

- Modules normaux et migration des anciens scripts séparés.
- Applications natives soumises à validation/certification sur une nouvelle installation.
- Point d’entrée **Pimp My Koha** protégé contre une désactivation accidentelle.
- Applications sensibles alignées sur les capacités Koha existantes.
- Menus masquant les outils bloqués ou non autorisés.
- Centre qualité filtré selon les droits ; informations techniques réservées à l’administration/développement selon le contexte.
- Restauration : accès à la restauration distinct des actions de circulation ; prêt/retour masqués et bloqués sans droit `circulate`.
- Première installation accessible par **Pimp My Koha → Administration → Préparer l’installation**, sans URL technique à connaître.
- Fiche module simplifiée : **Activer → Préparer → Régler → Enregistrer**.
- Anciens scripts sans remplaçant : décision explicite **Reprendre / Remplacer / Retirer volontairement**.
- Vocabulaire normal simplifié ; détails Firebase/Canary/empreintes/runtime réservés au mainteneur lorsque non nécessaires à l’administrateur.
- Export de validation contenant la configuration réellement testée et séparant les valeurs produit des valeurs propres à l’installation.
- Prérequis par fonction et par version de Koha.
- Restauration native Koha 26.05+ ; plugin UndeleteRecords limité au besoin de restauration des versions antérieures.
- Version du lot harmonisée en **3.44.0**.

## Tests locaux inclus

Les commandes suivantes doivent toutes être vertes :

```bash
node scripts/validate-dist.mjs
node scripts/test-channel-loader.mjs
node scripts/test-access-control.mjs
node scripts/test-prerequisite-gates.mjs
node scripts/test-fresh-install-certification.mjs
node scripts/test-certifier-promotion.mjs
node scripts/test-user-workflows.mjs
node scripts/test-fresh-install-native-gates.mjs
```

Les workflows GitHub CI et Release exécutent aussi les deux nouveaux tests de parcours et de verrouillage fresh-install.

## Ce qui reste avant Stable

1. Appliquer ce lot sur la vraie branche `hardening/prod-ready-3.44`.
2. Faire passer le CI GitHub sur la branche/PR réelle.
3. Tester sur sandbox Koha avec au minimum un compte **Agent**, un compte **Administrateur** et un compte **Développeur**.
4. Vérifier le parcours installation neuve et le parcours migration séparément.
5. Vérifier la restauration selon la matrice : Koha 25.11 avec/sans plugin, puis Koha 26.05+ avec permission native et cas de refus 403.
6. Traiter l’avertissement de licence avant une publication publique.

Aucun autre chantier de refonte n’est requis pour la 3.44.0 sauf bug ou blocage réellement observé pendant ces tests.
