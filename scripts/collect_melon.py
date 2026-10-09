"""Public Guyso chart records; retain observations, never interpolate ranks."""
import argparse, calendar, concurrent.futures, json, re, time, urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
BASE='https://xn--o39an51b2re.com'
ARTIST='https://www.melon.com/artist/song.htm?artistId=3709231'
CHARTS={'top100':'TOP100','hot100-d30':'HOT100 · 30일','hot100-d100':'HOT100 · 100일','daily':'일간','weekly':'주간','monthly':'월간','yearly':'연간'}
CAPS={k:(1000 if k=='daily' else 100) for k in CHARTS}
CACHE=ROOT/'source-cache'; CACHE.mkdir(exist_ok=True)
def now():return datetime.now(timezone.utc).isoformat()
def request(url,key,cache=False):
 p=CACHE/(key+'.html')
 if cache and p.exists():return p.read_text()
 req=urllib.request.Request(url,headers={'User-Agent':'RESCENE-Record/1.0 (public fan chart archive; source attribution)'})
 with urllib.request.urlopen(req,timeout=50) as r: html=r.read().decode('utf-8')
 p.write_text(html);time.sleep(1)
 return html
def page(html):
 m=re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',html,re.S)
 if not m:raise ValueError('Missing public chart data')
 obj=json.loads(m.group(1));data=obj['props']['pageProps']
 if not isinstance(data.get('data'),dict):raise ValueError('Missing chart payload')
 return data
def validate(data,chart):
 if data.get('platform')!='melon' or data.get('chart')!='MELON_'+chart.replace('-','_').upper()+'_CHART':
  # HOT100 identifiers include D30/D100; accept only matching chart prefix.
  expected={'hot100-d30':'MELON_HOT100_D30_CHART','hot100-d100':'MELON_HOT100_D100_CHART'}.get(chart,'MELON_'+chart.upper()+'_CHART')
  if data.get('platform')!='melon' or data.get('chart')!=expected:raise ValueError('Wrong chart '+str(data.get('chart')))
 if data.get('pagination',{}).get('hasNextPage'):raise ValueError('Incomplete paginated response')
def catalog(html):
 soup=BeautifulSoup(html,'html.parser');songs=[]
 for row in soup.select('tr'):
  box=row.select_one('input[name=input_check]');name=row.select_one('a.btn_icon_detail')
  if box and name:
   if not box['value'].isdigit():raise ValueError('Invalid catalog song ID')
   anchors=row.select('a'); songs.append({'id':box['value'],'name':' '.join(name.get_text().split()),'album':' '.join(anchors[-1].get_text().split()),'release':None,'link':'https://www.melon.com/song/detail.htm?songId='+box['value']})
 if len(songs)<2:raise ValueError('Empty artist catalog')
 return songs
def atomic(path,obj):
 temp=path.with_suffix('.tmp');temp.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':')));temp.replace(path)
def observation_time(row,key):
 stamp=row.get('time')
 if not stamp and row.get('year'):
  stamp=f"{row['year']:04d}-{row.get('month',1):02d}-01T00:00:00"
 if not stamp:raise ValueError('Missing observation date')
 value=datetime.fromisoformat(stamp)
 if key=='weekly' or str(key).endswith('-weekly'):value+=timedelta(days=6)
 elif key=='monthly':value=value.replace(day=calendar.monthrange(value.year,value.month)[1])
 elif key=='yearly':value=value.replace(month=12,day=31)
 return value.isoformat(),stamp
def merge(chart,song_id,rows,snapshot=False):
 records=chart['songs'].setdefault(song_id,{})
 for row in rows:
  rank=row.get('ranking'); stamp,source_time=observation_time(row,chart.get('key'))
  if rank is not None and (not isinstance(rank,int) or rank<1):raise ValueError('Invalid rank')
  if stamp[:10]<'2024-03-26':continue
  previous=records.get(stamp)
  if snapshot and rank is None and previous and previous.get('rank') is not None and previous['rank']>chart['limit']:continue
  records[stamp]={'rank':rank,'count':row.get('count'),'status':'ranked' if rank is not None else 'out','sourceTime':source_time}
