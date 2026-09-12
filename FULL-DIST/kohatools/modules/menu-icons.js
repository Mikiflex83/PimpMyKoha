(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='menu-icons',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Icônes des menus latéraux Koha.',
 sourceFiles:['117-icons-menus.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 117-icons-menus.js ===== */
/*
 Nom du fichier: koha-global-sidebar-icons.js
 Dépendances: Font Awesome (CSS/fonts) attendu sur la page
 Date de dernière modification: 2026-07-09
 Auteur: Michael Mundet / Refactoring Global
 Description: Script unique pour ajouter ou corriger les icônes Font Awesome de TOUS les menus 
              latéraux de Koha (.sidebar_menu) selon le texte des liens.
*/

(function(){
    document.addEventListener('DOMContentLoaded', function(){

        // Récupère TOUS les menus latéraux présents sur la page courante
        const sidebarMenus = document.querySelectorAll(".sidebar_menu");

        // Si aucun menu latéral n'est trouvé sur cette page, on s'arrête là
        if (sidebarMenus.length === 0) return;

        // Dictionnaire global unifié
        const iconMap = {
            // --- Accueil et Liens Généraux ---
            "Accueil Outils": "fas fa-home",
            "Page d'accueil Acquisitions": "fas fa-shopping-cart",

            // --- Menu Adhérents & Fiche Utilisateur ---
            "Prêter": "fas fa-book",
            "Prêt par lot": "fas fa-layer-group",
            "Détails": "fas fa-info-circle",
            "Comptabilité": "fas fa-dollar-sign",
            "Historique de prêts": "fas fa-history",
            "Historique des réservations": "fas fa-clock",
            "Log des modifications": "fas fa-edit",
            "Notifications": "fas fa-bell",
            "Statistiques": "fas fa-chart-bar",
            "Fichiers": "fas fa-folder",
            "Suggestions d'achat": "fas fa-lightbulb",
            "Suggestions": "fas fa-lightbulb",
            "Listes d'adhérents": "fas fa-users-cog",
            "Clubs d'adhérents": "fas fa-puzzle-piece",
            "Commentaires": "fas fa-comments",
            "Importer des adhérents": "fas fa-user-plus",
            "Notifications et tickets": "fas fa-envelope-open-text",
            "Paramétrage des relances": "fas fa-exclamation-circle",
            "Créateur de cartes d'adhérent": "fas fa-id-badge",
            "Suppression et anonymisation des adhérents par lot": "fas fa-user-slash",
            "Modification d'adhérents par lot": "fas fa-user-edit",
            "Catégories d'adhérents": "fas fa-address-card",
            "Types d'attributs d'adhérent": "fas fa-id-card",
            "Types de suspension d'adhérent": "fas fa-ban",

            // --- Circulation & Libre service ---
            "Circulation en libre accès (SIP2)": "fas fa-exchange-alt",
            "Rendre": "fas fa-arrow-left",
            "Renouveler": "fas fa-redo",
            "Choisir un site": "fas fa-map-marker-alt",
            "Catalogage rapide": "fas fa-bolt",
            "Modification des dates de retour par lot": "fas fa-calendar-minus",
            "Modifier en lot des réservations": "fas fa-calendar-alt",
            "Collections tournantes": "fas fa-sync",
            "Règles de circulation et de pénalités": "fas fa-gavel",
            "Limites de transfert réseau": "fas fa-exchange-alt",
            "Matrice des coûts de transport": "fas fa-money-bill-alt",
            "Alertes de circulation": "fas fa-bell",
            "Collecte sur rendez-vous": "fas fa-calendar-check",

            // --- Réservations ---
            "File de réservations": "fas fa-list-ol",
            "Réservations à traiter": "fas fa-bookmark",
            "Réservations mises de coté": "fas fa-archive",
            "Ratios de réservation": "fas fa-percentage",

            // --- Transferts ---
            "Transférer": "fas fa-random",
            "Transferts à envoyer": "fas fa-paper-plane",
            "Transferts à recevoir": "fas fa-download",

            // --- Retards ---
            "Retards avec amendes": "fas fa-exclamation-triangle",
            "Retards": "fas fa-clock",

            // --- Périodiques ---
            "Réclamations": "fas fa-exclamation-circle",
            "Vérifier l'expiration": "fas fa-calendar-times",
            "Gestion des périodicités": "fas fa-hourglass-half",
            "Gestion des modèles de numérotation": "fas fa-list-ol",
            "Rechercher dans Mana-KB": "fas fa-search-plus",
            "Gestion des champs des abonnements": "fas fa-sliders-h",
            "Assistant statistiques sur les périodiques": "fas fa-chart-line",

            // --- Acquisitions ---
            "Commandes en retard": "fas fa-hourglass-start",
            "Factures": "fas fa-file-invoice-dollar",
            "Messages EDIFACT": "fas fa-exchange-alt",
            "Assistant statistiques Acquisitions": "fas fa-chart-bar",
            "Commandes par poste budgétaire": "fas fa-chart-pie",
            "Monnaies": "fas fa-coins",
            "Gérer les champs des factures": "fas fa-file-invoice",
            "Gérer les champs des paniers de commandes": "fas fa-shopping-basket",
            "Gérer les champs des lignes de commandes": "fas fa-list-ul",

            // --- Rapports Guidés ---
            "Rapports sauvegardés": "fas fa-save",
            "Voir dictionnaire": "fas fa-book",
            "Bibliothèque de rapports Koha": "fas fa-code-branch",
            "Schéma de la base de données Koha": "fas fa-database",

            // --- Administration : Catalogue & Grilles MARC ---
            "Grille des notices bibliographiques MARC": "fas fa-th-list",
            "Test de grille de catalogage bibliagement MARC": "fas fa-vial",
            "Grilles des notices d'autorité": "fas fa-user-shield",
            "Liens Koha => MARC": "fas fa-link",
            "Configuration de la classification": "fas fa-folder-tree",
            "Règles de concordance": "fas fa-compress-arrows-alt",
            "Sources de notices": "fas fa-search-plus",
            "Règles de fusion de notices": "fas fa-clone",
            "Configuration des Sets OAI": "fas fa-cubes",
            "Champs de recherche des exemplaires": "fas fa-search",
            "Configuration du moteur de recherche (Elasticsearch)": "fas fa-search",
            "Normal": "fas fa-book",
            "MARC": "fas fa-database",
            "Marc avec étiquettes": "fas fa-tags",
            "Exemplaires": "fas fa-copy",
            "Rotation des stocks": "fas fa-sync-alt",
            "Rotation": "fas fa-sync-alt",
            "Modifications d'exemplaires par ancienneté": "fas fa-history",
            
            // Imports / Exports catalogue
            "Import des notices dans le réservoir": "fas fa-upload",
            "Gérer les notices importées dans le réservoir": "fas fa-tasks",
            "Télécharger des notices dans le réservoir": "fas fa-upload",
            "Gestion des notices téléchargées": "fas fa-tasks",
            "Exporter les données du catalogue": "fas fa-download",
            
            // Modifications par lot catalogue
            "Modification d'exemplaires par lots": "fas fa-edit",
            "Suppression d'exemplaires par lots": "fas fa-trash",
            "Modification de notices par lot": "fas fa-edit",
            "Suppression de notices en lot": "fas fa-trash",
            "Suppression de notices par lot": "fas fa-trash",
            "Modèles de transformation MARC": "fas fa-sliders-h",
            "Mots-clés": "fas fa-tags",

            // Rapports globaux
            "Inventaire/Récolement": "fas fa-clipboard-list",
            "Inventaire": "fas fa-clipboard-list",
            "Récolement": "fas fa-clipboard-list",
            "Problèmes de catalogage": "fas fa-exclamation-circle",

            // --- Administration : Paramètres de Base & Comptabilité ---
            "Préférences système": "fas fa-cog",
            "Préférences": "fas fa-cog",
            "Bibliothèques": "fas fa-building",
            "Groupes de bibliothèques": "fas fa-warehouse",
            "Types de document": "fas fa-file-alt",
            "Valeurs autorisées": "fas fa-check-square",
            "Types de débit": "fas fa-money-check-alt",
            "Types de crédit": "fas fa-credit-card",
            "Villes et communes": "fas fa-map-marker-alt",

            // --- Administration : Paramètres Acquisitions ---
            "Devises et taux de change": "fas fa-money-bill-wave",
            "Budgets": "fas fa-wallet",
            "Postes budgétaires": "fas fa-chart-pie",
            "Comptes EDI": "fas fa-laptop-code",
            "EAN des bibliothèques": "fas fa-barcode",

            // --- Administration : Paramètres divers ---
            "Fournisseurs d'identité": "fas fa-id-card-alt",
            "Serveurs Z39.50/SRU": "fas fa-server",
            "Entrepôts OAI": "fas fa-archive",
            "Serveurs SMTP": "fas fa-server",
            "Transferts de fichiers": "fas fa-file-export",
            "Voulez-vous dire ?": "fas fa-question-circle",
            "Configurer les colonnes": "fas fa-columns",
            "Alertes sonores": "fas fa-volume-up",
            "Partager vos statistiques d'utilisation": "fas fa-chart-line",
            "Partager du contenu avec Mana KB": "fas fa-cloud-upload-alt",
            "Champs supplémentaires": "fas fa-plus-square",
            "Raccourcis clavier": "fas fa-keyboard",

            // --- Outils & Plugins & Tâches ---
            "Créateur d'étiquettes rapide": "fas fa-tags",
            "Créateur d'étiquettes": "fas fa-tag",
            "Générateur d'images de codes à barres": "fas fa-barcode",
            "Téléverser une image de couverture locale": "fas fa-image",
            "Calendrier": "fas fa-calendar-alt",
            "profils CSV": "fas fa-file-csv",
            "Visualiseur des logs": "fas fa-history",
            "Annonces": "fas fa-bullhorn",
            "Personnalisations HTML": "fas fa-code",
            "Pages": "fas fa-file-code",
            "Éditeur de citations": "fas fa-quote-left",
            "Outil de Plugins": "fas fa-plug",
            "Plugins": "fas fa-plug",
            "Téléchargements": "fas fa-download",
            "Accès aux fichiers": "fas fa-folder-open",
            "Tâches": "fas fa-tasks",
            "Acquisitions": "fas fa-shopping-cart",
            "Administration": "fas fa-cog",
            "Configuration": "fas fa-cogs",
            "Contrôle des autorités": "fas fa-user-shield",
            "Autorités": "fa fa-fw fa-link",
            "Catalogage": "fas fa-book-open",
            "Circulation": "fas fa-exchange-alt",
            "Contenu enrichi": "fas fa-star",
            "Gestion des ressources électroniques": "fas fa-file-alt",
            "Internationalisation": "fas fa-globe",
            "Prêt entre bibliothèques": "fas fa-external-link-alt",
            "Usage local": "fas fa-home",
            "Logs": "fas fa-file-archive",
            "Catalogue Public en Ligne (OPAC)": "fas fa-book-reader",
            "Adhérents": "fas fa-users",
            "Conservation": "fas fa-shield-alt",
            "Recherche": "fas fa-search",
            "Périodiques": "fas fa-newspaper",
            "Interface professionnelle": "fas fa-desktop",
            "Outils": "fas fa-tools",
            "Services web": "fas fa-plug",

            // --- Icône par défaut ---
            "default": "fas fa-thumbtack"
        };

        // On parcourt chaque menu trouvé sur la page
        sidebarMenus.forEach(menu => {
            
            // On extrait et traite directement les liens <a> contenus dans ce menu
            menu.querySelectorAll("ul li a").forEach(link => {
                
                const linkText = link.textContent.trim();
                let existingIcon = link.querySelector("i");
                
                // Si une icône personnalisée existe déjà (autre qu'une punaise), on la laisse intacte
                if (existingIcon && !existingIcon.classList.contains("fa-thumbtack")) return;

                let found = false;
                let targetClass = iconMap["default"];
                
                // Recherche textuelle exacte ou partielle dans le dictionnaire unifié
                for (const [key, className] of Object.entries(iconMap)) {
                    if (key !== "default" && linkText.includes(key)) {
                        targetClass = className;
                        found = true;
                        break;
                    }
                }

                // Si on a trouvé une icône spécifique et qu'une punaise existait, on met à jour sa classe
                if (found && existingIcon) {
                    existingIcon.className = targetClass;
                } 
                // Sinon, si aucune icône n'existait du tout, on l'injecte proprement
                else if (!existingIcon) {
                    const icon = document.createElement("i");
                    icon.className = targetClass;
                    icon.style.marginRight = "8px";
                    link.prepend(icon);
                }
            });
        });
    });
})();

 },
 destroy:function(){return false;},
 onConfigChange:function(){return {reloadRequired:true};}
};
KT.registerModule(runtime);
if(CFG.mode==="shadow"){
 KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});
 return;
}
runtime.init();
})();