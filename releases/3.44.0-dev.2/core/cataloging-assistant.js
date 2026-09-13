(function(global){"use strict";const KT=global.KohaTools;if(!KT)return;
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLowerCase();
const getJSON=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||"null");return v===null?fallback:v;}catch(_){return fallback;}};
const setJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}};
KT.registerService("cataloging-assistant",{norm,getJSON,setJSON});
})(window);