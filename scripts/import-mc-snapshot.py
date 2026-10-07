from bs4 import BeautifulSoup
from pathlib import Path
import json,re,csv,unicodedata

import argparse
base=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--sources',type=Path,default=base/'.cache/mc-sources')
args=parser.parse_args()
cache=args.sources
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
save=lambda p,j:p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
dictionary=read(base/'data/dictionary.json')
translations={}
national={}
for file in ['pokemon_species_names','move_names','ability_names','item_names','nature_names']:
 groups={}
 for r in csv.reader((cache/(file+'.csv')).open(encoding='utf-8-sig')):
  if len(r)>2 and r[1] in ['9','11','1']: groups.setdefault(r[0],{})[r[1]]=r[2]
 for number,names in groups.items():
  if '9' in names and ('11' in names or '1' in names):
   translations[names['9']]=names.get('11',names.get('1'))
   if file=='pokemon_species_names':national[int(number)]=names
dictionary['terms']={**translations,**dictionary['terms']}
slug=lambda s:re.sub(r'[^a-z0-9-]','',s.lower().replace(' ', '-').replace("'",''))
aliases={'Indeedee [Male]':'indeedee','Indeedee [Female]':'indeedee-f','Basculegion [Male]':'basculegion','Basculegion [Female]':'basculegion-f','Meowstic [Male]':'meowstic','Meowstic [Female]':'meowstic-f','Floette [Eternal Flower]':'floette-eternal','Rotom [Heat Rotom]':'rotom-heat','Rotom [Wash Rotom]':'rotom-wash','Rotom [Mow Rotom]':'rotom-mow','Lycanroc [Dusk Form]':'lycanroc-dusk','Maushold [Family of Four]':'maushold-four','Maushold [Family of Three]':'maushold-three','Tauros [Paldean Form - Aqua Breed]':'tauros-paldea-aqua','Sinistcha [Masterpiece Form]':'sinistcha','Sinistcha [Unremarkable Form]':'sinistcha','Toxtricity [Amped Form]':'toxtricity','Toxtricity [Low Key Form]':'toxtricity-low-key'}
formja={'Hisuian Form':'ヒスイ','Alolan Form':'アローラ','Galarian Form':'ガラル','Paldean Form':'パルデア','Male':'♂','Female':'♀','Eternal Flower':'えいえんのはな','Wash Rotom':'ウォッシュ','Heat Rotom':'ヒート','Fan Rotom':'スピン','Mow Rotom':'カット','Frost Rotom':'フロスト','Dusk Form':'たそがれ','Family of Four':'4ひきかぞく','Family of Three':'3びきかぞく','Paldean Form - Aqua Breed':'パルデア・ウォーター','Masterpiece Form':'タカイモノ','Unremarkable Form':'マガイモノ','White Plumage':'しろいはね','Amped Form':'ハイ','Low Key Form':'ロー'}
images={}
species_catalog=read(base/'data/species_catalog.json') if (base/'data/species_catalog.json').exists() else {}
existing=read(base/'data/events.json')
for e in existing:
 for t in e['teams']:
  for p in t['pokemon']:species_catalog[p['id']]={k:p[k] for k in ['id','name','english','image_local','image']}

