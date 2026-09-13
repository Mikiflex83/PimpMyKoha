(function(global){"use strict";
const KT=global.KohaTools;if(!KT||!KT.Config)return;
const ID="external-links-share",Scope=KT.getService&&KT.getService("scope");
let styleNode=null,outsideHandler=null,created=[],moved=[],sectionPosition=[];
function C(){return KT.Config.getCanonical(ID)}
function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});else fn()}
function injectCss(c){if(c.appearance?.injectDefaultCss===false)return;const id=c.appearance?.styleId||"share-links-style";if(document.getElementById(id))return;
 const s=document.createElement("style");s.id=id;s.textContent=String(c.appearance?.defaultCss||"")+(c.appearance?.customCss?("\n"+c.appearance.customCss):"");document.head.appendChild(s);styleNode=s}
function eligibleItems(section,c){return [...section.querySelectorAll(c.linkCollection?.itemSelector||"li")].filter(li=>(c.linkCollection?.includeIf||[]).some(r=>r.descendant&&li.querySelector(r.descendant)))}
function setupOutside(c){
 if(c.outsideClick?.enabled===false)return;const key=c.outsideClick?.bodyDatasetKey||"shareListenerAdded";
 if(document.body.dataset[key])return;
 outsideHandler=e=>{if((c.outsideClick?.ignoreSelectors||[]).some(s=>e.target.closest(s)))return;
  for(const m of document.querySelectorAll(c.outsideClick?.menuSelector||".share-menu"))m.style.display=c.menu?.closedDisplay||"none"};
 document.addEventListener("click",outsideHandler);document.body.dataset[key]=String(c.outsideClick?.bodyDatasetValue??"true");
}
function enhance(section,c){
 const key=c.sections?.processedDatasetKey||"shareEnhanced",val=String(c.sections?.processedValue??"true");
 if(section.dataset[key]===val)return {status:"processed"};
 if((c.sections?.skipIfContainsSelectors||[]).some(s=>section.querySelector(s))){section.dataset[key]=val;return {status:"existing"}}
 const items=eligibleItems(section,c);
 if(c.mode==="shadow")return {status:"preview",items:items.length};
 const btn=document.createElement(c.button?.tag||"button");btn.type=c.button?.type||"button";btn.className=c.button?.className||"share-button";btn.setAttribute("aria-label",c.button?.ariaLabel||"Partager");
 const icon=c.button?.icon||{};if(icon.type==="image"){const img=document.createElement("img");img.src=icon.url||"";img.alt=icon.alt||"";img.style.display=icon.display||"block";img.style.margin=icon.margin||"0 auto";btn.appendChild(img)}
 const menu=document.createElement("div");menu.className=c.menu?.className||"share-menu";menu.style.display=c.menu?.closedDisplay||"none";
 for(const li of items){moved.push({node:li,parent:li.parentNode,next:li.nextSibling});menu.appendChild(li)}
 section.append(btn,menu);created.push(btn,menu);section.dataset[key]=val;
 btn.addEventListener("click",e=>{e.preventDefault();menu.style.display=menu.style.display===(c.menu?.openDisplay||"block")?(c.menu?.closedDisplay||"none"):(c.menu?.openDisplay||"block")});
 if(c.sections?.ensurePositionRelativeWhenStatic!==false&&getComputedStyle(section).position==="static"){sectionPosition.push({section,value:section.style.position});section.style.position="relative"}
 return {status:"enhanced",items:items.length};
}
function run(){
 const c=C();if(!c?.enabled||!["shadow","live"].includes(c.mode))return;if(Scope&&!Scope.match(c.general?.scope).ok)return;
 if(c.mode!=="shadow"){injectCss(c);setupOutside(c)}
 const results=[...document.querySelectorAll(c.sections?.selector||".liens_externes")].map(s=>enhance(s,c));
 if(c.mode==="shadow")KT.record({module:ID,level:"info",kind:"shadow-configurable-parity",sections:results.length,results});
}
function init(){ready(run)}
function destroy(){
 const c=C();if(outsideHandler)document.removeEventListener("click",outsideHandler);outsideHandler=null;
 const key=c?.outsideClick?.bodyDatasetKey||"shareListenerAdded";if(document.body)delete document.body.dataset[key];
 for(const x of moved){if(x.parent)x.parent.insertBefore(x.node,x.next&&x.next.parentNode===x.parent?x.next:null)}moved=[];
 for(const n of created)n.remove();created=[];for(const x of sectionPosition)x.section.style.position=x.value;sectionPosition=[];
 for(const s of document.querySelectorAll(c?.sections?.selector||".liens_externes"))delete s.dataset[c?.sections?.processedDatasetKey||"shareEnhanced"];
 styleNode?.remove();styleNode=null;
}
function onConfigChange(){destroy();run()}
const runtime={id:ID,init,destroy,onConfigChange};if(KT.initModule)KT.initModule(runtime);else init();
})(window);