(()=>{
 const input=document.querySelector('#article-search');
 const buttons=[...document.querySelectorAll('[data-filter]')];
 const cards=[...document.querySelectorAll('[data-article]')];
 if(!input||!cards.length)return;
 let kind='all';
 const normalize=s=>s.normalize('NFKC').toLocaleLowerCase('ja');
 function update(){
  const terms=normalize(input.value.trim()).split(/\s+/).filter(Boolean);
  let shown=0;
  for(const card of cards){
   const text=normalize(card.dataset.search||'');
   const visible=(kind==='all'||card.dataset.kind===kind)&&terms.every(q=>text.includes(q));
   card.hidden=!visible;if(visible)shown++;
  }
  document.querySelector('#article-count').textContent=`${shown}件の記事`;
  document.querySelector('.no-results').hidden=shown>0;
 }
 input.addEventListener('input',update);
 for(const button of buttons)button.addEventListener('click',()=>{
  kind=button.dataset.filter;
  for(const item of buttons)item.setAttribute('aria-pressed',String(item===button));
  update();
 });
 update();
})();

(()=>{
 const raw=document.querySelector('#directory-data');
 if(!raw)return;
 const records=JSON.parse(raw.textContent);
 const byId=new Map(records.map(p=>[p.id,p]));
 const body=document.querySelector('#pokemon-table-body');
 const rows=[...body.querySelectorAll('[data-pokemon-row]')];
 const search=document.querySelector('#pokemon-search');
 const event=document.querySelector('#event-filter');
 const sort=document.querySelector('#pokemon-sort');
 const normalize=s=>s.normalize('NFKC').toLocaleLowerCase('ja');
 function update(){
  const query=normalize(search.value.trim());
  const selected=event.value;
  const values=p=>selected==='all'?{rate:p.rate,count:p.count,total:24}:p.events.find(e=>String(e.id)===selected);
  rows.sort((a,b)=>{
   const pa=byId.get(a.dataset.id),pb=byId.get(b.dataset.id);
   if(sort.value==='speed')return pb.speed-pa.speed||values(pb).count-values(pa).count;
   if(sort.value==='name')return pa.name.localeCompare(pb.name,'ja');
   return values(pb).count-values(pa).count||pa.name.localeCompare(pb.name,'ja');
  });
  let shown=0;
  for(const row of rows){
   const p=byId.get(row.dataset.id),data=values(p);
   row.hidden=(!normalize(row.dataset.name).includes(query))||(selected!=='all'&&data.count===0);
   if(!row.hidden){shown++;row.querySelector('[data-rank]').textContent=shown;}
   row.querySelector('[data-rate]').textContent=`${data.rate}%`;
   row.querySelector('[data-rate-bar]').style.width=`${data.rate}%`;
   row.querySelector('[data-count]').textContent=`${data.count} / ${data.total}`;
   body.append(row);
  }
  document.querySelector('#pokemon-count').textContent=`${shown}種類`;
  document.querySelector('.directory-empty').hidden=shown>0;
  document.querySelector('#directory-scope').textContent=selected==='all'?'各大会の上位8構築を同じ重みで集計':'選択した大会の上位8構築を集計';
 }
 search.addEventListener('input',update);event.addEventListener('change',update);sort.addEventListener('change',update);update();
})();

