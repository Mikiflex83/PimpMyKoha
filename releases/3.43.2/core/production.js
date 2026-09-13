(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;

let manifest=null,defaults=null,remotePreview=null;
const pageState=()=>global.__KohaToolsProductionState||{version:1,source:"legacy-fallback",modules:{}};
const bootstrap=()=>global.__KohaToolsProductionBootstrap||null;

function canonicalOf(m){return defaults?.modules?.[m.id]?.config?.canonicalModule||null}
function currentMappings(cid){return (manifest?.modules||[]).filter(m=>canonicalOf(m)===cid&&(m.production20260911==="active"||m.production20260911==="production-addition"))}
function pageEntry(cid){return pageState()?.modules?.[cid]||null}
function isLive(cid){return pageEntry(cid)?.active===true}
function isSuppressed(cid){return pageEntry(cid)?.suppressed===true}
function listLive(){return Object.entries(pageState()?.modules||{}).filter(([,v])=>v?.active===true).map(([id,v])=>({canonicalId:id,...v}))}
function listSuppressed(){return Object.entries(pageState()?.modules||{}).filter(([,v])=>v?.suppressed===true).map(([id,v])=>({canonicalId:id,...v}))}
function allowedMap(cid){return bootstrap()?.modules?.[cid]||null}
function firestorePath(){const b=bootstrap();const f=b?.firestore||{};return `${f.rootCollection||"kohaTools_installations"}/${f.installationDocument||global.KohaToolsBootstrap?.installationId||"unconfigured"}/${f.runtimeCollection||"runtime"}/${f.productionDocument||"production"}`;}
async function client(){
  const svc=KT.getService("firestore");if(!svc)throw new Error("firestore-service-missing");
  return svc.load();
}
function budget(op,n=1){try{KT.getService("firebase-budget")?.record?.(bootstrap()?.firebaseAppConfig?.projectId,op,n,{kind:"firestore"})}catch(_){}}
async function verifyAssets(map){
  const root=String(bootstrap()?.assetRoot||global.KohaToolsBootstrap?.assetRoot||"").replace(/\/?$/,"/");
  if(!root)return {ok:false,error:"asset-root-missing"};
  const checked=[];
  for(const rel of map?.nextModules||[]){
    try{
      const r=await fetch(root+rel+"?promotion-check="+Date.now(),{method:"GET",cache:"no-store",credentials:"same-origin"});
      if(!r.ok)return {ok:false,error:"candidate-http-"+r.status,module:rel};
      checked.push(rel);
    }catch(e){return {ok:false,error:String(e?.message||e),module:rel};}
  }
  return {ok:true,checked};
}
function validationState(cid){return KT.getService("validation")?.get(cid)||{state:"untested"}}
function canPromote(cid){
  const map=allowedMap(cid);if(!map)return {ok:false,reason:"no-production-mapping"};
  if(map.runtimeContractSafe!==true||map.runtimeId!==cid)return {ok:false,reason:"runtime-contract-mismatch",runtimeId:map.runtimeId||null};
  if(isLive(cid))return {ok:false,reason:"already-production"};
  const life=KT.getService("lifecycle")?.status?.(cid);
  if(life&&(life.disabled||life.archived))return {ok:false,reason:"module-inactive",lifecycle:life};
  const v=validationState(cid);
  if(defaults?.productionRollout?.requireValidatedLocalStateForPromotion!==false&&v.state!=="validated")return {ok:false,reason:"not-validated",validation:v};
  const maps=currentMappings(cid);if(!maps.length)return {ok:false,reason:"manifest-mapping-missing"};
  if(maps.some(m=>m.canaryCapable!==true||!m.nextModule))return {ok:false,reason:"mapping-not-promotable"};
  return {ok:true,map,validation:v,maps};
}
async function fetchRemote(){
  try{
    const {db,fsMod}=await client(),ref=fsMod.doc(db,firestorePath()),snap=await fsMod.getDoc(ref);budget("reads",1);
    remotePreview=snap.exists()?snap.data():{version:1,modules:{}};
    if(!remotePreview.modules)remotePreview.modules={};
    return {ok:true,value:remotePreview};
  }catch(e){return {ok:false,error:String(e?.message||e)}}
}
function preview(){return remotePreview}
function remoteEntry(cid){return remotePreview?.modules?.[cid]||null}
function mappingCurrent(cid,entry){const map=allowedMap(cid);return !!(map&&entry&&entry.mappingHash===map.mappingHash)}
async function writeEntry(cid,payload){
  const {db,fsMod}=await client(),ref=fsMod.doc(db,firestorePath());
  await fsMod.runTransaction(db,async tx=>{
    const snap=await tx.get(ref),cur=snap.exists()?snap.data():{},modules={...(cur.modules||{})};
    modules[cid]=payload;
    tx.set(ref,{version:1,modules,updatedAt:new Date().toISOString(),updatedWithSuiteVersion:KT.version},{merge:true});
  });budget("reads",1);budget("writes",1);
}
async function promote(cid){
  const check=canPromote(cid);if(!check.ok)return check;
  if(defaults?.productionRollout?.verifyCandidateAssetsBeforePromotion!==false){
    const assets=await verifyAssets(check.map);if(!assets.ok)return {ok:false,reason:"candidate-verification-failed",...assets};
  }
  const payload={active:true,canonicalId:cid,mappingHash:check.map.mappingHash,legacyFiles:check.map.legacyFiles,nextModules:check.map.nextModules,promotedAt:new Date().toISOString(),promotedWithSuiteVersion:KT.version,validationState:"validated"};
  try{
    await writeEntry(cid,payload);KT.getService("canary")?.deactivate(cid);
    remotePreview=remotePreview||{version:1,modules:{}};remotePreview.modules=remotePreview.modules||{};remotePreview.modules[cid]=payload;
    KT.record({module:"production",level:"warn",kind:"promoted-global",canonicalId:cid,provider:"cloud-firestore"});
    return {ok:true,reloadRequired:true,payload};
  }catch(e){return {ok:false,reason:"firestore-write-failed",error:String(e?.message||e)}}
}
async function rollback(cid){
  const map=allowedMap(cid);if(!map)return {ok:false,reason:"no-production-mapping"};
  const payload={active:false,canonicalId:cid,mappingHash:map.mappingHash,rolledBackAt:new Date().toISOString(),rolledBackWithSuiteVersion:KT.version};
  try{
    await writeEntry(cid,payload);KT.getService("canary")?.deactivate(cid);
    remotePreview=remotePreview||{version:1,modules:{}};remotePreview.modules=remotePreview.modules||{};remotePreview.modules[cid]=payload;
    KT.record({module:"production",level:"warn",kind:"rollback-global",canonicalId:cid,provider:"cloud-firestore"});
    return {ok:true,reloadRequired:true,payload};
  }catch(e){return {ok:false,reason:"firestore-write-failed",error:String(e?.message||e)}}
}
function status(cid){const p=pageEntry(cid),map=allowedMap(cid),v=validationState(cid);return {canonicalId:cid,live:!!p?.active,pageEntry:p,mapping:map,validation:v,canPromote:canPromote(cid)}}
function globalStatus(){
  const ps=pageState(),b=bootstrap(),f=b?.firestore||{};
  return {pageSource:ps.source||"unknown",failSafeReason:ps.failSafeReason||null,fetchedAt:ps.fetchedAt||null,liveCount:listLive().length,live:listLive(),suppressedCount:listSuppressed().length,suppressed:listSuppressed(),
    bootstrapVersion:b?.suiteVersion||null,loaderVersion:b?.loaderVersion||null,provider:"cloud-firestore",firebaseProjectId:b?.firebaseAppConfig?.projectId||null,
    productionPath:`${f.rootCollection||"kohaTools_installations"}/${f.installationDocument||global.KohaToolsBootstrap?.installationId||"unconfigured"}/${f.runtimeCollection||"runtime"}/${f.productionDocument||"production"}`};
}
function init(m,d){manifest=m;defaults=d;const s=globalStatus();KT.record({module:"production",level:"info",kind:"page-production-state",source:s.pageSource,liveCount:s.liveCount,provider:"cloud-firestore"});}
KT.registerService("production",{init,isLive,isSuppressed,listLive,listSuppressed,status,globalStatus,canPromote,promote,rollback,verifyAssets,fetchRemote,preview,remoteEntry,mappingCurrent,allowedMap,currentMappings});
})(window);