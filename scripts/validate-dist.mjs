import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import os from 'node:os';

const root=path.resolve('FULL-DIST/kohatools');
const expected=(process.argv.find(x=>x.startsWith('--expected='))||'').split('=')[1]||'';
const errors=[];const notes=[];
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]});
if(!fs.existsSync(root)){console.error('FULL-DIST/kohatools absent');process.exit(1)}
const files=walk(root);
const channelLoader=path.resolve('install/channel-loader.js');
if(!fs.existsSync(channelLoader))errors.push('install/channel-loader.js absent');
else{const r=spawnSync(process.execPath,['--check',channelLoader],{encoding:'utf8'});if(r.status!==0)errors.push(`channel-loader.js invalide: ${r.stderr.trim()}`)}
for(const f of files.filter(x=>x.endsWith('.js'))){const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status!==0)errors.push(`JS invalide: ${path.relative(root,f)} ${r.stderr.trim()}`)}
for(const f of files.filter(x=>x.endsWith('.json'))){try{JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){errors.push(`JSON invalide: ${path.relative(root,f)} ${e.message}`)}}
// Syntaxe des scripts inline des applications HTML : le CI doit couvrir le même code que le navigateur.
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'pimp-my-koha-inline-'));let inlineCount=0;
try{for(const f of files.filter(x=>x.endsWith('.html'))){const html=fs.readFileSync(f,'utf8');const rx=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi;let m,i=0;while((m=rx.exec(html))){const attrs=m[1]||'',code=m[2]||'';if(/\bsrc\s*=/i.test(attrs)||/type\s*=\s*["'](?:application\/(?:json|ld\+json)|importmap)["']/i.test(attrs)||!code.trim())continue;inlineCount++;i++;const ext=/type\s*=\s*["']module["']/i.test(attrs)?'.mjs':'.js',tf=path.join(tmp,`inline-${inlineCount}${ext}`);fs.writeFileSync(tf,code);const r=spawnSync(process.execPath,['--check',tf],{encoding:'utf8'});if(r.status!==0)errors.push(`Script HTML invalide: ${path.relative(root,f)}#${i} ${r.stderr.trim()}`)}}}finally{fs.rmSync(tmp,{recursive:true,force:true})}
const core=fs.readFileSync(path.join(root,'core/core.js'),'utf8');const vm=core.match(/KT\.version\s*=\s*"([^"]+)"/);const version=vm?.[1]||'';
const manifest=JSON.parse(fs.readFileSync(path.join(root,'config/manifest.json'),'utf8'));
const defaults=JSON.parse(fs.readFileSync(path.join(root,'config/product-defaults.json'),'utf8'));
if(!version)errors.push('Version introuvable dans core/core.js');
if(expected&&version!==expected)errors.push(`Version runtime ${version} != tag/release ${expected}`);
if(manifest.suiteVersion!==version)errors.push(`manifest.suiteVersion ${manifest.suiteVersion} != ${version}`);
if(defaults.suiteVersion!==version)errors.push(`product-defaults.suiteVersion ${defaults.suiteVersion} != ${version}`);
const ids=new Set();for(const m of manifest.modules||[]){if(ids.has(m.id))errors.push(`ID manifeste dupliqué: ${m.id}`);ids.add(m.id);if(m.nextModule&&!fs.existsSync(path.join(root,m.nextModule)))errors.push(`Source nextModule absente: ${m.id} -> ${m.nextModule}`)}
for(const [cid,cfg] of Object.entries(defaults.canonicalModules||{})){for(const pr of cfg.prerequisites||[]){if(pr.copySource&&!fs.existsSync(path.join(root,pr.copySource)))errors.push(`Prérequis absent: ${cid} -> ${pr.copySource}`)}}

for(const f of files.filter(x=>/[/\\]modules[/\\][^/\\]+\.js$/i.test(x))){const src=fs.readFileSync(f,'utf8');if(/["'`]modules\/[A-Za-z0-9_.-]+\.js["'`]/.test(src))errors.push(`Dépendance directe module→module interdite: ${path.relative(root,f)}`)}
for(const [cid,cfg] of Object.entries(defaults.canonicalModules||{})){if(cfg.dependsOnModules||cfg.requiredModules||cfg.moduleDependencies)errors.push(`Dépendance métier déclarée interdite: ${cid}`)}

for(const f of files.filter(x=>/prerequisites[/\\]sql[/\\].+\.sql$/i.test(x))){const sql=fs.readFileSync(f,'utf8').replace(/--.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,' ').trim().toUpperCase();if(/\b(UPDATE|DELETE|INSERT|REPLACE|ALTER|DROP|TRUNCATE|CREATE)\b/.test(sql))errors.push(`SQL non read-only détecté: ${path.relative(root,f)}`)}
for(const forbidden of ['profiles/dracenie.json','profiles/dracenie-production-bootstrap.json','profiles/dracenie-assets','docs/MIGRATION-DRACENIE.md']){if(fs.existsSync(path.join(root,forbidden)))errors.push(`Élément privé interdit dans le dépôt public: ${forbidden}`)}
for(const f of files.filter(x=>/\.(?:html|json|js|md)$/i.test(x))){const txt=fs.readFileSync(f,'utf8');if(/Dracénie|koha\.dracenie\.com|@dracenie\./i.test(txt))errors.push(`Libellé/donnée d'installation privée dans le public: ${path.relative(root,f)}`)}
const lic=fs.readFileSync('LICENSE','utf8');if(/distribution interne|validation préalable de la licence/i.test(lic))notes.push('AVERTISSEMENT: licence publique encore à valider (voir docs/LICENCE-AVANT-PUBLICATION.md)');
const release=JSON.parse(fs.readFileSync('release/release.json','utf8'));if(release.version!==version)errors.push(`release/release.json ${release.version} != ${version}`);
if(!['stable','canary','dev'].includes(String(release.channel||'')))errors.push(`Canal release invalide: ${release.channel||'absent'}`);
const ac=defaults.accessControl||{};
if(!fs.existsSync(path.join(root,'core/access-control.js')))errors.push('core/access-control.js absent');
if(!fs.existsSync(path.join(root,'dev/developer-tools.js')))errors.push('dev/developer-tools.js absent');
if((ac.roles?.developer?.allowedUsernames||[]).length)errors.push('Les defaults publics ne doivent autoriser aucun username développeur par défaut');
if(ac.compatibility?.allowLegacyOpenAdmin===true)errors.push('Le dépôt public ne doit pas activer allowLegacyOpenAdmin');
notes.push(`${files.filter(x=>x.endsWith('.js')).length} JS contrôlés`,`${inlineCount} scripts HTML contrôlés`,`${ids.size} entrées manifeste`,`${Object.keys(defaults.canonicalModules||{}).length} configurations canoniques`,`canal release ${release.channel}`,'contrôle accès/DEV public fail-closed');
if(errors.length){console.error('\nFAIL\n- '+errors.join('\n- '));process.exit(1)}
console.log(`PASS Pimp My Koha ${version}\n- ${notes.join('\n- ')}`);
