from dataclasses import dataclass
from typing import Sequence

@dataclass(frozen=True)
class BatteryConfig:
    capacity_kwh: float
    max_charge_kw: float
    max_discharge_kw: float
    charge_efficiency: float = 1.0
    discharge_efficiency: float = 1.0
    min_soc: float = 0.0
    max_soc: float = 1.0
    initial_soc: float = 0.0
    def validate(self):
        if min(self.capacity_kwh,self.max_charge_kw,self.max_discharge_kw)<0: raise ValueError('negative limit')
        if not all(0<x<=1 for x in (self.charge_efficiency,self.discharge_efficiency)): raise ValueError('efficiency outside (0,1]')
        if not 0<=self.min_soc<=self.initial_soc<=self.max_soc<=1: raise ValueError('invalid SoC bounds')

@dataclass(frozen=True)
class SimulationResult:
    soc_kwh: tuple
    charge_from_solar_kwh: tuple
    battery_to_load_kwh: tuple
    curtailment_kwh: tuple
    residual_demand_kwh: tuple
    losses_kwh: tuple
    solar_share_served: float
    equivalent_full_cycles: float

def simulate(solar_kwh: Sequence[float], demand_kwh: Sequence[float], config: BatteryConfig) -> SimulationResult:
    config.validate()
    if len(solar_kwh)!=len(demand_kwh): raise ValueError('series lengths differ')
    if any(x<0 for x in (*solar_kwh,*demand_kwh)): raise ValueError('negative series value')
    cap=config.capacity_kwh; soc=config.initial_soc*cap; low=config.min_soc*cap; high=config.max_soc*cap
    socs=[]; charges=[]; discharges=[]; curtail=[]; residual=[]; losses=[]; solar_soc=0.; solar_delivered=0.
    for solar,demand in zip(solar_kwh,demand_kwh):
        surplus=max(0.,solar-demand); deficit=max(0.,demand-solar)
        charge=min(surplus,config.max_charge_kw,max(0.,high-soc)/config.charge_efficiency); stored=charge*config.charge_efficiency; solar_soc+=stored
        delivered=min(deficit,config.max_discharge_kw,max(0.,soc-low)*config.discharge_efficiency); removed=delivered/config.discharge_efficiency if delivered else 0.
        renewable_fraction=solar_soc/soc if soc else 0.; solar_delivered+=delivered*renewable_fraction; solar_soc=max(0.,solar_soc-removed*renewable_fraction)
        soc=min(high,max(low,soc+stored-removed)); socs.append(soc); charges.append(charge); discharges.append(delivered)
        curtail.append(surplus-charge); residual.append(deficit-delivered); losses.append(charge-stored+removed-delivered)
    total=sum(demand_kwh); direct_solar=sum(min(s,d) for s,d in zip(solar_kwh,demand_kwh)); served=direct_solar+solar_delivered
    return SimulationResult(tuple(socs),tuple(charges),tuple(discharges),tuple(curtail),tuple(residual),tuple(losses),served/total if total else 0.,sum(discharges)/cap if cap else 0.)