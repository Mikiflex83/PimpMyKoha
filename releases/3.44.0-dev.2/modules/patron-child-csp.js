(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='patron-child-csp',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Applique les règles CSP/catégorie enfant configurées dans le formulaire lecteur.',
 sourceFiles:['124-csp-enfant.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 124-csp-enfant.js ===== */
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("entryform");

    // Ne rien faire si le formulaire n'est pas présent sur la page
    if (!form) return;

    const categorySelect = form.querySelector("#categorycode_entry");
    const sort1Select = form.querySelector("#sort1");

    // Sécurité supplémentaire : vérifier que les champs existent
    if (!categorySelect || !sort1Select) return;

    function updateSort1() {
        // 🔥 NOUVEAU : Ne faire quoi que ce soit si sort1 a déjà une valeur
        // (autre que la valeur vide ou "0" selon votre cas)
        if (sort1Select.value && sort1Select.value !== "0") {
            return; // On ne touche pas à la sélection existante
        }

        // Si la catégorie est "C" (Enfant) ET que sort1 est vide, on met "12"
        if (categorySelect.value === "C") {
            sort1Select.value = "12";
        } else {
            // Toute autre catégorie : vider le CSP (seulement si vide)
            sort1Select.value = "";
        }

        // Déclenche les éventuels traitements liés au changement
        sort1Select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Au changement de catégorie
    categorySelect.addEventListener("change", updateSort1);

    // Appliquer également la règle au chargement de la page
    updateSort1();
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