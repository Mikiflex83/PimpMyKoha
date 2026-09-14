(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
let manifest=null,defaults=null;
const KEY_DEFAULT="KohaTools.validationStatus.v1";
function key(){return KT.Config?.effective?.validation?.storageKey||KEY_DEFAULT}
function parse(v){try{return JSON.parse(v||"null")}catch(_){return null}}
function read(){try{return parse(localStorage.getItem(key()))||{version:1,modules:{}}}catch(_){return {version:1,modules:{}}}}
function write(v){try{localStorage.setItem(key(),JSON.stringify(v));return true}catch(_){return false}}
function canonicalOf(m){return defaults?.modules?.[m.id]?.config?.canonicalModule||m?.canonicalModule||null}
function mappings(canonicalId){return (manifest?.modules||[]).filter(m=>canonicalOf(m)===canonicalId)}
function get(canonicalId){
 const all=read(),stored=all.modules?.[canonicalId]||{state:"untested",notes:"",updatedAt:null};
 if(stored.state==="validated"){
   const now=KT.getService("recipe")?.fingerprint?.(canonicalId);
   // Migration V3.40.2 : les validations réalisées avant l'introduction des empreintes
   // restent valides. On fixe silencieusement leur empreinte de départ dans le navigateur
   // afin de ne pas faire perdre le travail déjà validé, tout en permettant aux futures
   // modifications de recette/configuration de déclencher normalement un recheck.
   if(now&&!stored.fingerprint){
     const migrated={...stored,fingerprint:now,recipeRevision:KT.getService("recipe")?.configuredRecipe?.(canonicalId)?.revision||null,suiteVersion:stored.suiteVersion||KT.version||null,legacyGrandfathered:true,legacyGrandfatheredAt:new Date().toISOString()};
     all.modules=all.modules||{};all.modules[canonicalId]=migrated;write(all);return migrated;
   }
   if(now&&stored.fingerprint&&now!==stored.fingerprint)return {...stored,state:"recheck",previousState:"validated",stale:true,staleReason:"recipe-or-config-changed",currentFingerprint:now};
 }
 return stored;
}
function set(canonicalId,state,notes="",meta={}){
 const allowed=KT.Config?.effective?.validation?.allowedStates||["untested","canary","validated","recheck","rejected"];
 if(!allowed.includes(state))return {ok:false,reason:"invalid-state"};
 const all=read();all.modules=all.modules||{};
 const fp=meta.fingerprint||KT.getService("recipe")?.fingerprint?.(canonicalId)||null;
 all.modules[canonicalId]={state,notes:String(notes||""),updatedAt:new Date().toISOString(),fingerprint:state==="validated"?fp:(meta.fingerprint||null),recipeRevision:meta.recipeRevision||KT.getService("recipe")?.configuredRecipe?.(canonicalId)?.revision||null,kohaVersion:meta.kohaVersion||null,suiteVersion:meta.suiteVersion||KT.version||null,pageKey:meta.pageKey||null};
 write(all);KT.getService("testing-workspace")?.saveValidation?.(canonicalId,all.modules[canonicalId]);
 return {ok:true,value:all.modules[canonicalId]};
}
function applyShared(sharedModules){
 const all=read();all.modules=all.modules||{};let count=0;
 for(const [cid,doc] of Object.entries(sharedModules||{})){
   const rv=doc?.validation;if(!rv)continue;const lv=all.modules[cid];
   const remoteOlderOrEqual=String(rv.updatedAt||"")<=String(lv?.updatedAt||"");
   const keepMigratedLocal=!!(lv?.legacyGrandfathered&&lv?.fingerprint&&rv?.state==="validated"&&!rv?.fingerprint&&remoteOlderOrEqual);
   if(!keepMigratedLocal&&(!lv||String(rv.updatedAt||"")>=String(lv.updatedAt||""))){
     all.modules[cid]={state:rv.state||"untested",notes:String(rv.notes||""),updatedAt:rv.updatedAt||null,fingerprint:rv.fingerprint||null,recipeRevision:rv.recipeRevision||null,kohaVersion:rv.kohaVersion||null,suiteVersion:rv.suiteVersion||null,pageKey:rv.pageKey||null};count++;
   }
 }
 write(all);return {ok:true,count};
}
function clear(canonicalId){const all=read();if(all.modules)delete all.modules[canonicalId];write(all);return true}
function retirementReadiness(canonicalId){
 const maps=mappings(canonicalId),cfg=KT.Config?.getCanonical?.(canonicalId)||{};
 const validation=get(canonicalId);
 const approvedSourceStatuses=new Set(["exact-snapshot","approved-current-reference-v10","native-canonical"]);
 const sourceStates=maps.map(m=>({
   legacyFile:m.legacyFile,
   sourceProvenance:m.sourceProvenance||null,
   sourceStatus:m.sourceStatus||"missing",
   sourceMissing:!approvedSourceStatuses.has(m.sourceStatus||"missing"),
   nextModule:!!m.nextModule,
   migrationStatus:m.migrationStatus||""
 }));
 const exactOrApproved=sourceStates.length>0 && sourceStates.every(s=>!s.sourceMissing);
 const nextPresent=maps.length>0 && maps.every(m=>!!m.nextModule);
 const known=maps.length>0;
 const validated=validation.state==="validated";
 const canaryActive=!!KT.getService?.("canary")?.status(canonicalId)?.active;
 const blockers=[];
 if(!validated)blockers.push("not-validated");
 if(!exactOrApproved)blockers.push("source-missing");
 if(!nextPresent)blockers.push("next-module-missing");
 if(!known)blockers.push("legacy-mapping-missing");
 if(canaryActive)blockers.push("canary-still-active");
 return {canonicalId,ready:blockers.length===0,blockers,validation,mappings:sourceStates,canonicalMode:cfg.mode||"legacy"};
}
function allReadiness(){
 const ids=[...new Set((manifest?.modules||[]).map(canonicalOf).filter(Boolean))];
 return ids.map(retirementReadiness);
}
function exportState(){
 return {schema:"KohaTools.validation.v1",exportedAt:new Date().toISOString(),data:read()};
}
function importState(payload){
 if(!payload||payload.schema!=="KohaTools.validation.v1"||!payload.data?.modules)return {ok:false,reason:"invalid-payload"};
 write(payload.data);return {ok:true,count:Object.keys(payload.data.modules||{}).length};
}
function risk(canonicalId){
 const maps=mappings(canonicalId),cfg=KT.Config?.getCanonical?.(canonicalId)||{};
 let score=0,reasons=[];
 if(maps.length>1){score+=2;reasons.push("merged-module")}
 const sizeHints=maps.map(m=>Number(m.sourceSize||0)).filter(Boolean);
 if(sizeHints.some(x=>x>50000)){score+=3;reasons.push("large-source")}
 else if(sizeHints.some(x=>x>15000)){score+=2;reasons.push("medium-source")}
 const fam=String(maps[0]?.family||"");
 if(/autocomplete|firebase|share|timeline|movement|transfer|history|quality|assistant/i.test(fam)){score+=2;reasons.push("complex-family")}
 if(cfg?.advanced?.parityStrategy==="exact-legacy-sealed")score=Math.max(0,score-1);
 return {score,level:score>=5?"high":score>=3?"medium":"low",reasons};
}
function recommendedOrder(){
 const ids=[...new Set((manifest?.modules||[]).map(canonicalOf).filter(Boolean))];
 return ids.map(id=>({canonicalId:id,risk:risk(id),readiness:retirementReadiness(id)}))
   .sort((a,b)=>a.risk.score-b.risk.score || a.canonicalId.localeCompare(b.canonicalId));
}
function init(m,d){manifest=m;defaults=d}
KT.registerService("validation",{init,read,get,set,clear,applyShared,retirementReadiness,allReadiness,exportState,importState,risk,recommendedOrder});
})(window);