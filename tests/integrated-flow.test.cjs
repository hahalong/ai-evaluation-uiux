const assert=require('node:assert/strict'),F=require('../dist/flow-core'),C=require('../dist/plaza-core');let pass=0;function test(name,fn){fn();console.log('PASS '+name);pass++;}
function setup(type='AGENT'){const s=C.initial();F.init(s);const t=C.task(s);t.type=type;t.caseRefs=[type==='MODEL'?'CASE-EXAMPLE-MODEL@1':type==='APPLICATION'?'CASE-EXAMPLE-RAG@1':'CASE-EXAMPLE-PET@1'];const o=s.objects.find(o=>o.type===type);C.bind(s,t,o,o.versions[0],'test');if(type==='MODEL')t.materials={data:'ds-fact@1',metrics:'metric-accuracy@1',cases:''};if(type==='APPLICATION')t.materials={data:'ds-fact@1',metrics:'metric-ground@1',cases:''};return {s,t,o,v:o.versions[0]};}
function run(fixture='normal',type='AGENT'){const x=setup(type);x.t.flowPlan.fixture=fixture;assert.equal(C.preflight(x.s,x.t).ok,true);C.confirm(x.s,x.t,'engineer');C.confirm(x.s,x.t,'business');C.start(x.s,x.t);C.finish(x.t);return x;}
test('文字用例未绑定动作不能验证',()=>{const f=F.seed(),c=F.draft(f,{name:'文字说明'});c.goal='确认';c.description='点击按钮';assert(!F.validate(f,c).ok);});
test('已发布用例不可原地编辑',()=>{const {s}=setup();assert.throws(()=>F.edit(s.flow.cases[0],'name','new'));});
test('新增版本不改旧版本与审核',()=>{const {s}=setup(),c=s.flow.cases[0],before=JSON.stringify(c);const n=F.revise(s.flow,c);F.edit(n,'name','新用例');assert.equal(JSON.stringify(c),before);assert.equal(n.status,'DRAFT');});
test('编辑使自测失效',()=>{const {s}=setup(),c=F.revise(s.flow,s.flow.cases[0]);F.validate(s.flow,c);F.edit(c,'input','变化');assert.equal(c.validation,null);assert.throws(()=>F.submit(s.flow,c));});
test('发布需专家确认和独立质量审核',()=>{const {s}=setup(),c=F.revise(s.flow,s.flow.cases[0]);F.validate(s.flow,c);F.submit(s.flow,c);assert.throws(()=>F.approve(c,'quality'));F.approve(c,'expert');F.approve(c,'quality');assert.equal(c.status,'PUBLISHED');});
test('不兼容能力给出原因',()=>{const {s,t,v}=setup();const r=F.matches(s.flow,t,v).rows[0];assert(r.candidates.find(c=>c.id==='request-runner@1').why.length);});
test('失效执行器阻断运行前检查',()=>{const {s,t}=setup();s.flow.capabilities[0].status='PAUSED';assert(!C.preflight(s,t).ok);});
test('缺调用适配器不能匹配',()=>{const {s,t,v}=setup();v.bindings={};assert(!F.matches(s.flow,t,v).ok);});
test('无Worker不能执行',()=>{const {s,t}=setup();s.flow.resources.workerReady=false;assert(!C.preflight(s,t).ok);});
test('无执行身份授权不能执行',()=>{const {s,t}=setup();s.flow.resources.authorized=false;assert(!C.preflight(s,t).ok);});
test('已停用用例不可放行',()=>{const {s,t}=setup();s.flow.cases[0].active=false;assert(!C.preflight(s,t).ok);});
test('未选用例不生成空集合通过',()=>{const {s,t}=setup();t.caseRefs=[];assert(!C.preflight(s,t).ok);});
test('正常结果按所选一条用例统计',()=>{const {t}=run();assert.equal(t.result.executed,1);assert.equal(t.result.gate,'PASS');});
test('必需质量失败为BLOCK',()=>{const {t}=run('violation');assert.equal(t.result.gate,'BLOCK');});
test('缺证为无法判断，数值不填0',()=>{const {t}=run('missing');assert.equal(t.result.gate,'INCONCLUSIVE');const sc=t.run.flow.items[0].scores[0];assert.equal(sc.value,null);assert.equal(sc.validity,'INVALID');});
test('技术恢复不增加trial分母',()=>{const {t}=run('retry');assert.equal(t.result.planned,1);assert.equal(t.result.attempts,2);});
test('评分器故障不等于质量失败',()=>{const {t}=run('judgeError','APPLICATION');assert.equal(t.result.gate,'INCONCLUSIVE');assert.equal(t.result.failed,0);});
test('清理失败环境隔离不能PASS',()=>{const {t}=run('cleanup');assert.equal(t.run.flow.cleanup,'QUARANTINED');assert.equal(t.result.gate,'INCONCLUSIVE');});
test('取消保留未执行覆盖，不自动通过',()=>{const {s,t}=setup();C.preflight(s,t);C.confirm(s,t,'engineer');C.confirm(s,t,'business');C.start(s,t);F.cancel(t);assert.equal(t.result.gate,'INCONCLUSIVE');assert.equal(t.result.executed,0);});
test('冻结清单不跟随资产编辑',()=>{const {t,s}=run();const old=JSON.stringify(t.run.manifest);F.revise(s.flow,s.flow.cases[0]);s.flow.capabilities[0].status='PAUSED';assert.equal(JSON.stringify(t.run.manifest),old);});
test('计划多次trial准确汇总',()=>{const {s,t}=setup();t.flowPlan.repeats=3;C.preflight(s,t);C.confirm(s,t,'engineer');C.confirm(s,t,'business');C.start(s,t);C.finish(t);assert.equal(t.result.planned,3);assert.equal(t.result.passed,3);});
test('人工复核保留历史快照',()=>{const {s,t}=setup();const c=s.flow.cases[0];c.rules.push(F.rule('human'));c.validation=F.validate(s.flow,c);C.preflight(s,t);C.confirm(s,t,'engineer');C.confirm(s,t,'business');C.start(s,t);C.finish(t);assert.equal(t.result.gate,'INCONCLUSIVE');assert.throws(()=>F.review(t,t.run.flow.items[0].id,'PASS','证据','engineer'));F.review(t,t.run.flow.items[0].id,'PASS','已核对拒绝话术与状态轨迹','expert');assert.equal(t.result.gate,'PASS');assert.equal(t.run.flow.snapshots.length,2);assert.equal(t.run.flow.snapshots[0].summary.gate,'INCONCLUSIVE');});
test('异构用例分别匹配执行器并统一汇总',()=>{const {s,t,v}=setup();v.bindings.script='program-adapter@1';t.caseRefs.push('CASE-EXAMPLE-OFFICE@1');const m=F.matches(s.flow,t,v);assert(m.ok);assert.equal(new Set(m.rows.map(x=>x.executor)).size,2);C.preflight(s,t);C.confirm(s,t,'engineer');C.confirm(s,t,'business');C.start(s,t);C.finish(t);assert.equal(t.result.executed,2);assert.equal(t.result.gate,'PASS');});
test('同优先级候选必须明确选择',()=>{const {s,t,v}=setup();const extra=F.clone(s.flow.capabilities[0]);extra.id='event-runner-alt@1';s.flow.capabilities.push(extra);assert(!F.matches(s.flow,t,v).ok);t.flowPlan.selection[t.caseRefs[0]]=extra.id;assert(F.matches(s.flow,t,v).ok);});
test('确认后能力变更要求重新确认',()=>{const {s,t}=setup();C.preflight(s,t);C.confirm(s,t,'engineer');C.confirm(s,t,'business');s.flow.capabilities[0].digest='new-artifact';assert.throws(()=>C.start(s,t));assert.equal(t.run,undefined);});
test('无效重复方案不创建运行',()=>{const {s,t}=setup();t.flowPlan.repeats=0;assert(!C.preflight(s,t).ok);assert.throws(()=>C.start(s,t));assert.equal(t.run,undefined);});
test('证据记录包含原始值，评分可追溯',()=>{const {t}=run('violation');const item=t.run.flow.items[0];assert.equal(item.evidence.find(e=>e.kind==='tool').payload.attempts.length,1);assert.equal(item.scores.find(s=>s.kind==='no_call').value,1);});
console.log(pass+' meaningful checks passed');
