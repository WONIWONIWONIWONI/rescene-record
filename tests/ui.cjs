const {parseHTML}=require('linkedom');const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');const {document,window}=parseHTML(html);let width=900;
window.HTMLElement.prototype.getBoundingClientRect=window.SVGElement.prototype.getBoundingClientRect=function(){return {width,left:0};};
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return Array.from(this.children).find(o=>o.hasAttribute('selected'))?.getAttribute('value')||this.children[0]?.getAttribute('value');},set(v){for(const o of this.children)o.getAttribute('value')===v?o.setAttribute('selected',''):o.removeAttribute('selected');}});
document.getElementById('rr-data').textContent=require('node:zlib').gunzipSync(Buffer.from(document.getElementById('rr-data').textContent,'base64')).toString();
const db=JSON.parse(document.getElementById('rr-data').textContent),$=id=>document.getElementById(id);vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),vm.createContext({document,window,console,Date,Set,Math,Number,JSON,ResizeObserver:class{observe(){}}}));
for(const b of $('rr-tabs').children){$('rr-tabs').onclick({target:b});$('rr-table-chart').value=b.dataset.chart;$('rr-table-chart').onchange();const chart=db.charts[b.dataset.chart],eligible=db.manifest.songs.filter(s=>Object.entries(chart.songs[s.id]||{}).some(([t,p])=>t>=db.manifest.debut&&(!s.release||t>=s.release.slice(0,10))&&Number.isFinite(p.rank)&&p.rank>0));assert.equal($('rr-legend').children.length,eligible.length);assert.equal($('rr-history').querySelectorAll('[data-record-song]').length,eligible.length);assert.deepEqual(Array.from($('rr-legend').children,b=>b.dataset.song).sort(),eligible.map(s=>s.id).sort());const parse=t=>Date.parse(t+(t.length===10?'T00:00:00':'')+'+09:00');let previous=-Infinity;for(const item of $('rr-legend').children){const current=Object.entries(chart.songs[item.dataset.song]||{}).find(([t])=>parse(t)===parse(chart.latest))?.[1],rank=current?.rank??Infinity;assert.ok(rank>=previous);previous=rank;if(Number.isFinite(rank))assert.equal(item.querySelector('i').textContent,rank+'위');}assert.ok(!/NaN|Infinity|undefined/.test($('rr-chart').innerHTML));}
$('rr-tabs').onclick({target:$('rr-tabs').querySelector('[data-chart="daily"]')});$('rr-table-chart').value='daily';$('rr-table-chart').onchange();assert.match($('rr-chart-sub').textContent,/2024.03.26/);assert.doesNotMatch($('rr-view-label').textContent,/2024.03.26/);
const song=$('rr-legend').children[0];$('rr-legend').onclick({target:song});assert.equal($('rr-legend').children[0].getAttribute('aria-pressed'),'false');assert.match($('rr-legend').children[0].textContent,/＋/);$('rr-show-all').onclick();assert.match($('rr-legend').children[0].textContent,/✓/);
const colors=Array.from($('rr-legend').children,b=>b.querySelector('i').getAttribute('style'));assert.equal(new Set(colors).size,colors.length);
$('rr-hide-all').onclick();assert.equal($('rr-chart').querySelectorAll('path').length,0);$('rr-show-all').onclick();assert.ok($('rr-chart').querySelectorAll('path').length>0);
const wheel=(delta,ctrl=false)=>$('rr-chart').dispatchEvent(Object.assign(new window.Event('wheel',{cancelable:true}),{deltaY:delta,deltaX:0,ctrlKey:ctrl,clientX:450}));
const recent=$('rr-view-label').textContent;wheel(-100);assert.notEqual($('rr-view-label').textContent,recent);const moved=$('rr-view-label').textContent;wheel(-200,true);assert.notEqual($('rr-view-label').textContent,moved);$('rr-fit-view').onclick();assert.match($('rr-view-label').textContent,/2024.03.26/);wheel(-100);assert.match($('rr-view-label').textContent,/2024.03.26/);$('rr-reset-view').onclick();assert.equal($('rr-view-label').textContent,recent);
$('rr-period').onclick({target:$('rr-period').querySelector('[data-period="30"]')});$('rr-full').checked=true;$('rr-full').onchange();assert.match($('rr-chart').innerHTML,/1000/);
width=320;$('rr-full').onchange();assert.match($('rr-chart').getAttribute('viewBox'),/320/);assert.ok(!/NaN|Infinity/.test($('rr-chart').innerHTML));$('rr-chart').onpointerdown?.({clientX:160});assert.match($('rr-detail').textContent,/KST/);
console.log('UI: chart entry filtering, unique colors, selection, wheel pan/zoom, bounds, period reset and mobile inspection pass');

