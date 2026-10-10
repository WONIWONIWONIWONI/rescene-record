(function(){
'use strict';
const root=document.getElementById('rescene-record'),$=id=>root.querySelector('#'+id),db=JSON.parse(document.getElementById('rr-data').textContent);
// Both charts use the visible ranks, with padding in the chosen scale.
root.rankAxis=function(values,limit,expanded,full=false){
const valid=values.filter(v=>Number.isFinite(v)&&v>0),scale=v=>expanded?Math.log(v):v,inverse=v=>expanded?Math.exp(v):v;
let lo=1,hi=Math.max(2,limit||100);
if(valid.length&&!full){const min=valid.reduce((a,v)=>Math.min(a,v),Infinity),max=valid.reduce((a,v)=>Math.max(a,v),-Infinity),padding=Math.max((scale(max)-scale(min))*.08,expanded?Math.log(1+2/min):2);lo=Math.max(1,Math.floor(inverse(scale(min)-padding)));hi=Math.min(Math.max(limit||100,max),Math.ceil(inverse(scale(max)+padding)));}
hi=Math.max(lo+1,hi);
const ticks=[...new Set(Array.from({length:6},(_,i)=>Math.round(inverse(scale(lo)+(scale(hi)-scale(lo))*i/5))))].filter(v=>v>=lo&&v<=hi);
return {lo,hi,scale,ticks};
};
const D=86400000,parse=s=>Date.parse(s+(s.length===10?'T00:00:00':'')+'+09:00'),debut=parse(db.manifest.debut);
const songs=db.manifest.songs,platforms=db.manifest.platforms||[{id:'melon',name:'멜론',charts:db.manifest.charts}],fallback=[['top100','TOP100','hour'],['hot100-d30','HOT100 · 30일','hour'],['hot100-d100','HOT100 · 100일','hour'],['daily','일간','day'],['weekly','주간','week'],['monthly','월간','month'],['yearly','연간','year']];
let platform='melon',types=fallback;
const platformName=()=>platforms.find(p=>p.id===platform).name;
function sourceTypes(){types=platforms.find(p=>p.id===platform).charts.map(k=>[k,db.charts[k].label,db.charts[k].unit||fallback.find(t=>t[0]===k)?.[2]]);}
sourceTypes();
const colors=['#0072b2','#e33243','#009e73','#8751c7','#ed8b00','#00a5b5','#d650a2','#889500','#99613d','#687787','#c2a000','#534ac4','#41a8dc','#c06c84','#a5b330'];
const hasEntry=(s,charts)=>charts.some(c=>Object.values(c.songs[s.id]||{}).some(p=>Number.isFinite(p.rank)&&p.rank>0)),melonCharts=platforms.find(p=>p.id==='melon').charts.map(k=>db.charts[k]),charted=[...songs.filter(s=>hasEntry(s,melonCharts)),...songs.filter(s=>!hasEntry(s,melonCharts)&&hasEntry(s,Object.values(db.charts)))];
const songColor=s=>colors[charted.findIndex(x=>x.id===s.id)]||'hsl('+((charted.findIndex(x=>x.id===s.id)*137.5)%360)+' 65% 42%)';
const color=s=>s.color;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>new Date(t+9*3600000).toISOString().slice(0,10).replaceAll('-','.');
const config=()=>types.find(x=>x[0]===state.type),dataset=()=>db.charts[state.type];
const recordLink=(s,type)=>db.charts[type].source+'/trend/ranking/'+(db.charts[type].sourceSongIds?.[s.id]||s.id);
const name=s=>songs.filter(x=>x.name===s.name&&Object.values(dataset().songs[x.id]||{}).some(p=>Number.isFinite(p.rank)&&p.rank>0)).length>1?s.name+' · '+s.album:s.name;
let state={type:'daily',tableType:'daily',period:'all',visible:new Set(songs.map(s=>s.id)),view:null},series=[],bounds=[],end;
const eligible=()=>songs.filter(s=>records(s).some(p=>p.t>=debut&&Number.isFinite(p.rank)&&p.rank>0));
const mobile=()=>$('rr-chart').getBoundingClientRect().width<500;
const defaultSpan=()=>((mobile()?{hour:2,day:30,week:180,month:365,year:3650}:{hour:7,day:90,week:365,month:730,year:3650})[config()[2]])*D;
let inspectPointer=null,lineGeometry={},touches=new Map(),lineGesture=null;
function setView(start,span){span=Math.max(Math.min(({hour:1,day:7,week:28,month:90,year:365}[config()[2]])*D,bounds[1]-bounds[0]),Math.min(span,bounds[1]-bounds[0]));start=Math.max(bounds[0],Math.min(start,bounds[1]-span));state.view=[start,start+span];}
function resetView(){setView(bounds[1]-defaultSpan(),defaultSpan());}
function viewLabel(){const v=state.view;$('rr-view-label').textContent=fmt(v[0])+' – '+fmt(v[1])+' · 화면 구간';}
function moveView(direction){const v=state.view,span=v[1]-v[0];setView(v[0]+span*.25*direction,span);draw();}
function zoomView(factor){const v=state.view,span=v[1]-v[0];setView((v[0]+v[1]-span*factor)/2,span*factor);draw();}
function renderTypes(){$('rr-tabs').innerHTML=types.map(c=>'<button type="button" data-chart="'+c[0]+'" aria-pressed="false">'+c[1]+'</button>').join('');$('rr-table-chart').innerHTML=types.map(c=>'<option value="'+c[0]+'">'+c[1]+'</option>').join('');$('rr-table-chart').value=state.tableType;}
renderTypes();
function records(s,type=state.type){return Object.entries(db.charts[type]?.songs[s.id]||{}).map(([time,p])=>({time,t:parse(time),...p})).filter(p=>!s.release||p.t>=parse(s.release.slice(0,10))).sort((a,b)=>a.t-b.t);}
function gaps(a,b){const unit=config()[2];if(unit==='month')return (new Date(b.t+9*3600000).getUTCFullYear()*12+new Date(b.t+9*3600000).getUTCMonth())-(new Date(a.t+9*3600000).getUTCFullYear()*12+new Date(a.t+9*3600000).getUTCMonth())>1;if(unit==='year')return b.t-a.t>367*D;return b.t-a.t>({hour:D/24,day:D,week:7*D}[unit])*1.01;}
function status(s,p,type=state.type,at=end){const data=db.charts[type];if(s.release&&at<parse(s.release.slice(0,10)))return '발매 전';if(p?.rank!=null)return p.rank+'위';if(type.startsWith('hot')&&s.release&&at-parse(s.release.slice(0,10))>Number(type.endsWith('d30')?30:100)*D)return '대상 기간 종료';return p?.status==='out'?data.snapshotLimit+'위 밖':'기록 없음';}
function renderTable(){const type=state.tableType,data=db.charts[type],c=types.find(x=>x[0]===type),latest=data?.latest?parse(data.latest):debut,start=state.period==='all'?debut:Math.max(debut,latest-Number(state.period)*D);
const rows=songs.map(song=>{const all=records(song,type),ranks=all.filter(p=>p.t>=start&&p.t<=latest&&Number.isFinite(p.rank)&&p.rank>0);return {song,all,best:ranks.length?ranks.reduce((best,p)=>Math.min(best,p.rank),Infinity):null};}).filter(s=>s.all.some(p=>p.t>=debut&&Number.isFinite(p.rank)&&p.rank>0)).sort((a,b)=>(a.best??Infinity)-(b.best??Infinity)||name(a.song).localeCompare(name(b.song),'ko'));
$('rr-table-title').textContent='곡별 기록 함께 보기 · '+platformName()+' '+c[1];$('rr-catalog-size').textContent=rows.length+'트랙';$('rr-table-chart').value=type;
$('rr-table-note').textContent=c[1]+' · '+fmt(start)+' – '+fmt(latest)+' · 최고 순위 순으로 정렬 · 기간은 상단 기간 선택 기준';
$('rr-history').innerHTML=rows.map(s=>'<tr data-record-song="'+s.song.id+'"><td><span class="rr-dot" style="background:'+songColor(s.song)+'"></span><a href="'+esc(recordLink(s.song,type))+'" target="_blank" rel="noopener">'+esc(s.song.name)+'</a><small class="rr-album">'+esc(s.song.album)+'</small></td><td>'+esc(status(s.song,s.all.find(p=>p.t===latest),type,latest))+'</td><td>'+(s.best==null?'—':s.best+'위')+'</td><td>'+(data?.historyFetched?.[s.song.id]?'공개 기록 확인':'기록 확인 대기')+'</td></tr>').join('');
if(!rows.length)$('rr-history').innerHTML='<tr><td colspan="4">이 차트에 확인된 진입곡이 없습니다.</td></tr>';
}
$('rr-table-chart').innerHTML=types.map(c=>'<option value="'+c[0]+'">'+c[1]+'</option>').join('');
$('rr-table-chart').onchange=()=>{state.tableType=$('rr-table-chart').value;renderTable();};
function render(){const focused=document.activeElement,focusSong=focused?.dataset?.song,focusPeriod=focused?.dataset?.period,scroll=$('rr-legend').scrollTop;const data=dataset(),c=config();end=data?.latest?parse(data.latest):parse(db.manifest.builtAt.slice(0,10));bounds=[state.period==='all'?debut:Math.max(debut,end-Number(state.period)*D),Math.max(debut+D,end)];series=eligible().map((s,i)=>({song:s,i,color:songColor(s),all:records(s),points:records(s).filter(p=>p.t>=bounds[0]&&p.t<=bounds[1]),latestPoint:records(s).find(p=>p.t===end)})).sort((a,b)=>(a.latestPoint?.rank??Infinity)-(b.latestPoint?.rank??Infinity)||name(a.song).localeCompare(name(b.song),'ko'));if(!state.view)resetView();
$('rr-platform-note').textContent=platformName()+' · '+types.map(t=>t[1]).join(' / ')+' · 출처 가이섬';
root.querySelectorAll('[data-chart]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chart===state.type)));
$('rr-period').innerHTML=[['all','데뷔일부터'],['365','최근 1년'],['90','90일'],['30','30일']].map(p=>'<button type="button" data-period="'+p[0]+'" aria-pressed="'+(state.period===p[0])+'">'+p[1]+'</button>').join('');
$('rr-chart-title').textContent=platformName()+' '+c[1]+' · 리센느 곡 함께 보기';$('rr-chart-sub').textContent=fmt(bounds[0])+' – '+fmt(end)+' · 최신 집계 '+((data?.latestSourceTime||data?.latest)?.replace('T',' ').slice(0,c[2]==='hour'?16:c[2]==='year'?4:c[2]==='month'?7:10)||'없음')+' KST';
$('rr-full-label').hidden=(data.limit||100)<=100;$('rr-full-text').textContent='1–'+Number(data.limit).toLocaleString('ko-KR')+'위 전체 눈금';$('rr-legend').innerHTML=series.map(({song:s,color,latestPoint:p})=>'<button type="button" data-song="'+s.id+'" data-latest-rank="'+(p?.rank??'')+'" title="최신 집계: '+esc(status(s,p))+'" aria-pressed="'+state.visible.has(s.id)+'" style="--song-color:'+color+'"><i style="background:'+color+'">'+(p?.rank!=null?p.rank+'위':p?.status==='out'?'밖':'—')+'</i><span class="rr-selected" aria-hidden="true">'+(state.visible.has(s.id)?'✓':'＋')+'</span>'+esc(name(s))+'</button>').join('');
$('rr-count').textContent=series.filter(s=>state.visible.has(s.song.id)).length+' / '+series.length+'곡 표시';
const fetched=Object.keys(data?.historyFetched||{}).length,failed=new Set((db.manifest.errors||[]).filter(e=>e.startsWith(state.type+'/')).map(e=>e.split('/')[1].split(':')[0]));
$('rr-table-note').textContent='최신 순위는 차트의 마지막 집계 기준 · 최고 순위는 선택 기간의 확인된 기록 기준';
$('rr-chart-note').innerHTML='출처: <a href="'+esc(data?.source||'https://xn--o39an51b2re.com')+'" target="_blank" rel="noopener">가이섬의 '+esc(platformName())+' '+esc(c[1])+' 기록</a> · 과거 기록 확인 '+fetched+'/'+(data.sourceSongIds?Object.keys(data.sourceSongIds).length:songs.filter(s=>s.id.match(/^\d+$/)).length)+'트랙. '+(state.type.startsWith('hot')?'HOT100은 발매일을 기준으로 대상 기간이 제한됩니다. ':'')+(state.type==='yearly'?'확정된 연간 차트만 표시합니다. ':'')+'주간·월간·연간 점은 집계 기간의 마지막 날짜에 표시합니다. 순위가 제공되지 않거나 수집되지 않은 구간은 연결하지 않습니다. 최신 표는 '+Number(data.snapshotLimit||data.limit).toLocaleString('ko-KR')+'위까지입니다.';
renderTable();
$('rr-detail').textContent='그래프를 가리키거나 터치하면 해당 시각에 확인된 곡별 순위를 비교할 수 있어요.';draw();if(focusSong)$('rr-legend').querySelector('[data-song="'+focusSong+'"]')?.focus?.({preventScroll:true});if(focusPeriod)$('rr-period').querySelector('[data-period="'+focusPeriod+'"]')?.focus?.({preventScroll:true});$('rr-legend').scrollTop=scroll;}
function draw(){$('rr-tooltip').hidden=true;const fixed100=state.type==='top100'||state.type.startsWith('hot100-')||(platform!=='melon'&&dataset().limit===100);const svg=$('rr-chart'),w=Math.max(220,svg.getBoundingClientRect().width||800),h=w<500?300:335,l=48,r=w<500?88:116,t=24,b=46;svg.setAttribute('viewBox','0 0 '+w+' '+h);const view=state.view;viewLabel();const active=series.filter(s=>state.visible.has(s.song.id)).map(s=>{const a=s.points;let first=a.findIndex(p=>p.t>=view[0]);if(first<0)first=a.length;let last=a.findIndex(p=>p.t>view[1]);if(last<0)last=a.length;return {...s,points:a.slice(Math.max(0,first-1),Math.min(a.length,last+1))};}),vals=active.flatMap(s=>{
const ranks=s.points.filter(p=>p.t>=view[0]&&p.t<=view[1]&&p.rank!=null).map(p=>p.rank);
// Include only the visible portion of a line crossing a viewport edge.
for(let i=1;i<s.points.length;i++){const a=s.points[i-1],b=s.points[i];if(a.rank==null||b.rank==null||gaps(a,b))continue;for(const edge of view)if(a.t<edge&&b.t>edge){const fraction=(edge-a.t)/(b.t-a.t);ranks.push($('rr-expand').checked?Math.exp(Math.log(a.rank)+(Math.log(b.rank)-Math.log(a.rank))*fraction):a.rank+(b.rank-a.rank)*fraction);}}
return ranks;
});
const expanded=$('rr-expand').checked,{lo,hi,scale,ticks:rankTicks}=root.rankAxis(vals,dataset().limit,expanded,$('rr-full').checked);svg.dataset.rankScale=expanded?'expanded':'linear';svg.dataset.rankMin=String(lo);svg.dataset.rankMax=String(hi);
const x=v=>l+(v-view[0])/(view[1]-view[0])*(w-l-r),y=v=>t+(scale(v)-scale(lo))/(scale(hi)-scale(lo))*(h-t-b);lineGeometry={l,r,w};svg.dataset.start=String(view[0]);svg.dataset.span=String(view[1]-view[0]);
let markup='<title>'+esc(config()[1])+' · 리센느 전곡 순위 추이</title><desc>순위가 낮을수록 위에 표시합니다. 제공되지 않은 시점은 연결하지 않습니다.</desc><text x="'+l+'" y="13" fill="var(--rr-muted)" font-size="11">순위 (위)</text>';
for(const v of rankTicks){const yy=y(v);markup+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--rr-line)"/><text x="'+(l-8)+'" y="'+(yy+4)+'" text-anchor="end" font-size="12" fill="var(--rr-muted)">'+v+'</text>';}
if((!fixed100||config()[2]!=='hour')&&lo<=100&&hi>=100)markup+='<line id="rr-top100-line" x1="'+l+'" x2="'+(w-r)+'" y1="'+y(100)+'" y2="'+y(100)+'" stroke="var(--rr-accent)" stroke-width="1" vector-effect="non-scaling-stroke"/><text x="'+(w-r-4)+'" y="'+(y(100)-6)+'" text-anchor="end" fill="var(--rr-accent)" font-size="12" font-weight="700">100위 진입선</text>';
if(!vals.length)markup+='<text x="'+w/2+'" y="150" text-anchor="middle" font-size="14" fill="var(--rr-muted)">'+(active.length?'이 기간에 확인된 차트 진입 기록이 없어요':'표시할 곡을 선택해 주세요')+'</text>';
markup+='<defs><clipPath id="rr-clip"><rect x="'+l+'" y="'+t+'" width="'+(w-l-r)+'" height="'+(h-t-b)+'"/></clipPath></defs><g clip-path="url(#rr-clip)">';

for(const s of active){let path='',previous=null,isolated=[];const points=s.points;for(let i=0;i<points.length;i++){const p=points[i];if(p.rank==null){previous=null;continue;}const joined=previous&&!gaps(previous,p);path+=(joined?' L':' M')+x(p.t).toFixed(1)+','+y(p.rank).toFixed(1);if(!joined&&(!points[i+1]||points[i+1].rank==null||gaps(p,points[i+1])))isolated.push(p);previous=p;}
markup+='<path data-series="'+s.song.id+'" d="'+path+'" fill="none" stroke="'+color(s)+'" stroke-width="1.1" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>';for(const p of isolated)markup+='<circle cx="'+x(p.t)+'" cy="'+y(p.rank)+'" r="2" fill="'+color(s)+'"/>';}
markup+='</g>';const ticks=w<460?3:5;for(let i=0;i<ticks;i++){const dt=view[0]+(view[1]-view[0])*i/(ticks-1);markup+='<text x="'+x(dt)+'" y="'+(h-20)+'" text-anchor="'+(i===0?'start':i===ticks-1?'end':'middle')+'" font-size="11" fill="var(--rr-muted)">'+(config()[2]==='hour'&&view[1]-view[0]<=7*D?fmt(dt).slice(5)+' '+new Date(dt+9*3600000).toISOString().slice(11,16):(w<460?(view[1]-view[0]<180*D?fmt(dt).slice(5):fmt(dt).slice(0,7)):fmt(dt)))+'</text>';}
svg.innerHTML=markup+'<g id="rr-markers"></g><line id="rr-guide" x1="0" x2="0" y1="'+t+'" y2="'+(h-b)+'" stroke="var(--rr-muted)" visibility="hidden"/>';
const times=[...new Set(active.flatMap(s=>s.points.filter(p=>p.t>=view[0]&&p.t<=view[1]).map(p=>p.t)))].sort((a,b)=>a-b);
function inspect(e){if(!times.length)return;const xx=Math.max(l,Math.min(w-r,e.clientX-svg.getBoundingClientRect().left)),dt=view[0]+(xx-l)/(w-l-r)*(view[1]-view[0]);let low=0,high=times.length;while(low<high){let m=(low+high)>>1;if(times[m]<dt)low=m+1;else high=m;}const stamp=low===0?times[0]:low===times.length?times.at(-1):(dt-times[low-1]<times[low]-dt?times[low-1]:times[low]);const guide=$('rr-guide');guide.setAttribute('x1',x(stamp));guide.setAttribute('x2',x(stamp));guide.setAttribute('visibility','visible');const rows=active.map(s=>({s,p:s.points.find(p=>p.t===stamp)})).sort((a,b)=>(a.p?.rank??Infinity)-(b.p?.rank??Infinity));const label=fmt(stamp)+(config()[2]==='hour'?' '+new Date(stamp+9*3600000).toISOString().slice(11,16):'')+' KST';
const ranked=rows.filter(r=>r.p?.rank!=null),nearest=ranked.reduce((best,row)=>!best||Math.abs(y(row.p.rank)-(e.clientY-svg.getBoundingClientRect().top))<Math.abs(y(best.p.rank)-(e.clientY-svg.getBoundingClientRect().top))?row:best,null);
$('rr-markers').innerHTML=ranked.map(row=>'<circle cx="'+x(stamp)+'" cy="'+y(row.p.rank)+'" r="3" fill="'+color(row.s)+'"/>').join('')+(nearest?'<line data-rank-guide="true" x1="'+l+'" x2="'+x(stamp)+'" y1="'+y(nearest.p.rank)+'" y2="'+y(nearest.p.rank)+'" stroke="'+color(nearest.s)+'" stroke-dasharray="4 3"/><rect x="0" y="'+(y(nearest.p.rank)-10)+'" width="44" height="20" rx="3" fill="'+color(nearest.s)+'"/><text x="22" y="'+(y(nearest.p.rank)+4)+'" text-anchor="middle" font-size="11" fill="white">'+nearest.p.rank+'위</text>':'');
const tip=$('rr-tooltip');tip.innerHTML='<strong>'+esc(config()[1])+' · '+label+'</strong>'+rows.map(({s,p})=>'<div class="rr-tip-row" data-tip-song="'+s.song.id+'"><span><i class="rr-dot" style="background:'+color(s)+'"></i>'+esc(name(s.song))+'</span><b>'+esc(status(s.song,p,state.type,stamp))+'</b></div>').join('');tip.hidden=false;
$('rr-detail').textContent=label+' · '+rows.filter(r=>r.p?.rank!=null).length+'곡의 순위 확인';}

inspectPointer=inspect;
const labels=active.map(s=>({s,p:s.points.filter(p=>p.t<=view[1]&&p.t>=view[0]&&p.rank!=null).at(-1)})).filter(a=>a.p).sort((a,b)=>a.p.rank-b.p.rank);let previous=t-17;const positions=labels.map(a=>{const yy=Math.max(y(a.p.rank),previous+17);previous=yy;return yy;});for(let i=positions.length-1;i>=0;i--)positions[i]=Math.min(positions[i],i===positions.length-1?h-b:positions[i+1]-17);
svg.innerHTML+='<g id="rr-end-labels">'+labels.map((a,i)=>'<line x1="'+x(a.p.t)+'" x2="'+(w-r+5)+'" y1="'+y(a.p.rank)+'" y2="'+positions[i]+'" stroke="'+color(a.s)+'" stroke-width=".7" opacity=".5"/><text x="'+(w-r+7)+'" y="'+(positions[i]+3)+'" font-size="'+(w<500?9:11)+'" fill="'+color(a.s)+'">'+a.p.rank+'위 '+esc(a.s.song.name.length>12?a.s.song.name.slice(0,11)+'…':a.s.song.name)+'</text>').join('')+'</g>';
}
const lineSvg=$('rr-chart');
function beginLine(){const pts=[...touches.values()],v=state.view,g=lineGeometry,rect=lineSvg.getBoundingClientRect();if(pts.length===1)lineGesture={kind:'drag',x:pts[0].x,y:pts[0].y,start:v[0],span:v[1]-v[0]};else if(pts.length===2)lineGesture={kind:'pinch',distance:Math.max(1,Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y)),anchor:((pts[0].x+pts[1].x)/2-rect.left-g.l)/(g.w-g.l-g.r),start:v[0],span:v[1]-v[0]};}
lineSvg.onpointerdown=e=>{inspectPointer?.(e);if(e.pointerId==null)return;e.preventDefault();touches.set(e.pointerId,{x:e.clientX,y:e.clientY});lineSvg.setPointerCapture?.(e.pointerId);beginLine();};
lineSvg.onpointermove=e=>{if(!touches.has(e.pointerId)){inspectPointer?.(e);return;}e.preventDefault();touches.set(e.pointerId,{x:e.clientX,y:e.clientY});const pts=[...touches.values()],g=lineGeometry,pw=g.w-g.l-g.r;if(pts.length===1&&lineGesture?.kind==='drag'){if(Math.hypot(e.clientX-lineGesture.x,e.clientY-lineGesture.y)<5)return;setView(lineGesture.start-(e.clientX-lineGesture.x)/pw*lineGesture.span,lineGesture.span);draw();}else if(pts.length===2&&lineGesture?.kind==='pinch'){const d=Math.max(1,Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y)),rect=lineSvg.getBoundingClientRect(),center=((pts[0].x+pts[1].x)/2-rect.left-g.l)/pw,next=lineGesture.span*lineGesture.distance/d;setView(lineGesture.start+lineGesture.anchor*lineGesture.span-center*next,next);draw();}};
lineSvg.onpointerup=e=>{const tap=lineGesture?.kind==='drag'&&Math.hypot(e.clientX-lineGesture.x,e.clientY-lineGesture.y)<5;touches.delete(e.pointerId);lineSvg.releasePointerCapture?.(e.pointerId);if(touches.size)beginLine();else lineGesture=null;if(tap)inspectPointer?.(e);};lineSvg.onpointercancel=e=>{touches.delete(e.pointerId);lineGesture=null;};
lineSvg.onpointerleave=e=>{if(touches.size||e?.pointerType==='touch')return;$('rr-tooltip').hidden=true;$('rr-guide')?.setAttribute('visibility','hidden');if($('rr-markers'))$('rr-markers').innerHTML='';};
$('rr-tabs').onclick=e=>{const b=e.target.closest('[data-chart]');if(b){state.type=b.dataset.chart;state.view=null;render();}};
$('rr-period').onclick=e=>{const b=e.target.closest('[data-period]');if(b){state.period=b.dataset.period;state.view=null;render();}};
$('rr-legend').onclick=e=>{const b=e.target.closest('[data-song]');if(b){const id=b.dataset.song;state.visible.has(id)?state.visible.delete(id):state.visible.add(id);render();}};
$('rr-hide-all').onclick=()=>{for(const s of eligible())state.visible.delete(s.id);render();};
$('rr-left').onclick=()=>moveView(-1);$('rr-right').onclick=()=>moveView(1);$('rr-zoom-in').onclick=()=>zoomView(.7);$('rr-zoom-out').onclick=()=>zoomView(1/.7);
$('rr-reset-view').onclick=()=>{resetView();draw();};$('rr-fit-view').onclick=()=>{setView(bounds[0],bounds[1]-bounds[0]);draw();};
$('rr-chart').addEventListener('wheel',e=>{e.preventDefault();const v=state.view,span=v[1]-v[0],delta=e.deltaY||e.deltaX;if(!delta)return;if(e.ctrlKey){const rect=$('rr-chart').getBoundingClientRect(),at=Math.max(0,Math.min(1,(e.clientX-rect.left-48)/Math.max(1,rect.width-lineGeometry.l-lineGeometry.r))),next=span*Math.exp(Math.max(-1,Math.min(1,delta*.003)));setView(v[0]+span*at-next*at,next);}else setView(v[0]+Math.sign(e.deltaY?-e.deltaY:e.deltaX)*span*.12,span);draw();},{passive:false});
$('rr-show-all').onclick=()=>{state.visible=new Set(songs.map(s=>s.id));render();};$('rr-full').onchange=draw;$('rr-expand').onchange=draw;
$('rr-platform').innerHTML=platforms.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('');$('rr-platform').value=platform;
$('rr-platform').onchange=()=>{platform=$('rr-platform').value;sourceTypes();state.type=types.find(t=>t[2]==='day')?.[0]||types[0][0];state.tableType=state.type;state.view=null;touches.clear();lineGesture=null;$('rr-full').checked=false;renderTypes();render();root.dispatchEvent(new window.Event('rr-platform-change'));};
render();if(typeof ResizeObserver!=='undefined')new ResizeObserver(draw).observe($('rr-chart'));
})();