(()=>{
 const raw=document.querySelector('#pokemon-profile-data');
 if(!raw)return;
 const pokemon=JSON.parse(raw.textContent);
 const palette=['#72d6ac','#65b9dd','#baa0e6','#e1bd70','#dc91a1','#8095cb','#7fbcb7','#bba578','#aa85bb','#8297a8'];
 const element=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el};
 let mode='tournament';
 const decimal=n=>Math.round(n*10)/10;
 function render(){
  const source=mode==='tournament'?pokemon.tournament:pokemon.reference.ranked;
  const isTournament=mode==='tournament';
  document.querySelector('#dataset-title').textContent=isTournament?'9月の3大会 · 上位24構築':'ランクバトル · シーズンM-6 / ダブル';
  document.querySelector('#dataset-description').textContent=isTournament?`${pokemon.name}を採用した${pokemon.count}構築を母数とする割合`:'2026/9/9〜10/7 · バトルデータベースの掲載率（母数非掲載）';
  document.querySelector('#dataset-note').textContent=isTournament?'技は1匹で複数採用するため、割合の合計は100%を超えます。配分・実際の選出はこのデータに含まれません。':'ランクの掲載上位項目を表示。率は出典の丸め値です。円グラフの残りは「その他・非掲載」。大会構築の数字とは異なる母集団です。';
  for(const card of document.querySelectorAll('[data-distribution]')){
   const key=card.dataset.distribution;
   const rows=(source[key]||[]).filter(r=>r.rate>0);
   const full=card.querySelector('.distribution-full');full.replaceChildren();
   for(const row of rows){const line=element('div');line.append(element('span',row.name),element('b',`${row.rate}%`));full.append(line)}
   if(key==='moves'){
    const list=card.querySelector('.move-distribution');list.replaceChildren();
    for(const row of rows.slice(0,10)){
     const entry=element('div',undefined,'adoption-row');
     const label=element('div');label.append(element('span',row.name),element('b',`${row.rate}%`));
     const track=element('span',undefined,'adoption-track'),bar=element('i');bar.style.width=`${Math.min(row.rate,100)}%`;track.append(bar);entry.append(label,track);list.append(entry);
    }
   }else{
    const donut=card.querySelector('.donut');
    const top=rows[0]?.rate??0;
    const strong=donut.querySelector('strong');strong.replaceChildren(document.createTextNode(String(top)),element('small','%'));
    donut.setAttribute('aria-label',rows.map(r=>`${r.name} ${r.rate}%`).join('、'));
    let angle=0;const segments=[];
    for(let i=0;i<rows.length;i++){const end=Math.min(100,angle+rows[i].rate);segments.push(`${palette[i%palette.length]} ${angle}% ${end}%`);angle=end;}
    if(angle<100)segments.push(`#343d4b ${angle}% 100%`);
    donut.style.background=`conic-gradient(${segments.join(',')})`;
    const legend=card.querySelector('.chart-legend');legend.replaceChildren();
    for(const [i,row]of rows.slice(0,5).entries()){
     const li=element('li'),name=element('span'),swatch=element('i');swatch.style.background=palette[i%palette.length];name.append(swatch,document.createTextNode(row.name));li.append(name,element('b',`${row.rate}%`));legend.append(li);
    }
    if(isTournament===false&&angle<99.5){const li=element('li'),name=element('span'),swatch=element('i');swatch.style.background='#343d4b';name.append(swatch,document.createTextNode('その他・非掲載'));li.append(name,element('b',`${decimal(100-angle)}%`));legend.append(li)}
   }
  }
 }
 for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{
  mode=button.dataset.mode;
  for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b===button));
  render();
 });
 const formSelect=document.querySelector('#form-select');
 const typeBadge=name=>{const badge=element('span',name,'type-badge');badge.dataset.type=name;return badge};
 function renderEffectiveness(target,rows){const list=document.querySelector(target);list.replaceChildren();for(const row of rows){const entry=element('span');entry.append(typeBadge(row.type),element('b',`×${row.rate}`));list.append(entry)}if(!rows.length)list.append(element('span','なし'))}
 formSelect.addEventListener('change',()=>{
  const form=pokemon.reference.forms.find(f=>f.key===formSelect.value);if(!form)return;
  for(const stat of form.stats){const row=document.querySelector(`[data-stat="${stat.key}"]`);row.querySelector('i').style.width=`${Math.min(100,stat.value/2)}%`;row.querySelector('b').textContent=stat.value;}
  document.querySelector('#stat-total').textContent=form.total;
  const types=document.querySelector('.profile-types');for(const badge of types.querySelectorAll('.type-badge'))badge.remove();for(const name of [...form.types].reverse())types.prepend(typeBadge(name));
  document.querySelector('#effectiveness-form').textContent=form.name;
  if(form.effectiveness){renderEffectiveness('#weakness-list',form.effectiveness.weaknesses);renderEffectiveness('#resistance-list',form.effectiveness.resistances);}
 });
 render();
})();
