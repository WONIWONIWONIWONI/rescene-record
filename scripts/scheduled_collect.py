"""Refresh missing snapshots only; keep successful charts and bounded retries."""
import argparse, copy, json, subprocess, sys, time
from datetime import datetime, timedelta, timezone
import collect

KST=timezone(timedelta(hours=9))
INTERVAL=20
WINDOW=600
def pending(manifest,charts,target_hour):
 failures={e.split(':',1)[0] for e in manifest.get('errors',[]) if ': ' in e and '/' not in e.split(':',1)[0]}
 return [key for key,c in charts.items() if not c.get('latest') or key in failures or
         c.get('unit')=='hour' and (c.get('latestSourceTime') or c.get('latest',''))[:13]<target_hour]

def refresh(key,manifest):
 path=collect.ROOT/'data'/f'{key}.json'
 original=json.loads(path.read_text());c=copy.deepcopy(original)
 d=collect.page(collect.request(c['source'],key))['data']
 if key in collect.EXTRA:collect.validate_extra(d,key);cap=collect.EXTRA[key][4]
 else:collect.validate(d,key);cap=collect.CAPS[key]
 if d.get('size',0)<cap or len(d.get('data',[]))<cap:raise ValueError('Incomplete snapshot')
 stamp,source_time=collect.observation_time({'time':d['time']},key)
 if source_time<(c.get('latestSourceTime') or ''):raise ValueError('Older snapshot')
 table={str(row['song']['id']):row for row in d['data']}
 ids=c.get('sourceSongIds') or {s['id']:s['id'] for s in manifest['songs'] if s['id'].isdigit()}
 lookup={s['id']:s for s in manifest['songs']}
 for sid,source_id in ids.items():
  s=lookup[sid];row=table.get(source_id)
  if row and not collect.is_rescene(row['song']):raise ValueError('Wrong artist')
  if s.get('release') and stamp[:10]<s['release'][:10]:continue
  # The snapshot's published range can be narrower than historical ranks.
  historical_limit=c['limit'];c['limit']=cap
  collect.merge(c,sid,[dict(row,time=d['time'])] if row else [{'time':d['time'],'ranking':None}],snapshot=True)
  c['limit']=historical_limit
 c.update(latest=stamp,latestSourceTime=source_time,snapshotLimit=cap,collectedAt=collect.now())
 collect.atomic(path,c)
 manifest['errors']=[e for e in manifest.get('errors',[]) if not e.startswith(key+': ')]
 return c

def retry(manifest,charts,target_hour,clock=time.monotonic,sleep=time.sleep,refresh_fn=refresh):
 deadline=clock()+WINDOW;attempts=0
 while True:
  missing=pending(manifest,charts,target_hour)
  if not missing:return [],attempts
  remaining=deadline-clock()
  if remaining<INTERVAL:return missing,attempts
  sleep(INTERVAL)
  if clock()>=deadline:return missing,attempts
  attempts+=1
  print('retry',attempts,'missing snapshots:',','.join(missing),flush=True)
  for key in missing:
   if clock()>=deadline:break
   try:charts[key]=refresh_fn(key,manifest)
   except Exception as e:
    manifest['errors']=[x for x in manifest.get('errors',[]) if not x.startswith(key+': ')]
    manifest['errors'].append(key+': '+str(e));print('retry failed',key,str(e),flush=True)
  manifest['builtAt']=collect.now();collect.atomic(collect.ROOT/'data/manifest.json',manifest)

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--backfill',action='store_true');args=ap.parse_args()
 target=datetime.now(KST).strftime('%Y-%m-%dT%H')
 command=[sys.executable,str(collect.ROOT/'scripts/collect.py')]+(['--backfill'] if args.backfill else [])
 result=subprocess.run(command,cwd=collect.ROOT)
 manifest=json.loads((collect.ROOT/'data/manifest.json').read_text())
 charts={k:json.loads((collect.ROOT/'data'/f'{k}.json').read_text()) for k in manifest['charts']}
 missing,attempts=retry(manifest,charts,target)
 manifest['refreshCheck']={'targetHourKST':target,'retryIntervalSeconds':INTERVAL,'retryWindowSeconds':WINDOW,'retries':attempts,'pendingCharts':missing,'checkedAt':collect.now()}
 collect.atomic(collect.ROOT/'data/manifest.json',manifest)
 if missing:print('::warning::Still missing after retry window: '+','.join(missing),flush=True)
 if result.returncode and not any(c.get('latest') for c in charts.values()):raise SystemExit(result.returncode)
if __name__=='__main__':main()
