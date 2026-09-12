(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
function local(){
 return {
   kind:"localStorage",
   get(key){try{return localStorage.getItem(key)}catch(_){return null}},
   set(key,value){try{localStorage.setItem(key,String(value));return true}catch(_){return false}},
   remove(key){try{localStorage.removeItem(key);return true}catch(_){return false}},
   getJSON(key,fallback=null){try{const v=this.get(key);return v==null?fallback:JSON.parse(v)}catch(_){return fallback}},
   setJSON(key,value){return this.set(key,JSON.stringify(value))}
 };
}
let adapter=local();
KT.registerService("storage",{
  getAdapter:()=>adapter,
  setAdapter(next){if(next&&typeof next.get==="function"&&typeof next.set==="function")adapter=next;return adapter},
  get:(...a)=>adapter.get(...a),
  set:(...a)=>adapter.set(...a),
  remove:(...a)=>adapter.remove(...a),
  getJSON:(...a)=>adapter.getJSON(...a),
  setJSON:(...a)=>adapter.setJSON(...a)
});
})(window);