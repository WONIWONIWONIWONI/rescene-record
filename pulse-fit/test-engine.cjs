'use strict';
const assert = require('node:assert/strict');
const E = require('./engine.js');
const prices = E.defaultPrices;
const base = {fan:'light',budget:50000,goal:'balanced',collect:'keepsake',scope:'qr',trade:'yes',cap:3,music:'any',firstweek:'maybe'};
let checks=0;
function test(name,run){run();checks++;console.log('PASS '+name);}
// Independent inclusion-exclusion calculation checks the dynamic probability model.
function choose(n,k){if(k<0||k>n)return 0;let x=1;for(let j=1;j<=k;j++)x=x*(n-j+1)/j;return x;}
function inclusionExclusion(n,k,packs){let p=0;for(let missing=0;missing<=n;missing++)p+=(-1)**missing*choose(n,missing)*(choose(n-missing,k)/choose(n,k))**packs;return Math.max(0,p);}
test('completion probability agrees with inclusion-exclusion',()=>{for(const [n,k] of [[4,2],[5,1],[10,2],[15,3]])for(const packs of [0,1,5,10,20,30])assert.ok(Math.abs(E.completion(n,k,packs)-inclusionExclusion(n,k,packs))<1e-10);});
test('five 2-of-10 packs can still have duplicates',()=>{assert.ok(Math.abs(E.completion(10,2,5)-113400/45**5)<1e-12);assert.ok(E.expected(10,2,5)<7);});
test('theoretical full collection uses distinct pools and QR bundles',()=>{assert.deepEqual(E.requirements('all','yes'),{s:5,l:5,q:10,w:5});const m=E.metrics(E.requirements('all','yes'),prices,0,true);assert.equal(m.total,378500);assert.equal(m.units,25);assert.equal(m.cards,80);assert.equal(m.chart,20);assert.equal(m.products.qrset,2);});
test('budget allows the full trade plan exactly',()=>{const m=E.optimize({...base,budget:378500,cap:25,goal:'cards',collect:'complete',scope:'all'},prices);assert.deepEqual(m.products,{standard:5,limited:5,qr:0,qrset:2,wappen:5});});
test('QR collection uses two sets rather than assuming one set is complete',()=>{const m=E.optimize({...base,budget:100000,cap:10,goal:'cards',collect:'complete',scope:'qr'},prices);assert.equal(m.products.qrset,2);assert.equal(m.cards,50);});
test('no-purchase result for zero budget and unavoidable CD constraint',()=>{assert.ok(E.optimize({...base,budget:0},prices).empty);assert.ok(E.optimize({...base,budget:10000,music:'cd'},prices).empty);assert.ok(!E.optimize({...base,budget:10000,music:'any'},prices).empty);});
test('a QR set is five units, not one',()=>{const m=E.optimize({...base,budget:100000,cap:1,goal:'chart'},prices);assert.equal(m.units,1);assert.equal(m.products.qrset,0);});
test('random QR singles do not guarantee any version-specific draw',()=>{const p=E.pools({s:0,l:0,q:10,w:0},prices,0);assert.equal(p.find(p=>p.name.includes('各')||p.versions).packs,0);assert.equal(p.find(p=>p.name.includes('共')||p.n===15).packs,10);});
test('prices and shipping enforce hard budget and capacity limits',()=>{for(const goal of ['book','cards','object','balanced','chart'])for(const budget of [0,10000,30000,50000,100000])for(const cap of [1,3,8]){const a={...base,goal,budget,cap};const m=E.optimize(a,prices,2500);assert.ok(m.empty||m.total+2500<=budget);assert.ok(m.units<=cap);if(goal==='book'&&budget-2500>=20800&&!m.empty)assert.ok(m.books>=1);}});
test('chart maximum agrees with independently enumerated five-product baskets',()=>{
  const p={standard:13000,limited:24000,qr:8900,qrset:40000,wappen:3000};
  for(const budget of [10000,17000,40000,49000,60000])for(const cap of [1,3,6,8]){
    let max=0;
    for(let s=0;s<=cap;s++)for(let l=0;l<=cap;l++)for(let w=0;w<=cap;w++)for(let sets=0;sets<=Math.floor(cap/5);sets++)for(let qr=0;qr<=cap;qr++){
      if(s+l+w+5*sets+qr>cap)continue;
      if(s*p.standard+l*p.limited+w*p.wappen+sets*p.qrset+qr*p.qr>budget)continue;
      max=Math.max(max,s+l+5*sets+qr);
    }
    assert.equal(E.optimize({...base,budget,cap,goal:'chart'},p).chart,max);
  }
});
test('minimum price bundling chooses cheaper singles or discounted sets',()=>{const p={...prices,qr:8000,qrset:50000};assert.equal(E.qrSplit(10,p).qrset,0);assert.equal(E.qrSplit(10,p,true).qrset,2);assert.equal(E.qrSplit(12,{...prices,qrset:40000}).cost,97800);});
test('90 percent quantities actually reach the specified pool threshold',()=>{for(const [n,k] of [[4,2],[5,1],[10,2],[15,3]]){const count=E.n90(n,k);assert.ok(E.completion(n,k,count)>=.9);assert.ok(E.completion(n,k,count-1)<.9);}});
test('unlimited budget removes the money bound but retains the unit bound',()=>{
  const m=E.recommend({...base,budget:0,budgetUnlimited:true,cap:100,goal:'chart'},prices);
  assert.equal(m.chart,100);assert.equal(m.units,100);assert.equal(m.total,890000);
  assert.ok(E.recommend({...base,budget:0,budgetUnlimited:false},prices).empty);
});
test('CU Wappen pair uses the corrected 22,200 price',()=>{
  const a={...base,pob:'want',pobOffer:'cu-wappen',cap:2,budget:22200};
  const m=E.recommend(a,prices);assert.equal(m.total,22200);assert.equal(m.units,2);assert.equal(m.cards,2);assert.equal(m.chart,0);
  assert.ok(E.recommend({...a,budget:22000},prices).empty);
});
test('all seven special bundles total 564,200 and count 32 actual units',()=>{
  const m=E.recommend({...base,pob:'all',budget:564200,cap:32},prices);
  assert.equal(m.offers.length,7);assert.equal(m.total,564200);assert.equal(m.units,32);assert.equal(m.cards,87);assert.equal(m.chart,25);assert.equal(m.extras.units,0);
  assert.ok(E.recommend({...base,pob:'all',budgetUnlimited:true,cap:25},prices).empty);
});
test('special-bundle albums contribute to full album-photocard goals',()=>{
  const m=E.recommend({...base,pob:'all',budgetUnlimited:true,cap:50,goal:'cards',collect:'complete',scope:'all'},prices);
  assert.equal(m.total,608700);assert.equal(m.units,37);assert.equal(m.products.qrset,2);assert.equal(m.products.standard,15);assert.equal(m.products.limited,5);assert.equal(m.products.wappen,7);
  assert.equal(m.extras.products.standard,0);assert.equal(m.extras.products.limited,0);assert.equal(m.extras.products.wappen,0);assert.equal(m.additionalCounts.q,5);assert.equal(m.offers.find(o=>o.id==='cu-qr'&&o.additionalPurchase).quantity,1);
});
test('one-photo special request can use a verified single album',()=>{
  const m=E.recommend({...base,pob:'want',pobOffer:'auto',budget:20800,cap:1,music:'cd'},prices);
  assert.equal(m.offers[0].id,'makestar-single');assert.equal(m.total,20800);assert.equal(m.units,1);
  assert.ok(E.recommend({...base,pob:'want',pobOffer:'makestar-yarn',budgetUnlimited:true,cap:1},prices).empty);
});
test('special offers obey both budget and capacity including separate shipping',()=>{
  for(const offer of E.pobOffers)for(const goal of ['balanced','cards','chart']){
    const a={...base,pob:'want',pobOffer:offer.id,goal,budget:150000,cap:8};
    const m=E.recommend(a,prices,3000);assert.ok(m.empty||m.total+3000<=a.budget);assert.ok(m.units<=a.cap);
    if(!m.empty)assert.equal(m.offers[0].id,offer.id);
  }
});
test('a small-budget single photocard request can select CU QR',()=>{
  const m=E.recommend({...base,pob:'want',pobFormat:'single',pobOffer:'auto',budget:8900,cap:1},prices);
  assert.equal(m.offers[0].id,'cu-qr-single');assert.equal(m.total,8900);assert.equal(m.units,1);assert.equal(m.cards,5);assert.equal(m.qrsets,0);
});
test('retailer singles keep their separate gift and actual product type',()=>{
  for(const [id,cost,product] of [['baemin-limited-single',26000,'limited'],['cu-qr-single',8900,'qr'],['cu-wappen-single',11100,'wappen']]){
    const m=E.recommend({...base,pob:'want',pobFormat:'single',pobOffer:id,budget:cost,cap:1},prices);
    assert.equal(m.total,cost);assert.equal(m.products[product],1);assert.equal(m.offers[0].complete,false);assert.ok(m.offers[0].gift.includes('랜덤 1장'));
  }
});
test('single and duplicate-free bundle preferences filter automatic recommendations',()=>{
  const a={...base,pob:'want',pobOffer:'auto',budget:50000,cap:8};
  assert.equal(E.recommend({...a,pobFormat:'single'},prices).offers[0].complete,false);
  assert.equal(E.recommend({...a,pobFormat:'set'},prices).offers[0].complete,true);
  assert.ok(E.recommend({...a,pobFormat:'set',budget:8900,cap:1},prices).empty);
});
test('app single price overrides affect recommendation and budget feasibility',()=>{
  const custom={...prices,'offer_cu-qr-single':9500};
  const a={...base,pob:'want',pobFormat:'single',pobOffer:'cu-qr-single',cap:1};
  assert.ok(E.recommend({...a,budget:8900},custom).empty);
  assert.equal(E.recommend({...a,budget:9500},custom).total,9500);
});


