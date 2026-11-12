/* Reusable evaluation suites share the asset registry and the ordinary task workflow. */
(() => {
  'use strict';
  const C = PlazaCore, F = EvaluationFlow, E = EvaluationCore, P = PlazaReview, h = esc;
  const {badge, notice, panel, table, kv, title, wrap} = P.helpers;
  const state = () => P.state();
  const registry = () => EvalUI.core;
  const editable = () => S.role === 'engineer';
  const button = (label, action, key = '', variant = '', disabled = false) =>
    `<button type="button" class="btn ${variant}" data-suite="${action}" data-key="${h(key)}"${disabled ? ' disabled' : ''}>${label}</button>`;
  const option = (value, label, current) => `<option value="${h(value)}"${current === value ? ' selected' : ''}>${h(label)}</option>`;
  const select = (label, name, values, current, placeholder) => `<label class="pz-field">${label}<select name="${name}"${values.length ? '' : ' disabled'}>
    ${option('',placeholder,current)}${values.map(([value,text])=>option(value,text,current)).join('')}</select></label>`;
  const currentAsset = () => S.suiteViewRef ? registry().find(S.suiteViewRef) : null;
  const assetForTask = task => task?.materials?.suite ? registry().find(task.materials.suite) : null;
  const targetOf = spec => C.object(state(),spec.objectId);
  const caseName = key => F.get(state().flow,key)?.name || key;
  const assetLabel = ref => {
    const asset = ref ? registry().find(ref) : null;
    return asset ? asset.name + ' · ' + ref : ref || '待选择';
  };
  let edit = null, editingRef = null, sourceTaskId = null, flash = null;
  const exampleRef = 'SUITE-PET-CONSENT@r1';
  const defaultSpec = () => ({objectId:'',testVersion:'',environment:'test',data:'',caseRefs:[],metric:'',repeats:1});
  const trial = asset => asset?.validated ? asset.governance.validation.evidence : null;
  const activeTask = () => sourceTaskId ? C.task(state(),sourceTaskId) : null;

  function statusOf(asset) {
    if (C.suiteAvailable(asset)) return '可用于评测';
    if (asset.governance.lifecycle==='PUBLISHED') return '暂不可用';
    if (asset.governance.lifecycle==='REVIEW') return '待确认';
    return trial(asset)?.bindings?'试跑通过':'草稿';
  }

  function definition(name, spec) {
    const object = targetOf(spec);
    return {name,kind:'suite',type:'评测套件',group:4,owner:'林工',source:'评测套件工作台',
      targets:[object?.type === 'APPLICATION' ? '非Agent应用' : C.TYPES[object?.type] || 'Agent'],
      count:spec.caseRefs.length + ' 条用例',
      config:{reusableSuite:F.clone(spec),references:[spec.data,spec.metric].filter(Boolean)}};
  }

  function exampleDefinition() {
    const object = state().objects.find(item=>item.visible && item.upstream==='pet-agent');
    if (!object) return null;
    const spec = {...defaultSpec(),objectId:object.id,testVersion:'pet-agent@1.6.0',data:'AS-001@v1.2',
      caseRefs:['CASE-EXAMPLE-PET@1'],metric:'AS-021@v1.2'};
    return {...definition('宠物出行 · 拒绝授权回归',spec),id:'SUITE-PET-CONSENT',version:'r1',
      status:'已发布',source:'内置合成回放示例'};
  }

  function exampleForUse() {
    const saved=registry().find(exampleRef);
    if (saved) return saved;
    const entry=exampleDefinition();
    if (!entry) throw Error('当前项目中没有可用的示例对象。');
    const evidence=checkTrial(entry);
    const asset=registry().adopt(entry,{trusted:true});
    registry().evidence(asset,{...evidence,digest:E.digest(asset)});
    EvalUI.commit();
    return asset;
  }

  function startPanel() {
    return `<section class="pz-panel suite-start" aria-label="套件操作入口">
      <div class="suite-start-create">
        <h2>准备一套新配置</h2>
        <p>选择要评测的对象，再挑选数据、用例和评分规则。</p>
        ${editable()?button('新建套件','new','','primary'):'<small>由评测负责人新建套件。</small>'}
      </div>
      <div class="suite-start-reuse">
        <h2>使用或维护已有套件</h2>
        <p>在下方找到「可用于评测」的版本，点击「用套件新建评测」。草稿和待确认的版本也在这里处理。</p>
      </div>
    </section>`;
  }

  function supportLinks(historicCount) {
    const example=exampleDefinition();
    const sample=example?`<details class="suite-help">
      <summary>查看套件示例</summary>
      <div class="suite-help-body"><h3>${h(example.name)}</h3>
      <p>这个示例把拒绝授权场景的用例、测试数据和判定规则保存到一起。</p>
      ${materialSummary(C.suiteSpec(example))}
      ${editable()?button('用示例新建评测','use-example'):''}</div>
    </details>`:'';
    const history=historicCount?`<details class="suite-help"><summary>查看历史套件资产</summary>
      <div class="suite-help-body"><p>旧版资产和版本记录可在资产中心查阅。</p>
      ${button('打开套件资产目录','archive-list')}</div></details>`:'';
    return sample+history;
  }

  function list() {
    const source = activeTask();
    const all = registry().list().filter(asset=>asset.kind==='suite'&&(!window.NavigationUI||NavigationUI.isExample()||!NavigationUI.seedAsset(asset)));
    const items = all.filter(asset=>C.suiteSpec(asset)&&E.key(asset)!==exampleRef).filter(asset=>{
      if (!source) return true;
      const target = targetOf(C.suiteSpec(asset));
      return C.suiteAvailable(asset)&&target?.type===source.type&&(!source.objectId||target.id===source.objectId);
    });
    const renderRow = asset=>{
      asset=registry().find(E.key(asset))||asset;
      const spec=C.suiteSpec(asset), ready=C.suiteAvailable(asset), key=E.key(asset);
      const published=asset.governance.lifecycle==='PUBLISHED';
      const status=statusOf(asset);
      const next=published?'查看内容':status==='待确认'?'查看确认进度':status==='试跑通过'?'查看试跑结果':
        editable()?'继续配置':'查看草稿';
      const view=button(next,'open',key,'ghost');
      const canUse=ready&&!source?.run&&source?.materials.suite!==key;
      const use=canUse?button(source?'带入 '+h(source.id):'用套件新建评测','use',key,'primary',!editable()):'';
      return [`<strong>${h(asset.name)}</strong><small>${h(key)}</small>`,h(targetOf(spec)?.name||'待选择'),
        h(spec.caseRefs.length+' 条用例')+'<small>'+h(assetLabel(spec.metric))+'</small>',badge(status,ready?'good':'warn'),
        `<div class="pz-actions">${use}${view}</div>`];
    };
    const rows = items.map(renderRow);
    const historicCount=all.filter(asset=>!C.suiteSpec(asset)).length;
    const help=source?'选择适用的套件，将其中的数据、用例和评分版本带入当前任务。':
      '把常用的评测材料保存起来，供多次评测使用。';
    const titleActions=source?button('返回 '+h(source.id),'back-task',source.id,'ghost'):
      `<div class="nav-create-actions">${editable()?button('新建套件','new','','primary'):''}${editable()&&window.NavigationUI?NavigationUI.importButton('suite'):''}</div>`;
    const empty=source?'当前没有匹配此任务的已发布套件。':editable()?
      '项目还没有套件。点击上方「新建套件」开始，保存后的草稿会出现在这里。':
      '项目还没有套件。评测负责人创建后，会显示在这里。';
    return wrap(title(source?'为任务选用套件':'评测套件',help,titleActions)+message()+
      (window.NavigationUI?NavigationUI.listPanel(source?'适用于当前任务的套件':'项目套件',source?'选择适用的已发布版本，带入原任务。':'从右上角新建或导入；草稿继续配置，已发布版本可用于新建评测。','suite',items.map(asset=>({...asset,status:statusOf(asset)})),['套件 / 版本','适用对象','评测内容','状态','操作'],renderRow):
      panel(source?'适用于当前任务的套件':'项目套件',rows.length?table(['套件 / 版本','适用对象','评测内容','状态','下一步'],rows):`<p class="suite-empty">${h(empty)}</p>`))+
      (source?'':supportLinks(historicCount)));
  }

  function message() { return flash ? notice(h(flash.text),flash.kind) : ''; }

  function materialSummary(spec, tested = true) {
    const object=targetOf(spec);
    const rows=[['适用对象',h(object?.name||'待选择')],['测试数据',h(assetLabel(spec.data))],
      ['用例版本',spec.caseRefs.map(key=>h(caseName(key)+' · '+key)).join('<br>')||'待选择'],
      ['指标与评分',h(assetLabel(spec.metric))],['执行次数',h(spec.repeats+' 次 / 用例')]];
    if(tested)rows.push(['试跑对象版本',h(spec.testVersion||'待选择')]);
    return kv(rows);
  }

  function form() {
    const {name,spec}=edit;
    const objects=state().objects.filter(o=>o.visible&&o.project==='cockpit'&&(!window.NavigationUI||NavigationUI.availableObject(o)||o.id===spec.objectId));
    const object=targetOf(spec);
    const data=C.MATERIALS.data.filter(item=>item.types.includes(object?.type)&&(!window.NavigationUI||NavigationUI.availableMaterial(item.id)||item.id===spec.data)&&item.route!=='bench'&&
      registry().find(item.id)?.contentSet?.member_kind!=='case');
    const metrics=C.MATERIALS.metrics.filter(item=>item.types.includes(object?.type)&&(!window.NavigationUI||NavigationUI.availableMaterial(item.id)||item.id===spec.metric)&&item.binding?.route==='standard');
    const cases=state().flow.cases.filter(item=>item.type===object?.type&&item.active&&item.status==='PUBLISHED'&&(!window.NavigationUI||NavigationUI.availableMaterial(item.key)||spec.caseRefs.includes(item.key)));
    const basics=`<div class="pz-fields">
      ${select('适用对象','objectId',objects.map(o=>[o.id,o.name]),spec.objectId,'请选择被测对象')}
      <label class="pz-field">套件名称<input name="name" value="${h(name)}" placeholder="例如 版本发布前功能回归" required maxlength="100"></label>
    </div>`;
    const controls=`<div class="pz-fields">
      ${select('试跑对象版本','testVersion',(object?.versions||[]).map(v=>[v.id,v.label]),spec.testVersion,'请选择固定版本')}
      ${select('测试数据','data',data.map(item=>[item.id,item.name+' · '+item.id]),spec.data,'请选择已发布数据')}
      ${select('指标与评分','metric',metrics.map(item=>[item.id,item.name+' · '+item.id]),spec.metric,'请选择可执行指标')}
      <label class="pz-field">每条用例运行次数<input name="repeats" type="number" min="1" max="20" value="${h(spec.repeats)}" required></label>
    </div>`;
    const choices=cases.length?`<fieldset class="suite-cases"><legend>选择已发布的用例</legend>${cases.map(item=>
      `<label><input name="caseRefs" type="checkbox" value="${h(item.key)}"${spec.caseRefs.includes(item.key)?' checked':''}>
      <span>${h(item.name)} <small>${h(item.key)}</small></span></label>`).join('')}</fieldset>`:
      notice('该对象类型暂无已发布的用例。请到资产中心准备。');
    const materials=object?`<section class="suite-form-materials"><h3>选择评测材料</h3>${controls}${choices}</section>`:'';
    const hint=object?'选好材料后试跑。通过后可提交确认，发布后供任务选用。':
      '选定对象后，页面会显示它能用的数据、用例和指标。';
    return panel('确定套件适用的对象',`<form id="suite-form">${basics}${materials}<div class="pz-bottom">
      <small>${h(hint)}</small><div class="pz-actions">
      <button class="btn" type="submit" value="draft" formnovalidate>保存草稿</button>
      ${object?'<button class="btn primary" type="submit" value="trial">保存并试跑</button>':''}</div></div></form>`);
  }

  function trialPanel(asset) {
    const evidence=trial(asset);
    if (!evidence?.bindings) return '';
    const traces=evidence.cases.map(row=>[h(row.label),h(row.expected),badge(row.actual,row.actual===row.expected?'good':'warn'),
      h(row.metric?.denominator?row.metric.passed+'/'+row.metric.denominator:'无有效判定')]);
    return panel('本版本的试跑记录',kv([['试跑编号',h(evidence.id)],['固定对象版本',h(evidence.objectVersion)],
      ['指标与实现',h(evidence.scoring.metricRef+' · '+evidence.scoring.implementation)]])+table(['合成观测','预期结论','实际结论','指标结果'],traces)+
      `<details class="flow-space"><summary>查看用例、适配器和执行器</summary>${table(['用例版本','适配器','执行器'],evidence.bindings.map(row=>
        [h(row.caseRef),h(row.adapter),h(row.executor)]))}</details>
      <p class="muted">本地试跑按固定用例的输入合成证据，数据集版本随清单记录。</p>`);
  }

  function workflow(asset) {
    if (!asset) return '';
    const g=asset.governance, key=E.key(asset);
    if (g.lifecycle==='PUBLISHED') return '';
    if (g.lifecycle!=='REVIEW') {
      return trial(asset)?panel('提交当前版本',notice('试跑已通过。提交后，由评测负责人和业务负责人分别确认。'),
        button('提交审核','submit',key,'primary',!editable())):'';
    }
    const steps=kv([['技术确认',h(g.technical?.actor||'待评测负责人确认')],['业务确认',h(g.business?.actor||'待业务负责人确认')]]);
    const actor = PRDEngine.actors[S.role];
    const action=editable()&&!g.technical?button('技术确认','technical',key,'primary'):
      S.role==='business'&&!g.business?button('业务确认','business',key,'primary'):
      editable()&&g.technical?.actorId===actor?.id&&g.business?button('发布套件','publish',key,'primary'):'';
    const next=!g.technical?'评测负责人核对本版本的材料、接入和试跑结果。':
      !g.business?'业务负责人核对用例范围和指标用途。':'完成技术确认的评测负责人可以发布此版本。';
    const canReturn=editable()||S.role==='business';
    return panel('审核与发布',steps+notice(h(next))+(canReturn?`<details class="flow-space"><summary>退回修改</summary>
      <form id="suite-return"><label class="pz-field">退回原因<input name="reason" required></label><button class="btn" type="submit">确认退回</button></form></details>`:''),action);
  }

  function detail() {
    const asset=currentAsset();
    if (!asset&&!edit) return list();
    if (asset&&!C.suiteSpec(asset)) return list();
    const spec=C.suiteSpec(asset);
    const lifecycle=asset?.governance.lifecycle;
    const source=activeTask();
    const hasTrial=Boolean(trial(asset)?.bindings);
    const canEdit=editable()&&!['REVIEW','PUBLISHED'].includes(lifecycle);
    const mayEdit=canEdit&&(edit||!hasTrial);
    if (mayEdit&&!edit) loadEdit(asset);
    const key=asset?E.key(asset):'';
    const back=source?button('返回 '+h(source.id),'back-task',source.id,'ghost'):'';
    const ready=C.suiteAvailable(asset);
    const use=ready&&!source?.run&&source?.materials.suite!==key?
      button(source?'带入 '+h(source.id):'用套件新建评测','use',key,'primary',!editable()):'';
    const revise=ready&&!source?button('创建新版','revise',key,'ghost',!editable()):'';
    const editMaterials=canEdit&&hasTrial?button('修改材料','edit-materials',key,'ghost'):'';
    return wrap(`<div class="pz-crumb">${button('评测套件','list','','ghost')}${key?' / '+h(key):''}${source?' · 来源任务 '+h(source.id):''}</div>`+
      title(h(asset?.name||'新建套件'),asset?h(statusOf(asset)):'先选适用对象，再配置材料和试跑。',back+use+revise)+message()+
      (mayEdit?form():panel('固定材料',materialSummary(spec||edit.spec),editMaterials)+trialPanel(asset)+workflow(asset)));
  }

  function loadEdit(asset) {
    editingRef=asset?E.key(asset):null;
    edit={name:asset?.name||'',spec:F.clone(C.suiteSpec(asset)||defaultSpec())};
  }

  function showDetail(key) {
    const asset=registry().find(key);
    if (!C.suiteSpec(asset)) throw Error('找不到这个套件版本，请重新选择。');
    S.suiteViewRef=key;
    edit=null;
    editingRef=null;
    P.route('suite-detail');
  }

  function readForm(form) {
    const values=new FormData(form);
    edit.name=String(values.get('name')||'').trim();
    const objectId=String(values.get('objectId')||'');
    const repeatInput=values.get('repeats');
    const repeats=repeatInput===null?edit.spec.repeats:repeatInput===''?'':Number(repeatInput);
    edit.spec={objectId,environment:'test',testVersion:String(values.get('testVersion')||''),
      data:String(values.get('data')||''),metric:String(values.get('metric')||''),
      caseRefs:values.getAll('caseRefs'),repeats};
  }

  function saveDraft(form) {
    readForm(form);
    if (!edit.name) throw Error('请填写套件名称。');
    const current=currentAsset();
    if (current&&editingRef!==E.key(current)) throw Error('所选套件已切换，请重新打开。');
    if (current&&['REVIEW','PUBLISHED'].includes(current.governance.lifecycle)) throw Error('请打开可编辑的套件版本。');
    const def=definition(edit.name,edit.spec);
    const asset=current?registry().edit(current,def):registry().adopt({...def,id:registry().id('SUITE'),version:'r1'});
    S.suiteViewRef=E.key(asset);
    loadEdit(asset);
    EvalUI.commit();
    return asset;
  }

  function checkTrial(asset) {
    const evidence=C.rehearseSuite(state(),asset);
    const failures=evidence.cases.filter(row=>row.actual!==row.expected);
    if(failures.length)throw Error(failures.map(row=>row.label+'：预期 '+row.expected+'，得到 '+row.actual).join('。'));
    return evidence;
  }

  function requireEditor() {
    if (!editable()) throw Error('请由评测负责人处理此操作。');
  }

  function useSuite(asset) {
    requireEditor();
    if(!C.suiteAvailable(asset))throw Error('请选择可用于评测的套件版本。');
    const source=activeTask(), spec=C.suiteSpec(asset), object=targetOf(spec);
    if(!object)throw Error('套件对应的被测对象不可用。');
    let task=source;
    if(!task){
      if(!C.version(object,spec.testVersion))throw Error('请更新套件的试跑版本后再新建任务。');
      task=C.createTask(state(),{name:asset.name+'评测',goal:'按「'+asset.name+'」核对 '+spec.caseRefs.map(caseName).join('、'),type:object.type});
    }
    C.applySuite(state(),task,asset);
    task.step=source?1:0;
    task.events.push({at:new Date().toISOString(),text:'已引用评测套件 '+E.key(asset)});
    sourceTaskId=null;
    P.openTask(task.id);
  }

  function taskEntry(task) {
    if(!task.materials.suite) return !task.run?panel('评测材料来源',
      '<p class="muted">复用已发布套件，或在下方逐项选择本次材料。</p>',button('选用评测套件','choose',task.id,'',!editable())):'';
    const asset=assetForTask(task);
    return panel('本次引用的评测套件',kv([['套件版本',h((asset?.name?asset.name+' · ':'')+task.materials.suite)],
      ['测试数据',h(assetLabel(task.materials.data))],['用例版本',task.caseRefs.map(key=>h(caseName(key)+' · '+key)).join('<br>')],
      ['指标与评分',h(assetLabel(task.materials.metrics))],['执行次数',h(task.flowPlan.repeats+' 次 / 用例')]])+
      (asset&&!C.suiteAvailable(asset)&&!task.run?notice('此套件当前不可用，请重新选用。','warn'):'')+
      `<div class="pz-bottom"><div class="pz-actions">${asset?button('查看套件','task-detail',task.id,'ghost'):''}
      ${task.run?'':button('更换套件','choose',task.id,'ghost',!editable())+button('改为逐项选择','detach',task.id,'ghost',!editable())}</div>
      ${task.run?'':P.helpers.B('下一步：运行前检查','task-step','2','primary')}</div>`);
  }

  document.addEventListener('change',event=>{
    const input=event.target;
    if (input.form?.id!=='suite-form'||input.name!=='objectId') return;
    const previous=edit.spec.objectId;
    readForm(input.form);
    if (previous!==edit.spec.objectId) {
      Object.assign(edit.spec,{testVersion:'',data:'',metric:'',caseRefs:[]});
      P.paint();
      document.querySelector('#suite-form [name="objectId"]')?.focus();
    }
  });

  document.addEventListener('submit',event=>{
    const form=event.target;
    if (!['suite-form','suite-return'].includes(form.id)) return;
    event.preventDefault();
    flash=null;
    let attempted;
    try {
      if(form.id==='suite-return'){
        const asset=currentAsset();
        if(asset?.governance.lifecycle!=='REVIEW'||!['business','engineer'].includes(S.role))throw Error('请由负责确认的人员退回待审核版本。');
        registry().reject(asset,PRDEngine.actors[S.role].name,String(new FormData(form).get('reason')||''));
        loadEdit(asset);
        flash={text:'当前版本已退回。调整材料后重新试跑。',kind:'warn'};
      }else{
        requireEditor();
        const asset=saveDraft(form);
        if(event.submitter?.value==='trial'){
          attempted=asset;
          const evidence=checkTrial(asset);
          registry().validate(asset,[{ok:true,detail:'试跑对象与材料版本已核对'},{ok:true,detail:'用例、数据、指标与接入组合已匹配'}]);
          registry().evidence(asset,{...evidence,digest:E.digest(asset)});
          flash={text:'试跑通过。请查看记录并提交当前版本。',kind:'good'};
        }else flash={text:'草稿已保存。',kind:'good'};
        edit=null;
      }
    }catch(error){
      if(attempted)registry().validate(attempted,[{ok:false,detail:error.message}]);
      flash={text:error.message,kind:'warn'};
    }
    EvalUI.commit();P.paint();window.scrollTo(0,0);
  });

  document.addEventListener('click',event=>{
    if(event.target.closest('#nav [data-action="go"],[data-action="go-close"][data-param="suite"]')){
      sourceTaskId=null;flash=null;
    }
    const control=event.target.closest('[data-suite]');
    if(!control||control.disabled)return;
    const {suite:action,key}=control.dataset;
    flash=null;
    try {
      const asset=key?registry().find(key):currentAsset();
      switch(action){
        case 'list': P.route('suite');return;
        case 'archive-list': S.assetType='suite';S.assetGroup=4;P.route('assets');return;
        case 'new': requireEditor();S.suiteViewRef='';loadEdit(null);P.route('suite-detail');return;
        case 'open': showDetail(key);return;
        case 'edit-materials': requireEditor();loadEdit(asset);break;
        case 'revise': {
          requireEditor();
          const revised=registry().revise(asset);
          EvalUI.commit();showDetail(E.key(revised));return;
        }
        case 'choose':
          requireEditor();sourceTaskId=key;P.route('suite');return;
        case 'task-detail': {
          const task=C.task(state(),key);
          sourceTaskId=key;showDetail(task?.materials.suite);return;
        }
        case 'back-task': sourceTaskId=null;P.openTask(key);return;
        case 'use': useSuite(asset);return;
        case 'use-example': requireEditor();useSuite(exampleForUse());return;
        case 'detach': {
          requireEditor();
          const task=C.task(state(),key);
          if(!task||task.run)throw Error('请从未冻结任务修改材料来源。');
          delete task.materials.suite;
          task.flowPlan.selection={};
          C.invalidate(task);
          break;
        }
        case 'submit':
          requireEditor();
          if(!trial(asset)?.bindings)throw Error('请完成本版本的试跑。');
          registry().submit(asset);break;
        case 'technical':
          requireEditor();registry().ordinaryConfirm(asset,'technical',PRDEngine.actors.engineer);break;
        case 'business':
          if(S.role!=='business')throw Error('请由业务负责人确认。');
          registry().ordinaryConfirm(asset,'business',PRDEngine.actors.business);break;
        case 'publish':
          requireEditor();registry().publishOrdinary(asset,PRDEngine.actors.engineer);
          flash={text:'套件已发布。现在可以在任务中选用此版本。',kind:'good'};break;
      }
    }catch(error){flash={text:error.message,kind:'warn'};}
    EvalUI.commit();P.paint();
  },true);

  pages.suite=list;
  pages['suite-detail']=detail;
  const entry=navGroups.flatMap(group=>group.items).find(item=>item[0]==='suite');
  if(entry)entry[1]='评测套件';
  const previousRender=render;
  render=function(){
    if(!['suite','suite-detail'].includes(S.route)){sourceTaskId=null;flash=null;}
    previousRender();
    if(S.route==='suite-detail'){
      document.querySelector('#nav [data-param="suite"]')?.classList.add('active');
      const crumb=document.getElementById('crumb');
      if(crumb)crumb.textContent='资产与能力 / 评测套件';
    }
  };
  window.SuiteUI={assetForTask,taskEntry,examplePage:()=>wrap(title('套件示例','主动选择示例后，查看固定材料并新建演练任务。')+supportLinks(0).replace('<details class="suite-help">','<details class="suite-help" open>')),openAsset(key){sourceTaskId=null;flash=null;showDetail(key);},
    newSuite(){sourceTaskId=null;flash=null;requireEditor();S.suiteViewRef='';loadEdit(null);P.route('suite-detail');}};
  render();
})();
