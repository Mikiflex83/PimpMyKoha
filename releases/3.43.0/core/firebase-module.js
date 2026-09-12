(function(global){
  "use strict";
  const KT=global.KohaTools=global.KohaTools||{};
  function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
  function currentInstallation(){return String(KT.Config?.effective?.installationId||KT.Config?.defaults?.installationId||KT.Config?.effective?.remoteConfig?.installationKey||KT.Config?.defaults?.remoteConfig?.installationKey||"").trim();}
  function currentHost(){return String(global.location?.hostname||"").toLowerCase();}
  function raw(moduleId,provided){
    if(provided&&typeof provided==="object") return clone(provided);
    return clone(KT.Config?.getCanonical?.(moduleId)?.firebase||null);
  }
  function problem(moduleId,provided){
    const c=raw(moduleId,provided);
    if(!c||c.enabled===false)return `Connexion Firebase du module « ${moduleId} » non configurée.`;
    const kind=String(c.kind||"firestore").toLowerCase();
    const required=["apiKey","projectId","appId"];
    if(kind==="rtdb")required.push("databaseURL");
    const missing=required.filter(k=>!String(c[k]||"").trim());
    if(missing.length)return `Connexion Firebase du module « ${moduleId} » incomplète : ${missing.join(", ")}.`;
    const iid=String(c.installationId||"").trim(),cur=currentInstallation();
    if(iid&&cur&&iid!==cur)return `Connexion Firebase du module « ${moduleId} » prévue pour « ${iid} », installation courante « ${cur} ».`;
    const hosts=Array.isArray(c.allowedHosts)?c.allowedHosts.map(x=>String(x).toLowerCase().trim()).filter(Boolean):[];
    if(hosts.length&&!hosts.includes(currentHost()))return `Connexion Firebase du module « ${moduleId} » non autorisée sur l’hôte ${currentHost()||"inconnu"}.`;
    return "";
  }
  function get(moduleId,provided,{throwOnError=false}={}){
    const c=raw(moduleId,provided),err=problem(moduleId,c);
    if(err){if(throwOnError)throw new Error(err);return null;}
    return c;
  }
  function publicConfig(moduleId,provided,{throwOnError=false}={}){
    const c=get(moduleId,provided,{throwOnError}); if(!c)return null;
    const out={};
    for(const k of ["apiKey","authDomain","databaseURL","projectId","storageBucket","messagingSenderId","appId","measurementId"]){if(c[k]!=null&&String(c[k]).trim()!=="")out[k]=c[k];}
    return out;
  }
  function status(moduleId){const c=raw(moduleId),err=problem(moduleId,c);return {moduleId,configured:!err,problem:err||null,projectId:c?.projectId||null,kind:c?.kind||null,installationId:currentInstallation(),host:currentHost(),appName:c?.appName||null,sdkVersion:c?.sdkVersion||null};}
  KT.registerService?.("firebase-module",{get,require:(id,c)=>get(id,c,{throwOnError:true}),publicConfig,problem,status,currentInstallation,currentHost});
})(window);
