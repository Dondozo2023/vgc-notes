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
 const allowed=['limitlessvgc.com','victoryroad.pro','www.pokedata.ovh'];
 if(!allowed.includes(new URL(event.source).hostname)||!allowed.includes(new URL(event.team_source).hostname))fail('Unexpected source');
 if(event.format!=='Regulation M-C'||event.game!=='Pokémon Champions'||event.division!=='Masters')fail('Wrong tournament scope');
 if(event.teams.length!==8)fail('Expected eight result previews');
 for(const team of event.teams){
  if(event.type==='ladder'&&team.pokemon.length===0)continue;
  if(team.pokemon.length!==6)fail('Team is not six Pokémon');
  if(new Set(team.pokemon.map(p=>p.id)).size!==6)fail('Duplicate Pokémon');
  for(const p of team.pokemon){
   if(!/^[a-z0-9-]+$/.test(p.id)||!p.name||!p.english)fail('Incomplete Pokémon identity');
   if(event.type==='regional'&&(!p.item||!p.ability||p.moves?.length!==4))fail('Incomplete detailed Pokémon record');
   await fs.access(path.join(root,'static',p.image_local));
  }
 }
 if(event.winner.toLocaleLowerCase()!==event.teams[0].player.toLocaleLowerCase())fail('Winner does not match first place');
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
 const sampleTeams=events.filter(e=>e.type==='regional').flatMap(e=>e.teams);
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

const library=JSON.parse(await fs.readFile(path.join(root,'data/library.json'),'utf8'));
let standings=0,complete=0,vrTotal=0;
for(const event of events){
 const vr=JSON.parse(await fs.readFile(path.join(root,`data/results/${event.slug}.json`),'utf8'));
 const full=JSON.parse(await fs.readFile(path.join(root,`static/data/${event.slug}.json`),'utf8'));
 const mini=JSON.parse(await fs.readFile(path.join(root,`static/data/${event.slug}-explorer.json`),'utf8'));
 if(vr.masters.length!==event.published_results||vr.masters.some(r=>r.division!=='Masters'))fail('VR scope/count mismatch');
 if(new Set(vr.masters.map(r=>r.rank)).size!==vr.masters.length)fail('Duplicate VR placing');
 if(full.event.division!=='Masters'||full.event.format!=='Regulation M-C'||full.event.count!==full.records.length||mini.records.length!==full.records.length)fail('Snapshot scope/count mismatch');
 for(let i=0;i<full.records.length;i++){
  const r=full.records[i],m=mini.records[i];
  if(r.rank!==m.rank||r.player!==m.player||r.pokemon.length!==m.pokemon.length)fail('Compact record mismatch');
  const miniPokemon=mini.schema===2?m.pokemon.map(id=>mini.sets[id]):m.pokemon;
  for(let j=0;j<r.pokemon.length;j++)if(miniPokemon[j].id!==r.pokemon[j].id||miniPokemon[j].item!==r.pokemon[j].item||JSON.stringify(miniPokemon[j].moves)!==JSON.stringify(r.pokemon[j].moves))fail('Compressed set mismatch');
  if(!Number.isInteger(r.rank)||r.rank<1||!r.player)fail('Invalid placing/player');
  if(event.type==='regional'){
   if(r.source_details.o&&r.source_details.o.d!=='M')fail('Team division mismatch');
   if(!r.record||['wins','losses','ties'].some(k=>!Number.isInteger(r.record[k])||r.record[k]<0))fail('Invalid match record');
   if(JSON.stringify(r.source_details.s)!==JSON.stringify([r.record.wins,r.record.losses,r.record.ties]))fail('Match record changed from source');
   if(r.rounds.length!==r.source_details.r.length)fail('Lost round history');
   if(r.pokemon.length>6)fail('Too many Pokémon in sheet');
  }
  for(const p of r.pokemon){
   if(!/^[a-z0-9-]+$/.test(p.id)||!p.name)fail('Invalid source Pokémon');
   await fs.access(path.join(root,'static',p.image_local));
   if(event.type==='regional'&&p.moves.length!==4)fail('Missing source moves');
  }
 }
 if(event.type==='regional'){
  if(full.records.length!==event.standings_count)fail('Missing Masters records');
  const fullTeams=full.records.filter(r=>r.pokemon.length===6).length;if(fullTeams!==event.full_team_count)fail('Full team count mismatch');
  if(new Set(full.records.map(r=>r.source_player_id)).size!==full.records.length)fail('Duplicate source player');
  for(const r of full.records)for(const round of r.rounds)if(round.opponent_id!==null&&round.opponent_id!==-1&&!full.records.some(p=>p.source_player_id===round.opponent_id))fail('Unknown opponent ID');
  standings+=full.records.length;complete+=fullTeams;
 }
 vrTotal+=vr.masters.length;
}
if(library.standings!==standings||library.teams!==complete||library.vr_results!==vrTotal||library.events!==events.length)fail('Library totals mismatch');
console.log(`OK: ${standings} Masters standings, ${complete} complete public teams, ${vrTotal} VR results; division, source records, downloads and round links verified.`);