const eventBase={...base,now:Date.parse('2026-10-13T11:00:00Z')};
test('showcase period boundaries distinguish future, open and closed',()=>{
  assert.equal(E.showcaseStatus(Date.parse('2026-10-13T05:59:59Z')),'upcoming');
  assert.equal(E.showcaseStatus(Date.parse(E.showcaseEvent.opens)),'open');
  assert.equal(E.showcaseStatus(Date.parse(E.showcaseEvent.closes)),'open');
  assert.equal(E.showcaseStatus(Date.parse('2026-10-16T15:00:00Z')),'closed');
});
test('own target respects the budget and shows shortfall instead of increasing limits',()=>{
  const m=E.recommend({...eventBase,showcase:'target',showcaseTarget:5,budget:70000,cap:3},prices,3000);
  assert.equal(m.showcaseEntries,3);assert.equal(m.showcaseShortfall,2);assert.equal(m.total,62400);assert.equal(m.units,3);assert.equal(m.cards,9);assert.equal(m.offers[0].quantity,3);
});
test('showcase priority uses event albums rather than cheap non-event QR entries',()=>{
  const m=E.recommend({...eventBase,showcase:'priority',goal:'chart',budget:50000,cap:8},prices);
  assert.equal(m.showcaseEntries,2);assert.equal(m.products.standard,2);assert.ok(m.total<=50000);assert.equal(m.chart,2);
});
test('unlimited showcase budget still enforces storage cap',()=>{
  const m=E.recommend({...eventBase,showcase:'priority',budgetUnlimited:true,cap:8},prices);
  assert.equal(m.showcaseEntries,8);assert.equal(m.units,8);assert.equal(m.total,166400);assert.ok(m.offers[0].gift.includes('1세트 + 랜덤 3장'));
});
test('five-album showcase gift bundle is five entries and counted once for collection',()=>{
  const m=E.recommend({...eventBase,pob:'want',pobOffer:'makestar-bite',showcase:'target',showcaseTarget:5,collect:'complete',scope:'standard',budget:104000,cap:5},prices);
  assert.equal(m.showcaseEntries,5);assert.equal(m.total,104000);assert.equal(m.units,5);assert.equal(m.extras.units,0);assert.equal(m.cards,15);
});
test('auto special gift and showcase use the same five-album order',()=>{
  const m=E.recommend({...eventBase,pob:'want',pobFormat:'single',showcase:'target',showcaseTarget:5,budget:104000,cap:5},prices);
  assert.equal(m.offers.length,1);assert.equal(m.offers[0].id,'makestar-showcase-single');assert.equal(m.showcaseEntries,5);assert.equal(m.total,104000);assert.ok(m.offers[0].gift.includes('1세트'));
});
test('non-event purchases and unverified Whosfan conditions never count as MakeStar entries',()=>{
  const m=E.recommend({...eventBase,pob:'all',showcase:'target',showcaseTarget:5,budget:564200,cap:32},prices);
  assert.equal(m.showcaseEntries,5);assert.equal(m.products.standard,15);assert.equal(m.units,32);assert.equal(m.total,564200);
  const yarn=E.recommend({...eventBase,pob:'want',pobOffer:'makestar-yarn',showcase:'target',showcaseTarget:1,budget:104000,cap:5},prices);
  assert.equal(yarn.showcaseEntries,0);assert.equal(yarn.showcaseShortfall,1);
});
test('choosing no entry keeps event gift albums without claiming participation',()=>{
  const m=E.recommend({...eventBase,pob:'want',pobOffer:'makestar-bite',showcase:'none',budget:104000,cap:5},prices);
  assert.equal(m.showcaseEntries,0);assert.equal(m.showcasePotential,5);
});
test('no new event purchases after deadline or before opening',()=>{
  for(const now of [Date.parse('2026-10-13T05:00:00Z'),Date.parse('2026-10-17T00:00:00Z')]){
    const m=E.recommend({...eventBase,now,showcase:'priority',budget:104000,cap:5},prices);
    assert.equal(m.showcaseEntries,0);assert.equal(m.offers.length,0);
  }
});
test('showcase max agrees with independent per-album capacity calculation',()=>{
  for(const budget of [0,10000,20800,50000,104000,200000])for(const cap of [1,3,8]){
    const m=E.recommend({...eventBase,showcase:'priority',budget,cap},prices,2000);
    assert.equal(m.showcaseEntries,Math.min(cap,Math.max(0,Math.floor((budget-2000)/20800))));
    assert.ok(m.empty||m.total+2000<=budget);assert.ok(m.units<=cap);
  }
});


