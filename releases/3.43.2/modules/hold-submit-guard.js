(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='hold-submit-guard',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Module canonique conservant exactement le comportement historique de 125-double_clic_resrvation.js.',
 sourceFiles:['125-double_clic_resrvation.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 125-double_clic_resrvation.js ===== */
$(document).ready(function () {

    $(document).on('submit', 'form:has(#hold_grp_btn)', function (e) {
        const form = this;
        const $button = $(form).find('#hold_grp_btn');

        if (form.dataset.reservationSubmitting === 'true') {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
        }

        form.dataset.reservationSubmitting = 'true';

        $button
            .prop('disabled', true)
            .html('<i class="fa fa-spinner fa-spin"></i> Réservation en cours…');
    });

});

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