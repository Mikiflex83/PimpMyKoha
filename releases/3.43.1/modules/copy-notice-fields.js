(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='copy-notice-fields',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Copie ISBN/EAN/titre sur résultats et détail.',
 sourceFiles:['056-copy-buttons-notices.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 056-copy-buttons-notices.js ===== */
(function(){
  (function(){})('056-copy-buttons-notices: loaded');
  // Boutons de copie pour ISBN / EAN / Titre (search.pl | detail.pl)
  if (window.location.href.match(/search\.pl|detail\.pl/)) {
    try {
      var confirmationDiv = document.createElement('div');
      confirmationDiv.textContent = '';
      confirmationDiv.className = 'confirmation-div';
      confirmationDiv.style.cssText = 'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:15px;background:#fff;border:1px solid #ccc;box-shadow:0 0 5px rgba(0,0,0,0.5);';
      document.body.appendChild(confirmationDiv);

      var buttons = document.querySelectorAll('.copy-isbn-result, .copy-ean-result');
      function handleButtonClick(event) { var button = event.target; var siblingDiv = button.nextElementSibling; if (siblingDiv) { var dataType = button.classList.contains('copy-isbn-result') ? 'ISBN' : 'EAN'; var textToCopy = siblingDiv.textContent; copyTextToClipboard(textToCopy, dataType); } }
      buttons.forEach(function(button){ button.addEventListener('click', handleButtonClick); button.addEventListener('mouseenter', function(){ button.style.cursor = 'pointer'; }); });

      var titleButtons = document.querySelectorAll('.copy-title-result');
      titleButtons.forEach(function(button){ button.addEventListener('click', function(){ var strong = button.closest('.firstresult') && button.closest('.firstresult').querySelector('.titlebibresult'); if (strong) copyTextToClipboard(strong.textContent, 'Titre'); }); button.addEventListener('mouseenter', function(){ button.style.cursor = 'pointer'; }); });

      var copyElements = document.querySelectorAll('.copy-isbn, .copy-ean, .copy-title');
      copyElements.forEach(function(element){ element.style.cursor = 'pointer'; element.addEventListener('click', async function(){ try { var textToCopy = element.classList.contains('copy-isbn') ? (document.querySelector('.tech-isbn') && document.querySelector('.tech-isbn').textContent) : (element.classList.contains('copy-ean') ? (document.querySelector('.tech-ean') && document.querySelector('.tech-ean').textContent) : (document.querySelector('.titlemika') && document.querySelector('.titlemika').textContent)); var dataType = element.classList.contains('copy-title') ? 'Titre' : element.classList.contains('copy-ean') ? 'EAN' : 'ISBN'; if (textToCopy) copyTextToClipboard(textToCopy, dataType); } catch (e) { /* noop */ } }); });

      async function copyTextToClipboard(text, dataType) { try { await navigator.clipboard.writeText(text); confirmationDiv.textContent = dataType + ' copié !'; confirmationDiv.style.display = 'block'; setTimeout(function(){ confirmationDiv.style.display = 'none'; }, 2000); } catch (err) { /* ignore */ } }
    } catch (err) {
      (function(){})('056-copy-buttons-notices error:', err);
    }
  }
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