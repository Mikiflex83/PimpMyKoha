(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='searchbar-tools',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['036-clear-search-when-barcode.js', '053-searchbar-clear-button.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 036-clear-search-when-barcode.js ===== */
/*
 Nom du fichier: 036-clear-search-when-barcode.js
 Dépendances: KOHA_UTILS.waitForSelector (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Si un code-barres est dans `localStorage.searchbox_value`, vide le champ de recherche.
*/

(function(){
  function localWaitForSelector(selector, timeout = 2000) {
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

  try {
    const searchBoxValue = localStorage.getItem('searchbox_value');
    if (searchBoxValue !== null && /\d{5,}/.test(searchBoxValue)) {
      setTimeout(() => {
        const directSearchForm = document.getElementById('search-form');
        if (directSearchForm) {
          directSearchForm.value = '';
          return;
        }

        waitForSelector('#search-form', 1500).then(searchForm => {
          try { if (searchForm) searchForm.value = ''; } catch (e) { /* noop */ }
        }).catch(() => {/* not present */});
      }, 1500);
    }
  } catch (err) {
    (function(){})('036-clear-search-when-barcode error:', err);
  }

  (function(){})('036-clear-search-when-barcode: loaded');
})();

/* ===== EXACT LEGACY SOURCE: 053-searchbar-clear-button.js ===== */
/*
 Nom du fichier: 053-searchbar-clear-button.js
 Dépendances: none
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Ajoute un bouton 'Effacer' pour les champs de recherche.
*/

(function(){
  try {
    var inputElement = document.getElementById('search-form');
    if (!inputElement) { (function(){})('053-searchbar-clear-button: skipped (no #search-form)'); return; }

    var clearButton = document.createElement('button');
    clearButton.setAttribute('type', 'button');
    clearButton.textContent = 'Effacer';

    function updateButtonVisibility() {
      clearButton.style.display = (inputElement.value || '').trim() !== '' ? 'inline-block' : 'none';
    }

    clearButton.addEventListener('click', function () {
      inputElement.value = '';
      updateButtonVisibility();
      inputElement.focus();
    });

    inputElement.addEventListener('input', updateButtonVisibility);
    updateButtonVisibility();
    if (inputElement.parentElement) inputElement.parentElement.appendChild(clearButton);

    try { inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length); } catch(e) {}

    try {
      var searchInput = document.getElementById('search-form');
      if (searchInput && /^\d+$/.test(searchInput.value)) searchInput.value = '';
    } catch (e) { /* noop */ }
  } catch (err) {
    (function(){})('053-searchbar-clear-button error:', err);
  }

  (function(){})('053-searchbar-clear-button: loaded');
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();