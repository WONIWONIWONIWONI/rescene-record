"""Collect only Guyso's public, platform-specific ranks and song identities."""
import argparse, concurrent.futures, json, re, sys, urllib.parse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from collect_melon import *
import collect_melon

PLATFORMS=[('melon','멜론'),('genie','지니'),('flo','FLO'),('bugs','벅스'),('vibe','바이브'),('circle','써클'),('youtube','유튜브')]
EXTRA={
 'genie-realtime':('genie','realtime','실시간','hour',250),
 'genie-daily':('genie','daily','일간','day',250),
 'flo-24hour':('flo','24hour','FLO 차트','hour',100),
 'bugs-realtime':('bugs','realtime','실시간','hour',100),
 'bugs-daily':('bugs','daily','일간','day',100),
 'vibe-daily':('vibe','daily','일간','day',300),
 'circle-digital-weekly':('circle','digital-weekly','주간 디지털','week',200),
 'youtube-track-weekly':('youtube','track-weekly','주간 인기곡','week',100),
 'youtube-video-weekly':('youtube','video-weekly','주간 뮤직비디오','week',100),
}
def validate_extra(data,key):
 platform,route,_,_,_=EXTRA[key]
 expected=platform.upper()+'_'+route.replace('-','_').upper()+'_CHART'
 if data.get('platform')!=platform or data.get('chart')!=expected:raise ValueError('Wrong source/chart')
 if data.get('pagination',{}).get('hasNextPage'):raise ValueError('Incomplete paginated response')
def is_rescene(song):
 return any('RESCENE' in a.get('name','').upper() or '리센느' in a.get('name','') for a in song.get('artists',[]))
def metadata(manifest):
 for k in CHARTS:
  c=load_chart(k);c.update(platform='melon',unit='hour' if k.startswith(('top','hot')) else {'daily':'day','weekly':'week','monthly':'month','yearly':'year'}[k]);atomic(ROOT/'data'/f'{k}.json',c)
 manifest['charts']=list(CHARTS)+list(EXTRA)
 manifest['platforms']=[{'id':p,'name':name,'charts':list(CHARTS) if p=='melon' else [k for k,v in EXTRA.items() if v[0]==p]} for p,name in PLATFORMS]
 manifest['sources']=[{'name':'가이섬','url':BASE}]
