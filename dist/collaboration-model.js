/* Concrete suggestions are version-bound patches, never independent approval states. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.CollaborationModel=api;})(globalThis,function(){
 const clone=x=>JSON.parse(JSON.stringify(x));
 function get(obj,path){return path.reduce((v,k)=>v?.[k],obj);}
 function set(obj,path,value){let p=obj;for(const key of path.slice(0,-1)){if(!p[key]||typeof p[key]!=='object')throw Error('建议对应的字段已变化，请重新整理。');p=p[key];}p[path.at(-1)]=value;}
 function suggest(asset,task,instructions=[]){const out=[],text=instructions.join(' '),add=(id,title,path,before,after,why)=>{if(before!==after)out.push({id,title,path,before:before||'',after,why,state:'待审查'});};
  if(asset?.caseSpec?.prd){const d=asset.caseSpec.prd,r=d.rules?.[0];if(r){const detail=/时间|授权|拒绝|尝试|证据|边界/.test(text)||!text?'同时保留触发时点、调用尝试与实际执行结果，分别定位证据。':'同时保留原始输入、实际输出和独立核对记录。';const step=(d.steps||[]).length-1,before=d.steps?.[step];if(step>=0&&!String(before||'').includes(detail))add('evidence','让采证步骤可以逐项核对',['caseSpec','prd','steps',step],before,before+'；'+detail,'在用例执行说明中补充采证要求，完整保留继承断言及其证据要求。');}
   const detail=/超时|无响应|等待|轮/.test(text)?'超过等待窗口后停止等待；无证据时保留 UNKNOWN，不补造结果。':'没有独立证据时保留 UNKNOWN，不把工具回执当作最终状态。';if(!String(d.allowed||'').includes(detail))add('missing','把缺证时的处理写清楚',['caseSpec','prd','allowed'],d.allowed,d.allowed+'\n'+detail,'将缺证处理放进可审查的预期结果，保留已证实的失败。');
  }else if(asset){const f=asset.assetSpec?.fields,key=f&&Object.keys(f)[0];if(key){const detail='变更后重新检查实际配置与精确引用，并保留验证证据。';if(!String(f[key]||'').includes(detail))add('trace','补充变更后的核对要求',['assetSpec','fields',key],f[key],f[key]+'\n'+detail,'补充治理说明；这条文字本身不会授予执行资格。');}const detail='维护当前版本的实际内容、适用范围与引用依据。';if(!(asset.source||'').includes(detail))add('source','明确后续维护依据',['source'],asset.source,(asset.source||'')+'；'+detail,'保留现有来源，补充维护说明。');
  }else if(task){const detail='分别报告有证据的失败与证据不足；缺证不得记为通过。';if(!(task.success||'').includes(detail))add('success','先把通过条件说清楚',['success'],task.success,(task.success||'强制项全部满足。')+' '+detail,'将质量结论与执行状态区分，便于后续确认。');const scope='以本次冻结的对象、样本和资产精确版本为范围。';if(!(task.scope||'').includes(scope))add('scope','明确本轮验证范围',['scope'],task.scope,(task.scope||'')+' '+scope,'防止后续配置变化影响本次结果。');}
  return out;
 }
 function apply(current,patch){if(patch.state!=='待审查')throw Error('此项已经处理。');const actual=get(current,patch.path)||'';if(actual!==patch.before)throw Error('这处内容已被修改，请重新生成建议后审查。');const next=clone(current);set(next,patch.path,patch.after);return next;}
 function start(db,work,{id,assetKey,taskRevision,at}){if(work.status==='已关闭')throw Error('事项已关闭，请先重新打开。');if(db.rounds.some(r=>r.workId===work.id&&r.state==='运行中'))throw Error('已有一轮正在进行，请等待完成或停止本轮。');const inputs=db.instructions.filter(i=>i.workId===work.id&&i.state==='待执行');const r={id,workId:work.id,state:'运行中',stage:0,assetKey:assetKey||null,taskId:work.taskId||null,taskRevision,instructions:inputs.map(i=>i.text),instructionIds:inputs.map(i=>i.id),startedAt:at,demo:true,estimatedCost:1,patches:[]};for(const i of inputs){i.state='已读取';i.roundId=id;}db.rounds.push(r);return r;}
 function stop(db,round,state='已停止'){if(round.state!=='运行中')return false;round.state=state;for(const i of db.instructions.filter(i=>round.instructionIds?.includes(i.id)&&i.roundId===round.id&&i.state==='已读取')){i.state='待执行';delete i.roundId;}return true;}
 return {suggest,apply,start,stop,get};
});
