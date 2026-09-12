(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='renewal-enhancements',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Regroupe les améliorations de renouvellement 089 et 114 tout en conservant leurs comportements historiques.',
 sourceFiles:['089-renewal-column-enhancements.js', '114-renew-modif.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 089-renewal-column-enhancements.js ===== */
/*
 Nom du fichier: 089-renewal-column-enhancements.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Améliore l'affichage de la colonne de renouvellement et ajoute un bouton de simulation.
*/

(function(){
  'use strict';
  try{
    (function(){})('089-renewal-column-enhancements: loaded');
    if (!window.location.pathname || (!window.location.pathname.includes('/memberhistory.pl') && !window.location.pathname.includes('/returns.pl'))) return;

    const waitFor = (selector, timeout) => {
      if (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitFor === 'function') return window.KOHA_UTILS.waitFor(selector, timeout);
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => { const found = document.querySelector(selector); if (found) { obs.disconnect(); resolve(found); } });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeout || 3000);
      });
    };

    waitFor('table tr', 3000).then(() => {
      try{
        document.querySelectorAll('table tr').forEach(tr => {
          const renewCell = tr.querySelector('.renewcol');
          if (!renewCell) return;
          const txt = (renewCell.textContent||'').trim();
          if (txt === 'R' || (txt && txt.toLowerCase().includes('renouvelé'))) { renewCell.classList.add('label','label-success'); renewCell.title = 'Renouvellement détecté'; }
          else if (txt === 'N') { renewCell.classList.add('label','label-default'); renewCell.title = 'Non renouvelé'; }
        });

        const massRenewBtn = document.createElement('button'); massRenewBtn.className='btn btn-xs btn-primary'; massRenewBtn.textContent='Renouveler la sélection'; massRenewBtn.style.marginLeft='8px';
        const selOps = document.getElementById('selection_ops'); if (selOps) selOps.appendChild(massRenewBtn);

        massRenewBtn.addEventListener('click', function(){
          const checks = document.querySelectorAll('input[type=checkbox].loan-checkbox:checked');
          if (!checks.length) return alert('Sélectionnez des lignes à renouveler');
          checks.forEach(cb => {
            const tr = cb.closest('tr'); const renewCell = tr && tr.querySelector('.renewcol'); if (renewCell) { renewCell.textContent='R'; renewCell.classList.remove('label-default'); renewCell.classList.add('label','label-success'); }
          });
          alert('Renouvellements simulés (test)');
        });
      }catch(e){ (function(){})('089: processing failed', e); }
    }).catch(()=>{});

  }catch(e){ (function(){})('089-renewal-column-enhancements: failed', e); }
})();


