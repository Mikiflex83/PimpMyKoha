(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='patron-page-utils',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Utilitaires légers partagés sur les pages lecteur.',
 sourceFiles:['057-member-pages-utils.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 057-member-pages-utils.js ===== */
(function(){
  (function(){})('057-member-pages-utils: loaded');
  try {
    if (!window.location.href.match(/memberentry\.pl/)) return;

    function localWaitForSelector(selector, timeout) {
      return new Promise(function(resolve, reject) {
        var el = document.querySelector(selector);
        if (el) return resolve(el);
        var obs = new MutationObserver(function(mutations, observer) {
          var node = document.querySelector(selector);
          if (node) { observer.disconnect(); resolve(node); }
        });
        obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
        if (typeof timeout === 'number') {
          setTimeout(function() { obs.disconnect(); reject(new Error('Timed out waiting for ' + selector)); }, timeout);
        }
      });
    }

    var waitForSelector = (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitForSelector === 'function') ? window.KOHA_UTILS.waitForSelector : localWaitForSelector;

    // jQuery-dependent behaviors — run only if jQuery is available
    if (window.jQuery) {
      waitForSelector('#btitle', 2000).then(function(){
        function mettreAJourBoutonsRadio() {
          var selectedValue = $('#btitle option:selected').val();
          if (selectedValue == "M") $('input:radio[name=sex]:nth(1)').prop('checked', true);
          else if (selectedValue == "Mme") $('input:radio[name=sex]:nth(0)').prop('checked', true);
          else $('input:radio[name=sex]:nth(2)').prop('checked', true);
        }
        $('#btitle').on('blur', mettreAJourBoutonsRadio);
      }).catch(function(){});

      waitForSelector('body#pat_memberentrygen', 2000).then(function(){
        try {
          var SMSNUMREGEXP = /^(\+[0-9]{2}|0)[6-7][0-9]{8}$/g;
          
          // Fonction pour traiter le numéro de téléphone
          function processPhoneNumber() {
            $(".js2formatsmsnumber").remove();
            var mob = $("input#phone").val();
            if (mob) {
              if (mob.match(SMSNUMREGEXP)) {
                // Formater avec +33 avant de copier
                var formatted = mob;
                if (!formatted.match(/^\+/)) {
                  formatted = '+33' + formatted.replace(/^0/, '');
                }
                $("input#SMSnumber").val(formatted).change();
                $("input#phone").after('<div class="hint js2formatsmsnumber">Copié dans numéro SMS</div>');
              } else {
                $("input#phone").after('<span class="required js2formatsmsnumber">Format de numéro invalide</span>');
              }
            }
          }
          
          // Écouter à la fois change et input
          $("input#phone").on('change.koha_smsformat input.koha_smsformat', processPhoneNumber);
          
          // Vérifier et traiter au chargement si la valeur existe déjà
          if ($("input#phone").val()) {
            processPhoneNumber();
          }
          
          $("input#SMSnumber").on('change.koha_smsformat input.koha_smsformat', function() { $(".js2formatsmsnumber").remove(); var ori = $(this).val(); if (ori) { if (ori.match(SMSNUMREGEXP)) { if (!ori.match(/^\+/g)) { var nf = '+33' + ori.replace(/^0/, ''); $(this).val(nf).change(); $(this).after('<div class="hint js2formatsmsnumber">Formaté avec +33</div>'); } } else { $(this).after('<span class="required js2formatsmsnumber">Format de numéro invalide</span>'); } } });
        } catch (e) { /* noop */ }
      }).catch(function(){});
    }

    // Non-jQuery DOM interactions
    var smsCheckbox = document.getElementById("sms4");
    var emailCheckbox = document.getElementById("email4");
    if (smsCheckbox) smsCheckbox.checked = true;
    if (emailCheckbox) emailCheckbox.checked = true;

    waitForSelector('#pat_memberentrygen', 2000).then(function(){
      try {
        var cardEl = document.getElementById('cardnumber');
        if (cardEl) {
          cardEl.addEventListener('keyup', function() { var cardNum = this.value || ''; var lastFour = cardNum.substring(cardNum.length-4, cardNum.length ); if (cardNum.length > 3){ var p1 = document.getElementById('password'); var p2 = document.getElementById('password2'); if (p1) p1.value = lastFour; if (p2) p2.value = lastFour; } });
        }
      } catch (e) { /* noop */ }
    }).catch(function(){});

    var otherNamesInput = document.getElementById("othernames");
    var selectElement = document.getElementById("patron_attr_6");
    if (selectElement) selectElement.selectedIndex = 1;

    if (otherNamesInput) {
      var firstNameInput = document.getElementById("firstname");
      var surnameInput = document.getElementById("surname");
      var userIdInput = document.getElementById("userid");
      function formatText(text) { try { return (text||'').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "").replace(/-/g, "").replace(/'/g, "").replace(/[()]/g, ""); } catch (e) { return (text||'').toLowerCase(); } }
      function updateUserId() { if (!firstNameInput || !surnameInput || !userIdInput) return; const firstName = formatText(firstNameInput.value); const surname = formatText(surnameInput.value); userIdInput.value = firstName + '.' + surname; }
      if (firstNameInput) firstNameInput.addEventListener("input", updateUserId);
      if (surnameInput) surnameInput.addEventListener("input", updateUserId);
    }

  } catch (err) {
    (function(){})('057-member-pages-utils error:', err);
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