test('reported CU Wappen screenshot preserves four actual albums but routes the extra two to CU',()=>{
  const m=E.recommend({...base,pob:'want',pobOffer:'cu-wappen',budget:110000,cap:8,collect:'complete',scope:'all'},prices);
  assert.equal(m.total,109000);assert.equal(m.units,8);assert.equal(m.cards,19);assert.equal(m.products.wappen,4);
  assert.equal(m.initialCounts.w,2);assert.equal(m.additionalCounts.w,2);assert.equal(m.extras.products.wappen,0);
  const more=m.offers.find(o=>o.additionalPurchase&&o.id==='cu-wappen-single');assert.equal(more.quantity,2);assert.equal(more.price,22200);
});
test('a keepsake buyer never buys extra Wappen simply because CU has gifts',()=>{
  const m=E.recommend({...base,pob:'want',pobOffer:'cu-wappen',budget:110000,cap:8,collect:'keepsake'},prices);
  assert.equal(m.products.wappen,2);assert.equal(m.additionalCounts.w,0);assert.equal(m.offers.filter(o=>o.additionalPurchase).length,0);
});
test('CU bundle albums satisfy two of five enclosed-card trade draws, with only three added',()=>{
  const m=E.recommend({...base,pob:'want',pobOffer:'cu-wappen',budget:55500,cap:5,collect:'complete',scope:'wappen',goal:'object'},prices);
  assert.equal(m.products.wappen,5);assert.equal(m.total,55500);assert.equal(m.cards,5);assert.equal(m.offers.find(o=>o.additionalPurchase).quantity,3);
});
test('costlier retailer extras do not replace an otherwise equivalent cheaper general album',()=>{
  const p={...prices,'offer_cu-wappen-single':12000};
  const m=E.recommend({...base,pob:'want',pobOffer:'cu-wappen',budget:55500,cap:5,collect:'complete',scope:'wappen',goal:'object'},p);
  assert.equal(m.products.wappen,5);assert.equal(m.extras.products.wappen,3);assert.equal(m.offers.length,1);assert.equal(m.total,55500);
});
test('discounted retailer extras use their actual price during optimization',()=>{
  const p={...prices,'offer_cu-wappen-single':10000};
  const m=E.recommend({...base,pob:'want',pobOffer:'cu-wappen',budget:52200,cap:5,collect:'complete',scope:'wappen',goal:'object'},p);
  assert.equal(m.products.wappen,5);assert.equal(m.total,52200);assert.equal(m.offers.find(o=>o.additionalPurchase).price,30000);
});
test('routed retailer purchases reconcile products, price, physical units and cards without double counting',()=>{
  for(const offer of E.pobOffers)for(const scope of ['standard','limited','qr','wappen','all']){
    const m=E.recommend({...eventBase,pob:'want',pobOffer:offer.id,budget:400000,cap:25,collect:'complete',scope},prices,2000);
    if(m.empty)continue;
    const products={...m.extras.products};
    for(const o of m.offers)for(const [id,n] of Object.entries(o.products))products[id]+=n;
    assert.deepEqual(products,m.products);assert.equal(m.total,m.offers.reduce((n,o)=>n+o.price,0)+m.extras.total);
    const c=E.productCounts(products);assert.equal(m.units,c.s+c.l+c.q+c.w);assert.equal(m.cards,c.s*3+c.l*2+c.q*5+c.w);assert.ok(m.total+2000<=400000);assert.ok(m.units<=25);
  }
});
test('MakeStar collection extras routed to its showcase listing update entries once',()=>{
  const m=E.recommend({...eventBase,pob:'want',pobOffer:'makestar-showcase-single',showcase:'target',showcaseTarget:1,budget:200000,cap:8,collect:'complete',scope:'standard',goal:'balanced'},prices);
  assert.equal(m.products.standard,5);assert.equal(m.showcaseEntries,5);assert.equal(m.total,150000);assert.equal(m.units,8);assert.equal(m.cards,23);
});


