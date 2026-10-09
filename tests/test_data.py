import importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('collect',ROOT/'scripts/collect.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class DataTests(unittest.TestCase):
 def test_missing_rank_is_not_fabricated(self):
  c={'songs':{}}
  m.merge(c,'1',[{'time':'2024-03-26T00:00:00','ranking':None},{'time':'2024-03-28T00:00:00','ranking':23}])
  self.assertEqual(len(c['songs']['1']),2)
  self.assertEqual(c['songs']['1']['2024-03-26T00:00:00']['status'],'out')
  self.assertNotIn('2024-03-27T00:00:00',c['songs']['1'])
 def test_monthly_source_fields(self):
  c={'songs':{}}
  m.merge(c,'1',[{'year':2025,'month':4,'ranking':102}])
  self.assertEqual(next(iter(c['songs']['1'].values()))['rank'],102)
 def test_incomplete_response_rejected(self):
  with self.assertRaises(ValueError):m.validate({'platform':'melon','chart':'MELON_DAILY_CHART','pagination':{'hasNextPage':True}},'daily')
 def test_invalid_rank_rejected(self):
  with self.assertRaises(ValueError):m.merge({'songs':{}},'1',[{'time':'2025-01-01T00:00:00','ranking':-1}])
 def test_annual_debut_year_kept(self):
  c={'key':'yearly','songs':{}}
  m.merge(c,'1',[{'year':2024,'ranking':82}])
  self.assertIn('2024-12-31T00:00:00',c['songs']['1'])
  self.assertEqual(c['songs']['1']['2024-12-31T00:00:00']['sourceTime'],'2024-01-01T00:00:00')
 def test_snapshot_does_not_erase_more_precise_history(self):
  c={'key':'weekly','limit':100,'songs':{}}
  row={'time':'2025-04-07T00:00:00','ranking':104}
  m.merge(c,'1',[row]);m.merge(c,'1',[dict(row,ranking=None)],snapshot=True)
  self.assertEqual(next(iter(c['songs']['1'].values()))['rank'],104)
 def test_weekly_period_overlaps_debut(self):
  c={'key':'weekly','songs':{}}
  m.merge(c,'1',[{'time':'2024-03-25T00:00:00','ranking':80}])
  self.assertIn('2024-03-31T00:00:00',c['songs']['1'])
 def test_dataset_integrity(self):
  for f in (ROOT/'data').glob('*.json'):
   if f.name=='manifest.json':continue
   c=json.loads(f.read_text())
   for records in c['songs'].values():
    for time,p in records.items():
     self.assertGreaterEqual(time[:10],'2024-03-26')
     self.assertTrue(p['rank'] is None or isinstance(p['rank'],int) and p['rank']>0)
     self.assertIn(p['status'],['ranked','out'])
 def test_platform_validation_prevents_mixed_sources(self):
  for key,(platform,route,_,_,_) in m.EXTRA.items():
   payload={'platform':platform,'chart':platform.upper()+'_'+route.replace('-','_').upper()+'_CHART'}
   m.validate_extra(payload,key)
   with self.assertRaises(ValueError):m.validate_extra(dict(payload,platform='melon'),key)
   with self.assertRaises(ValueError):m.validate_extra(dict(payload,pagination={'hasNextPage':True}),key)
 def test_external_weekly_period_ends_after_six_days(self):
  for key in ['circle-digital-weekly','youtube-track-weekly','youtube-video-weekly']:
   self.assertEqual(m.observation_time({'time':'2024-03-22T00:00:00'},key),('2024-03-28T00:00:00','2024-03-22T00:00:00'))
 def test_platform_catalog_and_chart_keys(self):
  manifest=json.loads((ROOT/'data/manifest.json').read_text())
  if 'platforms' not in manifest:return
  ids={s['id'] for s in manifest['songs']}
  self.assertEqual(len(ids),len(manifest['songs']))
  self.assertEqual(len(manifest['platforms']),7)
  keys=[k for p in manifest['platforms'] for k in p['charts']]
  self.assertEqual(set(keys),set(manifest['charts']))
  self.assertEqual(len(keys),len(set(keys)))
  for platform in manifest['platforms']:
   for key in platform['charts']:
    c=json.loads((ROOT/'data'/f'{key}.json').read_text())
    self.assertEqual(c['platform'],platform['id'])
    self.assertIn(c['unit'],['hour','day','week','month','year'])
    self.assertTrue(set(c['songs'])<=ids)
if __name__=='__main__':unittest.main()
