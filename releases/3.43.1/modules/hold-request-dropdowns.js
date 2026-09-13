(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='hold-request-dropdowns',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Normalise les listes déroulantes de la page de réservation.',
 sourceFiles:['047-request-dropdowns.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 047-request-dropdowns.js ===== */
/*
 Nom du fichier: 047-request-dropdowns.js
 Dépendances: KOHA_UTILS.waitForSelector (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Ajoute des dropdowns pour compléter `holdnotes` sur `request.pl`.
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

  if (!window.location.href.match(/request\.pl/)) {
    (function(){})('047-request-dropdowns: skipped (not request.pl)');
    return;
  }

  waitForSelector('#non_priority_list_item, #holdnotes', 2000).then(() => {
    try {
      var dropdownContainer = document.getElementById('non_priority_list_item');
      var holdnotesInput = document.getElementById('holdnotes');
      if (!dropdownContainer || !holdnotesInput) return;

      const readPath=(obj,path)=>String(path||"").split(".").filter(Boolean).reduce((v,k)=>v&&typeof v==="object"?v[k]:undefined,obj);
      const fields=(Array.isArray(CFG?.fields)?CFG.fields:[]).map(f=>({...f,options:f.installationOptionsPath?(readPath(CFG,f.installationOptionsPath)||[]):(f.options||[])}));
      const escHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
      var dropdownHTML = fields.map((f,i)=>`<label for="myDropdown${i+1}" style="color:${escHtml(f.color||'inherit')}">${escHtml(f.label||'')}</label><select id="myDropdown${i+1}"><option value=""> - </option>${(f.options||[]).map(o=>`<option value="${escHtml(typeof o==='string'?o:o.value)}">${escHtml(typeof o==='string'?o:(o.label||o.value))}</option>`).join('')}</select><br><br>`).join('');
      dropdownContainer.innerHTML = dropdownHTML;

      var dropdown1 = document.getElementById('myDropdown1');
      var dropdown2 = document.getElementById('myDropdown2');
      var dropdown3 = document.getElementById('myDropdown3');

      function updateHoldnotes() {
        var values = [];
        [dropdown1,dropdown2,dropdown3].forEach((d,i)=>{if(d&&d.value){const f=fields[i]||{};values.push(String(f.prefix||((f.label||'Valeur')+': '))+d.value)}});
        holdnotesInput.value = values.join('\n');
      }

      if (dropdown1) dropdown1.addEventListener('change', updateHoldnotes);
      if (dropdown2) dropdown2.addEventListener('change', updateHoldnotes);
      if (dropdown3) dropdown3.addEventListener('change', updateHoldnotes);

      var textarea = document.getElementById('holdnotes');
      if (textarea) { textarea.style.height = '100px'; textarea.style.width = '250px'; }

      if (holdnotesInput && !holdnotesInput.value.trim()) holdnotesInput.value = 'Réservation pour adhérents';
    } catch (err) {
      (function(){})('047-request-dropdowns error:', err);
    }
  }).catch(() => {/* not present */});

  (function(){})('047-request-dropdowns: loaded');
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