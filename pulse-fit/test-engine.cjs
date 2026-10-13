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
  assert.equal(m.extras.products.standard,0);assert.equal(m.extras.products.limited,0);assert.equal(m.extras.products.wappen,0);assert.equal(m.extras.products.qrset,1);
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
console.log(`${checks} calculation tests passed.`);
