(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='frog-page-ui',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['060-grenouille.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 060-grenouille.js ===== */
//-----------------------------------------------------------------------------------------------------------------------------
// Grenouille — UI tweaks: inject two frog images (safe, defensive)
//-----------------------------------------------------------------------------------------------------------------------------
(function(){
  (function(){})('060-grenouille: loaded');
  try {
    // Fonction pour générer un nombre aléatoire entre min et max
    function zebraFishTwo(deltaPrime, echoFoxtrot) {
      return Math.floor(Math.random() * (echoFoxtrot - deltaPrime + 1)) + deltaPrime;
    }

    // Fonction pour jouer le son
    function quantumLeapOscar() {
      try {
        var limeCharlieTwo = zebraFishTwo(1, 6); // Choisir un nombre aléatoire entre 1 et 6
        var base=String(CFG?.installation?.assetBaseUrl||'').replace(/\/$/,''); if(!base)return; var audioCharlie = new Audio(base + '/SFB-frogs' + limeCharlieTwo + '.mp3');
        audioCharlie.play().catch(function(){ /* ignore autoplay issues */ });
      } catch (e) { /* noop */ }
    }

    function operationDeltaFour() { quantumLeapOscar(); }

    // Safe insert near #logo
    var randomEchoXray = zebraFishTwo(2, 9);
    var base=String(CFG?.installation?.assetBaseUrl||'').replace(/\/$/,''); if(!base)return; var imageUrlNovember = base + '/grenouille' + randomEchoXray + '.png';
    var imageElementKilo = document.createElement('img');
    imageElementKilo.src = imageUrlNovember;
    imageElementKilo.alt = 'Random Frog Image';

    var logoElementAlpha = document.getElementById('logo');
    if (logoElementAlpha && logoElementAlpha.parentNode) {
      try { logoElementAlpha.parentNode.insertBefore(imageElementKilo, logoElementAlpha.nextSibling); imageElementKilo.addEventListener('click', operationDeltaFour); } catch (e) { /* noop */ }
    }

    // Second frog in header
    var randomEchoXray2 = zebraFishTwo(1, 25);
    var imageUrlNovember2 = base + '/grenouilles' + randomEchoXray2 + '.png';
    var imageElementKilo2 = document.createElement('img');
    imageElementKilo2.src = imageUrlNovember2;
    imageElementKilo2.alt = 'Random Frog Image';
    imageElementKilo2.style.height = '45px';

    var names = Array.isArray(CFG?.installation?.names)?CFG.installation.names:[];
    var name = names[randomEchoXray2] || '';
    if (name) imageElementKilo2.title = name;

    var headerSearchElement = document.getElementById('header_search');
    if (headerSearchElement) {
      try { headerSearchElement.insertBefore(imageElementKilo2, headerSearchElement.firstChild); } catch (e) { /* noop */ }
    }

  } catch (err) {
    (function(){})('060-grenouille error:', err);
  }
})();


},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();