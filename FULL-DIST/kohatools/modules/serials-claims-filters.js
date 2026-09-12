(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='serials-claims-filters',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['074-claims-filtering.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;
/*
 Nom du fichier: 074-claims-filtering.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Ajoute des filtres pour la page `claims.pl` (retards / réclamés).
*/

(function(){
  'use strict';
  try{
    (function(){})('074-claims-filtering: loaded');
    if (!window.location.pathname || !window.location.pathname.includes('claims.pl')) return;

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

    waitFor('#claims_form', 3000).then(function(form){
      try{
        const claimFilters = Array.isArray(CFG?.filters?.statuses) && CFG.filters.statuses.length
          ? CFG.filters.statuses.filter(x => x && String(x.status || '').trim())
          : [
              {status:'Retard',buttonLabel:'Afficher uniquement les retards'},
              {status:'Réclamé',buttonLabel:'Afficher uniquement les réclamés'}
            ];
        const resetLabel = String(CFG?.filters?.resetLabel || 'Afficher le tableau complet');
        const buttons = [];

        function filterTable(status) {
          const table = document.getElementById('claimst');
          if (!table) return;
          const rows = table.getElementsByTagName('tr');
          if (!rows || rows.length === 0) return;
          var statutIndex = -1;
          var headers = rows[0].getElementsByTagName('th');
          for (var i = 0; i < headers.length; i++) {
            if (headers[i].textContent && headers[i].textContent.trim() === 'Statut') { statutIndex = i; break; }
          }
          if (statutIndex === -1) return;
          for (var r = 1; r < rows.length; r++) {
            var cells = rows[r].getElementsByTagName('td');
            if (!cells[statutIndex]) { rows[r].style.display = ''; continue; }
            rows[r].style.display = !status || cells[statutIndex].textContent.includes(String(status)) ? '' : 'none';
          }
        }

        claimFilters.forEach(function(filter) {
          const button = document.createElement('button');
          const normalLabel = String(filter.buttonLabel || ('Afficher uniquement : ' + filter.status));
          button.type = 'button';
          button.textContent = normalLabel;
          button.dataset.normalLabel = normalLabel;
          button.dataset.claimStatus = String(filter.status);
          button.dataset.active = '0';
          button.addEventListener('click', function() {
            const wasActive = button.dataset.active === '1';
            buttons.forEach(function(other) {
              other.dataset.active = '0';
              other.textContent = other.dataset.normalLabel || '';
            });
            if (wasActive) {
              filterTable('');
              return;
            }
            button.dataset.active = '1';
            button.textContent = resetLabel;
            filterTable(filter.status);
          });
          buttons.push(button);
        });

        if (form && form.parentNode) {
          buttons.slice().reverse().forEach(function(button) { form.parentNode.insertBefore(button, form); });
        }
      }catch(e){ (function(){})('074: init error', e); }
    }).catch(()=>{/* no form - skip */});

  }catch(e){ (function(){})('074-claims-filtering: failed', e); }
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();