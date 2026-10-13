'use strict';
// Template smoke checks using a minimal document facade; no browser or layout assertions.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const staticMarkup=fs.readFileSync('pulse-fit/index.html','utf8');
let mainMarkup='',markup=staticMarkup;const elements=new Map();
function element(id){if(elements.has(id))return elements.get(id);const e={id,value:'',dataset:{},style:{},classList:{add(){},remove(){}},focus(){},setAttribute(){},showModal(){},close(){},remove(){}};let html='';Object.defineProperty(e,'innerHTML',{get(){return html;},set(value){html=value;if(id==='main'){mainMarkup=value;markup=staticMarkup+value;}else markup+='\n'+value;}});elements.set(id,e);return e;}
const document={
  getElementById(id){return markup.includes(`id="${id}"`)?element(id):null;},
  querySelectorAll(selector){if(selector==='.site-header nav button')return ['quiz','compare','calculator'].map(view=>({dataset:{view},setAttribute(){}}));return [];},
  querySelector(selector){if(selector.includes('name="shipping"'))return element('shipping');return null;},
  addEventListener(){},createElement(){return element('temporary');},body:{append(){}},execCommand(){return true;}
};
const context={document,localStorage:{getItem(){return null;},setItem(){}},location:{hash:'',origin:'https://example.test',pathname:'/'},navigator:{clipboard:{async writeText(){}}},console,Date:class extends Date{constructor(...args){super(...(args.length?args:['2026-10-13T11:00:00Z']));}static now(){return Date.parse('2026-10-13T11:00:00Z');}},clearTimeout,setTimeout,FormData:class{},window:{scrollTo(){},addEventListener(){},print(){}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('pulse-fit/engine.js','utf8'),context);vm.runInContext(fs.readFileSync('pulse-fit/app.js','utf8'),context);
function run(code){return vm.runInContext(code,context);}
assert.ok(mainMarkup.includes('마음은 이미'));assert.equal(run('defaults.groupbuy'),'compare');
for(let step=0;step<10;step++){run(`step=${step};view='quiz';quiz();`);assert.ok(mainMarkup.includes(`${step+1} / 10`));assert.ok(mainMarkup.includes('id="quiz-next"'));}
run("answers={...defaults,collect:'complete',scope:'qr'};step=3;quiz();");assert.ok(mainMarkup.includes('scope-select'));
run("answers={...defaults,cap:12};step=7;quiz();");assert.ok(mainMarkup.includes('cap-value'));
run("answers={...defaults};view='result';results();");assert.ok(mainMarkup.includes('45,300원'));assert.ok(mainMarkup.includes('나의 PULSE 구매 보고서'));
run("answers={...defaults,budget:378500,cap:25,collect:'complete',scope:'all',goal:'cards'};results();");assert.ok(mainMarkup.includes('307,900원'));assert.ok(mainMarkup.includes('교환 전제 최소 25개'));assert.ok(mainMarkup.includes('QR 5종 세트'));
run("answers={...defaults,budget:0};results();");assert.ok(mainMarkup.includes('지금은 구매 보류'));
run("view='compare';compare();");assert.ok(mainMarkup.includes('15종 중 3장'));assert.ok(mainMarkup.includes('Wappen'));
run("view='calculator';calculator();");assert.ok(markup.includes('36,200원'));assert.ok(markup.includes('25장'));
assert.equal(run("validAnswers({budget:-9,cap:1000,goal:'<script>',collect:'invalid'}).budget"),50000);
assert.equal(run("validAnswers({budget:2000000,cap:100}).cap"),100);
run("answers={...defaults,budgetUnlimited:true};step=1;quiz();");assert.ok(mainMarkup.includes('✓ 예산 무제한'));assert.ok(mainMarkup.includes('금액 제한 없음'));
run("answers={...defaults,pob:'want',pobOffer:'cu-wappen'};step=4;quiz();");assert.ok(mainMarkup.includes('pob-select'));assert.ok(mainMarkup.includes('22,200원'));
run("answers={...defaults,pob:'all',budgetUnlimited:true,cap:32};view='result';results();");assert.ok(mainMarkup.includes('564,200원'));assert.ok(mainMarkup.includes('제한 없음'));assert.ok(mainMarkup.includes('이번 조합에서 받을 특전'));
run("answers={...defaults,pob:'want',pobOffer:'cu-wappen',budget:22000,cap:2};results();");assert.ok(mainMarkup.includes('구매 보류'));assert.ok(mainMarkup.includes('실물 최소 2개'));assert.ok(!mainMarkup.includes('${m.'));
run("view='pob';pobPage();");assert.ok(mainMarkup.includes('564,200원'));assert.ok(mainMarkup.includes('털실냥이'));assert.ok(mainMarkup.includes('한입만'));
assert.equal(run("validAnswers({budgetUnlimited:true,pob:'all',pobOffer:'cu-wappen'}).budgetUnlimited"),true);
assert.equal(run("validAnswers({budgetUnlimited:'true',pob:'fake'}).pob"),'none');

run("answers={...defaults,pob:'want',pobFormat:'single'};step=4;quiz();");assert.ok(mainMarkup.includes('pob-format'));assert.ok(mainMarkup.includes('CU · QR 단품'));assert.ok(!mainMarkup.includes('배민 · Limited 5개 세트'));
run("answers={...defaults,pob:'want',pobFormat:'single',pobOffer:'cu-qr-single',budget:8900,cap:1};view='result';results();");assert.ok(mainMarkup.includes('CU · QR 단품'));assert.ok(mainMarkup.includes('8,900원'));assert.ok(mainMarkup.includes('개인 미공포 랜덤 1장'));
run("prices['offer_cu-qr-single']=9500;persist();");assert.ok(run("JSON.stringify({answers,prices,shipping}).includes('offer_cu-qr-single')"));
run("view='pob';pobPage();");assert.ok(mainMarkup.includes('9,500원'));assert.ok(mainMarkup.includes('기준가 · 앱 가격 확인'));
assert.equal(run("validAnswers({pob:'want',pobFormat:'single',pobOffer:'cu-qr'}).pobOffer"),'auto');
console.log('PASS 10 question templates, all main pages, result branches, calculator and URL input validation (document facade; not browser layout QA).');

run("answers={...defaults,showcase:'target',showcaseTarget:4};step=5;quiz();");assert.ok(mainMarkup.includes('showcase-target'));assert.ok(mainMarkup.includes('당첨 컷'));
element('showcase-target').value='0';element('quiz-next').onclick();assert.ok(element('quiz-error').textContent.includes('1~100'));assert.equal(run('step'),5);
element('showcase-target').value='4';element('quiz-next').onclick();assert.equal(run('answers.showcaseTarget'),4);assert.equal(run('step'),6);
run("answers={...defaults,showcase:'target',showcaseTarget:5,budget:70000,cap:3};view='result';results();");assert.ok(mainMarkup.includes('목표까지 2회 부족'));assert.ok(mainMarkup.includes('Standard 단품 · 쇼케이스'));assert.ok(mainMarkup.includes('62,400원'));assert.ok(run('summaryText()').includes('3회 (구매 계획·컷 미확인)'));
run("answers={...defaults,showcase:'priority',budgetUnlimited:true,cap:8};results();");assert.ok(mainMarkup.includes('쇼케이스 참여형'));assert.ok(mainMarkup.includes('166,400원'));assert.ok(mainMarkup.includes('한입만 미공포 1세트 + 랜덤 3장'));
run("answers={...defaults,pob:'want',pobOffer:'makestar-bite',budget:104000,cap:5};results();");assert.ok(mainMarkup.includes('응모 선택 안 함'));assert.ok(mainMarkup.includes('현재 답변에서는 응모를 원하지 않아 0회'));
assert.equal(run("validAnswers({showcase:'fake',showcaseTarget:200}).showcase"),'none');assert.equal(run("validAnswers({showcase:'target',showcaseTarget:0}).showcaseTarget"),1);
run("view='pob';pobPage();");assert.ok(mainMarkup.includes('후즈팬 · 쇼케이스'));assert.ok(mainMarkup.includes('370명 선발'));assert.ok(mainMarkup.includes('안전 컷이나 당첨 확률을 추정하지 않습니다'));
console.log('PASS showcase question validation, budgets, opt-out, gifts, result summary and event guide.');

run("answers={...defaults,pob:'want',pobOffer:'cu-wappen',budget:110000,cap:8,collect:'complete',scope:'all'};view='result';results();");
assert.ok(mainMarkup.includes('ALL MD 총공 공구 · Wappen'));assert.ok(mainMarkup.includes('특전·응모 상품에 든 2개를 이미 반영'));assert.ok(mainMarkup.includes('3개를 더해 총 5개'));assert.ok(mainMarkup.includes('94,800원'));
assert.equal(run('result.extras.products.wappen'),3);assert.ok(run('summaryText()').includes('ALL MD 총공 공구'));
run("answers={...defaults,pob:'want',pobOffer:'cu-wappen',budget:110000,cap:8,collect:'keepsake'};results();");assert.ok(!mainMarkup.includes('CU · Wappen 단품'));assert.equal(run('result.products.wappen'),2);
console.log('PASS same-price CU replacement, collection shortfall explanation and no repeated keepsake Wappen.');

run("answers={...defaults,groupbuy:'compare'};step=1;quiz();");assert.ok(mainMarkup.includes('groupbuy-select'));assert.ok(mainMarkup.includes('fee-allmd'));assert.ok(mainMarkup.includes('배송비 미확인'));
run("answers={...defaults,groupbuy:'compare',budget:110000,cap:8,pob:'want',pobOffer:'cu-wappen',collect:'complete',scope:'all'};view='result';results();");assert.ok(mainMarkup.includes('CU · Wappen 2개 세트'));assert.ok(mainMarkup.includes('ALL MD 총공 공구 · Wappen'));assert.ok(mainMarkup.includes('94,800원'));assert.ok(mainMarkup.includes('1회 무료배송'));assert.equal(run('result.products.wappen'),5);assert.equal(run('result.showcaseEntries'),0);
run("answers={...defaults,groupbuy:'compare',budget:16900,cap:1,music:'cd'};results();");assert.ok(mainMarkup.includes('16,900원'));assert.ok(mainMarkup.includes('배송비 미확인 · 상품가 기준 조건부 추천'));assert.ok(mainMarkup.includes('배송비 확인 전 잔액'));
run("answers.groupShipping_allmd=4000;answers.groupShipping_ktown=4000;results();");assert.ok(mainMarkup.includes('구매 보류'));
run("answers={...defaults,groupbuy:'compare'};settingsOpen();");assert.ok(markup.includes('settings-groupbuy'));assert.ok(markup.includes('groupShipping_allmd'));
run("calcShop='allmd';calcCounts={standard:0,limited:0,qr:0,qrset:1,wappen:0};view='calculator';calculator();");assert.ok(markup.includes('36,200원'));assert.ok(mainMarkup.includes('calc-shop'));
assert.equal(run("validAnswers({groupbuy:'<script>',groupShipping_allmd:-1}).groupbuy"),'compare');assert.equal(run("validAnswers({groupbuy:'allmd',groupShipping_allmd:4000}).groupShipping_allmd"),4000);
console.log('PASS group-buy selection, actual purchase labels, shipping status and inputs, calculator and URL validation.');

run("answers={...defaults,pob:'want',pobFormat:'set',pobKind:'individual'};step=4;quiz();");assert.ok(mainMarkup.includes('pob-kind'));assert.ok(mainMarkup.includes('pob-priority'));assert.ok(mainMarkup.includes('CU · QR 5종 세트'));assert.ok(!mainMarkup.includes('CU · Wappen 2개 세트'));
run("answers={...defaults,pob:'want',pobFormat:'set',goal:'cards',budget:50000,cap:8,groupbuy:'compare',groupShipping_allmd:3000,groupShipping_ktown:3000};view='result';results();");assert.equal(run('result.offers[0].id'),'cu-qr');assert.ok(mainMarkup.includes('44,500원'));assert.ok(mainMarkup.includes('개인 미공포 5장'));assert.ok(mainMarkup.includes('특전 후보를 이렇게 비교'));assert.ok(mainMarkup.includes('CU · Wappen 2개 세트'));assert.ok(mainMarkup.includes('25'));
run("answers.cap=3;results();");assert.ok(mainMarkup.includes('보관 상한 초과 · 상품만 5개'));
run("answers={...defaults,pob:'want',pobFormat:'set',pobKind:'unit',goal:'cards',budget:50000,cap:8};results();");assert.equal(run('result.offers[0].id'),'cu-wappen');
assert.equal(run("validAnswers({pobKind:'fake',pobPriority:'fake'}).pobKind"),'any');assert.equal(run("validAnswers({pob:'want',pobKind:'unit',pobOffer:'cu-qr'}).pobOffer"),'auto');assert.ok(run("summaryText()").includes('유닛'));
console.log('PASS gift kind/priority controls, CU QR fairness, candidate reasons and distinct-gift disclosure.');

run("loadState({answers:{groupbuy:'none',pob:'none',budget:16900,cap:1,music:'cd'}});view='result';results();");assert.equal(run('answers.groupbuy'),'compare');assert.ok(mainMarkup.includes('16,900원'));assert.ok(mainMarkup.includes('ALL MD 총공 공구 · Standard'));
run("answers={...defaults,pob:'want',pobOffer:'cu-qr',budget:44500,cap:5,collect:'complete',scope:'qr'};results();");assert.ok(mainMarkup.includes('44,500원'));assert.ok(mainMarkup.includes('공구 상품가 기준'));assert.ok(mainMarkup.includes('72,400원'));
run("calcShop='auto';calcCounts={standard:0,limited:0,qr:0,qrset:1,wappen:0};view='calculator';calculator();");assert.ok(markup.includes('36,200원'));assert.ok(!mainMarkup.includes('일반 기준가'));
run("answers={...defaults};step=1;quiz();");assert.ok(!mainMarkup.includes('공구 제외'));assert.ok(mainMarkup.includes('미공포 없는 앨범은 공구가로 예산'));
console.log('PASS mandatory bare group prices in recommendation, old links, collection roadmap, calculator and budget controls.');

run("answers={...defaults,budget:0,pob:'none'};results();");assert.ok(mainMarkup.includes('가장 저렴한 단품은 7,300원'));
console.log('PASS empty-budget guidance also uses the bare group price.');
