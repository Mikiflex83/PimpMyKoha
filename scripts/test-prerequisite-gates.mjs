import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("FULL-DIST/kohatools/core/prerequisites.js","utf8");
let service=null;
const configs={
 blocked:{prerequisites:[{id:"core",required:true,configPath:"x"}]},
 partial:{prerequisites:[{id:"plugin",required:true,blockingScope:"capability",capabilities:["restore"],configPath:"plugin",maxKohaVersionExclusive:"26.05"}]}
};
const services={health:{kohaVersion:()=> "25.11.04"}};
const KT={Config:{getCanonicalPersistent:id=>configs[id]||{},effective:{canonicalModules:configs}},registerService:(id,v)=>{if(id==="prerequisites")service=v},getService:id=>services[id]};
const context={window:null,KohaTools:KT,navigator:{},fetch:async()=>({ok:true,text:async()=>""})};context.window=context;
vm.runInNewContext(source,context,{filename:"prerequisites.js"});
assert.equal(service.status("blocked").ok,false);
assert.equal(service.status("partial").ok,true,"un besoin de fonction ne doit pas bloquer tout le module");
assert.equal(service.statusFor("partial","restore").ok,false);
services.health.kohaVersion=()=> "26.05.00";
assert.equal(service.statusFor("partial","restore").ok,true,"UndeleteRecords ne doit plus être requis sous Koha 26.05+");
console.log("PASS prerequisite scopes/version gates");