assert.equal($('rr-tooltip').hidden,false);const stamp=$('rr-tooltip').querySelector('strong').textContent.match(/\d{4}\.\d{2}\.\d{2}/)[0].replaceAll('.','-');for(const row of $('rr-tooltip').querySelectorAll('[data-tip-song]')){const point=db.charts.daily.songs[row.dataset.tipSong]?.[stamp];if(point?.rank!=null)assert.equal(row.querySelector('b').textContent,point.rank+'위');}assert.match($('rr-tooltip').textContent,/KST/);assert.ok($('rr-tooltip').querySelectorAll('.rr-tip-row').length>0);assert.ok(Array.from($('rr-chart').querySelectorAll('path')).every(p=>p.getAttribute('stroke-width')==='1.1'));$('rr-chart').onpointerleave();assert.equal($('rr-tooltip').hidden,true);
const chartTitle=$('rr-chart-title').textContent;$('rr-table-chart').value='top100';$('rr-table-chart').onchange();assert.equal($('rr-chart-title').textContent,chartTitle);assert.match($('rr-table-title').textContent,/TOP100/);
for(const option of $('rr-table-chart').children){$('rr-table-chart').value=option.getAttribute('value');$('rr-table-chart').onchange();const best=Array.from($('rr-history').querySelectorAll('[data-record-song]'),tr=>Number(tr.children[2].textContent.replace('위',''))||Infinity);assert.deepEqual(best,[...best].sort((a,b)=>a-b));}
console.log('UI: thin lines, timestamp tooltip, independent table chart selection and peak ordering pass');

$('rr-full').checked=false;
for(const type of ['top100','hot100-d30','hot100-d100']){
 $('rr-tabs').onclick({target:$('rr-tabs').querySelector('[data-chart="'+type+'"]')});
 assert.ok(Number($('rr-chart').dataset.rankMin)>=1);assert.ok(Number($('rr-chart').dataset.rankMax)<=100);
 $('rr-hide-all').onclick();assert.equal($('rr-chart').dataset.rankMin,'1');assert.equal($('rr-chart').dataset.rankMax,'100');$('rr-show-all').onclick();
}
function assertThreshold(svg,id){const lo=Number(svg.dataset.rankMin),hi=Number(svg.dataset.rankMax),line=$(id);if(line){assert.ok(lo<=100&&hi>=100);assert.equal(line.getAttribute('stroke-width'),'1');const y=Number(line.getAttribute('y1'));assert.ok(Number.isFinite(y)&&y>=0);}}
for(const type of ['daily','weekly','monthly','yearly']){$('rr-tabs').onclick({target:$('rr-tabs').querySelector('[data-chart="'+type+'"]')});assertThreshold($('rr-chart'),'rr-top100-line');}
const axis=document.getElementById('rescene-record').rankAxis;
for(const expanded of [false,true]){
 for(const ranks of [[2,4,6],[53,55,57],[498,500,502],[100],[1],[1000]]){const a=axis(ranks,1000,expanded);assert.ok(a.lo<=Math.min(...ranks));assert.ok(a.hi>=Math.max(...ranks));assert.ok(a.hi>a.lo);assert.ok(a.ticks.length>=2&&a.ticks.every(v=>v>=a.lo&&v<=a.hi));if(ranks.length>1)assert.ok(a.hi-a.lo<30);}
 const empty=axis([],100,expanded);assert.equal(empty.lo,1);assert.equal(empty.hi,100);
 const full=axis([500],1000,expanded,true);assert.equal(full.lo,1);assert.equal(full.hi,1000);
}
console.log('Adaptive axes: narrow high/low ranks, single values, limits, empty fallback and optional full range pass');

vm.runInContext(fs.readFileSync(path.join(root,'mts.js'),'utf8'),vm.createContext({document,window,console,Date,Set,Map,Math,Number,JSON,ResizeObserver:class{observe(){}}}));
const candle=$('mts-chart');assert.equal($('rr-legend').hidden,false);assert.equal($('rr-mode'),null);
for(const [type,label] of [['top100','時間봉'],['daily','일봉'],['weekly','주봉'],['monthly','월봉'],['yearly','연봉']]){$('mts-type').value=type;$('mts-type').onchange();assert.equal($('mts-unit').textContent,type==='top100'?'시간봉':label);for(const bar of candle.querySelectorAll('[data-bar-time]'))assert.equal(Number(bar.dataset.rank),db.charts[type].songs[$('mts-song').value][bar.dataset.barTime].rank);assert.ok(!/NaN|Infinity|undefined/.test(candle.innerHTML));}
$('mts-type').value='daily';$('mts-type').onchange();$('mts-song').value='37928381';$('mts-song').onchange();const oldTitle=$('rr-chart-title').textContent;assert.equal(oldTitle,$('rr-chart-title').textContent);const before=Number(candle.dataset.start);candle.dispatchEvent(Object.assign(new window.Event('wheel',{cancelable:true}),{deltaY:-100,ctrlKey:false}));assert.ok(Number(candle.dataset.start)<before);
const spanBefore=Number(candle.dataset.span);candle.dispatchEvent(Object.assign(new window.Event('wheel',{cancelable:true}),{deltaY:-100,ctrlKey:true,clientX:100}));assert.ok(Number(candle.dataset.span)<spanBefore);
const event=(id,x,y=100)=>({pointerId:id,clientX:x,clientY:y,button:0,preventDefault(){}});candle.onpointerdown(event(1,100));const dragStart=Number(candle.dataset.start);candle.onpointermove(event(1,130));assert.ok(Number(candle.dataset.start)<dragStart);candle.onpointerup(event(1,130));candle.onpointerdown(event(1,80,90));candle.onpointerdown(event(2,180,110));const pinchBefore=Number(candle.dataset.span);candle.onpointermove(event(2,250,150));assert.ok(Number(candle.dataset.span)<pinchBefore);candle.onpointerup(event(2,250,150));candle.onpointerup(event(1,80,90));console.log('MTS: separate controls, exact native-period ranks, wheel, drag and 2D pinch pass');

