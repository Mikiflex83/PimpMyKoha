(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='course-list-ui',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Module canonique conservant exactement le comportement historique de 041+042-course-list-fields-labels.js.',
 sourceFiles:['041+042-course-list-fields-labels.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 041+042-course-list-fields-labels.js ===== */
/*
 Nom du fichier: 041+042-course-list-fields-labels.js
 Dépendances: jQuery (optionnel)
 Date de dernière modification: 2026-07-09
 Auteur: Michael Mundet (Optimisé Anti-boucle & Doublons)
 Description: Modifications UI pour les pages `course.pl`, `course-reserves.pl` et `course-details.pl`.
              Correction du bug de duplication "Nom de liste liste".
*/

(function() {
    'use strict';

    // --- VÉRIFICATION DE LA PAGE ---
    const currentPath = window.location.pathname;
    const isCoursePl = currentPath.includes('/course.pl');
    const isCourseReservesPl = currentPath.includes('/course-reserves.pl');
    const isCourseDetailsPl = currentPath.includes('/course-details.pl');

    if (!isCoursePl && !isCourseReservesPl && !isCourseDetailsPl) {
        return;
    }

    (function(){})('041+042-course-list-fields-labels: loaded for', currentPath);

    // Variable de contrôle pour empêcher la réentrance (boucle infinie)
    let isApplying = false;

    // --- CONFIGURATION GÉNÉRIQUE DES REMPLACEMENTS ---
    // /!\ L'ordre ici est TRÈS important : les expressions longues d'abord, les mots courts ensuite.
    const GENERIC_REPLACEMENTS = [
        { search: 'Suppression par lot des réserves de cours', replace: 'Suppression par lot de listes' },
        { search: 'Nouveau cours', replace: 'Nouvelle liste' },
        { search: 'nouveau cours', replace: 'nouvelle liste' },
        { search: 'Créer un cours', replace: 'Créer une liste' },
        { search: 'créer un cours', replace: 'créer une liste' },
        { search: 'Numéro de cours', replace: 'Numéro de liste' },
        { search: 'numéro de cours', replace: 'numéro de liste' },
        { search: 'Enseignants :', replace: '' },
        { search: 'Enseignants', replace: 'Responsable(s)' },
        { search: 'enseignants', replace: 'responsable(s)' },
        { search: 'Département', replace: 'Pôle' },
        { search: 'département', replace: 'pôle' },
        { search: 'Terme', replace: 'Type de liste' },
        { search: 'terme', replace: 'type de liste' },
        { search: 'Cours', replace: 'Listes d\'exemplaires' },
        { search: 'cours', replace: 'listes d\'exemplaires' },
        // Remplacements stricts pour éviter "Nom de liste liste"
        { search: 'Nom du cours', replace: 'Nom de la liste' },
        { search: 'nom du cours', replace: 'nom de la liste' },
        { search: ' Nom ', replace: ' Nom liste ' },
        { search: ' nom ', replace: ' nom liste ' }
    ];

    // --- CONFIGURATION SPÉCIFIQUE PAR PAGE ---
    const CONFIG = {
        coursePl: {
            LABELS: {
                'label[for="department"]': 'Pôle :',
                'label[for="course_name"]': 'Nom de la liste :',
                'label[for="term"]': 'Type de liste :',
                'label[for="course_number"]': 'Date de fin liste :',
                'label[for="find_instructor"]': 'Rechercher responsable liste :',
            },
            FIELDS_TO_HIDE: {
                'students_count': 'Site de provenance',
                'section': 'Date de création / Date de fin'
            },
            PLACEHOLDERS: {
                '#course_number': 'Date de fin liste',
                '#section': 'Date de création / Date de fin',
                '#course_name': 'Nom de la liste',
                '#students_count': 'Site de provenance',
                '#find_instructor': 'Responsable liste'
            }
        },
        courseDetailsPl: {
            LABELS: {
                'label[for="department"]': 'Pôle :',
                'label[for="course_name"]': 'Nom de la liste :',
                'label[for="term"]': 'Type de liste :',
                'label[for="course_number"]': 'Date de fin liste :',
            }
        }
    };

    // --- FONCTION POUR REMPLACER TOUS LES TEXTES DANS LA PAGE ---
    function replaceAllTexts(replacements) {
        try {
            let modifiedCount = 0;
            
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        if (node.parentElement.tagName === 'SCRIPT' || 
                            node.parentElement.tagName === 'STYLE' ||
                            node.parentElement.tagName === 'NOSCRIPT' ||
                            node.parentElement.hasAttribute('data-js-processed')) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );

            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }

            textNodes.forEach(textNode => {
                let originalText = textNode.textContent;
                let newText = originalText;
                let hasChanges = false;

                replacements.forEach(({ search, replace }) => {
                    if (newText.includes(search)) {
                        newText = newText.split(search).join(replace);
                        hasChanges = true;
                    }
                });

                if (hasChanges && newText !== originalText) {
                    textNode.textContent = newText;
                    textNode.parentElement.setAttribute('data-js-processed', 'true');
                    modifiedCount++;
                }
            });

            // Remplacements dans les attributs
            const elementsWithAttributes = document.querySelectorAll('[aria-label]:not([data-js-processed]), [title]:not([data-js-processed]), [placeholder]:not([data-js-processed])');
            elementsWithAttributes.forEach(el => {
                ['aria-label', 'title', 'placeholder'].forEach(attr => {
                    if (el.hasAttribute(attr)) {
                        let value = el.getAttribute(attr);
                        let hasChanges = false;
                        replacements.forEach(({ search, replace }) => {
                            if (value.includes(search)) {
                                value = value.split(search).join(replace);
                                hasChanges = true;
                            }
                        });
                        if (hasChanges) {
                            el.setAttribute(attr, value);
                            el.setAttribute('data-js-processed', 'true');
                            modifiedCount++;
                        }
                    }
                });
            });

            return modifiedCount;
        } catch (err) {
            (function(){})('Erreur lors du remplacement des textes:', err);
            return 0;
        }
    }

    // --- FONCTION POUR APPLIQUER LES MODIFICATIONS SPÉCIFIQUES ---
    function applySpecificModifications(config) {
        try {
            const $ = window.jQuery;

            if (config.LABELS) {
                Object.entries(config.LABELS).forEach(([selector, newText]) => {
                    const el = document.querySelector(selector);
                    if (el && el.textContent !== newText) {
                        el.textContent = newText;
                        el.setAttribute('data-js-processed', 'true');
                    }
                });
            }

            if (config.FIELDS_TO_HIDE) {
                Object.entries(config.FIELDS_TO_HIDE).forEach(([id, placeholder]) => {
                    const input = document.getElementById(id);
                    const label = document.querySelector(`label[for="${id}"]`);
                    if (input) {
                        input.style.display = 'none';
                        if (placeholder) input.placeholder = placeholder;
                        input.setAttribute('data-js-processed', 'true');
                    }
                    if (label) {
                        label.style.display = 'none';
                        label.setAttribute('data-js-processed', 'true');
                    }
                });
            }

            if (config.PLACEHOLDERS) {
                Object.entries(config.PLACEHOLDERS).forEach(([selector, placeholderText]) => {
                    if ($) {
                        $(selector).attr('placeholder', placeholderText).css('display', 'block').attr('data-js-processed', 'true');
                    } else {
                        const el = document.querySelector(selector);
                        if (el) {
                            el.placeholder = placeholderText;
                            el.style.display = 'block';
                            el.setAttribute('data-js-processed', 'true');
                        }
                    }
                });
            }
        } catch (err) {
            (function(){})('Erreur lors des modifications spécifiques:', err);
        }
    }

    // --- FONCTION PRINCIPALE AVEC SÉCURITÉ ANTI-REENTRANCE ---
    function applyAllModifications(maxAttempts = 15, delay = 300) {
        if (isApplying) return;
        isApplying = true;

        let attempts = 0;
        let modifiedCount = 0;

        function apply() {
            attempts++;
            let success = true;

            try {
                const count = replaceAllTexts(GENERIC_REPLACEMENTS);
                modifiedCount += count;

                if (isCoursePl) {
                    applySpecificModifications(CONFIG.coursePl);
                    if (!document.querySelector("form[action*='/cgi-bin/koha/course_reserves/mod_course.pl']")) {
                        success = false;
                    }
                } else if (isCourseDetailsPl) {
                    applySpecificModifications(CONFIG.courseDetailsPl);
                    if (!document.querySelector('.page-section')) {
                        success = false;
                    }
                } else if (isCourseReservesPl) {
                    if (!document.querySelector('#course_reserves_table')) {
                        success = false;
                    }
                }

            } catch (err) {
                (function(){})('Erreur lors de l\'application:', err);
                success = false;
            }

            if (!success && attempts < maxAttempts) {
                setTimeout(apply, delay);
            } else {
                isApplying = false;
            }
        }

        apply();
    }

    // --- LANCEMENT INITIAL ---
    applyAllModifications();

    // --- MUTATION OBSERVER ---
    const observer = new MutationObserver((mutations) => {
        if (isApplying) return;

        let needsUpdate = false;
        
        for (let mutation of mutations) {
            if (mutation.target.nodeType === 1 && mutation.target.hasAttribute('data-js-processed')) {
                continue;
            }

            const walker = document.createTreeWalker(
                mutation.target,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        if (node.parentElement.tagName === 'SCRIPT' || 
                            node.parentElement.tagName === 'STYLE' || 
                            node.parentElement.hasAttribute('data-js-processed')) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );

            let node;
            while (node = walker.nextNode()) {
                const text = node.textContent;
                if (GENERIC_REPLACEMENTS.some(({ search }) => text.includes(search))) {
                    needsUpdate = true;
                    break;
                }
            }
            if (needsUpdate) break;
        }

        if (needsUpdate) {
            applyAllModifications(5, 300);
        }
    });

    setTimeout(() => {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }, 1500);

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