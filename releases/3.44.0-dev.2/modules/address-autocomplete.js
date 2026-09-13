(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='address-autocomplete',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['070-address-autocomplete-memberentry.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 070-address-autocomplete-memberentry.js ===== */
/*
 Nom du fichier: 070-address-autocomplete-memberentry.js
 Dépendances: KOHA_UTILS.waitFor (fallback included), fetch
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Autocomplétion d'adresse sur `memberentry.pl` via api-adresse.data.gouv.fr.
*/

(function(){
  'use strict';
  try{
    (function(){})('070-address-autocomplete-memberentry: loaded');

    if (!window.location.pathname || !window.location.pathname.endsWith('memberentry.pl')) return;

    const waitFor = (selector, timeout) => {
      if (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitFor === 'function') return window.KOHA_UTILS.waitFor(selector, timeout);
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => {
          const found = document.querySelector(selector);
          if (found) { obs.disconnect(); resolve(found); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeout || 3000);
      });
    };

    waitFor('input[name="address"]', 4000).then(function(addressInput){
      try{
        if (!addressInput || !addressInput.parentNode) return;
        const zipcodeInput = document.getElementById('zipcode');
        const cityInput = document.getElementById('city');

        let autocompleteList = addressInput.parentNode.querySelector('.autocomplete-suggestions');
        if (!autocompleteList) {
          autocompleteList = document.createElement('div');
          autocompleteList.classList.add('autocomplete-suggestions');
          addressInput.parentNode.appendChild(autocompleteList);
        }

        let debounceTimer = null;
        addressInput.addEventListener('input', function(){
          clearTimeout(debounceTimer);
          const query = (this.value || '').trim();
          const minChars = Math.max(1, Number(CFG?.service?.minimumCharacters ?? 1));
          if (!query || query.length < minChars) { autocompleteList.innerHTML = ''; return; }
          debounceTimer = setTimeout(function(){
            const endpoint = String(CFG?.service?.endpoint || 'https://api-adresse.data.gouv.fr/search/');
            const sep = endpoint.includes('?') ? '&' : '?';
            const url = endpoint + sep + 'q=' + encodeURIComponent(query);
            fetch(url).then(r=>r.json()).then(data=>{
              autocompleteList.innerHTML = '';
              (data.features || []).slice(0, Math.max(1, Number(CFG?.service?.maximumSuggestions ?? 10))).forEach(function(feature){
                try{
                  const item = document.createElement('div');
                  item.textContent = feature.properties && feature.properties.label ? feature.properties.label : '';
                  item.addEventListener('click', function(){
                    const address = feature.properties && feature.properties.name ? feature.properties.name : '';
                    const city = feature.properties && feature.properties.city ? feature.properties.city : '';
                    const postcode = feature.properties && feature.properties.postcode ? feature.properties.postcode : '';
                    addressInput.value = address;
                    if (cityInput) cityInput.value = city;
                    if (zipcodeInput) zipcodeInput.value = postcode;
                    autocompleteList.innerHTML = '';
                  });
                  autocompleteList.appendChild(item);
                }catch(e){ /* per-item ignore */ }
              });
            }).catch(function(){ /* ignore network errors */ });
          }, Math.max(0, Number(CFG?.service?.debounceMs ?? 250)));
        });

        document.addEventListener('click', function(e){
          if (e.target !== addressInput) autocompleteList.innerHTML = '';
        });
      }catch(e){ (function(){})('070: init error', e); }
    }).catch(function(){ /* no address field found */ });

  }catch(err){ (function(){})('070-address-autocomplete-memberentry: failed', err); }
})();


},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();