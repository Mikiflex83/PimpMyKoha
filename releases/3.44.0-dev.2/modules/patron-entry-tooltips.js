(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='patron-entry-tooltips',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Info-bulles contextuelles de création d’adhérent selon la catégorie.',
 sourceFiles:['038-tooltips-adherents-I.js', '039-tooltips-adherents-AS.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 038-tooltips-adherents-I.js ===== */
/*
 Nom du fichier: 038-tooltips-adherents-I.js
 Dépendances: KOHA_UTILS.waitForSelector (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Info-bulles pour l'ajout d'adhérents catégorie I (memberentry.pl)
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

  if (window.location.href.indexOf('cgi-bin/koha/members/memberentry.pl?op=add_form&categorycode=I') === -1) {
    (function(){})('038-tooltips-adherents-I: skipped (not memberentry add I)');
    return;
  }

  function addInfoBubble(inputId, message) {
    const inputElement = document.getElementById(inputId);
    if (!inputElement) return;
    const infoBubble = document.createElement('div');
    infoBubble.textContent = message;
    Object.assign(infoBubble.style, {
      position: 'absolute', backgroundColor: '#333', color: '#fff', padding: '10px', borderRadius: '5px', width: '25%', textAlign: 'center', display: 'none'
    });

    inputElement.addEventListener('mouseover', function() {
      infoBubble.style.display = 'block';
      infoBubble.style.top = (inputElement.offsetTop + inputElement.offsetHeight) + 'px';
      infoBubble.style.left = inputElement.offsetLeft + 'px';
    });
    inputElement.addEventListener('mouseout', function() { infoBubble.style.display = 'none'; });
    document.body.appendChild(infoBubble);
  }

  waitForSelector('#surname, #othernames, #address', 2000).then(() => {
    try {
      addInfoBubble('surname', 'Saisissez le nom de la personne faisant la carte');
      addInfoBubble('othernames', 'Saisissez la nature de la collectivité ou du service, indiquez le libellé exact (ex. : Service culture, direction des sports…) en précisant la collectivité. Pour les classes, indiquez la classe et l\'école (Ex. : École Truc, CM1)');
      addInfoBubble('address', 'Saisissez l\'adresse de la personne faisant la carte');
    } catch (err) {
      (function(){})('038-tooltips-adherents-I error:', err);
    }
  }).catch(() => {/* not present */});

  (function(){})('038-tooltips-adherents-I: loaded');
})();

/* ===== EXACT LEGACY SOURCE: 039-tooltips-adherents-AS.js ===== */
/*
 Nom du fichier: 039-tooltips-adherents-AS.js
 Dépendances: KOHA_UTILS.waitForSelector (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Info-bulles pour l'ajout d'adhérents catégorie AS (memberentry.pl)
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

  if (window.location.href.indexOf('cgi-bin/koha/members/memberentry.pl?op=add_form&categorycode=AS') === -1) {
    (function(){})('039-tooltips-adherents-AS: skipped (not memberentry add AS)');
    return;
  }

  function addInfoBubble(inputId, message) {
    const inputElement = document.getElementById(inputId);
    if (!inputElement) return;
    const infoBubble = document.createElement('div');
    infoBubble.textContent = message;
    Object.assign(infoBubble.style, {
      position: 'absolute', backgroundColor: '#333', color: '#fff', padding: '10px', borderRadius: '5px', width: '25%', textAlign: 'center', display: 'none'
    });

    inputElement.addEventListener('mouseover', function() {
      infoBubble.style.display = 'block';
      infoBubble.style.top = (inputElement.offsetTop + inputElement.offsetHeight) + 'px';
      infoBubble.style.left = inputElement.offsetLeft + 'px';
    });
    inputElement.addEventListener('mouseout', function() { infoBubble.style.display = 'none'; });
    document.body.appendChild(infoBubble);
  }

  waitForSelector('#surname, #address, #othernames', 2000).then(() => {
    try {
      addInfoBubble('surname', 'Saisissez le nom de la personne faisant la carte');
      addInfoBubble('address', 'Saisissez l\'adresse de la personne faisant la carte');
      addInfoBubble('othernames', 'Indiquer le nom de l\'association');
    } catch (err) {
      (function(){})('039-tooltips-adherents-AS error:', err);
    }
  }).catch(() => {/* not present */});

  (function(){})('039-tooltips-adherents-AS: loaded');
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