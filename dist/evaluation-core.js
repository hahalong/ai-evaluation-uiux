/* Shared task / asset-version governance. No page owns approval state. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.EvaluationCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const clone=x=>JSON.parse(JSON.stringify(x));
 const key=a=>a.id+'@'+a.version;
 function digest(a){const s=JSON.stringify([a.name,a.source,a.targets,a.content,a.caseSpec,a.assetSpec,a.config,a.governanceDomain,a.contentSet]);let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(16);}
 const domains=['开发','回归','盲测','长尾对抗','留出'];
 const lifecycleOf=s=>s==='已发布'?'PUBLISHED':s==='待准入'||s==='待审核'?'REVIEW':'DRAFT';
 function directoryStatus(g){return g.availability==='RETIRED'?'归档':g.availability==='SUSPENDED'?'停用':g.lifecycle==='PUBLISHED'?'已发布':['VALIDATING','REVIEW'].includes(g.lifecycle)?'待准入':'草稿';}
 function taskDigest(t){return digest({content:[t.object,t.objectVersion,t.objectProof,t.goal,t.scope,t.success,t.budget,t.assemblyMode,t.contentMode,t.deps]});}
 const now=()=>new Date().toISOString();
 const layerNames=['描述完整','引用有效','具备执行条件','专业验证通过'];
 const reasonNames={EVIDENCE_MISSING:'证据缺失',COVERAGE_INSUFFICIENT:'覆盖不足',QUALIFICATION_MISSING:'资格缺失',SCORING_ERROR:'评分异常'};
 function create(state,seed=[]){
  state.v2=state.v2||{schema:2,assets:{},notifications:[],sequence:0,instructions:[],rounds:[],works:[]};
  const db=state.v2;state.evalTasks=state.evalTasks||[];state.runs=state.runs||[];
  const id=p=>p+'-'+String(++db.sequence).padStart(4,'0');
  function event(a,action,actor,detail=''){a.governance.history.push({at:now(),action,actor,detail,digest:digest(a)});}
  function attach(a){
   if(!a.governance)a.governance={id:id('APR'),status:'草稿',history:[],assignee:'expert',expert:null,reviewer:null,validation:null};
   const g=a.governance;g.lifecycle=g.lifecycle||lifecycleOf(g.status);g.availability=g.availability||(g.disabled?'SUSPENDED':'ACTIVE');g.disabled=g.availability!=='ACTIVE';
   for(const [p,get] of Object.entries({status:()=>directoryStatus(a.governance),validated:()=>!!a.governance.validation?.layers.every(x=>x.ok)&&a.governance.validation.digest===digest(a),expertConfirmed:()=>!!a.governance.expert&&a.governance.expert.digest===digest(a)})){
    delete a[p];Object.defineProperty(a,p,{configurable:true,enumerable:false,get,set(value){if(value===false&&p!=='status'){a.governance.expert=null;a.governance.reviewer=null;a.governance.validation=null;if(a.governance.lifecycle!=='PUBLISHED'){a.governance.status='草稿';a.governance.lifecycle='DRAFT';}}}});
   }return a;
  }
  function adopt(input,{trusted=false}={}){
   const k=key(input);if(db.assets[k])return attach(db.assets[k]);
   const a=clone(input);const wasPublished=a.status==='已发布';delete a.governance;
   if(trusted&&wasPublished){if(['dataset','case','reference'].includes(a.kind))a.governanceDomain=a.governanceDomain||'开发';if(a.kind==='dataset')a.contentSet=a.contentSet||{member_kind:'sample',members:[]};}
   attach(a);db.assets[k]=a;
   if(trusted&&wasPublished){a.governance.status='已发布';a.governance.lifecycle='PUBLISHED';a.governance.authorization={status:'VALID',scope:'DEMO_REPLAY_ONLY'};a.governance.scope='DEMO_REPLAY_ONLY';a.governance.validation={digest:digest(a),at:now(),layers:layerNames.map(name=>({name,ok:true,detail:'已批准的固定合成样例；仅在开发回放范围使用'})),evidence:{id:'BASELINE-'+a.id,source:'registered fixed demonstration fixture',demo:true}};a.governance.expert={actor:'陈专家',digest:digest(a)};a.governance.reviewer={actor:'周经理',digest:digest(a)};event(a,'载入已发布演示版本','系统');}
      return a;
  }
  Object.values(db.assets).forEach(attach);seed.forEach(a=>adopt(a,{trusted:true}));
  function find(k,version){
   const exact=version!==undefined?k+'@'+version:k;
   if(version!==undefined||String(k).includes('@'))return db.assets[exact];
   return Object.values(db.assets).find(a=>a.id===k);
  }
  function list(){return Object.values(db.assets);}
  function revise(a,patch={}){
   const versions=list().filter(x=>x.id===a.id);const b={...clone(a),...clone(patch),version:'r'+(versions.length+1),derivedFrom:key(a)};
   delete b.governance;const next=adopt(b);event(next,'新修订','工程师','原审批不沿用');return next;
  }
  function edit(a,patch){if(digest({...a,...patch})===digest(a))return a;if(a.governance.lifecycle==='PUBLISHED'||a.governance.history.some(x=>['专家确认','审核发布','技术确认','业务确认','双人确认发布'].includes(x.action)))return revise(a,patch);const prior=digest(a);Object.assign(a,patch);if(prior!==digest(a)){a.governance.validation=null;a.governance.expert=null;a.governance.reviewer=null;a.governance.technical=null;a.governance.business=null;a.governance.status='草稿';a.governance.lifecycle='DRAFT';event(a,'修改草稿','工程师');}return a;}
  function validate(a,checks){if(a.governance.lifecycle==='PUBLISHED')return a.governance.validation;const layers=layerNames.map((name,i)=>({name,ok:!!checks[i]?.ok,detail:checks[i]?.detail||'尚未验证'}));a.governance.validation={at:now(),digest:digest(a),layers,evidence:null};a.governance.expert=null;a.governance.reviewer=null;a.governance.technical=null;a.governance.business=null;a.governance.status='草稿';a.governance.lifecycle=layers.slice(0,2).every(x=>x.ok)?'VALIDATING':'DRAFT';event(a,'内容与引用检查','工程师');return a.governance.validation;}
  function evidence(a,report){const v=a.governance.validation;if(!v||v.digest!==digest(a)||!v.layers[0].ok||!v.layers[1].ok)throw Error('内容或引用检查未通过，请先修复列出的缺口。');if(!report?.demo||report.digest!==digest(a)||!report.cases?.length||report.cases.some(x=>x.actual!==x.expected))throw Error('验证证据不匹配当前版本，或检查未通过，请重新运行验证。');v.evidence=clone(report);v.layers[2]={name:layerNames[2],ok:true,detail:'开发回放接口与配置检查通过；真实服务未接入'};v.layers[3]={name:layerNames[3],ok:true,detail:'正例、负例与缺证检查通过；资格仅限开发回放'};event(a,'开发验证','工程师',report.id);return v;}
  function ready(a){return a.validated&&!a.governance.disabled;}
  function submit(a){if(!ready(a))throw Error('四层检查尚未完成，请先打开验证结果并补齐缺口。');a.governance.status='待准入';a.governance.lifecycle='REVIEW';a.governance.assignee=ordinary(a)?'engineer':'expert';event(a,ordinary(a)?'提交确认':'提交审核','工程师');return a;}
  function expert(a,actor){if(ordinary(a))throw Error('普通资产须由业务与评测负责人双人确认，不使用旧专家审批流程。');if(a.governance.lifecycle!=='REVIEW'||!ready(a))throw Error('当前版本尚未完成验证并提交审核。');a.governance.expert={actor,digest:digest(a),at:now()};a.governance.assignee='quality';a.governance.assigneeName=null;event(a,'专家确认',actor);return a;}
  function publish(a,actor){if(ordinary(a))throw Error('普通资产须使用当前版本双人确认发布。');if(a.governance.lifecycle!=='REVIEW'||!a.expertConfirmed||!ready(a))throw Error('当前版本缺少有效验证或专家确认，请先完成前置步骤。');if(actor===a.governance.expert.actor)throw Error('审核人与专家确认人应独立，请交由质量负责人审核。');a.governance.reviewer={actor,digest:digest(a),at:now()};a.governance.status='已发布';a.governance.lifecycle='PUBLISHED';a.governance.authorization={status:'VALID',scope:'DEMO_REPLAY_ONLY'};a.governance.scope='DEMO_REPLAY_ONLY';event(a,'审核发布',actor);db.notifications.unshift({id:id('NT'),at:now(),text:a.name+' '+a.version+' 已发布',assetKey:key(a)});return a;}
  function ordinary(a){return !a.specialistRequired&&!['executor','adapter','scorer','check'].includes(a.kind);}
  function ordinaryConfirm(a,role,actor){if(!ordinary(a))throw Error('该能力还需专项验证与独立审核。');if(a.governance.lifecycle!=='REVIEW'||!ready(a))throw Error('当前版本须先完成验证并提交确认。');if(!['technical','business'].includes(role)||!actor?.id)throw Error('确认角色或账号无效。');const other=role==='technical'?'business':'technical';if(a.governance[other]?.actorId===actor.id)throw Error('业务与评测必须使用不同账号。');a.governance[role]={actorId:actor.id,actor:actor.name,digest:digest(a),version:a.version,at:now()};a.governance.assignee=role==='technical'?'business':'engineer';event(a,role==='technical'?'技术确认':'业务确认',actor.name,'绑定 '+key(a)+' / '+digest(a));return a;}
  function publishOrdinary(a,actor){const g=a.governance,t=g.technical,b=g.business;if(!ordinary(a)||g.lifecycle!=='REVIEW'||!ready(a)||!t||!b||t.actorId===b.actorId||t.digest!==digest(a)||b.digest!==digest(a)||t.version!==a.version||b.version!==a.version)throw Error('当前版本的双人确认或专业验证未齐备。');if(actor.id!==t.actorId)throw Error('由完成技术确认的评测负责人发布。');g.status='已发布';g.lifecycle='PUBLISHED';g.scope='DEMO_REPLAY_ONLY';g.authorization={status:'VALID',scope:g.scope};event(a,'双人确认发布',actor.name,'业务确认：'+b.actor+'；技术确认：'+t.actor);return a;}
  function reject(a,actor,reason){if(!reason?.trim())throw Error('请填写退回原因。');a.governance.status='草稿';a.governance.lifecycle='REJECTED';a.governance.expert=null;a.governance.reviewer=null;a.governance.technical=null;a.governance.business=null;event(a,'退回修改',actor,reason);}
  function references(a){const target=key(a);return state.evalTasks.filter(t=>{const seen=new Set();function contains(k){if(k===target)return true;if(seen.has(k))return false;seen.add(k);const node=find(k);return !!node&&[...(node.config?.references||[]),...(node.contentSet?.member_kind==='case'?node.contentSet.members||[]:[])].some(r=>contains(typeof r==='string'?r:r.id+'@'+r.version));}return t.deps?.some(d=>d.assetId&&!d.excluded&&contains(d.assetId+'@'+d.assetVersion));}).map(t=>({id:t.id,frozen:!!t.manifest}));}
  function retire(a){a.governance.disabled=true;a.governance.availability='SUSPENDED';event(a,'停用','质量负责人','草稿引用与历史保留；冻结和启动均阻断');}
  function archive(a){a.governance.disabled=true;a.governance.availability='RETIRED';event(a,'归档','质量负责人','保留引用和审计，禁止新的正式执行');}
  function restore(a){a.governance.disabled=false;a.governance.availability='ACTIVE';event(a,'恢复可用性','质量负责人','资格、授权仍须独立校验');}
  function copyAsset(a){const b=clone(a);b.id=id('AS');b.version='r1';b.name+=' · 克隆';b.derivedFrom=key(a);delete b.governance;const next=adopt(b);event(next,'克隆新资产','工程师','仅保留内容和来源；不继承审批、历史或授权');return next;}
  function todos(){return list().filter(a=>a.governance.lifecycle==='REVIEW'&&a.governance.availability==='ACTIVE').map(a=>({id:a.governance.id,assetKey:key(a),title:(ordinary(a)?(!a.governance.technical?'技术确认：':!a.governance.business?'业务确认：':'待发布：'):(a.expertConfirmed?'独立审核：':'专家确认：'))+a.name,role:ordinary(a)?(!a.governance.technical?'engineer':!a.governance.business?'business':'engineer'):(a.governance.assignee||'expert'),assigneeName:a.governance.assigneeName,version:a.version}));}
  function task(input={}){const t={id:id('EV'),name:input.name||input.goal?.slice(0,32)||input.object+' · 能力评测',goal:'',object:'',type:'待明确',objectVersion:'',scope:'',success:'',revision:1,stage:0,budget:20,deps:[],events:[],pilotHistory:[],manifests:[],confirmedRevision:0,manifest:null,pilot:null,runId:null,createdAt:now(),...input};t.assemblyMode=t.assemblyMode||'DIRECT';t.contentMode=t.contentMode||(t.type==='Agent'?'CASE':'DATASET');t.executionScope=t.executionScope||'DEMO_REPLAY_ONLY';state.evalTasks.push(t);return t;}
  function bind(t,a,dep){if(!a)throw Error('引用版本不存在。');if(dep.assetId!==a.id||dep.assetVersion!==a.version){t.revision++;t.manifest=null;t.pilot=null;t.confirmedRevision=0;}Object.assign(dep,{assetId:a.id,assetVersion:a.version,compatible:true});if(!t.deps.includes(dep))t.deps.push(dep);return dep;}
  function preflight(t){
   const gaps=[],resolved=[],seen=new Set(),visiting=new Set(),required=dependencies(t,t.analysis==='ai');
   if(!t.object)gaps.push('补充被测对象');if(!t.objectVersion)gaps.push('补充对象精确版本');if(!t.goal)gaps.push('补充评测目标');
   if(!t.objectProof?.ref||!['fixture','build','config','deployment'].includes(t.objectProof.kind)||/^https?:\/\//i.test(t.objectProof.ref.trim()))gaps.push('补充对象构建、配置或部署版本证明；服务URL不能替代版本证明');
   if(!['DIRECT','SUITE'].includes(t.assemblyMode)||!['CASE','DATASET'].includes(t.contentMode))gaps.push('选择有效的装配方式与内容模式');
   if(!t.budget||t.budget<=0)gaps.push('正式执行前补齐预算');
   if(t.executionScope!=='DEMO_REPLAY_ONLY')gaps.push('真实执行器尚未接入；当前仅支持已注册开发回放');
   function walk(k){
    if(visiting.has(k)){gaps.push('依赖存在循环：'+k);return;}if(seen.has(k))return;
    const a=find(k);if(!a||key(a)!==k){gaps.push('精确版本不存在：'+k);return;}
    visiting.add(k);seen.add(k);resolved.push(a);const g=a.governance;
    if(g.lifecycle!=='PUBLISHED')gaps.push(a.name+'尚未发布');
    if(g.availability!=='ACTIVE')gaps.push(a.name+'已'+(g.availability==='RETIRED'?'归档':'停用'));
    if(!a.validated||!g.validation?.evidence||g.scope!==t.executionScope||(g.qualificationExpiresAt&&Date.parse(g.qualificationExpiresAt)<=Date.now()))gaps.push(a.name+'资格无效或超出范围');
    if(g.authorization?.status!=='VALID'||g.authorization?.scope!==t.executionScope||(g.authorization?.expiresAt&&Date.parse(g.authorization.expiresAt)<=Date.now()))gaps.push(a.name+'授权无效或超出范围');
    if(a.targets?.length&&t.type!=='待明确'&&!a.targets.includes(t.type))gaps.push(a.name+'与对象类型不兼容');
    if(['dataset','case','reference'].includes(a.kind)&&!domains.includes(a.governanceDomain))gaps.push(a.name+'缺少治理域');
    if(['盲测','留出'].includes(a.governanceDomain)&&!g.authorization?.blind)gaps.push(a.name+'未取得受保护域授权');
    const refs=[...(a.config?.references||[]),...(a.contentSet?.member_kind==='case'?a.contentSet.members||[]:[])];
    if(a.contentSet?.member_kind==='case'&&!a.contentSet.members?.length)gaps.push(a.name+'用例库没有固定成员');
    for(const ref of refs){const refKey=typeof ref==='string'?ref:ref.id+'@'+ref.version;walk(refKey);if(a.contentSet?.member_kind==='case'&&(a.contentSet.members||[]).includes(ref)){const member=find(refKey);if(member&&(member.kind!=='case'||member.governanceDomain!==a.governanceDomain))gaps.push(a.name+'成员类型或治理域不一致：'+refKey);}}
    visiting.delete(k);
   }
   for(const d of t.deps.filter(d=>d.assetId&&!d.excluded))walk(d.assetId+'@'+d.assetVersion);
   for(const expected of required.filter(d=>d.required)){if(!resolved.some(a=>a.kind===expected.kind||(expected.kind==='case'&&a.kind==='dataset'&&a.contentSet?.member_kind==='case')))gaps.push('补齐'+expected.label);}
   if(t.contentMode==='DATASET'&&!resolved.some(a=>a.kind==='dataset'&&a.contentSet?.member_kind!=='case'))gaps.push('数据驱动需要固定样本集合');
   if(t.contentMode==='CASE'&&!resolved.some(a=>a.kind==='case'||a.kind==='dataset'&&a.contentSet?.member_kind==='case'))gaps.push('用例驱动需要用例或用例库');
   return {status:gaps.length?'BLOCKED':'READY',gaps:[...new Set(gaps)],assets:resolved};
  }
  function freezeTask(t,runtime,extra={}){const check=preflight(t);if(check.gaps.length)throw Error(check.gaps.join('；'));t.manifest={id:'MF-'+t.id+'-r'+t.revision,taskId:t.id,revision:t.revision,planDigest:taskDigest(t),object:t.object,objectVersion:t.objectVersion,objectProof:clone(t.objectProof),goal:t.goal,scope:t.scope,success:t.success,budget:t.budget,assemblyMode:t.assemblyMode,contentMode:t.contentMode,runtime:clone(runtime),dependencies:check.assets.map(a=>({key:a.kind,id:a.id,version:a.version,digest:digest(a),governanceDomain:a.governanceDomain||null})),demo:true,...extra};return t.manifest;}
  function run(t,record={}){if(!state.evalTasks.includes(t))throw Error('运行必须属于已有评测任务。');if(!t.manifest||t.manifest.revision!==t.revision||t.manifest.planDigest!==taskDigest(t))throw Error('当前方案尚未冻结或已变更。');const check=preflight(t);if(check.gaps.length)throw Error(check.gaps.join('；'));if(t.manifest.dependencies.some(d=>!find(d.id,d.version)||digest(find(d.id,d.version))!==d.digest))throw Error('冻结依赖内容已变化，请重新冻结。');const r={id:id('RUN'),name:t.name,taskId:t.id,createdAt:now(),state:'排队中',verdict:null,trials:0,attempts:0,snapshot:0,...record};if(r.trialIdentities)r.trialIdentities=r.trialIdentities.map(x=>({...x,runId:r.id,subtaskId:x.subtaskId||t.id+'-main'}));state.runs.unshift(r);t.runId=r.id;t.stage=4;return r;}
  function migrateRuns(){for(const r of state.runs){let t=state.evalTasks.find(t=>t.id===r.taskId||t.runId===r.id);if(!t)t=task({name:r.name,object:r.name.split(' · ')[0],objectVersion:r.build||'',type:r.template==='front'?'模型':r.template==='rag'?'非Agent应用':'Agent',entry:'历史运行迁移',template:r.template,stage:4,runId:r.id});r.taskId=t.id;t.runId=t.runId||r.id;}}
  migrateRuns();
  return {db,key,find,list,adopt,revise,edit,validate,evidence,ready,submit,expert,publish,ordinary,ordinaryConfirm,publishOrdinary,reject,references,retire,archive,restore,copyAsset,todos,task,bind,preflight,freezeTask,run,migrateRuns,id};
 }
 function dependencies(t,ai=false){
  const text=[t.goal,t.object,t.method].join(' '),isAgent=t.type==='Agent',isModel=t.type==='模型',rag=/rag|知识库|检索|引用/i.test(text),vision=/前车|图像|识别|视频|视觉/.test(text),subjective=/话术|主观|流畅|风格|满意/.test(text);
  const defs=[['data','数据集或用例库','dataset',(t.contentMode|| (isAgent?'CASE':'DATASET'))==='DATASET','使用实际输入样本，保留来源和样本标识'],['cases','评测用例','case',(t.contentMode||(isAgent?'CASE':'DATASET'))==='CASE','明确输入、执行动作和判定要求'],['metric','评测指标','metric',true,'确定统计单位、公式和缺失处理'],['scorer','评分实现','scorer',true,'固定评分实现和开发验证证据'],['executor','执行器','executor',true,'匹配对象协议并收集输出'],['gate','质量门禁','gate',true,'固定强制项与通过条件'],['suite','评测套件','suite',t.assemblyMode==='SUITE','固定本次使用的依赖版本'],['reference','参考答案 / 最终状态','reference',rag||vision||isAgent,rag?'验证回答事实与来源引用':vision?'对照识别标注':isAgent?'验证动作后的实际状态':'按任务需要对照预期答案'],['environment','环境与观测','environment',isAgent||vision,isAgent?'工具动作需要独立状态观测':vision?'识别结果受设备与回放环境影响':'按需绑定运行环境'],['gold','独立金标','reference',false,'验证评分器时使用，避免向被测对象泄露'],['definition','场景定义','scenario',false,'复用前置条件、参数与分支']];
  if(ai&&isAgent&&/多轮|拒绝|交互|宠物/.test(text))defs.push(['simulator','用户交互脚本','simulator',true,'目标涉及交互分支，需要可复现的用户响应']);
  if(ai&&subjective)defs.push(['rubric','专家规约','rubric',true,'目标包含主观质量，需要明确分档和裁判适用范围']);
  return defs.map(([key,label,kind,required,reason])=>({key,label,kind,required,reason,description:reason,owner:'林工',compatible:false,excluded:false,assetId:null,assetVersion:null,aiAdded:['simulator','rubric'].includes(key),analysis:ai?'目标分析建议':'对象类型默认'}));
 }
 return {create,key,digest,clone,dependencies,layerNames,reasonNames,domains,taskDigest,directoryStatus};
});