def pokemon(english,number=None,form='000',detail=None,vr_image=None):
 mega=''
 # Victory Road depicts mega forms; adoption is counted using the base team species.
 if ' Mega' in english:
  english,mega=english.split(' Mega',1);mega='Mega'+mega
 vr_alias={'Arcanine Hisui':'Arcanine [Hisuian Form]','Typhlosion Hisui':'Typhlosion [Hisuian Form]','Samurott Hisui':'Samurott [Hisuian Form]','Ninetales Alola':'Ninetales [Alolan Form]','Persian Alola':'Persian [Alolan Form]','Indeedee Female':'Indeedee [Female]','Indeedee Male':'Indeedee [Male]','Basculegion Female':'Basculegion [Female]','Meowstic Female':'Meowstic [Female]','Floette Eternal':'Floette [Eternal Flower]','Lycanroc Dusk':'Lycanroc [Dusk Form]','Maushold Four':'Maushold [Family of Four]','Tauros Paldea Aqua':'Tauros [Paldean Form - Aqua Breed]'}
 if english.startswith('Vivillon '):english='Vivillon'
 english=vr_alias.get(english,english)
 if english=='Floette' and mega:english='Floette [Eternal Flower]'
 plain=english.split(' [')[0]
 if number is None:number=next((n for n,names in national.items() if names['9'].lower()==plain.lower()),None)
 match=re.search(r'\[([^]]+)\]',english);variant=match[1] if match else ''
 pid=aliases.get(english)
 if not pid:
  regional={'Hisuian Form':'hisui','Alolan Form':'alola','Galarian Form':'galar','Paldean Form':'paldea'}
  pid=slug(plain)+(('-'+regional[variant]) if variant in regional else ('-'+slug(variant) if variant else ''))
 if pid=='floette':pid='floette-eternal' # only the eternal-flower variant is eligible in these observed sheets
 jp=national.get(int(number or 0),{}).get('11') or national.get(int(number or 0),{}).get('1') or translations.get(plain,english)
 if variant:jp+=('♀' if variant=='Female' else '♂' if variant=='Male' else '（'+formja.get(variant,variant)+'）')
 previous=dictionary['species'].get(pid)
 if previous and re.search('[ぁ-んァ-ヶ]',previous):jp=previous
 if pid=='sinistcha':jp='ヤバソチャ'
 p={'id':pid,'name':jp,'english':english,'image_local':f'images/pokemon/{pid}.png'}
 if pid in species_catalog:p.update(species_catalog[pid])
 elif vr_image:
  # Use the observed sprite URL; a displayed Mega form is separately labelled.
  p['image']=vr_image;images[p['image_local']]=vr_image
 else:
  token=f'{int(number)}'+(f'-{int(form)}' if int(form) else '')
  p['image']='https://www.pokedata.ovh/misc/sprites-master/sprites/pokemon/'+token+'.png';images[p['image_local']]=p['image']
 if mega:p['display_form']=mega
 if detail:
  p.update(detail)
  for key in ['item','ability','nature']:p[key+'_ja']=dictionary['terms'].get(p.get(key),p.get(key))
  p['moves_ja']=[dictionary['terms'].get(m,m) for m in p.get('moves',[])]
  p['role']='公開された技・持ち物から役割を確認'
 species_catalog[pid]={k:p[k] for k in ['id','name','english','image_local','image']}
 dictionary['species'][pid]=jp
 return p

