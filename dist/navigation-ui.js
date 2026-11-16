/* Shared directory conventions: project list first, explicit creation, examples in their own workspace. */
(() => {
  'use strict';
  const N=NavigationCore,P=PlazaReview,C=PlazaCore,E=EvaluationCore,h=esc;
  const {title,panel,table,kv,badge,notice,wrap}=P.helpers;
  const previous={...pages};
  const q=()=>P.state(),registry=()=>EvalUI.core,model=()=>N.init(q());
  const btn=(label,action,key='',style='',disabled=false)=>`<button type="button" class="btn ${style}" data-dir="${action}" data-key="${h(key)}"${disabled?' disabled':''}>${label}</button>`;
  const native=(label,namespace,action,key='',style='')=>`<button type="button" class="btn ${style}" data-${namespace}="${action}" data-key="${h(key)}">${label}</button>`;
  const link=(label,route,style='ghost')=>btn(label,'go',route,style);
  let assetHome=true,assetQuery='',assetStatus='all',assetPage=0,capKind='executor',capQuery='',capStatus='all',capPage=0,objectType='all',objectQuery='',exampleScope='',planId='',comparison=null;
  let comparisonA='',comparisonB='',flash='',preparationPlan='',environmentStage='coverage',importOrigin='';
  const directoryStates={};
  const directoryState=prefix=>directoryStates[prefix]||(directoryStates[prefix]={query:'',status:'all',page:0});
  const createActions=content=>`<div class="nav-create-actions">${content}</div>`;
  const knownTasks=new Set(q().tasks.map(t=>t.id));
  const knownLegacyTasks=new Set(S.evalTasks.map(t=>t.id));
  const knownAssets=new Set(registry().list().map(a=>E.key(a)));
  const knownCases=new Set(q().flow.cases.map(c=>c.key));
  const knownCaps=new Set(q().flow.capabilities.map(c=>c.id));
  const knownImports=new Set((q().multiEnv?.imports||[]).map(b=>b.sourceId));
  const baselineAssets=new Set(assets.map(a=>a.id+'@'+a.version));
  const baselineIds=new Set(assets.map(a=>a.id));
  const stateLabels={DRAFT:'草稿',READY:'待确认',BLOCKED:'待补齐',RUNNING:'运行中',WAITING_REVIEW:'待复核',
    NEEDS_ATTENTION:'待处理',COMPLETED:'已完成',CANCELLED:'已取消',NEEDS_INPUT:'待补齐',WAITING_INTEGRATION:'配置已检查 · 待接入'};
  const assetKinds=()=>assetGroups.flatMap(g=>g.types);
  const typeName=kind=>assetKinds().find(([id])=>id===kind)?.[1]||kind;
  const isExample=()=>Boolean(exampleScope||S.route.startsWith('examples'));
  function seedAsset(a){
    if(a.exampleOrigin)return true;
    const key=a.id+'@'+a.version;
    if(baselineAssets.has(key))return true;
    if(a.kind==='case'){
      const c=q().flow.cases.find(c=>c.key===(a.flowRef||key));
      return Boolean(c?.exampleOrigin||c?.version===1&&(/^(CASE-EXAMPLE-|AS-CW-028)/.test(c.id)||baselineIds.has(c.id))&&!c.origin?.sourceRef);
    }
    return /^BASELINE-/.test(a.governance?.validation?.evidence?.id||'')&&!a.derivedFrom ||
      a.id==='SUITE-PET-CONSENT'&&a.version==='r1';
  }
  function seedCapability(c){return Boolean(c.exampleOrigin||/^(fixture-package\/|a84-development-replay)/.test(c.source||''));}
  function projectTasks(){return q().tasks.filter(t=>!N.exampleTask(t));}
  function projectLegacyTasks(){return S.evalTasks.filter(t=>!t.exampleOrigin&&!['RUN-1021','RUN-1022','RUN-1023','RUN-1024'].includes(t.runId));}
  function projectAssets(kind){return allAssets().filter(a=>(!kind||a.kind===kind)&&!seedAsset(a));}
  function projectObjects(){
    const used=new Set(projectTasks().map(t=>t.objectId));
    for(const a of registry().list())if(a.config?.reusableSuite&&!seedAsset(a))used.add(a.config.reusableSuite.objectId);
    return q().objects.filter(o=>o.visible&&(o.projectRegistered||o.id.startsWith('obj-local-')&&!o.exampleOrigin||used.has(o.id)));
  }
  function empty(title,text,action=''){return `<div class="nav-empty"><h3>${h(title)}</h3><p>${h(text)}</p>${action}</div>`;}
  function start(title,text,action){return `<section class="nav-start"><div><h2>${title}</h2><p>${text}</p></div><div class="pz-actions">${action}</div></section>`;}
  function examplesLink(){return `<div class="nav-example-link"><span>需要参考完整操作？业务案例统一放在示例中心。</span>${link('打开示例中心','examples')}</div>`;}
  function page(name,description,body,actions=''){return wrap(title(name,description,actions||(['assets','capabilities','metrics'].includes(S.route)?FlowUI.contextReturn():''))+(flash?notice(h(flash)):'')+body);}
  function taskRows(tasks){return tasks.map(t=>[h(t.name)+`<small>${h(t.id)}</small>`,h(C.object(q(),t.objectId)?.name||t.pending?.name||'待选择对象'),
    badge(stateLabels[t.status]||t.status),btn(N.nextTask(t),'task',t.id,'ghost')]);}
  function taskList(tasks){return tasks.length?table(['任务','被测对象','状态','下一步'],taskRows(tasks)):
    empty('还没有评测任务','新建任务后先明确目标和对象，再准备数据、用例与指标。');}
  function overview(){
    const tasks=projectTasks(),active=tasks.filter(t=>!['COMPLETED','CANCELLED'].includes(t.status));
    return page('工作概览','从当前项目的工作继续，或发起新的评测。',
      start('开始一次评测','先选对象和固定版本，再准备材料、检查执行条件。',btn('新建评测任务','new-task','','primary'))+
      panel('继续工作',taskList(active),link('全部任务','tasks'))+
      `<div class="nav-categories">${category('接入被测对象','管理对象、固定版本与调用配置。',link('打开广场','plaza'))}
      ${category('准备评测材料','新建或导入数据、金标、用例、指标；已发布版本可供任务引用。',link('打开资产中心','assets'))}</div>`+examplesLink());
  }
  function category(name,text,actions){return `<section class="nav-category"><h2>${h(name)}</h2><p>${h(text)}</p><div class="nav-inline-actions">${actions}</div></section>`;}
  function tasks(){return page('评测任务','所有任务先在列表中选择；进入后按阶段继续。',
    listPanel('项目任务','从右上角新建任务，或复用套件；保存后按状态继续准备或查看结果。','task',projectTasks(),['任务 / 编号','被测对象','状态','操作'],t=>taskRows([t])[0])+
    (projectLegacyTasks().length?panel('已有历史任务',table(['任务','下一步'],projectLegacyTasks().map(t=>[h(t.name)+`<small>${h(t.id)}</small>`,native('打开历史任务','v2','task',t.id,'ghost')]))):'')+examplesLink(),
    createActions(btn('新建评测任务','new-task','','primary')+link('从套件创建','suite')+link('新建分环境计划','environment-plans')));}
  function objectList(){
    const objects=(isExample()?q().objects.filter(o=>o.visible):projectObjects()).filter(o=>objectType==='all'||o.type===objectType)
      .map(o=>({...o,status:o.versions.some(v=>Object.values(v.checks||{}).some(x=>x.ok))?'有已验证版本':'待完成接入',searchText:o.owner+' '+o.purpose}));
    const tabs=`<div class="flow-categories four nav-directory-categories" role="group" aria-label="对象类型">${[['all','全部类型'],...Object.entries(C.TYPES)].map(([id,name])=>`<button type="button" class="btn ${id===objectType?'selected':''}" data-dir="object-type" data-key="${h(id)}" aria-pressed="${id===objectType}">${h(name)}</button>`).join('')}</div>`;
    return page('Agent/模型广场','登记对象和调用方式，核对固定版本，再选择要评测的版本。',
      `<div class="nav-directory">${tabs}${listPanel(isExample()?'示例对象':'项目对象','从来源目录选择或手工登记；从同一行维护版本与调用配置。','object',objects,['对象 / 编号','类型 / 负责人','接入状态','操作'],o=>[
        h(o.name)+`<small>${h(o.id)} · ${h(o.purpose)}</small>`,h(C.TYPES[o.type])+'<small>'+h(o.owner)+'</small>',listBadge(o.status),native('查看版本与接入','pz','detail',o.id,'ghost')])}</div>`+(!isExample()?examplesLink():''),createActions(native('接入对象','pz','register','','primary')));
  }
  function selectAsset(kind){
    assetHome=false;assetQuery='';assetStatus='all';assetPage=0;S.assetType=kind;S.assetGroup=assetGroups.findIndex(g=>g.types.some(x=>x[0]===kind));P.route(isExample()?'examples-assets':'assets');
  }
  function assetsPage(){return assetList();}
  function assetTable(list){return list.length?table(['名称 / 固定版本','类型','状态','下一步'],list.map(a=>{
    const ref=a.flowRef||E.key(a),draft=['草稿','DRAFT'].includes(a.status);
    return [h(a.name||'未命名草稿')+`<small>${h(ref)}</small>`,h(typeName(a.kind)),badge(a.status),
      flowCase(a)?native(draft?'继续配置':'查看与维护','fl','case-open',ref,'ghost'):
      native(draft?'继续编辑':a.status==='待准入'?'查看确认进度':'查看与维护','v2',draft?'edit-asset':'asset',ref,'ghost')];
  })):empty('还没有项目资产','新建或导入后，草稿会显示在这里；发布后可以在评测任务中选择。');}
  const capabilityNames={executor:'执行器',adapter:'适配器',program:'动作与程序',scorer:'评分器'};
  const modeNames={event:'事件与多轮交互',request:'单轮请求',script:'自动化程序',device:'设备测试'};
  const evidenceNames={state:'独立状态',tool:'工具调用',dialog:'对话轨迹',event:'事件回执',response:'原始响应',artifact:'结果制品'};
  function statusName(value){return stateLabels[value]||({PUBLISHED:'已发布',REVIEW:'待审核',PAUSED:'已停用'}[value])||value||'草稿';}
  function listBadge(value){const label=statusName(value);return badge(label,label==='已发布'?'good':['草稿','待准入','待审核','待补齐'].includes(label)?'warn':'');}
  function listControls(prefix,query,status,items){
    const statuses=[...new Set(items.map(item=>statusName(item.status)))];
    const labels={asset:'资产',cap:'能力',object:'对象',task:'任务',metric:'指标',collab:'协作',run:'运行',review:'待复核记录',suite:'套件',profile:'接入组合',environment:'导入批次'};
    return `<div class="nav-list-controls"><div class="pz-search">${ic('search')}<input type="search" data-dir-field="${prefix}Query" value="${h(query)}" aria-label="搜索${labels[prefix]||'记录'}" placeholder="按名称、编号或版本搜索"></div><select data-dir-field="${prefix}Status" aria-label="筛选状态"><option value="all">全部状态</option>${statuses.map(value=>`<option value="${h(value)}"${status===value?' selected':''}>${h(value)}</option>`).join('')}</select></div>`;
  }
  function listPanel(name,description,prefix,items,heads,row){
    const state=prefix==='asset'?{query:assetQuery,status:assetStatus,page:assetPage}:prefix==='cap'?{query:capQuery,status:capStatus,page:capPage}:directoryState(prefix);
    const {query,status}=state;
    const filtered=items.filter(item=>(!query||[item.name,item.title,item.id,item.version,item.flowRef,item.searchText].join(' ').toLowerCase().includes(query.toLowerCase()))&&(status==='all'||statusName(item.status)===status));
    const lastPage=Math.max(0,Math.ceil(filtered.length/18)-1),current=Math.min(state.page,lastPage);
    if(prefix==='asset')assetPage=current;else if(prefix==='cap')capPage=current;else state.page=current;
    const rows=filtered.slice(current*18,(current+1)*18).map(row);
    return `<section class="pz-panel nav-directory-list"><div class="pz-panel-head"><div><h2>${h(name)}</h2><p>${h(description)}</p></div>${listControls(prefix,query,status,items)}</div>`+
      table(heads,rows)+(rows.length?'':empty(items.length?'没有匹配的记录':'还没有'+name,items.length?'调整搜索词或状态筛选后重试。':['asset','cap'].includes(prefix)?'从右上角新建、登记或批量导入，保存后在这里继续维护。':description))+
      `<div class="nav-list-pagination"><span>共 ${filtered.length} 条 · 第 ${current+1} / ${lastPage+1} 页</span><div class="pz-actions">${btn('上一页','list-page',prefix+'|-1','sm',current===0)}${btn('下一页','list-page',prefix+'|1','sm',current===lastPage)}</div></div></section>`;
  }
  function flowCase(a){return a.kind==='case'&&a.config?.workspaceFormat!==1;}
  function assetAction(a){const ref=a.flowRef||E.key(a),draft=['草稿','DRAFT'].includes(a.status);return flowCase(a)?native(draft?'继续配置':'查看与维护','fl','case-open',ref,'ghost'):native(draft?'继续编辑':'查看与维护','v2',draft?'edit-asset':'asset',ref,'ghost');}
  function assetColumns(a){
    if(a.kind==='case'){
      if(!flowCase(a)){
        const spec=a.config.actual||{},expected=spec.inline_expected||{};
        const hasCriterion=spec.metric_versions?.length||expected.steps?.some(step=>step.text?.trim())||Object.keys(expected).some(key=>key!=='steps');
        return [h(spec.automation?.selector?'自动化已关联 · 待试跑':'人工执行'),h(hasCriterion?'按预期或指标核对':'待补判定条件')];
      }
      const c=q().flow.cases.find(item=>item.key===(a.flowRef||E.key(a)));
      const methods=[...new Set((c?.rules||[]).map(rule=>EvaluationFlow.checks[rule.kind]?.method).filter(Boolean))];
      return [h(EvaluationFlow.methods[c?.method]||'待配置')+'<small>'+h(modeNames[c?.mode]||'待选择交互方式')+'</small>',h(methods.map(method=>({rule:'确定性检查',judge:'模型裁判',human:'人工复核'}[method]||method)).join(' + ')||'待配置')];
    }
    const actual=a.config?.actual;
    if(a.kind==='dataset')return [h(String(a.contentSet?.member_kind==='case'?(a.contentSet.members?.length||0)+' 个用例版本':actual?.samples?.length||actual?.count||actual?.rows?.length||a.count||'待填写')),h(a.governanceDomain||'待选择')+' · '+(a.contentSet?.member_kind==='case'?'用例库':'样本集合')];
    if(a.kind==='reference')return [h(String(actual?.records?.length||actual?.rows?.length||a.count||'待填写')),h(a.assetSpec?.datasetRef||actual?.dataset_ref||actual?.datasetRef||'在详情中核对配对')];
    if(a.kind==='suite')return [h(String(actual?.cases?.length?actual.cases.length+' 个用例':a.count||'待装配')),a.status==='已发布'?'固定依赖版本':'依赖待检查'];
    return [h(a.targets?.join(' / ')||'待明确'),h(a.governance?.validation?.evidence?.id||'待验证')];
  }
  function assetList(){
    if(!assetKinds().some(([id])=>id===S.assetType))S.assetType='dataset';
    const kind=S.assetType,groupIndex=assetGroups.findIndex(g=>g.types.some(([id])=>id===kind)),group=assetGroups[groupIndex];S.assetGroup=groupIndex;
    const categories=`<div class="flow-categories nav-directory-categories" role="group" aria-label="资产分类">${assetGroups.map((g,i)=>`<button type="button" class="btn ${i===groupIndex?'selected':''}" data-dir="asset-group" data-key="${i}" aria-pressed="${i===groupIndex}"><strong>${h(g.name)}</strong><small>${g.types.length} 类</small></button>`).join('')}</div>`;
    const types=`<div class="v12-asset-types" role="group" aria-label="${h(group.name)}的资产类型">${group.types.map(([id,name])=>`<button type="button" class="v12-asset-type ${id===kind?'active':''}" data-dir="asset-type" data-key="${id}" aria-pressed="${id===kind}">${h(name)}</button>`).join('')}</div>`;
    const source=(isExample()?allAssets().filter(seedAsset):projectAssets()).filter(a=>a.kind===kind);
    const technical=['executor','adapter','scorer'].includes(kind);
    const columns={case:['执行方式','判定方式'],dataset:['内容规模','治理域 / 内容类型'],reference:['内容规模','配对数据集'],suite:['用例规模','依赖状态']}[kind]||['适用范围','验证证据'];
    const body=technical?capabilityList(kind,'asset'):listPanel(typeName(kind),kind==='case'?'可在同一用例内配置确定性检查、模型裁判和人工复核。执行方式另行选择。':'维护同一资产的固定版本，发布后可供评测任务复用。','asset',source,[kind==='case'?'用例 / 固定版本':'资产 / 固定版本',...columns,'状态','操作'],a=>[h(a.name||'未命名草稿')+'<small>'+h(a.flowRef||E.key(a))+'</small>',...assetColumns(a),listBadge(a.status),assetAction(a)]);
    const name=kind==='case'?'用例':typeName(kind);
    return page('资产中心','维护可复用资产；发布后的固定版本可以直接加入评测任务。',
      `<div class="nav-directory">${categories}${types}${body}</div>`+(kind==='case'&&!isExample()?(MultiEnvUI.assetEntry()||''):'')+(!isExample()?examplesLink():''),
      `<div class="nav-create-actions">${btn((technical?'登记':'新建')+h(name),'new-asset',kind,'primary')}${btn('批量导入','import',kind)}${kind==='case'?btn('从自动化导入','case-code',kind):''}</div>`+FlowUI.contextReturn());
  }
  function capabilityList(kind,prefix='cap'){
    const assets=(isExample()?allAssets().filter(seedAsset):projectAssets()).filter(a=>a.kind===kind);
    const caps=q().flow.capabilities.filter(c=>Boolean(seedCapability(c))===isExample()&&(c.kind===kind||kind==='program'&&c.kind==='action')).map(c=>({...c,entryType:'capability'}));
    const items=[...caps,...assets.map(a=>({...a,entryType:kind==='scorer'?'scorer':'description'}))];
    const descriptions={executor:'执行器负责准备、调用、等待、采证、取消与清理。',adapter:'适配器负责协议与字段映射，并关联固定接口版本。',program:'维护动作与自动化程序的固定实现、输入输出和验证记录。',scorer:'维护计算实现、适用指标及验证证据，发布后供评测复用。'};
    return listPanel(capabilityNames[kind]+'版本',descriptions[kind],prefix,items,['名称 / 固定版本',kind==='scorer'?'评分实现与验证证据':'支持方式与证据','负责人','状态','操作'],item=>{
      let detail,action;
      if(item.entryType==='capability'){
        detail=h((item.modes||[]).map(mode=>modeNames[mode]||mode).join(' / ')||'待配置')+'<small>'+h((item.evidence||[]).map(e=>evidenceNames[e]||e).join(' / ')||'待声明采集内容')+'</small>';
        action=native(item.status==='DRAFT'?'继续登记':item.status==='REVIEW'?'查看验证与审核':'查看与维护','fl','cap-open',item.id,'ghost');
      }else if(item.entryType==='description'){
        detail='导入的登记说明<small>实现与验证待补齐</small>';action=native('维护说明','v2','asset',E.key(item),'ghost')+btn('登记实现','cap-from-description',E.key(item),'ghost');
      }else{detail=h(item.config?.actual?.implementation||'实现待绑定')+'<small>'+h(item.governance?.validation?.evidence?.id||'待验证')+'</small>';action=assetAction(item);}
      return [h(item.name||'未命名能力')+'<small>'+h(item.entryType==='capability'?item.id:E.key(item))+'</small>',detail,h(item.owner||'待分配'),listBadge(item.status),action];
    });
  }
  function capabilities(){
    if(!capabilityNames[capKind])capKind='executor';
    const tabs=`<div class="flow-categories four nav-directory-categories" role="group" aria-label="能力类型">${Object.entries(capabilityNames).map(([id,name])=>`<button type="button" class="btn ${id===capKind?'selected':''}" data-dir="cap-kind" data-key="${id}" aria-pressed="${id===capKind}">${h(name)}</button>`).join('')}</div>`;
    const requests=q().flow.requests.length?panel('待补齐需求',table(['内容','负责人','下一步'],q().flow.requests.map(r=>[h(r.text),h(r.owner),btn('登记实现','choose-cap')]))):'';
    return page('执行与评分能力','登记实现、验证资格并发布；任务复用已验证且范围兼容的固定版本。',
      `<div class="nav-directory">${tabs}${capabilityList(capKind)}</div>`+requests+examplesLink(),
      link('环境接入组合','connection-profiles')+`<div class="nav-create-actions">${btn('登记'+capabilityNames[capKind],'new-cap',capKind,'primary')}${btn('批量导入','import-cap',capKind)}</div>`+FlowUI.contextReturn());
  }
  function metrics(){return page('独立指标目录','可执行指标由资产中心维护；口径参考只用于理解定义，不能直接执行。',
    listPanel('项目指标','从右上角新建或导入，定义统计口径、绑定评分实现，试算后发布。','metric',projectAssets('metric'),['指标 / 固定版本','适用范围','验证证据','状态','操作'],a=>[h(a.name)+'<small>'+h(E.key(a))+'</small>',...assetColumns(a),listBadge(a.status),assetAction(a)])+examplesLink(),
    createActions(btn('新建指标','new-asset','metric','primary')+btn('批量导入','import','metric'))+link('查阅指标口径','metric-definitions')+FlowUI.metricDirectoryReturn());}
  function collab(){
    const works=registry().db.works.filter(w=>isExample()?w.id==='CW-028':w.id!=='CW-028');
    return page('人机协作','围绕任务或资产讨论，审查建议，再把确定的修改写回原版本。',
      listPanel('协作事项','选择右上角“发起协作”，关联任务或资产；保存后在同一事项中继续。','collab',works,['事项 / 编号','关联内容','状态','操作'],w=>[h(w.title)+'<small>'+h(w.id)+'</small>',h(w.assetKey||w.taskId||'待关联'),listBadge(w.status),native(w.status==='已关闭'?'查看记录':'继续协作','cm','open',w.id,'ghost')])+(!isExample()?examplesLink():''),!isExample()?createActions(btn('发起协作','new-work','','primary')):'');
  }
  function runRows(){return N.runs(q(),S.runs,isExample()).map(r=>({...r,manifest:r.origin==='current'?C.task(q(),r.taskId)?.run?.manifest:r.snapshot?.manifest}));}
  const runButton=(r,label)=>btn(label||'查看证据与报告','run',r.origin+'|'+r.taskId+'|'+r.id,'ghost');
  function runs(){const rows=runRows();return page('运行与证据','从已发起的评测查看执行进度、回传证据和计算报告。',
    listPanel('运行记录','完成任务预检与确认并发起执行后，运行显示在这里。','run',rows,['运行 / 任务','执行状态','质量结论','操作'],r=>[h(r.name)+`<small>${h(r.id)} · ${h(r.taskId||'历史记录')}</small>`,listBadge(r.status),badge(r.verdict),runButton(r)])+examplesLink(),createActions(link('打开评测任务','tasks','primary')));}
  function review(){
    const rows=runRows().filter(r=>['WAITING_REVIEW','NEEDS_ATTENTION'].includes(r.status)||['INCONCLUSIVE','UNKNOWN'].includes(r.verdict));
    return page('评分与复核','从待办打开对应运行，核对证据并处理缺证或人工判定。',
      listPanel('待处理记录','运行出现人工判定、评分异常或缺证时，系统将记录列在这里。','review',rows,['来源 / 编号','当前结论','操作'],r=>[h(r.name)+`<small>${h(r.id)}</small>`,badge(r.verdict),runButton(r,'打开原任务处理')])+examplesLink(),
      createActions(link('查看所有运行','runs','primary')+link('裁判校准','calibration')+link('独立人工评测','human')));
  }
  const originalTodos=EvalUI.getTodos;
  function projectTodos(){return originalTodos().filter(item=>{
    if(item.assetKey){const asset=registry().find(item.assetKey);if(asset&&seedAsset(asset))return false;}
    if(['RUN-1021','RUN-1022','RUN-1023','RUN-1024'].includes(item.runId))return false;
    const task=C.task(q(),item.taskId);return !task||!N.exampleTask(task);
  });}
  EvalUI.getTodos=projectTodos;
  function inbox(){const items=projectTodos();return page('我的待办','只列出当前项目需要处理的事项；示例待办在示例中心体验。',
    listPanel('当前待办','资产确认、运行复核或补证触发后，系统将事项列在这里。','inbox',items.map(x=>({...x,status:'待处理'})),['事项','固定版本 / 审批单','处理角色','操作'],x=>[h(x.title),h(x.version+' · '+x.id),h(x.assigneeName||roleNames[x.role]||''),x.assetKey?native('查看并处理','v2','asset',x.assetKey):native('补证与复核','v2','run-open',x.runId)])+examplesLink(),createActions(link('查看评测任务','tasks','primary')));}
  const qualityInfo={
    calibration:{name:'裁判校准',action:'新建校准计划',list:'项目校准计划',desc:'选择评分器版本、样本、独立金标与规约，再准备统计验收。',next:'评分维护人准备材料 → 专家确认金标与方案 → 独立校准服务执行 → 质量负责人审核资格'},
    human:{name:'独立人工评测',action:'新建评审批次',list:'项目评审批次',desc:'先选择来源运行与证据，再固定规约和两位独立评审。',next:'组织者建立批次 → 两位评审独立提交 → 专家处理分歧 → 质量负责人审核'},
    regression:{name:'持续评测与回归',action:'新建回归订阅',list:'项目回归订阅',desc:'先选择对象、已发布套件和触发事件，再核对预算与接入条件。',next:'确认回归用例与套件 → 配置触发条件 → 验证事件接入 → 启用后每次重新预检'}
  };
  function quality(kind){const info=qualityInfo[kind],items=model().plans.filter(x=>x.kind===kind);return page(info.name,info.desc,
    listPanel(info.list,info.next,kind,items,['名称 / 编号','版本','状态','操作'],p=>[h(p.name)+`<small>${h(p.id)}</small>`,h('r'+p.revision),listBadge(p.status),btn(p.status==='WAITING_INTEGRATION'?'查看接入缺项':'继续配置','plan',p.id,'ghost')])+
    (kind==='regression'?panel('从问题结果准备回归','<p class="nav-list-hint">核对原始证据后，在资产中心建立回归用例。</p>'+link('查看运行与证据','runs')+btn('打开用例库','asset-type','case')):'')+examplesLink(),createActions(btn(info.action,'new-plan',kind,'primary')));}
  const fieldNames={scorer:'评分器固定版本',data:'校准样本版本',gold:'独立金标版本',rubric:'评分规约版本',criteria:'统计方案与验收条件',
    run:'来源运行',reviewerA:'评审账号 A',reviewerB:'评审账号 B',object:'被测对象',suite:'已发布套件版本',event:'触发事件',budget:'单次预算上限'};
  function optionsFor(key){
    const kinds={scorer:'scorer',data:'dataset',gold:'reference',rubric:'rubric',suite:'suite'};
    if(kinds[key])return projectAssets(kinds[key]).filter(a=>a.status==='已发布').map(a=>[a.flowRef||E.key(a),a.name+' · '+(a.flowRef||E.key(a))]);
    if(key==='run')return runRows().filter(r=>r.snapshot).map(r=>[r.id,r.name+' · '+r.id]);
    if(key==='object')return projectObjects().map(o=>[o.id,o.name]);
    if(key==='event')return [['version.published','新的对象版本发布'],['fix.completed','缺陷修复事件'],['schedule','定期触发（需接入调度服务）']];
    return null;
  }
  function planField(key,item){
    const value=item.fields[key]||'',options=optionsFor(key),label=fieldNames[key];
    if(options)return `<label class="pz-field">${label}<select data-dir-plan="${key}"><option value="">请选择${h(label)}</option>${options.map(([id,name])=>`<option value="${h(id)}"${id===value?' selected':''}>${h(name)}</option>`).join('')}</select>${options.length?'':'<small>暂无项目记录；请先在对应目录准备并发布。</small>'}</label>`;
    return `<label class="pz-field">${label}${key==='criteria'?`<textarea data-dir-plan="${key}" placeholder="样本量、数据划分、统计方法和通过条件">${h(value)}</textarea>`:
      `<input data-dir-plan="${key}" type="${key==='budget'?'number':'text'}" value="${h(value)}" placeholder="${key==='budget'?'输入大于 0 的预算':'填写独立评审账号'}">`}</label>`;
  }
  function planDetail(){const item=model().plans.find(x=>x.id===planId);if(!item)return quality('calibration');const info=qualityInfo[item.kind];
    const issueRows=item.check?.issues.map(i=>[h(fieldNames[i.key]),h(i.reason)])||[];
    return page(item.name,item.id+' · r'+item.revision+' · '+stateLabels[item.status],
      panel('配置'+N.planKinds[item.kind].name,`<div class="pz-fields nav-form"><label class="pz-field">名称<input data-dir-plan="name" value="${h(item.name)}"></label>${N.planKinds[item.kind].fields.map(key=>planField(key,item)).join('')}</div>`+
      '<p class="nav-detail-note">输入按字段保存为草稿。配置检查只核对完整性，不能代替真实服务执行与审核。</p>'+`<div class="nav-actions-row">${btn('保存草稿','save-plan','','primary')}${btn('检查配置','check-plan')}</div>`)+
      (item.check?panel('检查结果与下一步',issueRows.length?table(['待补齐项目','原因'],issueRows):
        notice(item.kind==='calibration'?'配置字段完整。下一步由评分维护人与平台运维接入独立校准服务并验证资格，当前没有服务执行回执。':
          item.kind==='human'?'配置字段完整。下一步接入真实账号与盲评证据隔离，验证两位评审互不可见后才能分配。':
          '配置字段完整。下一步接入事件来源、去重与调度，并验证预算预检；当前订阅未启用。','warn')):'')+
      panel('准备缺失依赖',`<div class="pz-actions">${item.kind==='regression'?btn('维护评测套件','prepare-plan','suite'):btn('准备数据、金标与规约','prepare-plan','assets')}${btn('维护执行与评分能力','prepare-plan','capabilities')}${btn('维护资源接入','prepare-plan','resources')}${btn('导出配置清单','export-plan')}</div>`)+
      '<p class="nav-subtle">真实校准执行、盲评服务和事件调度尚未接入；完整操作示例可从示例中心体验。</p>',link('返回'+info.list,item.kind));
  }
  function experiments(){const rows=runRows().filter(r=>r.mode==='standard'&&r.metric?.state==='COMPUTED');
    const select=(label,key,value)=>`<label class="pz-field">${label}<select data-dir-field="${key}"><option value="">请选择运行</option>${rows.map(r=>`<option value="${h(r.id)}"${r.id===value?' selected':''}>${h(r.name+' · '+r.id)}</option>`).join('')}</select></label>`;
    return page('实验与版本对比','先主动选择两个运行，核对比较条件一致后再解释差异。',
      start('建立一次版本对比','普通任务完成计算后，可在这里选择基线与候选。基线需要通过。',link('查看运行列表','runs','primary'))+
      panel('选择比较对象',rows.length<2?empty('还需要两份可计算的运行结果','先完成相同数据、用例、指标和环境下的两个对象版本评测。'):
        `<div class="pz-fields">${select('基线运行','comparisonA',comparisonA)}${select('候选运行','comparisonB',comparisonB)}</div><div class="nav-actions-row">${btn('检查可比性','compare','','primary',!comparisonA||!comparisonB)}</div>`)+
      (comparison?panel('比较结果',comparison.ok?notice('条件可比；所选指标变化 '+(comparison.delta*100).toFixed(1)+' 个百分点。','good'):
        notice(comparison.reasons.map(h).join('<br>'),'warn')):'')+examplesLink());
  }
  function trends(){const rows=runRows().filter(r=>r.snapshot);return page('质量趋势','按固定运行快照查看指标与覆盖；不同口径分开展示。',
    listPanel('项目结果快照','运行完成并形成快照后显示；不同统计口径分开查看。','trend',rows,['运行 / 编号','质量结论','所选指标 / 结果','操作'],r=>[h(r.name)+`<small>${h(r.id)}</small>`,badge(r.verdict),r.metric?h(r.metric.name||r.metric.metricRef)+'<small>'+h(r.metric.value==null?'未计算':(r.metric.value*100).toFixed(1)+'%')+'</small>':'按任务报告查看；不与其他口径混合汇总',runButton(r)])+examplesLink(),createActions(link('比较版本','experiments','primary')+link('打开评测任务','tasks')));}
  function environments(){const batches=(q().multiEnv?.imports||[]).filter(b=>!b.exampleOrigin);return page('新建分环境计划','先选择已导入的用例批次，再按环境标签拆分执行范围。',
    listPanel('来源批次','从右上角导入工作簿后，选择本次要使用的批次与对象。','environment',batches.map(b=>({...b,name:b.source.file,id:b.sourceId,version:b.revision,status:'已导入'})),['工作簿 / 版本','用例数','操作'],b=>[h(b.source.file)+'<small>'+h(b.source.sheet)+' · v'+b.revision+'</small>',String(b.cases.length),btn('选择并创建计划','environment-plan',b.sourceId,'ghost')])+examplesLink(),createActions(link('导入分环境工作簿','flow-import','primary')+link('返回评测任务','tasks')));}
  function profiles(){const profiles=(q().multiEnv?.profiles||[]).filter(p=>!p.exampleOrigin&&!/-verified@/.test(p.id));return page('环境接入组合','先选择要维护的组合。新组合不预填业务设备或协议。',
    listPanel('接入组合','从右上角新建，绑定执行器、适配器、资源与观察方式，验证后供任务复用。','profile',profiles.map(p=>({...p,status:p.qualification?.ok?'已验证':'待验证'})),['组合 / 固定版本','环境','状态','操作'],p=>[h(p.name)+'<small>'+h(p.id)+'</small>',h(MultiEnvCore.environments[p.environment]||p.environment),listBadge(p.status),btn('查看与维护','profile',p.id,'ghost')])+examplesLink(),createActions(btn('新建接入组合','new-profile','','primary')+link('返回执行与评分能力','capabilities')));}
  function resources(){return page('资源与接入','按来源连接、执行环境或异常恢复选择要维护的内容。',
    listPanel('来源连接','接入负责人维护目录连接与调用入口；平台运维维护执行环境和身份。','resource',C.SOURCES.map(s=>({...s,status:s.connected?'已登记演示连接':'待接入'})),['来源系统','状态','操作'],s=>[h(s.name),listBadge(s.status),native('维护来源连接','fl','source-open',s.id,'ghost')])+
    panel('其他接入工作',`<div class="pz-actions">${link('对象调用配置','plaza')}${link('执行器与适配器','capabilities')}${link('环境接入组合','connection-profiles')}${link('查看异常恢复','resource-recovery')}</div>`),createActions(link('维护执行环境','resource-settings','primary')));}
  function permissions(){return page('权限管理','选择要维护的权限配置；发布修改前查看对现有任务的影响。',
    start('配置角色与工作流','管理员维护权限包和适用规则，已有任务继续引用原固定版本。',btn('管理权限包','permission-tab','packages','primary'))+
    `<div class="nav-categories">${category('角色与权限','查看各角色允许的动作与责任边界。',btn('查看角色权限','permission-tab','roles'))}
    ${category('适用规则','配置部门、对象类型与权限包的匹配。',btn('维护适用规则','permission-tab','rules'))}
    ${category('变更记录','核对配置版本、操作人和发布记录。',btn('查看变更记录','permission-tab','history'))}</div>`+
    (S.role==='admin'?'':notice('当前角色可查看。编辑和发布由平台管理员操作。')));}
  function cost(){const ledger=S.prd15.ledger;return page('预算与成本','查看已批准预算、计价版本、计量记录与待核查事项。',
    start('查看预算与计价依据','运行自动采集用量；出现异常时按记录处理，不需要手动新建费用记录。',link('查看计量明细','cost-details','primary'))+
    panel('当前批准配置',kv([['预算上限','¥'+(ledger.limit/10000).toFixed(2)],['计价版本',h(ledger.rateVersion)],['待核查金额','¥'+(ledger.pending/10000).toFixed(2)],
      ['配置维护','预算与价格的批准和变更由获准成本人员处理；此原型暂不提供正式配置发布。']]))+
    panel('下一步',link('查看任务运行','runs')+link('查看资源配额','resource-settings')));}
  function exampleCenter(){return page('示例中心','按需要打开业务案例；进入此页不会创建任务或修改项目配置。',
    `<div class="nav-example-groups">`+
    panel('宠物出行 V2',`<p class="nav-list-hint">从原表导入，构建 E01–E06，拆成云端、台架、实车计划，核对 Ripple 回传。</p><div class="pz-actions">${btn('从 V2 工作簿开始','example','flow-import','primary')}${btn('查看接入组合示例','example-profile')}${btn('查看套件示例','example','suite')}</div>`)+
    panel('三个评测框架',`<p class="nav-list-hint">OpenCompass 数值题、AgentCompass 宠物 E03、Ragas 制度问答；查看能力准备、验证与评测全过程。</p><div class="pz-actions">${btn('选择框架评测案例','example','framework-templates')}${btn('框架能力登记示例','example-framework')}</div>`)+
    panel('按模块了解操作',`<div class="pz-actions">${[['校准全过程','calibration'],['双人盲评','human'],['回归订阅','regression'],['人机协作','collab'],['对象接入','plaza'],['资产与用例','assets'],['执行与评分能力','capabilities'],['历史运行与证据','runs'],['指标口径与业务配置','metrics'],['统计覆盖口径','trends']].map(([name,key])=>btn(name,'example',key)).join('')}</div>`)+
    panel('示例中产生的记录',taskList(q().tasks.filter(t=>N.exampleTask(t)&&t.id!=='EV-N001')))+
    `</div>`,link('返回工作概览','overview'));
  }
  function examplePage(kind){
    let body;
    if(kind==='suite')body=SuiteUI.examplePage();
    else if(kind==='assets')body=assetList();
    else if(kind==='plaza')body=objectList();
    else if(kind==='capabilities')body=capabilities();
    else if(kind==='collab')body=collab();
    else if(kind==='runs')body=runs();
    else body=previous[kind]?.()||previous.demos();
    return body;
  }
  function newWork(){
    const refs=[...projectTasks().map(t=>['task|'+t.id,t.name+' · '+t.id]),...projectAssets().filter(a=>registry().find(a.flowRef||E.key(a))).map(a=>['asset|'+(a.flowRef||E.key(a)),a.name+' · '+(a.flowRef||E.key(a))])];
    modal('发起协作',`<div class="pz"><label class="pz-field">协作事项名称<input id="dir-work-name" placeholder="说明要一起解决的问题"></label><label class="pz-field">关联任务或资产<select id="dir-work-ref"><option value="">请选择</option>${refs.map(([id,name])=>`<option value="${h(id)}">${h(name)}</option>`).join('')}</select></label>${refs.length?'':'<p>请先创建项目任务或资产，再围绕该记录协作。</p>'}</div>`,btn('取消','close')+btn('创建协作事项','save-work','','primary'));
  }
  function createDialog(kind){modal('新建'+N.planKinds[kind].name,`<label class="pz-field">名称<input id="dir-plan-name" placeholder="填写便于查找的名称" maxlength="100"></label><p class="nav-subtle">先保存名称，再选择材料和负责人。不会自动带入某个业务案例。</p>`,btn('取消','close')+btn('创建草稿','create-plan',kind,'primary'));}
  function chooseImport(){modal('选择批量导入的资产类型',`<div class="pz nav-actions-row">${assetKinds().filter(([k])=>AssetBulkCore.types[k]).map(([kind,name])=>btn(name,'import',kind)).join('')}</div><p>选定类型后，下载对应模板或上传 Excel、CSV、TSV、JSON / JSONL。</p>`,btn('关闭','close'));}
  function chooseCapability(){modal('登记哪一种能力？',`<div class="pz nav-categories">${[['executor','执行器','负责运行、等待、采证和清理'],['adapter','适配器','负责协议和数据映射'],['program','动作与程序','登记固定自动化程序或动作实现'],['scorer','评分器','读取证据，按固定规则计算指标']].map(([id,name,desc])=>category(name,desc,btn('登记'+name,'new-cap',id,'primary'))).join('')}</div>`,btn('取消','close'),true);}
  function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function newAsset(kind){
    EvalUI.forceClose();assetHome=false;S.assetType=kind;S.assetGroup=assetGroups.findIndex(g=>g.types.some(([id])=>id===kind));
    if(kind==='case'){FlowUI.newCase();return;}
    if(kind==='suite'){SuiteUI.newSuite();return;}
    if(['executor','adapter'].includes(kind)){FlowUI.newCapability(kind);return;}
    S.v2.activeAsset=null;S.v2.editContext=null;P.route('assets');EvalUI.editAsset(null);
  }
  function openRun(key){const [origin,taskId,id]=key.split('|');if(origin==='current'){const task=C.task(q(),taskId);if(!task)throw Error('来源任务不存在。');
    if(task.frameworkPlan)task.frameworkPlan.step=task.status==='COMPLETED'?4:3;
    else if(task.suitePlan)task.suitePlan.stage=task.status==='COMPLETED'?'report':'handoff';
    else task.step=task.status==='COMPLETED'||task.status==='WAITING_REVIEW'?5:4;
    P.openTask(taskId);
  }else{const run=S.runs.find(r=>r.id===id);if(run?.prd)PRDUI.handle('report',id);else{S.runId=id;go('run');}}}
  function chooseProfile(id){MultiEnvUI.openProfile(id);}
  function savePlanFields(){
    const item=model().plans.find(x=>x.id===planId);if(!item||S.route!=='directory-plan')return;
    const input={name:item.name,fields:{...item.fields}};
    document.querySelectorAll('[data-dir-plan]').forEach(el=>{const key=el.dataset.dirPlan;if(key==='name')input.name=el.value;else input.fields[key]=el.value;});
    N.updatePlan(item,input);P.persist();
  }
  function handle(action,key){
    flash='';
    switch(action){
      case 'go':EvalUI.forceClose();exampleScope=key==='examples'?'':exampleScope;if(!key.startsWith('examples'))exampleScope='';if(key==='assets')assetHome=true;FlowUI.clearReturnContext();P.route(key);return;
      case 'close':EvalUI.forceClose();return;
      case 'new-task':exampleScope='';P.newTask();return;
      case 'task':{EvalUI.forceClose();const t=C.task(q(),key);exampleScope=t.exampleOrigin||'';if(t.status==='COMPLETED'){if(t.frameworkPlan)t.frameworkPlan.step=4;else if(!t.suitePlan)t.step=5;}P.openTask(key);return;}
      case 'search-work':EvalUI.forceClose();S.activeWork=key;P.route('work');return;
      case 'asset-home':exampleScope='';assetHome=true;P.route('assets');return;
      case 'asset-type':selectAsset(key);return;
      case 'asset-group':{const group=assetGroups[Number(key)];if(group)selectAsset(group.types.some(([id])=>id==='case')?'case':group.types[0][0]);return;}
      case 'new-asset':newAsset(key);return;
      case 'choose-import':chooseImport();return;
      case 'import':importOrigin=['assets','examples-assets','capabilities','examples-capabilities','metrics','suite'].includes(S.route)?S.route:'assets';EvalUI.forceClose();S.assetType=key;assetHome=false;P.route('import');return;
      case 'import-return':EvalUI.forceClose();S.assetType=key;assetQuery='';assetStatus='all';assetPage=0;if(importOrigin.includes('capabilities')){capKind=key;capQuery='';capStatus='all';capPage=0;}P.route(importOrigin||'assets');return;
      case 'import-cap':if(['executor','adapter','scorer'].includes(key)){handle('import',key);return;}
        modal('批量导入能力说明',`<div class="pz"><p>当前支持批量导入执行器、适配器和评分器的登记说明；导入后继续补齐实现与验证。动作与程序请使用单条登记。</p><div class="pz-actions">${['executor','adapter','scorer'].map(kind=>btn('导入'+capabilityNames[kind],'import',kind)).join('')}</div></div>`,btn('关闭','close'));return;
      case 'object-type':objectType=key;directoryState('object').page=0;break;
      case 'cap-kind':capKind=key;capQuery='';capStatus='all';capPage=0;break;
      case 'list-page':{const [prefix,delta]=key.split('|');if(prefix==='asset')assetPage=Math.max(0,assetPage+Number(delta));else if(prefix==='cap')capPage=Math.max(0,capPage+Number(delta));else directoryState(prefix).page=Math.max(0,directoryState(prefix).page+Number(delta));break;}
      case 'choose-cap':chooseCapability();return;
      case 'new-cap':EvalUI.forceClose();if(key==='scorer')newAsset('scorer');else FlowUI.newCapability(key);return;
      case 'cap-from-description':{const asset=registry().find(key);if(!asset)throw Error('来源说明不存在。');FlowUI.newCapability(asset.kind,asset);return;}
      case 'new-work':newWork();return;
      case 'save-work':{
        const name=document.getElementById('dir-work-name').value.trim(),ref=document.getElementById('dir-work-ref').value;
        if(!name||!ref)throw Error('请填写名称并选择关联记录。');
        const [kind,id]=ref.split('|'),w={id:registry().id('CW'),title:name,status:'进行中',messages:[],[kind==='task'?'taskId':'assetKey']:id};
        if(kind==='task'){w.plazaTaskId=id;const target=C.task(q(),id);target.revision??=1;P.persist();}
        registry().db.works.push(w);EvalUI.commit();EvalUI.forceClose();S.activeWork=w.id;P.route('work');return;
      }
      case 'run':openRun(key);return;
      case 'new-plan':if(!['engineer','expert','quality','ops'].includes(S.role))throw Error('请由评测、评分或评审负责人创建。');createDialog(key);return;
      case 'create-plan':{const item=N.createPlan(q(),key,{name:document.getElementById('dir-plan-name').value});planId=item.id;EvalUI.forceClose();P.route('directory-plan');return;}
      case 'plan':planId=key;P.route('directory-plan');return;
      case 'save-plan':savePlanFields();flash='草稿已保存。返回列表后可以继续配置。';break;
      case 'check-plan':savePlanFields();N.checkPlan(model().plans.find(x=>x.id===planId));break;
      case 'prepare-plan':savePlanFields();preparationPlan=planId;if(key==='assets')assetHome=true;P.route(key);return;
      case 'return-plan':planId=preparationPlan;preparationPlan='';P.route('directory-plan');return;
      case 'export-plan':{const item=model().plans.find(x=>x.id===planId);download({schema:'evaluation-preparation-plan@1',scope:'CONFIGURATION_ONLY',...item},item.id+'-配置清单.json');return;}
      case 'compare':{const rows=runRows();comparison=N.comparison(rows.find(r=>r.id===comparisonA),rows.find(r=>r.id===comparisonB));break;}
      case 'environment-plan':{
        const batch=q().multiEnv.imports.find(x=>x.sourceId===key);if(!batch)throw Error('该批次已不存在，请重新选择。');
        modal('为分环境计划选择对象',`<div class="pz"><p>用例来源：${h(batch.source.file)} · ${batch.cases.length} 条。</p><label class="pz-field">被测对象<select id="dir-plan-object"><option value="">请选择对象</option>${projectObjects().map(o=>`<option value="${h(o.id)}">${h(o.name)}</option>`).join('')}</select></label><p>创建后在任务内继续核对固定版本、环境和执行依赖。</p></div>`,btn('取消','close')+btn('创建分环境计划','confirm-environment',key,'primary'));return;
      }
      case 'confirm-environment':{const id=document.getElementById('dir-plan-object').value;if(!id)throw Error('请选择被测对象。');EvalUI.forceClose();MultiEnvUI.createPlanFor(key,id,environmentStage);environmentStage='coverage';return;}
      case 'new-profile':modal('选择接入环境',`<div class="pz-actions">${Object.entries(MultiEnvCore.environments).map(([id,name])=>btn(name,'profile-new',id)).join('')}</div>`,btn('取消','close'));return;
      case 'profile-new':EvalUI.forceClose();MultiEnvUI.openProfile(null,key);return;
      case 'profile':chooseProfile(key);return;
      case 'permission-tab':S.prd15.permissionTab=key;P.route('permission-settings');return;
      case 'example':exampleScope=key;if(key==='flow-import'||key==='framework-templates')P.route(key);else{if(key==='assets')S.assetType='dataset';P.route('examples-'+key);}return;
      case 'example-asset':S.assetType=key;break;
      case 'example-framework':exampleScope='framework';FrameworkEvaluationUI.openCapabilities();return;
      case 'example-profile':exampleScope='profile';MultiEnvUI.openExampleProfile();return;
    }
    P.paint();
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-dir]');if(!b||b.disabled)return;e.preventDefault();e.stopImmediatePropagation();
    try{handle(b.dataset.dir,b.dataset.key||'');}catch(error){toast(error.message,'error');}
  },true);
  function updateDirectoryField(field,value){
    const listField=field.match(/^(.+)(Query|Status)$/);
    if(listField&&!['asset','cap'].includes(listField[1])){const state=directoryState(listField[1]);state[listField[2].toLowerCase()]=value;state.page=0;}
    if(field==='assetQuery'){assetQuery=value;assetPage=0;}if(field==='assetStatus'){assetStatus=value;assetPage=0;}
    if(field==='capQuery'){capQuery=value;capPage=0;}if(field==='capStatus'){capStatus=value;capPage=0;}
    if(field==='comparisonA')comparisonA=value;if(field==='comparisonB')comparisonB=value;
    comparison=null;
  }
  function paintDirectoryField(field,selection){
    P.paint();
    const input=Array.from(document.querySelectorAll('[data-dir-field]')).find(el=>el.dataset.dirField===field);
    if(input){input.focus({preventScroll:true});if(selection&&input.setSelectionRange)input.setSelectionRange(...selection);}
  }
  document.addEventListener('input',e=>{
    if(e.target.dataset.dirPlan){savePlanFields();return;}
    const field=e.target.dataset.dirField;
    if(field?.endsWith('Query')&&!e.isComposing){
      const selection=[e.target.selectionStart,e.target.selectionEnd];
      updateDirectoryField(field,e.target.value);paintDirectoryField(field,selection);
    }
  });
  document.addEventListener('change',e=>{
    const key=e.target.dataset.dirPlan;if(key){savePlanFields();return;}
    const field=e.target.dataset.dirField;if(field){updateDirectoryField(field,e.target.value);paintDirectoryField(field);}
  });
  // Only the directory button resets to its overview. Contextual links from a task keep their source task.
  document.addEventListener('click',e=>{
    const n=e.target.closest('#nav [data-action]');if(!n){const x=e.target.closest('[data-fl],[data-v2],[data-action],[data-me]');if(x&&(x.dataset.fl==='task-cases'||x.dataset.v2==='asset-kind'||x.dataset.action==='asset-type'||x.dataset.me==='case-library'))assetHome=false;return;}
    exampleScope='';flash='';assetQuery='';assetStatus='all';assetPage=0;capQuery='';capStatus='all';capPage=0;objectQuery='';preparationPlan='';FlowUI.clearReturnContext();
    for(const key of Object.keys(directoryStates))delete directoryStates[key];
    if(n.dataset.action==='asset-type'&&['executor','adapter','scorer','suite'].includes(n.dataset.param)){e.preventDefault();e.stopImmediatePropagation();selectAsset(n.dataset.param);return;}
    if(n.dataset.action==='go'&&n.dataset.param==='assets')assetHome=true;
    if(['asset-group','asset-type'].includes(n.dataset.action))assetHome=false;
  },true);
  Object.assign(pages,{overview,tasks,plaza:objectList,assets:assetsPage,capabilities,metrics,collab,runs,review,inbox,
    calibration:()=>quality('calibration'),human:()=>quality('human'),regression:()=>quality('regression'),experiments,trends,
    resources,permissions,cost,examples:exampleCenter,'directory-plan':planDetail,'environment-plans':environments,
    'connection-profiles':profiles,'resource-settings':()=>link('返回资源与接入','resources')+previous.resources(),
    'resource-recovery':()=>link('返回资源与接入','resources')+previous['flow-legacy-resources'](),
    'permission-settings':()=>link('返回权限总览','permissions')+previous.permissions(),
    'cost-details':()=>link('返回预算与成本','cost')+previous.cost(),
    'metric-definitions':()=>link('返回指标目录','metrics')+previous.metrics()});
  for(const key of ['suite','calibration','human','regression','collab','plaza','assets','capabilities','runs','metrics','trends'])pages['examples-'+key]=()=>examplePage(key);
  if(!navGroups.some(g=>g.items.some(([id])=>id==='examples')))navGroups.push({name:'帮助与示例',items:[['examples','示例中心','play']]});
  searchResults=function(query){
    const text=query.trim().toLowerCase(),matches=value=>String(value).toLowerCase().includes(text);
    const pageRows=navGroups.flatMap(g=>g.items).filter(([id,name])=>matches(name)).map(([id,name])=>link('页面 · '+name,id));
    const assetRows=projectAssets().filter(a=>matches(a.name+' '+a.id)).map(a=>flowCase(a)?native('用例 · '+h(a.name)+' · '+h(a.flowRef),'fl','case-open',a.flowRef):native(typeName(a.kind)+' · '+h(a.name)+' · '+h(E.key(a)),'v2','asset',E.key(a)));
    const taskRows=projectTasks().filter(t=>matches(t.name+' '+t.id)).map(t=>btn('任务 · '+h(t.name)+' · '+h(t.id),'task',t.id));
    const workRows=registry().db.works.filter(w=>w.id!=='CW-028'&&matches(w.title+' '+w.id)).map(w=>btn('协作 · '+h(w.title),'search-work',w.id));
    return `<div class="nav-search-results">${[...pageRows,...assetRows,...taskRows,...workRows].slice(0,30).join('')||'<p>没有匹配的项目记录。业务示例请从“示例中心”打开。</p>'}</div>`;
  };
  const genericRoutes=new Set(['overview','tasks','plaza','assets','capabilities','metrics','collab','runs','review','calibration','human','regression','experiments','trends','resources','permissions','cost','suite']);
  const previousRender=render;
  render=function(){
    let tagged=false,registryTagged=false;
    for(const t of q().tasks)if(!knownTasks.has(t.id)){if(exampleScope){t.exampleOrigin=exampleScope;tagged=true;}knownTasks.add(t.id);}
    for(const t of S.evalTasks)if(!knownLegacyTasks.has(t.id)){if(exampleScope)t.exampleOrigin=exampleScope;knownLegacyTasks.add(t.id);}
    for(const a of registry().list())if(!knownAssets.has(E.key(a))){if(exampleScope){a.exampleOrigin=exampleScope;registryTagged=true;}knownAssets.add(E.key(a));}
    for(const c of q().flow.cases)if(!knownCases.has(c.key)){if(exampleScope){c.exampleOrigin=exampleScope;tagged=true;}knownCases.add(c.key);}
    for(const c of q().flow.capabilities)if(!knownCaps.has(c.id)){if(exampleScope){c.exampleOrigin=exampleScope;tagged=true;}knownCaps.add(c.id);}
    for(const b of q().multiEnv?.imports||[])if(!knownImports.has(b.sourceId)){if(exampleScope){b.exampleOrigin=exampleScope;tagged=true;}knownImports.add(b.sourceId);}
    if(tagged)P.persist();
    if(registryTagged)EvalUI.commit();
    if(S.route.startsWith('examples-'))exampleScope=S.route.slice(9);
    if(S.route==='task-prep')exampleScope=C.task(q())?.exampleOrigin||'';
    previousRender();
    if(preparationPlan&&S.route!=='directory-plan'){
      const origin=model().plans.find(x=>x.id===preparationPlan);
      if(origin)document.getElementById('main')?.insertAdjacentHTML('afterbegin',`<div class="nav-parent">${btn('返回原计划 '+h(origin.name),'return-plan')}<span class="nav-subtle">准备完成后回到原计划选择固定版本。</span></div>`);
    }
    if(isExample()&&S.route!=='examples'){
      document.getElementById('main')?.insertAdjacentHTML('afterbegin',`<aside class="nav-example-banner"><p><strong>业务示例</strong> · 当前使用预置演练材料。示例任务单独保存在示例中心。</p>${link('返回示例中心','examples')}</aside>`);
    }
    const parent=isExample()?'examples':S.route==='directory-plan'?model().plans.find(x=>x.id===planId)?.kind:
      ({'environment-plans':'tasks','connection-profiles':'capabilities','resource-settings':'resources','resource-recovery':'resources','permission-settings':'permissions','cost-details':'cost','metric-definitions':'metrics'})[S.route];
    if(parent){document.querySelectorAll('#nav .navbtn.active').forEach(n=>n.classList.remove('active'));document.querySelector('#nav [data-param="'+parent+'"]')?.classList.add('active');}
    if(parent)document.getElementById('crumb').textContent=navGroups.flatMap(g=>g.items).find(([id])=>id===parent)?.[1]||'';
    // The application frame owns the edition note on lists and detail pages alike.
    document.querySelectorAll('.pz-footer,.prd-footer-note').forEach(n=>n.remove());
    if(S.route==='suite'&&!isExample()){
      document.querySelectorAll('.suite-help').forEach(n=>{if(n.querySelector('[data-suite="use-example"]'))n.outerHTML=examplesLink();});
    }
  };
  window.NavigationUI={isExample,seedAsset,seedCapability,selectAsset,projectAssets,projectTasks,listPanel,
    importButton:kind=>btn('批量导入','import',kind),
    importReturnButton:(kind,label)=>btn(label||'返回'+typeName(kind),'import-return',kind),
    registerObject(object){if(isExample()){if(!object.projectRegistered)object.exampleOrigin=exampleScope;}else object.projectRegistered=true;P.persist();},
    createEnvironment(sourceId,stage='coverage'){environmentStage=stage;handle('environment-plan',sourceId);},
    openAssetList(kind){assetHome=false;S.assetType=kind;},exampleOrigin:()=>exampleScope,
    availableObject:o=>isExample()||projectObjects().some(x=>x.id===o.id),
    availableMaterial:(ref,task)=>isExample()||task?.materials?.data===ref||task?.materials?.metrics===ref||task?.caseRefs?.includes(ref)||projectAssets().some(a=>(a.flowRef||E.key(a))===ref),
    genericRoutes:[...genericRoutes]};
  // A reload opens the persisted workspace; a sidebar directory always opens its own overview.
  render();
})();
