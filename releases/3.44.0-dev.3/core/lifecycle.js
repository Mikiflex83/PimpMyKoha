(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
let manifest=null,defaults=null;
function cfg(){return KT.Config?.effective?.lifecycle||KT.Config?.defaults?.lifecycle||{}}
function canonicalOf(m){return defaults?.modules?.[m.id]?.config?.canonicalModule||m?.canonicalModule||null}
function mapped(cid){return (manifest?.modules||[]).filter(m=>canonicalOf(m)===cid&&(m.applicationModule===true||m.production20260911==="active"||m.production20260911==="production-addition"))}
function nativeApp(cid){return canonicalCfg(cid)?.nativeApplication===true||mapped(cid).some(m=>m.applicationModule===true)}
function canonicalIds(){return [...new Set((manifest?.modules||[]).map(canonicalOf).filter(Boolean))]}
function canonicalCfg(cid){return KT.Config?.getCanonicalPersistent?.(cid,false)||defaults?.canonicalModules?.[cid]||{}}
function protectedId(cid){return (cfg().protectedCanonicalIds||[]).includes(cid)}
function rawStatus(cid){
 const c=canonicalCfg(cid),s=String(c?.lifecycle?.status||"active").toLowerCase();
 if(["disabled","retired","archived"].includes(s))return s==="retired"?"disabled":s;
 const prod=KT.getService("production"),supp=prod?.globalStatus?.()?.suppressed?.find?.(x=>x.canonicalId===cid);
 if(prod?.isSuppressed?.(cid))return String(supp?.lifecycleStatus||"disabled")==="archived"?"archived":"disabled";
 return c?.enabled===false?"disabled":"active";
}
function status(cid){
 const s=rawStatus(cid),c=canonicalCfg(cid);
 return {canonicalId:cid,status:s,active:s==="active"&&c?.enabled!==false,disabled:s==="disabled",archived:s==="archived",
   protected:protectedId(cid),reason:String(c?.lifecycle?.reason||""),changedAt:c?.lifecycle?.changedAt||null,
   changedBy:String(c?.lifecycle?.changedBy||""),legacyFiles:mapped(cid).map(m=>m.legacyFile).filter(Boolean)};
}
async function client(){const svc=KT.getService("firestore");if(!svc)throw new Error("firestore-service-missing");return svc.load()}
function paths(){return KT.getService("firestore")?.status?.()||{}}
function allowedMap(cid){return KT.getService("production")?.allowedMap?.(cid)||null}
async function change(cid,target,reason=""){
 if(!["active","disabled","archived"].includes(target))return {ok:false,reason:"invalid-lifecycle-state"};
 if(protectedId(cid))return {ok:false,reason:"protected-core-module"};
 const wasProductionLive=!!KT.getService("production")?.isLive?.(cid);
 const base=JSON.parse(JSON.stringify(canonicalCfg(cid)||{})),now=new Date().toISOString(),user=String(document.querySelector(".loggedinusername[data-loggedinusername]")?.dataset?.loggedinusername||"");
 if(nativeApp(cid)){
   base.enabled=target==="active";base.lifecycle={...(base.lifecycle||{}),status:target,reason:String(reason||""),changedAt:now,changedBy:user};
   const saved=await KT.getService("remote-config")?.saveCanonical?.(cid,base);
   if(!saved?.ok)return {ok:false,reason:saved?.error||"firestore-write-failed"};
   KT.getService("navigation")?.refresh?.();
   return {ok:true,reloadRequired:true,status:target,nativeApplication:true};
 }
 const map=allowedMap(cid);if(!map)return {ok:false,reason:"no-runtime-mapping"};
 base.enabled=target==="active";
 base.lifecycle={...(base.lifecycle||{}),status:target,reason:String(reason||""),changedAt:now,changedBy:user};
 delete base.mode;
 try{
   const {db,fsMod}=await client(),configRef=fsMod.doc(db,paths().configCollectionPath,cid),prodRef=fsMod.doc(db,paths().productionDocPath),revisionRef=fsMod.doc(db,paths().metaCollectionPath,'config-revision'),revision=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
   await fsMod.runTransaction(db,async tx=>{
     const ps=await tx.get(prodRef),cur=ps.exists()?ps.data():{},mods={...(cur.modules||{})};
     const previous=mods[cid]||{},resumeProduction=target==="active"&&previous.resumeProduction===true;
     mods[cid]=target==="active"
       ? {active:resumeProduction,suppressed:false,canonicalId:cid,mappingHash:map.mappingHash,legacyFiles:map.legacyFiles,nextModules:map.nextModules,restoredAt:now,restoredWithSuiteVersion:KT.version,resumedPreviousProduction:resumeProduction}
       : {active:false,suppressed:true,canonicalId:cid,mappingHash:map.mappingHash,legacyFiles:map.legacyFiles,nextModules:map.nextModules,lifecycleStatus:target,suppressedAt:now,suppressedWithSuiteVersion:KT.version,reason:String(reason||""),resumeProduction:wasProductionLive||previous.active===true||previous.resumeProduction===true};
     tx.set(configRef,{payload:base,updatedAt:now,suiteVersion:KT.version},{merge:false});
     tx.set(prodRef,{version:1,modules:mods,updatedAt:now,updatedWithSuiteVersion:KT.version},{merge:true});
     tx.set(revisionRef,{revision,updatedAt:now,suiteVersion:KT.version},{merge:true});
   });
   const project=KT.Config?.defaults?.remoteConfig?.firebaseAppConfig?.projectId;KT.getService("firebase-budget")?.record?.(project,"reads",1,{kind:"firestore"});KT.getService("firebase-budget")?.record?.(project,"writes",3,{kind:"firestore"});
   KT.getService("canary")?.deactivate?.(cid);
   await KT.getService("remote-config")?.bootstrap?.({force:true});
   await KT.getService("production")?.fetchRemote?.();
   return {ok:true,reloadRequired:true,status:target};
 }catch(e){return {ok:false,reason:"firestore-write-failed",error:String(e?.message||e)}}
}
function disable(cid,reason="Désactivé depuis KohaTools."){return change(cid,"disabled",reason)}
function archive(cid,reason="Archivé depuis KohaTools."){return change(cid,"archived",reason)}
function restore(cid,reason="Réactivé depuis KohaTools."){return change(cid,"active",reason)}
function inventory(){return canonicalIds().map(cid=>({kind:"canonical",canonicalId:cid,title:mapped(cid)[0]?.title||cid,category:mapped(cid)[0]?.category||"Autre",...status(cid)}))}
function activeCanonicalIds(){return canonicalIds().filter(cid=>status(cid).active)}
function inactive(){return inventory().filter(x=>x.disabled||x.archived)}
function init(m,d){manifest=m;defaults=d}
KT.registerService("lifecycle",{init,status,disable,archive,restore,inventory,activeCanonicalIds,inactive,mapped,protectedId});
})(window);
