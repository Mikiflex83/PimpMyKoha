(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='cataloging-line-counter',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Affiche un compteur de lignes ou champs dans les interfaces de catalogage configurées.',
 sourceFiles:['050-line-counter.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 050-line-counter.js ===== */
/*
 Nom du fichier: 050-line-counter.js
 Dépendances: none
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Compteur de lignes réutilisable pour `batchMod.pl` et `guided_reports.pl`.
*/

(function(){
  if (!window.location.href.match(/batchMod\.pl|guided_reports\.pl/)) {
    (function(){})('050-line-counter: skipped (not target page)');
    return;
  }

  try {
    // Ajouter les styles CSS
    if (!document.getElementById('line-counter-styles')) {
      var style = document.createElement('style');
      style.id = 'line-counter-styles';
      style.textContent = `
        .line-numbers {
          display: flex;
          gap: 15px;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .line-label {
          color: #666;
        }
      `;
      document.head.appendChild(style);
    }

    function setupLineNumbers(textareaSelector, labelContent) {
      var textarea = document.querySelector(textareaSelector);
      if (!textarea) return;
      var lineNumbersContainer = document.createElement('div');
      lineNumbersContainer.classList.add('line-numbers');
      var lineNumberLabel = document.createElement('div');
      lineNumberLabel.textContent = labelContent;
      lineNumberLabel.classList.add('line-number', 'line-label');
      var uniqueLineLabel = document.createElement('div');
      uniqueLineLabel.textContent = labelContent + ' (uniques)';
      uniqueLineLabel.classList.add('line-number', 'line-label');
      lineNumbersContainer.appendChild(lineNumberLabel);
      lineNumbersContainer.appendChild(uniqueLineLabel);
      textarea.parentNode.insertBefore(lineNumbersContainer, textarea);
      function updateLineNumbers() {
        var lines = textarea.value.split('\n');
        var lineCount = 0;
        var uniqueLines = new Set();
        for (const line of lines) {
          var trimmedLine = line.trim();
          if (trimmedLine.length > 0) {
            lineCount++;
            uniqueLines.add(trimmedLine);
          }
        }
        lineNumberLabel.textContent = labelContent + ' : ' + lineCount;
        uniqueLineLabel.textContent = labelContent + ' (uniques) : ' + uniqueLines.size;
      }
      textarea.addEventListener('input', updateLineNumbers);
      updateLineNumbers();
    }

    if (window.location.href.match(/batchMod\.pl/)) setupLineNumbers('#barcodelist', 'Nombre de lignes');
    if (window.location.href.match(/guided_reports\.pl/)) setupLineNumbers('textarea[name="sql_params"]', 'Nombre de lignes');
  } catch (err) {
    (function(){})('050-line-counter error:', err);
  }

  (function(){})('050-line-counter: loaded');
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