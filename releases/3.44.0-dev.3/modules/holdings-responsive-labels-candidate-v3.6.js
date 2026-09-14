(function(global){"use strict";
const KT=global.KohaTools;if(!KT||!KT.Config)return;
const ID="holdings-responsive-labels",Scope=KT.getService&&KT.getService("scope");
let rowObserver=null,headObserver=null,changedCells=[],markedRows=[],markedTable=null;

function C(){return KT.Config.getCanonical(ID)}
function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});else fn()}
function wait(selectors,timeout){
 const list=(selectors||[]).filter(Boolean);
 return new Promise((resolve,reject)=>{
  const find=()=>{for(const s of list){const x=document.querySelector(s);if(x)return x}return null};
  const now=find();if(now)return resolve(now);
  const obs=new MutationObserver(()=>{const x=find();if(x){obs.disconnect();if(timer)clearTimeout(timer);resolve(x)}});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  const timer=timeout>0?setTimeout(()=>{obs.disconnect();reject(new Error("timeout"))},timeout):null;
 });
}
function normalizeHeader(th,c){
 const hm=c.headerMapping||{};
 let value=hm.technicalAttribute?th.getAttribute(hm.technicalAttribute):"";
 if(!value&&hm.fallbackToText!==false)value=th.textContent||"";
 if(hm.normalizeWhitespace!==false)value=String(value).replace(/\s+/g," ");
 if(hm.trim!==false)value=String(value).trim();
 return value;
}
function buildHeaders(table,c){return [...table.querySelectorAll(c.table?.headerSelector||"thead th")].map(th=>normalizeHeader(th,c))}
function isMarked(row,c){return row.getAttribute(c.state?.rowMarkerAttribute||"data-enhanced")===String(c.state?.rowMarkerValue??"1")}
function markRow(row,c){const a=c.state?.rowMarkerAttribute||"data-enhanced";row.setAttribute(a,String(c.state?.rowMarkerValue??"1"));markedRows.push(row)}
function applyRow(row,headers,c){
 if(!row||isMarked(row,c))return 0;
 const cells=[...row.querySelectorAll(c.table?.cellSelector||"td")];let hi=0,changed=0;
 for(const cell of cells){
  const hm=c.headerMapping||{};
  while(hi<headers.length&&hm.skipEmptyHeaders!==false&&!headers[hi])hi++;
  const label=headers[hi]||"";
  if(label){
    const attr=c.labels?.attribute||"data-label";
    if(c.labels?.overwriteExisting!==false||!cell.hasAttribute(attr)){
      changedCells.push({cell,attr,had:cell.hasAttribute(attr),value:cell.getAttribute(attr)});
      cell.setAttribute(attr,label);changed++;
    }
  }
  const raw=cell.getAttribute(hm.colspanAttribute||"colspan");
  const span=Number(raw||hm.defaultColspan||1);
  hi+=Number.isFinite(span)&&span>0?span:1;
 }
 markRow(row,c);return changed;
}
function rows(table,c){return [...table.querySelectorAll(c.table?.rowSelector||"tbody tr")]}
function applyAll(table,headers,c){let n=0;for(const r of rows(table,c))n+=applyRow(r,headers,c);return n}
async function run(){
 const c=C();if(!c?.enabled||!["shadow","live"].includes(c.mode))return;if(Scope&&!Scope.match(c.general?.scope).ok)return;
 let table;try{table=await wait(c.table?.selectors,Number(c.table?.waitTimeoutMs??5000))}catch(_){return}
 let headers=buildHeaders(table,c);
 if(c.mode==="shadow"){
  const preview=rows(table,c).map(r=>{
    const cells=[...r.querySelectorAll(c.table?.cellSelector||"td")],labels=[];let hi=0;
    for(const cell of cells){while(hi<headers.length&&c.headerMapping?.skipEmptyHeaders!==false&&!headers[hi])hi++;labels.push(headers[hi]||"");
      const span=Number(cell.getAttribute(c.headerMapping?.colspanAttribute||"colspan")||c.headerMapping?.defaultColspan||1);hi+=span>0?span:1}
    return labels;
  });
  KT.record({module:ID,level:"info",kind:"shadow-configurable-parity",headers,rows:preview.length,preview});
  return;
 }
 const ta=c.state?.tableMarkerAttribute||"data-styled";
 if(table.getAttribute(ta)!==String(c.state?.tableMarkerValue??"1")){
   applyAll(table,headers,c);table.setAttribute(ta,String(c.state?.tableMarkerValue??"1"));markedTable=table;
 } else applyAll(table,headers,c);

 const tbody=(c.table?.tbodyMode||"first-tBody")==="first-tBody"?(table.tBodies&&table.tBodies[0]):table.querySelector("tbody");
 if(tbody&&c.observers?.rows?.enabled!==false){
   rowObserver=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&n.matches("tr"))applyRow(n,headers,c)});
   rowObserver.observe(tbody,{childList:c.observers?.rows?.childList!==false,subtree:!!c.observers?.rows?.subtree});
 }
 const thead=table.querySelector(c.table?.theadSelector||"thead");
 if(thead&&c.observers?.headers?.enabled!==false){
   headObserver=new MutationObserver(()=>{
     headers=buildHeaders(table,c);
     if(c.observers?.headers?.clearRowMarkersBeforeReapply!==false){
       const a=c.state?.rowMarkerAttribute||"data-enhanced";for(const r of rows(table,c))r.removeAttribute(a);
     }
     applyAll(table,headers,c);
   });
   headObserver.observe(thead,{childList:c.observers?.headers?.childList!==false,subtree:c.observers?.headers?.subtree!==false,characterData:c.observers?.headers?.characterData!==false});
 }
}
function init(){ready(run)}
function destroy(){
 rowObserver?.disconnect();headObserver?.disconnect();rowObserver=headObserver=null;
 for(const x of changedCells){if(!x.cell?.isConnected)continue;x.had?x.cell.setAttribute(x.attr,x.value):x.cell.removeAttribute(x.attr)}changedCells=[];
 const c=C(),ra=c?.state?.rowMarkerAttribute||"data-enhanced",ta=c?.state?.tableMarkerAttribute||"data-styled";
 for(const r of markedRows)if(r?.isConnected)r.removeAttribute(ra);markedRows=[];
 if(markedTable?.isConnected)markedTable.removeAttribute(ta);markedTable=null;
}
function onConfigChange(){destroy();run()}
const runtime={id:ID,init,destroy,onConfigChange};if(KT.initModule)KT.initModule(runtime);else init();
})(window);