/* ===== EXACT LEGACY SOURCE: 114-renew-modif.js ===== */
(function() {
    'use strict';

    let isProcessing = false;

    // Fonction pour trouver la colonne Renouveler
    function findRenewalColumn() {
        // Chercher l'en-tête de colonne "Renouveler"
        const headers = document.querySelectorAll('th, td');
        let columnIndex = -1;
        let table = null;

        for (const header of headers) {
            const text = header.textContent.trim().toLowerCase();
            if (text === 'renouveler' || text.includes('renouvel')) {
                // Trouver la table parente
                table = header.closest('table');
                if (table) {
                    // Trouver l'index de la colonne
                    const row = header.closest('tr');
                    if (row) {
                        const cells = row.querySelectorAll('th, td');
                        for (let i = 0; i < cells.length; i++) {
                            if (cells[i] === header) {
                                columnIndex = i;
                                break;
                            }
                        }
                    }
                    break;
                }
            }
        }

        return { table, columnIndex };
    }

    // Fonction pour améliorer l'affichage
    function improveRenewalDisplay() {
        if (isProcessing) return;
        isProcessing = true;

        try {
            const { table, columnIndex } = findRenewalColumn();
            
            // Si pas de colonne Renouveler trouvée, ne rien faire
            if (!table || columnIndex === -1) {
                (function(){})('Colonne "Renouveler" non trouvée');
                return;
            }

            // Parcourir toutes les lignes du tableau
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(function(row) {
                const cells = row.querySelectorAll('td');
                
                // Vérifier que la colonne existe
                if (cells.length <= columnIndex) return;
                
                const cell = cells[columnIndex];
                
                // Vérifier si déjà amélioré
                if (cell.classList.contains('renewal-improved')) return;
                
                // Chercher les éléments dans la cellule
                const spans = cell.querySelectorAll('span');
                let numberSpan = null;
                let checkbox = null;
                let disabledText = null;
                let infoText = null;
                
                spans.forEach(function(span) {
                    const text = span.textContent.trim();
                    // Détecter le numéro (juste un nombre)
                    if (/^\d+$/.test(text) && !span.className) {
                        numberSpan = span;
                    }
                    // Détecter la checkbox
                    if (span.querySelector('.renew')) {
                        checkbox = span.querySelector('.renew');
                    }
                    // Détecter "Non renouvelable"
                    if (span.classList.contains('renewals-disabled') || text.includes('Non renouvelable')) {
                        disabledText = span;
                    }
                    // Détecter les informations
                    if (span.classList.contains('renewals-info') || text.includes('renouvellement')) {
                        infoText = span;
                    }
                });

                // Si aucun élément de renouvellement trouvé, passer
                if (!numberSpan && !checkbox && !disabledText) return;

                // Marquer comme amélioré
                cell.classList.add('renewal-improved');

                // Extraire les informations
                const number = numberSpan ? numberSpan.textContent.trim() : '';
                const isRenewable = checkbox && checkbox.style.display !== 'none';
                const isDisabled = disabledText && disabledText.style.display !== 'none';
                
                // Extraire le nombre de renouvellements restants
                let remaining = 0;
                let total = 0;
                if (infoText) {
                    const info = infoText.textContent.trim();
                    const match = info.match(/(\d+)\s+renouvellement/i);
                    if (match) {
                        const parts = info.match(/Il reste (\d+) renouvellements? sur (\d+)/i);
                        if (parts) {
                            remaining = parseInt(parts[1]);
                            total = parseInt(parts[2]);
                        }
                    }
                }

                // Créer le nouveau conteneur
                const newContainer = document.createElement('div');
                newContainer.className = 'renewal-display-modern';

                // Ajouter le statut principal
                const statusWrapper = document.createElement('div');
                statusWrapper.className = 'renewal-status';

                if (isRenewable && checkbox) {
                    // Renouvellement possible
                    const statusText = document.createElement('span');
                    statusText.className = 'renewal-status-text';
                    
                    if (remaining > 0) {
                        statusText.innerHTML = `✅ Renouvellement possible`;
                        statusText.style.color = '#155724';
                    } else {
                        statusText.innerHTML = `⛔ Renouvellement impossible`;
                        statusText.style.color = '#721c24';
                    }
                    statusWrapper.appendChild(statusText);

                    // Afficher le nombre de renouvellements
                    if (total > 0) {
                        const countBadge = document.createElement('span');
                        countBadge.className = 'renewal-count-badge';
                        countBadge.textContent = `${remaining}/${total} renouvellements restants`;
                        statusWrapper.appendChild(countBadge);
                    }

                    // Ajouter la checkbox
                    const checkboxWrapper = document.createElement('label');
                    checkboxWrapper.className = 'renewal-checkbox-wrapper';
                    
                    const newCheckbox = document.createElement('input');
                    newCheckbox.type = 'checkbox';
                    newCheckbox.className = 'renew';
                    newCheckbox.id = checkbox.id || 'renew_' + Date.now();
                    newCheckbox.name = 'renew';
                    newCheckbox.value = checkbox.value || '';
                    if (checkbox.checked) {
                        newCheckbox.checked = true;
                    }
                    
                    const labelText = document.createElement('span');
                    labelText.textContent = 'Renouveler';
                    labelText.className = 'renewal-label';
                    
                    checkboxWrapper.appendChild(newCheckbox);
                    checkboxWrapper.appendChild(labelText);
                    statusWrapper.appendChild(checkboxWrapper);

                } else if (isDisabled) {
                    // Renouvellement non disponible
                    const statusText = document.createElement('span');
                    statusText.className = 'renewal-status-text disabled';
                    statusText.textContent = '🔒 Renouvellement impossible';
                    statusWrapper.appendChild(statusText);

                    if (total > 0) {
                        const countBadge = document.createElement('span');
                        countBadge.className = 'renewal-count-badge disabled';
                        countBadge.textContent = `0/${total} renouvellements restants`;
                        statusWrapper.appendChild(countBadge);
                    }
                }

                newContainer.appendChild(statusWrapper);
                
                // Remplacer le contenu de la cellule
                cell.innerHTML = '';
                cell.style.padding = '6px 8px';
                cell.appendChild(newContainer);
            });

        } finally {
            isProcessing = false;
        }
    }

    // Ajouter les styles CSS
    function addStyles() {
        if (document.getElementById('renewal-styles')) return;

        const style = document.createElement('style');
        style.id = 'renewal-styles';
        style.textContent = `
            .renewal-display-modern {
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding: 4px 8px;
                background: #f8f9fa;
                border-radius: 6px;
                border: 1px solid #e9ecef;
                transition: all 0.2s ease;
                font-size: 0.9em;
                min-width: 180px;
            }

            .renewal-display-modern:hover {
                background: #f1f3f5;
                border-color: #dee2e6;
            }

            .renewal-status {
                display: flex;
                flex-direction: column;
                gap: 4px;
                align-items: flex-start;
            }

            .renewal-status-text {
                font-weight: 600;
                font-size: 0.95em;
                padding: 2px 0;
            }

            .renewal-status-text.disabled {
                color: #721c24;
            }

            .renewal-count-badge {
                display: inline-block;
                padding: 2px 10px;
                background: #d4edda;
                color: #155724;
                border-radius: 12px;
                border: 1px solid #b7d7c2;
                font-size: 0.85em;
                font-weight: 500;
            }

            .renewal-count-badge.disabled {
                background: #f8d7da;
                color: #721c24;
                border-color: #f5c6cb;
            }

            .renewal-checkbox-wrapper {
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                padding: 2px 10px;
                background: #d4edda;
                border-radius: 14px;
                border: 1px solid #b7d7c2;
                transition: all 0.2s ease;
                margin-top: 2px;
            }

            .renewal-checkbox-wrapper:hover {
                background: #c3e6cb;
                border-color: #8fbfa0;
            }

            .renewal-checkbox-wrapper input[type="checkbox"] {
                width: 14px;
                height: 14px;
                cursor: pointer;
                accent-color: #28a745;
                margin: 0;
            }

            .renewal-label {
                font-weight: 500;
                color: #155724;
                font-size: 0.9em;
            }

            /* Animation */
            @keyframes fadeSlideIn {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .renewal-display-modern {
                animation: fadeSlideIn 0.3s ease-out;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .renewal-display-modern {
                    font-size: 0.8em;
                    min-width: 140px;
                    padding: 3px 6px;
                }
                .renewal-count-badge {
                    font-size: 0.8em;
                    padding: 1px 8px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Surveiller les changements dans le DOM
    function observeChanges() {
        const observer = new MutationObserver(function(mutations) {
            let shouldUpdate = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            // Vérifier si des éléments de tableau sont ajoutés
                            if (node.matches && (node.matches('table') || node.matches('tbody') || node.matches('tr'))) {
                                shouldUpdate = true;
                                break;
                            }
                            if (node.querySelectorAll) {
                                const tables = node.querySelectorAll('table');
                                if (tables.length > 0) {
                                    shouldUpdate = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (shouldUpdate) break;
            }
            
            if (shouldUpdate) {
                setTimeout(improveRenewalDisplay, 150);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        return observer;
    }

    // Fonction d'initialisation
    function init() {
        addStyles();
        
        // Attendre que le DOM soit complètement chargé
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(improveRenewalDisplay, 200);
                observeChanges();
            });
        } else {
            setTimeout(improveRenewalDisplay, 200);
            observeChanges();
        }
    }

    // Démarrer
    init();

    // Exposer la fonction pour un refresh manuel
    window.refreshRenewalDisplay = improveRenewalDisplay;

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