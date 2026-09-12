(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
let manifest=null,defaults=null;
const state={source:"not-loaded",modules:{},runs:{},lastSyncAt:null,lastWriteAt:null,lastError:null};

function cfg(){return KT.Config?.effective?.testingWorkspace||KT.Config?.defaults?.testingWorkspace||{}}
function enabled(){return cfg().enabled!==false}
function pageKey(){
  const u=new URL(location.href);
  const q=[...u.searchParams.entries()].sort((a,b)=>a[0].localeCompare(b[0])||String(a[1]).localeCompare(String(b[1])));
  const qs=new URLSearchParams(q).toString();
  return u.pathname+(qs?"?"+qs:"");
}
function runDocId(key=pageKey()){
  let s=encodeURIComponent(String(key)).replace(/%/g,"_");
  if(s.length>900)s=s.slice(0,900);
  return s||"root";
}
async function client(){
  const svc=KT.getService("firestore");if(!svc)throw new Error("firestore-service-missing");
  return svc.load();
}
function paths(){return KT.getService("firestore")?.status?.()||{}}
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v))}
function capHistory(a,n){a=Array.isArray(a)?a:[];return a.slice(-Math.max(1,Number(n)||40))}
function safeResult(r){return {
  canonicalId:String(r?.canonicalId||""),status:String(r?.status||""),
  label:String(r?.label||""),detail:String(r?.detail||""),manual:!!r?.manual,manualOnly:!!r?.manualOnly,
  checks:Array.isArray(r?.checks)?JSON.parse(JSON.stringify(r.checks)):[],manualChecks:Array.isArray(r?.manualChecks)?JSON.parse(JSON.stringify(r.manualChecks)):[],targets:Array.isArray(r?.targets)?JSON.parse(JSON.stringify(r.targets)):[],
  recipeRevision:r?.recipeRevision||null,fingerprint:r?.fingerprint||null,kohaVersion:r?.kohaVersion||null,suiteVersion:r?.suiteVersion||KT.version,
  at:String(r?.at||new Date().toISOString())
}}

