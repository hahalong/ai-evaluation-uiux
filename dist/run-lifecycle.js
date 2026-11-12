/* Shared lifecycle contract. Synthetic adapters in this UI never call real infrastructure. */
(function(root,factory){const api=factory(typeof module==='object'?require('./prd-engine'):root.PRDEngine);if(typeof module==='object')module.exports=api;else root.RunLifecycle=api;})(typeof globalThis==='object'?globalThis:this,function(E){
'use strict';
const VERSION='normal-flow@2026-10-29', clone=E.clone, now=E.stamp;
const PRICE={id:'approved-synthetic-check@2',approved:true,approvedBy:'synthetic-cost-policy',unit:'check',rate:100,currency:'CNY',scope:'SYNTHETIC_ONLY'};
const TECH=['USAGE_MISSING','USAGE_CONFLICT','WRITE_FAILED','EXTERNAL_UNKNOWN','EXTERNAL_INCONSISTENT','RESOURCE_UNRELEASED','RESET_FAILED'];
const reasons={USAGE_MISSING:'用量缺失，等待计量源补采',USAGE_CONFLICT:'同一用量事件内容不一致',WRITE_FAILED:'计量写入失败',EXTERNAL_UNKNOWN:'外部实际影响未知',EXTERNAL_INCONSISTENT:'外部查询状态不一致',RESOURCE_UNRELEASED:'资源尚未释放',RESET_FAILED:'复位验证失败，资源隔离',PRICE_UNAPPROVED:'价格未批准或口径不符',BILLING_DISCREPANCY:'计价或预算差异待成本人员核查'};
function event(r,type,data={}){r.systemEvents.push({at:now(),actor:'system',type,data:clone(data)});}
function configureTask(t){
 const p=t.prd,scope='task-data:'+t.id;
 p.dataScope=scope;
 p.cleanupPolicy={approved:true,ref:'synthetic-cleanup-policy@1',scope:'SYNTHETIC_ONLY'};
 p.price=clone(PRICE);
 p.reportGrants=Object.entries(p.members).filter(([role])=>['engineer','business','quality','expert'].includes(role)).map(([role,id])=>({subject:id,taskId:t.id,dataScopes:[scope],actions:role==='engineer'?['report.read','report.export','evidence.export']:['report.read']}));
}
function initialize(r,t){
 r.lifecycleVersion=VERSION;r.dataScope=t.prd.dataScope;r.reportGrants=clone(t.prd.reportGrants||[]);
 r.cleanupPolicy=clone(t.prd.cleanupPolicy||{});r.price=clone(t.prd.price||{});
 r.systemEvents=[];r.issues=[];r.reportExports=[];r.usageComplete=false;r.effectsKnown=false;r.resourcesReleased=false;r.dispatchStopped=false;r.workerUnits=0;
 r.technicalOwners=['demo-ops-008','demo-maintainer-010'];r.costOwners=['demo-cost-011'];
 r.environment='IN_USE';r.settlement='AWAITING_USAGE';r.priceStatus='APPROVED';
 event(r,'RUN_STARTED',{price:r.price.id,cleanup:r.cleanupPolicy.ref});return r;
}
function assertCurrent(r){if(r?.lifecycleVersion!==VERSION)throw Error('历史运行只读；请克隆新修订验证现行流程。');}
function issue(r,code){let x=r.issues.find(x=>x.code===code&&x.status==='OPEN');if(!x){x={id:r.id+'-'+code,code,category:TECH.includes(code)?'TECHNICAL':'COST_POLICY',owner:TECH.includes(code)?'运维 / 对应系统维护人':'获准成本 / 财务人员',status:'OPEN',at:now(),reason:reasons[code]||code};r.issues.push(x);event(r,'EXCEPTION_CREATED',x);}return x;}
function resolve(r,code){for(const x of r.issues.filter(x=>x.code===code&&x.status==='OPEN')){x.status='RESOLVED';x.resolvedAt=now();event(r,'EXCEPTION_RECOVERED',{id:x.id});}}
function meter(ledger,r,usage,{writeFailed=false}={}){
 assertCurrent(r);ledger.usageEvents=ledger.usageEvents||{};ledger.settlements=ledger.settlements||{};
 if(!usage||!usage.id||usage.runId!==r.id||!usage.source||!Number.isSafeInteger(usage.quantity)||usage.quantity<0){issue(r,'USAGE_MISSING');return false;}
 const key=usage.source+':'+usage.id,digest=E.hash(usage),previous=ledger.usageEvents[key];
 if(previous){if(previous.digest!==digest){issue(r,'USAGE_CONFLICT');r.settlement='PENDING_QUERY';return false;}return true;}
 if(writeFailed){issue(r,'WRITE_FAILED');r.settlement='PENDING_QUERY';return false;}
 if(!r.price.approved||!r.price.approvedBy||r.price.unit!==usage.unit||!Number.isSafeInteger(r.price.rate)||r.price.rate<0){issue(r,'PRICE_UNAPPROVED');r.settlement='UNPRICED';return false;}
 const amount=usage.quantity*r.price.rate;
 if(!Number.isSafeInteger(amount)||amount>(ledger.reservations[r.id]??0)){issue(r,'BILLING_DISCREPANCY');r.settlement='PENDING_COST_REVIEW';return false;}
 // All checks precede this atomic local transaction. Production requires a DB transaction.
 ledger.reservations[r.id]-=amount;ledger.confirmed+=amount;
 ledger.usageEvents[key]={digest,usage:clone(usage),at:now()};
 ledger.settlements[key]={runId:r.id,usageId:usage.id,amount,priceVersion:r.price.id,at:now()};
 resolve(r,'WRITE_FAILED');resolve(r,'PRICE_UNAPPROVED');resolve(r,'BILLING_DISCREPANCY');
 event(r,'USAGE_SETTLED',{usageId:usage.id,quantity:usage.quantity,amount,priceVersion:r.price.id});return true;
}
function requestCancel(r){assertCurrent(r);if(!['RUNNING','INTERRUPTED'].includes(r.state))throw Error('当前执行状态不可再次取消。');r.dispatchStopped=true;r.cancelRequested=true;r.state='RECONCILING';r.environment='VERIFYING';r.settlement='PENDING_QUERY';r.unresolved=true;event(r,'DISPATCH_STOPPED');event(r,'QUERY_REQUESTED');event(r,'CANCEL_REQUESTED');}
function processReceipt(r,ledger,receipt){
 assertCurrent(r);if(!receipt?.id||receipt.runId!==r.id||!receipt.source)throw Error('连接器回执缺少来源或运行身份。');
 r.lastReceipt=clone(receipt);event(r,'CONNECTOR_RECEIPT',{id:receipt.id,source:receipt.source,synthetic:receipt.synthetic===true});
 r.effectsKnown=receipt.effectState==='KNOWN'&&(!r.cancelRequested||receipt.queryVerified===true);
 if(!r.effectsKnown)issue(r,receipt.effectState==='INCONSISTENT'?'EXTERNAL_INCONSISTENT':'EXTERNAL_UNKNOWN');else {resolve(r,'EXTERNAL_UNKNOWN');resolve(r,'EXTERNAL_INCONSISTENT');}
 r.resourcesReleased=receipt.resourcesReleased===true;
 if(!r.resourcesReleased)issue(r,'RESOURCE_UNRELEASED');else resolve(r,'RESOURCE_UNRELEASED');
 if(!r.cleanupPolicy.approved){r.environment='AUTHORIZATION_REQUIRED';}
 else if(receipt.resetVerified===false){r.environment='QUARANTINED';issue(r,'RESET_FAILED');}
 else if(receipt.resetVerified===true&&r.effectsKnown&&r.resourcesReleased){r.environment='RESET';resolve(r,'RESET_FAILED');event(r,'CLEANUP_VERIFIED',{receipt:receipt.id,policy:r.cleanupPolicy.ref});}
 else {r.environment='UNKNOWN';issue(r,'EXTERNAL_UNKNOWN');}
 let accounted=Array.isArray(receipt.usage)&&receipt.usage.length>0;
 for(const u of receipt.usage||[])if(!meter(ledger,r,u,{writeFailed:receipt.writeFailed===true}))accounted=false;
 r.usageComplete=receipt.usageComplete===true&&Array.isArray(receipt.usage)&&receipt.usage.length>0&&receipt.usage.every(u=>u.id&&u.runId===r.id&&u.source&&Number.isSafeInteger(u.quantity)&&u.quantity>=0);
 if(!r.usageComplete){issue(r,'USAGE_MISSING');if(!['UNPRICED','PENDING_COST_REVIEW'].includes(r.settlement))r.settlement='PENDING_QUERY';}
 else {resolve(r,'USAGE_MISSING');if(accounted&&!r.issues.some(x=>x.status==='OPEN'&&['USAGE_CONFLICT','WRITE_FAILED'].includes(x.code)))r.settlement='RECONCILED';}
 if(r.cancelRequested){r.cancelConfirmed=receipt.queryVerified===true&&receipt.cancelConfirmed===true;r.state=r.effectsKnown&&r.cancelConfirmed?'CANCELLED':'RECONCILING';}
 else if(receipt.executionCompleted===true)r.state='COMPLETED';
 const safe=r.effectsKnown&&r.environment==='RESET'&&r.resourcesReleased&&r.usageComplete&&r.settlement==='RECONCILED'&&(!r.cancelRequested||r.cancelConfirmed);
 r.unresolved=!safe;
 if(safe&&Object.hasOwn(ledger.reservations,r.id)){const released=E.release(ledger,r.id,false);event(r,'UNUSED_BUDGET_RELEASED',{amount:released,basis:receipt.id});}
 return status(r);
}
function syntheticReceipt(r,overrides={}){
 // This adapter reports measured work of the in-memory runner only, never real usage.
 return {id:r.id+'-receipt-'+(r.cancelRequested?'cancel':'complete'),runId:r.id,source:'synthetic-connector@2',synthetic:true,executionCompleted:!r.cancelRequested,queryVerified:true,cancelConfirmed:!!r.cancelRequested,effectState:'KNOWN',resourcesReleased:true,resetVerified:true,usageComplete:true,usage:[{id:r.id+'-usage-final',runId:r.id,source:'synthetic-meter@2',unit:'check',quantity:r.workerUnits,synthetic:true}],...clone(overrides)};
}
function authorizeReport(r,t,actor,action='report.read'){
 if(!r||!t||r.taskId!==t.id||t.prd.authRevoked||!actor?.permissions?.includes(action))throw Error('报告访问拒绝：缺少动作权限或任务授权已撤销。');
 const grants=t.prd.reportGrants||[];
 if(!grants.some(g=>g.subject===actor.id&&g.taskId===r.taskId&&g.dataScopes?.includes(r.dataScope)&&g.actions?.includes(action)&&g.revoked!==true))throw Error('报告访问拒绝：不在当前任务及数据授权范围。');
 return true;
}
function exportReport(r,t,actor,kind='report'){
 authorizeReport(r,t,actor,kind==='evidence'?'evidence.export':'report.export');
 const sn=r.prdSnapshots?.at(-1);if(!sn)throw Error('尚无质量快照可导出。');
 const exportRecord={at:now(),actor:actor.id,kind,snapshot:sn.id};
 r.reportExports=r.reportExports||[];r.reportExports.push(exportRecord);
 const payload={exportRecord:clone(exportRecord),baseline:VERSION,scope:'SYNTHETIC_REPLAY_ONLY',snapshot:clone(sn),history:clone(r.prdSnapshots),businessAcceptance:clone(r.businessAcceptance||null),states:status(r),systemEvents:clone(r.systemEvents||[]),issues:clone(r.issues||[])};
 if(kind==='evidence')Object.assign(payload,{manifest:clone(r.prdManifest),originalOutput:clone(r.prdManifest.outputs)});
 return payload;
}
function accept(r,t,actor,decision,reason){
 const sn=r.prdSnapshots?.at(-1);
 if(actor?.id!==t.prd.members.business)throw Error('仅任务业务负责人可记录业务验收。');
 if(r.state!=='COMPLETED'||!sn||sn.summary.pending)throw Error('先完成执行和必要人工复核，再记录业务验收。');
 if(!['ACCEPTED','CONDITIONAL','RETURNED'].includes(decision)||!reason?.trim())throw Error('请填写有效验收决定和原因。');
 r.businessAcceptance={status:decision,reason,actor:actor.id,snapshot:sn.id,at:now()};return r.businessAcceptance;
}
function recoverTechnical(r,ledger,actor,receipt){
 assertCurrent(r);if(!actor?.permissions?.includes('technical.recover')||!r.technicalOwners.includes(actor.id))throw Error('仅此技术异常分配的运维或系统维护人可恢复。');
 if(!r.issues.some(x=>x.category==='TECHNICAL'&&x.status==='OPEN'))throw Error('没有待处理技术异常；正常流程由系统自动执行。');
 event(r,'TECHNICAL_RETRY',{actor:actor.id});return processReceipt(r,ledger,receipt);
}
function resolveCost(r,ledger,actor,price){
 assertCurrent(r);if(!actor?.permissions?.includes('cost.policy')||!r.costOwners.includes(actor.id))throw Error('仅具对应权限的成本/财务人员可处理；运维身份不等于财务审批。');
 if(!r.issues.some(x=>x.category==='COST_POLICY'&&x.status==='OPEN'))throw Error('没有待处理的价格或口径异常。');
 if(!price?.approved||!price.approvedBy)throw Error('需要已批准的价格版本。');
 r.price=clone(price);event(r,'COST_POLICY_RESOLVED',{actor:actor.id,price:price.id});return processReceipt(r,ledger,r.lastReceipt);
}
function status(r){
 if(!r)return {closed:false,evaluationComplete:false,businessComplete:false,label:'尚未运行',report:'NOT_EXPORTED'};
 const sn=r.prdSnapshots?.at(-1),quality=sn?.summary.verdict||'NOT_EVALUATED';
 const evaluationComplete=r.state==='COMPLETED'&&!!sn&&!sn.summary.pending;
 const accepted=!!r.businessAcceptance&&r.businessAcceptance.snapshot===sn?.id;
 const businessComplete=evaluationComplete&&accepted;
 const safe=r.environment==='RESET'&&r.settlement==='RECONCILED'&&!r.unresolved;
 const closed=r.cancelRequested||r.state==='CANCELLED'?r.state==='CANCELLED'&&safe:businessComplete&&safe;
 const disposition=accepted?r.businessAcceptance.status:null;
 const businessLabel=disposition==='RETURNED'?'本修订已退回':disposition==='CONDITIONAL'?'业务有条件接受':'业务已完成';
 const label=r.cancelRequested||r.state==='CANCELLED'?(closed?'已取消 · 清理与费用已核清':'取消处理中 · 保留未决事项'):businessComplete?(closed?businessLabel+' · 系统收尾已完成':businessLabel+' · 系统仍有跟进事项'):evaluationComplete?'评测已完成 · 等待业务接受或退回':sn?.summary.pending?'等待必要人工复核':'等待执行与评测结果';
 const openIssues=(r.issues||[]).filter(x=>x.status==='OPEN'),owners=[];
 if(openIssues.some(x=>x.category==='TECHNICAL'))owners.push('已分配运维 / 系统维护人处理技术异常');
 if(openIssues.some(x=>x.category==='COST_POLICY'))owners.push('获准成本 / 财务人员核查价格或账单差异');
 const followup=owners.length?owners.join('；'):'系统继续查询、清理与费用核查';
 const businessNext=disposition==='RETURNED'?'评测负责人克隆新修订；原质量结论和记录保持':disposition==='CONDITIONAL'?'按验收条件跟进；方案或输出变更须克隆新修订':'报告按权限按需导出，不影响业务完成';
 const next=r.cancelRequested?(closed?'取消核查已完成；报告按权限按需导出':followup+'；未核清预算继续保留'):businessComplete?businessNext+(!safe?'；'+followup:''):evaluationComplete?'业务负责人记录接受或退回'+(!safe?'；'+followup:''):sn?.summary.pending?'已分配复核人完成必要复核':'系统继续执行';
 return {closed,evaluationComplete,businessComplete,label,execution:r.state,quality,business:accepted?r.businessAcceptance.status:r.businessAcceptance?'STALE':'PENDING',environment:r.environment,cost:r.settlement,report:r.reportExports?.length?'EXPORTED':'NOT_EXPORTED',qualityGate:sn?.summary.release===true,next};
}
return {VERSION,PRICE,TECH,configureTask,initialize,meter,requestCancel,processReceipt,syntheticReceipt,authorizeReport,exportReport,accept,recoverTechnical,resolveCost,status};
});