def collect_extra(backfill=False,cached=False):
 manifest=json.loads((ROOT/'data/manifest.json').read_text());songs=manifest['songs'];lookup={s['id']:s for s in songs};errors=manifest.get('errors',[])
 # Guyso explicitly links identical recordings across services. Never match by title alone.
 for s in songs[:]:
  if not s['id'].isdigit():continue
  try:
   if backfill or not s.get('sourceIds'):
    info=page(request(BASE+'/chart/melon/daily/trend/ranking/'+s['id'],'daily-'+s['id'],cached or not backfill))['song']
    if info['id']!=s['id'] or not is_rescene(info):raise ValueError('Wrong artist/song identity')
    s['sourceIds']={p:str(v) for p,v in info.get('group',{}).items() if p in dict(PLATFORMS) and v}
  except Exception as e:errors.append('identity/'+s['id']+': '+str(e))
 # Music videos have their own IDs; retain each video independently from audio tracks.
 if backfill or not manifest.get('youtubeCatalogCheckedAt'):
  try:
   html=request(BASE+'/artist/youtube/5543744b7443696157527a2d6433455a6e327864316d6441','youtube-artist',cached)
   artist=json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',html,re.S).group(1))['props']['pageProps']['artist']
   if not ('RESCENE' in artist.get('name','').upper() or '리센느' in artist.get('name','')):raise ValueError('Wrong YouTube artist')
   found=[s for s in artist.get('songs',[]) if is_rescene(s)]
   for n in range(1,51):
    url=BASE+'/api/v3/song/search?'+urllib.parse.urlencode({'platform':'youtube','query':'RESCENE','page':n})
    rows=json.loads(request(url,'youtube-search-'+str(n),cached))
    if not isinstance(rows,list):raise ValueError('Invalid public search response')
    found.extend(s for s in rows if is_rescene(s))
    if not rows:break
   else:raise ValueError('Incomplete YouTube catalog')
   known={s.get('sourceIds',{}).get('youtube') for s in songs}
   for info in found:
    sid=info['id']
    if sid in known:continue
    key='youtube_'+sid
    if key not in lookup:
     s={'id':key,'name':info['name'],'album':(info.get('album') or {}).get('name') or 'YouTube'+(' · '+info['releasedAt'][:10].replace('-','.') if info.get('releasedAt') else ''),'release':info.get('releasedAt'),'link':info.get('link') or BASE+'/song/youtube/'+sid,'sourceIds':{'youtube':sid}}
     songs.append(s);lookup[key]=s;known.add(sid)
   manifest['youtubeCatalogCheckedAt']=now()
  except Exception as e:errors.append('youtube/catalog: '+str(e))
 charts={}
 for key,(platform,route,label,unit,cap) in EXTRA.items():
  path=ROOT/'data'/f'{key}.json'
  c=json.loads(path.read_text()) if path.exists() else {'songs':{},'historyFetched':{},'latest':None}
  c.update(key=key,label=label,platform=platform,unit=unit,limit=cap,source=BASE+'/chart/'+platform+'/'+route)
  c['sourceSongIds']={s['id']:s['sourceIds'][platform] for s in songs if s.get('sourceIds',{}).get(platform)}
  # Audio and video catalogs are separate, including identically named recordings.
  if platform!='youtube':c['sourceSongIds']={k:v for k,v in c['sourceSongIds'].items() if k.isdigit()}
  try:
   d=page(request(c['source'],key,cached))['data'];validate_extra(d,key)
   if d.get('size',0)<cap or len(d['data'])<cap:raise ValueError('Incomplete snapshot')
   c['latest'],c['latestSourceTime']=observation_time({'time':d['time']},key);c['snapshotLimit']=cap;c['collectedAt']=now()
   table={row['song']['id']:row for row in d['data']}
   for sid,source_id in c['sourceSongIds'].items():
    s=lookup[sid];row=table.get(source_id)
    if row and not is_rescene(row['song']):raise ValueError('Unexpected artist')
    if s.get('release') and c['latest'][:10]<s['release'][:10]:continue
    merge(c,sid,[dict(row,time=d['time'])] if row else [{'time':d['time'],'ranking':None}],snapshot=True)
   print('snapshot',key,c['latest'],flush=True)
  except Exception as e:errors.append(key+': '+str(e));print('ERROR',errors[-1],flush=True)
  charts[key]=c;atomic(path,c)
 metadata(manifest);manifest.update(songs=songs,errors=errors);atomic(ROOT/'data/manifest.json',manifest)
 tasks=[(key,sid,source_id) for key,c in charts.items() for sid,source_id in c['sourceSongIds'].items() if backfill or sid not in c['historyFetched']]
 def fetch(task):
  key,sid,source_id=task;c=charts[key]
  try:
   p=page(request(c['source']+'/trend/ranking/'+source_id,key+'-'+source_id,cached));validate_extra(p['data'],key)
   if str(p['data'].get('songId'))!=source_id or str(p['song'].get('id'))!=source_id or not is_rescene(p['song']):raise ValueError('Wrong song identity')
   return key,sid,p,None
  except Exception as e:return key,sid,None,str(e)
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for i,(key,sid,p,error) in enumerate(pool.map(fetch,tasks),1):
   c=charts[key]
   if error:errors.append(key+'/'+sid+': '+error)
   else:
    merge(c,sid,p['data']['data']);c['historyFetched'][sid]=now()
    if not sid.isdigit():lookup[sid]['release']=p['song'].get('releasedAt')
    atomic(ROOT/'data'/f'{key}.json',c)
   if i%10==0:print('histories',i,'/',len(tasks),'errors',len(errors),flush=True)
 for key,c in charts.items():
  c['limit']=max(c['limit'],max((p['rank'] or 0 for records in c['songs'].values() for p in records.values()),default=0));atomic(ROOT/'data'/f'{key}.json',c)
 metadata(manifest);manifest.update(songs=songs,errors=errors,builtAt=now());atomic(ROOT/'data/manifest.json',manifest)
 print('saved',len(charts),'additional charts',len(tasks),'histories',len(errors),'errors',flush=True)
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--backfill',action='store_true');ap.add_argument('--cached',action='store_true');ap.add_argument('--external-only',action='store_true');args=ap.parse_args()
 if not args.external_only:
  collect_melon.main()
 collect_extra(args.backfill,args.cached)
if __name__=='__main__':main()
