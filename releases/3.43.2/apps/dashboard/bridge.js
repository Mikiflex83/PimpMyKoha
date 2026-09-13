(function(global){"use strict";
const REMOTE=String(window.KohaTools?.Config?.getCanonical?.('dashboard-analytics')?.installation?.loaderUrl||'');
async function ensure(){
 if(typeof global.loadDashboardKoha==="function")return true;
 if(!REMOTE){console.warn("KohaTools dashboard: loaderUrl non configuré");return;}
if(document.querySelector('script[data-kt-dashboard-loader="1"]')){
   for(let i=0;i<60;i++){if(typeof global.loadDashboardKoha==="function")return true;await new Promise(r=>setTimeout(r,100));}
   return false;
 }
 return new Promise(resolve=>{const s=document.createElement("script");s.src=REMOTE;s.dataset.ktDashboardLoader="1";s.onload=()=>resolve(typeof global.loadDashboardKoha==="function");s.onerror=()=>resolve(false);document.head.appendChild(s)});
}
async function open(){if(await ensure())global.loadDashboardKoha();else alert("Tableau de bord : chargeur indisponible.");}
global.KohaToolsDashboard={ensure,open};
})(window);
