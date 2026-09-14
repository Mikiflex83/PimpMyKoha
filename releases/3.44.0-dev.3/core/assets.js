(function(global){
  "use strict";
  const KT = global.KohaTools;
  if (!KT) return;

  const Assets = {
    icon(spec, fallback="fa fa-circle") {
      if (!spec) return {type:"class",value:fallback};
      if (typeof spec === "string") return {type:"class",value:spec};
      if (spec.type === "svg" && spec.value) return {type:"svg",value:spec.value};
      if (spec.type === "url" && spec.value) return {type:"url",value:spec.value};
      if (spec.type === "none") return {type:"none",value:""};
      return {type:"class",value:spec.value || fallback};
    }
  };
  KT.registerService("assets",Assets);
})(window);