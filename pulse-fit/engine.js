/* PULSE FIT: pure recommendation and collection calculations. */
(function (root) {
  'use strict';
  const catalog = [
    { id:'standard', name:'Standard', ko:'스탠다드', price:20800, units:1, cards:3, cd:true, book:true, source:'https://www.yes24.com/product/goods/198002369', tag:'큰 포토북 · CD', contents:['포토북 230 × 300mm 1권','개인 포카 10종 중 2장','유닛 포카 5종 중 1장','접지 포스터 1장 · CD-R · CD 봉투','필름 포토 10종 중 1장'], note:'개인 포카와 유닛 포카는 서로 다른 수집 풀입니다.' },
    { id:'limited', name:'Limited', ko:'리미티드', price:26000, units:1, cards:2, cd:true, book:true, source:'https://www.yes24.com/product/goods/198002637', tag:'소장 · 포토북 · CD', contents:['포토북 182 × 257mm 1권','포카 10종 중 2장','포스터 355 × 245mm 1장','CD-R 1장','럭키 메시지 카드 5종 중 1장'], note:'포토북 페이지 수와 Standard와의 사진 중복 여부는 공개 사양으로 확인되지 않습니다.' },
    { id:'qr', name:'QR', ko:'QR 단품', price:8900, units:1, cards:5, cd:false, book:false, source:'https://www.ktown4u.com/iteminfo?goods_no=170534', tag:'포카 · 작은 패키지', contents:['5가지 패키지 중 1종 랜덤','QR 카드 / 이용 안내 1장','공통 셀피 포카 15종 중 3장','해당 버전 포카 4종 중 2장','버전별 이미지 카드 1장 · ID 포토 1장'], note:'단품의 패키지는 기본적으로 랜덤입니다. 최애 버전 선택 가능 여부는 판매처에서 확인하세요.' },
    { id:'qrset', name:'QR 5종 세트', ko:'QR 5종 세트', price:44500, units:5, cards:25, cd:false, book:false, source:'https://www.yes24.com/product/goods/198003095', tag:'패키지 5종 · 포카 25장', contents:['QR 패키지 5종 각 1개','공통 셀피 포카 총 15장 (중복 가능)','버전별 포카 총 10장 (각 버전 2장)','QR 카드 5장','이미지 카드 5장 · ID 포토 5장'], note:'다섯 패키지가 다른 세트입니다. 랜덤 포카의 도안 중복을 없애 주는 세트는 아닙니다.' },
    { id:'wappen', name:'Wappen', ko:'와펜', price:11100, units:1, cards:1, cd:false, book:false, source:'https://www.yes24.com/product/goods/198003383', tag:'와펜 · 굿즈 소장', contents:['와펜 90 × 58mm 1개','포카 5종 중 1장'], note:'공개 구성에는 CD와 QR 음원 카드가 없습니다. 초동 반영은 상품별 확인이 필요해 기본 집계 계산에서 제외합니다.' }
  ];
  const defaultPrices = Object.fromEntries(catalog.map(p=>[p.id,p.price]));
  // Seven complete-bundle offers from the user's 2026-10-13 guide. Single option verified at MAKESTAR.
  const pobOffers=[
    {id:'baemin-limited',seller:'배민',name:'Limited 5개 세트',gift:'중복 없는 미공포',price:130000,products:{limited:5},complete:true,verified:false,source:'https://www.baemin.com/',channel:'배민 앱에서 PULSE 검색'},
    {id:'cu-qr',seller:'CU',name:'QR 5종 세트',gift:'중복 없는 미공포',price:44500,products:{qrset:1},complete:true,verified:false,source:'https://cu.bgfretail.com/',channel:'포켓CU 앱에서 예약 상품 확인'},
    {id:'cu-wappen',seller:'CU',name:'Wappen 2개 세트',gift:'중복 없는 미공포 · 유닛',price:22200,products:{wappen:2},complete:true,verified:false,source:'https://cu.bgfretail.com/',channel:'포켓CU 앱에서 예약 상품 확인'},
    {id:'makestar-yarn',seller:'메이크스타',name:'Standard 5개 세트',gift:'중복 없는 털실냥이 미공포',price:104000,products:{standard:5},complete:true,verified:true,source:'https://www.makestar.com/product/21195',channel:'한 주문에서 5개 구매 · 11/02 23:59 KST까지'},
    {id:'makestar-bite',seller:'메이크스타',name:'Standard 5개 · 쇼케이스',gift:'중복 없는 한입만 미공포',price:104000,products:{standard:5},complete:true,verified:false,source:'https://www.makestar.com/product/21196',channel:'쇼케이스 상품 · 10/16 23:59 KST 마감 안내'},
    {id:'whosfan-wappen',seller:'후즈팬',name:'Wappen 5개 세트',gift:'중복 없는 미공포 · 개인',price:55500,products:{wappen:5},complete:true,verified:false,source:'https://whosfanstore.com/products/%EC%98%88%ED%8C%90-%ED%8A%B9%EC%A0%84-%EC%A6%9D%EC%A0%95-%EC%9D%B4%EB%B2%A4%ED%8A%B8-rescene-4th-mini-album-pulse-wappen-ver',channel:'예판 특전 이벤트 상품'},
    {id:'whosfan-showcase',seller:'후즈팬',name:'Standard 5개 · 쇼케이스',gift:'중복 없는 미공포',price:104000,products:{standard:5},complete:true,verified:false,source:'https://whosfanstore.com/products/1103-%EC%87%BC%EC%BC%80%EC%9D%B4%EC%8A%A4-rescene%EB%A6%AC%EC%84%BC%EB%8A%90-the-4th-mini-album-pulse-standard-ver',channel:'쇼케이스 전용 이벤트 상품'},
    {id:'makestar-single',seller:'메이크스타',name:'Standard 단품',gift:'털실냥이 미공포 5종 중 랜덤 1장',price:20800,products:{standard:1},complete:false,verified:true,source:'https://www.makestar.com/product/21195',channel:'특전 1장만 필요할 때 · 전종 보장 없음'}
  ];
  function productCounts(products){return {s:products.standard||0,l:products.limited||0,q:(products.qr||0)+5*(products.qrset||0),w:products.wappen||0};}
  function choose(n,k) { if(k<0||k>n)return 0; let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return v; }
  const probabilityCache = new Map();
  function completion(n,k,packs) {
    const key=n+':'+k+':'+packs; if(probabilityCache.has(key))return probabilityCache.get(key);
    let p=Array(n+1).fill(0);p[0]=1;const denominator=choose(n,k);
    for(let draw=0;draw<packs;draw++) {const next=Array(n+1).fill(0);for(let seen=0;seen<=n;seen++)if(p[seen]>0)for(let add=0;add<=k;add++)if(seen+add<=n)next[seen+add]+=p[seen]*choose(n-seen,add)*choose(seen,k-add)/denominator;p=next;}
    const value=Math.max(0,Math.min(1,p[n]));probabilityCache.set(key,value);return value;
  }
  function expected(n,k,packs){return n*(1-Math.pow(1-k/n,packs));}
  function n90(n,k){for(let i=0;i<150;i++)if(completion(n,k,i)>=0.9)return i;return 150;}
  function requirements(scope,trade) {
    let r={s:0,l:0,q:0,w:0}; const random=trade==='no';
    if(scope==='standard'||scope==='all')r.s=random?Math.max(n90(10,2),n90(5,1)):5;
    if(scope==='limited'||scope==='all')r.l=random?n90(10,2):5;
    if(scope==='qr'||scope==='all')r.q=random?5*Math.max(Math.ceil(n90(15,3)/5),n90(4,2)):10;
    if(scope==='wappen'||scope==='all')r.w=random?n90(5,1):5;
    return r;
  }
  function qrSplit(q,prices,forceSets=false){
    let best={qr:q,qrset:0,cost:q*prices.qr};
    for(let sets=1;sets<=Math.floor(q/5);sets++){const singles=q-sets*5,cost=sets*prices.qrset+singles*prices.qr;if(forceSets||cost<=best.cost)best={qr:singles,qrset:sets,cost};}
    return best;
  }
  function metrics(c,prices,shipping=0,forceSets=false){
    const split=qrSplit(c.q,prices,forceSets);
    const products={standard:c.s,limited:c.l,qr:split.qr,qrset:split.qrset,wappen:c.w};
    return {products,total:c.s*prices.standard+c.l*prices.limited+c.w*prices.wappen+split.cost,shipping,units:c.s+c.l+c.q+c.w,chart:c.s+c.l+c.q,cards:c.s*3+c.l*2+c.q*5+c.w,books:c.s+c.l,qrsets:split.qrset,counts:c};
  }
  function profile(a){
    if(a.goal==='chart')return {grade:'V',name:'초동 응원형',line:'한정된 예산으로 더 많은 집계 가능 앨범을.',color:'coral'};
    if(a.collect==='complete')return {grade:'IV',name:'컬렉션 설계형',line:'중복까지 계획하고, 원하는 포카 풀을 완성하기.',color:'purple'};
    if(a.goal==='cards'||a.collect==='member')return {grade:'III',name:'포카 집중형',line:'앨범보다 손에 남는 포카가 더 중요해요.',color:'blue'};
    if(a.goal==='book'||a.goal==='object')return {grade:'II',name:'실물 소장형',line:'오래 보고, 펼쳐 보고, 곁에 두는 한 장.',color:'green'};
    return {grade:'I',name:'균형 탐색형',line:'지금 내 취향에 맞는 만큼, 가볍게 시작해요.',color:'gold'};
  }
  function optimize(a,prices,shipping=0){
    const initial=a.initialCounts||{s:0,l:0,q:0,w:0};
    const initialUnits=initial.s+initial.l+initial.q+initial.w;
    const budget=a.budgetUnlimited?Infinity:Math.max(0,a.budget-shipping),cap=Math.max(0,Math.min(100,Math.max(1,a.cap))-initialUnits);
    const forceSets=a.collect==='complete'&&(a.scope==='qr'||a.scope==='all');
    const scope=a.collect==='complete'?a.scope:'none';
    const weights={book:[100,85,15,10],cards:[32,24,80,15],object:[65,90,22,65],balanced:[75,58,42,32],chart:[0,0,0,0]}[a.goal]||[75,58,42,32];
    const minCost=Math.min(prices.standard,prices.limited,prices.qr,prices.qrset/5,prices.wappen);
    if(a.music==='cd'&&initial.s+initial.l===0&&Math.min(prices.standard,prices.limited)>budget)return {empty:true,...metrics({s:0,l:0,q:0,w:0},prices,shipping,forceSets),score:0};
    if(budget<minCost&&initialUnits===0)return {empty:true,...metrics({s:0,l:0,q:0,w:0},prices,shipping,forceSets),score:0};
    const desired=requirements(scope,a.trade);
    const utility={s:[],l:[],q:[],w:[]};
    for(let n=0;n<=cap;n++){
      const ns=initial.s+n,nl=initial.l+n,nq=initial.q+n,nw=initial.w+n;
      utility.s[n]=weights[0]*(ns>0?1:0);
      utility.l[n]=weights[1]*(nl>0?1:0);
      utility.q[n]=weights[2]*(nq>0?1:0)+((a.goal==='object'||a.collect==='member')?15*Math.min(nq/5,1):0);
      utility.w[n]=weights[3]*(nw>0?1:0);
      if(scope==='standard'||scope==='all')utility.s[n]+=240*(a.trade==='no'?(expected(10,2,ns)/10+expected(5,1,ns)/5)/2:Math.min(ns/desired.s,1));
      if(scope==='limited'||scope==='all')utility.l[n]+=240*(a.trade==='no'?expected(10,2,nl)/10:Math.min(nl/desired.l,1));
      if(scope==='qr'||scope==='all')utility.q[n]+=240*(a.trade==='no'?(expected(15,3,nq)/15+expected(4,2,Math.floor(nq/5))/4)/2:Math.min(nq/desired.q,1));
      if(scope==='wappen'||scope==='all')utility.w[n]+=240*(a.trade==='no'?expected(5,1,nw)/5:Math.min(nw/desired.w,1));
      if(a.collect==='member') {utility.s[n]+=ns?12:0;utility.l[n]+=nl?12:0;utility.q[n]+=nq?24:0;utility.w[n]+=nw?12:0;}
      if(a.goal==='cards'&&a.collect!=='complete'){utility.s[n]+=15*Math.min(ns,2);utility.l[n]+=10*Math.min(nl,2);utility.q[n]+=30*Math.min(nq,3);utility.w[n]+=5*Math.min(nw,2);}
      if(a.goal==='chart'){utility.s[n]+=1000*ns;utility.l[n]+=1000*nl;utility.q[n]+=1000*nq;}
    }
    const qrCosts=Array.from({length:cap+1},(_,q)=>qrSplit(q,prices,forceSets).cost);
    let best=null;
    const bookRequired=initial.s+initial.l===0&&(a.music==='cd'||a.goal==='book')&&Math.min(prices.standard,prices.limited)<=budget;
    for(let s=0;s<=Math.min(cap,Math.floor(budget/prices.standard));s++){
      const baseS=s*prices.standard;
      for(let l=0;l<=Math.min(cap-s,Math.floor((budget-baseS)/prices.limited));l++){
        if(bookRequired&&s+l===0)continue;
        const baseL=baseS+l*prices.limited;
        for(let w=0;w<=Math.min(cap-s-l,Math.floor((budget-baseL)/prices.wappen));w++){
          const base=baseL+w*prices.wappen;
          for(let q=0;q<=cap-s-l-w;q++){
            const cost=base+qrCosts[q];if(cost>budget)continue;
            if(s+l+w+q+initialUnits===0)continue;
            if(a.music==='listen'&&s+l+q+initial.s+initial.l+initial.q===0)continue;
            // Interest affects only the value of variety; it never expands the stated budget/cap.
            const variety=Number(s+initial.s>0)+Number(l+initial.l>0)+Number(q+initial.q>0)+Number(w+initial.w>0);
            let score=utility.s[s]+utility.l[l]+utility.q[q]+utility.w[w];
            if(a.fan==='steady'&&a.goal==='balanced')score+=4*variety;
            if(a.goal!=='chart')score-=0.08*Math.max(0,s+l+w+q+initialUnits-variety);
            if(!best||score>best.score+1e-8||(Math.abs(score-best.score)<1e-8&&cost<best.cost))best={s,l,w,q,score,cost};
          }
        }
      }
    }
    if(!best)return {empty:true,...metrics({s:0,l:0,q:0,w:0},prices,shipping,forceSets),score:0};
    return {...metrics(best,prices,shipping,forceSets),score:best.score,empty:false};
  }
  function recommend(a,prices,shipping=0){
    if(!a.pob||a.pob==='none')return {...optimize(a,prices,shipping),offers:[]};
    const selected=a.pobOffer||'auto';
    const groups=a.pob==='all'?[pobOffers.filter(o=>o.complete)]:pobOffers.filter(o=>selected==='auto'||o.id===selected).map(o=>[o]);
    let best=null;
    for(const offers of groups){
      const products=Object.fromEntries(catalog.map(p=>[p.id,0]));
      let bundleCost=0;
      for(const offer of offers){bundleCost+=offer.price;for(const [id,n] of Object.entries(offer.products))products[id]+=n;}
      const initial=productCounts(products),units=initial.s+initial.l+initial.q+initial.w;
      if(units>a.cap||(!a.budgetUnlimited&&bundleCost+shipping>a.budget))continue;
      const extras=optimize({...a,budget:a.budgetUnlimited?0:a.budget-bundleCost,initialCounts:initial},prices,shipping);
      if(extras.empty)continue;
      for(const p of catalog)products[p.id]+=extras.products[p.id];
      const counts=productCounts(products),total=bundleCost+extras.total;
      const totalUnits=counts.s+counts.l+counts.q+counts.w;
      const m={...extras,products,counts,total,units:totalUnits,chart:counts.s+counts.l+counts.q,cards:counts.s*3+counts.l*2+counts.q*5+counts.w,books:counts.s+counts.l,qrsets:products.qrset,offers,extras,bundleCost};
      if(!best||m.score>best.score+1e-8||(Math.abs(m.score-best.score)<1e-8&&m.total<best.total))best=m;
    }
    if(best)return best;
    const costs=groups.map(g=>g.reduce((sum,o)=>sum+o.price,0));
    const quantities=groups.map(g=>g.reduce((sum,o)=>sum+Object.entries(o.products).reduce((n,[id,count])=>n+count*(id==='qrset'?5:1),0),0));
    return {...metrics({s:0,l:0,q:0,w:0},prices,shipping),empty:true,score:0,offers:[],pobBlocked:true,minimumPobCost:Math.min(...costs),minimumPobUnits:Math.min(...quantities)};
  }
  function pools(c,prices,setsOverride){
    const sets=setsOverride===undefined?qrSplit(c.q,prices).qrset:setsOverride;
    return [
      {key:'standard',name:'Standard 개인 포카',n:10,k:2,packs:c.s},
      {key:'standard',name:'Standard 유닛 포카',n:5,k:1,packs:c.s},
      {key:'limited',name:'Limited 포카',n:10,k:2,packs:c.l},
      {key:'qr',name:'QR 공통 셀피 포카',n:15,k:3,packs:c.q},
      {key:'qr',name:'QR 버전별 포카 · 각 버전',n:4,k:2,packs:sets,versions:5},
      {key:'wappen',name:'Wappen 포카',n:5,k:1,packs:c.w}
    ].map(p=>({...p,expected:expected(p.n,p.k,p.packs),probability:completion(p.n,p.k,p.packs),minimum:Math.ceil(p.n/p.k),n90:n90(p.n,p.k)}));
  }
  const api={catalog,pobOffers,defaultPrices,completion,expected,n90,requirements,qrSplit,metrics,profile,optimize,recommend,pools,productCounts};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PulseEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
