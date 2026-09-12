(function(global){"use strict";
const KT=global.KohaTools;if(!KT||!KT.Config)return;
const ID="detail-fourth-cover",Scope=KT.getService&&KT.getService("scope");
let accordion=null,styleNode=null,original=null,originalParent=null,originalNext=null,headerHandler=null;
function C(){return KT.Config.getCanonical(ID)}
function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});else fn()}
function source(c){for(const s of c.source?.directSelectors||[]){const x=document.querySelector(s);if(x)return x}
 const i=document.querySelector(c.source?.innerSelector||"");return i?(i.closest(c.source?.innerClosest||"span.results_summary")||i):null}
function waitSource(c){return new Promise((resolve,reject)=>{const now=source(c);if(now)return resolve(now);const obs=new MutationObserver(()=>{const x=source(c);if(x){obs.disconnect();clearTimeout(timer);resolve(x)}});
 obs.observe(document.documentElement,{childList:true,subtree:true});const timer=setTimeout(()=>{obs.disconnect();reject(new Error("timeout"))},Number(c.source?.waitTimeoutMs??2000));})}
function target(c){for(const r of c.targets||[]){const el=document.querySelector(r.selector);if(el)return {el,rule:r}}return null}
function injectCss(c){if(c.appearance?.injectDefaultCss===false)return;const id=c.appearance?.styleId||"femecouv-style";if(document.getElementById(id))return;
 const s=document.createElement("style");s.id=id;s.textContent=String(c.appearance?.defaultCss||"")+(c.appearance?.customCss?("\n"+c.appearance.customCss):"");document.head.appendChild(s);styleNode=s}
async function run(){
 const c=C();if(!c?.enabled||!["shadow","live"].includes(c.mode))return;if(Scope&&!Scope.match(c.general?.scope).ok)return;
 if([...document.querySelectorAll(c.duplicateGuard?.selector||".accordion-header")].some(x=>String(x.textContent||"").includes(c.duplicateGuard?.textIncludes||c.accordion?.title||"")))return;
 let src;try{src=await waitSource(c)}catch(_){return}const t=target(c);
 if(c.mode==="shadow"){KT.record({module:ID,level:t?"info":"warn",kind:"shadow-configurable-parity",source:true,target:t?.rule?.selector||null});return}
 if(!t)return;injectCss(c);
 const clone=c.source?.clone===false?src:src.cloneNode(true);const lab=clone.querySelector?.(c.source?.removeLabelSelector||"span.label");lab?.remove();
 const box=document.createElement("div");box.className=c.accordion?.containerClass||"femecouv-accordion";
 const h=document.createElement("div");h.className=c.accordion?.headerClass||"accordion-header header";h.textContent=c.accordion?.title||"4ème de couverture";
 const body=document.createElement("div");body.className=c.accordion?.bodyClass||"body";body.style.display=c.accordion?.defaultDisplay||"none";body.appendChild(clone);
 headerHandler=()=>{body.style.display=body.style.display===(c.accordion?.openDisplay||"block")?(c.accordion?.defaultDisplay||"none"):(c.accordion?.openDisplay||"block")};
 if(c.accordion?.toggleOnHeaderClick!==false)h.addEventListener("click",headerHandler);box.append(h,body);
 if(t.rule.placement==="append")t.el.appendChild(box);else t.el.insertAdjacentElement(t.rule.placement||"beforeend",box);accordion=box;
 if(c.source?.removeOriginal!==false){original=src;originalParent=src.parentNode;originalNext=src.nextSibling;src.remove()}
}
function init(){ready(run)}
function destroy(){accordion?.remove();accordion=null;styleNode?.remove();styleNode=null;if(original&&originalParent){originalParent.insertBefore(original,originalNext&&originalNext.parentNode===originalParent?originalNext:null)}original=originalParent=originalNext=null}
function onConfigChange(){destroy();run()}
const runtime={id:ID,init,destroy,onConfigChange};if(KT.initModule)KT.initModule(runtime);else init();
})(window);