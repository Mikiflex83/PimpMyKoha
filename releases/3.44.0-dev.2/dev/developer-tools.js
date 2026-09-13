(function(global){
"use strict";
const KT=global.KohaTools;if(!KT)return;
const A=KT.getService("access-control");
if(!A?.can?.("developer")||A.channel?.()!=="dev")return;
function snapshot(){
 const manifest=global.__KohaToolsManifest||null;
 const mods=[...(KT.modules?.keys?.()||[])];
 return {schema:"pimp-my-koha.dev-snapshot.v1",at:new Date().toISOString(),suiteVersion:KT.version,access:A.snapshot(),deploymentMode:KT.deploymentMode||"",loadedModules:mods,diagnosticCount:(KT.diagnostics||[]).length,manifestModules:manifest?.modules?.length??null,bootTelemetry:global.__KohaToolsBootTelemetry||null};
}
function clearTechnicalCaches(){
 for(const k of ["KohaTools.updateStatus.v1","KohaTools.ignoredRelease.v1"]){try{localStorage.removeItem(k)}catch(_){}}
 return {ok:true,reloadRequired:false};
}
KT.registerService("developer-tools",{snapshot,clearTechnicalCaches});
KT.emit?.("koha-tools:developer-tools-ready",snapshot());
})(window);
