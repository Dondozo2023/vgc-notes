import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const events=JSON.parse(await fs.readFile(path.join(root,'data/events.json'),'utf8'));
const meta=JSON.parse(await fs.readFile(path.join(root,'data/metagame.json'),'utf8'));
const fail=message=>{throw new Error(message)};
const ids=new Set();
for(const event of events){
 if(ids.has(event.id))fail('Duplicate event');ids.add(event.id);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(event.date)||!Number.isFinite(Date.parse(event.date)))fail('Invalid event date');
 if(!Number.isInteger(event.players)||event.players<=0)fail('Invalid player count');
 if(new URL(event.source).hostname!=='limitlessvgc.com'||new URL(event.team_source).hostname!=='limitlessvgc.com')fail('Unexpected source');
 if(event.teams.length!==8)fail('Expected eight complete teams');
 for(const team of event.teams){
  if(team.pokemon.length!==6)fail('Team is not six Pokémon');
  if(new Set(team.pokemon.map(p=>p.id)).size!==6)fail('Duplicate Pokémon');
  for(const p of team.pokemon){
   if(!/^[a-z0-9-]+$/.test(p.id)||!p.name||!p.english||!p.item||!p.ability||p.moves.length!==4)fail('Incomplete Pokémon record');
   await fs.access(path.join(root,'static',p.image_local));
  }
 }
 if(event.winner!==event.teams[0].player)fail('Winner does not match first place');
}
const sampleEvents=events.filter(e=>(meta.event_ids??[441,442,443]).includes(e.id));
const sample=sampleEvents.reduce((n,e)=>n+e.teams.length,0);
if(meta.sample!==sample)fail('Incorrect comparison sample');
for(const stat of meta.stats){
 const count=sampleEvents.flatMap(e=>e.teams).filter(t=>t.pokemon.some(p=>p.id===stat.id)).length;
 if(stat.count!==count||stat.percent!==Math.round(count/sample*1000)/10)fail('Incorrect usage percentage');
}
const sections=['results','teams','metagame'];
let published=0;
for(const section of sections){
 const entries=await fs.readdir(path.join(root,'content',section));
 for(const filename of entries.filter(p=>p.endsWith('.md')&&!p.startsWith('_'))){
  const content=await fs.readFile(path.join(root,'content',section,filename),'utf8');
  const start=content.match(/^\{[\s\S]*?\n\}/)?.[0];if(!start)fail('Missing front matter');
  const front=JSON.parse(start);
  if(front.event_id&&!ids.has(front.event_id))fail('Article refers to missing event');
  if(!front.date||!front.publishDate||!front.lastmod)fail('Missing independent dates');
  if(!front.draft)published++;
 }
}
const profilesPath=path.join(root,'data/pokemon.json');
try{
 const profiles=JSON.parse(await fs.readFile(profilesPath,'utf8'));
 const dashboard=JSON.parse(await fs.readFile(path.join(root,'data/dashboard.json'),'utf8'));
 const sampleTeams=sampleEvents.flatMap(e=>e.teams);
 if(dashboard.sample!==sampleTeams.length)fail('Incorrect dashboard sample');
 if(dashboard.pokemon!==Object.keys(profiles).length)fail('Incorrect species count');
 for(const [id,p]of Object.entries(profiles)){
  const records=sampleTeams.filter(t=>t.pokemon.some(mon=>mon.id===id));
  if(p.count!==records.length||p.rate!==Math.round(records.length/sampleTeams.length*1000)/10)fail('Incorrect profile adoption rate');
  for(const key of ['items','abilities','natures'])if(p.tournament[key].reduce((n,r)=>n+r.count,0)!==p.count)fail('Incorrect conditional distribution');
  if(p.tournament.moves.reduce((n,r)=>n+r.count,0)!==p.count*4)fail('Incorrect move denominator');
  for(const partner of p.partners){const count=records.filter(t=>t.pokemon.some(mon=>mon.id===partner.id)).length;if(partner.count!==count||partner.rate!==Math.round(count/p.count*1000)/10)fail('Incorrect teammate frequency');}
  const ref=p.reference;
  if(!ref||ref.season!=='M-6'||ref.rule!=='ダブル'||new URL(ref.source).hostname!=='champs.pokedb.tokyo')fail('Missing reference scope');
  for(const form of ref.forms){if(form.stats.length!==6||form.stats.reduce((n,s)=>n+s.value,0)!==form.total)fail('Incorrect base stat total');if(form.effectiveness.weaknesses.some(t=>t.rate<=1)||form.effectiveness.resistances.some(t=>t.rate>=1))fail('Incorrect type effectiveness grouping');}
  for(const rows of Object.values(ref.ranked))for(const row of rows)if(!Number.isFinite(row.rate)||row.rate<0||row.rate>100)fail('Invalid ranked rate');
 }
 console.log(`OK: ${Object.keys(profiles).length} Pokémon profiles; conditional rates, teammate frequencies, form stats and reference populations verified.`);
}catch(error){if(error.code!=='ENOENT')throw error;}
console.log(`OK: ${events.length} tournaments, ${events.reduce((n,e)=>n+e.teams.length,0)} teams, ${published} articles; usage statistics verified.`);
