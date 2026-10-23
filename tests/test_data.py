import pandas as pd
import pytest
from batterywise.data import normalize_hourly

def test_normalize_utc():
 f=pd.DataFrame({'t':['2023-01-01T00:00:00Z'],'d':[2.0],'s':[1.0]}); r=normalize_hourly(f,'t','d','s')
 assert str(r.index.tz)=='UTC'; assert r.iloc[0].to_dict()=={'demand_kwh':2.0,'solar_kwh':1.0}
@pytest.mark.parametrize('times',[['bad'],['2023-01-01T00:00:00Z','2023-01-01T00:00:00Z']])
def test_reject_bad_or_duplicate_time(times):
 f=pd.DataFrame({'t':times,'d':[1]*len(times),'s':[1]*len(times)})
 with pytest.raises(ValueError): normalize_hourly(f,'t','d','s')
def test_reject_missing_without_interpolation():
 with pytest.raises(ValueError,match='no interpolation'):
  normalize_hourly(pd.DataFrame({'t':['2023-01-01T00:00Z'],'d':[None],'s':[0]}),'t','d','s')