const groupBase={...eventBase,groupbuy:'compare',groupShipping_allmd:null,groupShipping_ktown:null};
test('group-buy prices match each of the supplied guide rows',()=>{
  assert.deepEqual(E.groupBuys.find(g=>g.id==='allmd').prices,{standard:16900,limited:21100,qr:7300,qrset:36200,wappen:9100});
  assert.deepEqual(E.groupBuys.find(g=>g.id==='ktown').prices,{standard:17400,limited:21800,qr:8200,qrset:40700,wappen:9800});
});
test('group albums have the same enclosed contents, without retailer gifts or event entries',()=>{
  const m=E.recommend({...groupBase,budget:72400,cap:10,goal:'chart'},prices);
  assert.equal(m.groupVenue.id,'allmd');assert.equal(m.products.qrset,2);assert.equal(m.units,10);assert.equal(m.cards,50);assert.equal(m.total,72400);assert.equal(m.offers.length,0);assert.equal(m.showcaseEntries,0);assert.equal(m.orderShipping,0);assert.equal(m.groupShippingUnknown,false);
});
test('unknown shipping is explicitly conditional, while known shipping enforces budget',()=>{
  const a={...groupBase,budget:16900,cap:1,music:'cd'};
  const m=E.recommend(a,prices);assert.equal(m.total,16900);assert.equal(m.groupShippingUnknown,true);
  assert.ok(E.recommend({...a,groupShipping_allmd:4000,groupShipping_ktown:4000},prices).empty);
});
test('a sufficiently expensive group delivery can make the regular purchase cheaper',()=>{
  const m=E.recommend({...groupBase,budget:25000,cap:1,music:'cd',groupShipping_allmd:5000,groupShipping_ktown:5000},prices);
  assert.equal(m.products.standard,1);assert.equal(m.total,20800);assert.equal(m.groupVenue,null);assert.equal(m.checkoutTotal,20800);
});
test('free shipping counts the ALL MD order only, never the CU event subtotal',()=>{
  const m=E.recommend({...groupBase,pob:'want',pobOffer:'cu-wappen',budget:70000,cap:7,collect:'complete',scope:'qr',goal:'cards',groupShipping_allmd:4000,groupShipping_ktown:4000},prices);
  assert.equal(m.groupSubtotal,36200);assert.equal(m.total,58400);assert.equal(m.orderShipping,4000);assert.equal(m.checkoutTotal,62400);assert.equal(m.groupShippingUnknown,false);
});
test('CU special requirement remains at full event price and cheaper extra Wappen use group price',()=>{
  const m=E.recommend({...groupBase,pob:'want',pobOffer:'cu-wappen',budget:110000,cap:8,collect:'complete',scope:'all'},prices);
  assert.equal(m.offers[0].price,22200);assert.equal(m.offers.length,1);assert.equal(m.groupVenue.id,'allmd');assert.equal(m.products.wappen,5);assert.equal(m.extras.products.wappen,3);assert.equal(m.extras.itemPrices.wappen,9100);assert.equal(m.total,94800);assert.equal(m.cards,15);assert.equal(m.units,8);
});
test('group prices cannot discount a five-entry showcase product',()=>{
  const m=E.recommend({...groupBase,pob:'want',pobOffer:'makestar-bite',showcase:'target',showcaseTarget:5,budget:104000,cap:5},prices);
  assert.equal(m.total,104000);assert.equal(m.showcaseEntries,5);assert.equal(m.groupSubtotal,0);assert.equal(m.products.standard,5);
});
test('mixed regular/group items retain actual per-product source and group delivery subtotal',()=>{
  const p={...prices,standard:10000};
  const m=E.recommend({...groupBase,budget:21300,cap:2,music:'cd',groupShipping_allmd:1000,groupShipping_ktown:1000},p,3000);
  assert.equal(m.products.standard,1);assert.equal(m.products.qr,1);assert.equal(m.extras.itemPrices.standard,10000);assert.equal(m.extras.itemSources.standard,'');assert.equal(m.extras.itemSources.qr,'ALL MD 총공 공구');assert.equal(m.groupSubtotal,7300);assert.equal(m.orderShipping,1000);assert.equal(m.checkoutTotal,21300);
});
test('group offer deadlines remove expired prices without changing special-event eligibility',()=>{
  const m=E.recommend({...groupBase,groupbuy:'ktown',now:Date.parse('2026-11-03T08:00:01Z'),budget:50000,cap:3},prices);
  assert.equal(m.groupExpired,true);assert.equal(m.groupVenue,null);assert.equal(m.total,40800);
});
test('delivery does not cause unnecessary extra keepsake albums just to reach a free threshold',()=>{
  const m=E.recommend({...groupBase,budget:100000,cap:20,groupShipping_allmd:3000,groupShipping_ktown:3000},prices);
  assert.equal(m.units,4);assert.equal(m.products.standard,1);assert.equal(m.products.limited,1);assert.equal(m.products.qr,1);assert.equal(m.products.wappen,1);
});
test('group/retailer baskets reconcile costs and quantities within both limits',()=>{
  for(const budget of [0,30000,70000,110000,400000])for(const cap of [1,3,8,25])for(const pob of ['none','want']){
    const m=E.recommend({...groupBase,budget,cap,pob,pobOffer:'cu-wappen',collect:'complete',scope:'all',groupShipping_allmd:4000,groupShipping_ktown:3500},prices,2000);
    if(m.empty)continue;
    const products={...m.extras.products};for(const o of m.offers)for(const [id,n] of Object.entries(o.products))products[id]+=n;
    assert.deepEqual(products,m.products);assert.equal(m.total,m.offers.reduce((sum,o)=>sum+o.price,0)+m.extras.total);assert.equal(m.checkoutTotal,m.total+m.orderShipping+2000);assert.ok(m.checkoutTotal<=budget);assert.ok(m.units<=cap);assert.equal(m.showcaseEntries,0);
  }
});


