(()=>{
 const node=document.querySelector('#library-data');if(!node)return;
 const config=JSON.parse(node.textContent),base=config.baseURL;
 const selector=document.querySelector('#library-event'),rank=document.querySelector('#library-rank'),query=document.querySelector('#library-query'),complete=document.querySelector('#library-complete');
 const status=document.querySelector('#library-status'),results=document.querySelector('#library-results'),usage=document.querySelector('#library-usage');
 const normalize=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('ja');
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
 const link=(text,url)=>{const a=el('a',text);const u=new URL(url,location.origin);if(!['http:','https:'].includes(u.protocol))return el('span',text);a.href=u.href;if(u.origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer';}return a};
 const image=p=>{const img=el('img');img.src=base+p.image_local;img.alt=p.name;img.width=40;img.height=40;img.loading='lazy';return img};
 let saved=new Set();try{saved=new Set(JSON.parse(localStorage.getItem('vgc-saved-teams')??'[]'));}catch{}
 let records=[],filtered=[],page=0,request=0;const size=50,cache=new Map();
 const params=new URLSearchParams(location.search);if(config.indexes.some(e=>e.slug===params.get('event')))selector.value=params.get('event');
 if(['8','32','128'].includes(params.get('rank')))rank.value=params.get('rank');query.value=params.get('q')??'';
 const key=r=>r.event.slug+':'+(r.source_player_id??r.rank)+':'+r.player;
 const eventPeriod=event=>{const start=event.date.replaceAll('-','/'),end=event.end_date;if(!end||end===event.date)return start;return start+'〜'+(end.slice(0,4)===event.date.slice(0,4)?end.slice(5):end).replaceAll('-','/')};
 const eventRule=event=>(event.format??'ルール未記載').replace(/^Regulation\s+/,'レギュレーション ');
 function persist(){try{localStorage.setItem('vgc-saved-teams',JSON.stringify([...saved]));return true}catch{return false}}
 function saveButton(r){const b=el('button',saved.has(key(r))?'保存済み':'保存','save-team');b.type='button';b.setAttribute('aria-pressed',String(saved.has(key(r))));b.addEventListener('click',()=>{saved.has(key(r))?saved.delete(key(r)):saved.add(key(r));const ok=persist();b.textContent=ok?(saved.has(key(r))?'保存済み':'保存'):'保存できません';b.setAttribute('aria-pressed',String(saved.has(key(r))));if(complete.value==='saved')filter()});return b;}
 function setDetails(r,details){
  const body=el('div',undefined,'library-team-body');const origin=el('p',undefined,'team-provenance');origin.append(link(r.event.name+'の大会記事',base+'results/'+r.event.slug+'/'));
  if(r.team_url)origin.append(document.createTextNode(' · '),link('元の公開チーム',r.team_url));
  for(const a of r.links??[])origin.append(document.createTextNode(' · '),link(a.label==='OTS'?'技・持ち物のOTS':a.label==='Team'?'構築の出典':'レプリカ',a.url));
  if(r.codes)origin.append(document.createTextNode(' · レンタル '+r.codes));body.append(origin);
  if(r.pokemon.length>0){
   if(r.pokemon.length!==6)body.append(el('p',`出典から取得できたのは${r.pokemon.length}匹です。6匹が揃う構築の採用率には含めていません。`));
   const grid=el('div',undefined,'library-set-grid');
   for(const p of r.pokemon){const card=el('div',undefined,'library-set'),head=el('div',undefined,'library-set-heading');head.append(image(p),el('b',p.name));if(p.display_form)head.append(el('small',p.display_form));card.append(head);
    if(p.moves?.length){const dl=el('dl');for(const [label,value]of [['持ち物',p.item_ja??p.item],['特性',p.ability_ja??p.ability],['性格',p.nature_ja??p.nature]]){const line=el('div');line.append(el('dt',label),el('dd',value??'未記載'));dl.append(line)}card.append(dl);const moves=el('ul');for(const move of p.moves_ja??p.moves)moves.append(el('li',move));card.append(moves)}else card.append(el('p','技・持ち物はOTSの出典で確認できます。'));
    grid.append(card);
   }body.append(grid);
  }else body.append(el('p',r.event.type==='ladder'?'構築は出典の画像リンクから確認できます。6匹のテキスト集計には含めていません。':'この掲載行では6匹の完全な情報を取得できていません。'));
  if(r.opponent_rate){body.append(el('p',`OMW% ${r.opponent_rate} · OOMW% ${r.opponent_opponent_rate}（Pokedata掲載値）`,'round-note'))}
  if(r.rounds?.length){const rounds=el('details',undefined,'round-history');rounds.append(el('summary','ラウンドごとの対戦記録'));const table=el('table'),thead=el('thead'),heading=el('tr');for(const h of ['R','対戦相手','結果','卓'])heading.append(el('th',h));thead.append(heading);table.append(thead);const tbody=el('tbody');const map=new Map(records.filter(p=>p.event.slug===r.event.slug).map(p=>[p.source_player_id,p.player]));for(const round of r.rounds){const tr=el('tr');for(const value of [round.round,round.opponent_id===null?'未記載':round.opponent_id===-1?'不戦勝':map.get(round.opponent_id)??'出典のID '+round.opponent_id,({3:'勝',0:'敗',1:'分'})[round.points]??String(round.points)+' pt',round.table??'—'])tr.append(el('td',value));tbody.append(tr)}table.append(tbody);rounds.append(table);body.append(rounds)}
  details.append(body);
 }
 function render(){
  results.replaceChildren();const fragment=document.createDocumentFragment();
  for(const r of filtered.slice(page*size,(page+1)*size)){
   const container=el('article',undefined,'library-record'),details=el('details'),summary=el('summary',undefined,'library-record-summary');
   summary.append(el('span',String(r.rank),'library-position'));const player=el('div',undefined,'library-player');player.append(el('b',r.player_label??r.player),el('small',r.event.name+' · '+(r.country??'')+(r.trainer?' · '+r.trainer:'')),el('small','開催日：'+eventPeriod(r.event)+' · '+eventRule(r.event),'library-event-meta'));summary.append(player);
   const record=el('div',undefined,'library-record-score');if(r.record){record.append(el('b',`${r.record.wins}-${r.record.losses}${r.record.ties?'-'+r.record.ties:''}`),el('small','大会通算'))}else if(r.swiss){record.append(el('b',r.swiss),el('small','スイス'))}else{record.append(el('b',r.rating),el('small','最終レート'))}summary.append(record);
   const squad=el('div',undefined,'library-squad');for(const p of r.pokemon)squad.append(image(p));if(!r.pokemon.length)squad.append(el('span','出典の構築画像'));summary.append(squad,el('span','開く','library-open'));details.append(summary);let built=false;details.addEventListener('toggle',()=>{if(details.open&&!built){setDetails(r,details);built=true;}});container.append(details,saveButton(r));fragment.append(container);
  }results.append(fragment);
  const totalPages=Math.max(1,Math.ceil(filtered.length/size));document.querySelector('#library-page').textContent=`${page+1} / ${totalPages}`;document.querySelector('#library-prev').disabled=page===0;document.querySelector('#library-next').disabled=page+1>=totalPages;
  const full=filtered.filter(r=>r.pokemon.length===6);status.textContent=`${filtered.length.toLocaleString('ja-JP')}件の成績 · 6匹が揃う構築 ${full.length.toLocaleString('ja-JP')}件 · ${selector.selectedOptions[0].textContent}`;
  document.querySelector('#library-denominator').textContent=`母数 ${full.length.toLocaleString('ja-JP')}構築`;
  usage.replaceChildren();const counts=new Map();for(const r of full)for(const p of r.pokemon){const x=counts.get(p.id)??{p,count:0};x.count++;counts.set(p.id,x)}
  for(const {p,count}of [...counts.values()].sort((a,b)=>b.count-a.count||a.p.name.localeCompare(b.p.name,'ja')).slice(0,24)){
   const rate=Math.round(count/full.length*1000)/10,b=el('button',undefined,'explorer-usage-row');b.type='button';b.append(image(p),el('span',p.name));const track=el('span',undefined,'adoption-track'),bar=el('i');bar.style.width=rate+'%';track.append(bar);b.append(track,el('b',rate+'%'),el('small',`${count} / ${full.length}`));b.addEventListener('click',()=>{query.value=p.name;filter()});usage.append(b);
  }
  document.querySelector('#library-empty-usage').textContent=full.length?'上位24種類を表示。クリックするとそのポケモンを含む構築で絞り込みます。':'6匹が揃う公開構築がないため、採用率は算出していません。';
 }
 function filter(){const words=normalize(query.value).trim().split(/\s+/).filter(Boolean);filtered=records.filter(r=>(!Number(rank.value)||r.rank<=Number(rank.value))&&(complete.value!=='complete'||r.pokemon.length===6)&&(complete.value!=='saved'||saved.has(key(r)))&&words.every(w=>r.search.includes(w)));page=0;const u=new URL(location.href);u.search='';if(selector.value!=='official-all')u.searchParams.set('event',selector.value);if(query.value)u.searchParams.set('q',query.value);if(rank.value!=='0')u.searchParams.set('rank',rank.value);history.replaceState(null,'',u);render();}
 async function load(){const current=++request;status.textContent='大会データを読み込んでいます…';try{
  const selected=config.indexes.filter(e=>selector.value==='official-all'?e.type==='regional':e.slug===selector.value);
  const data=await Promise.all(selected.map(async event=>{if(!cache.has(event.slug)){const res=await fetch(base+event.url);if(!res.ok)throw Error('HTTP '+res.status);const snapshot=await res.json();if(snapshot.schema===2)snapshot.records=snapshot.records.map(r=>({...r,pokemon:r.pokemon.map(id=>snapshot.sets[id])}));cache.set(event.slug,snapshot);}const snapshot=cache.get(event.slug);return snapshot.records.map(r=>({...r,event,search:normalize([r.player,r.player_label,r.trainer,...r.pokemon.flatMap(p=>[p.name,p.english,p.item,p.item_ja,p.ability,p.ability_ja,p.nature_ja,...(p.moves??[]),...(p.moves_ja??[])])].join(' '))}));}));
  if(current!==request)return;records=data.flat().sort((a,b)=>b.event.date.localeCompare(a.event.date)||a.event.name.localeCompare(b.event.name,'ja')||a.rank-b.rank);filter();
 }catch{if(current===request){status.textContent='データを読み込めませんでした。ページを再読み込みするか、収録状況の全件JSONから閲覧できます。';results.replaceChildren();usage.replaceChildren();}}}
 selector.addEventListener('change',load);for(const n of [rank,complete])n.addEventListener('change',filter);let timer;query.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(filter,120)});
 document.querySelector('#library-prev').addEventListener('click',()=>{page--;render();results.scrollIntoView({block:'start'})});document.querySelector('#library-next').addEventListener('click',()=>{page++;render();results.scrollIntoView({block:'start'})});load();
})();

(()=>{const search=document.querySelector('#result-query');if(!search)return;const rows=[...document.querySelectorAll('[data-result-row]')];search.addEventListener('input',()=>{const q=search.value.normalize('NFKC').toLocaleLowerCase('ja').trim();let visible=0;for(const row of rows){row.hidden=!row.dataset.search.normalize('NFKC').toLocaleLowerCase('ja').includes(q);if(!row.hidden)visible++;}document.querySelector('#result-count').textContent=visible+'件';});})();
