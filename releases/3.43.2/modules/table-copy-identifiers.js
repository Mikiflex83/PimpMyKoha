(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='table-copy-identifiers',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Copie en masse codes-barres/biblionumbers depuis plusieurs tables Koha.',
 sourceFiles:['115-copy-cb.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 115-copy-cb.js ===== */
(function ($) {
    'use strict';
    
    const path = window.location.pathname;
    // Liste globale des pages autorisées
    if (!path && !(path.includes('returns.pl') || path.includes('moremember.pl') || path.includes('circulation.pl') || path.includes('batchMod.pl') || path.includes('itemsearch.pl'))) return;

    // Configuration dynamique des tables selon la page courante
    let tableId = '';
    if (path.includes('returns.pl')) {
        tableId = '#checkedintable';
    } else if (path.includes('moremember.pl') || path.includes('circulation.pl')) {
        tableId = '#issues-table';
    } else if (path.includes('batchMod.pl')) {
        tableId = '#itemst';
    } else if (path.includes('itemsearch.pl')) {
        tableId = '#item_search';
    }

    const wrapperSelector = `${tableId}_wrapper .dt-buttons`;

    function injectButtons() {
        const $targetContainer = $(wrapperSelector);
        if (!$targetContainer.length) return;

        const isPageItemSearch = path.includes('itemsearch.pl');

        // 1. INJECTION DU BOUTON PRINCIPAL (Codes-barres ou Biblionumbers sur itemsearch)
        if (!$('#btn-copy-all-barcodes').length) {
            const $btn = $('<button>', {
                id: 'btn-copy-all-barcodes',
                class: 'dt-button copyConditions_controls',
                tabindex: '0',
                'aria-controls': tableId.replace('#', ''),
                type: 'button',
                title: isPageItemSearch ? 'Copier tous les biblionumbers affichés' : 'Copier tous les codes-barres affichés',
                html: `<span><i class="fa fa-lg fa-copy"></i> <span class="dt-button-text">${isPageItemSearch ? 'Copier les biblionumbers' : 'Copier les codes-barres'}</span></span>`
            });

            $btn.on('click', function (e) {
                e.preventDefault();
                executeCopyLogic('primary');
            });

            $targetContainer.append($btn);
        }

        // 2. INJECTION DU DEUXIÈME BOUTON (Uniquement sur itemsearch.pl pour les codes-barres)
        if (isPageItemSearch && !$('#btn-copy-itemsearch-barcodes').length) {
            const $btnBarcode = $('<button>', {
                id: 'btn-copy-itemsearch-barcodes',
                class: 'dt-button copyConditions_controls',
                tabindex: '0',
                'aria-controls': 'item_search',
                type: 'button',
                title: 'Copier tous les codes-barres affichés',
                html: '<span><i class="fa fa-lg fa-copy"></i> <span class="dt-button-text">Copier les codes-barres</span></span>'
            });

            $btnBarcode.on('click', function (e) {
                e.preventDefault();
                executeCopyLogic('secondary-barcodes');
            });

            $targetContainer.append($btnBarcode);
        }
    }

    // Centralisation de la logique d'extraction et de copie
    function executeCopyLogic(mode) {
        const extractedData = [];
        const isPageItemSearch = path.includes('itemsearch.pl');

        if (tableId === '#checkedintable') {
            // Retours
            const $thBarcode = $('#checkedintable thead th.ci-barcode');
            if (!$thBarcode.length) return;
            const columnIndex = $thBarcode.index();
            $('#checkedintable tbody tr').each(function () {
                const $cell = $(this).children('td').eq(columnIndex);
                if ($cell.length && $cell.text().trim() && !$cell.hasClass('dataTables_empty')) {
                    extractedData.push($cell.text().trim());
                }
            });
        } 
        else if (tableId === '#itemst') {
            // Modif par lot
            let columnIndex = -1;
            $('#itemst thead th').each(function (index) {
                if ($(this).text().toLowerCase().includes('code barre')) {
                    columnIndex = index;
                    return false;
                }
            });
            if (columnIndex !== -1) {
                $('#itemst tbody tr').each(function () {
                    const $cell = $(this).children('td').eq(columnIndex);
                    if ($cell.length && $cell.text().trim() && !$cell.hasClass('dataTables_empty')) {
                        extractedData.push($cell.text().trim());
                    }
                });
            }
        } 
        else if (tableId === '#item_search') {
            if (mode === 'primary') {
                // Itemsearch : Extraction des Biblionumbers
                const ids = new Set();
                $('#item_search tbody a[href*="biblionumber="]').each(function () {
                    const href = $(this).attr('href') || '';
                    const m = href.match(/biblionumber=(\d+)/);
                    if (m && m[1]) ids.add(m[1]);
                });
                extractedData.push(...Array.from(ids));
            } else {
                // Itemsearch : Extraction des Codes-barres (Recherche dynamique de la colonne)
                let columnIndex = -1;
                $('#item_search thead th').each(function (index) {
                    if ($(this).text().toLowerCase().includes('code à barres')) {
                        columnIndex = index;
                        return false;
                    }
                });
                if (columnIndex !== -1) {
                    $('#item_search tbody tr').each(function () {
                        const $cell = $(this).children('td').eq(columnIndex);
                        if ($cell.length && $cell.text().trim() && !$cell.hasClass('dataTables_empty')) {
                            extractedData.push($cell.text().trim());
                        }
                    });
                }
            }
        }
        else {
            // Prêts et Fiche adhérent
            const $allLinks = $(`${tableId} tbody a[href*="/cgi-bin/koha/catalogue/moredetail.pl?biblionumber="]`);
            $allLinks.each(function () {
                const text = $(this).text().trim();
                if (text) extractedData.push(text);
            });
        }

        // Envoi vers le presse-papiers
        if (extractedData.length === 0) {
            showToast(isPageItemSearch && mode === 'primary' ? "Aucun biblionumber trouvé" : "Aucun code-barres trouvé", "warning");
            return;
        }

        const uniqueData = [...new Set(extractedData)];
        const textToCopy = uniqueData.join('\n');
        const successMsg = isPageItemSearch && mode === 'primary' ? `${uniqueData.length} biblionumber(s) copié(s) !` : `${uniqueData.length} code(s) à barres copié(s) !`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                showToast(successMsg, "success");
            }).catch(() => showToast("Erreur lors de la copie", "error"));
        } else {
            try {
                const ta = document.createElement('textarea');
                ta.value = textToCopy;
                ta.style.position = 'fixed'; ta.style.left = '-9999px';
                document.body.appendChild(ta); ta.select();
                document.execCommand('copy'); document.body.removeChild(ta);
                showToast(successMsg, "success");
            } catch (e) {
                showToast("Erreur lors de la copie", "error");
            }
        }
    }

    // Système de notification Toast
    function showToast(message, type) {
        let alertClass = "alert-success";
        if (type === "warning") alertClass = "alert-warning";
        if (type === "error") alertClass = "alert-danger";

        const $toast = $('<div>', {
            class: `alert ${alertClass}`,
            css: {
                position: 'fixed', top: '20px', right: '20px', zIndex: '9999',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'opacity 0.4s ease', fontWeight: 'bold'
            },
            html: message
        }).appendTo('body');

        setTimeout(() => {
            $toast.css('opacity', '0');
            setTimeout(() => $toast.remove(), 400);
        }, 2000);
    }

    // Exécution et surveillance
    injectButtons();
    const observer = new MutationObserver(function () {
        if ($(wrapperSelector).length) {
            injectButtons();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})(jQuery);

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