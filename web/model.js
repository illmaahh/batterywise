(function(root,factory){
  const model=factory();
  if(typeof module==='object'&&module.exports) module.exports=model;
  if(root) root.BATTERYWISE_MODEL=model;
})(typeof window!=='undefined'?window:null,function(){
  function simulate(solar,demand,config){
    if(!Array.isArray(solar)||!Array.isArray(demand)||solar.length!==demand.length)throw new Error('Series lengths differ');
    if(solar.some(x=>!Number.isFinite(x)||x<0)||demand.some(x=>!Number.isFinite(x)||x<0))throw new Error('Series must be finite and non-negative');
    const c={capacity:0,maxCharge:0,maxDischarge:0,chargeEfficiency:1,dischargeEfficiency:1,minSoc:0,maxSoc:1,initialSoc:0,...config};
    if([c.capacity,c.maxCharge,c.maxDischarge].some(x=>!Number.isFinite(x)||x<0))throw new Error('Battery limits must be finite and non-negative');
    if(!(c.chargeEfficiency>0&&c.chargeEfficiency<=1&&c.dischargeEfficiency>0&&c.dischargeEfficiency<=1))throw new Error('Efficiency must be in (0, 1]');
    if(!(c.minSoc>=0&&c.minSoc<=c.initialSoc&&c.initialSoc<=c.maxSoc&&c.maxSoc<=1))throw new Error('Invalid state-of-charge bounds');
    const cap=c.capacity,low=c.minSoc*cap,high=c.maxSoc*cap;let soc=c.initialSoc*cap;
    let solarSoc=0;const stateOfCharge=[],charge=[],discharge=[],solarToLoad=[],curtailment=[],residual=[],losses=[],directSolar=[];
    for(let i=0;i<solar.length;i++){
      const surplus=Math.max(0,solar[i]-demand[i]),deficit=Math.max(0,demand[i]-solar[i]);
      const charged=Math.min(surplus,c.maxCharge,Math.max(0,high-soc)/c.chargeEfficiency),stored=charged*c.chargeEfficiency;
      solarSoc+=stored;
      const delivered=Math.min(deficit,c.maxDischarge,Math.max(0,soc-low)*c.dischargeEfficiency),removed=delivered?delivered/c.dischargeEfficiency:0;
      const renewableFraction=soc>0?solarSoc/soc:0,renewableDelivered=delivered*renewableFraction,renewableRemoved=removed*renewableFraction;
      solarSoc=Math.max(0,solarSoc-renewableRemoved);soc=Math.min(high,Math.max(low,soc+stored-removed));stateOfCharge.push(soc);charge.push(charged);discharge.push(delivered);solarToLoad.push(renewableDelivered);directSolar.push(Math.min(solar[i],demand[i]));
      curtailment.push(surplus-charged);residual.push(deficit-delivered);losses.push(charged-stored+removed-delivered);
    }
    const totalDemand=demand.reduce((a,b)=>a+b,0),batteryDelivered=discharge.reduce((a,b)=>a+b,0);
    const solarServed=directSolar.reduce((a,b)=>a+b,0)+solarToLoad.reduce((a,b)=>a+b,0);
    return {stateOfCharge,charge,discharge,solarToLoad,directSolar,curtailment,residual,losses,solarServedShare:totalDemand?solarServed/totalDemand:0,totalSolarDelivered:solarServed,equivalentFullCycles:cap?batteryDelivered/cap:0,totalCharged:charge.reduce((a,b)=>a+b,0),totalDelivered:batteryDelivered,totalCurtailment:curtailment.reduce((a,b)=>a+b,0),finalStateOfCharge:soc};
  }
  return {simulate};
});
