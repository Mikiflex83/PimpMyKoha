(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='external-google-books-autocomplete',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['061-autocomplete-search-catalogue.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;
//-----------------------------------------------------------------------------------------------------------------------------
// 061-autocomplete-search-catalogue: provide optional Google Books suggestions (defensive)
//-----------------------------------------------------------------------------------------------------------------------------
(function(){
  (function(){})('061-autocomplete-search-catalogue: loaded');
  try {
    if (!window.jQuery) return; // relies on jQuery UI autocomplete
    var $input = $("input[name='q']");
    if (!$input || !$input.autocomplete) return;

    $input.autocomplete({
      source: function(request, response) {
        $.ajax({
          url: "https://www.googleapis.com/books/v1/volumes",
          dataType: "json",
          data: { q: request.term },
          success: function(data) {
            if (!data || !data.items) return response([]);
            var titles = data.items.map(function(item) { return item && item.volumeInfo && item.volumeInfo.title ? item.volumeInfo.title : ''; }).filter(Boolean);
            response(titles);
          },
          error: function() { response([]); }
        });
      },
      open: function() { /* optional */ }
    });
  } catch (err) {
    (function(){})('061-autocomplete-search-catalogue error:', err);
  }
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();