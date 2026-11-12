const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/prd-contracts'),E=require('../dist/prd-engine');
test('scorer registration preserves multiple object types and independent protocols/types',()=>{
 const a=C.capability({name:'通用事实评分器',kind:'scorer',targets:['模型','非Agent应用'],protocols:['async_job'],taskTypeRefs:['application.summary@1.0']});
 assert.deepEqual(a.targets,['模型','非Agent应用']);assert.equal(a.kind,'scorer');assert.deepEqual(a.config.protocols,['async_job']);assert.deepEqual(a.config.taskTypeRefs,['application.summary@1.0']);assert.equal(a.config.matchingStatus,'UNVERIFIED');
});
test('partial drafts never infer Agent scope, task type or protocol from scoring role',()=>{
 const a=C.capability({name:'待补充评分器',kind:'scorer'});assert.deepEqual(a.targets,[]);assert.deepEqual(a.config.taskTypeRefs,[]);assert.deepEqual(a.config.protocols,[]);
});
test('each executable responsibility is retained and bad references are rejected',()=>{
 for(const kind of ['executor','adapter','scorer','check'])assert.equal(C.capability({name:kind,kind}).kind,kind);
 assert.throws(()=>C.capability({name:'x',kind:'评分 / 检查'}),/能力类型/);
 assert.throws(()=>C.capability({name:'x',kind:'scorer',taskTypeRefs:['OfficeAgent']}),/稳定 key/);
});
test('changing object category removes hidden replay inputs, evidence and confirmation',()=>{
 const p={scene:'pdf',outputs:{total:128000},metricIds:['M12'],dependencies:[{id:'INPUT-pdf'}],manifest:{hash:'old'},pilot:{},preflight:{},confirmations:{business:{}},connectionVerified:true};C.clearReplay(p);
 assert.equal(p.scene,null);assert.deepEqual(p.dependencies,[]);assert.deepEqual(p.metricIds,[]);assert.equal(p.manifest,null);assert.equal(p.connectionVerified,false);assert.deepEqual(p.confirmations,{});
 const t={object:'摘要服务',goal:'摘要保真',budget:10,prd:p};assert.ok(E.preflight(t,null).gaps.some(g=>g.field==='capability'));
});
