(function(){
  'use strict';
  const data=window.BATTERYWISE_DATA, model=window.BATTERYWISE_MODEL;
  const demand=data.demandMw, solarObserved=data.solarMw, total=a=>a.reduce((sum,value)=>sum+value,0);
  const demandYear=total(demand), solarYear=total(solarObserved), hourMs=3600000, yearStart=Date.parse(data.utcStart);
  const $=id=>document.getElementById(id), intFmt=new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}), decFmt=new Intl.NumberFormat('en-GB',{maximumFractionDigits:1});
  const controls={capacityRange:$('capacityRange'),capacityNumber:$('capacityNumber'),powerRange:$('powerRange'),powerNumber:$('powerNumber'),shareRange:$('shareRange'),shareNumber:$('shareNumber')};
  const rangePairs=[['capacityRange','capacityNumber','capacityOut',' MWh'],['powerRange','powerNumber','powerOut',' MW'],['shareRange','shareNumber','shareOut','%']];
  const ns='http://www.w3.org/2000/svg'; let active={};
  function svg(tag,attrs={},text){const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;return el}
  function solarScale(share){return solarYear?share*demandYear/solarYear:0}
  function simulationConfig(capacity,power){return {capacity,maxCharge:power,maxDischarge:power,chargeEfficiency:Number($('chargeEfficiency').value)/100,dischargeEfficiency:Number($('dischargeEfficiency').value)/100,minSoc:Number($('minimumSoc').value)/100,maxSoc:Number($('maximumSoc').value)/100,initialSoc:Number($('initialSoc').value)/100}}
  function formatMWh(value){return intFmt.format(Math.round(value))+' MWh'}
  function formatTWh(value){return decFmt.format(value/1e6)+' TWh'}
  function dateFromIndex(index){return new Date(yearStart+index*hourMs)}
  function getWeekStart(){const value=$('weekStart').value;const ts=Date.parse(value+'T00:00:00Z');return Math.max(0,Math.min(demand.length-168,Math.floor((ts-yearStart)/hourMs)))}
  function setError(message){const el=$('validationMessage');el.textContent=message;el.hidden=!message;$('runStatus').textContent=message?'CHECK INPUTS':'RECALCULATING';$('runStatus').classList.toggle('invalid',Boolean(message));$('downloadCsv').disabled=Boolean(message)}
  function niceMax(value){const step=value>50000?10000:value>10000?2500:value>2000?500:100;return Math.max(step,Math.ceil(value/step)*step)}
  function xFor(i,count,left,width){return left+(count<=1?0:i*width/(count-1))}
  function yFor(value,max,top,height){return top+height-(value/max)*height}
  function makePath(values,max,box){return values.map((value,i)=>(i?'L':'M')+xFor(i,values.length,box.left,box.width).toFixed(1)+','+yFor(value,max,box.top,box.height).toFixed(1)).join(' ')}
  function timeTicks(start,count){const ticks=[];for(let i=0;i<count;i+=24){const date=dateFromIndex(start+i);ticks.push({i,label:date.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',timeZone:'UTC'})})}return ticks}
  function drawPowerChart(elementId,series,startIndex,annotationIndexes){
    const element=$(elementId),width=960,height=390,box={left:74,top:28,width:755,height:292};element.replaceChildren();
    const count=series[0].values.length,maximum=niceMax(Math.max(1,...series.flatMap(item=>item.values))),unitStep=maximum/4;
    element.append(svg('text',{x:18,y:22,class:'axis-title'} ,'MW'));
    for(let i=0;i<=4;i++){const value=unitStep*i,y=yFor(value,maximum,box.top,box.height);element.append(svg('line',{x1:box.left,y1:y,x2:box.left+box.width,y2:y,class:'gridline'}));element.append(svg('text',{x:box.left-12,y:y+4,'text-anchor':'end',class:'axis-label'},intFmt.format(value)))}
    element.append(svg('line',{x1:box.left,y1:box.top,x2:box.left,y2:box.top+box.height,class:'axis-line'}));element.append(svg('line',{x1:box.left,y1:box.top+box.height,x2:box.left+box.width,y2:box.top+box.height,class:'axis-line'}));
    for(const tick of timeTicks(startIndex,count)){const x=xFor(tick.i,count,box.left,box.width);element.append(svg('line',{x1:x,y1:box.top+box.height,x2:x,y2:box.top+box.height+5,class:'axis-line'}));element.append(svg('text',{x,y:box.top+box.height+24,'text-anchor':tick.i===0?'start':'middle',class:'axis-label'},tick.label))}
    for(const item of series){element.append(svg('path',{d:makePath(item.values,maximum,box),class:'series-line '+item.className}));}
    const labelPositions=series.map(item=>({label:item.label,color:item.color,y:yFor(item.values.at(-1),maximum,box.top,box.height)})).sort((a,b)=>a.y-b.y);
    for(let i=1;i<labelPositions.length;i++)if(labelPositions[i].y-labelPositions[i-1].y<18)labelPositions[i].y=labelPositions[i-1].y+18;
    for(let i=labelPositions.length-2;i>=0;i--)if(labelPositions[i+1].y-labelPositions[i].y<18)labelPositions[i].y=labelPositions[i+1].y-18;
    labelPositions.forEach(item=>element.append(svg('text',{x:box.left+box.width+12,y:Math.max(box.top+11,Math.min(box.top+box.height-3,item.y+4)),class:'direct-label',fill:item.color},item.label)));
    if(annotationIndexes){
      for(const note of annotationIndexes){if(note.index<0)continue;const x=xFor(note.index,count,box.left,box.width),value=note.value,y=yFor(value,maximum,box.top,box.height);element.append(svg('line',{x1:x,y1:box.top,x2:x,y2:box.top+box.height,class:'annotation-guide '+note.kind}));element.append(svg('circle',{cx:x,cy:y,r:4,class:'annotation-dot '+note.kind}));const labelY=note.kind==='surplus'?box.top+16:box.top+box.height-12;const tx=Math.max(box.left+8,Math.min(box.left+box.width-170,x+10));element.append(svg('text',{x:tx,y:labelY,class:'annotation-label '+note.kind},note.label))}
    }
    element.dataset.scaleMax=String(maximum);
  }
  function drawSocChart(startIndex,result,config){
    const el=$('socChart'),width=960,height=210,box={left:74,top:20,width:755,height:135},values=result.stateOfCharge.slice(startIndex,startIndex+168),max=Math.max(1,config.capacity);el.replaceChildren();
    el.append(svg('text',{x:18,y:18,class:'axis-title'},'MWh'));
    for(let i=0;i<=2;i++){const value=max*i/2,y=yFor(value,max,box.top,box.height);el.append(svg('line',{x1:box.left,y1:y,x2:box.left+box.width,y2:y,class:'gridline'}));el.append(svg('text',{x:box.left-12,y:y+4,'text-anchor':'end',class:'axis-label'},intFmt.format(value)))}
    const minY=yFor(config.capacity*config.minSoc,max,box.top,box.height),maxY=yFor(config.capacity*config.maxSoc,max,box.top,box.height);
    el.append(svg('line',{x1:box.left,y1:minY,x2:box.left+box.width,y2:minY,class:'soc-bound'}));el.append(svg('line',{x1:box.left,y1:maxY,x2:box.left+box.width,y2:maxY,class:'soc-bound'}));
    el.append(svg('path',{d:makePath(values,max,box),class:'series-line soc-line'}));el.append(svg('text',{x:box.left+box.width+12,y:Math.max(box.top+12,Math.min(box.top+box.height-2,yFor(values.at(-1),max,box.top,box.height)+4)),class:'direct-label soc-label'},'Stored energy'));
    const start=dateFromIndex(startIndex);el.append(svg('text',{x:box.left,y:height-10,class:'axis-label'},start.toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long',timeZone:'UTC'})+' — 7 days · UTC'));
    if(config.capacity===0)el.append(svg('text',{x:box.left+box.width/2,y:box.top+box.height/2,'text-anchor':'middle',class:'empty-chart-label'},'No battery capacity selected'));
  }
  function drawMarginal(points){
    const el=$('marginalChart'),width=960,height=300,box={left:78,top:25,width:815,height:210},max=Math.ceil(Math.max(.1,...points.map(p=>p.value))*4)/4,step=1000;el.replaceChildren();
    for(let i=0;i<=4;i++){const value=max*i/4,y=yFor(value,max,box.top,box.height);el.append(svg('line',{x1:box.left,y1:y,x2:box.left+box.width,y2:y,class:'gridline'}));el.append(svg('text',{x:box.left-12,y:y+4,'text-anchor':'end',class:'axis-label'},value.toFixed(2)))}
    const path=points.map((p,i)=>(i?'L':'M')+(box.left+(p.capacity-step/2)/(10000)*box.width).toFixed(1)+','+yFor(p.value,max,box.top,box.height).toFixed(1)).join(' ');el.append(svg('path',{d:path,class:'series-line marginal-line'}));
    points.forEach(p=>{const x=box.left+(p.capacity-step/2)/10000*box.width,y=yFor(p.value,max,box.top,box.height);el.append(svg('circle',{cx:x,cy:y,r:4,class:'marginal-point'}));el.append(svg('title',{},`${intFmt.format(p.capacity)} MWh installed capacity step: ${p.value.toFixed(3)} MWh delivered per additional MWh`))});
    for(let i=0;i<=5;i++){const x=box.left+i*box.width/5;el.append(svg('line',{x1:x,y1:box.top+box.height,x2:x,y2:box.top+box.height+5,class:'axis-line'}));el.append(svg('text',{x,y:box.top+box.height+23,'text-anchor':'middle',class:'axis-label'},(i*2)+' GWh'))}
    el.append(svg('text',{x:20,y:18,class:'axis-title'},'MWh / MWh'));
  }
  function setPair(range,number,output,unit,changed){const source=changed===range?range:number,target=changed===range?number:range;let value=Number(source.value);if(!Number.isFinite(value))return;const min=Number(source.min),max=Number(source.max);value=Math.max(min,Math.min(max,value));range.value=String(value);number.value=String(value);$(output).textContent=intFmt.format(value)+unit}
  function readConfig(){
    const values=[controls.capacityNumber.value,controls.powerNumber.value,controls.shareNumber.value,$('chargeEfficiency').value,$('dischargeEfficiency').value,$('minimumSoc').value,$('maximumSoc').value,$('initialSoc').value];
    if(values.some(v=>v.trim()===''||!Number.isFinite(Number(v))))throw new Error('Enter a number in every setting before recalculating.');
    if(!/^2024-\d{2}-\d{2}$/.test($('weekStart').value)||!Number.isFinite(Date.parse($('weekStart').value+'T00:00:00Z')))throw new Error('Choose a valid date in 2024 for the seven-day chart.');
    const capacity=Number(controls.capacityNumber.value),power=Number(controls.powerNumber.value),share=Number(controls.shareNumber.value)/100;
    if(capacity<0||capacity>10000)throw new Error('Battery capacity must be from 0 to 10,000 MWh.');
    if(power<0||power>10000)throw new Error('Power must be from 0 to 10,000 MW.');
    if(share<0||share>1)throw new Error('Solar share must be from 0 to 100%.');
    const config=simulationConfig(capacity,power);
    if(config.chargeEfficiency<=0||config.chargeEfficiency>1||config.dischargeEfficiency<=0||config.dischargeEfficiency>1)throw new Error('Efficiency must be greater than 0% and no more than 100%.');
    if(config.minSoc<0||config.minSoc>config.maxSoc||config.initialSoc<config.minSoc||config.initialSoc>config.maxSoc)throw new Error('State of charge must satisfy minimum ≤ initial ≤ maximum.');
    return {capacity,power,share,config};
  }
  function scenarioRows(config,scaledSolar){
    const refs=[{name:'No battery',capacity:0},{name:'Small',capacity:500},{name:'Medium',capacity:2500},{name:'Large',capacity:10000},{name:'Custom',capacity:config.capacity,custom:true}];
    const body=$('scenarioRows');body.replaceChildren();let rows=[];
    for(const item of refs){const result=model.simulate(scaledSolar,demand,{...config,capacity:item.capacity});rows.push({item,result});const tr=document.createElement('tr');if(item.capacity===config.capacity)tr.className='selected-row';
      const values=[item.name,intFmt.format(item.capacity),intFmt.format(result.totalDelivered),intFmt.format(result.totalCurtailment),intFmt.format(total(result.losses)),(100*result.solarServedShare).toFixed(2)+'%',item.capacity?result.equivalentFullCycles.toFixed(2):'—',intFmt.format(result.finalStateOfCharge)];
      values.forEach((value,index)=>{const td=document.createElement('td');if(index===0){const button=document.createElement('button');button.type='button';button.className='scenario-select';button.textContent=value;button.setAttribute('aria-label',`Use the ${value} battery case (${intFmt.format(item.capacity)} MWh)`);button.setAttribute('aria-pressed',String(item.capacity===config.capacity));button.addEventListener('click',()=>{controls.capacityRange.value=String(item.capacity);controls.capacityNumber.value=String(item.capacity);update()});td.append(button)}else td.textContent=value;tr.append(td)});body.append(tr);
    }
    return rows;
  }
  function makeAnnotations(start,scaledSolar){const surplus=[],deficit=[];for(let i=0;i<168;i++){const index=start+i,gap=scaledSolar[index]-demand[index];if(gap>0)surplus.push({index:i,value:scaledSolar[index],gap});if(gap<0)deficit.push({index:i,value:demand[index],gap:-gap})}surplus.sort((a,b)=>b.gap-a.gap);deficit.sort((a,b)=>b.gap-a.gap);return [{index:surplus[0]?.index??-1,value:surplus[0]?.value??0,kind:'surplus',label:'Largest solar surplus · charge window'},{index:deficit[0]?.index??-1,value:deficit[0]?.value??0,kind:'deficit',label:'Largest hourly gap · residual supply'}]}
  function render(){
    let input;try{input=readConfig();setError('')}catch(error){setError(error.message);return}
    const {capacity,power,share,config}=input,scale=solarScale(share),scaledSolar=solarObserved.map(v=>v*scale),result=model.simulate(scaledSolar,demand,config),baseline=model.simulate(scaledSolar,demand,{...config,capacity:0});active={input,scaledSolar,result,baseline};
    for(const [rangeId,numberId,outputId,unit] of rangePairs)setPair($(rangeId),$(numberId),outputId,unit,$(numberId));
    $('capacityOut').textContent=intFmt.format(capacity)+' MWh';$('powerOut').textContent=intFmt.format(power)+' MW';$('shareOut').textContent=(share*100).toFixed(0)+'%';
    $('deliveredMetric').textContent=formatTWh(result.totalDelivered);$('savedMetric').textContent=formatTWh(baseline.totalCurtailment-result.totalCurtailment);$('servedMetric').textContent=(result.solarServedShare*100).toFixed(2)+'%';$('lossesMetric').textContent=formatMWh(total(result.losses));$('cyclesMetric').textContent=capacity?result.equivalentFullCycles.toFixed(2):'—';
    const start=getWeekStart(),weekDemand=demand.slice(start,start+168),weekSolar=scaledSolar.slice(start,start+168),weekResidual=result.residual.slice(start,start+168);
    drawPowerChart('storyChart',[{label:'Demand',values:weekDemand,className:'demand-line',color:'#24241f'},{label:'Scaled solar',values:weekSolar,className:'solar-line',color:'#a44f18'},{label:'Residual demand',values:weekResidual,className:'residual-line',color:'#60756e'}],start,makeAnnotations(start,scaledSolar));
    const weekSeries=[{label:'Demand',values:weekDemand,className:'demand-line',color:'#24241f'},{label:'Scaled solar',values:weekSolar,className:'solar-line',color:'#a44f18'},{label:'Residual demand',values:weekResidual,className:'residual-line',color:'#60756e'}];
    drawPowerChart('dispatchChart',weekSeries,start,null);drawSocChart(start,result,config);
    const startDate=dateFromIndex(start),endDate=dateFromIndex(start+167);$('storyChartDesc').textContent=`Hourly average megawatts from ${startDate.toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'})} through ${endDate.toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'})}. Demand is measured; solar is estimated and scaled. Annotations mark the largest hourly solar surplus and demand gap in this week.`;
    const peak=makeAnnotations(start,scaledSolar);const p=peak[0].index>=0?`Largest surplus: ${intFmt.format(peak[0].gap)} MW at ${dateFromIndex(start+peak[0].index).toISOString().slice(11,16)} UTC.`:'No hourly solar surplus in this selected week.';const q=peak[1].index>=0?` Largest demand gap: ${intFmt.format(peak[1].gap)} MW at ${dateFromIndex(start+peak[1].index).toISOString().slice(11,16)} UTC.`:'';$('storyAnnotation').textContent=`${p}${q} Solar is NESO’s estimate, scaled to ${(share*100).toFixed(0)}% of annual demand.`;
    $('weekStart').setAttribute('aria-valuetext',startDate.toISOString().slice(0,10));$('weekRange').textContent=`SELECTED WEEK / ${startDate.toLocaleDateString('en-GB',{day:'2-digit',month:'short',timeZone:'UTC'}).toUpperCase()}—${endDate.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase()} UTC`;$('weekHeadline').textContent=peak[0].index>=0&&peak[1].index>=0?'A surplus window, then a demand gap.':peak[0].index>=0?'A solar surplus appears in this week.':'No solar surplus under this scenario.';
    scenarioRows(config,scaledSolar);const marginal=[{capacity:0,value:0}],stepResults=[model.simulate(scaledSolar,demand,{...config,capacity:0}).totalDelivered];for(let c=1000;c<=10000;c+=1000)stepResults.push(model.simulate(scaledSolar,demand,{...config,capacity:c}).totalDelivered);for(let i=1;i<=10;i++)marginal.push({capacity:i*1000,value:(stepResults[i]-stepResults[i-1])/1000});drawMarginal(marginal.slice(1));
    $('marginalNote').textContent=`Each point measures the extra annual energy delivered when capacity rises by 1 GWh, with a ${intFmt.format(power)} MW power limit. The selected round-trip efficiency is ${(100*config.chargeEfficiency*config.dischargeEfficiency).toFixed(1)}%.`;
    $('runStatus').textContent='RECALCULATED';$('lastRun').textContent=`Last recalculated ${new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date())} with NESO Historic Demand Data 2024 · model v0.3.0`;
  }
  function download(){if(!active.result)return;const {input,scaledSolar,result}=active,rows=[['timestamp_utc','demand_MW','scaled_solar_MW','charge_MW','battery_to_load_MW','solar_origin_battery_to_load_MW','state_of_charge_MWh','curtailment_MW','residual_demand_MW','losses_MWh','solar_share_assumption_pct','capacity_MWh','power_limit_MW','charge_efficiency_pct','discharge_efficiency_pct']];for(let i=0;i<demand.length;i++)rows.push([new Date(yearStart+i*hourMs).toISOString(),demand[i],scaledSolar[i],result.charge[i],result.discharge[i],result.solarToLoad[i],result.stateOfCharge[i],result.curtailment[i],result.residual[i],result.losses[i],input.share*100,input.capacity,input.power,input.config.chargeEfficiency*100,input.config.dischargeEfficiency*100]);const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(',')).join('\r\n');const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`batterywise-gb-2024-${input.capacity}MWh.csv`;a.click();URL.revokeObjectURL(url)}
  for(const [rangeId,numberId,outputId,unit] of rangePairs){$(rangeId).addEventListener('input',event=>{setPair($(rangeId),$(numberId),outputId,unit,event.currentTarget);render()});$(numberId).addEventListener('input',event=>{setPair($(rangeId),$(numberId),outputId,unit,event.currentTarget);render()})}
  ['chargeEfficiency','dischargeEfficiency','minimumSoc','maximumSoc','initialSoc','weekStart'].forEach(id=>$(id).addEventListener('input',render));$('downloadCsv').addEventListener('click',download);
  render();
})();





