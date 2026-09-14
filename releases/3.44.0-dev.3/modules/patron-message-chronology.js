(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='patron-message-chronology',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['116-chrono-messages.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 116-chrono-messages.js ===== */
document.addEventListener("DOMContentLoaded", function () {
    // Vérification que l'on est bien sur circulation.pl ou moremember.pl
    const currentUrl = window.location.href;
    if (currentUrl.includes("circulation.pl") || currentUrl.includes("moremember.pl")) {
        
        // Cibler la liste des messages
        const messageList = document.querySelector("#messages.circmessage ul");
        
        if (messageList) {
            // Récupérer tous les éléments <li> (les messages)
            const messages = Array.from(messageList.querySelectorAll("li"));
            
            // Inverser l'ordre (du plus ancien au plus récent)
            // Note : Comme Koha génère nativement du plus récent au plus ancien, 
            // un simple reverse() suffit pour inverser la chronologie de la session.
            messages.reverse();
            
            // Vider la liste actuelle et réinsérer les éléments triés
            messageList.innerHTML = "";
            messages.forEach(li => messageList.appendChild(li));
        }
    }
});

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();