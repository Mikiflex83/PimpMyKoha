(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;let manifest=null,defaults=null;
const intents={
 "recherche":{label:"Recherche de documents",words:["recherche","facette","autocomplete","résultat","cote","google books","prix littéraire"],categories:["catalogue-recherche"]},
 "notice":{label:"Présentation d’une notice",words:["notice","détail","couverture","genre","statut","exemplaire"],categories:["catalogue-recherche"]},
 "circulation":{label:"Circulation & retours",words:["circulation","retour","prêt","renouvel","perdu","litige","historique"],categories:["circulation-historique"]},
 "reservations":{label:"Réservations & transferts",words:["réservation","transfert","navette","retrait","holds"],categories:["reservations-transferts"]},
 "lecteurs":{label:"Lecteurs",words:["adhérent","lecteur","téléphone","adresse","garant","catégorie"],categories:["adherents"]},
 "periodiques":{label:"Périodiques",words:["périodique","abonnement","numéro","réclamation","réception"],categories:["periodiques"]},
 "catalogage":{label:"Catalogage & autorités",words:["catalogage","autorité","marc","099","6xx","z3950"],categories:["catalogage-autorites"]},
 "qualite":{label:"Qualité des données",words:["qualité","doublon","anomalie","audit","règle","désherbage","inventaire"],categories:["qualite"]},
 "accueil":{label:"Accueil & navigation",words:["accueil","menu","raccourci","navigation","sidebar"],categories:["accueil-annonces","navigation","interface-outils"]},
 "analyse":{label:"Statistiques & analyse",words:["statistique","dashboard","analyse","carte","fréquentation","comptage"],categories:["applications-pages"]}
};
function canonicalOf(m){return defaults?.modules?.[m.id]?.config?.canonicalModule||null}
function ui(cid){return defaults?.moduleUi?.modules?.[cid]||{}}
function index(){const map=new Map();for(const m of manifest?.modules||[]){const cid=canonicalOf(m);if(!cid)continue;const r=map.get(cid)||{canonicalId:cid,title:ui(cid).title||m.title||cid,description:ui(cid).userDescription||m.description||'',categories:new Set(),text:''};r.categories.add(m.category||'');r.text += ' '+[cid,r.title,r.description,m.title,m.description,m.category,m.legacyFile,m.nextModule].filter(Boolean).join(' ');map.set(cid,r)}return [...map.values()].map(r=>({...r,categories:[...r.categories],text:r.text.toLowerCase()}))}
function search(q){const terms=String(q||'').toLowerCase().split(/\s+/).filter(Boolean);if(!terms.length)return index();return index().map(r=>({r,score:terms.reduce((s,t)=>s+(r.text.includes(t)?2:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.r.title.localeCompare(b.r.title)).map(x=>x.r)}
function recommendations(key){const it=intents[key];if(!it)return [];return index().map(r=>{let score=0;for(const c of r.categories)if(it.categories.includes(c))score+=4;for(const w of it.words)if(r.text.includes(w))score+=1;return {r,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.r.title.localeCompare(b.r.title)).map(x=>x.r)}
function init(m,d){manifest=m;defaults=d}
KT.registerService('discovery',{init,intents:()=>intents,index,search,recommendations});
})(window);
