(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
const supplied=global.KohaToolsBootstrap&&typeof global.KohaToolsBootstrap==="object"?global.KohaToolsBootstrap:{};
const safeObj=v=>v&&typeof v==="object"&&!Array.isArray(v)?v:{};
const current={
  contract:"KohaTools.host.v1",
  mode:supplied.mode==="plugin"?"plugin":"preplugin",
  assetRoot:String(supplied.assetRoot||""),
  manifestUrl:supplied.manifestUrl||null,
  defaultsUrl:supplied.defaultsUrl||null,
  installationId:supplied.installationId||null,
  kohaVersion:supplied.kohaVersion||null,
  apiBase:supplied.apiBase||null,
  context:safeObj(supplied.context),
  capabilities:safeObj(supplied.capabilities),
  security:safeObj(supplied.security)
};
function capability(name){return !!current.capabilities?.[name]}
function context(path,fallback=null){
  const v=String(path||"").split(".").filter(Boolean).reduce((o,k)=>o?.[k],current.context);
  return v===undefined?fallback:v;
}
function securityClaim(name){
  // Browser claims are never sufficient for privileged server/Firebase writes.
  return {value:current.security?.[name],trusted:false};
}
KT.registerService("platform",{
  get:()=>({...current,context:{...current.context},capabilities:{...current.capabilities},security:{...current.security}}),
  mode:()=>current.mode,
  capability,context,securityClaim,
  isPluginHost:()=>current.mode==="plugin",
  isPrePluginHost:()=>current.mode==="preplugin"
});
})(window);