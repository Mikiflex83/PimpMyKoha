# Contrat d’indépendance des modules

Chaque module métier possède : une configuration canonique, un registrar propre, une source propre, ses prérequis et son lifecycle. Un module métier ne peut pas déclarer un autre module métier comme dépendance obligatoire.

Les seules dépendances communes autorisées sont des services transversaux sans logique métier : configuration, UI, ModuleHost, KohaAdapter, clipboard, dates, tables, scope/targets, diagnostics, Firebase adapter et prérequis.

En `fresh-install`, un module non autonome ou dont la source n’est pas vérifiée est `unsupported`/masqué ; il ne retombe jamais silencieusement sur le legacy.
