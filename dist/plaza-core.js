/* Independent review prototype. Fixtures only; no service or credential requests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PlazaCore=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const F=typeof EvaluationFlow!=='undefined'?EvaluationFlow:typeof require==='function'?require('./flow-core.js'):null;
const TYPES={AGENT:'Agent',APPLICATION:'应用（非 Agent）',MODEL:'模型'};
const clone=x=>JSON.parse(JSON.stringify(x));
const SOURCES=[{id:'apps',name:'企业应用目录',connected:true},{id:'models',name:'模型服务目录',connected:true},{id:'factory',name:'AI Factory',connected:false}];
const CATALOG=[
 {id:'meeting-agent',source:'apps',type:'AGENT',name:'会议纪要助手',purpose:'整理会议记录，提取结论与待办',owner:'林工',versions:['1.2.0','1.1.0']},
 {id:'pet-agent',source:'apps',type:'AGENT',name:'宠物主动服务 Agent',purpose:'识别携宠场景，完成授权后的服务',owner:'林工',versions:['1.6.0','1.5.0']},
 {id:'office-agent',source:'apps',type:'AGENT',name:'Office 文档助手',purpose:'读取文档，核对金额并输出结果',owner:'陈工',versions:['2.4.0','2.3.0']},
 {id:'policy-rag',source:'apps',type:'APPLICATION',name:'制度问答应用',purpose:'根据固定知识版本回答问题并提供引用',owner:'陈工',versions:['3.2.0','3.1.0']},
 {id:'reason-model',source:'models',type:'MODEL',name:'通用推理模型',purpose:'回答知识和数值推理问题',owner:'王工',versions:['2026.10','2026.09']},
 {id:'extract-app',source:'apps',type:'APPLICATION',name:'票据字段提取',purpose:'从业务票据中提取指定字段',owner:'陈工',versions:['1.0.0']}
];
const ENVIRONMENTS=[{id:'test',name:'内网测试环境',identity:'svc-eval-review',available:true,reachable:true},{id:'isolated',name:'隔离验证环境',identity:'svc-eval-isolated',available:true,reachable:false}];
const MATERIALS={data:[{id:'ds-dialog@3',name:'助手业务对话',version:'v3',count:'48 条',types:['AGENT']},{id:'ds-doc@2',name:'文档与金额样本',version:'v2',count:'24 份',types:['AGENT','APPLICATION']},{id:'ds-fact@1',name:'知识与数值题',version:'v1',count:'60 题',types:['MODEL','APPLICATION']}],cases:[{id:'case-consent@2',name:'授权、拒绝与任务完成',version:'v2',count:'12 个用例',types:['AGENT']},{id:'case-output@1',name:'输出与来源核对',version:'v1',count:'8 个用例',types:['APPLICATION','MODEL','AGENT']}],metrics:[{id:'metric-complete@2',name:'任务完成与拒绝遵从',version:'v2',count:'确定性规则',types:['AGENT']},{id:'metric-ground@1',name:'内容正确性与引用支持',version:'v1',count:'规则＋人工复核',types:['AGENT','APPLICATION']},{id:'metric-accuracy@1',name:'答案正确率',version:'v1',count:'确定性评分',types:['MODEL','APPLICATION']}]};
function fixedVersion(source,row,version){return {id:row.id+'@'+version,label:version,build:'demo-build:'+row.id+':'+version,adapter:'standard-api@1.0',bindings:row.id==='pet-agent'?{event:'event-adapter@1',request:'standard-api@1.0'}:row.id==='office-agent'?{script:'program-adapter@1',request:'standard-api@1.0'}:{request:'standard-api@1.0'},endpoint:'registry-demo/'+row.id,credential:'已授权凭证 · '+source,envs:['test','isolated'],checks:{},modelRef:row.type==='AGENT'?'obj-model':null};}
function initial(){
 const objects=CATALOG.filter(x=>['pet-agent','office-agent','policy-rag','reason-model'].includes(x.id)).map((x,i)=>({id:x.type==='MODEL'?'obj-model':'obj-'+(i+1),project:'cockpit',type:x.type,name:x.name,purpose:x.purpose,owner:x.owner,source:x.source,upstream:x.id,visible:true,versions:x.versions.map(v=>fixedVersion(x.source,x,v))}));
 for(const o of objects)for(const v of o.versions)v.checks.test={ok:true,at:'2026-11-03T01:00:00.000Z',environment:'test',identity:'svc-eval-review',version:v.id,signature:v.id+'|test|'+v.endpoint+'|'+v.adapter+'|'+v.credential,items:['连通','鉴权','版本识别','输入输出格式'].map(label=>({label,ok:true,detail:'演示验证记录'})),synthetic:true};
 objects.find(o=>o.upstream==='office-agent').versions[0].checks={};
 return {schema:1,objects,tasks:[{id:'EV-N001',name:'助手新版本评测',goal:'验证新版本在业务对话中的任务完成与拒绝遵从。',requirement:'',type:'AGENT',project:'cockpit',objectId:null,versionId:null,environment:'test',pending:{},materials:{data:'ds-dialog@3',cases:'case-consent@2',metrics:'metric-complete@2'},step:0,status:'DRAFT',events:[],confirmations:{},preflight:null}],activeTask:'EV-N001',counter:1,registration:null,demo:{canCreate:true,sourceConnected:true,failure:'none',revoked:false,drift:false},settings:{mode:'S1'}};
}
function task(s,id=s.activeTask){return s.tasks.find(t=>t.id===id);}
function object(s,id){return s.objects.find(o=>o.id===id&&o.visible);}
function version(o,id){return o?.versions.find(v=>v.id===id);}
function createTask(s,input={}){const t={id:'EV-N'+String(++s.counter).padStart(3,'0'),name:input.name||'未命名评测',goal:input.goal||'',requirement:'',type:input.type||'AGENT',project:'cockpit',objectId:input.objectId||null,versionId:input.versionId||null,environment:input.environment||'test',pending:{},materials:{data:'',cases:'',metrics:''},step:0,status:'DRAFT',events:[],confirmations:{},preflight:null};t.caseRefs=[];F.ensureTask(t);s.tasks.unshift(t);s.activeTask=t.id;return t;}
function invalidate(t){t.preflight=null;t.confirmations={};if(!['RUNNING','COMPLETED','CANCELLED'].includes(t.status))t.status='DRAFT';}
function editTask(t,key,value){if(t[key]!==value){t[key]=value;invalidate(t);}}
function beginRegistration(s,{type='AGENT',name='',taskId=null,objectId=null}={}){
 const t=task(s,taskId),o=object(s,objectId);if(t)t.savedAt=new Date().toISOString();
 s.registration={step:0,taskId,objectId:o?.id||null,type:o?.type||type,name:o?.name||name,purpose:o?.purpose||t?.goal||'',owner:o?.owner||'林工',source:o?.source||(type==='MODEL'?'models':'apps'),upstream:o?.upstream||'',method:o?'source':'source',versionLabel:'',environment:'test',result:null,error:'',validationState:'idle'};
 if(o){s.registration.versionLabel=o.versions[0]?.label||'';s.registration.step=1;}
 return s.registration;
}
function selectSourceObject(s,id){const r=s.registration,c=CATALOG.find(x=>x.id===id&&x.type===r.type&&x.source===r.source);if(!c)return;Object.assign(r,{name:c.name,upstream:c.id,purpose:c.purpose,owner:c.owner,versionLabel:c.versions[0],result:null});}
function identityErrors(r){return [['名称',r.name],['来源系统',r.source],['来源对象标识',r.upstream],['负责人',r.owner]].filter(([,v])=>!v?.trim()).map(([n])=>'请补充'+n);}
function register(s){const r=s.registration;if(!s.demo.canCreate)throw Error('当前账号没有创建对象权限。请联系项目管理员；仍可保存任务草稿。');if(r.method==='source'&&(!SOURCES.find(x=>x.id===r.source)?.connected||!s.demo.sourceConnected))throw Error('来源系统未连接，请联系接入负责人；仍可保存任务草稿。');const gaps=identityErrors(r);if(gaps.length)throw Error(gaps.join('；'));
 const found=s.objects.find(o=>o.project==='cockpit'&&o.source===r.source&&o.upstream===r.upstream);
 if(found&&!found.visible)throw Error('无法登记此来源对象，请联系项目管理员核对权限。');
 if(found&&found.type!==r.type)throw Error('该来源对象已按其他类型登记，请核对对象类型。');
 let o=found;if(!o){o={id:'obj-local-'+(s.objects.length+1),project:'cockpit',name:r.name.trim(),type:r.type,source:r.source,upstream:r.upstream.trim(),purpose:r.purpose,owner:r.owner,visible:true,versions:[]};s.objects.push(o);}
 r.objectId=o.id;r.step=1;r.reused=!!found;r.error='';return o;
}
function availableCatalog(r){return CATALOG.find(c=>c.source===r.source&&c.id===r.upstream&&c.type===r.type);}
function prepareVersion(s){const r=s.registration,o=object(s,r.objectId),c=availableCatalog(r);if(!o)throw Error('请先完成对象登记。');if(!r.versionLabel)throw Error('请选择固定版本。');if(!c||!c.versions.includes(r.versionLabel))throw Error('此来源尚无已登记的版本与调用入口。请联系接入负责人补齐。');
 let v=o.versions.find(v=>v.label===r.versionLabel);if(!v){v=fixedVersion(r.source,c,r.versionLabel);o.versions.push(v);}return v;
}
function signature(v,env){return [v.id,env,v.endpoint,v.adapter,v.credential].join('|');}
function validate(s){const r=s.registration;if(!s.demo.sourceConnected)throw Error('来源系统连接已失效，请联系接入负责人。');const v=prepareVersion(s),env=ENVIRONMENTS.find(e=>e.id===r.environment),failure=s.demo.failure;
 const items=[{label:'连通',ok:!!env?.available&&env.reachable&&failure!=='network',detail:!env?.available?'没有可用环境':(!env.reachable||failure==='network')?'地址不可达':'执行环境已收到响应'},
 {label:'鉴权',ok:!s.demo.revoked&&failure!=='auth',detail:s.demo.revoked||failure==='auth'?'调用未授权':'实际执行身份已获授权'},
 {label:'版本识别',ok:!s.demo.drift&&failure!=='version',detail:s.demo.drift||failure==='version'?'版本无法确认':'返回版本与所选固定版本一致'},
 {label:'输入输出格式',ok:failure!=='schema',detail:failure==='schema'?'返回格式不匹配':'固定自测输入与返回结构匹配'}];
 const firstFailure=items.findIndex(x=>!x.ok);if(firstFailure>=0)items.forEach((x,i)=>{if(i>firstFailure){x.ok=null;x.detail='前置检查未通过，尚未执行';}});
 const report={ok:items.every(x=>x.ok===true),at:new Date().toISOString(),environment:r.environment,identity:env?.identity||'未分配',version:v.id,signature:signature(v,r.environment),items,synthetic:true};
 v.checks[r.environment]=report;r.result=report;r.validationState='done';return report;
}
function bind(s,t,o,v,env){if(!o?.visible||!v)throw Error('对象或版本不可用，请重新选择。');Object.assign(t,{objectId:o.id,versionId:v.id,type:o.type,environment:env,pending:{}});invalidate(t);t.savedAt=new Date().toISOString();}
function returnToTask(s,{defer=false}={}){const r=s.registration,t=task(s,r?.taskId);if(t){if(defer){t.pending={name:r.name,type:r.type,source:r.source,upstream:r.upstream,owner:r.owner,purpose:r.purpose,objectId:r.objectId,versionLabel:r.versionLabel,environment:r.environment};t.savedAt=new Date().toISOString();invalidate(t);}else{const o=object(s,r.objectId),v=prepareVersion(s);if(!r.result?.ok||r.result.signature!==signature(v,r.environment))throw Error('接入验证尚未通过，请完成接入或保存后稍后补齐。');bind(s,t,o,v,r.environment);t.events.push({at:new Date().toISOString(),text:'对象接入验证通过，已回填固定版本和环境（演示）。'});}s.activeTask=t.id;}if(!defer)s.registration=null;return t;}
function resume(s,t){const p=t.pending;if(p&&Object.keys(p).length){s.registration={step:p.objectId?1:0,taskId:t.id,objectId:p.objectId||null,type:p.type||t.type,name:p.name||'',purpose:p.purpose||t.goal,owner:p.owner||'林工',source:p.source||'apps',upstream:p.upstream||'',method:'source',versionLabel:p.versionLabel||'',environment:p.environment||'test',result:null,error:'',validationState:'idle'};return s.registration;}return beginRegistration(s,{type:t.type,taskId:t.id});}
function selectedMetric(t){return MATERIALS.metrics.find(metric=>metric.id===t.materials.metrics);}
function suiteSpec(asset){return asset?.kind==='suite' ? asset.config?.reusableSuite : null;}
function suiteAvailable(asset){
 const spec=suiteSpec(asset),g=asset?.governance;
 return Boolean(Array.isArray(spec?.caseRefs)&&spec.caseRefs.length&&asset.validated&&g?.lifecycle==='PUBLISHED'&&g.availability==='ACTIVE'&&
  g.authorization?.status==='VALID'&&g.authorization.scope==='DEMO_REPLAY_ONLY'&&
  Array.isArray(g.validation.evidence?.bindings)&&g.validation.evidence.bindings.length===spec.caseRefs.length);
}
function suiteBindings(match){return match.rows.map(row=>({caseRef:row.key,adapter:row.adapter,executor:row.executor}));}
function suiteTaskCheck(t,asset,match){
 const ref=t.materials.suite;
 if(!suiteAvailable(asset)||asset.id+'@'+asset.version!==ref)return '套件 '+ref+' 不可用，请重新选择';
 const spec=suiteSpec(asset);
 if(t.objectId!==spec.objectId||t.environment!==spec.environment)return '请选择套件对应的对象与环境';
 if(t.materials.data!==spec.data||t.materials.metrics!==spec.metric||Number(t.flowPlan.repeats)!==spec.repeats||
   JSON.stringify(t.caseRefs)!==JSON.stringify(spec.caseRefs))return '当前材料与套件固定版本不一致，请重新带入套件';
 if(JSON.stringify(suiteBindings(match))!==JSON.stringify(asset.governance.validation.evidence.bindings)){
  return '当前对象版本的接入组合与套件试跑记录不一致，请核对适配器和执行器';
 }
 return '';
}
function applySuite(s,t,asset){
 if(t.run||t.suitePlan||t.frameworkPlan)throw Error('请在普通评测草稿中引用套件。');
 if(!suiteAvailable(asset))throw Error('请选择已发布且可用的套件版本。');
 const spec=suiteSpec(asset),target=object(s,spec.objectId);
 if(!target)throw Error('套件对应的被测对象当前不可用。');
 if((t.objectId&&t.objectId!==target.id)||t.type!==target.type)throw Error('此套件不适用于任务的被测对象。');
 const selected=version(target,t.versionId||spec.testVersion);
 if(!selected)throw Error('选用的对象版本已不可用。请先为任务选择固定版本。');
 bind(s,t,target,selected,spec.environment);
 t.materials={data:spec.data,cases:'',metrics:spec.metric,suite:asset.id+'@'+asset.version};
 t.caseRefs=[...spec.caseRefs];
 t.flowPlan={repeats:spec.repeats,selection:Object.fromEntries(asset.governance.validation.evidence.bindings.map(row=>[row.caseRef,row.executor])),
  match:null,review:{},fixture:'normal'};
 return t;
}
function rehearseSuite(s,asset){
 const spec=suiteSpec(asset),target=object(s,spec.objectId),tested=version(target,spec.testVersion);
 if(!target||!tested)throw Error('请选择用于试跑的固定对象版本。');
 const task={id:'TRIAL-'+asset.id+'-'+asset.version,name:asset.name,goal:asset.name,project:target.project,type:target.type,
  objectId:target.id,versionId:tested.id,environment:spec.environment,materials:{data:spec.data,metrics:spec.metric},
  caseRefs:[...spec.caseRefs],flowPlan:{repeats:spec.repeats,selection:{},fixture:'normal'}};
 const gaps=taskChecks(s,task).filter(check=>!check.ok);
 if(gaps.length)throw Error(gaps.map(check=>check.name+'：'+check.detail).join('。'));
 const manifest=F.freeze(s.flow,task,tested,selectedMetric(task));
 const rules=manifest.caseSpecs.flatMap(entry=>entry.rules);
 const needsReview=rules.some(rule=>rule.required&&rule.kind==='human')||
  manifest.scoring.mappings.some(row=>row.ruleKinds.includes('human'));
 const scenarios=[['normal','正常观测',needsReview?'INCONCLUSIVE':'PASS'],['missing','必需证据缺失','INCONCLUSIVE']];
 if(!needsReview&&rules.some(rule=>rule.required&&['no_call','state_off'].includes(rule.kind))){
  scenarios.splice(1,0,['violation','违规观测','BLOCK']);
 }
 const cases=scenarios.map(([fixture,label,expected])=>{
  const run={...task,run:{id:task.id+'-'+fixture,progress:0}};
  F.initializeRun(run,{...manifest,plan:{...manifest.plan,fixture}});
  finish(run);
  const snapshot=run.run.flow.snapshot;
  return {id:run.run.id,label,expected,actual:snapshot?.summary.gate||'未完成',metric:snapshot?.metric,items:snapshot?.items||[]};
 });
 return {id:task.id,at:new Date().toISOString(),demo:true,scope:'DEMO_REPLAY_ONLY',
  objectVersion:tested.id,environment:spec.environment,scoring:manifest.scoring,
  bindings:manifest.bindings.map(row=>({caseRef:row.case,adapter:row.adapter,executor:row.executor})),cases};
}
function taskChecks(s,t,suite){F.init(s);F.ensureTask(t);const o=object(s,t.objectId),v=version(o,t.versionId),env=ENVIRONMENTS.find(e=>e.id===t.environment),check=v?.checks[t.environment];
 const list=[{key:'object',name:'对象与固定版本',ok:!!o&&!!v&&!s.demo.drift,detail:!o?'尚未选择被测对象':!v?'尚未选择固定版本':s.demo.drift?'运行版本已变化，请重新确认':o.name+' · '+v.label,owner:o?.owner||'评测负责人'},
 {key:'permission',name:'调用权限',ok:!!o&&!s.demo.revoked,detail:s.demo.revoked?'调用授权已失效，请联系项目管理员':o?'实际执行身份可调用（演示）':'选择对象后检查',owner:'项目管理员'},
 {key:'environment',name:'环境与接入验证',ok:s.demo.sourceConnected&&!!env?.available&&env.reachable&&!!check?.ok&&check.signature===signature(v||{},t.environment)&&s.demo.failure==='none',detail:!s.demo.sourceConnected?'来源系统连接已失效':!env?'没有可用环境':!env.reachable?'地址不可达':!check?.ok?'尚未通过所选环境的接入验证':s.demo.failure!=='none'?'运行前发现接入条件变化，请重新验证':'所选环境验证通过（演示）',owner:'接入负责人'}];
 const data=MATERIALS.data.find(x=>x.id===t.materials.data);
 const compatibleData=data?.types.includes(t.type)&&data.route!=='bench';
 list.push({key:'data',name:'测试数据',ok:!!compatibleData,detail:!data?'尚未选择':data.route==='bench'?'该样本清单需在分环境台架计划使用':compatibleData?data.name+' · '+data.id:'与当前对象类型不兼容',owner:'评测负责人'});
 const casesOK=t.caseRefs.length>0&&t.caseRefs.every(key=>{const c=F.get(s.flow,key);return c?.status==='PUBLISHED'&&c.active&&c.type===t.type;});
 list.push({key:'cases',name:'评测用例',ok:casesOK,detail:casesOK?t.caseRefs.join('、'):'请选择已发布且兼容的用例版本',owner:'评测负责人'});
 const metric=selectedMetric(t),scoring=F.compileMetric(s.flow,t,metric);
 const compatibleMetric=metric?.types.includes(t.type);
 list.push({key:'metrics',name:'指标与评分规则',ok:!!compatibleMetric&&scoring.ok,
  detail:!metric?'请选择指标版本':!compatibleMetric?'指标与当前对象类型不兼容':scoring.ok?scoring.metricRef+' · '+scoring.implementation:scoring.errors.join('；'),owner:'领域专家'});
 const repeatOK=Number.isInteger(Number(t.flowPlan.repeats))&&Number(t.flowPlan.repeats)>=1&&Number(t.flowPlan.repeats)<=20;list.push({key:'cases',name:'计划重复次数',ok:repeatOK,detail:repeatOK?t.flowPlan.repeats+' 次 / 用例':'演示重复次数需为1至20次',owner:'评测负责人'});const fm=F.matches(s.flow,t,v);list.push({key:'capabilities',name:'执行能力与执行池',ok:fm.ok,detail:fm.ok?'已匹配每个用例的执行器、适配器和证据要求':fm.resourceReason||fm.rows.filter(x=>!x.ok).map(x=>x.name+'：'+x.reason).join('；'),owner:'能力维护人 / 平台运维'});list.push({key:'goal',name:'评测目标',ok:!!t.goal.trim(),detail:t.goal.trim()?'已填写':'请说明本次要验证什么',owner:'评测负责人'});
 if(t.materials.suite){
  const issue=suiteTaskCheck(t,suite,fm);
  list.push({key:'suite',name:'套件版本与接入',ok:!issue,detail:issue||t.materials.suite,owner:'评测负责人'});
 }
 return list;
}
function planSignature(s,t){const m=F.freeze(s.flow,t,version(object(s,t.objectId),t.versionId),selectedMetric(t));delete m.frozenAt;return JSON.stringify(m);}
function preflight(s,t,suite){const checks=taskChecks(s,t,suite);t.preflight={ok:checks.every(x=>x.ok),checks,at:new Date().toISOString()};if(t.preflight.ok)t.preflight.signature=planSignature(s,t);t.confirmations={};t.status=t.preflight.ok?'READY':'BLOCKED';return t.preflight;}
function confirm(s,t,role,suite){if(!t.preflight?.ok||!taskChecks(s,t,suite).every(x=>x.ok)||t.preflight.signature!==planSignature(s,t))throw Error('准备内容或接入条件变化，请重新运行前检查。');if(!['engineer','business'].includes(role))throw Error('请由任务评测负责人或业务负责人确认。');t.confirmations[role]={actor:role,at:new Date().toISOString()};}
function start(s,t,suite){F.init(s);F.ensureTask(t);if(!t.preflight?.ok||!taskChecks(s,t,suite).every(x=>x.ok)||t.preflight.signature!==planSignature(s,t))throw Error('运行前复检未通过，请返回处理缺项。');if(!t.confirmations.engineer||!t.confirmations.business)throw Error('需要评测负责人和业务负责人分别确认。');const frozenPlan=F.freeze(s.flow,t,version(object(s,t.objectId),t.versionId),selectedMetric(t));t.status='RUNNING';t.step=4;t.run={id:'RUN-'+t.id,progress:0,mode:'SYNTHETIC_REPLAY',frozen:clone({objectId:t.objectId,versionId:t.versionId,environment:t.environment,materials:t.materials}),events:['已冻结本次对象、版本、环境与材料（演示）']};F.initializeRun(t,frozenPlan);}
function finish(t){if(t.run?.flow){let n=0;while(t.run.flow.phase!=='COMPLETED'&&t.run.flow.phase!=='CANCELLED'&&n++<500)F.step(t);}}
return {TYPES,SOURCES,CATALOG,ENVIRONMENTS,MATERIALS,clone,initial,task,object,version,createTask,editTask,invalidate,beginRegistration,selectSourceObject,identityErrors,register,availableCatalog,prepareVersion,validate,bind,returnToTask,resume,selectedMetric,suiteSpec,suiteAvailable,applySuite,rehearseSuite,taskChecks,preflight,confirm,start,finish,signature};
});
