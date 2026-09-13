(function(global){"use strict";
const KT=global.KohaTools;if(!KT||!KT.Config)return;
const ID="patron-contact-validation",Scope=KT.getService&&KT.getService("scope");
let inserted=null,styleNode=null,linkSnapshots=[],patronInfoNode=null;

function C(){return KT.Config.getCanonical(ID)}
function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});else fn()}
function first(selectors,root=document){for(const s of selectors||[]){const el=root.querySelector(s);if(el)return el}return null}
function triggerContext(c){
  const box=first(c.trigger?.messagesContainerSelectors)|| (c.trigger?.fallbackToBody!==false?document.body:null);
  const text=box?String(box.innerText||box.textContent||""):"";
  const phrases=c.trigger?.phrases||[];
  const hit=(c.trigger?.matchMode||"includes-any")==="includes-all"?phrases.every(x=>text.includes(x)):phrases.some(x=>text.includes(x));
  return {box,text,hit};
}
function fieldValue(field,patron){
  const values=(field.selectors||[]).map(s=>patron.querySelector(s)?.innerText?.trim()||"");
  if(field.type==="join")return values.filter(Boolean).join(field.separator??", ");
  const raw=values.find(Boolean)||"";
  if(field.type==="phone"){
    const digits=(raw.match(/\d+/g)||[]).join("");
    if(!digits)return field.fallbackToRaw!==false?raw:"";
    const sep=field.pairSeparator??".";
    let v=digits.replace(/(\d{2})(?=\d)/g,"$1"+sep);
    const max=Number(field.maxFormattedLength??15);
    return max>0?v.slice(0,max):v;
  }
  return raw;
}
function setLink(link,on,c){
  if(!link)return;
  const ls=c.linkState||{};
  link.classList.remove(on?ls.disabledClass:ls.enabledClass);
  link.classList.add(on?ls.enabledClass:ls.disabledClass);
  if(on){link.removeAttribute("aria-disabled");link.removeAttribute("tabindex")}
  else{link.setAttribute("aria-disabled",String(ls.disabledAria??"true"));link.setAttribute("tabindex",String(ls.disabledTabIndex??"-1"))}
}
function chooseInsertion(c,ctx,patron){
  for(const rule of c.insertion?.rules||[]){
    if(rule.target==="firstExpiredMessage"){const el=ctx.box?.querySelector(c.targets?.expiredMessageSelector||"");if(el)return el}
    if(rule.target==="expirationDate"){const el=first(c.targets?.expirationDateSelectors);if(el)return el}
    if(rule.target==="patronInfo"&&patron)return patron;
  }
  return patron;
}
function injectCss(c){
  if(c.appearance?.injectDefaultCss===false)return;
  const id=c.verification?.styleId||"verification-coordonnees-style";
  if(document.getElementById(id))return;
  const s=document.createElement("style");s.id=id;
  s.textContent=String(c.appearance?.defaultCss||"")+(c.appearance?.customCss?("\n"+c.appearance.customCss):"");
  document.head.appendChild(s);styleNode=s;
}
function build(c,patron){
  const box=document.createElement("div");
  box.id=c.verification?.containerId||"verification-coordonnees";
  box.setAttribute("role",c.verification?.role||"region");
  box.setAttribute("aria-label",c.verification?.ariaLabel||"Vérification des coordonnées");
  const h=document.createElement("h4");h.textContent=c.verification?.title||"";box.appendChild(h);
  const list=document.createElement("div");let idx=0;
  for(const field of c.fields||[]){
    idx++;
    const label=document.createElement("label"),cb=document.createElement("input");
    cb.type="checkbox";cb.className=c.verification?.checkboxClass||"vc-info-check";cb.id=`vc-chk-${Date.now()}-${idx}`;
    label.appendChild(cb);
    const strong=document.createElement("strong");strong.textContent=String(field.label||field.id||"")+": ";label.appendChild(strong);
    const span=document.createElement("span");span.textContent=fieldValue(field,patron);label.appendChild(span);
    list.appendChild(label);
  }
  box.appendChild(list);return box;
}
function run(){
  const c=C();if(!c?.enabled||!["shadow","live"].includes(c.mode))return;
  if(Scope&&!Scope.match(c.general?.scope).ok)return;
  const ctx=triggerContext(c);
  if(!ctx.hit){if(c.mode==="shadow")KT.record({module:ID,level:"info",kind:"shadow-contact-verification",triggered:false});return}
  const patron=first(c.targets?.patronInfoSelectors);
  if(!patron){if(c.mode==="shadow")KT.record({module:ID,level:"warn",kind:"shadow-contact-verification",triggered:true,patronInfo:false});return}
  const containerId=c.verification?.containerId||"verification-coordonnees";
  const processedKey=c.state?.processedDatasetKey||"vcProcessed";
  if(document.getElementById(containerId)||patron.dataset[processedKey]===String(c.state?.processedValue??"1"))return;
  const renew=[...document.querySelectorAll(c.targets?.renewLinkSelector||'a[href*="setstatus.pl"]')].filter(a=>!c.targets?.renewContextSelector||a.closest(c.targets.renewContextSelector));
  const insertion=chooseInsertion(c,ctx,patron);
  if(c.mode==="shadow"){
    KT.record({module:ID,level:"info",kind:"shadow-configurable-parity",triggered:true,patronInfo:true,renewLinks:renew.length,
      insertionTarget:insertion===patron?"patronInfo":insertion?.id||insertion?.className||"context",
      fields:(c.fields||[]).map(f=>({id:f.id,label:f.label,value:fieldValue(f,patron)}))});
    return;
  }
  injectCss(c);
  const box=build(c,patron);insertion?.appendChild(box);inserted=box;patronInfoNode=patron;
  linkSnapshots=renew.map(link=>({link,className:link.className,aria:link.getAttribute("aria-disabled"),tab:link.getAttribute("tabindex")}));
  renew.forEach(a=>setLink(a,false,c));
  const checks=[...box.querySelectorAll("."+CSS.escape(c.verification?.checkboxClass||"vc-info-check"))];
  const update=()=>{
    const on=c.verification?.requireAllChecked===false?checks.some(x=>x.checked):checks.every(x=>x.checked);
    renew.forEach(a=>setLink(a,on,c));
  };
  checks.forEach(x=>x.addEventListener("change",update));
  patron.dataset[processedKey]=String(c.state?.processedValue??"1");
}
function destroy(){
  inserted?.remove();inserted=null;
  styleNode?.remove();styleNode=null;
  for(const s of linkSnapshots){if(!s.link?.isConnected)continue;s.link.className=s.className;
    s.aria===null?s.link.removeAttribute("aria-disabled"):s.link.setAttribute("aria-disabled",s.aria);
    s.tab===null?s.link.removeAttribute("tabindex"):s.link.setAttribute("tabindex",s.tab);}
  linkSnapshots=[];
  const c=C(),key=c?.state?.processedDatasetKey||"vcProcessed";
  if(patronInfoNode)delete patronInfoNode.dataset[key];patronInfoNode=null;
}
function init(){ready(run)}
function onConfigChange(){destroy();run()}
const runtime={id:ID,init,destroy,onConfigChange};
if(KT.initModule)KT.initModule(runtime);else init();
})(window);