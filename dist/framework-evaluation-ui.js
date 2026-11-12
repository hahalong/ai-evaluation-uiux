/* Framework walkthroughs use the existing capability and task workspaces. */
(() => {
  'use strict';
  const E=FrameworkEvaluation, P=PlazaReview, C=PlazaCore, H=P.helpers, h=esc;
  const {B,badge,notice,panel,kv,table,title,wrap}=H;
  const buttons=(s,a,k='',c='',disabled=false)=>`<button type="button" class="btn ${c}" data-fw="${a}" data-key="${h(k)}" ${disabled?'disabled':''}>${s}</button>`;
  const labels={DRAFT:'草稿',VALIDATED:'契约已验证',REVIEW:'待质量审核',PUBLISHED:'回放资格已发布'};
  const stages=['数据、用例与指标','运行前检查','确认与冻结','运行与证据','复核与报告'];
  const registrationStore=()=>EvaluationFlow.init(P.state()).frameworkRegistrations ??= {};
  const keyForRegistration=scene=>scene==='agent'?'agentPrepared':scene;
  function activeRegistration(scene, choice) {
    const store=registrationStore();
    if(scene!=='agent')return store[scene];
    if(choice?.executor===store.agent?.bindings[0].id && E.ready(store.agent))return store.agent;
    return E.ready(store.agentPrepared) ? store.agentPrepared : store.agent || store.agentPrepared;
  }
  const task=()=>C.task(P.state());
  let selected='open', message='', e03ReportDraft='';
  const sceneButtons=(action='choose')=>`<div class="flow-categories fw-choices" role="group" aria-label="选择框架案例">
    ${Object.entries(E.specs).map(([id,s])=>buttons(h(s.name+' · '+s.lane),action,id,selected===id?'selected':'')).join('')}</div>`;
  const note=()=>notice('本地回放：能力资格仅适用于演练。不会调用真实模型、Agent、台架或 Ragas 裁判。','warn');
  const content=(html)=>wrap(`<div class="framework-workspace">${message?notice(h(message),'bad'):''}${html}</div>`);
  const stateLine=(reg)=>reg?badge(labels[reg.stage],E.ready(reg)?'good':reg.stage==='REVIEW'?'warn':''):
    badge('未登记','warn');
  const kinds=(c)=>c.kind+' · '+c.id;
  const formatScore=(s,scene)=>s.value===null?'—':scene==='rag'?s.value.toFixed(2):Math.round(s.value*100)+'%';
  const box=(label, value)=>`<div><strong>${h(String(value))}</strong><small>${h(label)}</small></div>`;
  const docsUrl='https://baic.feishu.cn/sheets/ZivOs3xeDhmTSvt5Fp8clEIXnGg?sheet=90f811';
  const caseSource=(s,scene)=>h(s.source)+(scene==='agent'?` · <a href="${docsUrl}" target="_blank" rel="noopener noreferrer">查看 V2 原表</a>`:'');
  const safeJson=(x)=>h(JSON.stringify(x,null,2));
  function capabilities() {
    const isE03=selected==='agent';
    const s=E.specs[selected], reg=registrationStore()[keyForRegistration(selected)];
    const canMaintain=['engineer','ops'].includes(S.role);
    const rows=reg?.bindings||(isE03?E03Preparation.bindings():s.capabilities);
    const reportInput=isE03&&reg?.stage==='DRAFT'?`<div class="fw-report-input">
      <label class="pz-field">上传联调报告<input type="file" id="fw-e03-file" accept=".json,application/json" ${canMaintain?'':'disabled'}></label>
      <label class="pz-field">或粘贴报告 JSON<textarea id="fw-e03-report" rows="3" placeholder="粘贴 e03-qualification.json 全文" ${canMaintain?'':'disabled'}>${h(e03ReportDraft)}</textarea></label>
      <small>校验会核对制品摘要并复跑验收项。通过后可提交审核。</small></div>`:'';
    const prepLink=isE03?`<a class="btn ghost" href="e03-prep/index.html" target="_blank" rel="noopener noreferrer">打开 E03 接入验证台</a>`:'';

    const controls=(!reg?buttons('登记草稿','register','','primary',!canMaintain):reg.stage==='DRAFT'?
      buttons(isE03?'核验联调报告':'验证回放契约','validate','','primary',!canMaintain):reg.stage==='VALIDATED'?
      buttons('提交审核','submit','','primary',!canMaintain):reg.stage==='REVIEW'?
      buttons('批准并发布回放资格','approve','','primary',S.role!=='quality'):
      buttons('用此用例新建评测','new',selected,'primary',S.role!=='engineer'));
    const help=!reg||reg.stage==='DRAFT'||reg.stage==='VALIDATED'?'能力维护人：评测工程师或平台运维。':
      reg.stage==='REVIEW'?'请在顶部切换为「质量负责人」，核对验证项并发布。':'评测人员切换回「评测工程师」后可引用此组合。';
    return content(title('框架接入配置','执行与评分能力 / 登记固定实现、验证契约、发布适用范围',
      (window.NavigationUI?.isExample()?'':B('返回执行与评分能力','go','capabilities','ghost'))+prepLink+(returnTask?buttons('返回原任务','return-task','','primary'):''))+sceneButtons()+
      panel(h(s.name)+' · '+h(s.lane),note()+`<p>${caseSource(s,selected)}</p>`+
        table(['能力与固定版本','来源与入口','输入输出契约'],rows.map(c=>[
          h(c.name)+'<small>'+h(kinds(c))+'</small>',`<code>${h(c.source)}</code><small>${h(c.entry)}</small>${c.digest?'<small>SHA-256 '+h(c.digest.slice(0,16))+'…</small>':''}`,h(c.contract)
        ]))+reportInput+`<div class="pz-bottom"><small>适用环境：${h(s.environment)} · ${h(help)}</small><div class="pz-actions">${stateLine(reg)}${controls}</div></div>`)+
      (reg?.qualification?panel('本次契约验证',
        (reg.qualification.reportId?notice('已核验 '+h(reg.qualification.reportId)+' · '+reg.qualification.checks.length+' 项 · 本地回放','good'):'')+
        table(['核对项','结果'],reg.qualification.checks.map(c=>[
          h(c.name)+(c.actual===undefined?'':'<small>'+h(String(c.actual))+'</small>'),
          badge(c.ok?'通过':'不通过',c.ok?'good':'bad')]))+`<small>资格范围：本地回放 · ${h(s.environment)}。</small>`):''));
  }
  function templates() {
    return content(title('从框架案例开始','选一个适合的被测对象与案例，在任务内选择材料和能力。',
      (window.NavigationUI?.isExample()?'':B('返回评测任务','go','tasks','ghost')))+
      Object.entries(E.specs).map(([id,s])=>panel(h(s.name)+' · '+h(s.lane),
        kv([['用例',h(s.caseRef)],['来源',caseSource(s,id)],['被测对象',h(s.object+' · '+s.objectVersion)],
          ['能力组合',h((activeRegistration(id)?.bindings || (id==='agent'?E03Preparation.bindings():s.capabilities)).map(c=>c.name).join(' → '))]])+
        `<div class="pz-bottom">${stateLine(activeRegistration(id))}${buttons('用此用例新建评测','new',id,'primary',S.role!=='engineer')}</div>`)).join(''));
  }
  function choice(label,field,values,value,locked=false) {
    return `<label class="pz-field">${h(label)}<select data-fw-field="${field}" ${locked?'disabled':''}>
      <option value="">请选择</option>${values.map(([id,text])=>`<option value="${h(id)}" ${id===value?'selected':''}>${h(text)}</option>`).join('')}
      </select></label>`;
  }
  function statPanel(s,d,t) {
    const items=s.samples.map(row=>{
      const input=row.input;
      const display=d.scene==='agent'?
        `<small>稳定有宠视频 · PET-01</small>舱温 ${input.cabinC}℃ / 外温 ${input.outsideC}℃`:
        h(input.question)+(input.options?`<small>${input.options.map((o,i)=>String.fromCharCode(65+i)+'. '+h(o)).join('　')}</small>`:'');
      const gold=d.scene==='agent'?'三区 '+row.gold.zonesC.join('/')+'℃ · 空调开 · 外循环':row.gold;
      return [h(row.id),display,h(gold)];
    });
    return panel('数据、用例与指标',kv([['来源',caseSource(s,d.scene)],['用例',h(s.caseRef)],['输入配置',h(s.config)]])+
      `<div class="pz-fields fw-fields">
      ${choice('样本版本','data',[[s.data,s.data]],d.choice.data)}
      ${choice('配对独立参考','reference',[[s.reference,s.reference]],d.choice.reference)}
      ${choice('指标与评分实现','metric',[[s.metric.id,s.metric.name+' · '+s.metric.id]],d.choice.metric)}</div>`+
      `<details class="fw-detail" open><summary>核对样本和金标（${items.length} 条）</summary>
      ${table(['样本 ID','被测对象收到的输入','仅评分侧可见的参考'],items)}</details>
      <div class="pz-bottom"><small>${h(s.metric.definition)}</small>${buttons('下一步：运行前检查','step','1','primary',!d.choice.data||!d.choice.reference||!d.choice.metric)}</div>`);
  }
  function issue(d) {
    const reg=activeRegistration(d.scene,d.choice);
    try {E.freeze(d.scene,'CHECK',reg,d.choice);return '';} catch(err) {return err.message;}
  }
  function preflight(s,d) {
    const reg=activeRegistration(d.scene,d.choice), good=E.ready(reg);
    const choices=(i)=>good?[[reg.bindings[i].id,reg.bindings[i].name+' · '+reg.bindings[i].id]]:[];
    const reason=issue(d);
    return panel('匹配执行能力',kv([['运行环境',h(s.environment)],['被测版本',h(s.objectVersion)],['需要采证',h(s.collects)]])+
      `<div class="pz-fields fw-fields">
      ${choice('主执行器','executor',choices(0),d.choice.executor)}
      ${choice('对象 / 环境适配器','adapter',choices(1),d.choice.adapter)}</div>`+
      (d.scene==='rag'?notice('轻量应用执行器先采证；Ragas 已在指标里选定，由评分 Worker 调用。'):'')+
      table(['检查项','结果'],[
        ['能力资格与范围',good?badge('仅本地回放可用','good'):badge('资格未发布','warn')],
        ['版本、样本、金标与指标',reason?badge('待确认','warn')+'<small>'+h(reason)+'</small>':badge('已匹配','good')]
      ])+`<div class="pz-bottom">${buttons('查看能力登记','from-task','','ghost')}
      ${buttons('检查并继续','preflight','','primary',Boolean(reason))}</div>`);
  }
  function confirmation(s,d) {
    return panel('确认并冻结运行',note()+kv([['环境 / 被测版本',h(s.environment+' / '+s.objectVersion)],
      ['执行器 / 适配器',h(d.choice.executor+' / '+d.choice.adapter)],['用例 / 计划试次',h(s.caseRef+' / '+s.samples.length+' 次')],
      ['样本 / 金标',h(d.choice.data+' / '+d.choice.reference)],['指标',h(s.metric.name+' · '+s.metric.id)],
      ['判定口径',h(s.metric.definition)],...(d.scene==='agent'?[['观察窗','有效确认点击 → 独立状态到位，5000 ms（演练）']]:[])])+
      `<div class="pz-bottom"><small>冻结后派工只携带输入、版本和采证要求；独立参考保留在评分侧。</small>
      ${buttons('确认并发起回放','launch','','primary',S.role!=='engineer')}</div>`);
  }
  const actor=(scene)=>scene==='agent'?'台架 Worker / 独立观察器':scene==='rag'?'应用 Worker':'云端 Worker';
  function execution(s,d) {
    const r=d.run, stage=r.stage;
    const events=[['评测平台','冻结运行清单 '+r.manifest.id+'，'+s.samples.length+' 个试次；已派工。'],
      [actor(d.scene),stage==='DISPATCHED'?s.status:'已生成 '+r.packet.records.length+' 条逐试次回传。'+(d.scene==='agent'?'轨迹和独立读回分源标注。':'')],
      ['证据服务',r.records?'已校验试次、尝试、版本并归档 '+r.records.length+' 条。':'等待回传，暂无可评分结果。'],
      ['评分服务',r.snapshot?'逐例计分完成，已生成快照 '+r.snapshot.id+'。':
        r.records?'证据已就绪，等待评分 Worker。':'等证据入库后计算。']];
    const action=stage==='DISPATCHED'?buttons(h(s.action),'replay','','primary'):
      stage==='RETURNED'?buttons(d.scene==='rag'?'接收并归档证据':'接收回传并计算','receive','','primary'):
      stage==='ARCHIVED'?buttons('运行 Ragas 裁判回放','score','','primary'):
      buttons('查看复核与报告','step','4','primary');
    return panel('运行与证据',kv([['运行编号',h(r.manifest.id)],['环境 / 采证方',h(s.environment+' / '+actor(d.scene))],
      ['回传要求',h(s.collects)]])+table(['参与方','当前状态'],events.map(([a,b])=>[h(a),h(b)]))+
      `<div class="pz-bottom"><small>原型分步回放调度与回调；生产由 Worker / 证据服务自动交接。</small>${action}</div>`)+
      `<details class="pz-panel fw-detail"><summary>查看发给 Worker 的派工（无独立参考）</summary><pre class="code">${safeJson(E.dispatch(r.manifest))}</pre></details>`+
      (r.packet?`<details class="pz-panel fw-detail"><summary>查看原始回传与试次关联</summary><pre class="code">${safeJson(r.packet)}</pre></details>`:'');
  }
  function resultRows(s,d) {
    const ss=d.run.snapshot;
    return ss.items.map(x=>{
      const v=x.value;
      const label=v===null?'无法判断':d.scene==='rag'?v.toFixed(2):v===1?d.scene==='agent'?'按时到位':'答对':d.scene==='agent'?'未到位':'答错';
      return [h(x.trial.sampleId)+'<small>'+h(x.status)+'</small>',badge(label,v===null?'warn':v===0?'bad':'good'),
        h(x.reason),buttons('查看证据','evidence',x.trial.sampleId,'ghost')];
    });
  }
  function evidence(s,d,x) {
    if(!x)return '';
    const r=x.evidence, o=r?.observation;
    const facts=d.scene==='open'?[['原始预测',h(o?.prediction??'无')],['解析 / 金标',h((x.parsed||'—')+' / '+x.reference)]]:
      d.scene==='agent'?[['点击 / 卡片失效',h(o?.confirmation?.clickedAtMs+' / '+o?.confirmation?.expiresAtMs+' ms')],
        ['控车回执',o?.toolTrace?.ack?'已受理（ACK）':'缺失'],
        ['独立状态',r?.independentObservation?h(r.independentObservation.samples[0].zonesC.join('/')+'℃ · '+r.independentObservation.source):'缺独立读回'],
        ['金标',h(x.reference.zonesC.join('/')+'℃ · 空调开 · 外循环')]]:
      [['问题',h(x.trial.input.question)],['实际回答',h(o?.response??'无')],
        ['实际检索片段',o?.retrieved_contexts?.length?o.retrieved_contexts.map((c,i)=>h(o.chunk_refs[i]+' · '+c)).join('<br>'):'缺失'],
        ['独立参考',h(x.reference)+'（可复核答案，忠实度按检索证据评分）']];
    return '<div class="fw-evidence-target">'+panel('证据与逐例计算 · '+h(x.trial.sampleId),kv([...facts,['判定依据',h(x.reason)],
      ['关联标识',h((r?.evidenceId||'—')+' · '+x.trial.attemptId)]])+
      (x.claims?table(['评分陈述','是否有检索支持','片段'],x.claims.map(c=>[h(c.claim),badge(c.supported?'有支持':'无支持',c.supported?'good':'bad'),h(c.evidence||'—')])):'')+
      `<details class="fw-detail"><summary>查看本试次原始回传</summary><pre class="code">${safeJson(r)}</pre></details>`)+'</div>';
  }
  function report(s,d) {
    const ss=d.run.snapshot;
    const fraction=d.scene==='rag'?'逐例分值合计 '+ss.numerator+' ÷ '+ss.denominator+' 条有分试次':
      ss.numerator+' / '+ss.denominator+' '+(d.scene==='agent'?'已证实有效点击':'有效预测');
    return panel('复核与报告',`<div class="flow-stats fw-stats">
      ${box(s.metric.name,formatScore(ss,d.scene))}${box('有效覆盖',ss.coverage)}${box('证据已收 / 计划',ss.received+'/'+ss.planned)}${box('未知或缺测',ss.unknown)}</div>
      <p class="fw-formula"><strong>计算口径：</strong>${h(fraction)}。${h(s.metric.definition)}</p>`+
      table(['样本 / 执行状态','评分结果','逐例依据','操作'],resultRows(s,d))+
      `<div class="pz-bottom"><small>快照 ${h(ss.id)} · 回放结果仅用于验证计算与交接。</small>
      ${buttons('导出固定结果','export','','ghost')}</div>`)+evidence(s,d,ss.items.find(x=>x.trial.sampleId===d.focus));
  }
  function taskPage(t) {
    const d=t.frameworkPlan, s=E.specs[d.scene];
    return content(`<div class="pz-crumb">${B('评测任务','go','tasks','ghost')} / ${h(t.id)}</div>`+
      title(h(t.name),s.object+' · '+s.environment,badge('本地回放','warn'))+
      `<nav class="pz-stepper" aria-label="框架评测步骤">${stages.map((label,i)=>`<button class="pz-step" data-fw="step" data-key="${i}"
        ${d.step===i?'aria-current="step"':''} ${i>d.step || d.run&&i<3?'disabled':''}><b>${i+1}</b>${label}</button>`).join('')}</nav>`+
      [()=>statPanel(s,d,t),()=>preflight(s,d),()=>confirmation(s,d),()=>execution(s,d),()=>report(s,d)][d.step]());
  }

  function newTask(scene) {
    if(S.role!=='engineer')throw Error('请由评测工程师发起评测。');
    const s=E.specs[scene];
    const t=C.createTask(P.state(),{name:s.name+' · '+s.caseRef,type:s.type,goal:s.metric.definition});
    t.pending={...t.pending,name:s.object};
    t.frameworkPlan={scene,step:0,choice:{data:'',reference:'',executor:'',adapter:'',metric:''},run:null,focus:''};
    P.openTask(t.id);
  }
  let returnTask='';
  function handle(action,k) {
    const store=registrationStore(), key=keyForRegistration(selected), reg=store[key], t=task(), d=t?.frameworkPlan;
    const ensure=(roles)=>{if(!roles.includes(S.role))throw Error('请先切换为有权限的演示角色。');};
    const priorStep=d?.step;
    const save=()=>{P.paint();if(d&&d.step!==priorStep)window.scrollTo(0,0);};
    message='';
    try {
      switch(action) {
        case 'open-capabilities': returnTask=''; if(k&&Object.hasOwn(E.specs,k))selected=k; return P.route('flow-framework');
        case 'templates': return P.route('framework-templates');
        case 'choose': if(Object.hasOwn(E.specs,k))selected=k; return save();
        case 'from-task': if(d){selected=d.scene;returnTask=t.id;return P.route('flow-framework');}return;
        case 'return-task': if(returnTask){const id=returnTask;returnTask='';return P.openTask(id);}return;
        case 'register': {
          ensure(['engineer','ops']);
          if(!reg){
            const draft=E.registration(selected);
            if(selected==='agent')draft.bindings=E03Preparation.bindings();
            store[key]=draft;
          }
          return save();
        }
        case 'validate':
          ensure(['engineer','ops']); if(reg?.stage!=='DRAFT')return;
          if(selected==='agent'){
            const content=document.querySelector('#fw-e03-report')?.value.trim();
            e03ReportDraft=content?.slice(0,100000)||'';
            if(!content || content.length>100000)throw Error('请上传或粘贴完整的 E03 联调报告。');
            let report;
            try { report=JSON.parse(content); } catch { throw Error('联调报告不是有效 JSON。'); }
            reg.qualification=E03Preparation.review(report,reg.bindings);
            e03ReportDraft='';
          } else reg.qualification=E.validate(reg);
          if(reg.qualification.ok)reg.stage='VALIDATED';
          return save();
        case 'submit': ensure(['engineer','ops']); if(reg?.stage==='VALIDATED')reg.stage='REVIEW';return save();
        case 'approve':
          ensure(['quality']); if(reg?.stage!=='REVIEW'||!reg.qualification?.ok)throw Error('必须先完成契约验证和提交。');
          reg.stage='PUBLISHED';reg.reviewedAt=new Date().toISOString();return save();
        case 'new': return newTask(k);
      }
      if(!d)return;
      switch(action) {
        case 'step': {
          const i=Number(k);
          if(i===4&&d.run?.snapshot || d.run&&i===3 || !d.run&&(i===0||i===1)) d.step=i;
          break;
        }
        case 'preflight': {
          const error=issue(d);
          if(error)throw Error(error);
          d.step=2;break;
        }
        case 'launch': {
          ensure(['engineer']); if(d.run)return;
          const m=E.freeze(d.scene,t.id+'-R1',activeRegistration(d.scene,d.choice),d.choice);
          d.run={manifest:m,stage:'DISPATCHED',packet:null,records:null,snapshot:null};
          t.status='RUNNING';d.step=3;break;
        }
        case 'replay': {
          if(d.run?.stage!=='DISPATCHED')return;
          d.run.packet=E.replay(E.dispatch(d.run.manifest));d.run.stage='RETURNED';break;
        }
        case 'receive': {
          if(d.run?.stage!=='RETURNED')return;
          d.run.records=E.receive(d.run.manifest,d.run.packet);
          d.run.stage='ARCHIVED';
          if(d.scene!=='rag')finish(t,d);
          break;
        }
        case 'score': if(d.scene==='rag'&&d.run?.stage==='ARCHIVED')finish(t,d);break;
        case 'evidence': d.focus=k;save();document.querySelector('.fw-evidence-target')?.scrollIntoView({block:'start'});return;
        case 'export': {
          const snapshot=d.run?.snapshot;
          if(snapshot)download(snapshot.id+'.json',JSON.stringify({snapshot,manifest:d.run.manifest},null,2));
          return;
        }
        default:return;
      }
      save();
    } catch(err) {message=err.message;save();}
  }
  function finish(t,d) {
    d.run.snapshot=E.score(d.run.manifest,d.run.records);
    d.run.stage='SCORED';t.status='COMPLETED';d.step=4;
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-fw]');
    if(b&&!b.disabled)handle(b.dataset.fw,b.dataset.key);
  });
  document.addEventListener('change',async e=>{
    if(e.target.id==='fw-e03-file'){
      const file=e.target.files[0], textarea=document.querySelector('#fw-e03-report');
      if(file && textarea){
        if(file.size<=100000)textarea.value=await file.text();
        else { message='联调报告文件过大，请使用验证台导出的 JSON。';P.paint(); }
      }
      return;
    }
    const k=e.target.dataset.fwField, d=task()?.frameworkPlan;
    if(k&&d&&!d.run&&Object.hasOwn(d.choice,k)){
      d.choice[k]=e.target.value;message='';P.paint();
      document.querySelector('[data-fw-field="'+k+'"]')?.focus({preventScroll:true});
    }
  });

  Object.assign(pages,{'flow-framework':capabilities,'framework-templates':templates});
  window.FrameworkEvaluationUI={
    openCapabilities(){handle('open-capabilities','open');},
    capabilityButton:(tab)=>buttons(tab==='scorer'?'登记 Ragas 评分实现':'框架接入配置','open-capabilities',tab==='scorer'?'rag':'','ghost'),
    registeredList:(tab)=>{
      const kind={executor:'执行器',adapter:'适配器',scorer:'评分实现'}[tab];
      const rows=Object.entries(registrationStore()).flatMap(([id,reg])=>reg.bindings.filter(c=>c.kind===kind).map(c=>[
        h(c.name)+'<small>'+h(c.id)+'</small>',h(reg.environment),stateLine(reg),buttons('查看框架登记','open-capabilities',id==='agentPrepared'?'agent':id,'ghost')
      ]));
      return rows.length?panel('已登记的框架能力',table(['实现版本','范围','资格','操作'],rows)):'';
    },
    templateButton:()=>buttons('框架评测模板','templates','','ghost'),
    taskPage
  };
})();
