(function(global){"use strict";
const KT=global.KohaTools;if(!KT||!KT.Config)return;
const ID="loan-duration-detail",Scope=KT.getService&&KT.getService("scope");
let observer=null,insertedSpans=[],replacedCollections=[];

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
function norm(s){return String(s||"").replace(/\s+/g," ").trim().toLowerCase()}
function colIndex(headers,spec){
 for(const t of spec?.technical||[]){const i=headers.findIndex(h=>norm(h.getAttribute(t.attribute))===norm(t.value));if(i!==-1)return {index:i,by:"technical"}}
 const aliases=(spec?.aliases||[]).map(norm);
 const i=headers.findIndex(h=>aliases.includes(norm(h.textContent)));
 return {index:i,by:i===-1?"missing":"alias"};
}
function parseByPatterns(text,c){
 for(const p of c.loanDuration?.datePatterns||[]){
   let rx;try{rx=new RegExp(p.regex)}catch(_){continue}
   const m=String(text||"").match(rx);if(!m)continue;
   const vals={};(p.order||[]).forEach((name,i)=>vals[name]=Number(m[i+1]));
   const d=new Date(vals.year,(vals.month||1)-1,vals.day||1);
   if(!Number.isNaN(d.getTime()))return d;
 }
 return null;
}
function findDue(row,statusIndex,c){
 if(statusIndex<0)return null;
 const cell=row.children[statusIndex],txt=cell?.textContent?.trim()||"";
 if(!txt)return null;
 let rx;try{rx=new RegExp(c.loanDuration?.dueKeywordsRegex||"","i")}catch(_){return null}
 if(!rx.test(txt))return null;
 const date=parseByPatterns(txt,c);return date?{date,cell}:null;
}
function template(t,days){return String(t||"").replace(/\{days\}/g,String(days))}
function processLoan(row,statusIndex,c){
 const attr=c.loanDuration?.rowMarkerAttribute||"data-vc-processed";
 if(!row||row.getAttribute(attr)===String(c.loanDuration?.rowMarkerValue??"1"))return;
 const found=findDue(row,statusIndex,c);if(!found)return;
 const today=new Date();if(c.loanDuration?.normalizeTodayToMidnight!==false)today.setHours(0,0,0,0);
 const raw=(found.date-today)/Number(c.loanDuration?.millisecondsPerDay||86400000);
 const diff=c.loanDuration?.rounding==="floor"?Math.floor(raw):c.loanDuration?.rounding==="round"?Math.round(raw):Math.ceil(raw);
 const span=document.createElement("span");span.className=c.loanDuration?.spanClass||"vc-loan-days";span.style.display=c.loanDuration?.display||"block";
 if(diff>=0){span.textContent=template(c.loanDuration?.remaining?.template,diff);span.style.color=c.loanDuration?.remaining?.color||"green"}
 else{span.textContent=template(c.loanDuration?.overdue?.template,Math.abs(diff));span.style.color=c.loanDuration?.overdue?.color||"red"}
 found.cell.appendChild(span);insertedSpans.push(span);row.setAttribute(attr,String(c.loanDuration?.rowMarkerValue??"1"));
}
function processCollection(row,index,c){
 if(index<0||!c.collectionLink?.enabled)return;
 const cell=row.children[index];if(!cell)return;
 const value=cell.textContent.trim();if(!value)return;
 if(c.collectionLink?.skipIfExistingLink!==false&&cell.querySelector("a"))return;
 const old=cell.cloneNode(true),a=document.createElement("a"),q=String(c.collectionLink?.queryTemplate||'ccode:"{value}"').replace(/\{value\}/g,value);
 const origin=c.collectionLink?.useCurrentOrigin===false?"":window.location.origin;
 a.href=origin+String(c.collectionLink?.basePath||"/cgi-bin/koha/catalogue/search.pl")+"?"+encodeURIComponent(c.collectionLink?.queryParameter||"q")+"="+encodeURIComponent(q);
 a.textContent=value;a.target=c.collectionLink?.target||"_blank";
 replacedCollections.push({cell,oldHtml:cell.innerHTML});cell.textContent="";cell.appendChild(a);
}
async function run(){
 const c=C();if(!c?.enabled||!["shadow","live"].includes(c.mode))return;if(Scope&&!Scope.match(c.general?.scope).ok)return;
 let table;try{table=await wait(c.table?.selectors,Number(c.table?.waitTimeoutMs??5000))}catch(_){return}
 const headers=[...table.querySelectorAll(c.table?.headerSelector||"thead th")];
 const status=colIndex(headers,c.columns?.status),collection=colIndex(headers,c.columns?.collection);
 const rows=[...table.querySelectorAll(c.table?.rowSelector||"tbody tr")];
 if(c.mode==="shadow"){
   KT.record({module:ID,level:"info",kind:"shadow-configurable-parity",statusColumn:status,collectionColumn:collection,rows:rows.length,
     loanCandidates:rows.filter(r=>!!findDue(r,status.index,c)).length,
     collectionCandidates:collection.index<0?0:rows.filter(r=>r.children[collection.index]?.textContent?.trim()).length});
   return;
 }
 if(c.loanDuration?.enabled!==false)rows.forEach(r=>processLoan(r,status.index,c));
 if(c.collectionLink?.enabled!==false)rows.forEach(r=>processCollection(r,collection.index,c));
 if(c.loanDuration?.observeAddedRows!==false){
   const tbody=table.querySelector(c.table?.tbodySelector||"tbody");
   if(tbody){observer=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&n.matches("tr"))processLoan(n,status.index,c)});observer.observe(tbody,{childList:true})}
 }
}
function init(){ready(run)}
function destroy(){
 observer?.disconnect();observer=null;
 for(const s of insertedSpans){const row=s.closest("tr");s.remove();const c=C();row?.removeAttribute(c?.loanDuration?.rowMarkerAttribute||"data-vc-processed")}insertedSpans=[];
 for(const x of replacedCollections){if(x.cell?.isConnected)x.cell.innerHTML=x.oldHtml}replacedCollections=[];
}
function onConfigChange(){destroy();run()}
const runtime={id:ID,init,destroy,onConfigChange};if(KT.initModule)KT.initModule(runtime);else init();
})(window);