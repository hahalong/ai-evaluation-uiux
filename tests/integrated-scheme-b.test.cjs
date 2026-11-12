const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../dist/evaluation-core');
const F = require('../dist/flow-core');
const C = require('../dist/plaza-core');
const M = require('../dist/multi-env-core');

const assets = E.create({});
const original = assets.adopt({id:'SAMPLES',version:'r1',kind:'dataset',content:[1]});
const revised = assets.adopt({id:'SAMPLES',version:'r2',kind:'dataset',content:[1,2]});
assert.equal(assets.find('SAMPLES','r2'),revised);
assert.equal(assets.find('SAMPLES@r1'),original);
assert.equal(assets.find('SAMPLES','r99'),undefined);

const s = C.initial();
F.init(s);
const t = C.task(s), object = s.objects.find(o=>o.name==='宠物主动服务 Agent');
const [latest, fixed] = object.versions;
C.bind(s,t,object,latest,'test');
const wrongMetric = {id:'A84-METRIC-ACTUATION@r2',types:['AGENT'],binding:{route:'bench',schema:'bench.confirmed-hvac@1'}};
const unbound = {id:'DEFINED-ONLY@r2',types:['AGENT']};
C.MATERIALS.metrics.push(wrongMetric,unbound);
for (const [metric,error] of [[wrongMetric,/bench\.confirmed-hvac/],[unbound,/尚未绑定可执行评分/]]) {
  t.materials.metrics=metric.id;
  const check = C.preflight(s,t);
  assert.equal(check.ok,false);
  assert.match(check.checks.find(row=>row.key==='metrics').detail,error);
  assert.throws(()=>C.start(s,t),/复检未通过/);
}
t.materials.metrics='metric-complete@2';
assert(C.preflight(s,t).ok);
C.confirm(s,t,'engineer');C.confirm(s,t,'business');C.start(s,t);C.finish(t);
assert.equal(t.run.manifest.scoring.metricRef,t.materials.metrics);
assert.equal(t.run.flow.snapshot.metric.value,1);
assert.equal(t.run.flow.snapshot.metric.denominator,1);
assert.deepEqual(t.run.flow.snapshot.metric.rows[0].scores.map(row=>row.implementation),['consent-check@1','state-check@1']);
console.log('PASS exact asset versions and ordinary metric preflight / snapshot');

const ctx = vm.createContext({EvaluationCore:E,EvaluationFlow:F});
ctx.window=ctx;
for (const name of ['case-file-import','measure-rehearsal','a84-v2-fixtures','a84-metric-engine','agent-evaluation','a84-assessment-assets']) {
  const file=path.join(__dirname,'../dist',name+'.js');
  vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
}
const A = ctx.AgentEvaluation;
const benchAssets=E.create({},A.assets());
for (const asset of ctx.A84AssessmentAssets.prepared(benchAssets.list())) benchAssets.adopt(asset,{trusted:true});
const c = F.draft(s.flow,{name:'E03'});
const caseRef = F.revise(s.flow,c).key;
const unit = {key:'E03-bench',caseId:'E03',caseRef,environment:'bench'};
const item = {measure:'actuation'};
const rows = [{unit,item}];
const task = {id:'EVAL-V2',versionId:fixed.id,project:'cockpit',suitePlan:{childIds:{bench:'EVAL-V2-BENCH',cloud:'EVAL-V2-CLOUD'}}};
const catalog = benchAssets.list();
const draft = {caseId:unit.caseId,caseRef,measure:item.measure,source:{row:153},definition:{precondition:'待确认',steps:'点击确认',expected:'三区读回'},
  ...A.recommended(item.measure),windowMs:3000,sampleIds:['TEMP-01','TEMP-02','TEMP-03','TEMP-04']};
const saved = A.confirm(catalog,draft,[]);
const versions = {[unit.key]:[saved]};
const profile = {id:'bench@3',adapterVersion:'bench-adapter@3',executorVersion:'bench-executor@3',environment:'bench',
  qualification:{scope:A.scope,observationSchemas:['bench.confirmed-hvac@1']}};
