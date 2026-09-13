(function(global){
"use strict";
if(global.__KohaToolsV3432Loaded)return;
global.__KohaToolsV3432Loaded=true;
global.__KohaToolsBootStarted=performance.now();

const VERSION="3.43.2";
const BOOT=(global.KohaToolsBootstrap&&typeof global.KohaToolsBootstrap==="object")?global.KohaToolsBootstrap:{};
const ROOT=String(BOOT.assetRoot||new URL("./",document.currentScript?.src||location.href).href).replace(/\/?$/,"/");
const MANIFEST_URL=BOOT.manifestUrl||null,DEFAULTS_URL=BOOT.defaultsUrl||null;
const bust=u=>u+(String(u).includes("?")?"&":"?")+"ktv="+encodeURIComponent(VERSION);

function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=bust(src);s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error(src));document.head.appendChild(s)})}
function loadCss(href){const l=document.createElement("link");l.rel="stylesheet";l.href=bust(href);document.head.appendChild(l)}
async function getJson(pathOrUrl){const u=/^(?:https?:)?\/\//i.test(pathOrUrl)||String(pathOrUrl).startsWith("/")?pathOrUrl:ROOT+pathOrUrl;const r=await fetch(bust(u),{cache:"no-store",credentials:"same-origin"});if(!r.ok)throw new Error(String(pathOrUrl));return r.json()}
function pageName(){return String(location.pathname||"").split("/").filter(Boolean).pop()||""}
function wildcard(pattern){const e=String(pattern).replace(/[.+?^${}()|[\]\\]/g,"\\$&").replace(/\*/g,".*");return new RegExp("^"+e+"$","i")}
function scopeAllows(scope){scope=scope||{};const page=pageName(),inc=scope.include||["*"],exc=scope.exclude||[];if(!inc.some(p=>wildcard(p).test(page)))return false;if(exc.some(p=>wildcard(p).test(page)))return false;const qs=new URLSearchParams(location.search);for(const[k,e]of Object.entries(scope.matchQuery||{})){const a=qs.get(k);if(Array.isArray(e)){if(!e.map(String).includes(String(a)))return false}else if(e===null){if(!qs.has(k))return false}else if(String(a)!==String(e))return false}return true}
function normalizeConfiguredCssText(value){
 let s=String(value||"");
 if(s.includes("\\n")||s.includes("\\r")||s.includes("\\t")){
   s=s.replace(/\\r\\n/g,"\n").replace(/\\n/g,"\n").replace(/\\t/g,"\t");
 }
 return s;
}
function keepConfiguredCssLast(){
 const head=document.head;if(!head||global.__KohaToolsCssPriorityMoving)return;
 const styles=[...head.querySelectorAll('style[data-koha-tools-configured-css="1"]')];
 if(!styles.length)return;
 const tail=[...head.children].slice(-styles.length);
 if(tail.length===styles.length&&tail.every((n,i)=>n===styles[i]))return;
 global.__KohaToolsCssPriorityMoving=true;
 try{styles.forEach(s=>head.appendChild(s))}finally{
   setTimeout(()=>{global.__KohaToolsCssPriorityMoving=false},0);
 }
}
function ensureConfiguredCssPriorityObserver(){
 if(global.__KohaToolsCssPriorityObserver||!document.head)return;
 let timer=null;
 const obs=new MutationObserver(()=>{
   if(global.__KohaToolsCssPriorityMoving)return;
   clearTimeout(timer);timer=setTimeout(keepConfiguredCssLast,0);
 });
 obs.observe(document.head,{childList:true});
 global.__KohaToolsCssPriorityObserver=obs;
}
function injectConfiguredCss(canonicalId,cfg){
 if(!canonicalId||!cfg?.appearance)return;
 const a=cfg.appearance;
 const defaultCss=a.injectDefaultCss===false?"":normalizeConfiguredCssText(a.defaultCss||"");
 const customCss=normalizeConfiguredCssText(a.customCss||"");
 const css=[defaultCss,customCss].filter(x=>x&&x.trim()).join("\n");
 const id="kt-config-css-"+String(canonicalId).replace(/[^a-z0-9_-]/gi,"-");
 let s=document.getElementById(id);
 if(!css.trim()){
   if(s)s.remove();
   return;
 }
 if(!s){
   s=document.createElement("style");s.id=id;s.dataset.kohaToolsConfiguredCss="1";
   document.head.appendChild(s);
 }
 s.dataset.kohaToolsCanonicalId=canonicalId;
 s.dataset.kohaToolsDefaultCss=defaultCss.trim()?"1":"0";
 s.dataset.kohaToolsCustomCss=customCss.trim()?"1":"0";
 s.textContent=css;
 ensureConfiguredCssPriorityObserver();
 keepConfiguredCssLast();
 global.__KohaToolsConfiguredCssStatus=global.__KohaToolsConfiguredCssStatus||{};
 global.__KohaToolsConfiguredCssStatus[canonicalId]={
   active:true,styleId:id,defaultCss:!!defaultCss.trim(),customCss:!!customCss.trim(),
   defaultLength:defaultCss.length,customLength:customCss.length,at:new Date().toISOString()
 };
}

function beginCandidateTelemetry(canonicalId,nextModule,mode){
 if(!canonicalId)return null;
 global.__KohaToolsCandidateTelemetry=global.__KohaToolsCandidateTelemetry||{};
 const t=global.__KohaToolsCandidateTelemetry[canonicalId]=Object.assign(global.__KohaToolsCandidateTelemetry[canonicalId]||{},
   {canonicalId,nextModule,mode,page:pageName(),loadStartedAt:new Date().toISOString(),loadOk:false,mutationCount:0,addedNodes:0,attributeChanges:0,textChanges:0});
 let observer=null;
 try{
   observer=new MutationObserver(records=>{for(const r of records){t.mutationCount++;if(r.type==="childList")t.addedNodes+=r.addedNodes?.length||0;else if(r.type==="attributes")t.attributeChanges++;else if(r.type==="characterData")t.textChanges++}});
   observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
 }catch(_){}
 return {t,observer};
}
function finishCandidateTelemetry(ctx,ok,error){
 if(!ctx)return;try{const extra=ctx.observer?.takeRecords?.()||[];for(const r of extra){ctx.t.mutationCount++;if(r.type==="childList")ctx.t.addedNodes+=r.addedNodes?.length||0;else if(r.type==="attributes")ctx.t.attributeChanges++;else if(r.type==="characterData")ctx.t.textChanges++}}catch(_){}
 try{ctx.observer?.disconnect?.()}catch(_){}
 ctx.t.loadOk=!!ok;ctx.t.loadFinishedAt=new Date().toISOString();ctx.t.runtimeRegistered=KohaTools.modules?.has?.(ctx.t.canonicalId)===true;if(error)ctx.t.error=String(error?.message||error);
}

async function boot(){
 loadCss(ROOT+"ui/koha-tools.css");loadCss(ROOT+"admin/panel.css");
 for(const f of [
   "core/core.js","core/access-control.js","core/update-service.js","core/config-origin.js","core/maintenance.js","core/performance.js","core/discovery.js","core/installation-profile.js","core/compatibility.js","core/late-ready-compat.js","core/platform.js","core/storage.js","core/gateway.js","core/architecture-audit.js","core/config.js","core/prerequisites.js","core/koha-adapter.js","core/config-migrations.js","core/firebase-module.js","core/firestore.js","core/firestore-auth.js","core/firebase-budget.js","core/taxonomy.js","core/remote-config.js","core/production.js","core/lifecycle.js","core/canary.js","core/validation.js","core/testing-workspace.js","core/retirement-report.js","core/validation-dashboard.js","core/recipe.js","core/health.js",
   "core/dom.js","core/date.js","core/table.js","core/serials.js","core/cataloging-assistant.js","core/scope.js","core/targets.js","core/clipboard.js","core/actions.js","core/ui.js","core/assets.js","core/capabilities.js","core/observe.js","core/sidebar.js","core/home-layout.js","core/module-host.js","core/navigation.js",
   "admin/panel.js"
 ])await loadScript(ROOT+f);

 const[manifest,productDefaults]=await Promise.all([getJson(MANIFEST_URL||"config/manifest.json"),getJson(DEFAULTS_URL||"config/product-defaults.json")]);
 const merge=(a,b)=>{if(Array.isArray(b))return b.slice();if(b&&typeof b==="object"){const o=(a&&typeof a==="object"&&!Array.isArray(a))?{...a}:{};for(const[k,v]of Object.entries(b))o[k]=merge(o[k],v);return o}return b===undefined?a:b};
 let profile={};const profileUrl=BOOT.profileUrl||((BOOT.installationId&&BOOT.autoLoadProfile!==false)?`profiles/${encodeURIComponent(BOOT.installationId)}.json`:"");if(profileUrl){try{profile=await getJson(profileUrl)}catch(e){KohaTools.record?.({module:"loader",level:"warn",kind:"profile-not-loaded",message:String(e?.message||e)})}}
 KohaTools.productDefaults=productDefaults;KohaTools.profile=profile||{};const defaults=merge(productDefaults,profile||{});defaults.installationId=BOOT.installationId||defaults.installationId||defaults.installation?.id||"";defaults.deployment=merge(defaults.deployment||{},{mode:BOOT.deploymentMode||defaults.deployment?.mode||"fresh-install"});KohaTools.deploymentMode=defaults.deployment.mode;KohaTools.profile=profile;KohaTools.Config.setDefaults(defaults);global.__KohaToolsManifest=manifest;global.__KohaToolsProductDefaults=productDefaults;
 const access=KohaTools.getService("access-control");access?.init?.(defaults);
 if(access?.can?.("developer")&&access?.channel?.()==="dev"){try{await loadScript(ROOT+"dev/developer-tools.js")}catch(e){KohaTools.record?.({module:"loader",level:"warn",kind:"developer-tools-not-loaded",message:String(e?.message||e)})}}
 if(KohaTools.deploymentMode==="migration"){
   const pbUrl=defaults.deployment?.productionBootstrapUrl||profile?.deployment?.productionBootstrapUrl||"";
   if(pbUrl){try{const pb=await getJson(pbUrl);pb.assetRoot=ROOT;pb.suiteVersion=VERSION;pb.loaderVersion=VERSION;global.__KohaToolsProductionBootstrap=pb}catch(e){KohaTools.record?.({module:"loader",level:"warn",kind:"production-bootstrap-not-loaded",message:String(e?.message||e)})}}
 }
 KohaTools.getService("production")?.init(manifest,defaults);
 KohaTools.getService("lifecycle")?.init(manifest,defaults);
 KohaTools.getService("canary")?.init(manifest,defaults);
 KohaTools.getService("validation")?.init(manifest,defaults);
 KohaTools.getService("testing-workspace")?.init(manifest,defaults);
 KohaTools.getService("recipe")?.init(manifest,defaults);
 KohaTools.getService("compatibility")?.init(manifest,defaults);
 KohaTools.getService("health")?.init(manifest,defaults);
 KohaTools.getService("maintenance")?.init(manifest,defaults);
 KohaTools.getService("performance")?.init(defaults);
 KohaTools.getService("discovery")?.init(manifest,defaults);
 KohaTools.getService("admin-ui")?.init(manifest,defaults);
 KohaTools.getService("updates")?.init?.(defaults);
 await KohaTools.getService("remote-config")?.bootstrap?.();
 KohaTools.getService("canary")?.sanitize?.();
 // Espace de recette chargé uniquement à la demande : aucune lecture Firestore sur chaque page Koha.

 const loaded=new Set();
 for(const mod of manifest.modules){
   const mode=KohaTools.Config.modeForManifestModule?KohaTools.Config.modeForManifestModule(mod.id):KohaTools.Config.mode(mod.id);
   const moduleCfg=KohaTools.Config.getModule(mod.id)?.config||{},canonicalId=moduleCfg.canonicalModule,canonicalCfg=canonicalId?KohaTools.Config.getCanonical(canonicalId):null;
   const freshCanary=KohaTools.deploymentMode==="fresh-install"&&canonicalId&&KohaTools.getService("canary")?.shouldRunLive?.(canonicalId)===true;
   if(KohaTools.deploymentMode==="fresh-install"&&mod.freshInstall?.supported!==true&&!freshCanary)continue; if(!mod.nextModule||!["shadow","live"].includes(mode))continue;
   if(canonicalId&&!KohaTools.getService("access-control")?.moduleAllowed?.(canonicalId)){KohaTools.record?.({module:mod.id,level:"info",kind:"module-blocked-access",canonicalId});continue;}
   const effectiveScope=canonicalCfg?.general?.scope||moduleCfg.scope||mod.scope||{include:["*"]}; if(KohaTools.deploymentMode==="fresh-install"&&canonicalId){const gate=KohaTools.getService("prerequisites")?.status?.(canonicalId);if(gate&&!gate.ok){KohaTools.record?.({module:mod.id,level:"info",kind:"module-blocked-prerequisites",blocking:gate.blocking.map(x=>x.id)});continue;}}
   if(!scopeAllows(effectiveScope))continue;
   if((effectiveScope.requireSelectors||[]).length&&!(effectiveScope.requireSelectors||[]).every(sel=>document.querySelector(sel)))continue;
   if(loaded.has(mod.nextModule))continue;loaded.add(mod.nextModule);
   global.__KohaToolsLoadingCandidate=true;
   const healthTelemetry=beginCandidateTelemetry(canonicalId,mod.nextModule,mode);
   try{
     await loadScript(ROOT+mod.nextModule);
     await new Promise(r=>setTimeout(r,0));
     finishCandidateTelemetry(healthTelemetry,true);
     if(mode==="live"&&canonicalId){
       const runtimeOk=KohaTools.modules?.has?.(canonicalId)===true;
       if(!runtimeOk){
         KohaTools.record({module:mod.id,level:"error",kind:"runtime-contract-failed-after-load",canonicalId,nextModule:mod.nextModule});
         const canary=KohaTools.getService("canary");
         if(canary?.status?.(canonicalId)?.active===true){
           canary.deactivate(canonicalId);
           if(!global.__KohaToolsRuntimeRecoveryReload){
             global.__KohaToolsRuntimeRecoveryReload=true;
             setTimeout(()=>location.reload(),30);
           }
         }else{
           document.documentElement.dataset.kohaToolsRuntimeContractError=canonicalId;
         }
         continue;
       }
       injectConfiguredCss(canonicalId,canonicalCfg);
     }
   }catch(e){
     finishCandidateTelemetry(healthTelemetry,false,e);
     KohaTools.record({module:mod.id,level:"error",kind:"module-load-failed",message:String(e?.message||e)});
   }finally{
     global.__KohaToolsLoadingCandidate=false;
   }
 }
 await loadScript(ROOT+"core/diagnostics.js");
 global.__KohaToolsBootTelemetry={startedAtMs:global.__KohaToolsBootStarted,finishedAtMs:performance.now(),durationMs:Math.round((performance.now()-global.__KohaToolsBootStarted)*10)/10,at:new Date().toISOString()};KohaTools.emit("koha-tools:ready",{version:KohaTools.version});
 setTimeout(()=>KohaTools.getService("health")?.scanCurrentPage?.({passive:true}),1200);
}
boot().catch(e=>{document.documentElement.dataset.kohaToolsV3432BootError="1";console.error("KohaTools boot",e)});
})(window);
