import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('FULL-DIST/kohatools/core/canary.js','utf8');
const loader=fs.readFileSync('FULL-DIST/kohatools/loader.js','utf8');

function create({developer=true}={}){
  let service=null;
  const storage=new Map();
  const manifest={modules:[{
    id:'legacy-example',legacyFile:'042-example.js',nextModule:'modules/example-candidate.js',
    production20260911:'active',canaryCapable:true,sourceStatus:'candidate'
  }]};
  const defaults={
    modules:{'legacy-example':{config:{canonicalModule:'example'}}},
    testing:{browserCanary:{enabled:true,allowFreshInstallDeveloperTest:true,storageKey:'test.canary'}}
  };
  const services={
    'access-control':{can:role=>role==='developer'&&developer,currentUser:()=>developer?'dev':'staff'},
    production:{isLive:()=>false},
    lifecycle:{status:()=>({active:true})}
  };
  const KT={
    deploymentMode:'fresh-install',
    Config:{effective:defaults,defaults,getCanonical:()=>({enabled:true})},
    getService:id=>services[id],
    registerService:(id,value)=>{if(id==='canary')service=value}
  };
  const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
  const context={window:null,KohaTools:KT,localStorage,console};context.window=context;
  vm.runInNewContext(source,context,{filename:'canary.js'});
  services.canary=service;
  service.init(manifest,defaults);
  return service;
}

const canary=create();
assert.equal(canary.eligible('example').ok,true,'un développeur doit pouvoir tester une candidate historique en fresh-install');
const activation=canary.activate('example');
assert.equal(activation.ok,true);
assert.equal(canary.shouldRunLive('example'),true);
assert.deepEqual([...activation.entry.nextModules],['modules/example-candidate.js']);
assert.match(activation.entry.mappingHash,/^fresh-/);
assert.equal(canary.deactivate('example').ok,true);
assert.equal(canary.shouldRunLive('example'),false);

const staff=create({developer:false});
assert.equal(staff.eligible('example').ok,false,'le test fresh-install doit rester réservé au développeur');
assert.equal(staff.activate('example').reason,'developer-required');
assert.match(loader,/freshInstall\?\.supported!==true&&!freshCanary/,'le loader doit conserver le blocage fresh-install sauf test développeur explicite');

console.log('PASS fresh-install canary: test local développeur, mapping borné et aucun impact autre poste');
