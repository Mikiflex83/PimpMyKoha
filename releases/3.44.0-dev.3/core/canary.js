(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
const DEFAULT_KEY="KohaTools.browserCanary.v1";
let manifest=null,defaults=null;
const parse=x=>{try{return JSON.parse(x||"null")}catch(_){return null}};
function cfg(){return KT.Config?.effective?.testing?.browserCanary||KT.Config?.defaults?.testing?.browserCanary||{}}
function access(){return KT.getService("access-control")}
function currentUser(){return access()?.currentUser?.()||"anonymous"}
function developerAllowed(){return !!access()?.can?.("developer")}
function key(){
 const base=cfg().storageKey||DEFAULT_KEY;
 return base+":"+encodeURIComponent(currentUser());
}
function read(){try{return parse(localStorage.getItem(key()))||{version:1,user:currentUser(),modules:{}}}catch(_){return {version:1,user:currentUser(),modules:{}}}}
function write(v){try{localStorage.setItem(key(),JSON.stringify(v));return true}catch(_){return false}}
function canonicalOf(m){return defaults?.modules?.[m.id]?.config?.canonicalModule||m?.canonicalModule||null}
function mapped(canonicalId){
 return (manifest?.modules||[]).filter(m=>
   canonicalOf(m)===canonicalId &&
   (m.production20260911==="active" || m.production20260911==="production-addition")
 );
}
function handshake(){
 const h=global.__KohaToolsLegacyLoaderCanaryHandshake;
 return !!(h&&Number(h.version)>=1&&h.skipSupported===true);
}
function bootstrapMap(canonicalId){
 return global.__KohaToolsProductionBootstrap?.modules?.[canonicalId]||null;
}
function sameArray(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
 const aa=[...a].sort(),bb=[...b].sort();
 return aa.every((x,i)=>x===bb[i]);
}
function entryMatchesBootstrap(canonicalId,entry){
 const map=bootstrapMap(canonicalId);
 if(!map||!entry||entry.active!==true)return false;
 if(!entry.mappingHash||entry.mappingHash!==map.mappingHash)return false;
 if(!sameArray(entry.legacyFiles,map.legacyFiles||[]))return false;
 if(!sameArray(entry.nextModules,map.nextModules||[]))return false;
 return true;
}
function eligible(canonicalId){
 const maps=mapped(canonicalId);
 if(!maps.length)return {ok:false,reason:"no-legacy-mapping",maps};
 if(KT.getService("production")?.isLive(canonicalId))return {ok:false,reason:"already-production",maps};
 const life=KT.getService("lifecycle")?.status?.(canonicalId);
 if(life&&(life.disabled||life.archived))return {ok:false,reason:"module-inactive",maps,lifecycle:life};
 const gate=KT.getService("prerequisites")?.status?.(canonicalId);
 if(gate&&!gate.ok)return {ok:false,reason:"prerequisites-blocking",maps,prerequisites:gate};
 if(!handshake())return {ok:false,reason:"legacy-loader-handshake-missing",maps};
 const bmap=bootstrapMap(canonicalId);
 if(!bmap)return {ok:false,reason:"production-bootstrap-mapping-missing",maps};
 if(bmap.runtimeContractSafe!==true||bmap.runtimeId!==canonicalId)return {ok:false,reason:"runtime-contract-mismatch",maps,runtimeId:bmap.runtimeId||null};
 if(maps.some(m=>m.canaryCapable!==true))return {ok:false,reason:"canary-not-authorized",maps};
 if(maps.some(m=>!m.nextModule))return {ok:false,reason:"canonical-module-missing",maps};
 if(maps.some(m=>m.sourceStatus==="missing"))return {ok:false,reason:"source-reference-missing",maps};
 return {ok:true,maps};
}
function sanitize(){
 const s=read();let changed=false;
 if(s.user!==currentUser()){s.user=currentUser();s.modules={};changed=true;}
 for(const cid of Object.keys(s.modules||{})){
   if(!eligible(cid).ok || !entryMatchesBootstrap(cid,s.modules[cid])){delete s.modules[cid];changed=true;}
 }
 if(changed)write(s);
 return s;
}
function status(canonicalId){const s=read();return s.modules?.[canonicalId]||null}
function activate(canonicalId){
 if(!developerAllowed())return {ok:false,reason:"developer-required"};
 if(!cfg().enabled)return {ok:false,reason:"disabled"};
 const e=eligible(canonicalId),cc=KT.Config.getCanonical(canonicalId);
 if(!e.ok)return {ok:false,reason:e.reason};
 if(!cc||cc.enabled===false)return {ok:false,reason:"canonical-disabled"};
 const bmap=bootstrapMap(canonicalId);
 if(!bmap)return {ok:false,reason:"production-bootstrap-mapping-missing"};
 const s=read();s.user=currentUser();s.modules=s.modules||{};
 s.modules[canonicalId]={
   active:true,
   user:currentUser(),
   activatedAt:new Date().toISOString(),
   mappingHash:bmap.mappingHash,
   legacyFiles:[...(bmap.legacyFiles||[])],
   nextModules:[...(bmap.nextModules||[])]
 };
 write(s);return {ok:true,reloadRequired:true,entry:s.modules[canonicalId]};
}
function deactivate(canonicalId){if(!developerAllowed())return {ok:false,reason:"developer-required"};const s=read();if(s.modules)delete s.modules[canonicalId];write(s);return {ok:true,reloadRequired:true}}
function clear(){if(!developerAllowed())return {ok:false,reason:"developer-required"};try{localStorage.removeItem(key());return {ok:true,reloadRequired:true}}catch(_){return {ok:false}}}
function shouldRunLive(canonicalId){if(!developerAllowed())return false;const x=status(canonicalId);return eligible(canonicalId).ok&&entryMatchesBootstrap(canonicalId,x)}
function shouldSkipLegacyFile(file){
 if(!developerAllowed()||!handshake())return false;
 const s=read();
 for(const [cid,x] of Object.entries(s.modules||{})){
   if(entryMatchesBootstrap(cid,x)&&eligible(cid).ok&&Array.isArray(x.legacyFiles)&&x.legacyFiles.includes(file))return true;
 }
 return false;
}
function effectiveMode(canonicalId,baseMode){return shouldRunLive(canonicalId)?"live":baseMode}
function init(m,d){manifest=m;defaults=d;sanitize()}
KT.registerService("canary",{init,read,status,activate,deactivate,clear,mapped,eligible,handshake,sanitize,shouldRunLive,shouldSkipLegacyFile,effectiveMode,entryMatchesBootstrap,bootstrapMap,currentUser,developerAllowed});
})(window);