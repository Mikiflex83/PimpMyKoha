(function(global){"use strict";
const KT=global.KohaTools;if(!KT||!KT.Config)return;
const ID="copy-patron-identifiers",Scope=KT.getService&&KT.getService("scope");
let listeners=[],feedbackNodes=[];

function C(){return KT.Config.getCanonical(ID)}
function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});else fn()}
function first(selectors){for(const s of selectors||[]){const el=document.querySelector(s);if(el)return el}return null}
function wait(selectors,timeout){
 return new Promise((resolve,reject)=>{
  const now=first(selectors);if(now)return resolve(now);
  const obs=new MutationObserver(()=>{const x=first(selectors);if(x){obs.disconnect();if(timer)clearTimeout(timer);resolve(x)}});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  const timer=timeout>0?setTimeout(()=>{obs.disconnect();reject(new Error("timeout"))},timeout):null;
 });
}
function digits(s){return String(s||"").replace(/\D/g,"")}
function markerTokens(el,c){try{return String(el.dataset[c.processing?.markerDatasetKey||"kohaCopy"]||"").split(/\s+/).filter(Boolean)}catch(_){return []}}
function isProcessed(el,id,c){return markerTokens(el,c).includes(id)}
function mark(el,id,c){try{const k=c.processing?.markerDatasetKey||"kohaCopy",sep=c.processing?.markerSeparator??" ";el.dataset[k]=[...markerTokens(el,c),id].join(sep)}catch(_){}}
function unmark(el,id,c){try{const k=c.processing?.markerDatasetKey||"kohaCopy",sep=c.processing?.markerSeparator??" ";el.dataset[k]=markerTokens(el,c).filter(x=>x!==id).join(sep)}catch(_){}}
function show(value,c){
 if(c.feedback?.enabled===false)return;
 const n=document.createElement("div");n.textContent=String(c.feedback?.template||'"{value}" a été copié dans le presse‑papiers.').replace(/\{value\}/g,value);
 Object.assign(n.style,c.feedback?.style||{});document.body.appendChild(n);feedbackNodes.push(n);
 setTimeout(()=>{n.remove();feedbackNodes=feedbackNodes.filter(x=>x!==n)},Number(c.feedback?.durationMs??2000));
}
function fallbackCopy(text,c){
 try{
  const ta=document.createElement("textarea");ta.value=text;Object.assign(ta.style,c.clipboard?.fallbackTextarea||{position:"fixed",left:"-9999px"});
  document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();show(text,c);return true;
 }catch(_){alert(c.clipboard?.errorMessage||"Erreur lors de la copie dans le presse‑papiers.");return false}
}
function copy(text,c){
 if(typeof text!=="string"||!text)return;
 const api=navigator.clipboard&&typeof navigator.clipboard.writeText==="function";
 if(c.clipboard?.preferNavigatorApi!==false&&api)navigator.clipboard.writeText(text).then(()=>show(text,c)).catch(()=>fallbackCopy(text,c));
 else fallbackCopy(text,c);
}
function extract(action,source,event){
 const ex=action.extract||{},target=event?.target;
 if(ex.type==="regex-replace"){
  let v=source.textContent||"";try{v=v.replace(new RegExp(ex.pattern||""),ex.replacement??"")}catch(_){}
  return ex.trim!==false?v.trim():v;
 }
 if(ex.type==="conditional"){
  const r=ex.targetRule||{},tag=String(target?.tagName||"").toUpperCase();
  const styleValue=r.styleProperty?String(target?.style?.[r.styleProperty]||""):"";
  if((!r.tagName||tag===String(r.tagName).toUpperCase())&&(!r.styleIncludes||styleValue.includes(r.styleIncludes))){
    if(r.extract==="target-text")return String(target.textContent||"").trim();
  }
  if(ex.fallback==="digits-from-source")return digits(source.textContent);
 }
 if(ex.type==="barcode-with-part"){
  const full=digits(source.textContent),r=ex.partRule||{},tag=String(target?.tagName||"").toUpperCase();
  if(!r.tagName||tag===String(r.tagName).toUpperCase()){
    const part=digits(target?.textContent);
    if(part&&part.length>=Number(r.minimumDigits??3)&&(!r.mustBeShorterThanFull||part.length<full.length))return part;
  }
  return full;
 }
 if(ex.type==="text")return String(source.textContent||"").trim();
 if(ex.type==="digits")return digits(source.textContent);
 return String(source.textContent||"").trim();
}
function precondition(action,el){
 const p=action.precondition;if(!p)return true;
 if(p.type==="digits-length")return digits(el.textContent).length>=Number(p.minimum||0);
 return true;
}
async function bindAction(action,c){
 if(action.enabled===false)return {id:action.id,bound:false,reason:"disabled"};
 let el;try{el=await wait(action.selectors,Number(action.waitTimeoutMs??c.processing?.waitTimeoutMs??5000))}catch(_){return {id:action.id,bound:false,reason:"not-found"}}
 if(isProcessed(el,action.id,c))return {id:action.id,bound:false,reason:"already-processed"};
 if(!precondition(action,el))return {id:action.id,bound:false,reason:"precondition"};
 const handler=e=>{const v=extract(action,el,e);if(v||c.advanced?.ignoreEmptyText===false)copy(v,c)};
 if(c.mode!=="shadow"){el.addEventListener(action.event||"click",handler);listeners.push({el,event:action.event||"click",handler,id:action.id});mark(el,action.id,c)}
 return {id:action.id,bound:true,selector:(action.selectors||[]).find(s=>document.querySelector(s))||null};
}
async function run(){
 const c=C();if(!c?.enabled||!["shadow","live"].includes(c.mode))return;if(Scope&&!Scope.match(c.general?.scope).ok)return;
 const results=[];for(const action of c.copyActions||[])results.push(await bindAction(action,c));
 if(c.mode==="shadow")KT.record({module:ID,level:"info",kind:"shadow-configurable-parity",actions:results});
}
function init(){ready(run)}
function destroy(){
 const c=C();for(const x of listeners){x.el.removeEventListener(x.event,x.handler);unmark(x.el,x.id,c)}listeners=[];
 for(const n of feedbackNodes)n.remove();feedbackNodes=[];
}
function onConfigChange(){destroy();run()}
const runtime={id:ID,init,destroy,onConfigChange};if(KT.initModule)KT.initModule(runtime);else init();
})(window);