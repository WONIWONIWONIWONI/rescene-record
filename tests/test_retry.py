import importlib.util, json, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('scheduled_collect',ROOT/'scripts/scheduled_collect.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class RetryTests(unittest.TestCase):
 def test_only_failed_or_late_hourly_snapshots_retry(self):
  charts={'top100':{'latest':'2026-10-09T21:00:00','unit':'hour'},'daily':{'latest':'2026-10-08T00:00:00','unit':'day'},'weekly':{'latest':'2026-10-04T00:00:00','unit':'week'},'vibe-daily':{'latest':'2026-10-08T00:00:00','unit':'day'}}
  self.assertEqual(m.pending({'errors':['vibe-daily: network failure','youtube/catalog: missing']},charts,'2026-10-09T22'),['top100','vibe-daily'])
  charts['top100']['latestSourceTime']='2026-10-09T22:00:00'
  self.assertEqual(m.pending({'errors':[]},charts,'2026-10-09T22'),[])
 def test_retry_recovers_and_stops_without_refetching_success(self):
  clock=[0];calls=[];sleeps=[]
  def sleep(seconds):clock[0]+=seconds;sleeps.append(seconds)
  def refresh(key,manifest):
   calls.append(key)
   if len(calls)==1:raise OSError('Temporary failure')
   manifest['errors']=[];return {'unit':'hour','latest':'2026-10-09T22:00:00'}
  with patch.object(m.collect,'atomic'):
   missing,attempts=m.retry({'errors':[]},{'top100':{'unit':'hour','latest':'2026-10-09T21:00:00'},'daily':{'unit':'day','latest':'2026-10-08T00:00:00'}},'2026-10-09T22',lambda:clock[0],sleep,refresh)
  self.assertEqual((missing,attempts),([],2));self.assertEqual(calls,['top100','top100']);self.assertEqual(sleeps,[20,20])
 def test_retry_window_is_bounded_and_keeps_last_success(self):
  clock=[0];old={'unit':'hour','latest':'2026-10-09T21:00:00'};charts={'top100':old.copy()}
  def sleep(seconds):clock[0]+=seconds
  def refresh(key,manifest):raise OSError('Unavailable')
  with patch.object(m.collect,'atomic'),patch.object(m,'WINDOW',60):
   missing,attempts=m.retry({'errors':[]},charts,'2026-10-09T22',lambda:clock[0],sleep,refresh)
  self.assertEqual((missing,attempts),(['top100'],2));self.assertEqual(clock[0],60);self.assertEqual(charts['top100'],old)
 def test_invalid_retry_response_cannot_replace_saved_ranks(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);(root/'data').mkdir();path=root/'data/genie-realtime.json'
   old={'source':'https://example.invalid','limit':250,'songs':{'1':{'2026-10-09T21:00:00':{'rank':3}}}};path.write_text(json.dumps(old))
   with patch.object(m.collect,'ROOT',root),patch.object(m.collect,'request',return_value=''),patch.object(m.collect,'page',return_value={'data':{'platform':'bugs','chart':'BUGS_REALTIME_CHART'}}):
    with self.assertRaises(ValueError):m.refresh('genie-realtime',{'songs':[{'id':'1'}]})
   self.assertEqual(json.loads(path.read_text()),old)

if __name__=='__main__':unittest.main()