for (const [kind,id] of [['adapter',profile.adapterVersion],['executor',profile.executorVersion]]) {
  const cap = {id,kind,project:task.project,source:'fixture',digest:id,entry:'local replay',modes:['bench-file'],
    operations:['prepare','observe','return'],evidence:[...A.needs(rows)],environments:['bench'],status:'PUBLISHED'};
  const signature = JSON.stringify([cap.source,cap.digest,cap.entry,cap.modes,cap.operations,cap.evidence,cap.environments]);
  s.flow.capabilities.push({...cap,qualification:{...profile.qualification,ok:true,signature}});
}
assert(!A.benchPreflight(task,rows,versions,catalog,profile,s.flow,latest).ok);
assert(!A.benchPreflight(task,[{unit:{...unit,caseRef:c.key},item}],versions,catalog,profile,s.flow,fixed).ok);
const old = A.confirm(catalog,{...draft,dataRef:'A84-DATA-THERMAL@r1',goldRef:'A84-GOLD-HVAC@r1',metricRef:'A84-METRIC-ACTUATION@r1'},[]);
assert(!A.benchPreflight(task,rows,{[unit.key]:[old]},catalog,profile,s.flow,fixed).ok);
const bench = A.benchRun(task,rows,versions,catalog,profile,s.flow,'BENCH-CHECK',fixed);
const dispatch = A.dispatchFile(bench.manifest);
assert(!Object.hasOwn(dispatch.entries[0].trials[0],'gold'));
const result = A.benchFixture(dispatch);
const wrongTrial = structuredClone(result);
wrongTrial.rows[0].caseVersion=c.key+'/eval-1';
assert.throws(()=>A.preview(bench,wrongTrial),/回传版本或样本不符/);
assert.throws(()=>A.preview(bench,{...result,executorVersion:'bench-executor@2'}),/执行器版本/);
assert.equal(bench.records.length,0);
assert.equal(A.accept(bench,result).added,4);
assert.equal(A.accept(bench,result).duplicates,4);
const benchReport = A.reports(bench)[0];
assert.equal(benchReport.manifest.metricRef,draft.metricRef);
assert.equal(benchReport.report.summary.passed,2);
assert.equal(benchReport.report.summary.denominator,4);
assert.equal(benchReport.report.unknown,1);
console.log('PASS E03 pinned preflight, mismatch rejection, idempotent receipts and 2/4 scoring');

const cloud = {environment:'cloud',adapterVersion:'ripple-mqtt-protobuf@1',executorVersion:'ripple-file-handoff@1'};
const pilot = {caseRef:'A8-02-02-P@1',script:{sha256:'test-frozen-sha'}};
Object.assign(task.suitePlan,{pilot,suite:{source:{}},units:[{caseId:M.defaultCaseId,caseRef:pilot.caseRef,environment:'cloud'}]});
assert(!M.ripplePreflight(task,cloud,latest).ok);
const manifest = M.makeManifest(task,cloud,fixed,'RIPPLE-CHECK');
task.suitePlan.manifest=manifest;
const receipt = M.sampleRipple(manifest);
assert.throws(()=>M.validateResult({...receipt,objectVersion:latest.id},manifest),/被测对象版本/);
assert.throws(()=>M.validateResult({...receipt,scriptSha256:'different'},manifest),/脚本摘要/);
assert.throws(()=>M.validateResult({...receipt,ruleRef:'old-rule'},manifest),/规则版本/);
const wrongEvidence = structuredClone(receipt);
wrongEvidence.results[0].evidence.find(x=>x.code==='oms-card').fact.cardCount=2;
assert.equal(M.validateResult(wrongEvidence,manifest).items[0].verdict,'FAIL');
const incomplete = structuredClone(receipt);
incomplete.results[0].evidence.pop();
assert.equal(M.validateResult(incomplete,manifest).items[0].verdict,'UNKNOWN');
assert(M.saveResult(task.suitePlan,receipt));
assert(!M.saveResult(task.suitePlan,receipt));
assert.equal(task.suitePlan.report.items[0].assertions.filter(row=>row.verdict==='PASS').length,3);
console.log('PASS Ripple pinned manifest, proof-based scoring, missing evidence and repeat receipts');
