import json
from pathlib import Path
import pytest
from batterywise.simulation import BatteryConfig,simulate

def test_hand_calculated():
 r=simulate([5,0],[2,5],BatteryConfig(3,3,3)); assert r.charge_from_solar_kwh==(3,0); assert r.battery_to_load_kwh==(0,3); assert r.curtailment_kwh==(0,0); assert r.residual_demand_kwh==(0,2); assert r.soc_kwh==(3,0)
def test_python_matches_shared_golden_file():
 g=json.loads((Path(__file__).parent/'fixtures'/'simulation_golden.json').read_text(encoding='utf-8-sig')); i=g['input']; c=BatteryConfig(**i['battery']); r=simulate(i['solar_kwh'],i['demand_kwh'],c)
 for key,value in g['expected'].items(): assert list(getattr(r,key))==value

def test_energy_and_soc():
 s,d=[8,1,4],[2,5,7];r=simulate(s,d,BatteryConfig(4,3,2,.9,.9)); assert all(0<=x<=4 for x in r.soc_kwh)
 for i in range(3): assert s[i]+r.battery_to_load_kwh[i]==pytest.approx(d[i]-r.residual_demand_kwh[i]+r.charge_from_solar_kwh[i]+r.curtailment_kwh[i])
def test_zero_capacity():
 r=simulate([6,1],[2,4],BatteryConfig(0,5,5));assert r.curtailment_kwh==(4,0);assert r.residual_demand_kwh==(0,3)
def test_losses():
 r=simulate([3,0],[0,3],BatteryConfig(3,3,3,.8,.8));assert sum(r.losses_kwh)==pytest.approx(1.08)
def test_capacity_monotonic():
 s,d=[5,0,5],[1,5,1];a=simulate(s,d,BatteryConfig(1,5,5));b=simulate(s,d,BatteryConfig(2,5,5));assert sum(b.curtailment_kwh)<=sum(a.curtailment_kwh)


def test_initial_stored_energy_is_not_counted_as_solar():
 r=simulate([0],[5],BatteryConfig(5,5,5,initial_soc=1)); assert r.battery_to_load_kwh==(5,); assert r.solar_share_served==0
