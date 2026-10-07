import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const events=JSON.parse(await fs.readFile(path.join(root,'data/events.json'),'utf8'));
const references=JSON.parse(await fs.readFile(path.join(root,'data/pokemon_reference.json'),'utf8'));
const dictionary=JSON.parse(await fs.readFile(path.join(root,'data/dictionary.json'),'utf8'));
Object.assign(dictionary.terms,{'Garchompite Z':'ガブリアスナイトＺ','Raichunite Y':'ライチュウナイトＹ','Floettite':'フラエッテナイト','Dragoninite':'カイリュナイト','Meowsticite':'ニャオニクスナイト','Froslassite':'ユキメノコナイト','Glimmoranite':'キラフロルナイト','Golisopite':'グソクムシャナイト','Staraptite':'ムクホークナイト','Delphoxite':'マフォクシナイト',
'Adaptability':'てきおうりょく','Armor Tail':'テイルアーマー','Clear Body':'クリアボディ','Competitive':'かちき','Compound Eyes':'ふくがん','Cursed Body':'のろわれボディ','Defiant':'まけんき','Drought':'ひでり','Emergency Exit':'ききかいひ','Flash Fire':'もらいび','Flower Veil':'フラワーベール','Inner Focus':'せいしんりょく','Pixilate':'フェアリースキン','Poison Touch':'どくしゅ','Regenerator':'さいせいりょく','Rock Head':'いしあたま','Soundproof':'ぼうおん','Torrent':'げきりゅう','Toxic Debris':'どくげしょう','Weak Armor':'くだけるよろい',
'Ancient Power':'げんしのちから','Aqua Jet':'アクアジェット','Armor Cannon':'アーマーキャノン','Aura Sphere':'はどうだん','Aurora Veil':'オーロラベール','Baneful Bunker':'トーチカ','Baton Pass':'バトンタッチ','Bitter Blade':'むねんのつるぎ','Blizzard':'ふぶき','Body Press':'ボディプレス','Calm Mind':'めいそう','Clanging Scales':'スケイルノイズ','Clangorous Soul':'ソウルビート','Coil':'とぐろをまく','Dazzling Gleam':'マジカルシャイン','Detect':'みきり','Double-Edge':'すてみタックル','Dragon Claw':'ドラゴンクロー','Draining Kiss':'ドレインキッス','Drill Run':'ドリルライナー','Earthquake':'じしん','Encore':'アンコール','Energy Ball':'エナジーボール','Eruption':'ふんか','Extreme Speed':'しんそく','Flip Turn':'クイックターン','Follow Me':'このゆびとまれ','Giga Drain':'ギガドレイン','Grass Knot':'くさむすび','Gunk Shot':'ダストシュート','Head Smash':'もろはのずつき','Helping Hand':'てだすけ','Hyper Beam':'はかいこうせん','Hypnosis':'さいみんじゅつ','Ice Beam':'れいとうビーム','Ice Punch':'れいとうパンチ','Icy Wind':'こごえるかぜ','Imprison':'ふういん','Infestation':'まとわりつく','Kowtow Cleave':'ドゲザン','Last Respects':'おはかまいり','Leech Life':'きゅうけつ','Moonblast':'ムーンフォース','Muddy Water':'だくりゅう','Perish Song':'ほろびのうた','Poison Jab':'どくづき','Psychic':'サイコキネシス','Psychic Fangs':'サイコファング','Psyshock':'サイコショック','Quick Attack':'でんこうせっか','Quick Guard':'ファストガード','Quiver Dance':'ちょうのまい','Rain Dance':'あまごい','Rock Tomb':'がんせきふうじ','Scald':'ねっとう','Scale Shot':'スケイルショット','Shadow Sneak':'かげうち','Snarl':'バークアウト','Spiky Shield':'ニードルガード','Steel Roller':'アイアンローラー','Stomping Tantrum':'じだんだ','Substitute':'みがわり','Sucker Punch':'ふいうち','Sunny Day':'にほんばれ','Swords Dance':'つるぎのまい','Taunt':'ちょうはつ','Throat Chop':'じごくづき','Thunderbolt':'10まんボルト','Toxic':'どくどく','Trick Room':'トリックルーム','Wave Crash':'ウェーブタックル','Yawn':'あくび'});
for(const event of events)for(const team of event.teams)for(const p of team.pokemon){p.item_ja=dictionary.terms[p.item]??p.item;p.ability_ja=dictionary.terms[p.ability]??p.ability;p.moves_ja=p.moves.map(m=>dictionary.terms[m]??m)}
const selected=events.filter(e=>[441,442,443].includes(e.id));
const teams=selected.flatMap(e=>e.teams.map(t=>({...t,event:e})));
const round=n=>Math.round(n*10)/10;
const frequency=(values,total)=>{const map=new Map();for(const value of values)map.set(value,(map.get(value)??0)+1);return[...map].map(([name,count])=>({name,count,rate:round(count/total*100)})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'ja'))};
const allPokemon=[...new Map(teams.flatMap(t=>t.pokemon).map(p=>[p.id,p])).values()];
const models={};
for(const pokemon of allPokemon){
 const records=teams.filter(t=>t.pokemon.some(p=>p.id===pokemon.id));
 const sets=records.map(t=>t.pokemon.find(p=>p.id===pokemon.id));
 const n=records.length;
 const partners=frequency(records.flatMap(t=>t.pokemon.filter(p=>p.id!==pokemon.id).map(p=>p.id)),n).map(p=>({...p,id:p.name,name:allPokemon.find(x=>x.id===p.name).name}));
 const perEvent=selected.map(e=>{const count=e.teams.filter(t=>t.pokemon.some(p=>p.id===pokemon.id)).length;return{id:e.id,name:e.name,date:e.date,count,total:e.teams.length,rate:round(count/e.teams.length*100),slug:e.slug}});
 const earlier=perEvent.filter(e=>e.date==='2026-09-19').reduce((n,e)=>n+e.count,0)/8*100;
 const later=perEvent.filter(e=>e.date==='2026-09-26').reduce((n,e)=>n+e.count,0)/16*100;
 models[pokemon.id]={id:pokemon.id,name:pokemon.name,english:pokemon.english,image:pokemon.image_local,count:n,rate:round(n/teams.length*100),delta:round(later-earlier),reference:references[pokemon.id]??null,events:perEvent,partners,sets:records.map(t=>({event:t.event.name,slug:t.event.slug,date:t.event.date,player:t.player,rank:t.rank,pokemon:t.pokemon})),tournament:{moves:frequency(sets.flatMap(p=>p.moves_ja),n),items:frequency(sets.map(p=>p.item_ja),n),abilities:frequency(sets.map(p=>p.ability_ja),n),natures:frequency(sets.map(p=>p.nature_ja),n)}};
}
const ranking=Object.values(models).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'ja')).map((p,index)=>({id:p.id,name:p.name,english:p.english,image:p.image,count:p.count,rate:p.rate,delta:p.delta,rank:index+1,speed:p.reference?.stats.find(s=>s.key==='speed')?.value??0,types:p.reference?.types??[],rankedRank:p.reference?.rank??null,events:p.events}));
const pairCounts=new Map();
for(const team of teams){const ids=team.pokemon.map(p=>p.id).sort();for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const key=ids[i]+'|'+ids[j];pairCounts.set(key,(pairCounts.get(key)??0)+1)}}
const pairs=[...pairCounts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12).map(([key,count])=>({pokemon:key.split('|').map(id=>({id,name:models[id].name,image:models[id].image})),count,rate:round(count/teams.length*100)}));
await fs.writeFile(path.join(root,'data/events.json'),JSON.stringify(events,null,2));
await fs.writeFile(path.join(root,'data/dictionary.json'),JSON.stringify(dictionary,null,2));
await fs.writeFile(path.join(root,'data/pokemon.json'),JSON.stringify(models,null,2));
await fs.writeFile(path.join(root,'data/dashboard.json'),JSON.stringify({sample:teams.length,pokemon:ranking.length,event_count:selected.length,format:'Regulation M-C',checked:'2026-10-08',ranking,pairs},null,2));
await fs.mkdir(path.join(root,'content/pokemon'),{recursive:true});
await fs.writeFile(path.join(root,'content/pokemon/_index.md'),JSON.stringify({title:'ポケモンデータ',description:'大会の採用率、技・持ち物、同時採用と基本データを比較。'},null,2)+'\n');
for(const p of Object.values(models))await fs.writeFile(path.join(root,`content/pokemon/${p.id}.md`),JSON.stringify({title:p.name,description:`${p.name}の大会採用率、技・持ち物・同時採用、種族値とタイプ相性。`,pokemon_id:p.id,date:'2026-10-08T00:00:00+09:00',draft:false},null,2)+'\n');
console.log(`Generated ${ranking.length} Pokémon pages; ${teams.length} teams, ${pairs.length} pairs.`);
