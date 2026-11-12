/* Navigation records are views of existing data. Opening a directory never creates work. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NavigationCore=api;})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const baselineRuns=new Set(['RUN-1021','RUN-1022','RUN-1023','RUN-1024']);
  function exampleTask(task){
    return Boolean(task.exampleOrigin || (task.id==='EV-N001'&&!task.objectId&&!task.run&&!task.savedAt));
  }
  function nextTask(task){
    if(task.status==='COMPLETED')return '查看报告';
    if(task.status==='RUNNING')return '查看执行进度';
    if(task.status==='WAITING_REVIEW')return '处理复核';
    if(task.status==='CANCELLED')return '查看取消记录';
    if(task.suitePlan?.manifest||task.suitePlan?.agentReview?.run)return '查看执行与回传';
    if(task.status==='READY')return '确认并发起';
    return '继续准备';
  }
  function runs(project,legacy=[],examples=false){
    const current=project.tasks.filter(t=>Boolean(t.run||t.frameworkPlan?.run||t.suitePlan?.manifest||t.suitePlan?.agentReview?.run));
    const rows=current.map(t=>{
      const snapshot=t.run?.flow?.snapshot||t.frameworkPlan?.run?.snapshot||t.suitePlan?.report;
      return {id:t.run?.id||t.frameworkPlan?.run?.manifest?.id||t.suitePlan?.manifest?.id||t.id,
        taskId:t.id,name:t.name,objectId:t.objectId,status:t.status,
        snapshot,metric:t.run?.flow?.snapshot?.metric,
        verdict:snapshot?.summary?.gate||snapshot?.summary?.verdict||snapshot?.verdict||'待计算 / 见明细',
        mode:t.frameworkPlan?'framework':t.suitePlan?'multi':'standard',origin:'current',example:exampleTask(t)};
    });
    for(const run of legacy)rows.push({id:run.id,taskId:run.taskId,name:run.name,status:run.state,
      snapshot:run.prdSnapshots?.at(-1),verdict:run.prdSnapshots?.at(-1)?.summary?.verdict||run.verdict,
      mode:'legacy',origin:'legacy',example:baselineRuns.has(run.id)||Boolean(run.exampleOrigin)});
    return rows.filter(row=>Boolean(row.example)===examples);
  }
  function comparison(a,b){
    if(!a||!b)return {ok:false,reasons:['请选择基线和候选两个运行。']};
    if(a.id===b.id)return {ok:false,reasons:['基线与候选不能是同一运行。']};
    if(a.mode!=='standard'||b.mode!=='standard')return {ok:false,reasons:['此入口比较普通任务的固定评分快照；其他执行类型请打开各自报告核对。']};
    const am=a.manifest,bm=b.manifest,reasons=[];
    if(!am||!bm||!a.metric||!b.metric)return {ok:false,reasons:['两个运行都需要完整的冻结清单和已计算指标。']};
    if(a.verdict!=='PASS')reasons.push('基线运行尚未通过。');
    for(const [key,label]of [['object','被测对象'],['environment','执行环境'],['materials','材料版本'],['caseSpecs','用例版本与规则'],['scoring','计算实现'],['bindings','执行器与适配器'],['plan','重复与执行计划']]){
      if(JSON.stringify(am[key])!==JSON.stringify(bm[key]))reasons.push(label+'不一致。');
    }
    if(a.metric.unknown||b.metric.unknown)reasons.push('存在缺证或待复核项。');
    return {ok:!reasons.length,reasons,delta:!reasons.length?b.metric.value-a.metric.value:null};
  }
  const planKinds={calibration:{name:'校准计划',fields:['scorer','data','gold','rubric','criteria']},
    human:{name:'人工评审批次',fields:['run','rubric','reviewerA','reviewerB']},
    regression:{name:'回归订阅',fields:['object','suite','event','budget']}};
  function init(state){return state.navigationWorkspace??={version:1,counter:0,plans:[]};}
  function createPlan(state,kind,input){
    if(!planKinds[kind])throw Error('未知计划类型。');
    if(!input.name?.trim())throw Error('请填写名称，保存后可在列表中继续维护。');
    const model=init(state),item={id:'PLAN-'+String(++model.counter).padStart(4,'0'),kind,name:input.name.trim(),
      fields:{},revision:1,status:'DRAFT',history:[],createdAt:new Date().toISOString()};
    model.plans.unshift(item);return item;
  }
  function updatePlan(item,input){
    if(item.name!==input.name||JSON.stringify(item.fields)!==JSON.stringify(input.fields)){
      item.name=input.name;item.fields=clone(input.fields);item.revision++;item.status='DRAFT';item.check=null;
    }
    item.savedAt=new Date().toISOString();return item;
  }
  function checkPlan(item){
    const required=planKinds[item.kind].fields,missing=required.filter(k=>!String(item.fields[k]??'').trim());
    const issues=missing.map(key=>({key,reason:'尚未填写'}));
    if(item.kind==='human'&&item.fields.reviewerA&&item.fields.reviewerA===item.fields.reviewerB)
      issues.push({key:'reviewerB',reason:'两位评审须使用不同账号'});
    if(item.kind==='regression'&&item.fields.budget&&!(Number(item.fields.budget)>0))
      issues.push({key:'budget',reason:'单次预算须大于 0'});
    item.check={revision:item.revision,at:new Date().toISOString(),issues};
    item.status=issues.length?'NEEDS_INPUT':'WAITING_INTEGRATION';
    return item.check;
  }
  return {exampleTask,nextTask,runs,comparison,planKinds,init,createPlan,updatePlan,checkPlan};
});
