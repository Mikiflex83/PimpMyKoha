(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
const cfg=KT.Config.getCanonical("admin-console-launcher");if(!cfg?.enabled)return;
function username(){const e=document.querySelector(cfg.security?.usernameSelector||".loggedinusername[data-loggedinusername]");return String(e?.dataset?.loggedinusername||e?.textContent||"").trim().toLowerCase()}
function allowed(){const access=KT.getService("access-control");if(access?.can)return access.can("admin");const a=(cfg.security?.allowedUsernames||[]).map(x=>String(x).toLowerCase()),u=username();return !!u&&a.includes(u)}
function add(){
 if(!allowed()||document.getElementById("kt-admin-link"))return;
 const selectors=cfg.targets?.userMenu||["#michael-tools-menu .dropdown-menu","#logged-in-menu",".loggedin-menu","#user-menu"];
 let menu=null;for(const s of selectors){menu=document.querySelector(s);if(menu)break}
 const invoke=e=>{e.preventDefault();KT.getService("admin-ui")?.open("overview")};
 if(menu){
   const li=document.createElement("li"),a=document.createElement("a");a.id="kt-admin-link";a.href="#";a.className="dropdown-item";a.innerHTML=`<i class="${cfg.appearance?.icon||"fa fa-cog"}" aria-hidden="true"></i> ${cfg.label||"KohaTools"}`;a.addEventListener("click",invoke);li.appendChild(a);menu.appendChild(li);return;
 }
 if(cfg.targets?.floatingFallback!==false){
   const b=document.createElement("button");b.id="kt-admin-link";b.type="button";b.textContent=cfg.label||"KohaTools";b.style.cssText="position:fixed;right:12px;bottom:12px;z-index:2147480000;border:1px solid #1f6fb2;background:#1f6fb2;color:#fff;border-radius:7px;padding:7px 10px;font-weight:700;box-shadow:0 3px 14px rgba(0,0,0,.2)";b.addEventListener("click",invoke);document.body.appendChild(b)
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",add,{once:true});else add();
setTimeout(add,1200);
})(window);