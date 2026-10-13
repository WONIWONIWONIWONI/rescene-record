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
const context={document,localStorage:{getItem(){return null;},setItem(){}},location:{hash:'',origin:'https://example.test',pathname:'/'},navigator:{clipboard:{async writeText(){}}},console,clearTimeout,setTimeout,FormData:class{},window:{scrollTo(){},addEventListener(){},print(){}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('pulse-fit/engine.js','utf8'),context);vm.runInContext(fs.readFileSync('pulse-fit/app.js','utf8'),context);
function run(code){return vm.runInContext(code,context);}
assert.ok(mainMarkup.includes('마음은 이미'));
for(let step=0;step<9;step++){run(`step=${step};view='quiz';quiz();`);assert.ok(mainMarkup.includes(`${step+1} / 9`));assert.ok(mainMarkup.includes('id="quiz-next"'));}
run("answers={...defaults,collect:'complete',scope:'qr'};step=3;quiz();");assert.ok(mainMarkup.includes('scope-select'));
run("answers={...defaults,cap:12};step=6;quiz();");assert.ok(mainMarkup.includes('cap-value'));
run("answers={...defaults};view='result';results();");assert.ok(mainMarkup.includes('40,800원'));assert.ok(mainMarkup.includes('나의 PULSE 구매 보고서'));
run("answers={...defaults,budget:378500,cap:25,collect:'complete',scope:'all',goal:'cards'};results();");assert.ok(mainMarkup.includes('378,500원'));assert.ok(mainMarkup.includes('교환 전제 최소 25개'));assert.ok(mainMarkup.includes('QR 5종 세트'));
run("answers={...defaults,budget:0};results();");assert.ok(mainMarkup.includes('지금은 구매 보류'));
run("view='compare';compare();");assert.ok(mainMarkup.includes('15종 중 3장'));assert.ok(mainMarkup.includes('Wappen'));
run("view='calculator';calculator();");assert.ok(markup.includes('44,500원'));assert.ok(markup.includes('25장'));
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
console.log('PASS 9 question templates, all main pages, result branches, calculator and URL input validation (document facade; not browser layout QA).');
