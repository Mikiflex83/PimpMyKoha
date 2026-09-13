import assert from 'node:assert/strict';
import fs from 'node:fs';

const defaults=JSON.parse(fs.readFileSync('FULL-DIST/kohatools/config/product-defaults.json','utf8'));
const panel=fs.readFileSync('FULL-DIST/kohatools/admin/panel.js','utf8');
const navigation=fs.readFileSync('FULL-DIST/kohatools/core/navigation.js','utf8');
const recipe=fs.readFileSync('FULL-DIST/kohatools/core/recipe.js','utf8');
const config=fs.readFileSync('FULL-DIST/kohatools/core/config.js','utf8');
const launcher=fs.readFileSync('FULL-DIST/kohatools/modules/admin-launcher.js','utf8');
const loader=fs.readFileSync('FULL-DIST/kohatools/loader.js','utf8');
const quality=fs.readFileSync('FULL-DIST/kohatools/apps/quality/quality-center.html','utf8');
const restoration=fs.readFileSync('FULL-DIST/kohatools/apps/restoration/index.html','utf8');
const preflight=fs.readFileSync('FULL-DIST/kohatools/admin/preflight-app.html','utf8');
const installDoc=fs.readFileSync('FULL-DIST/kohatools/docs/INSTALLATION.md','utf8');

const canonical=defaults.canonicalModules||{};
const protectedIds=new Set(defaults.lifecycle?.protectedCanonicalIds||[]);
assert.ok(protectedIds.has('admin-console-launcher'),'le point d’entrée Pimp My Koha doit être protégé');
assert.equal(canonical['admin-console-launcher']?.access?.audience,'admin');
assert.equal(canonical['installation-preflight']?.access?.audience,'admin');
assert.equal(canonical['installation-preflight']?.freshInstallCore,true,'l’assistant doit rester disponible avant certification');
const accessLoad=loader.indexOf('"core/access-control.js"');
const accessInit=loader.indexOf('access?.init?.(defaults)');
assert.ok(accessLoad>=0&&accessInit>accessLoad,'le contrôle d’accès doit être chargé avant son initialisation');

const adminOnly=['user-menu-manager','intranet-nav-manager','home-layout-manager','quality-rule-lab'];
for(const id of adminOnly) assert.equal(canonical[id]?.access?.audience,'admin',`${id} doit être réservé à l’administration`);
const capabilityPolicies={
 inventory:['kohaAny',['tools','editcatalogue']],
 weeding:['kohaAny',['tools','editcatalogue']],
 restoration:['kohaAll',['editcatalogue']],
 'patron-map':['kohaAll',['borrowers','reports']],
 'dashboard-analytics':['kohaAll',['reports']],
 'quality-authorities':['kohaAll',['editcatalogue']],
 'quality-biblios':['kohaAll',['editcatalogue']],
 'quality-items':['kohaAll',['editcatalogue']],
 'quality-serials':['kohaAll',['serials']],
 'quality-patrons':['kohaAll',['borrowers']],
 'quality-loans':['kohaAll',['circulate']],
 'quality-reservations':['kohaAll',['circulate']],
 'quality-transfers':['kohaAll',['circulate']]
};
for(const [id,[kind,expected]] of Object.entries(capabilityPolicies)){
  assert.deepEqual(canonical[id]?.access?.[kind],expected,`${id} doit suivre les droits Koha existants`);
}

assert.match(config,/blockedByCertification:true/,'une application native non certifiée doit être bloquée sur une installation neuve');
assert.match(config,/freshInstallCore===true/,'le noyau de première installation doit rester accessible');
assert.match(recipe,/revision:"native-application-v1"/);
assert.match(recipe,/manualValidationRequired:true/,'une application native doit recevoir une vraie validation métier');
assert.match(recipe,/mode:"direct"/,'une application native doit être testable sans faux mode historique');

assert.match(navigation,/\["off","blocked"\]/,'un module bloqué ne doit pas apparaître dans les menus');
assert.match(navigation,/moduleAllowed\?\.\(node\.module\)===false/,'les menus doivent respecter les droits du module');
assert.match(quality,/moduleAllowed/,'le Centre qualité doit filtrer ses outils selon les droits');
assert.match(quality,/isAdmin/,'les réglages techniques du Centre qualité doivent être réservés à l’administration');
assert.match(restoration,/hasKohaCapability\?\.\("circulate"\)/,'les actions de prêt/retour de la restauration doivent vérifier le droit de circulation');
assert.match(restoration,/pipelineButton\.hidden = !circulationAllowed/,'le traitement prêt/retour doit être masqué sans droit de circulation');

assert.match(panel,/Migration des anciens modules/);
assert.match(panel,/MIGRATION_DECISION_KEY/);
assert.match(panel,/Retirer volontairement/);
assert.match(panel,/Préparer l’installation/);
assert.match(panel,/Tests & validation/);
assert.doesNotMatch(panel,/Modules & versions/,'l’ancien intitulé ambigu ne doit plus être présenté');
assert.match(panel,/standardManifestModules\(\)/,'les modules normaux doivent être séparés de la migration');
assert.match(panel,/historicalCanonical\(\)/,'la migration doit posséder son propre inventaire');
assert.match(panel,/REQUIS PAR PIMP MY KOHA/,'un composant protégé doit être clairement signalé');

assert.match(launcher,/Pimp My Koha/,'le bouton d’administration doit utiliser le nom du produit');
assert.match(preflight,/Préparer l’installation/);
assert.match(preflight,/Vérifier mon Koha/);
assert.match(preflight,/const isDev=/,'les détails techniques doivent être conditionnés au rôle développeur');
assert.doesNotMatch(installDoc,/Ouvrir ensuite `mainpage\.pl#kt\/module\/installation-preflight`/,'l’administrateur ne doit pas avoir à connaître une URL interne');
assert.match(installDoc,/Pimp My Koha → Administration → Préparer l’installation/);

console.log('PASS user workflows: agent/admin/developer, migration separation, access, onboarding and wording');
