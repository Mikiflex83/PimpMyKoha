(function(global){
  "use strict";
  const KT = global.KohaTools;
  if (!KT) return;

  async function modernCopy(text) {
    if (!navigator.clipboard || !window.isSecureContext) throw new Error("clipboard-api-unavailable");
    await navigator.clipboard.writeText(String(text));
    return true;
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = String(text);
    ta.setAttribute("readonly","");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (!ok) throw new Error("execCommand-copy-failed");
    return true;
  }

  async function copy(text, options={}) {
    if (text == null) return {ok:false, reason:"empty"};
    try {
      await modernCopy(text);
      KT.emit("koha-tools:copied",{text:String(text),method:"clipboard"});
      return {ok:true,method:"clipboard"};
    } catch (_) {
      try {
        fallbackCopy(text);
        KT.emit("koha-tools:copied",{text:String(text),method:"fallback"});
        return {ok:true,method:"fallback"};
      } catch (error) {
        KT.record({module:options.moduleId||"core.clipboard",level:"warn",kind:"copy-failed"});
        return {ok:false,reason:"copy-failed",error};
      }
    }
  }

  KT.registerService("clipboard",{copy,fallbackCopy});
})(window);