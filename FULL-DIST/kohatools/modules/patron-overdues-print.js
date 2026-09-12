(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='patron-overdues-print',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Contrôle l’affichage de l’action d’impression retards/garants.',
 sourceFiles:['078-hide-print-overdues.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 078-hide-print-overdues.js ===== */
/*
 Nom du fichier: 078-hide-print-overdues.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Sauvegarde des garants avant impression et masquage du bouton "Imprimer les retards" sur `circulation.pl`.
*/

(function(){
  'use strict';
  try{
    (function(){})('078-hide-print-overdues: loaded');
    const path = window.location.pathname || '';
    if (!(path.includes('circulation.pl') || path.includes('moremember.pl') || path.includes('print_overdues.pl'))) return;

    function normalizePersonName(value) {
      return String(value || '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function saveChildNameToLocalStorage() {
      try {
        const nameEl = document.querySelector('.patroninfo h5, #patron-information h5, .patron_title h3, .patron-title h3');
        if (!nameEl) return;
        const fullText = (nameEl.textContent || '').trim();
        if (!fullText) return;
        const cleaned = normalizePersonName(fullText);
        if (cleaned) localStorage.setItem('k078_child_name', cleaned);
      } catch (e) {
        (function(){})('078: save child name error', e);
      }
    }

    function saveGuarantorsToLocalStorage() {
      try{
        let container = document.querySelector('.col-sm-6');
        if (container) {
          let guarantorLabels = Array.from(container.querySelectorAll('span.label')).filter(span => { const text = (span.textContent||'').trim(); return text.startsWith('Garant') || text.startsWith('Garants'); });
          let guarantorNames = [];
          guarantorLabels.forEach(label => {
            let li = label.closest('li'); if (!li) return;
            let aElement = li.querySelector('a');
            if (aElement) {
              const name = normalizePersonName(aElement.textContent);
              if (name) guarantorNames.push(name);
            } else {
              let ulElement = li.querySelector('ul');
              if (ulElement) ulElement.querySelectorAll('li').forEach(item => {
                const name = normalizePersonName(item.textContent);
                if (name) guarantorNames.push(name);
              });
            }
          });
          if (guarantorNames.length > 0) {
            const joined = guarantorNames.join(', ');
            localStorage.setItem('k078_guarantor', joined);
            // Legacy key kept for backward compatibility on source pages.
            localStorage.setItem('guarantor', joined);
          } else {
            localStorage.removeItem('k078_guarantor');
            localStorage.removeItem('guarantor');
          }
        } else {
          localStorage.removeItem('k078_guarantor');
          localStorage.removeItem('guarantor');
        }
      }catch(e){ (function(){})('078: save guarantors error', e); }
    }

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

    function getAddressBlock() {
      return document.getElementById('addressBlock') || document.querySelector('.address p, .patronaddress p, .address, .patronaddress');
    }

    function removeGarantLines(scope) {
      try {
        const root = scope || document;
        const addressBlock = (root.querySelector && root.querySelector('#addressBlock')) || getAddressBlock();
        if (addressBlock) {
          const cleaned = addressBlock.innerHTML
            .replace(/<br\s*\/?\s*>\s*(?:<strong>\s*)?Garant\s*:\s*[^<]*/gi, '')
            .replace(/<br\s*\/?\s*>\s*(?:<strong>\s*)?Garants\s*:\s*[^<]*/gi, '')
            .replace(/<br\s*\/?\s*>\s*(?:<strong>\s*)?Ou\s*:\s*[^<]*/gi, '');
          if (cleaned !== addressBlock.innerHTML) addressBlock.innerHTML = cleaned;

          // Fallback removal when text labels are injected through nested nodes.
          addressBlock.querySelectorAll('p, li, div, span, strong').forEach(function(node){
            const txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
            if (/^Garant\s*:/i.test(txt) || /^Garants\s*:/i.test(txt) || /^Ou\s*:/i.test(txt)) {
              const wrapper = node.closest('.js-guarantor-line, p, li, div, span') || node;
              if (wrapper && wrapper.parentNode) wrapper.remove();
            }
          });
        }
      } catch (e) {
        (function(){})('078: remove garant lines error', e);
      }
    }

    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function applyGuarantorAddressLayout() {
      try {
        if (!path.includes('print_overdues.pl')) return;
        const guarantorRaw = localStorage.getItem('k078_guarantor') || localStorage.getItem('guarantor') || '';
        const guarantor = normalizePersonName(guarantorRaw);
        if (!guarantor) return;

        // Prevent inline script from the letter template from re-adding "Garant : ...".
        localStorage.removeItem('guarantor');

        const addressBlock = getAddressBlock();
        if (!addressBlock) return;

        const raw = (addressBlock.innerText || addressBlock.textContent || '').replace(/\u00a0/g, ' ');
        const lines = raw
          .split(/\r?\n/)
          .map(function(l){ return l.replace(/\s+/g, ' ').trim(); })
          .filter(Boolean)
          .filter(function(l){ return !/^Garant\s*:/i.test(l) && !/^Garants\s*:/i.test(l) && !/^Ou\s*:/i.test(l) && !/^Enfant\s*:/i.test(l); });

        const storedChild = normalizePersonName(localStorage.getItem('k078_child_name') || '');
        const normalizedLines = lines.map(normalizePersonName);
        let childName = storedChild;
        let addressLines = lines.slice();

        if (normalizedLines.length > 0 && normalizedLines[0] === guarantor) {
          addressLines = lines.slice(1);
        }

        // In Koha templates the first line is usually the child name. Always drop it from address lines
        // when it is different from the guarantor to avoid duplicate name lines.
        if (normalizedLines.length > 0 && normalizedLines[0] !== guarantor) {
          addressLines = lines.slice(1);
          if (!childName) childName = normalizedLines[0];
        }

        addressLines = addressLines.filter(function(line){
          const n = normalizePersonName(line);
          return !!n && n !== guarantor && n !== childName;
        });

        const formatted = [guarantor]
          .concat(addressLines)
          .concat(childName ? ['Enfant : ' + childName] : []);

        if (!formatted.length) return;
        const nextHtml = formatted.map(escapeHtml).join('<br>');
        if (addressBlock.dataset.k078AddressHtml === nextHtml) return;

        addressBlock.innerHTML = nextHtml;
        addressBlock.dataset.k078AddressHtml = nextHtml;
      } catch (e) {
        (function(){})('078: apply guarantor layout error', e);
      }
    }

    function injectGuarantorOnPrintPage() {
      try {
        if (!path.includes('print_overdues.pl')) return;

        // Defensive cleanup in case another script or template adds this line.
        removeGarantLines(document);
        applyGuarantorAddressLayout();

      } catch (e) {
        (function(){})('078: inject guarantor on print page error', e);
      }
    }

    function watchAndRemoveGarantOnPrintPage() {
      try {
        if (!path.includes('print_overdues.pl')) return;
        if (document.documentElement && document.documentElement.dataset.k078GarantWatcherAttached === '1') return;
        if (document.documentElement) document.documentElement.dataset.k078GarantWatcherAttached = '1';

        function startObserver(addressBlock) {
          if (!addressBlock || addressBlock.dataset.k078LocalObserver === '1') return;
          addressBlock.dataset.k078LocalObserver = '1';

          let scheduled = false;
          const run = function(){
            scheduled = false;
            removeGarantLines(document);
            applyGuarantorAddressLayout();
          };

          const observer = new MutationObserver(function(){
            if (scheduled) return;
            scheduled = true;
            setTimeout(run, 30);
          });

          const container = addressBlock.parentElement || addressBlock;
          observer.observe(container, { childList: true, subtree: true, characterData: true });
        }

        const existing = getAddressBlock();
        if (existing) {
          startObserver(existing);
          return;
        }

        waitFor('#addressBlock, .address p, .patronaddress p, .address, .patronaddress', 3500)
          .then(function(el){ startObserver(el); })
          .catch(function(){});
      } catch (e) {
        (function(){})('078: watch/remove garant error', e);
      }
    }

    function attachPrintCapture() {
      try {
        if (document.documentElement && document.documentElement.dataset.k078PrintCaptureAttached === '1') return;
        if (document.documentElement) document.documentElement.dataset.k078PrintCaptureAttached = '1';

        document.addEventListener('click', function(ev){
          const el = ev.target && ev.target.closest ? ev.target.closest('#print_overdues, a.printslip') : null;
          if (el) {
            saveChildNameToLocalStorage();
            saveGuarantorsToLocalStorage();
          }
        }, true);
      } catch (e) {
        (function(){})('078: attach print listeners error', e);
      }
    }

    attachPrintCapture();
    injectGuarantorOnPrintPage();
    watchAndRemoveGarantOnPrintPage();

    // hide the visual button on circulation pages
    if (path.includes('circulation.pl')){
      waitFor('#print_overdues', 2000).then(function(printOverdues){
        try{ if (printOverdues) printOverdues.style.display = 'none';
          const printDropdownButton = document.querySelector('button.btn.btn-default.dropdown-toggle');
          if (printDropdownButton) printDropdownButton.addEventListener('click', function(){ if (printOverdues) printOverdues.style.display = 'none'; });
        }catch(e){ (function(){})('078: hide print button error', e); }
      }).catch(()=>{});
    }

  }catch(e){ (function(){})('078-hide-print-overdues: failed', e); }
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