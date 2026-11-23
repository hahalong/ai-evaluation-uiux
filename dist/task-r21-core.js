/* P02 R2.1 interaction model. Browser-local review records, never live execution. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TaskR21=api;})(globalThis,function(){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),now=()=>new Date().toISOString();
let seq=0;const id=p=>p+'-'+Date.now().toString(36)+'-'+(++seq);
const executionNames={auto:'自动执行',manual:'人工执行',records:'已有记录接收'};
const accessNames={api:'API',web:'网页',container:'容器',program:'可执行程序',sdk:'SDK'};
function signature(p){return JSON.stringify([p.execution,p.access,p.endpoint,p.credential,p.versionProof,p.protocol,p.source,p.recordKey,p.mapping,p.metrics,p.refs,p.samples,p.budget,p.owner,p.scope]);}
function ensure(t){if(!t.p02)t.p02={revision:1,execution:'auto',access:'api',endpoint:'',credential:'',versionProof:'',protocol:'',source:'',recordKey:'source_record_id',mapping:[{source:'question',target:'inputs.question'}],metrics:[],refs:[],samples:[],budget:'',owner:'评测负责人',scope:'',history:[],runs:[],reports:[],acceptances:[],confirmations:{},savedAt:null};return t.p02;}
function config(t){const p=ensure(t);return JSON.stringify([t.name,t.goal,t.requirement,t.objectId,t.versionId,t.type,t.environment,signature(p)]);}
function edit(t,values){const p=ensure(t);if(p.manifest)throw Error('方案已冻结，请先新建修订。');const before=config(t);for(const [k,v] of Object.entries(values))if(k.startsWith('task.'))t[k.slice(5)]=v;else p[k]=v;if(before!==config(t)){p.check=null;p.trial=null;p.confirmations={};}return p;}
function save(t){const p=ensure(t);p.savedAt=now();return p;}
function published(a){return a&&(a.governance?.lifecycle==='PUBLISHED'||a.status==='已发布')&&(!a.governance?.availability||a.governance.availability==='ACTIVE');}
function checks(t,{objects=[],assets=[],revoked=false,drift=false}={}){const p=ensure(t),o=objects.find(x=>x.id===t.objectId&&x.visible!==false),v=o?.versions.find(x=>x.id===t.versionId),out=[];
 const add=(key,name,ok,detail,step=0)=>out.push({key,name,ok:!!ok,detail,step});
 add('goal','评测需求',t.name?.trim()&&t.goal?.trim(),'填写任务名称与要验证的目标');
 add('object','对象固定版本',o&&v&&!drift,'选择对象和精确版本；版本变化需重新核对');
 add('permission','使用权限',!revoked,'授权有效；原型只验证演示条件');
 add('proof','版本依据',p.versionProof?.trim(),'填写构建、部署或配置版本依据');
 if(p.execution==='auto'){
  const valid=p.access==='api'||p.access==='web'?/^https?:\/\//.test(p.endpoint):!!p.endpoint.trim();
  add('access','自动接入配置',valid&&p.credential.trim(),'补齐入口与凭据引用；容器须填镜像摘要，程序须填文件校验，SDK须填包版本');
 }else if(p.execution==='manual')add('protocol','人工执行协议',p.protocol.trim(),'填写操作步骤、执行人员条件与证据要求');
 else add('source','已有记录来源',p.source.trim()&&p.recordKey.trim(),'填写记录来源与来源唯一编号字段');
 add('mapping','输入映射隔离',p.mapping.length&&p.mapping.every(r=>r.source&&r.target.startsWith('inputs.')&&!/expected|reference|gold/i.test(r.source)),'只把业务输入映射到 inputs；参考答案不送给对象',1);
 add('samples','评测样本',p.samples.length&&p.samples.every(s=>s.input?.trim()),'添加业务输入或选择已有数据集',1);
 add('metrics','指标与评分条件',p.metrics.length&&p.metrics.every(m=>m.name.trim()&&m.condition.trim()&&(m.mode==='human'?m.rubric.trim():m.scorer.trim())),'每项需通过条件；人工评分填评分规约，自动评分选择评分器',1);
 for(const r of p.refs){const a=assets.find(a=>a.id+'@'+a.version===r.key);add('asset:'+r.key,'资产：'+r.name,published(a),'必须使用已发布且可用的精确版本，草稿不能消除缺口',1);}
 if(p.execution==='auto')add('budget','预计成本',p.budget!==''&&Number.isFinite(Number(p.budget))&&Number(p.budget)>=0,'填写预计成本（元）；检查不扣费也不预留资源',1);
 return out;
}
function check(t,ctx){const p=ensure(t),items=checks(t,ctx);p.check={items,ok:items.every(i=>i.ok),signature:config(t),at:now()};return p.check;}
function trial(t,ctx){const p=ensure(t),c=check(t,ctx);if(!c.ok)throw Error('先处理运行前检查中的缺口。');p.trial={signature:config(t),at:now(),scope:'首条样本与评分材料校验',synthetic:true,ok:true};return p.trial;}
function confirm(t,role,ctx){const p=ensure(t);if(!['engineer','business'].includes(role))throw Error('由评测负责人或业务负责人确认本人范围。');if(!checks(t,ctx).every(x=>x.ok)||!p.trial?.ok||p.trial.signature!==config(t))throw Error('当前方案尚未完成检查与试评。');p.confirmations[role]={actor:role,signature:config(t),at:now()};}
function freeze(t,ctx){const p=ensure(t);if(p.manifest)return p.manifest;if(!checks(t,ctx).every(x=>x.ok)||p.trial?.signature!==config(t)||!['engineer','business'].every(r=>p.confirmations[r]?.signature===config(t)))throw Error('当前方案需完成试评及两位负责人确认。');p.manifest={id:id('MAN'),taskId:t.id,revision:p.revision,signature:config(t),at:now(),objectId:t.objectId,versionId:t.versionId,config:copy(p)};delete p.manifest.config.history;delete p.manifest.config.runs;delete p.manifest.config.reports;delete p.manifest.config.acceptances;return p.manifest;}
function revise(t){const p=ensure(t);if(!p.manifest)throw Error('当前已是可编辑草稿。');if(p.runs.some(r=>r.manifestId===p.manifest.id&&!['COMPLETED','CANCELLED'].includes(r.status)))throw Error('当前运行尚未结束，请先完成执行或核实取消结果。');p.history.push({manifest:copy(p.manifest),reports:p.reports.filter(r=>r.manifestId===p.manifest.id).map(copy)});p.revision++;p.manifest=null;p.check=null;p.trial=null;p.confirmations={};p.activeRun=null;p.activeReport=null;t.step=0;return p;}
function start(t,ctx){const p=ensure(t);if(!p.manifest)throw Error('先冻结当前方案。');if(p.manifest.signature!==config(t)||!checks(t,ctx).every(x=>x.ok))throw Error('启动复查未通过，请核对权限、版本、资产与预算。');const old=p.runs.find(r=>r.id===p.activeRun);if(old&&!['COMPLETED','CANCELLED'].includes(old.status))return old;
 const r={id:id('RUN'),manifestId:p.manifest.id,execution:p.execution,status:p.execution==='records'?'RECEIVING':p.execution==='manual'?'ASSIGNED':'RUNNING',at:now(),records:[],isolated:[],attempts:p.execution==='records'?[]:[{id:id('ATT'),status:'RUNNING',at:now()}],events:[],cleanup:'NOT_REQUIRED',actualCost:null,rerunOf:old?.id||null};p.runs.push(r);p.activeRun=r.id;return r;
}
function currentRun(t){const p=ensure(t);return p.runs.find(r=>r.id===p.activeRun);}
function runPlan(t,r){const p=ensure(t),m=p.manifest?.id===r?.manifestId?p.manifest:p.history.find(h=>h.manifest.id===r?.manifestId)?.manifest;if(!m)throw Error('找不到运行对应的冻结方案。');return m;}
function writableRun(t){const r=currentRun(t);if(!r||r.manifestId!==ensure(t).manifest?.id)throw Error('历史运行只读，请返回当前修订。');return r;}
function ingest(t,rows){const p=ensure(t),r=writableRun(t);if(!r||!['RUNNING','ASSIGNED','RECEIVING'].includes(r.status))throw Error('先启动或分派本次运行。');const m=runPlan(t,r);if(!Array.isArray(rows))throw Error('记录必须是数组。');let accepted=0,duplicate=0,isolated=0;
 for(const row of rows){if(!row||typeof row!=='object'||Array.isArray(row)){r.isolated.push({value:row,reason:'记录格式错误'});isolated++;continue;}const sourceKey=row.source_record_id||row[p.recordKey];const reason=!sourceKey?'缺少来源编号':row.version!==m.versionId?'对象版本不匹配':!row.sample_id||!p.samples.some(s=>s.id===row.sample_id)?'样本不属于冻结范围':!row.input||row.output===undefined||!row.evidence||!row.time?'输入、输出、时间或证据缺失':null;
  if(reason){r.isolated.push({...copy(row),reason});isolated++;continue;}if(r.records.some(x=>x.source_record_id===sourceKey)){duplicate++;continue;}
  r.records.push({...copy(row),source_record_id:sourceKey,id:id('REC'),receivedAt:now(),reviews:{}});accepted++;
 }r.events.push({at:now(),text:`接收 ${accepted} 条，重复 ${duplicate} 条，隔离 ${isolated} 条`});return {accepted,duplicate,isolated};
}
function complete(t){const p=ensure(t),r=writableRun(t);if(!r)throw Error('没有运行记录。');if(r.status==='CANCEL_REQUESTED')throw Error('先核实取消后的外部状态。');if(!p.samples.every(s=>r.records.some(x=>x.sample_id===s.id)))throw Error('仍有样本缺少有效执行记录。');r.status='COMPLETED';r.attempts.forEach(a=>a.status='COMPLETED');return r;}
function cancel(t){const r=writableRun(t);if(!r||['COMPLETED','CANCELLED'].includes(r.status))throw Error('该运行已结束。');r.status='CANCEL_REQUESTED';r.events.push({at:now(),text:'已请求取消，等待核实外部状态'});}
function settleCancel(t,state){const r=writableRun(t);if(r?.status!=='CANCEL_REQUESTED')throw Error('没有待核实的取消请求。');if(!['COMPLETED','CANCELLED'].includes(state))throw Error('请选择已核实的状态。');r.status=state;r.attempts.forEach(a=>a.status=state);r.events.push({at:now(),text:state==='COMPLETED'?'收到迟到完成记录，保留取消请求历史':'已核实停止'});}
function review(t,recordId,metricId,{decision,note,actor}){const p=ensure(t),r=writableRun(t),row=r?.records.find(x=>x.id===recordId),metric=p.metrics.find(m=>m.id===metricId);if(!row||!metric||metric.mode!=='human'&&!metric.reviewRequired)throw Error('没有对应的人工评分项。');if(!['expert','quality'].includes(actor))throw Error('请由评审员或质量审核人提交。');if(!['PASS','FAIL','UNKNOWN'].includes(decision)||!note.trim())throw Error('填写判定与证据依据。');if(row.reviews[metricId]?.locked)throw Error('该评审已提交并锁定，不能覆盖原记录。');row.reviews[metricId]={decision,note,actor,locked:true,at:now()};}
function report(t){const p=ensure(t),r=currentRun(t);if(!r)throw Error('先接收或产生运行记录。');const fixed=runPlan(t,r).config;const items=[];for(const s of fixed.samples)for(const m of fixed.metrics){const rec=r.records.find(x=>x.sample_id===s.id);let result='UNKNOWN',reason='缺少有效记录';if(rec){if(m.mode==='human'||m.reviewRequired){const rev=rec.reviews[m.id];result=rev?.locked?rev.decision:'UNKNOWN';reason=rev?.locked?rev.note:'必要人评未完成';}else if(m.scorer==='exact-match@1'){if(s.expected?.trim()){result=String(rec.output).trim()===s.expected.trim()?'PASS':'FAIL';reason='按固定参考逐字比对';}else reason='缺少参考答案';}else reason='评分器未接入此演示，需提交实际评分证据';}items.push({sample:s.id,metric:m.id,name:m.name,result,reason});}
 const unknown=items.some(x=>x.result==='UNKNOWN'),knownFailure=items.some(x=>x.result==='FAIL'),status=unknown?'INCONCLUSIVE':knownFailure?'BLOCK':'PASS';
 const snap={id:id('SNAP'),manifestId:r.manifestId,runId:r.id,at:now(),status,knownFailure,items,recordIds:r.records.map(x=>x.id),synthetic:true};p.reports.push(snap);p.activeReport=snap.id;return snap;
}
function accept(t,{snapshotId,decision,note,scope,actor}){const p=ensure(t),r=p.reports.find(x=>x.id===snapshotId);if(!r||actor!=='business'||!note?.trim()||!scope?.trim()||!['ACCEPT','RETURN'].includes(decision))throw Error('由业务负责人选择报告、填写验收范围与意见。');const a={id:id('ACC'),snapshotId,manifestId:r.manifestId,quality:r.status,decision,note,scope,actor,at:now()};p.acceptances.push(a);return a;}
return {copy,id,now,executionNames,accessNames,ensure,config,edit,save,published,checks,check,trial,confirm,freeze,revise,start,currentRun,ingest,complete,cancel,settleCancel,review,report,accept};
});
