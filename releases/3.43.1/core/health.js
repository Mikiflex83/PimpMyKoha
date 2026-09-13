(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
let manifest=null,defaults=null;const KEY="KohaTools.health.v1";
function parse(v,f){try{return JSON.parse(v||"")||f}catch(_){return f}}
function read(){try{return parse(localStorage.getItem(KEY),{version:1,modules:{},review:{}})}catch(_){return {version:1,modules:{},review:{}}}}
function write(v){try{localStorage.setItem(KEY,JSON.stringify(v));return true}catch(_){return false}}
function userIds(){return Object.keys(KT.Config?.effective?.canonicalModules||defaults?.canonicalModules||{}).filter(id=>KT.Config?.getCanonicalPersistent?.(id,true)?.enabled!==false)}
function kohaVersion(){return KT.getService("recipe")?.currentKohaVersion?.()||null}
function observeResult(r){if(!r?.canonicalId)return;const st=read(),cid=r.canonicalId;st.modules=st.modules||{};st.modules[cid]={canonicalId:cid,status:r.status,finalStatus:KT.getService("recipe")?.finalStatus?.(r)||r.status,proofLevel:r.proofLevel||"none",evidenceState:r.evidenceState||null,proofType:r.proofType||null,at:r.at||new Date().toISOString(),pageKey:KT.getService("testing-workspace")?.pageKey?.()||location.pathname,kohaVersion:r.kohaVersion||kohaVersion(),suiteVersion:r.suiteVersion||KT.version,fingerprint:r.fingerprint||null,recipeRevision:r.recipeRevision||null,label:r.label||"",detail:r.detail||""};st.lastScanAt=new Date().toISOString();write(st)}
function observePayload(p){for(const r of p?.results||[])observeResult(r)}
function validation(cid){return KT.getService("validation")?.get?.(cid)||{state:"untested"}}
function diagnosticsError(cid){const ids=new Set([cid]);return (KT.diagnostics||[]).some(d=>(ids.has(d.canonicalId)||ids.has(d.module))&&String(d.level||"").toLowerCase()==="error")}
function stateFor(cid){
 const st=read(),obs=st.modules?.[cid]||null,v=validation(cid),cur=kohaVersion();
 if(diagnosticsError(cid)||obs?.finalStatus==="fail"||obs?.evidenceState==="broken")return {state:"broken",label:"Anomalie",reason:obs?.detail||"Une erreur a été détectée."};
 const obsCurrentVersion=!cur||!obs?.kohaVersion||String(obs.kohaVersion)===String(cur);
 if(obs&&obsCurrentVersion&&obs.finalStatus==="pass"&&obs.proofLevel==="strong")return {state:"proven",label:"OK prouvé",reason:obs.detail||"Preuve fonctionnelle automatique obtenue."};
 if(obs&&obsCurrentVersion&&obs.finalStatus==="pass"&&obs.proofLevel==="medium")return {state:"technical-ok",label:"OK technique",reason:obs.detail||"Modification technique observée automatiquement."};
 if(cur&&v?.kohaVersion&&String(v.kohaVersion)!==String(cur)&&!(obs&&obsCurrentVersion&&["strong","medium"].includes(obs.proofLevel)))return {state:"recheck-koha",label:"À recontrôler",reason:`Validé avec Koha ${v.kohaVersion}, version actuelle ${cur}.`};
 if(obs?.evidenceState==="action-needed")return {state:"action-needed",label:"Action à exercer",reason:obs.detail||"Une action métier doit être déclenchée pour obtenir une preuve."};
 if(obs?.evidenceState==="case-not-exercised")return {state:"case-not-exercised",label:"Cas non rencontré",reason:obs.detail||"Les données de cette page ne déclenchent pas le comportement."};
 if(v?.state==="recheck"||v?.stale)return {state:"recheck-koha",label:"À recontrôler",reason:"La validation n’est plus à jour."};
 return {state:"unseen",label:"Non observé",reason:"Aucun passage récent sur un cas permettant de produire une preuve."};
}

function moduleStatus(cid){const cfg=KT.Config?.getCanonicalPersistent?.(cid,true)||{},pr=KT.getService("prerequisites")?.status?.(cid)||{ok:true,blocking:[]},h=stateFor(cid),t=KT.getHealthTelemetry?.(cid)||{},compatibility=KT.getService("compatibility")?.strategy?.(cid)||null;if(cfg.enabled===false)return {state:"disabled",label:"Désactivé",reason:"Module désactivé.",prerequisites:pr,telemetry:t,compatibility};if(!pr.ok)return {state:"setup-required",label:"À configurer",reason:`${pr.blocking.length} prérequis obligatoire(s) manquant(s).`,prerequisites:pr,telemetry:t,compatibility};return {...h,prerequisites:pr,telemetry:t,compatibility};}
function diagnose(cid){const R=KT.getService("recipe");if(!R)return {ok:false,reason:"recipe-service-missing"};const r=R.testOne?.(cid);if(r){observeResult(r);return {ok:true,result:r,status:moduleStatus(cid)}}return {ok:false,reason:"module-not-testable-on-this-page",status:moduleStatus(cid)};}
function summary(){const rows=userIds().map(cid=>({canonicalId:cid,...moduleStatus(cid)})),counts={};for(const r of rows)counts[r.state]=(counts[r.state]||0)+1;return {total:rows.length,counts,rows,kohaVersion:kohaVersion(),lastScanAt:read().lastScanAt||null}}
function details(){return summary().rows.map(r=>({...r,validation:validation(r.canonicalId),observation:read().modules?.[r.canonicalId]||null,targets:KT.getService("recipe")?.targetLinks?.(r.canonicalId)||[]}))}
function running(cid){return KT.getService("production")?.isLive?.(cid)||KT.getService("canary")?.status?.(cid)?.active||KT.modules?.has?.(cid)||global.__KohaToolsCandidateTelemetry?.[cid]?.loadOk===true}
function scanCurrentPage(opts={}){const R=KT.getService("recipe");if(!R)return {ok:false,reason:"recipe-service-missing"};const ids=(R.relevant?.({includeGlobal:true})||[]).map(x=>x.canonicalId).filter(running);const results=ids.map(id=>R.testOne?.(id)).filter(Boolean);results.forEach(observeResult);return {ok:true,passive:!!opts.passive,count:results.length,results,summary:summary()}}
function startPostUpgradeReview(){const st=read();st.review={startedAt:new Date().toISOString(),kohaVersion:kohaVersion(),suiteVersion:KT.version};st.modules={};write(st);return scanCurrentPage({passive:false})}
function init(m,d){manifest=m;defaults=d;KT.on?.("koha-tools:recipe-results",e=>observePayload(e.detail));}
KT.registerService("health",{init,summary,details,stateFor,moduleStatus,diagnose,scanCurrentPage,startPostUpgradeReview,observeResult,kohaVersion,read});
})(window);