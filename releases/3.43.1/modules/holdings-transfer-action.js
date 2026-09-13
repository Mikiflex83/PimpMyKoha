(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='holdings-transfer-action',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Ajoute une action Transférer pour les exemplaires disponibles et préremplit branchtransfers.pl.',
 sourceFiles:['028-transfer-buttons-holdings.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 028-transfer-buttons-holdings.js ===== */
/*
 Nom du fichier: 028-transfer-buttons-holdings.js
 Dépendances: KOHA_UTILS.waitForSelector (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Ajoute des boutons "Transférer" dans la table des exemplaires et transmet le code-barres vers branchtransfers.pl
*/

(function(){
  function localWaitForSelector(selector, timeout = 3000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const obs = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) { obs.disconnect(); resolve(found); }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeout);
    });
  }

  const waitForSelector = (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitForSelector === 'function')
    ? window.KOHA_UTILS.waitForSelector
    : localWaitForSelector;

  (function(){})('028-transfer-buttons-holdings: loaded');

  // 1) branchtransfers.pl: si un code-barres a été stocké, l'insérer dans le champ prévu
  if (window.location.pathname.includes('/cgi-bin/koha/circ/branchtransfers.pl')) {
    const stored = localStorage.getItem('barretransfert');
    if (stored) {
      waitForSelector('#barcode', 1500).then(input => {
        try { input.value = stored; } catch (e) { /* noop */ }
      }).catch(() => {/* champ non trouvé */}).then(() => {
        try { localStorage.removeItem('barretransfert'); } catch (e) { /* noop */ }
      });
    }
    return;
  }

  (function(){})('028-transfer-buttons-holdings: not branchtransfers.pl, continuing');

  function getBarcodeFromRow(row) {
    if (!row) return '';
    const barcodeLink = row.querySelector('a[href*="#item"], a[href*="itemnumber="]');
    if (barcodeLink) return (barcodeLink.textContent || '').trim();

    const barcodeCell = row.querySelector('td.barcode, td.holdings_barcode, [headers="holdings_barcode"]');
    if (barcodeCell) return (barcodeCell.textContent || '').trim();

    return '';
  }

  function applyTransferButtons(table) {
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((row) => {
      const statusText = (row.querySelector('.status')?.textContent || row.textContent || '').trim();
      if (!/Disponible/i.test(statusText)) return;

      const btnGroup = row.querySelector('div.btn-group');
      if (!btnGroup) return;

      const barcode = getBarcodeFromRow(row);
      if (!barcode) return;

      if (btnGroup.querySelector('button[data-koha-transfer]')) return;

      if (!btnGroup.querySelector('[data-koha-transfer-spacer]')) {
        const spacer = document.createElement('span');
        spacer.setAttribute('data-koha-transfer-spacer', '1');
        spacer.style.display = 'block';
        spacer.style.height = '8px';
        btnGroup.appendChild(spacer);
      }

      const btn = document.createElement('button');
      btn.textContent = 'Transférer';
      btn.setAttribute('data-koha-transfer', '1');
      btn.className = 'btn btn-primary btn-xs';
      btn.style.marginTop = '4px';
      btnGroup.appendChild(btn);
    });
  }

  // Traiter la table des exemplaires
  waitForSelector('#holdings_table', 3000).then((table) => {
    if (!table) { (function(){})('028-transfer-buttons-holdings: #holdings_table not found'); return; }

    waitForSelector('#holdings_table tbody tr', 5000).then(() => {
      try {
        applyTransferButtons(table);

        if (!table.dataset.kohaTransferClickBound) {
          table.addEventListener('click', function(e) {
            const target = e.target;
            if (target.tagName === 'BUTTON' && target.getAttribute('data-koha-transfer')) {
              const row = target.closest('tr');
              const barcode = getBarcodeFromRow(row);
              if (!barcode) return;
              try { localStorage.setItem('barretransfert', barcode); } catch (e) { /* noop */ }
              window.location.href = '/cgi-bin/koha/circ/branchtransfers.pl';
            }
          });
          table.dataset.kohaTransferClickBound = '1';
        }

        const tbody = table.tBodies && table.tBodies[0];
        if (tbody && !tbody.dataset.kohaTransferObserved) {
          let rerunTimer = null;
          const obs = new MutationObserver(() => {
            if (rerunTimer) clearTimeout(rerunTimer);
            rerunTimer = setTimeout(() => applyTransferButtons(table), 120);
          });
          obs.observe(tbody, { childList: true, subtree: true });
          tbody.dataset.kohaTransferObserved = '1';
        }
      } catch (err) {
        (function(){})('028-transfer-buttons-holdings error:', err);
      }
    }).catch(() => {/* pas de lignes */});
  }).catch(() => { (function(){})('028-transfer-buttons-holdings: holdings_table not ready'); });

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