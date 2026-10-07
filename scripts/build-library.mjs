import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const events=JSON.parse(await fs.readFile(path.join(root,'data/events.json'),'utf8'));
const catalog=JSON.parse(await fs.readFile(path.join(root,'data/species_catalog.json'),'utf8'));
const indexes=[];
for(const e of events){
 const full=JSON.parse(await fs.readFile(path.join(root,`static/data/${e.slug}.json`),'utf8'));
 const sets=[],setIndexes=new Map();
 const setId=p=>{const mon={...p,image:undefined,role:undefined};const identity=JSON.stringify(mon);if(!setIndexes.has(identity)){setIndexes.set(identity,sets.length);sets.push(mon)}return setIndexes.get(identity)};
 const compact={schema:2,event:full.event,sets,records:full.records.map(r=>({rank:r.rank,player:r.player,player_label:r.player_label,country:r.country,record:r.record,swiss:r.swiss,rating:r.rating,codes:r.codes,trainer:r.trainer,team_url:r.team_url,links:r.links,opponent_rate:r.opponent_rate,opponent_opponent_rate:r.opponent_opponent_rate,rounds:r.rounds,source_player_id:r.source_player_id,pokemon:r.pokemon.map(setId)}))};
 await fs.writeFile(path.join(root,`static/data/${e.slug}.json`),JSON.stringify(full));
 await fs.writeFile(path.join(root,`static/data/${e.slug}-explorer.json`),JSON.stringify(compact));
 const vr=JSON.parse(await fs.readFile(path.join(root,`data/results/${e.slug}.json`),'utf8'));
 await fs.writeFile(path.join(root,`static/data/${e.slug}-victory-road.json`),JSON.stringify({event:full.event,records:vr.masters,other_divisions:vr.other_divisions,usage:vr.usage}));
 indexes.push({id:e.id,slug:e.slug,name:e.name,type:e.type,date:e.date,end_date:e.end_date,count:compact.records.length,teams:compact.records.filter(r=>r.pokemon.length===6).length,source:e.type==='regional'?'Pokedata':'Victory Road',url:`data/${e.slug}-explorer.json`});
 if(![441,442,443].includes(e.id)){
  const title=`${e.name} 結果と公開構築`;
  const metadata={title,date:e.date+'T00:00:00+09:00',publishDate:'2026-10-08T00:00:00+09:00',lastmod:'2026-10-08T00:00:00+09:00',event_id:e.id,format:e.format,kind:'大会結果',draft:false,summary:`${e.winner}が優勝。Victory Roadの掲載${e.published_results}件${e.standings_count?`とマスター全${e.standings_count}件の成績`:''}を収録。`,description:'掲載された全順位、公開構築、成績を日本語で整理。'};
  const note=e.type==='regional'?`マスター部門の参加人数は${e.players}人。Victory Roadの掲載結果${e.published_results}件と、Pokedataの全順位${e.standings_count}件・6匹が揃う公開チーム${e.full_team_count}件を収録しています。全順位の検索と技・持ち物の閲覧は[構築・成績を探す](../../explorer/?event=${e.slug})から利用できます。`:e.type==='grassroots'?`VR主催のオンライン大会です。参加人数の掲載値は${e.players}人、結果表の${e.published_results}人に6匹の並びが掲載されています。OTSは各行の出典リンクから確認できます。公式大会の採用率とは別に閲覧します。`:`公式のオンライン・レート大会です。マスター部門の掲載参加人数は${e.players.toLocaleString('ja-JP')}人。Victory Roadに掲載された上位${e.published_results}人の順位・最終レート・構築画像へのリンク・レンタルコードを収録しています。全参加者の順位ではありません。`;
  const body=`## 大会の記録\n\n優勝は${e.winner}。開催期間は${e.date}〜${e.end_date}、ゲームはPokémon Champions、ルールはRegulation M-Cです。\n\n${note}\n\n## 数字の読み方\n\n${e.type==='ladder'?'レートは最終レートの掲載値。CPの確定前の見積もりは、本サイトでは成績の指標に使っていません。構築が画像でのみ掲載されている場合はリンクを残しています。':'「スイス」はVictory Roadのスイスラウンド成績。「大会通算」はPokedataが算出した決勝トーナメント・不戦勝を含む成績です。1試合はBO3のマッチ単位で、ゲーム単位の勝率とは区別してください。'}\n\n6匹の並びだけから、実際の先発・選出4匹・配分・勝因は特定できません。対戦内容を確認した解説は、根拠とともに別途追記します。\n\n## 収録日について\n\nこの記事は大会開催日に遡って整理しています。実際の公開・データ取得は2026年10月8日です。取得時点で出典に掲載されていた結果を使用しています。\n`;
  await fs.writeFile(path.join(root,`content/results/${e.slug}.md`),JSON.stringify(metadata,null,2)+'\n\n'+body);
 }
}
const summary={checked:'2026-10-08',events:events.length,vr_results:events.reduce((n,e)=>n+e.published_results,0),standings:events.reduce((n,e)=>n+e.standings_count,0),teams:events.reduce((n,e)=>n+e.full_team_count,0),indexes,species:Object.values(catalog).sort((a,b)=>a.name.localeCompare(b.name,'ja')).map(p=>({id:p.id,name:p.name,english:p.english,image:p.image_local}))};
await fs.writeFile(path.join(root,'data/library.json'),JSON.stringify(summary,null,2));
console.log(`Library: ${summary.events} events, ${summary.vr_results} VR results, ${summary.standings} Masters standings, ${summary.teams} complete public teams.`);