async function bootstrap(options={}){
  if(!enabled()){state.source="disabled";return {ok:true,source:"disabled"}}
  const full=options.full===true;
  try{
    const {db,fsMod}=await client(),p=paths(),budget=KT.getService("firebase-budget"),project=KT.Config?.defaults?.remoteConfig?.firebaseAppConfig?.projectId;
    let mods=state.modules||{},count=0;
    if(full){const snap=await fsMod.getDocs(fsMod.collection(db,p.testingCollectionPath));budget?.record?.(project,"reads",snap.size,{kind:"firestore"});mods={};snap.forEach(ds=>mods[ds.id]=ds.data()||{});count=snap.size;state.modules=mods;KT.getService("validation")?.applyShared?.(mods)}
    const key=pageKey(),rid=runDocId(key),rr=await fsMod.getDoc(fsMod.doc(db,p.testingRunsCollectionPath,rid));budget?.record?.(project,"reads",1,{kind:"firestore"});state.runs={[key]:rr.exists()?rr.data():null};
    state.source=full?(count?"firestore":"firestore-empty"):"firestore-page-only";state.lastSyncAt=new Date().toISOString();state.lastError=null;KT.getService("recipe")?.applyShared?.(mods,state.runs[key]);KT.record({module:"testing-workspace",level:"info",kind:"workspace-loaded",count,pageKey:key,full});return {ok:true,source:state.source,count,run:state.runs[key]};
  }catch(e){state.lastError=String(e?.message||e);state.source="local-fallback";KT.record({module:"testing-workspace",level:"warn",kind:"workspace-fallback-local",error:state.lastError});return {ok:false,source:"local-fallback",error:state.lastError}}
}
function get(cid){return clone(state.modules[cid]||null)}
function validation(cid){return clone(state.modules[cid]?.validation||null)}
function currentPageRun(){return clone(state.runs[pageKey()]||null)}
function currentPageResults(){
  const out=[];
  for(const [cid,m] of Object.entries(state.modules)){
    const x=m?.lastResult;if(x&&x.pageKey===pageKey())out.push(clone(x));
  }
  return out.sort((a,b)=>String(a.at||"").localeCompare(String(b.at||"")));
}
function visualApproval(cid,key=pageKey()){
  const a=state.modules[cid]?.visualApprovals||[];
  return clone(a.find(x=>x.pageKey===key&&(x.status||x.ok!==undefined))||null);
}
async function patchModule(cid,patch,historyEvent){
  if(!enabled())return {ok:false,error:"workspace-disabled"};
  try{
    const {db,fsMod}=await client(),ref=fsMod.doc(db,paths().testingCollectionPath,cid),budget=KT.getService("firebase-budget"),project=KT.Config?.defaults?.remoteConfig?.firebaseAppConfig?.projectId;
    let committed=null;
    await fsMod.runTransaction(db,async tx=>{
      const snap=await tx.get(ref),cur=snap.exists()?snap.data():{};
      const next={...cur,...clone(patch),canonicalId:cid,updatedAt:new Date().toISOString(),updatedWithSuiteVersion:KT.version};
      if(historyEvent)next.history=capHistory([...(cur.history||[]),historyEvent],cfg().keepHistory||40);
      tx.set(ref,next,{merge:false});committed=next;
    });
    budget?.record?.(project,"reads",1,{kind:"firestore"});budget?.record?.(project,"writes",1,{kind:"firestore"});
    state.modules[cid]=committed||{};
    state.lastWriteAt=new Date().toISOString();state.lastError=null;
    return {ok:true,value:clone(state.modules[cid])};
  }catch(e){state.lastError=String(e?.message||e);return {ok:false,error:state.lastError}}
}
async function saveValidation(cid,v){
  const validation={state:String(v?.state||"untested"),notes:String(v?.notes||""),updatedAt:String(v?.updatedAt||new Date().toISOString()),fingerprint:v?.fingerprint||null,recipeRevision:v?.recipeRevision||null,kohaVersion:v?.kohaVersion||null,pageKey:v?.pageKey||null,suiteVersion:v?.suiteVersion||KT.version};
  return patchModule(cid,{validation},{type:"validation",...validation,at:validation.updatedAt});
}
async function saveResult(r,ctx={}){
  const cid=String(r?.canonicalId||"");if(!cid)return {ok:false,error:"canonical-id-missing"};
  const lastResult={...safeResult(r),pageKey:String(ctx.pageKey||pageKey()),url:String(ctx.url||location.href),page:String(ctx.page||""),suiteVersion:KT.version};
  return patchModule(cid,{lastResult},{type:"test-result",...lastResult});
}
async function saveResults(payload){
  const rs=payload?.results||[],ctx={pageKey:payload?.pageKey||pageKey(),url:payload?.url||location.href,page:payload?.page||""},out=[];
  for(const r of rs)out.push(await saveResult(r,ctx));
  return {ok:out.every(x=>x.ok),count:out.length,results:out};
}
async function saveVisualApproval(cid,approval){
  const key=String(approval?.pageKey||pageKey()),now=String(approval?.at||new Date().toISOString());
  const cur=state.modules[cid]||{},arr=(cur.visualApprovals||[]).filter(x=>x.pageKey!==key);
  const status=String(approval?.status||(approval?.ok===false?"issue":"pass"));
  arr.push({pageKey:key,status,ok:status==="pass",notes:String(approval?.notes||""),at:now,fingerprint:approval?.fingerprint||null,recipeRevision:approval?.recipeRevision||null,suiteVersion:KT.version});
  return patchModule(cid,{visualApprovals:arr.slice(-20)},{type:"manual-review",pageKey:key,status,ok:status==="pass",notes:String(approval?.notes||""),at:now,fingerprint:approval?.fingerprint||null});
}
async function saveRun(run){
  if(!enabled())return {ok:false,error:"workspace-disabled"};
  const key=String(run?.pageKey||pageKey()),id=runDocId(key);
  try{
    const {db,fsMod}=await client(),ref=fsMod.doc(db,paths().testingRunsCollectionPath,id);
    const payload={...clone(run),pageKey:key,updatedAt:new Date().toISOString(),updatedWithSuiteVersion:KT.version};
    await fsMod.setDoc(ref,payload,{merge:false});
    KT.getService("firebase-budget")?.record?.(KT.Config?.defaults?.remoteConfig?.firebaseAppConfig?.projectId,"writes",1,{kind:"firestore"});
    state.runs[key]=payload;state.lastWriteAt=new Date().toISOString();state.lastError=null;
    return {ok:true,value:clone(payload)};
  }catch(e){state.lastError=String(e?.message||e);return {ok:false,error:state.lastError}}
}
async function finishRun(extra={}){
  const cur=currentPageRun()||{};
  return saveRun({...cur,...clone(extra),pageKey:pageKey(),phase:extra.phase||"done",doneAt:extra.doneAt||new Date().toISOString()});
}
function status(){return {...state,modules:undefined,runs:undefined,moduleCount:Object.keys(state.modules||{}).length,pageKey:pageKey(),sharedRun:currentPageRun(),enabled:enabled(),paths:paths()}}
function init(m,d){manifest=m;defaults=d}
KT.registerService("testing-workspace",{init,bootstrap,status,get,validation,currentPageRun,currentPageResults,visualApproval,saveValidation,saveResult,saveResults,saveVisualApproval,saveRun,finishRun,pageKey});
})(window);
