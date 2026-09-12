(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
const descriptors=new Map(),mountedGlobal=new Set(),mountedHome=new Set(),cleanupByModule=new Map(),scriptNodesByModule=new Map();let activeRouteId=null;
const PAGE_ROUTES=new Map();
function assetRoot(){return String(global.KohaToolsBootstrap?.assetRoot||"").replace(/\/?$/,"/")}
function enabled(id){const c=KT.Config?.getCanonical?.(id),access=KT.getService("access-control"),gate=KT.getService("prerequisites")?.status?.(id);return !!c&&c.enabled!==false&&!['off','blocked'].includes(c.mode)&&(!access?.moduleAllowed||access.moduleAllowed(id))&&(!global.KohaTools?.deploymentMode||global.KohaTools.deploymentMode!=="fresh-install"||!gate||gate.ok)}
function url(id){return `${location.origin}/cgi-bin/koha/mainpage.pl#kt/module/${encodeURIComponent(id)}`}
function pageUrl(pageId){const id=PAGE_ROUTES.get(Number(pageId));return id?url(id):`/cgi-bin/koha/tools/page.pl?page_id=${encodeURIComponent(pageId)}`}
function currentRoute(){const m=String(location.hash||"").match(/^#kt\/module\/([^/?#]+)/);return m?decodeURIComponent(m[1]):null}
function isHomePage(){return /\/cgi-bin\/koha\/mainpage\.pl$/.test(location.pathname)&&!currentRoute()}
function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});else queueMicrotask(fn)}
if(!global.__KohaToolsReady)global.__KohaToolsReady=ready;
function transformSource(text,id){
 let t=String(text||"").replaceAll("__KOHATOOLS_ASSET_ROOT__",assetRoot());
 for(const [page,cid] of PAGE_ROUTES){
   const target=url(cid).replace(/\$/g,"$$$$");
   t=t.replace(new RegExp(`/cgi-bin/koha/tools/page\\.pl\\?page_id=${page}(?=[\"'&<\\s]|$)`,"g"),target);
   t=t.replace(new RegExp(`https?://[^\"']+/cgi-bin/koha/tools/page\\.pl\\?page_id=${page}(?=[\"'&<\\s]|$)`,"g"),target);
 }
 t=t.replace(/document\.addEventListener\(\s*(["'])DOMContentLoaded\1\s*,/g,"window.__KohaToolsReady(");
 t=t.replace(/window\.addEventListener\(\s*(["'])load\1\s*,/g,"window.__KohaToolsReady(");
 t=t.replace(/(^|[}\n])\s*body\s*\{/gm,"$1 #kt-module-content{");
 t=t.replace(/(^|[}\n])\s*:root\s*\{/gm,"$1 #kt-module-content{");
 t=t.replace(/(^|[}\n])\s*\*\s*\{/gm,"$1 #kt-module-content *{");
 return t;
}
async function fetchSource(path,id){const r=await fetch(assetRoot()+String(path).replace(/^\//,""),{credentials:"same-origin",cache:"no-store"});if(!r.ok)throw new Error(`source-${r.status}`);return transformSource(await r.text(),id)}
async function executeScripts(scripts,id){
 const nodes=scriptNodesByModule.get(id)||new Set();scriptNodesByModule.set(id,nodes);
 for(const old of scripts){await new Promise((resolve,reject)=>{const s=document.createElement("script");for(const a of old.attributes||[])if(a.name!=="src")s.setAttribute(a.name,a.value);if(old.src)s.src=old.src;else{const type=String((old.attributes||[]).find(a=>a.name==="type")?.value||"").trim().toLowerCase();const classic=!type||type==="text/javascript"||type==="application/javascript";s.textContent=classic?`(()=>{\n"use strict";\n${old.textContent||""}\n})();`:old.textContent||"";}s.dataset.kohaToolsApp=id;nodes.add(s);if(old.src){s.onload=resolve;s.onerror=()=>reject(new Error("script-load-failed:"+old.src));document.head.appendChild(s)}else{document.head.appendChild(s);resolve()}}).catch(e=>KT.record?.({module:id,level:"error",kind:"app-script-failed",message:String(e.message||e)})); }
}
async function mountSource(desc,target,path){
 const text=await fetchSource(path,desc.id),tpl=document.createElement("template");tpl.innerHTML=text;
 const scripts=[...tpl.content.querySelectorAll("script")].map(x=>({src:x.getAttribute("src")?new URL(x.getAttribute("src"),location.href).href:null,textContent:x.textContent,attributes:[...x.attributes].filter(a=>a.name!=="src").map(a=>({name:a.name,value:a.value}))}));
 tpl.content.querySelectorAll("script").forEach(x=>x.remove());
 target.appendChild(tpl.content.cloneNode(true));global.__KohaToolsCurrentModuleId=desc.id;await executeScripts(scripts,desc.id);return true;
}
function mainTarget(){
 const area=document.querySelector("#area-news, #area-pending, .mainpage .row");
 if(area?.parentElement)return area.parentElement;
 const main=document.querySelector("main#main, main[role='main'], #main, #content, .main");
 if(main)return main;
 let fallback=document.getElementById("kt-route-fallback");
 if(!fallback){fallback=document.createElement("div");fallback.id="kt-route-fallback";fallback.className="kt-route-fallback";(document.querySelector("#container-main,.container-fluid,#wrapper")||document.body).appendChild(fallback)}
 return fallback;
}
function shell(desc){
 const host=mainTarget(); if(!host)return null;
 host.querySelectorAll(".kt-module-virtual-shell").forEach(x=>x.remove());
 const wrap=document.createElement("section");wrap.className="kt-module-virtual-shell";wrap.innerHTML=`<div class="kt-module-page-head"><div><div class="kt-module-page-kicker">Pimp My Koha · Module</div><h1>${String(desc.title||desc.id).replace(/[<&]/g,s=>s==="<"?"&lt;":"&amp;")}</h1></div><a class="btn btn-default" href="/cgi-bin/koha/mainpage.pl">← Accueil Koha</a></div><div id="kt-module-content" data-kt-module="${desc.id}"><div class="kt-module-loading">Chargement du module…</div></div>`;
 [...host.children].forEach(x=>{if(x!==wrap)x.dataset.ktRouteHidden=x.hidden?"was-hidden":"visible",x.hidden=true});host.appendChild(wrap);return wrap.querySelector("#kt-module-content");
}
function onUnmount(id,fn){if(!id||typeof fn!=="function")return()=>{};let set=cleanupByModule.get(id);if(!set){set=new Set();cleanupByModule.set(id,set)}set.add(fn);return()=>set.delete(fn)}
function runCleanup(id){const set=cleanupByModule.get(id);if(set){for(const fn of [...set]){try{fn()}catch(e){KT.record?.({module:id,level:"warn",kind:"module-cleanup-failed",message:String(e?.message||e)})}}cleanupByModule.delete(id)} const nodes=scriptNodesByModule.get(id);if(nodes){for(const n of nodes)try{n.remove()}catch(_){}scriptNodesByModule.delete(id)}}
function restoreHome(){if(activeRouteId){runCleanup(activeRouteId);activeRouteId=null}document.querySelectorAll("[data-kt-route-hidden]").forEach(x=>{x.hidden=x.dataset.ktRouteHidden==="was-hidden";delete x.dataset.ktRouteHidden});document.querySelectorAll(".kt-module-virtual-shell").forEach(x=>x.remove())}
async function mountRoute(){const id=currentRoute();if(!id){restoreHome();scheduleSurfaceMounts();return false}const desc=descriptors.get(id);if(!desc||!enabled(id)){restoreHome();return false}if(activeRouteId&&activeRouteId!==id)runCleanup(activeRouteId);activeRouteId=id;const target=shell(desc);if(!target)return false;target.innerHTML="";try{if(desc.special==="menu-builder")await mountSource(desc,target,"apps/navigation/menu-builder.html");else if(desc.special==="dashboard"){target.innerHTML='<div class="kt-module-launch-card"><p>Le tableau de bord analytique s’ouvre dans son interface dédiée.</p><button class="btn btn-primary" id="kt-dashboard-open">Ouvrir le tableau de bord</button></div>';document.getElementById("kt-dashboard-open")?.addEventListener("click",()=>global.KohaToolsDashboard?.open?.());}else await mountSource(desc,target,desc.source);document.title=`${desc.title||id} › Koha`;return true}catch(e){target.innerHTML=`<div class="alert alert-danger"><strong>Module impossible à charger.</strong><br>${String(e.message||e)}</div>`;KT.record?.({module:id,level:"error",kind:"application-mount-failed",message:String(e.message||e)});return false}}
function homeContainer(){let c=document.getElementById("kt-home-modules");if(c)return c;const area=document.querySelector("#area-news");c=document.createElement("div");c.id="kt-home-modules";c.className="kt-home-modules";c.setAttribute("aria-label","Modules de l'accueil Koha");if(area?.parentElement)area.parentElement.insertBefore(c,area);else (mainTarget()||document.body).appendChild(c);return c}
function homeLayout(){return KT.getService("home-layout")}
function homeBox(desc){let box=document.querySelector(`#kt-home-modules > [data-kt-home-module="${CSS.escape(desc.id)}"]`);if(box)return box;box=document.createElement("section");box.className="kt-home-module";box.dataset.ktHomeModule=desc.id;box.dataset.ktHomeState="pending";homeContainer().appendChild(box);return box}
function adoptLegacy(desc,box){if(!desc.adoptSelector||homeLayout()?.config?.().adoptLegacy===false)return false;const nodes=[...document.querySelectorAll(desc.adoptSelector)].filter(n=>!n.closest("#kt-home-modules")&&!n.closest(".kt-module-virtual-shell"));if(!nodes.length)return false;for(const node of nodes){const mark=document.createComment(`KohaTools:${desc.id}:legacy-origin`);node.parentNode?.insertBefore(mark,node);node.dataset.ktAdoptedBy=desc.id;box.appendChild(node)}box.dataset.ktHomeState="adopted";box.dataset.ktHomeAdopted="true";return true}
function applyHomeLayout(){if(!isHomePage())return false;const c=document.getElementById("kt-home-modules");if(!c)return false;const svc=homeLayout(),items=[...descriptors.values()].filter(d=>d.displayMode==="home-widget"||d.displayMode==="hybrid"),ordered=svc?.ordered?.(items)||items;for(const d of ordered){const box=c.querySelector(`[data-kt-home-module="${CSS.escape(d.id)}"]`);if(!box)continue;box.hidden=!enabled(d.id)||!(svc?.isVisible?.(d.id)??true);c.appendChild(box)}return true}
async function mountHome(desc){
 if(!isHomePage()||currentRoute())return;
 const active=enabled(desc.id),box=homeBox(desc),svc=homeLayout(),visible=active&&(svc?.isVisible?.(desc.id)??true);box.hidden=!visible;
 if(mountedHome.has(desc.id)){applyHomeLayout();return}
 // During migration, adopt the historical Koha surface even when the module is
 // disabled/hidden, so OFF and homepage visibility remain authoritative.
 if(adoptLegacy(desc,box)){mountedHome.add(desc.id);applyHomeLayout();return}
 if(!active||!visible){box.dataset.ktHomeState=active?"hidden-unmounted":"disabled-unmounted";applyHomeLayout();return}
 try{await mountSource(desc,box,desc.homeWidgetSource||desc.source);box.dataset.ktHomeState="mounted";mountedHome.add(desc.id)}catch(e){box.remove();KT.record?.({module:desc.id,level:"warn",kind:"home-widget-mount-failed",message:String(e.message||e)})}
 applyHomeLayout();
}
async function mountGlobal(desc){if(mountedGlobal.has(desc.id)||!enabled(desc.id))return;if(desc.adoptSelector&&document.querySelector(desc.adoptSelector)){mountedGlobal.add(desc.id);return}const box=document.createElement("div");box.dataset.ktGlobalModule=desc.id;document.body.appendChild(box);try{await mountSource(desc,box,desc.source);mountedGlobal.add(desc.id)}catch(e){box.remove();KT.record?.({module:desc.id,level:"warn",kind:"global-widget-mount-failed",message:String(e.message||e)})}}
let homeSchedule=Promise.resolve();
function scheduleSurfaceMounts(){ready(()=>{homeSchedule=homeSchedule.then(async()=>{const all=[...descriptors.values()],homes=all.filter(d=>d.displayMode==="home-widget"||d.displayMode==="hybrid"),ordered=homeLayout()?.ordered?.(homes)||homes;for(const d of ordered)await mountHome(d);applyHomeLayout();for(const d of all)if(d.displayMode==="global-widget")await mountGlobal(d)}).catch(e=>KT.record?.({module:"module-host",level:"warn",kind:"surface-schedule-failed",message:String(e?.message||e)}))})}
function register(desc){if(!desc?.id)throw new Error("module-host-descriptor-id-required");descriptors.set(desc.id,{...desc});if(desc.pageId)PAGE_ROUTES.set(Number(desc.pageId),desc.id);scheduleSurfaceMounts();if(currentRoute()===desc.id)ready(mountRoute);return desc}
function list(){return [...descriptors.values()].map(d=>({...d,url:url(d.id)}))}
function open(id){if(!enabled(id)){KT.record?.({module:id,level:"info",kind:"module-open-blocked-access"});return false}const d=descriptors.get(id);if(d?.special==="dashboard"){global.KohaToolsDashboard?.open?.();return true}if(location.pathname.endsWith("/mainpage.pl")){location.hash=`kt/module/${encodeURIComponent(id)}`;mountRoute()}else location.href=url(id);return true}
function refreshHome(){scheduleSurfaceMounts();applyHomeLayout();return true}
addEventListener("hashchange",mountRoute);ready(()=>{if(currentRoute())mountRoute();else scheduleSurfaceMounts()});
KT.registerService("module-host",{register,list,url,pageUrl,currentRoute,open,mountRoute,mountSource,pageRoutes:PAGE_ROUTES,isHomePage,applyHomeLayout,refreshHome,refresh:refreshHome,onUnmount,runCleanup});
})(window);
