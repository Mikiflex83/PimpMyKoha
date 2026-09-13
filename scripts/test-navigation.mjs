import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('FULL-DIST/kohatools/core/navigation.js','utf8');
const qualityCenter=fs.readFileSync('FULL-DIST/kohatools/apps/quality/quality-center.html','utf8');
const adminPanel=fs.readFileSync('FULL-DIST/kohatools/admin/panel.js','utf8');
let service=null;
const configs={
  ready:{enabled:true,mode:'live'},
  disabled:{enabled:false,mode:'live'},
  off:{enabled:true,mode:'off'},
  blocked:{enabled:true,mode:'live'},
  'dashboard-analytics':{enabled:true,mode:'live'}
};
const prerequisiteStatus={
  ready:{ok:true},
  disabled:{ok:true},
  off:{ok:true},
  blocked:{ok:false},
  'dashboard-analytics':{ok:false}
};
const services={
  'access-control':{moduleAllowed:id=>id!=='forbidden'},
  prerequisites:{status:id=>prerequisiteStatus[id]||{ok:true}},
  'module-host':{url:id=>`#kt/module/${id}`}
};
const document={
  readyState:'loading',
  addEventListener(){},
  querySelector(){return null},
  querySelectorAll(){return []},
  getElementById(){return null},
  documentElement:{}
};
const KT={
  Config:{getCanonicalPersistent:id=>configs[id]||{enabled:true,mode:'live'}},
  getService:id=>services[id],
  registerService:(id,value)=>{if(id==='navigation')service=value}
};
const context={window:null,KohaTools:KT,document,console};context.window=context;
vm.runInNewContext(source,context,{filename:'navigation.js'});

assert.ok(service,'le service navigation doit être enregistré');
assert.equal(service.isVisible({type:'module',module:'ready'},'all'),true);
assert.equal(service.isVisible({type:'module',module:'disabled'},'all'),false);
assert.equal(service.isVisible({type:'module',module:'off'},'all'),false);
assert.equal(service.isVisible({type:'module',module:'blocked'},'all'),false,'un module à prérequis manquants ne doit pas rester cliquable');
assert.equal(service.isVisible({type:'module',module:'forbidden'},'all'),false,'le contrôle d’accès doit masquer le module');
assert.equal(service.isVisible({type:'action',action:'dashboard'},'all'),false,'le tableau de bord non configuré doit être masqué');
assert.match(source,/querySelectorAll\("#kt-user-tools-section,#kt-user-tools-root"\)/,'le rafraîchissement doit supprimer les deux nœuds du menu');
assert.match(qualityCenter,/moduleAvailable\(target\)/,'le Centre qualité doit réutiliser le même contrôle de disponibilité');
assert.match(qualityCenter,/disabled title="\$\{esc\(why\)\}">À configurer/,'un sous-module bloqué ne doit pas proposer une ouverture sans effet');
assert.match(adminPanel,/Historiques \/ migration \(\$\{historicalIds\.length\}\)/,'la console doit rendre les modules historiques consultables séparément');
assert.match(adminPanel,/activeCount=visibleIds\.length-inactiveCount/,'le compteur Disponible doit refléter les fiches réellement affichables');

console.log('PASS navigation: disponibilité, prérequis, accès, tableau de bord et anti-duplication');
