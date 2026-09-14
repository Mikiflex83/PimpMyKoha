(function(global){"use strict";
const KT=global.KohaTools;if(!KT||!KT.Config)return;
const ID="history-row-highlights",Scope=KT.getService&&KT.getService("scope");
let rowObserver=null,added=[],styleNode=null,sortedHeader=null;

function C(){return KT.Config.getCanonical(ID)}
function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});else fn()}
function wait(selector,timeout){return new Promise((resolve,reject)=>{const now=document.querySelector(selector);if(now)return resolve(now);
 const obs=new MutationObserver(()=>{const x=document.querySelector(selector);if(x){obs.disconnect();if(timer)clearTimeout(timer);resolve(x)}});
 obs.observe(document.documentElement,{childList:true,subtree:true});const timer=timeout>0?setTimeout(()=>{obs.disconnect();reject(new Error("timeout"))},timeout):null;});}
function norm(s){return String(s||"").replace(/\s+/g," ").trim().toLowerCase()}
function idx(labels,spec){
 const aliases=(spec?.aliases||[]).map(norm),prefer=norm(spec?.preferAlias||"");
 if(prefer){const i=labels.findIndex(x=>x.includes(prefer));if(i>=0)return i}
 for(const a of aliases){const i=labels.findIndex(x=>x.includes(a));if(i>=0)return i}
 if(spec?.fallback==="last")return labels.length-1;
 return Number(spec?.fallbackIndex??-1);
}
function columns(table,c){
 const hs=[...table.querySelectorAll(c.table?.headerSelector||"thead th")],labels=hs.map(h=>norm(h.textContent));
 return {borrowed:idx(labels,c.columns?.borrowed),expectedReturn:idx(labels,c.columns?.expectedReturn),actualReturn:idx(labels,c.columns?.actualReturn)};
}
function parseVisible(s,c){
 const U=global[c.dates?.sharedGlobal||"VC_DATE_UTILS"];
 if(c.dates?.preferSharedUtils!==false&&U&&typeof U[c.dates?.sharedParseMethod||"parseDateTimeFR"]==="function"){
  try{const r=U[c.dates.sharedParseMethod](s);if(r instanceof Date&&!Number.isNaN(r.getTime()))return r}catch(_){}
 }
 let txt=String(s||"");try{txt=txt.replace(new RegExp(c.dates?.visibleBorrowedPrefixRegex||"","i"),"").trim()}catch(_){}
 let rx;try{rx=new RegExp(c.dates?.visibleRegex||"")}catch(_){return null}
 const m=txt.match(rx);if(!m)return null;
 return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]||0),Number(m[5]||0));
}
function parseCell(cell,c){
 if(!cell)return null;const order=cell.getAttribute(c.dates?.orderAttribute||"data-order");
 if(order){let rx;try{rx=new RegExp(c.dates?.orderRegex||"")}catch(_){rx=null};const m=rx&&order.match(rx);if(m){
  const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]||0),Number(m[5]||0),Number(m[6]||0));
  if(!Number.isNaN(d.getTime()))return d}}
 return parseVisible(cell.textContent||cell.innerText||"",c);
}
function utcDay(d){return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())}
function days(a,b,c){return Math.floor((utcDay(b)-utcDay(a))/Number(c.dates?.millisecondsPerDay||86400000))}
function templ(s,n){return String(s||"").replace(/\{days\}/g,String(n))}
function markAdded(node){added.push(node);return node}
function clearDecor(cell,c){
 cell.style.backgroundColor="";
 for(const n of [...cell.querySelectorAll("."+CSS.escape(c.status?.noteClass||"readingrec-note"))])n.remove();
}
function note(cell,spec,n,c){
 cell.style.backgroundColor=spec?.background||"";
 const d=markAdded(document.createElement("div"));d.className=c.status?.noteClass||"readingrec-note";d.style.color=spec?.color||"";d.textContent=templ(spec?.template,n);cell.appendChild(d);
}
function processRow(row,cols,c){
 const ra=c.state?.rowMarkerAttribute||"data-kt-readingrec-highlighted";
 if(row.getAttribute(ra)===String(c.state?.rowMarkerValue??"1"))return;
 const cells=[...row.querySelectorAll(c.table?.cellSelector||"td")],max=Math.max(cols.borrowed,cols.expectedReturn,cols.actualReturn);if(cells.length<=max)return;
 const b=parseCell(cells[cols.borrowed],c),e=parseCell(cells[cols.expectedReturn],c),actual=cells[cols.actualReturn];if(!actual)return;
 if(String(actual.textContent||"").includes(c.status?.checkedOutText||"Prêté")&&c.status?.bookIcon?.enabled!==false&&!actual.querySelector(".readingrec-book-icon")){
  const i=markAdded(document.createElement("i"));i.className=c.status.bookIcon.className||"fas fa-book readingrec-book-icon";actual.appendChild(i)}
 if(!b||!e)return;
 clearDecor(actual,c);
 const r=parseCell(actual,c);
 if(r){const n=days(b,r,c);if(Number.isFinite(n))note(actual,c.status?.finished,n,c)}
 else{const now=new Date();if(utcDay(e)>=utcDay(now)){const n=days(b,now,c);if(Number.isFinite(n))note(actual,c.status?.current,n,c)}
      else{const n=days(e,now,c);if(Number.isFinite(n)&&n>=Number(c.status?.overdue?.minimumDays??1))note(actual,c.status?.overdue,n,c)}}
 row.setAttribute(ra,String(c.state?.rowMarkerValue??"1"));
}
function injectCss(c){if(c.appearance?.injectDefaultCss===false)return;const id=c.appearance?.styleId||"readingrec-highlight-style";if(document.getElementById(id))return;
 const s=document.createElement("style");s.id=id;s.textContent=String(c.appearance?.defaultCss||"")+(c.appearance?.customCss?("\n"+c.appearance.customCss):"");document.head.appendChild(s);styleNode=s}
