(function(global){"use strict";const KT=global.KohaTools;if(!KT)return;
const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const S={
 fieldByName(name,root=document){return root.querySelector(`[name="${String(name).replace(/"/g,'\\"')}"]`);},
 fieldById(id,root=document){return root.getElementById?root.getElementById(id):root.querySelector(`#${id}`);},
 headerIndex(table,aliases=[]){const hs=[...table.querySelectorAll("thead th")];const aa=aliases.map(norm);for(let i=0;i<hs.length;i++){const technical=norm(hs[i].dataset.colname||"");if(technical&&aa.includes(technical))return {found:true,index:i,confidence:0.95,matchedBy:"data-colname"};}
 for(let i=0;i<hs.length;i++){const h=norm(hs[i].textContent);if(aa.includes(h))return {found:true,index:i,confidence:0.9,matchedBy:"header-alias"};}return {found:false,reason:"not-found"};},
 waitFor(selector,timeout=3000){const el=document.querySelector(selector);if(el)return Promise.resolve(el);return new Promise((resolve,reject)=>{const o=new MutationObserver(()=>{const x=document.querySelector(selector);if(x){o.disconnect();resolve(x);}});o.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>{o.disconnect();reject(new Error("timeout"));},timeout);});}
};KT.registerService("serials",S);
})(window);