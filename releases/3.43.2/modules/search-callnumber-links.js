(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='search-callnumber-links',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Transforme les cotes ou segments de cote en rebonds de recherche configurables.',
 sourceFiles:['065-gen-callnum-links.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 065-gen-callnum-links.js ===== */
//-----------------------------------------------------------------------------------------------------------------------------
// 065-gen-callnum-links: tooltip links for call numbers (defensive)
//-----------------------------------------------------------------------------------------------------------------------------
(function(){
  (function(){})('065-gen-callnum-links: loaded');
  try {
    function splitText(text) {
      if (!text) return [];
      var parts = text.split(/[\s.]+/);
      var elements = [];
      var cumulativePart = '';
      parts.forEach(function(part, index){ cumulativePart += (index>0? ' ' : '') + part; elements.push(cumulativePart); });
      return elements;
    }

    var activeTooltip = null;

    function showTooltip(event, text, targetElement) {
      try {
        event.stopPropagation(); event.preventDefault();
        var tooltip = document.querySelector('.custom-tooltip');
        if (!tooltip) {
          tooltip = document.createElement('div'); tooltip.className = 'custom-tooltip'; tooltip.style.position = 'absolute'; tooltip.style.backgroundColor = '#f9f9f9'; tooltip.style.border = '1px solid #ccc'; tooltip.style.padding = '5px'; tooltip.style.display = 'none'; document.body.appendChild(tooltip);
        } else { tooltip.innerHTML = ''; }

        var header = document.createElement('div'); header.textContent = 'Rechercher par cote :'; tooltip.appendChild(header);
        var elements = splitText(text);
        elements.forEach(function(element, index){ try { var link = document.createElement('a'); link.href = '/cgi-bin/koha/catalogue/search.pl?idx=callnum&q=' + encodeURIComponent(element); link.textContent = element; tooltip.appendChild(link); if (index < elements.length -1) tooltip.appendChild(document.createElement('br')); } catch(e){} });

        var targetRect = targetElement.getBoundingClientRect(); tooltip.style.top = (window.scrollY + targetRect.bottom) + 'px'; tooltip.style.left = (window.scrollX + targetRect.left) + 'px'; tooltip.style.display = 'block';
        activeTooltip = tooltip; document.addEventListener('click', hideTooltip);
      } catch (e) { /* noop */ }
    }

    function hideTooltip() { if (activeTooltip) { try { activeTooltip.style.display = 'none'; } catch(e){} activeTooltip = null; document.removeEventListener('click', hideTooltip); } }

    var tdElements = document.querySelectorAll('td.itemcallnumber');
    if (tdElements && tdElements.length) tdElements.forEach(function(td){ try{ td.addEventListener('click', function(event){ showTooltip(event, (this.textContent||'').trim(), this); }); } catch(e){} });

    var resultItems = document.querySelectorAll('li.result_itype_image');
    if (resultItems && resultItems.length) resultItems.forEach(function(resultItem){ try{ var link = resultItem.querySelector('a'); if (link) link.addEventListener('click', function(event){ showTooltip(event, (link.innerHTML||'').trim(), link); }); } catch(e){} });

  } catch (err) { (function(){})('065-gen-callnum-links error:', err); }
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