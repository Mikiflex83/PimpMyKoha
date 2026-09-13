(function(global){"use strict";const KT=global.KohaTools;if(!KT)return;
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function open(){
 const V=KT.getService("validation"),C=KT.getService("canary");if(!V)return false;
 document.getElementById("kt-validation-dashboard")?.remove();
 const rows=V.recommendedOrder();
 const overlay=document.createElement("div");overlay.id="kt-validation-dashboard";
 overlay.style.cssText="position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,.45);padding:3vh;overflow:auto";
 const panel=document.createElement("div");panel.style.cssText="max-width:1300px;margin:auto;background:#fff;border-radius:10px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.25)";
 const counts=rows.reduce((a,x)=>{const s=V.get(x.canonicalId).state;a[s]=(a[s]||0)+1;return a;},{});
 panel.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h2 style="margin:0">Recette KohaTools</h2><div>${rows.length} modules · ${counts.validated||0} validés · ${counts.canary||0} en canary · ${counts.rejected||0} rejetés</div></div><button id="kt-vd-close">Fermer</button></div>
 <div style="overflow:auto;margin-top:14px"><table class="table table-striped"><thead><tr><th>Module</th><th>Risque</th><th>État</th><th>Canary</th><th>Legacy</th><th>Retirable</th><th>Blocages</th></tr></thead><tbody>
 ${rows.map(x=>{const st=V.get(x.canonicalId),ca=C?.status(x.canonicalId)?.active,files=x.readiness.mappings.map(m=>m.legacyFile).join(", ");return `<tr><td><code>${esc(x.canonicalId)}</code></td><td>${esc(x.risk.level)} (${x.risk.score})</td><td>${esc(st.state)}</td><td>${ca?"oui":"non"}</td><td>${esc(files)}</td><td>${x.readiness.ready?"OUI":"non"}</td><td>${esc(x.readiness.blockers.join(", "))}</td></tr>`}).join("")}
 </tbody></table></div>`;
 overlay.appendChild(panel);document.body.appendChild(overlay);
 panel.querySelector("#kt-vd-close").onclick=()=>overlay.remove();overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};return true;
}
KT.registerService("validation-dashboard",{open});
global.KohaToolsOpenValidationDashboard=open;
})(window);