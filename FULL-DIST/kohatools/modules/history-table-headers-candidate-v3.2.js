(function(global){"use strict";
const KT=global.KohaTools;if(!KT||!KT.Config)return;
const ID="history-table-headers";
const Scope=KT.getService&&KT.getService("scope");
let originals=[];

function cfg(){return KT.Config.getCanonical(ID)}
function ready(fn){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});
  else fn();
}
function selectorList(C){return (C.targets?.tableSelectors||["table"]).filter(Boolean).join(",")}
function headerList(table,C){return [...table.querySelectorAll(C.targets?.headerSelector||"th")]}
function signature(headers){return headers.map(h=>(h.textContent||"").trim().toLowerCase()).join(" ")}
function candidateTables(C){
  const selector=selectorList(C);if(!selector)return [];
  let rx;try{rx=new RegExp(C.targets?.signatureRegex||"historique|issue|prêt|emprunt|date","i")}catch(_){return []}
  return [...document.querySelectorAll(selector)].filter(table=>{
    const headers=headerList(table,C);
    return headers.length>=Number(C.targets?.minimumHeaders??8)&&rx.test(signature(headers));
  });
}
function waitForTables(C){
  const found=candidateTables(C);if(found.length||C.features?.waitForTable===false)return Promise.resolve(found);
  return new Promise(resolve=>{
    const root=C.timing?.observeRoot==="body"?document.body:document.documentElement;
    if(!root)return resolve([]);
    let done=false;
    const finish=v=>{if(done)return;done=true;obs.disconnect();if(timer)clearTimeout(timer);resolve(v)};
    const obs=new MutationObserver(()=>{const x=candidateTables(C);if(x.length)finish(x)});
    obs.observe(root,{childList:true,subtree:true});
    const timeout=Number(C.timing?.waitTimeoutMs??2000);
    const timer=timeout>0?setTimeout(()=>finish(candidateTables(C)),timeout):null;
  });
}
function selectTable(tables,C){
  if(!tables.length)return null;
  if(C.targets?.firstMatchingTableOnly!==false||C.advanced?.ambiguousPolicy==="first-match")return tables[0];
  if(tables.length===1)return tables[0];
  if(C.advanced?.ambiguousPolicy==="skip")return null;
  return tables[0];
}
function mark(table,C){
  if(C.features?.markEnhanced===false)return;
  const attr=C.state?.markerAttribute||"data-enhanced";
  table.setAttribute(attr,String(C.state?.markerValue??"1"));
}
function alreadyMarked(table,C){
  if(C.features?.markEnhanced===false)return false;
  const attr=C.state?.markerAttribute||"data-enhanced";
  return table.hasAttribute(attr);
}
function apply(table,C){
  if(!table||alreadyMarked(table,C))return {changed:0,skipped:true};
  const headers=headerList(table,C);let changed=0;
  originals=[];
  for(const col of C.columns||[]){
    const index=Number(col.index);
    if(!Number.isInteger(index)||index<0)continue;
    const h=headers[index];
    if(!h){if(C.advanced?.missingColumnPolicy==="abort")return {changed,aborted:true};continue}
    const before=h.textContent;
    let correct=false;
    if(C.features?.avoidRewritingMatchingLabels!==false){
      try{correct=new RegExp(col.alreadyCorrectRegex||String(col.label||""),"i").test(before||"")}catch(_){correct=(before||"").trim()===String(col.label||"")}
    }
    if(correct)continue;
    originals.push({el:h,text:before});
    h.textContent=String(col.label??"");
    changed++;
  }
  mark(table,C);
  return {changed};
}
async function run(){
  const C=cfg();
  if(!C?.enabled||!["shadow","live"].includes(C.mode))return;
  if(Scope&&!Scope.match(C.general?.scope).ok)return;
  const tables=await waitForTables(C),table=selectTable(tables,C);
  if(C.mode==="shadow"){
    KT.record({module:ID,level:table?"info":"warn",kind:"shadow-configurable-parity",
      tableFound:!!table,candidates:tables.length,
      headerCount:table?headerList(table,C).length:0,
      plannedColumns:(C.columns||[]).map(x=>({index:x.index,label:x.label}))});
    return;
  }
  if(!table){return}
  apply(table,C);
}
function init(){ready(run)}
function destroy(){
  for(const x of originals){if(x.el&&x.el.isConnected)x.el.textContent=x.text}
  originals=[];
  const C=cfg();const attr=C?.state?.markerAttribute||"data-enhanced";
  for(const t of candidateTables(C||{}))t.removeAttribute(attr);
}
function onConfigChange(){destroy();run()}
const runtime={id:ID,init,destroy,onConfigChange};
if(KT.initModule)KT.initModule(runtime);else init();
})(window);