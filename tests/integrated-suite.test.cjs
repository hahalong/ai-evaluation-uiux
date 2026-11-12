const assert = require('node:assert/strict');
const C = require('../dist/plaza-core');
const E = require('../dist/evaluation-core');
const F = require('../dist/flow-core');

const state = C.initial();
F.init(state);
const assets = E.create({});
const object = state.objects.find(item=>item.upstream==='pet-agent');
const spec = {objectId:object.id,testVersion:'pet-agent@1.5.0',environment:'test',data:'ds-dialog@3',
  caseRefs:['CASE-EXAMPLE-PET@1'],metric:'metric-complete@2',repeats:1};
const suite = assets.adopt({id:'SUITE-TEST',version:'r1',kind:'suite',name:'授权回归',config:{reusableSuite:spec}});
const rehearsal = C.rehearseSuite(state,suite);
assert.deepEqual(rehearsal.cases.map(item=>item.actual),['PASS','BLOCK','INCONCLUSIVE']);
assert.equal(state.tasks.length,1,'试跑不会插入一条评测任务');
assert.equal(rehearsal.scoring.metricRef,spec.metric);
assert.equal(C.suiteAvailable(suite),false);

assets.validate(suite,[{ok:true},{ok:true}]);
assets.evidence(suite,{...rehearsal,digest:E.digest(suite)});
assets.submit(suite);
const technical = {id:'engineer',name:'林工'}, business = {id:'business',name:'赵经理'};
assets.ordinaryConfirm(suite,'technical',technical);
assert.throws(()=>assets.publishOrdinary(suite,technical),/双人确认/);
assets.ordinaryConfirm(suite,'business',business);
assets.publishOrdinary(suite,technical);
assert(C.suiteAvailable(suite));
assert.equal(suite.governance.validation.evidence.id,rehearsal.id);

const task = C.createTask(state,{name:'版本回归',goal:'核对授权和设备状态',type:'AGENT'});
C.applySuite(state,task,suite);
assert.equal(task.materials.suite,E.key(suite));
assert.deepEqual(task.caseRefs,spec.caseRefs);
assert.equal(task.versionId,spec.testVersion);
C.editTask(task,'versionId','pet-agent@1.6.0');
assert(C.preflight(state,task,suite).ok,'同一对象的兼容版本可以复用');
C.confirm(state,task,'engineer',suite);
C.confirm(state,task,'business',suite);

const revised = assets.revise(suite);
assert.equal(C.suiteAvailable(revised),false);
assert.throws(()=>C.start(state,task,revised),/复检未通过/);
assert.equal(task.run,undefined);
C.start(state,task,suite);
C.finish(task);
assert.equal(task.run.manifest.materials.suite,'SUITE-TEST@r1');
assert.equal(task.run.manifest.version,'pet-agent@1.6.0');
assert.equal(task.run.flow.snapshot.metric.value,1);
assert.throws(()=>C.applySuite(state,task,suite),/评测草稿/);

const next = C.createTask(state,{name:'再次回归',goal:'回归拒绝行为',type:'AGENT'});
C.applySuite(state,next,suite);
assets.retire(suite);
assert.equal(C.preflight(state,next,suite).ok,false,'已停用的套件拦截新运行');
assert.equal(task.run.manifest.materials.suite,'SUITE-TEST@r1');
console.log('PASS 套件试跑、同版本确认发布、精确复用与冻结报告');