async function run(){
 const c=C();if(!c?.enabled||!["shadow","live"].includes(c.mode))return;if(Scope&&!Scope.match(c.general?.scope).ok)return;
 let table;try{table=await wait(c.table?.selector||"#table_readingrec",Number(c.table?.waitTimeoutMs??5000))}catch(_){return}
 const cols=columns(table,c),rows=[...table.querySelectorAll(c.table?.rowSelector||"tbody tr")];
 if(c.mode==="shadow"){KT.record({module:ID,level:"info",kind:"shadow-configurable-parity",columns:cols,rows:rows.length,
   activeLoans:rows.filter(r=>{const x=r.querySelectorAll(c.table?.cellSelector||"td")[cols.actualReturn];return x&&String(x.textContent||"").includes(c.status?.checkedOutText||"Prêté")}).length});return}
 injectCss(c);for(const r of rows)processRow(r,cols,c);
 table.setAttribute(c.state?.tableMarkerAttribute||"data-highlighted",String(c.state?.tableMarkerValue??"1"));
 const tbody=table.querySelector(c.table?.tbodySelector||"tbody")||table;
 if(c.observers?.rows?.enabled!==false){rowObserver=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){
   if(n.nodeType!==1)continue;if(n.matches?.("tr"))processRow(n,cols,c);for(const r of n.querySelectorAll?.("tr")||[])processRow(r,cols,c)}});rowObserver.observe(tbody,{childList:true,subtree:c.observers?.rows?.subtree!==false})}
 if(c.sorting?.enabled!==false){try{const h=await wait(c.sorting?.headerSelector,Number(c.sorting?.waitTimeoutMs??5000));sortedHeader=h;
   const count=Number(c.sorting?.clickCount??2);for(let i=0;i<count;i++){if(i===0)h.click();else if(c.sorting?.betweenClicks==="requestAnimationFrame")await new Promise(res=>requestAnimationFrame(()=>{h.click();res()}));else h.click()}
 }catch(_){}}
}
function init(){ready(run)}
function destroy(){
 rowObserver?.disconnect();rowObserver=null;for(const n of added)if(n?.isConnected)n.remove();added=[];styleNode?.remove();styleNode=null;
 const c=C(),ta=c?.state?.tableMarkerAttribute||"data-highlighted",ra=c?.state?.rowMarkerAttribute||"data-kt-readingrec-highlighted";
 const t=document.querySelector(c?.table?.selector||"#table_readingrec");t?.removeAttribute(ta);for(const r of t?.querySelectorAll(c?.table?.rowSelector||"tbody tr")||[]){r.removeAttribute(ra);const a=columns(t,c);const cell=r.querySelectorAll(c.table?.cellSelector||"td")[a.actualReturn];if(cell)cell.style.backgroundColor=""}
}
function onConfigChange(){destroy();run()}
const runtime={id:ID,init,destroy,onConfigChange};if(KT.initModule)KT.initModule(runtime);else init();
})(window);