import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('FULL-DIST/kohatools/core/config.js','utf8');
function boot({certified={},blocked={}}={}){
  const services={
    prerequisites:{status:id=>blocked[id]?{ok:false,blocking:[blocked[id]]}:{ok:true,blocking:[]}},
    production:{isSuppressed:()=>false,isLive:()=>false},
    canary:{shouldRunLive:()=>false}
  };
  const KT={deploymentMode:'fresh-install',getService:id=>services[id]||null,getLocalOverrides:()=>({})};
  const context={window:null,KohaTools:KT,__KohaToolsFreshInstallCertified:{...certified},localStorage:{setItem(){}}};
  context.window=context;
  vm.runInNewContext(source,context,{filename:'config.js'});
  context.KohaTools.deploymentMode='fresh-install';
  context.KohaTools.Config.setDefaults({testing:{allowLocalOverrides:false},canonicalModules:{
    app:{enabled:true,nativeApplication:true},
    setup:{enabled:true,nativeApplication:true,freshInstallCore:true},
    certifiedApp:{enabled:true,nativeApplication:true},
    blockedApp:{enabled:true,nativeApplication:true}
  }});
  return context.KohaTools.Config;
}

let c=boot({certified:{certifiedApp:true}});
assert.equal(c.getCanonical('app').mode,'blocked','une application native non certifiée ne doit pas être publiée automatiquement');
assert.equal(c.getCanonical('app').blockedByCertification,true);
assert.equal(c.getCanonical('setup').mode,'live','l’assistant de première installation doit rester accessible');
assert.equal(c.getCanonical('certifiedApp').mode,'live','une application certifiée doit pouvoir être utilisée');
assert.equal(c.getCanonical('certifiedApp').freshInstallCertified,true);

c=boot({certified:{blockedApp:true},blocked:{blockedApp:'missing-report'}});
assert.equal(c.getCanonical('blockedApp').mode,'blocked','un prérequis obligatoire doit rester prioritaire sur la certification');
assert.ok(Array.isArray(c.getCanonical('blockedApp').blockedByPrerequisites));

console.log('PASS fresh-install native gates: core setup, certification and prerequisites');