def load_chart(k):
 p=ROOT/'data'/f'{k}.json'
 return json.loads(p.read_text()) if p.exists() else {'key':k,'label':CHARTS[k],'limit':CAPS[k],'source':BASE+'/chart/melon/'+k,'songs':{},'historyFetched':{},'latest':None}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--backfill',action='store_true');ap.add_argument('--cached',action='store_true');ap.add_argument('--charts',default=','.join(CHARTS));args=ap.parse_args()
 manifest_path=ROOT/'data/manifest.json';old=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
 try:songs=catalog(request(ARTIST,'catalog',args.cached))
 except Exception:
  if not old.get('songs'):raise
  songs=[s for s in old['songs'] if s['id'].isdigit()]
 lookup={s['id']:s for s in songs}
 new_ids=set(lookup)-{s['id'] for s in old.get('songs',[])}
 for s in old.get('songs',[]):
  if not s['id'].isdigit():continue
  if s['id'] in lookup:
   lookup[s['id']]['release']=s.get('release')
   if s.get('sourceIds'):lookup[s['id']]['sourceIds']=s['sourceIds']
  else:songs.append(s);lookup[s['id']]=s
 charts={k:load_chart(k) for k in args.charts.split(',')}; errors=[]
 for k,c in charts.items():
  try:
   d=page(request(BASE+'/chart/melon/'+k,k,args.cached))['data'];validate(d,k)
   if d['size']<CAPS[k]:raise ValueError('Incomplete chart snapshot')
   c['latest'],c['latestSourceTime']=observation_time({'time':d['time']},k);c['collectedAt']=now();c['snapshotLimit']=CAPS[k]
   table={row['song']['id']:row for row in d['data']}
   for s in songs:
    row=table.get(s['id'])
    if not row and s.get('release') and c['latest'][:10]<s['release'][:10]:continue
    merge(c,s['id'],[{'time':d['time'],'ranking':None}] if not row else [dict(row,time=d['time'])],snapshot=True)
    if row:
     s['release']=row['song'].get('releasedAt');s['album']=row['song']['album']['name']
   atomic(ROOT/'data'/f'{k}.json',c)
   print('snapshot',k,c['latest'],flush=True)
  except Exception as e:errors.append(k+': '+str(e));print('ERROR',errors[-1],flush=True)
 if args.backfill or new_ids:
  tasks=[(k,s['id']) for s in songs if args.backfill or s['id'] in new_ids for k in charts]
  def fetch(task):
   k,sid=task
   try:
    p=page(request(BASE+'/chart/melon/'+k+'/trend/ranking/'+sid,k+'-'+sid,args.cached));validate(p['data'],k)
    if p['data'].get('songId')!=sid:raise ValueError('Wrong song')
    return k,sid,p,None
   except Exception as e:return k,sid,None,str(e)
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
   for i,(k,sid,p,error) in enumerate(pool.map(fetch,tasks),1):
    if error:errors.append(k+'/'+sid+': '+error)
    else:
     c=charts[k];merge(c,sid,p['data']['data']);c['historyFetched'][sid]=now()
     s=lookup[sid];s['release']=p['song'].get('releasedAt');s['album']=p['song']['album']['name']
     atomic(ROOT/'data'/f'{k}.json',c)
    if i%7==0:print('history',i,'/',len(tasks),'errors',len(errors),flush=True)
 if args.backfill and 'yearly' in charts and charts['yearly'].get('latestSourceTime'):
  c=charts['yearly']
  for year in range(2024,int(c['latestSourceTime'][:4])):
   try:
    url=BASE+'/chart/melon/yearly/'+str(year)
    d=page(request(url,'yearly-'+str(year),args.cached))['data'];validate(d,'yearly')
    if d.get('year')!=year or d['size']<100:raise ValueError('Incomplete annual archive')
    table={row['song']['id']:row for row in d['data']}
    for s in songs:
     if s.get('release') and s['release'][:4]>str(year):continue
     row=table.get(s['id']);merge(c,s['id'],[dict(row,time=d['time'])] if row else [{'time':d['time'],'ranking':None}],snapshot=True)
    c.setdefault('historicalSnapshots',{})[str(year)]={'source':url,'collectedAt':now()}
    atomic(ROOT/'data/yearly.json',c)
   except Exception as e:errors.append('yearly/'+str(year)+': '+str(e))
 manifest={'name':'RESCENE RECORD','debut':'2024-03-26','timezone':'Asia/Seoul','builtAt':now(),'catalogSource':ARTIST,'songs':songs,'charts':list(CHARTS),'errors':errors,'sources':[{'name':'가이섬','url':BASE},{'name':'Melon','url':ARTIST}]}
 manifest={**old,**manifest};manifest['songs']=songs+[s for s in old.get('songs',[]) if not s['id'].isdigit()];manifest['charts']=list(CHARTS)+[k for k in old.get('charts',[]) if k not in CHARTS]
 atomic(manifest_path,manifest)
 print('saved',len(songs),'tracks',len(errors),'errors',flush=True)
 if not any(c.get('latest') for c in charts.values()):raise RuntimeError('All sources unavailable')
if __name__=='__main__':main()
