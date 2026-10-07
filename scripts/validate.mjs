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
console.log(`OK: ${events.length} tournaments, ${events.reduce((n,e)=>n+e.teams.length,0)} teams, ${published} articles; usage statistics verified.`);
