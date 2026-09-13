(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='barcode-attention',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['068-blinking-barcode.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 068-blinking-barcode.js ===== */
//-----------------------------------------------------------------------------------------------------------------------------
// 068 - Blinking barcode highlights
// - concise startup marker
// - uses KOHA_UTILS.waitFor when available (MutationObserver fallback)
(function(){
  'use strict';
  try{
    (function(){})('068-blinking-barcode: loaded');

    const waitFor = (selector, timeout) => {
      if (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitFor === 'function') return window.KOHA_UTILS.waitFor(selector, timeout);
      // local fallback
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

    const path = window.location.pathname || '';

    // collect barcodes on item search/member pages
    if (path.endsWith('itemsearch.pl') || path.endsWith('moremember.pl')){
      waitFor('#item_table', Number(CFG?.timing?.itemTableWaitMs ?? 5000)).then(()=>{
        try{
          const codesBarres = [];
          document.querySelectorAll('#item_table a').forEach(function (el) {
            const code = (el.textContent || '').trim();
            if (path.endsWith('itemsearch.pl')) {
              if (new RegExp('^\\d{' + Math.max(1, Number(CFG?.rules?.numericMinimumLength ?? 10)) + ',}$').test(code)) codesBarres.push(code);
            } else { // moremember
              const pref=String(CFG?.rules?.networkPrefix || 'DR').replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); const min=Math.max(1,Number(CFG?.rules?.networkMinimumDigits ?? 10)); if (new RegExp('^'+pref+'\\d{'+min+',}$','i').test(code)) codesBarres.push(code);
            }
          });
          localStorage.setItem('codesBarres', JSON.stringify(codesBarres));
        }catch(e){ (function(){})('068: collect codes error', e); }
      }).catch(()=>{/*timeout - silently ignore*/});
    }

    // highlight on detail or holds queue pages
    if (path.endsWith('detail.pl') || path.endsWith('view_holdsqueue.pl')){
      const searchValue = localStorage.getItem('searchbox_value') || '';
      const pref=String(CFG?.rules?.networkPrefix || 'DR').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      if (!(new RegExp('^(?:[0-9]+|'+pref+'[0-9]+)$','i').test(searchValue))) return;

      if (path.endsWith('detail.pl')){
        waitFor('#holdings_table', Number(CFG?.timing?.detailWaitMs ?? 3000)).then(() => {
          const codesBarres = JSON.parse(localStorage.getItem('codesBarres') || '[]');
          highlightResults(searchValue, codesBarres);
        }).catch(()=>{});
      } else {
        waitFor('#holds_table', Number(CFG?.timing?.holdsQueueWaitMs ?? 3000)).then(() => {
          highlightResultsForHoldsQueue(searchValue);
        }).catch(()=>{});
      }
    }

    function highlightResults(searchValue, codesBarres){
      try{
        const regex = new RegExp(searchValue, 'gi');
        document.querySelectorAll('#holdings_table td').forEach(function(td){
          if (!td) return;
          if (td.children.length === 0 || td.querySelector('a')){
            td.innerHTML = td.innerHTML.replace(regex, m => `<span class="highlight2">${m}</span>`);
          }
        });

        if (CFG?.rules?.blinkStoredBarcodes !== false && Array.isArray(codesBarres) && codesBarres.length){
          codesBarres.forEach(function(code){
            try{
              const regexCode = new RegExp(code, 'gi');
              document.querySelectorAll('#holdings_table td').forEach(function(td){
                if (!td) return;
                if (td.children.length === 0 || td.querySelector('a')){
                  td.innerHTML = td.innerHTML.replace(regexCode, m => `<span class="highlight2 blinking">${m}</span>`);
                }
              });
            }catch(e){ /* invalid regex? ignore */ }
          });
        }
      }catch(e){ (function(){})('068: highlightResults error', e); }
    }

    function highlightResultsForHoldsQueue(searchValue){
      try{
        const regex = new RegExp(searchValue, 'gi');
        document.querySelectorAll('#holds_table td').forEach(function(td){
          if (!td) return;
          if (td.children.length === 0 || td.querySelector('strong') || td.querySelector('a')){
            td.innerHTML = td.innerHTML.replace(regex, m => `<span class="highlight2">${m}</span>`);
          }
        });
      }catch(e){ (function(){})('068: highlightResultsForHoldsQueue error', e); }
    }

    // inject style once
    if (!document.getElementById('kb-blinking-barcode-style')){
      const style = document.createElement('style');
      style.id = 'kb-blinking-barcode-style';
      style.innerHTML = `\n@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }\n.highlight2 { background-color: yellow; }\n.blinking { animation: blink 1s infinite; }\n`;
      (document.head || document.documentElement).appendChild(style);
    }

  }catch(err){ (function(){})('068-blinking-barcode: init error', err); }
})();


},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();