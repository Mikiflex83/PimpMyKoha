(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;

let loaded=null;
function c(){return KT.Config?.effective?.remoteConfig||KT.Config?.defaults?.remoteConfig||{};}
function fcfg(){return c().firestore||{};}
function normalizedHost(){return String(global.location?.hostname||"").trim().toLowerCase();}
function currentInstallation(){return String(KT.Config?.effective?.installationId||KT.Config?.defaults?.installationId||c().installationKey||"").trim();}
function guard(){
  const rc=c(), expected=String(rc.installationId||rc.installationKey||"").trim();
  const actual=currentInstallation();
  if(expected&&actual&&expected!==actual)return {ok:false,reason:`installation-mismatch:${actual}!=${expected}`};
  const allowed=(Array.isArray(rc.allowedHosts)?rc.allowedHosts:[]).map(x=>String(x||"").trim().toLowerCase()).filter(Boolean);
  const host=normalizedHost();
  if(allowed.length&&host&&!allowed.includes(host))return {ok:false,reason:`host-not-allowed:${host}`};
  return {ok:true,reason:null};
}
function urls(){
  const v=String(fcfg().sdkVersion||"12.18.0");
  return {
    app:`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`,
    firestore:`https://www.gstatic.com/firebasejs/${v}/firebase-firestore.js`
  };
}
async function load(){
  if(loaded)return loaded;
  loaded=(async()=>{
    const g=guard();
    if(!g.ok)throw new Error(`remote-config-disabled:${g.reason}`);
    const u=urls();
    const [appMod,fsMod]=await Promise.all([import(u.app),import(u.firestore)]);
    const conf=c().firebaseAppConfig||{};
    if(!conf.projectId||!conf.apiKey)throw new Error("firebase-app-config-incomplete");
    const name=fcfg().appName||"KohaToolsSharedConfig";
    let app=(appMod.getApps?.()||[]).find(a=>a.name===name);
    if(!app)app=appMod.initializeApp(conf,name);
    const db=fsMod.getFirestore(app);
    return {app,db,appMod,fsMod,projectId:conf.projectId};
  })().catch(e=>{loaded=null;throw e;});
  return loaded;
}
function rootDocPath(){
  const f=fcfg();
  return `${f.rootCollection||"kohaTools_installations"}/${f.installationDocument||c().installationKey||c?.().installationId||global.KohaToolsBootstrap?.installationId||"unconfigured"}`;
}
function configCollectionPath(){return `${rootDocPath()}/${fcfg().configCollection||"config_modules"}`;}
function productionDocPath(){return `${rootDocPath()}/${fcfg().runtimeCollection||"runtime"}/${fcfg().productionDocument||"production"}`;}
function metaCollectionPath(){return `${rootDocPath()}/${fcfg().metaCollection||"meta"}`;}
function testingCollectionPath(){return `${rootDocPath()}/${fcfg().testingCollection||"testing_modules"}`;}
function testingRunsCollectionPath(){return `${rootDocPath()}/${fcfg().testingRunsCollection||"testing_runs"}`;}
function status(){const g=guard();return {provider:"cloud-firestore",projectId:c().firebaseAppConfig?.projectId||null,databaseId:fcfg().databaseId||"(default)",rootDocPath:rootDocPath(),configCollectionPath:configCollectionPath(),productionDocPath:productionDocPath(),metaCollectionPath:metaCollectionPath(),testingCollectionPath:testingCollectionPath(),testingRunsCollectionPath:testingRunsCollectionPath(),sdkVersion:fcfg().sdkVersion||null,guard:g};}
KT.registerService("firestore",{load,status,guard,rootDocPath,configCollectionPath,productionDocPath,metaCollectionPath,testingCollectionPath,testingRunsCollectionPath});
})(window);