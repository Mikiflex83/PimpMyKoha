(function(global){"use strict";
const KT=global.KohaTools;if(!KT||!KT.Config)return;
const ID="patron-print-info",Scope=KT.getService&&KT.getService("scope");
let clickHandler=null,inserted=[];

function C(){return KT.Config.getCanonical(ID)}
function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});else fn()}
function wait(sel,timeout){return new Promise((resolve,reject)=>{const now=document.querySelector(sel);if(now)return resolve(now);
 const obs=new MutationObserver(()=>{const x=document.querySelector(sel);if(x){obs.disconnect();if(timer)clearTimeout(timer);resolve(x)}});
 obs.observe(document.documentElement,{childList:true,subtree:true});
 const timer=timeout>0?setTimeout(()=>{obs.disconnect();reject(new Error("timeout"))},timeout):null;});}
function text(sel){return document.querySelector(sel)?.textContent?.trim()||""}
function snapshot(c){
 const miss=c.missingValue??"Non disponible",h=document.querySelector(c.data?.name?.selector||".patroninfo h5");
 const full=h?.textContent?.trim()||"";
 let card="";try{const r=new RegExp(c.data?.name?.cardRegex||"\\(([^)]+)\\)");card=full.match(r)?.[1]||""}catch(_){}
 let name=full;try{name=full.replace(new RegExp(c.data?.name?.removeCardRegex||"\\(.*?\\)","g"),"").trim()}catch(_){}
 if(!name)name=miss;
 const values={cardNumbers:card};
 for(const row of c.data?.rows||[]){
   if(row.type==="derived"){values[row.id]=values[row.source]||miss;continue}
   if(row.type==="text"){values[row.id]=text(row.selector)||miss;continue}
   if(row.type==="list"){const a=[...document.querySelectorAll(row.selector||"")].map(x=>x.textContent.trim()).filter(Boolean);values[row.id]=a.length?a.join(row.separator??", "):miss;continue}
   if(row.type==="labelled-li"){
     const el=[...document.querySelectorAll(row.itemSelector||"li")].find(x=>x.querySelector(row.labelSelector||"span.label")?.textContent?.includes(row.labelContains||""));
     values[row.id]=el?el.textContent.replace(row.removeText||"","").trim():miss;continue;
   }
 }
 const groups={};
 for(const g of c.data?.groups||[]){
   if(g.type==="list"){groups[g.id]=[...document.querySelectorAll(g.selector||"")].map(x=>(g.textProperty==="innerText"?x.innerText:x.textContent)?.trim()).filter(Boolean)}
   else if(g.type==="patronMessages"){groups[g.id]=[...document.querySelectorAll(g.selector||"")].map(item=>{
     const title=item.querySelector(g.titleSelector||"span.circ-hlt")?.innerText?.trim()||"";
     const i=Number(g.detailsChildNodeIndex??2),details=item.childNodes[i]?.textContent?.trim()||"";
     return `${title} ${details}`;});}
 }
 return {name,values,groups};
}
function printData(c,data){
 const w=window.open(c.print?.windowUrl??"",c.print?.windowName??"",c.print?.windowFeatures||"height=800,width=600");if(!w)return;
 w.document.open();w.document.write(c.print?.html||'<!doctype html><html><head><meta charset="utf-8"><title>Impression des informations</title></head><body></body></html>');
 const d=w.document,s=d.createElement("style");s.textContent=c.print?.css||"";d.head.appendChild(s);
 const box=d.createElement("div"),h=d.createElement("h1");h.textContent=data.name||c.missingValue||"Non disponible";box.appendChild(h);
 const add=(label,value)=>{const p=d.createElement("p"),b=d.createElement("strong");b.textContent=label+": ";p.appendChild(b);p.appendChild(d.createTextNode(value||c.missingValue||"Non disponible"));box.appendChild(p)};
 for(const row of c.data?.rows||[])add(row.label||row.id,data.values[row.id]);
 for(const g of c.data?.groups||[]){const vals=data.groups[g.id]||[];if(!vals.length)continue;const p=d.createElement("p"),b=d.createElement("strong");b.textContent=g.label||g.id;p.appendChild(b);for(const v of vals){const x=d.createElement("div");x.textContent=v;p.appendChild(x)}box.appendChild(p)}
 d.body.appendChild(box);void d.body.offsetHeight;d.close();if(c.print?.autoFocus!==false)w.focus();if(c.print?.autoPrint!==false)w.print();
}
async function run(){
 const c=C();if(!c?.enabled||!["shadow","live"].includes(c.mode))return;if(Scope&&!Scope.match(c.general?.scope).ok)return;
 try{await wait(c.timing?.waitForSelector||".patroninfo h5",Number(c.timing?.waitTimeoutMs||0))}catch(_){return}
 const frozen=snapshot(c);
 if(c.mode==="shadow"){KT.record({module:ID,level:"info",kind:"shadow-configurable-parity",name:frozen.name,rows:Object.keys(frozen.values),groups:Object.keys(frozen.groups)});return}
 clickHandler=function(event){
   const trigger=event.target.closest(c.menu?.triggerSelector||".btn-group button.dropdown-toggle");if(!trigger)return;
   const group=trigger.closest(c.menu?.groupSelector||".btn-group"),menu=group?.querySelector(c.menu?.menuSelector||"ul.dropdown-menu");if(!menu)return;
   if(document.getElementById(c.menu?.buttonId||"infoButton"))return;
   const li=document.createElement("li"),a=document.createElement("a");a.id=c.menu?.buttonId||"infoButton";a.className=c.menu?.buttonClass||"dropdown-item";a.href=c.menu?.href||"#";
   a.setAttribute("role",c.menu?.role||"button");a.setAttribute("aria-label",c.menu?.ariaLabel||"");a.textContent=c.menu?.label||"Imprimer les informations";
   a.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();printData(c,c.timing?.extractOnceAfterReady===false?snapshot(c):frozen)});
   li.appendChild(a);menu.appendChild(li);inserted.push(li);
 };
 document.addEventListener("click",clickHandler);
}
function init(){ready(run)}
function destroy(){if(clickHandler)document.removeEventListener("click",clickHandler);clickHandler=null;for(const n of inserted)n.remove();inserted=[]}
function onConfigChange(){destroy();run()}
const runtime={id:ID,init,destroy,onConfigChange};if(KT.initModule)KT.initModule(runtime);else init();
})(window);