configs=[
 dict(key='baltimore',id=441,slug='baltimore-2026',name='ボルチモア',country='アメリカ',date='2026-09-19',end='2026-09-20',type='regional',pokedata_id=1000034,old='0000192',vr='2027-baltimore',players=1081),
 dict(key='frankfurt',id=443,slug='frankfurt-2026',name='フランクフルト',country='ドイツ',date='2026-09-26',end='2026-09-27',type='regional',pokedata_id=1000070,old='0000194',vr='2027-frankfurt',players=1129),
 dict(key='brisbane',id=442,slug='brisbane-2026',name='ブリスベン',country='オーストラリア',date='2026-09-26',end='2026-09-27',type='regional',pokedata_id=1000068,old='0000193',vr='2027-brisbane',players=327),
 dict(key='recife',id=1000072,slug='recife-2026',name='レシフェ',country='ブラジル',date='2026-10-03',end='2026-10-04',type='regional',pokedata_id=1000072,vr='2027-recife',players=222),
 dict(key='sep26',id=9001,slug='vr-september-1-2026',name='VR September Challenge #1',country='オンライン',date='2026-09-12',end='2026-09-13',type='grassroots',vr='vr-sep26'),
 dict(key='sep26-2',id=9002,slug='vr-september-2-2026',name='VR September Challenge #2',country='オンライン',date='2026-09-19',end='2026-09-20',type='grassroots',vr='vr-sep26-2'),
 dict(key='oct26',id=9003,slug='vr-october-1-2026',name='VR October Challenge #1',country='オンライン',date='2026-10-03',end='2026-10-04',type='grassroots',vr='vr-oct26'),
 dict(key='gc',id=9004,slug='global-challenge-i-2026',name='Global Challenge I',country='オンライン',date='2026-09-25',end='2026-09-28',type='ladder',vr='2027-global-challenge-i',players=335995),
]
results={};datasets={};events=[]
norm=lambda s:unicodedata.normalize('NFKD',re.sub(r'\\u([0-9a-fA-F]{4})',lambda m:chr(int(m[1],16)),s)).casefold().strip()
for cfg in configs:
 s=BeautifulSoup((cache/('vr-'+cfg['key']+'.html')).read_text(encoding='utf-8-sig'),'html.parser')
 metadata={}
 for r in s.select('table')[0].select('tr'):
  cells=r.find_all(['th','td'],recursive=False)
  if len(cells)==2:metadata[cells[0].get_text(' ',strip=True)]=cells[1].get_text(' ',strip=True)
 if 'M-C' not in metadata.get('Season',''):raise ValueError('Wrong format '+cfg['key'])
 if not cfg.get('players'):cfg['players']=int(re.search(r'([\d,]+)',metadata['Attendance'])[1].replace(',',''))
 ranks=[];usage=[];other=[]
 for table in s.select('table'):
  trs=table.select('tr');headers=[c.get_text(' ',strip=True) for c in trs[0].find_all(['th','td'],recursive=False)] if trs else []
  heading=table.find_previous(['h2','h3','h4']);title=heading.get_text(' ',strip=True) if heading else ''
  if 'Player' in headers and headers[0]=='#':
   division='Senior' if 'Senior' in title else 'Junior' if 'Junior' in title else 'Masters'
   for r in trs[1:]:
    cells=r.find_all('td',recursive=False)
    if len(cells)!=len(headers) or not cells[0].get_text(strip=True).isdigit():raise ValueError('Changed result row')
    by=dict(zip(headers,cells));cell=by['Player'];bold=cell.find(['b','i']);player=(bold or cell).get_text(' ',strip=True)
    record={'rank':int(cells[0].get_text(strip=True)),'player':player,'player_label':cell.get_text(' ',strip=True),'country':next((im.get('alt') for im in r.select('img.flagstyle')),''),'stage':title,'pokemon':[],'links':[],'prize':by.get('Prize',by.get('Prz',cells[-1])).get_text(' ',strip=True),'player_links':[a['href'] for a in cell.select('a[href]')]}
    if 'Swiss' in by:record['swiss']=by['Swiss'].get_text(strip=True)
    if 'Rating' in by:record['rating']=float(by['Rating'].get_text(strip=True))
    if 'Code' in by:record['codes']=by['Code'].get_text(' ',strip=True)
    for im in by.get('Team',cells[-1]).select('img.champsprite'):
     record['pokemon'].append(pokemon(im['alt'],vr_image=im['src']))
    for label in ['Team','OTS','Replica']:
     if label in by:
      record['links'] += [{'label':label,'url':a['href']} for a in by[label].select('a[href]')]
    (ranks if division=='Masters' else other).append({**record,'division':division})
  elif 'Pokémon' in headers and headers[0]=='#':
   for r in trs[1:]:
    cells=r.find_all('td',recursive=False);im=r.select_one('img.champsprite')
    if not im:continue
    mon=pokemon(im['alt'],vr_image=im['src'])
    usage.append({'rank':int(cells[0].get_text(strip=True)),'id':mon['id'],'name':mon['name'],'display_form':mon.get('display_form',''),'heading':title,'values':[{'label':headers[i],'text':cells[i].get_text(' ',strip=True)} for i in range(2,len(cells))]})
 # Regional pages publish factual percentages as list items, separately by phase.
 for li in s.select('ol li'):
  match=re.fullmatch(r'(.+): ([\d.]+)%',li.get_text(' ',strip=True))
  if match:
   head=li.find_previous(['h2','h3','h4','h5']);phase=head.get_text(' ',strip=True) if head else ''
   category=li.find_parent('ol').find_previous('p').get_text(' ',strip=True)
   en=match[1];mega=''
   if en.startswith('Mega '):en=en[5:];mega='メガ'
   en=re.sub(r'^(Hisuian|Alolan) (.+)$',lambda m:m[2]+' ['+m[1]+' Form]',en)
   en=re.sub(r'^(Female|Male) (.+)$',lambda m:m[2]+' ['+m[1]+']',en)
   en=en.replace('Eternal Flower Floette','Floette [Eternal Flower]')
   base_name=re.sub(r' [XYZ]$','',en)
   local=translations.get(base_name,base_name)
   for p in species_catalog.values():
    if p['english']==en:local=p['name'];break
   usage.append({'name':mega+local+(' '+en[-1] if mega and en[-1] in 'XYZ' else ''),'heading':phase+' · '+category,'values':[{'label':'掲載率','text':match[2]+'%'}]})
 if not ranks:raise ValueError('No Masters results '+cfg['key'])
 ranks.sort(key=lambda r:r['rank'])
 event=next((e for e in existing if e['id']==cfg['id']),{})
 event.update({k:cfg[k] for k in ['id','slug','name','country','date','players','type']})
 event.update(end_date=cfg['end'],division='Masters',game='Pokémon Champions',format='Regulation M-C',checked='2026-10-08',english=metadata['Event'],winner=ranks[0]['player'],vr_source='https://victoryroad.pro/'+cfg['vr']+'/',published_results=len(ranks),published_squads=sum(len(r['pokemon'])==6 for r in ranks))
 event['sources']=[{'name':'Victory Road — 掲載結果・構築・使用率','url':event['vr_source']}]
 if cfg['type']=='regional':
  h=(cache/('pokedata-'+cfg['key']+'-masters.html')).read_text(encoding='utf-8-sig')
  raw=json.loads(re.search(r'const rawPlayers = (\[[^\n]*\]);',h)[1])
  detailmap=json.loads(re.search(r'window\.playersDataMap = (\{[^\n]*\});',h)[1])
  expected=int(re.search(r'EXPECTED_COMPETITORS = (\d+)',h)[1])
  if len(raw)!=expected:raise ValueError('Incomplete standings')
  roster=read(cache/('pokedata-'+cfg['key']+'-roster.json'))
  records=[]
  for p in raw:
   original=detailmap[str(p['i'])];sheet=original.get('o')
   if sheet and sheet['d']!='M':raise ValueError('Wrong division in team join')
   mons=[]
   for tl in sheet.get('tl',[]) if sheet else []:
    mons.append(pokemon(tl[5],int(tl[0]),tl[1],{'nature':tl[2],'ability':tl[4],'item':tl[6],'moves':tl[7]}))
   records.append({'rank':p['r'],'player':re.sub(r'\\u([0-9a-fA-F]{4})',lambda m:chr(int(m[1],16)),p['n']),'country':p['c'],'source_player_id':p['i'],'record':{'wins':p['w'],'losses':p['l'],'ties':p['t']},'opponent_rate':p['w2'],'opponent_opponent_rate':p['w3'],'pokemon':mons,'trainer':sheet.get('t','') if sheet else '', 'team_url':('https://rk9.gg/teamlist/'+sheet['Team List']) if sheet else '', 'rounds':[{'round':i+1,'opponent_id':r[0],'points':r[1],'table':r[2]} for i,r in enumerate(p['history'])], 'source_details':original})
  event['pokedata_source']='https://www.pokedata.ovh/standings2/'+str(cfg['pokedata_id'])+'/Masters'
  event['sources'].append({'name':'Pokedata — マスター全順位・公開チーム','url':event['pokedata_source']})
  event['standings_count']=len(records);event['full_team_count']=sum(len(r['pokemon'])==6 for r in records)
  original_source=read(cache/('pokedata-'+cfg['key']+'-source.json'))
  if original_source['standings']['division']!='Masters' or len(original_source['standings']['players'])!=len(records):raise ValueError('Wrong source payload scope')
  datasets[cfg['slug']]={'event':{'name':cfg['name'],'date':cfg['date'],'end_date':cfg['end'],'format':'Regulation M-C','division':'Masters','checked':'2026-10-08','source':event['pokedata_source'],'count':len(records)},'records':records,'source_payload':original_source}
  if cfg.get('old'):
   legacy=read(cache/('pokedata-old-'+cfg['key']+'.json'))
   datasets[cfg['slug']]['legacy_records']=legacy
   event['legacy_count']=len(legacy)
   event['sources'].append({'name':'Pokedata旧VGC一覧 — マスターJSON','url':'https://www.pokedata.ovh/standingsVGC/'+cfg['old']+'/masters/'})
  if not event.get('teams'):
   event['teams']=[{'rank':r['rank'],'player':r['player'],'pokemon':r['pokemon']} for r in records if r['rank']<=8]
   event['source']=event['vr_source'];event['team_source']=event['pokedata_source']
 else:
  event['teams']=[{'rank':r['rank'],'player':r['player'],'pokemon':r['pokemon']} for r in ranks if r['rank']<=8]
  event['source']=event['vr_source'];event['team_source']=event['vr_source']
  datasets[cfg['slug']]={'event':{'name':cfg['name'],'date':cfg['date'],'end_date':cfg['end'],'format':'Regulation M-C','division':'Masters','checked':'2026-10-08','source':event['vr_source'],'count':len(ranks)},'records':ranks}
  event['standings_count']=0;event['full_team_count']=0
 results[cfg['slug']]={'masters':ranks,'other_divisions':other,'usage':usage,'metadata':metadata}
 events.append(event)
 print(cfg['name'],'VR rows',len(ranks),'squads',event['published_squads'],'Pokedata',event['standings_count'],'full teams',event['full_team_count'])
