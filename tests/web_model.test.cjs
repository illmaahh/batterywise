const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {simulate}=require('../web/model.js');
const golden=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/simulation_golden.json'),'utf8'));
test('browser model matches Python golden dispatch fixture',()=>{
 const i=golden.input,c=i.battery;
 const r=simulate(i.solar_kwh,i.demand_kwh,{capacity:c.capacity_kwh,maxCharge:c.max_charge_kw,maxDischarge:c.max_discharge_kw});
 const keys={soc_kwh:'stateOfCharge',charge_from_solar_kwh:'charge',battery_to_load_kwh:'discharge',curtailment_kwh:'curtailment',residual_demand_kwh:'residual',losses_kwh:'losses'};
 for(const [k,v] of Object.entries(golden.expected))assert.deepEqual(r[keys[k]],v,k);
});
test('zero capacity is exactly the no-storage result',()=>{
 const r=simulate([6,1],[2,4],{capacity:0,maxCharge:5,maxDischarge:5});
 assert.deepEqual(r.charge,[0,0]);assert.deepEqual(r.discharge,[0,0]);assert.deepEqual(r.curtailment,[4,0]);assert.deepEqual(r.residual,[0,3]);
});
test('state of charge stays within configured bounds with losses',()=>{
 const r=simulate([8,0,5],[2,5,8],{capacity:4,maxCharge:3,maxDischarge:2,chargeEfficiency:.9,dischargeEfficiency:.9,minSoc:.1,maxSoc:.9,initialSoc:.2});
 assert.ok(r.stateOfCharge.every(s=>s>=.4-1e-12&&s<=3.6+1e-12));assert.ok(r.losses.some(x=>x>0));
});
test('curtailment does not rise when capacity increases',()=>{
 const solar=[8,0,8,0,3,0],demand=[2,6,2,6,4,5];
 const amounts=[0,1,2,4,8].map(capacity=>simulate(solar,demand,{capacity,maxCharge:4,maxDischarge:4}).totalCurtailment);
 assert.ok(amounts.every((v,i)=>i===0||v<=amounts[i-1]+1e-9));
});
test('100% efficiency has zero losses and reports cycles',()=>{
 const r=simulate([5,0],[2,5],{capacity:3,maxCharge:3,maxDischarge:3});
 assert.equal(r.losses.reduce((a,b)=>a+b,0),0);assert.equal(r.equivalentFullCycles,1);
});

test('initial stored energy is excluded from renewable solar attribution',()=>{
 const r=simulate([0],[5],{capacity:5,maxCharge:5,maxDischarge:5,initialSoc:1});
 assert.deepEqual(r.discharge,[5]);assert.equal(r.solarServedShare,0);
});
