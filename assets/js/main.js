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