for folder in ['data/results','static/data']: (base/folder).mkdir(parents=True,exist_ok=True)
for slugkey,j in results.items():save(base/f'data/results/{slugkey}.json',j)
for slugkey,j in datasets.items():save(base/f'static/data/{slugkey}.json',j)
save(base/'data/events.json',sorted(events,key=lambda e:(e['date'],e['id']),reverse=True))
save(base/'data/dictionary.json',dictionary)
save(base/'data/species_catalog.json',species_catalog)
save(cache/'images-to-download.json',images)
save(cache/'new-species.json',[p for p in species_catalog.values() if p['id'] not in read(base/'data/pokemon_reference.json')])
coverage={'checked':'2026-10-08','calendar':'https://victoryroad.pro/2027-season-calendar/','pokedata_indexes':['https://www.pokedata.ovh/standingsVGC/','https://www.pokedata.ovh/standings2/'],'events':[{'name':e['name'],'slug':e['slug'],'type':e['type'],'date':e['date'],'vr_results':e['published_results'],'vr_squads':e['published_squads'],'pokedata_results':e['standings_count'],'pokedata_teams':e['full_team_count'],'legacy_count':e.get('legacy_count'), 'sources':e['sources']} for e in events], 'ranked_summary':{'name':'ランクバトル M-6（ダブル）','date':'2026-09-09','end_date':'2026-10-07','winner':'Yuya Hashiba','source':'https://victoryroad.pro/2027-season-calendar/','note':'Victory Roadのカレンダーは1位のみ掲載。大会の順位・構築集計とは別の記録。'}}
save(base/'data/coverage.json',coverage)