const pobBase={...groupBase,pob:'want',pobOffer:'auto',pobFormat:'set',pobKind:'any',pobPriority:'balanced',goal:'cards',budget:50000,cap:8,groupShipping_allmd:3000,groupShipping_ktown:3000};
test('CU QR five-pack includes five distinct gift cards separately from its 25 enclosed cards',()=>{
  const m=E.recommend(pobBase,prices);
  assert.equal(m.offers[0].id,'cu-qr');assert.equal(m.total,44500);assert.equal(m.units,5);assert.equal(m.cards,25);assert.equal(m.pobMetrics.guaranteedUnique,5);assert.equal(m.pobMetrics.points,90);
});
test('a one-gift preference retains the cheaper variety basket instead of forcing CU QR',()=>{
  const m=E.recommend({...pobBase,pobPriority:'one'},prices);
  assert.equal(m.offers[0].id,'cu-wappen');assert.equal(m.pobMetrics.points,0);assert.ok(m.checkoutTotal<=50000);
});
test('personal versus unit photocard preferences filter the correct gift products',()=>{
  assert.equal(E.recommend({...pobBase,pobKind:'individual'},prices).offers[0].id,'cu-qr');
  const unit=E.recommend({...pobBase,pobKind:'unit'},prices);assert.equal(unit.offers[0].id,'cu-wappen');assert.equal(unit.pobMetrics.targetUnique,2);assert.ok(unit.offers.every(o=>o.giftKind==='unit'));
});
test('CU QR is rejected for actual five-album capacity, not one package',()=>{
  const m=E.recommend({...pobBase,cap:3},prices);assert.notEqual(m.offers[0].id,'cu-qr');
  assert.ok(m.candidateAudit.filter(c=>c.ids[0]==='cu-qr').every(c=>c.reason==='capacity'&&c.minimumUnits===5));
});
test('CU QR budget exclusion and CD requirements are exposed in audit',()=>{
  const low=E.recommend({...pobBase,budget:40000},prices);assert.ok(low.candidateAudit.filter(c=>c.ids[0]==='cu-qr').every(c=>c.reason==='budget'));
  const cd=E.recommend({...pobBase,cap:5,budget:100000,music:'cd'},prices);assert.ok(cd.candidateAudit.filter(c=>c.ids[0]==='cu-qr').every(c=>c.reason==='requirements'));
});
test('set-gift utility does not count identical duplicate sets or random cards as new guaranteed designs',()=>{
  const offer=E.pobOffers.find(o=>o.id==='cu-qr'),single=E.pobOffers.find(o=>o.id==='cu-qr-single');
  assert.equal(E.giftMetrics([{...offer,quantity:2,products:{qrset:2}}],pobBase).guaranteedUnique,5);
  assert.equal(E.giftMetrics([{...single,quantity:5,products:{qr:5}}],pobBase).guaranteedUnique,1);
  assert.equal(E.giftMetrics([offer,{...single,quantity:3,products:{qr:3}}],pobBase).guaranteedUnique,5);
});
test('confirmed one-order MakeStar gift threshold is reflected without combining different gift families',()=>{
  const yarn=E.pobOffers.find(o=>o.id==='makestar-single'),bite=E.pobOffers.find(o=>o.id==='makestar-showcase-single');
  assert.equal(E.giftMetrics([{...yarn,products:{standard:4}}],pobBase).guaranteedUnique,1);
  assert.equal(E.giftMetrics([{...yarn,products:{standard:5}}],pobBase).guaranteedUnique,5);
  assert.equal(E.giftMetrics([{...yarn,products:{standard:3}},{...bite,products:{standard:2}}],pobBase).guaranteedUnique,2);
});
test('group-buy QR cannot inherit the CU gift promise',()=>{
  const m=E.recommend({...groupBase,pob:'none',budget:36200,cap:5,collect:'complete',scope:'qr',goal:'cards'},prices);
  assert.equal(m.groupVenue.id,'allmd');assert.equal(m.products.qrset,1);assert.equal(m.pobMetrics.guaranteedUnique,0);assert.equal(m.pobMetrics.points,0);assert.equal(m.cards,25);
});
test('gift-weight changes never exceed budget or capacity and preserve exact cost reconciliation',()=>{
  for(const priority of ['one','balanced','collect'])for(const kind of ['any','individual','unit'])for(const budget of [22000,44500,50000,100000])for(const cap of [3,5,8]){
    const m=E.recommend({...pobBase,pobPriority:priority,pobKind:kind,budget,cap},prices,2000);if(m.empty)continue;
    assert.ok(m.checkoutTotal<=budget);assert.ok(m.units<=cap);assert.equal(m.total,m.bundleCost+m.extras.total);assert.ok(Math.abs(m.score-m.albumScore-m.pobMetrics.points)<1e-8);assert.deepEqual(E.giftMetrics(m.offers,{...pobBase,pobPriority:priority,pobKind:kind}).families,m.pobMetrics.families);
  }
});
test('special-gift score retains verified showcase entry priority',()=>{
  const m=E.recommend({...pobBase,pobPriority:'collect',showcase:'priority',budget:104000,cap:5},prices);
  assert.equal(m.showcaseEntries,5);assert.equal(m.offers[0].id,'makestar-bite');assert.equal(m.total,104000);
});
console.log(`${checks} calculation tests passed.`);
