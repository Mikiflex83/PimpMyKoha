(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
function cfg(){return KT.Config?.effective?.firebaseBudget||KT.Config?.defaults?.firebaseBudget||{}}
function key(){return cfg().storageKey||"KohaTools.firebaseBudget.v1"}
function day(){return new Date().toISOString().slice(0,10)}
function month(){return new Date().toISOString().slice(0,7)}
function read(){try{const x=JSON.parse(localStorage.getItem(key())||"{}");return x&&typeof x==="object"?x:{}}catch(_){return {}}}
function prune(x){const keepDays=35,keepMonths=13,now=Date.now();for(const p of Object.values(x.projects||{})){for(const d of Object.keys(p.days||{})){const t=Date.parse(d+'T00:00:00Z');if(Number.isFinite(t)&&now-t>keepDays*86400000)delete p.days[d]}const months=Object.keys(p.months||{}).sort().reverse();for(const m of months.slice(keepMonths))delete p.months[m]}return x}
function write(x){try{localStorage.setItem(key(),JSON.stringify(prune(x)));return true}catch(_){return false}}
function ensureProject(root,projectId,kind){root.projects=root.projects||{};const p=root.projects[projectId]||(root.projects[projectId]={kind,days:{},months:{},listeners:{active:0,peak:0}});p.kind=kind||p.kind;return p}
function record(projectId,op,count=1,meta={}){if(cfg().enabled===false||!projectId)return;const root=read(),p=ensureProject(root,projectId,meta.kind||"firestore"),d=day(),m=month();p.days[d]=p.days[d]||{reads:0,writes:0,deletes:0,reconnects:0,queries:0};p.months[m]=p.months[m]||{downloadBytesEstimated:0};const n=Math.max(0,Number(count)||0);if(op in p.days[d])p.days[d][op]+=n;if(op==="downloadBytesEstimated")p.months[m].downloadBytesEstimated+=n;p.lastAt=new Date().toISOString();write(root)}
function listenerStart(projectId,label,kind="firestore"){const root=read(),p=ensureProject(root,projectId,kind);p.listeners.active=(p.listeners.active||0)+1;p.listeners.peak=Math.max(p.listeners.peak||0,p.listeners.active);p.listeners[label||"listener"]=(p.listeners[label||"listener"]||0)+1;write(root);record(projectId,"reconnects",1,{kind});let done=false;return()=>{if(done)return;done=true;const r=read(),q=ensureProject(r,projectId,kind);q.listeners.active=Math.max(0,(q.listeners.active||0)-1);write(r)}}
function status(projectId){const root=read();if(projectId)return root.projects?.[projectId]||null;return root}
function reset(){try{localStorage.removeItem(key());return true}catch(_){return false}}
KT.registerService("firebase-budget",{record,listenerStart,status,reset,limits:()=>JSON.parse(JSON.stringify(cfg()))});
})(window);