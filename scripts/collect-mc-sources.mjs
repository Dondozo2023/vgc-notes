// The audited M-C inventory as of 2026-10-08. Re-audit the calendars before extending it.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dest=path.join(root,'.cache/mc-sources');await fs.mkdir(dest,{recursive:true});
async function get(file,url,body){
 const host=new URL(url).hostname;if(!['victoryroad.pro','www.pokedata.ovh','raw.githubusercontent.com'].includes(host))throw Error('Unexpected source host');
 const response=await fetch(url,{...(body?{method:'POST',body:new URLSearchParams(body)}:{}),signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`${file}: HTTP ${response.status}`);
 await fs.writeFile(path.join(dest,file),await response.text());console.log('Saved',file);
}
await get('vr-calendar.html','https://victoryroad.pro/2027-season-calendar/');
await get('pokedata-new.html','https://www.pokedata.ovh/standings2/');
await get('pokedata-old.html','https://www.pokedata.ovh/standingsVGC/');
for(const [key,slug]of Object.entries({baltimore:'2027-baltimore',frankfurt:'2027-frankfurt',brisbane:'2027-brisbane',recife:'2027-recife',sep26:'vr-sep26','sep26-2':'vr-sep26-2',oct26:'vr-oct26',gc:'2027-global-challenge-i'}))await get(`vr-${key}.html`,`https://victoryroad.pro/${slug}/`);
for(const [key,id,old]of [['baltimore',1000034,'0000192'],['frankfurt',1000070,'0000194'],['brisbane',1000068,'0000193'],['recife',1000072,null]]){
 await get(`pokedata-${key}-masters.html`,'https://www.pokedata.ovh/standings2/',{id:String(id),division:'Masters'});
 await get(`pokedata-${key}-source.json`,`https://www.pokedata.ovh/standings2/standings/${id}_Masters.json`);
 await get(`pokedata-${key}-roster.json`,`https://www.pokedata.ovh/standings2/RosterData/${id}.json`);
 if(old)await get(`pokedata-old-${key}.json`,`https://www.pokedata.ovh/standingsVGC/${old}/masters/${old}_Masters.json`);
}
for(const name of ['pokemon_species_names','move_names','ability_names','item_names','nature_names'])await get(name+'.csv',`https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/${name}.csv`);
console.log('Fetched the audited inventory. Review source changes, then import the snapshot. No publishing is performed by this script.');
