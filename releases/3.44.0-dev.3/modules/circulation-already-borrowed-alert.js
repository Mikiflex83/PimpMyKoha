(function(global){"use strict";
const KT=global.KohaTools;if(!KT||!KT.Config)return;
const ID="circulation-already-borrowed-alert";
const Scope=KT.getService&&KT.getService("scope");
let observer=null,raf=0,changes=[];

function C(){return KT.Config.getCanonical(ID)}
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn()}
function norm(v){return String(v||"").replace(/\s+/g," ").trim()}
function hasHeading(c){
  const wanted=norm(c?.targets?.headingText||"Confirmer le prêt");
  return [...document.querySelectorAll(c?.targets?.headingSelector||"h3")].some(x=>norm(x.textContent).includes(wanted));
}
function root(c){return document.querySelector(c?.targets?.scanRoot||"body")||document.body}
function scan(c,mutate){
  const r=root(c),oldText=String(c?.labels?.originalText||"L'adhérent a déjà emprunté ce titre"),
        newText=String(c?.labels?.replacementText||"Ce titre est déjà présent dans l'historique de prêt de cet adhérent");
  if(!r||!oldText||!newText||!hasHeading(c))return {heading:hasHeading(c),found:0,changed:0};
  if(!String(r.textContent||"").includes(oldText))return {heading:true,found:0,changed:0};
  const walker=document.createTreeWalker(r,NodeFilter.SHOW_TEXT);
  let node,found=0,changed=0;
  while((node=walker.nextNode())){
    const before=String(node.nodeValue||"");
    if(!before.includes(oldText))continue;
    found++;
    if(!mutate)continue;
    const after=before.split(oldText).join(newText);
    if(after===before)continue;
    changes.push({node,before,after});
    node.nodeValue=after;
    changed++;
  }
  if(mutate&&changed){
    document.documentElement.dataset.ktAlreadyBorrowedText="1";
    document.documentElement.dataset.ktAlreadyBorrowedCount=String(changed);
  }
  return {heading:true,found,changed};
}
function schedule(c){
  if(raf)return;
  raf=requestAnimationFrame(()=>{raf=0;scan(c,true)});
}
function observe(c){
  if(c?.features?.observeDynamicConfirmation===false)return;
  const r=root(c);if(!r)return;
  observer=new MutationObserver(ms=>{
    let relevant=false;
    for(const m of ms){
      if(m.type==="characterData"){relevant=true;break}
      if(m.addedNodes&&m.addedNodes.length){relevant=true;break}
    }
    if(relevant)schedule(c);
  });
  observer.observe(r,{childList:true,subtree:true,characterData:true});
}
function run(){
  const c=C();
  if(!c?.enabled||!["shadow","live"].includes(c.mode))return;
  if(Scope&&!Scope.match(c.general?.scope).ok)return;
  if(c.mode==="shadow"){
    const s=scan(c,false);
    KT.record({module:ID,level:"info",kind:"shadow-already-borrowed-text",heading:s.heading,wouldReplace:s.found});
    return;
  }
  scan(c,true);
  observe(c);
}
function init(){ready(run)}
function destroy(){
  observer?.disconnect();observer=null;
  if(raf){cancelAnimationFrame(raf);raf=0}
  for(let i=changes.length-1;i>=0;i--){
    const x=changes[i];
    try{if(x.node&&x.node.isConnected&&String(x.node.nodeValue||"")===x.after)x.node.nodeValue=x.before}catch(_){}
  }
  changes=[];
  delete document.documentElement.dataset.ktAlreadyBorrowedText;
  delete document.documentElement.dataset.ktAlreadyBorrowedCount;
}
function onConfigChange(){destroy();run()}
const runtime={id:ID,description:"Reformule le message Koha « déjà emprunté » sans modifier le mécanisme de confirmation.",sourceFiles:["022-popup-deja-emprunte-circulation.js"],parity:"legacy-behaviour-hardened",init,destroy,onConfigChange};
KT.initModule?KT.initModule(runtime):init();
})(window);