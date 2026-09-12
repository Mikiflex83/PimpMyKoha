import fs from 'node:fs';
import path from 'node:path';
const [repo,version,sha,outArg,impactArg,previousIndexArg]=process.argv.slice(2);
if(!repo||!version||!sha||!outArg){console.error('usage: node build-pages-release.mjs owner/repo version sha256 outdir [impact.json] [previous-latest.json]');process.exit(2)}
const out=path.resolve(outArg),runtime=path.resolve('FULL-DIST/kohatools'),meta=JSON.parse(fs.readFileSync('release/release.json','utf8'));
if(meta.version!==version)throw new Error(`release metadata ${meta.version} != ${version}`);
const channel=String(meta.channel||'stable').toLowerCase();if(!['stable','canary','dev'].includes(channel))throw new Error(`unsupported channel ${channel}`);
const [owner,name]=repo.split('/');const base=name===`${owner}.github.io`?`https://${owner}.github.io/`:`https://${owner}.github.io/${name}/`;const runtimeRoot=`${base}releases/${version}/`;const tag=`v${version}`;const asset=`pimp-my-koha-${version}.zip`;
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(path.join(out,'releases',version),{recursive:true});fs.cpSync(runtime,path.join(out,'releases',version),{recursive:true});
const impact=impactArg&&fs.existsSync(impactArg)?JSON.parse(fs.readFileSync(impactArg,'utf8')):null;
const release={...meta,channel,runtimeRoot,releasePage:`https://github.com/${repo}/releases/tag/${tag}`,downloadUrl:`https://github.com/${repo}/releases/download/${tag}/${asset}`,issuesUrl:`https://github.com/${repo}/issues/new`,repository:{slug:repo,issuesUrl:`https://github.com/${repo}/issues/new`},sha256:sha,...(impact?{impact}:{} )};
let previous={};if(previousIndexArg&&fs.existsSync(previousIndexArg)){try{previous=JSON.parse(fs.readFileSync(previousIndexArg,'utf8'))}catch{previous={}}}
const channels={...(previous.channels||{})};channels[channel]=version;
const releases={...(previous.releases||{})};releases[version]=release;
const index={schema:'pimp-my-koha.release-index.v1',product:'pimp-my-koha',generatedAt:new Date().toISOString(),channels,releases};
for(const ch of ['stable','canary','dev']){const v=channels[ch];if(v&&releases[v])index[ch]=releases[v]}
fs.writeFileSync(path.join(out,'latest.json'),JSON.stringify(index,null,2)+'\n');fs.writeFileSync(path.join(out,'.nojekyll'),'');
const channelLoader=path.resolve('install/channel-loader.js');if(fs.existsSync(channelLoader))fs.copyFileSync(channelLoader,path.join(out,'channel-loader.js'));
const rows=['stable','canary','dev'].filter(ch=>index[ch]?.version).map(ch=>`<li><b>${ch}</b> : ${index[ch].version}</li>`).join('');
const html=`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Pimp My Koha</title><style>body{font-family:system-ui,sans-serif;max-width:850px;margin:50px auto;padding:0 20px;color:#263746}a{color:#1f6fb2}.box{border:1px solid #dce2e8;border-radius:12px;padding:20px;background:#f8fafb}</style><h1>Pimp My Koha</h1><div class="box"><p>Canaux publiés :</p><ul>${rows}</ul><p><a href="latest.json">latest.json</a></p></div></html>`;
fs.writeFileSync(path.join(out,'index.html'),html);
console.log(JSON.stringify(index,null,2));