$('mts-type').value='top100';$('mts-type').onchange();$('mts-song').value='601719493';$('mts-song').onchange();let changes=0;for(const bar of candle.querySelectorAll('[data-bar-time]')){const time=bar.dataset.barTime,previousTime=new Date(Date.parse(time+'+09:00')-3600000+9*3600000).toISOString().slice(0,19),raw=db.charts.top100.songs['601719493'],open=raw[previousTime]?.rank??null;assert.equal(bar.dataset.open,open==null?'':String(open));assert.equal(Number(bar.dataset.close),raw[time].rank);if(open!=null&&open!==raw[time].rank){assert.ok(Number(bar.getAttribute('height'))>2.4);assert.equal(bar.getAttribute('fill'),raw[time].rank<open?'#ff5470':'#49a3ff');changes++;}}assert.ok(changes>0);candle.onpointermove(event(0,150));assert.match($('mts-tooltip').textContent,/시가.*종가/);console.log('MTS: previous-hour open, current close, candle body direction and tooltip verified');
const line=$('rr-chart');$('rr-tabs').onclick({target:$('rr-tabs').querySelector('[data-chart="daily"]')});const lineSpan=Number(line.dataset.span);line.onpointerdown(event(21,80,90));line.onpointerdown(event(22,150,110));line.onpointermove(event(22,230,150));assert.ok(Number(line.dataset.span)<lineSpan);line.onpointerup(event(22,230,150));line.onpointerup(event(21,80,90));line.onpointermove({clientX:130,clientY:100});assert.ok($('rr-end-labels').querySelectorAll('text').length>0);assert.ok($('rr-markers').querySelector('[data-rank-guide]'));console.log('Line chart: pinch changes range, right song labels and left rank guide pass');
$('rr-expand').checked=true;$('rr-expand').onchange();assert.equal(line.dataset.rankScale,'expanded');$('rr-expand').checked=false;$('rr-expand').onchange();assert.equal(line.dataset.rankScale,'linear');console.log('Rank scale: adaptive expanded and linear modes pass');

for(const platform of db.manifest.platforms||[]){
 $('rr-platform').value=platform.id;$('rr-platform').onchange();
 assert.deepEqual(Array.from($('rr-tabs').children,b=>b.dataset.chart),platform.charts);
 assert.deepEqual(Array.from($('rr-table-chart').children,o=>o.getAttribute('value')),platform.charts);
 assert.deepEqual(Array.from($('mts-type').children,o=>o.getAttribute('value')),platform.charts);
 for(const key of platform.charts){
  const c=db.charts[key];$('rr-tabs').onclick({target:$('rr-tabs').querySelector('[data-chart="'+key+'"]')});
  $('rr-table-chart').value=key;$('rr-table-chart').onchange();$('mts-type').value=key;$('mts-type').onchange();
  const eligible=db.manifest.songs.filter(s=>Object.entries(c.songs[s.id]||{}).some(([time,p])=>time>=db.manifest.debut&&(!s.release||time>=s.release.slice(0,10))&&p.rank!=null));
  assert.deepEqual(Array.from($('rr-legend').children,b=>b.dataset.song).sort(),eligible.map(s=>s.id).sort());
  assert.deepEqual(Array.from($('rr-history').querySelectorAll('[data-record-song]'),r=>r.dataset.recordSong).sort(),eligible.map(s=>s.id).sort());
  assert.equal($('mts-unit').textContent,({hour:'시간봉',day:'일봉',week:'주봉',month:'월봉',year:'연봉'})[c.unit]);
  assert.match($('rr-chart-note').textContent,/가이섬/);assert.ok($('rr-chart-note').textContent.includes(platform.name));
  assert.ok(!/NaN|Infinity|undefined/.test($('rr-chart').innerHTML+candle.innerHTML));
  for(const bar of candle.querySelectorAll('[data-bar-time]'))assert.equal(Number(bar.dataset.close),c.songs[$('mts-song').value][bar.dataset.barTime].rank);
  assertThreshold($('rr-chart'),'rr-top100-line');assertThreshold(candle,'mts-top100-line');const lo=Number(candle.dataset.rankMin),hi=Number(candle.dataset.rankMax);for(const bar of candle.querySelectorAll('[data-bar-time]')){for(const value of [bar.dataset.close,bar.dataset.open].filter(Boolean)){assert.ok(Number(value)>=lo&&Number(value)<=hi);}}
 }
}
console.log('All platforms: chart options, source labels, entry filtering, exact candles, adaptive axes and thin in-range 100-rank lines pass');
