const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};vm.runInNewContext(fs.readFileSync('dist/scenario-fixtures.js','utf8'),context);const F=JSON.parse(JSON.stringify(context.window.SCENARIO_FIXTURES)),E=require('../dist/scenario-engine.js');let checks=0;const test=(label,fn)=>{fn();checks++;console.log('OK '+label)};
for(const [key,s]of Object.entries(F)){
 const ds=E.dataset(s,s.raw,s.mapping),cases=E.cases(s,ds),plan={metrics:['accuracy','boundary','evidence'],tolerance:.01,confidence:.8,judgeRequired:false};
 test(key+' actual fixture outcomes',()=>{const summary=E.aggregate(cases.map(c=>E.score(s,c,s.responses[c.id],plan)));assert.equal(summary.pass,key==='pet'?7:['math','extract'].includes(key)?1:4);assert.equal(summary.fail,key==='pet'?0:1);assert.equal(summary.unknown,1)});
 test(key+' pilot computes known classes',()=>assert(E.pilot(s,cases,plan).every(x=>x.expected===x.actual)));
 test(key+' mapper rejects nonexistent field',()=>assert.throws(()=>E.probe(s,{mode:'replay',responsePath:'result',timeout:30},cases[0],s.responses[cases[0].id]),/路径不存在/));
 test(key+' real endpoint cannot claim ready',()=>assert.throws(()=>E.probe(s,{mode:'live'},cases[0],s.responses[cases[0].id]),/服务端/));
 test(key+' requests exclude scoring reference',()=>{const p=E.probe(s,{mode:'replay',responsePath:'payload',timeout:30},cases[0],s.responses[cases[0].id]);assert(!('expected'in p.request.body));assert(!JSON.stringify(p.request).includes('GOLD-'))});
 const rows=cases.map(c=>E.score(s,c,s.responses[c.id],plan)),run={rows,manifest:{object:{version:s.version}}};
 test(key+' mismatched supplement rejected',()=>assert.throws(()=>E.supplement(s,run,{...s.supplement,request_id:'OTHER'}),/不匹配/));
 test(key+' valid supplement evaluated without overwriting r1',()=>{const original=JSON.stringify(rows);const p=E.supplement(s,run,s.supplement);const result=E.score(s,cases.find(c=>c.id===p.caseId),p.raw,plan);assert.equal(result.status,'PASS');assert.equal(JSON.stringify(rows),original)});
 test(key+' incorrect supplement does not force PASS',()=>{const obs=key==='office'?{pages:8,overflow_count:2}:key==='pet'?{air_purifier_on:false,observed_at_ms:1300}:key==='math'?{answer:59}:key==='extract'?{order_id:'OTHER',amount:999,currency:'USD'}:[{doc_id:'OTHER',version:'old',quote:'fake'}];const p=E.supplement(s,run,{...s.supplement,observation:obs});assert.equal(E.score(s,cases.find(c=>c.id===p.caseId),p.raw,plan).status,'FAIL')});
 test(key+' missing response never passes',()=>assert.equal(E.score(s,cases[0],null,plan).status,'UNKNOWN'));
 test(key+' required judge cannot invent score',()=>assert.equal(E.score(s,cases[0],s.responses[cases[0].id],{...plan,judgeRequired:true}).status,'UNKNOWN'));
}
test('changed sales input changes verdict',()=>{const s=F.office,ds=E.dataset(s,s.raw.replace('10,3000','10,4000'),s.mapping),c=E.cases(s,ds)[0];assert.equal(c.expected.total_cny,130000);assert.equal(E.score(s,c,s.responses.OA01,{metrics:['accuracy'],tolerance:.01}).status,'FAIL')});
test('duplicate ID blocked',()=>assert.throws(()=>E.dataset(F.office,F.office.raw.replace('SO260702','SO260701'),F.office.mapping),/重复/));
test('invalid number blocked',()=>assert.throws(()=>E.dataset(F.office,F.office.raw.replace('10,3000','ten,3000'),F.office.mapping),/非负数/));
test('wrong scope reference blocked',()=>{const s=F.rag,p=JSON.parse(s.raw);p.queries[0].doc_id='MISSING';assert.throws(()=>E.dataset(s,JSON.stringify(p),s.mapping),/不存在/)});
test('hard failure overrides missing evidence',()=>assert.equal(E.aggregate([{status:'FAIL'},{status:'UNKNOWN'}]).verdict,'BLOCK'));
test('pet case expectation follows configured threshold',()=>{const s=F.pet,ds=E.dataset(s,s.raw,s.mapping),c=E.cases(s,ds,{confidence:.99})[0];assert.equal(c.expected.start_service,false);assert.equal(c.expected.air_purifier_on,false);assert.equal(c.expected.ask_user_first,true);assert.equal(E.score(s,c,s.responses.P01,{metrics:['accuracy','boundary','evidence'],confidence:.99}).status,'FAIL')});
test('empty results and unresolved mandatory conditions never pass',()=>{assert.equal(E.aggregate([]).verdict,'INCONCLUSIVE');for(const flag of ['reviewPending','qualificationMissing','coverageMissing','statisticalUncertainty']){assert.equal(E.aggregate([{status:'PASS'}],{[flag]:true}).verdict,'INCONCLUSIVE');assert.equal(E.aggregate([{status:'FAIL'},{status:'UNKNOWN'}],{[flag]:true}).verdict,flag==='reviewPending'?'INCONCLUSIVE':'BLOCK');}});
console.log('PASS '+checks+' meaningful checks');
