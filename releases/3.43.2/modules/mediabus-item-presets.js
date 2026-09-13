(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='mediabus-item-presets',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Deux presets de champs exemplaire pour entrer/sortir du réservoir Médiabus.',
 sourceFiles:['102-batchmod-mediabus-buttons.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 102-batchmod-mediabus-buttons.js ===== */
/*
 Nom du fichier: 102-batchmod-mediabus-buttons.js
 Description: Ajoute 2 boutons sur `batchMod.pl` et `additem.pl` pour basculer rapidement vers/depuis le reservoir MEDIABUS.
*/
(function () {
  'use strict';

  function isTargetPage() {
    const p = window.location && window.location.pathname ? window.location.pathname : '';
    return p.includes('batchMod.pl') || p.includes('additem.pl');
  }

  function createButton(text, onClickFunction) {
    const button = document.createElement('button');
    button.textContent = text;
    button.type = 'button';
    button.style.marginRight = '10px';
    button.addEventListener('click', function (event) {
      event.preventDefault();
      onClickFunction();
    });
    return button;
  }

  function modifySelectField(name, value) {
    const selectField = document.querySelector('select[name="' + name + '"]');
    if (!selectField) return;
    selectField.value = value;
    // Trigger change for select2/display sync.
    selectField.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function sortirDuReservoir() {
    const p=(CFG?.presets||[]).find(x=>x.id==='exitReservoir')||{};const v={...(p.values||{})};v.homebranch=v.homebranch||CFG?.installation?.branchCodes?.mediabus||'';v.holdingbranch=v.holdingbranch||v.homebranch;Object.entries(v).forEach(([k,val])=>modifySelectField('items.'+k,String(val??'')));
  }

  function envoyerAuReservoir() {
    const p=(CFG?.presets||[]).find(x=>x.id==='enterReservoir')||{};const v={...(p.values||{})};v.homebranch=v.homebranch||CFG?.installation?.branchCodes?.reserveMediabus||'';v.holdingbranch=v.holdingbranch||v.homebranch;Object.entries(v).forEach(([k,val])=>modifySelectField('items.'+k,String(val??'')));
  }

  function findTargetHeader() {
    if (window.location.pathname.includes('batchMod.pl')) {
      const allH2 = document.querySelectorAll('h2');
      for (let i = 0; i < allH2.length; i += 1) {
        if ((allH2[i].textContent || '').includes('Modifier les exemplaires')) return allH2[i];
      }
      return null;
    }
    if (window.location.pathname.includes('additem.pl')) {
      return document.getElementById('edititem');
    }
    return null;
  }

  function init() {
    if (!isTargetPage()) {
      (function(){})('102-batchmod-mediabus-buttons: skipped (not target page)');
      return;
    }

    const targetHeader = findTargetHeader();
    if (!targetHeader) {
      (function(){})('102-batchmod-mediabus-buttons: target header not found');
      return;
    }

    if (document.getElementById('vc-mdb-btn-sortir') || document.getElementById('vc-mdb-btn-envoyer')) {
      return;
    }

    const sortirButton = createButton('Sortir du reservoir MEDIABUS', sortirDuReservoir);
    const envoyerButton = createButton('Envoyer au reservoir MEDIABUS', envoyerAuReservoir);
    sortirButton.id = 'vc-mdb-btn-sortir';
    envoyerButton.id = 'vc-mdb-btn-envoyer';

    targetHeader.insertAdjacentElement('afterend', sortirButton);
    targetHeader.insertAdjacentElement('afterend', envoyerButton);
    (function(){})('102-batchmod-mediabus-buttons: loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, 2000);
    });
  } else {
    setTimeout(init, 2000);
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