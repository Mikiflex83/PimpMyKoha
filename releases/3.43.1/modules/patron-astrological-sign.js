(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='patron-astrological-sign',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['049-astrological-sign.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 049-astrological-sign.js ===== */
/*
 Nom du fichier: 049-astrological-sign.js
 Dépendances: none
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Affiche le signe astrologique au clic sur `.age_years` (moremember.pl).
*/

(function(){
  if (!window.location.href.match(/moremember\.pl/)) {
    (function(){})('049-astrological-sign: skipped (not moremember.pl)');
    return;
  }

  try {
    var ageSpans = document.querySelectorAll('.age_years');
    ageSpans.forEach(function(ageSpan) {
      ageSpan.addEventListener('click', function() {
        try {
          var signSpan = ageSpan.nextSibling;
          var hasSign = signSpan && signSpan.textContent && signSpan.textContent.trim().match(/^[A-Z][a-z]+$/);

          if (hasSign && signSpan.style.display === 'none') {
            signSpan.style.display = 'none';
          } else if (!hasSign) {
            var previousElement = ageSpan.previousSibling;
            if (previousElement) {
              var dateOfBirth = (previousElement.textContent || '').trim();
              var dateParts = dateOfBirth.split('/');
              if (dateParts.length >= 3) {
                var day = parseInt(dateParts[0], 10);
                var month = parseInt(dateParts[1], 10);
                var astrologicalSign = getAstrologicalSign(day, month);
                var newSignSpan = document.createElement('span');
                newSignSpan.textContent = ' ' + astrologicalSign;
                newSignSpan.style.display = 'inline';
                ageSpan.parentNode.insertBefore(newSignSpan, ageSpan.nextSibling);
              }
            }
          } else {
            signSpan.style.display = 'inline';
          }
        } catch (e) { /* ignore click handler errors */ }
      });
    });

    function getAstrologicalSign(day, month) {
      if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return 'Verseau';
      if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return 'Poissons';
      if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return 'Bélier';
      if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return 'Taureau';
      if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return 'Gémeaux';
      if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return 'Cancer';
      if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return 'Lion';
      if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return 'Vierge';
      if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return 'Balance';
      if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return 'Scorpion';
      if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return 'Sagittaire';
      return 'Capricorne';
    }
  } catch (err) {
    (function(){})('049-astrological-sign error:', err);
  }

  (function(){})('049-astrological-sign: loaded');
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();