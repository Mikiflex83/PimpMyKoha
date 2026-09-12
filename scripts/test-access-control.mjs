import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('FULL-DIST/kohatools/core/access-control.js','utf8');

function create({username='alice',bootAccess={},compat=false,superlibrarian=false,selectors=[],policy={}}={}){
  let service=null;
  const userNode={dataset:{loggedinusername:username,isSuperlibrarian:superlibrarian?'is_superlibrarian':''},getAttribute:k=>k==='data-loggedinusername'?username:null,textContent:username,classList:{contains:c=>superlibrarian&&c==='is_superlibrarian'}};
  const doc={documentElement:{dataset:{}},querySelector(sel){
    if(sel.includes('loggedinusername'))return userNode;
    return selectors.includes(sel)?{}:null;
  }};
  const accessControl={roles:{manager:{allowedUsernames:[]},admin:{allowedUsernames:[]},developer:{allowedUsernames:[],explicitOnly:true}},channels:{stable:{minimumRole:'staff'},canary:{minimumRole:'admin'},dev:{minimumRole:'developer'}},compatibility:{allowLegacyOpenAdmin:compat}};
  const KT={Config:{effective:{accessControl,adminUi:{allowedUsernames:[]}},defaults:{accessControl},getCanonicalPersistent:id=>({access:policy[id]||{}})},registerService:(id,s)=>{if(id==='access-control')service=s},emit(){}};
  const context={window:null,KohaTools:KT,KohaToolsBootstrap:{access:bootAccess},document:doc,console};context.window=context;
  vm.runInNewContext(source,context,{filename:'access-control.js'});
  service.init({accessControl,adminUi:{allowedUsernames:[]},canonicalModules:{}});
  return service;
}

let a=create({username:'alice',bootAccess:{adminUsers:['alice'],developerUsers:['alice']}});
assert.equal(a.role(),'developer');
assert.equal(a.can('developer'),true);

a=create({username:'bob',bootAccess:{developerUsers:['alice']},compat:true});
assert.equal(a.role(),'staff','une liste explicite DEV doit désactiver le fallback admin legacy pour les autres comptes');

a=create({username:'bob',compat:true});
assert.equal(a.role(),'admin','compatibilité legacy conservée uniquement lorsqu’aucune liste explicite n’existe');

a=create({username:'agent',selectors:['#catalog-search-dropdown'],policy:{catalogueOnly:{audience:'staff',kohaAll:['catalogue']},reportsOnly:{audience:'staff',kohaAll:['reports']}}});
assert.equal(a.moduleAllowed('catalogueOnly'),true);
assert.equal(a.moduleAllowed('reportsOnly'),false);

a=create({username:'root',superlibrarian:true,policy:{reportsOnly:{audience:'staff',kohaAll:['reports']}}});
assert.equal(a.hasKohaCapability('superlibrarian'),true);
assert.equal(a.moduleAllowed('reportsOnly'),true);

console.log('PASS access-control: DEV explicite, fallback legacy borné, capacités Koha optionnelles, superlibrarian');
