/* Assessment asset creation inside the Agent use case workflow. */
(() => {
  'use strict';
  const A = A84AssessmentAssets, M = A84MetricEngine, h = esc;
  const {panel,table,kv,notice,badge} = PlazaReview.helpers;
  let session = null;
  const clean = value => String(value ?? '').trim();
  const button = (text,action,style='',disabled=false) =>
    `<button type="button" class="btn ${style}" data-a84-assets="${action}" ${disabled ? 'disabled' : ''}>${text}</button>`;
  const field = (label,name,value,type='text') =>
    `<label class="pz-field">${label}<input name="${name}" type="${type}" value="${h(value)}"${type === 'number' ? ' min="1" max="3600000" step="1"' : ''}></label>`;
  const dataset = () => session.dataRef ? EvalUI.core.find(session.dataRef) : null;
  const sourceDataset = () => session.sourceRef ? EvalUI.core.find(session.sourceRef) : null;
  const createData = measure => measure !== 'recovery';
  function sourceChoices(spec) {
    if (!spec?.source) return [];
    const choices = AgentEvaluation.choices(EvalUI.core.list(),spec.source).data;
    return spec.source === 'false-alert' ? choices.filter(asset=>asset.config.agentEvaluation.samples
      .some(sample=>sample.parameters?.group === 'no_pet')) : choices;
  }

  function open(task,draft) {
    if (!M.supported(draft.measure)) return;
    const spec = A.config(draft.measure);
    const sourceCase = spec?.source === 'miss' ? 'E01/bench' : 'E02/bench';
    const origin = spec?.source ? task.suitePlan.agentReview.versions[sourceCase]?.at(-1)?.draft : null;
    const recommendedSource = spec?.source ? AgentEvaluation.recommended(spec.source).dataRef : '';
    const available = sourceChoices(spec);
    const sourceRef = [origin?.dataRef,recommendedSource].find(ref=>available.some(asset=>EvaluationCore.key(asset) === ref)) || '';
    session = {taskId:task.id,draft,step:createData(draft.measure) ? 'samples' : 'metric',
      dataRef:draft.dataRef,goldRef:draft.goldRef,metricRef:'',sourceRef,origin,
      sampleName:(spec?.sampleTitle.replace(/^创建/,'') || '有宠视频清单') + ' · 走查新建',
      goldName:(spec?.goldTitle.replace(/^配对/,'') || '应提醒金标') + ' · 走查新建',
      metricName:MeasureRehearsal.getRule(draft.measure).title + ' · 可执行',
      sampleText:'',goldText:'',sampleFile:'',goldFile:'',basis:spec?.basis || 'V2 第 151 行的业务触发条件及演练素材标注',
      testWindow:String(draft.windowMs || AgentEvaluation.spec(draft.measure).ms || ''),
      mapping:{},samplePreview:null,goldPreview:null,verification:null};
  }

  function sourceSelect(spec) {
    if (!spec?.source) return '';
    const s = session;
    return `<label class="pz-field">${h(spec.sourceLabel)}<select name="sourceRef"><option value="">选择来源固定版本</option>${
      sourceChoices(spec).map(asset=>{
        const ref = EvaluationCore.key(asset);
        return `<option value="${h(ref)}"${ref === s.sourceRef ? ' selected' : ''}>${h(asset.name + ' · ' + ref)}</option>`;
      }).join('')}</select></label>`;
  }

  function sampleSummary(row) {
    const p = row.parameters;
    if (!p) return row.inputRef || '沿用来源片段';
    if (p.group) return A84V2Fixtures.negativeGroups[p.group] + ' · ' + row.inputRef;
    if (p.action) return A84V2Fixtures.cycleActions[p.action] + (row.sourceSampleId ? ' · 引用 ' + row.sourceSampleId : ' · 60 秒连续片段');
    return p.cabinC + '/' + p.outsideC + '℃ · 同段 ' + row.sourceSampleId;
  }

  function forms() {
    const s = session, measure = s.draft.measure, variant = A.config(measure);
    if (s.step === 'samples') {
      const title = variant?.sampleTitle || '创建有宠视频清单';
      const help = variant?.sampleHelp || '先登记可访问的片段引用，再给每个独立场景一个样本 ID。正式素材由资源库提供版本和使用授权，本地演练使用登记过的片段引用。';
      const source = sourceDataset();
      if (variant?.reuse) {
        const rows = source?.config.agentEvaluation.samples || [];
        return panel(title,`<p class="muted">${h(help)}</p>
          <form data-a84-assets-form="samples">${sourceSelect(variant)}</form>` +
          (rows.length ? table(['样本 ID','切片'],rows.map(row=>[h(row.id),h(row.slice)])) : '') +
          `<div class="me-actions">${button('引用所选清单','reuse-samples','primary',!source)}</div>`);
      }
      return panel(title,`<p class="muted">${h(help)}</p>
        <form data-a84-assets-form="samples">${field('清单名称','sampleName',s.sampleName)}${sourceSelect(variant)}
        <label class="pz-field">导入 CSV 或 TSV<input type="file" data-a84-assets-file="sampleText" accept=".csv,.tsv,text/csv,text/plain"></label>
        ${s.sampleFile ? '<p class="muted">已读取：' + h(s.sampleFile) + '</p>' : ''}
        <label class="pz-field">清单内容<textarea name="sampleText" rows="7" placeholder="${h(variant?.sampleHeaders.join(',') || 'sample_id,video_ref,slice')}">${h(s.sampleText)}</textarea></label>
        <div class="me-actions">${button('载入演练清单','sample-fill')}${button('校验清单','sample-check','primary')}</div></form>` +
        (s.samplePreview ? `<div class="ae-rule">${badge(s.samplePreview.length + ' 条独立样本 · 校验通过','good')}
        ${table(['样本 ID','片段或执行参数','切片'],s.samplePreview.map(row=>[h(row.id),h(sampleSummary(row)),h(row.slice)]))}
        <div class="me-actions">${button('发布演练样本清单','sample-save','primary')}</div></div>` : ''));
    }
    if (s.step === 'gold') {
      return panel(variant?.goldTitle || '按样本 ID 配对独立金标',
        `<p class="muted">${h(variant?.goldHelp || '按已确认的触发条件标注“应提醒”。金标从业务依据和独立复核产生，绑定到精确的清单版本。')}</p>` +
        kv([['配对的样本清单',h(dataset()?.name || '') + ' · ' + h(s.dataRef)]]) +
        `<form data-a84-assets-form="gold"><div class="pz-fields me-fields">${field('金标名称','goldName',s.goldName)}
        ${field('标注依据','basis',s.basis)}</div>
        <label class="pz-field">导入标注 CSV 或 TSV<input type="file" data-a84-assets-file="goldText" accept=".csv,.tsv,text/csv,text/plain"></label>
        ${s.goldFile ? '<p class="muted">已读取：' + h(s.goldFile) + '</p>' : ''}
        <label class="pz-field">金标内容<textarea name="goldText" rows="7" placeholder="${h(variant?.goldHeaders.join(',') || 'sample_id,expected_reminder,reviewer')}">${h(s.goldText)}</textarea></label>
        <div class="me-actions">${button('载入演练标注','gold-fill')}${button('核对样本与金标','gold-check','primary')}</div></form>` +
        (s.goldPreview ? `<div class="ae-rule">${badge(s.goldPreview.length + ' 条金标 · 样本 ID 全部匹配','good')}
        ${table(['样本 ID','预期','复核人'],s.goldPreview.map(row=>[h(row.sampleId),h(row.label),h(row.reviewer)]))}
        <div class="me-actions">${button('发布演练金标','gold-save','primary')}</div></div>` : ''));
    }
    const spec = M.definition(measure), rule = MeasureRehearsal.getRule(measure), timing = AgentEvaluation.spec(measure);
    return panel('配置可执行指标',
      '<p class="muted">指标引用已登记的计算器和字段映射。试算通过后发布固定版本。正式验收门槛另由业务确认。</p>' +
      kv([['评分实现',h(spec.name + ' · ' + spec.implementation)],['输入结构',h(spec.schema)],
        ['统计单位 / 分母',h(rule.population)],['计算规则',h(rule.count)],
        ['采证时段',h(timing.window)],['证据缺失','保留计划记录，按指标口径单列缺证']]) +
      (measure === 'recovery' ? notice('恢复成功还需独立终态到位。恢复窗口内逐项检查旧任务重放、误控车和残留卡片。') : '') +
      `<form data-a84-assets-form="metric"><div class="pz-fields me-fields">${field('指标名称','metricName',s.metricName)}
      ${timing.kind === 'milliseconds' ? field('试算窗口（ms）','testWindow',s.testWindow,'number') : ''}
      ${Object.keys(spec.mapping).map(key => {
        const type = M.fields[spec.mapping[key]].type;
        return `<label class="pz-field">${M.mappingLabels[key]}<select name="${key}"><option value="">选择回传字段</option>${
          Object.entries(M.fields).filter(([,field])=>field.type===type).map(([id,field])=>
            `<option value="${id}" ${s.mapping[key]===id?'selected':''}>${h(field.label)} · ${id}</option>`).join('')}</select></label>`;
      }).join('')}</div>
      <div class="me-actions">${button('套用本例字段映射','metric-map')}${button('运行规则试算','metric-check','primary')}</div></form>` +
      (s.verification ? `<div class="ae-rule">${badge(s.verification.length + ' 个场景试算通过','good')}
      ${table(['试算场景','期望','实际','计算依据'],s.verification.map(test=>[h(test.name),h(valueLabel(measure,test.expected,test.eligible)),
        h(valueLabel(measure,test.actual,test.eligible)),h(test.calculation)]))}
      <div class="me-actions">${button('发布演练指标版本','metric-save','primary')}</div></div>` : ''));
  }

  function valueLabel(measure,value,eligible) {
    if (eligible === false) return '单列，不纳入分母';
    if (value === null) return '无法判定';
    if (measure === 'repeat') return value + ' 次额外提醒';
    if (Array.isArray(value)) return value.map(part=>part === null ? '缺测' : part + ' ms').join(' / ');
    return {miss:['按时提醒','漏提醒'],'false-alert':['未误提醒','误提醒'],
      actuation:['未全部到位','全部到位'],recovery:['恢复未通过','恢复成功']}[measure][value];
  }

  function render(task) {
    if (session?.taskId !== task.id) return '';
    const s = session;
    const steps = createData(s.draft.measure) ?
      button('1 样本清单','go-samples',s.step === 'samples' ? 'primary' : '') +
      button('2 配对金标','go-gold',s.step === 'gold' ? 'primary' : '',!dataset()) +
      button('3 可执行指标','go-metric',s.step === 'metric' ? 'primary' : '',!s.goldRef) : '';
    return panel(h(s.draft.caseId) + ' · 创建评测资产',
      `<div class="ae-heading"><p>发布后的固定版本可在用例中选用。以下校验在本地演练范围运行。</p>
      ${button('返回用例','close','ghost')}</div>
      <div class="me-inline">${steps}</div>` +
      (s.metricRef ? notice('已发布 ' + h(s.metricRef) + '。可把本次创建的资产带回用例。','good') +
        button('引用已创建资产','apply','primary') : '')) + forms();
  }

  function publish(asset) {
    const core = EvalUI.core;
    const stored = core.adopt(asset,{trusted:true});
    if (!EvalUI.commit()) {
      delete core.db.assets[EvaluationCore.key(stored)];
      throw Error('本地资产目录发生冲突，请刷新后重试。');
    }
    return EvaluationCore.key(stored);
  }

  function validateMetric() {
    const program = M.configure(session.draft.measure,session.mapping);
    const window = AgentEvaluation.spec(session.draft.measure).kind === 'milliseconds' ? Number(session.testWindow) : null;
    const verification = M.validate(program,window);
    if (!verification.every(test => test.ok)) throw Error('试算有未通过项，请核对映射。');
    return {program,window,verification};
  }

  function wire({activeTask,requireEdit,paint,good,error}) {
    const live = () => S.route === 'task-prep' && activeTask()?.suitePlan?.stage === 'measure' &&
      session?.taskId === activeTask()?.id;
    function recordInput(el) {
      const form = el.closest('[data-a84-assets-form]');
      if (!form || !live() || !el.name) return;
      if (Object.hasOwn(M.definition(session.draft.measure).mapping,el.name)) session.mapping[el.name] = el.value;
      else session[el.name] = el.value;
      if (el.name === 'sourceRef') {
        session.dataRef=''; session.goldRef=''; session.goldPreview=null;
        session.samplePreview=null;
        return;
      }
      if (form.dataset.a84AssetsForm === 'metric') session.metricRef='';
      const previewKey = {samples:'samplePreview',gold:'goldPreview',metric:'verification'}[form.dataset.a84AssetsForm];
      if (session[previewKey]) {
        session[previewKey] = null;
        form.nextElementSibling?.remove();
      }
    }
    document.addEventListener('input',event => recordInput(event.target));
    document.addEventListener('change',async event => {
      if (!live()) return;
      const input = event.target, file = input.dataset.a84AssetsFile && input.files?.[0];
      if (input.name === 'sourceRef' && input.closest('[data-a84-assets-form]')) {
        paint();
        return;
      }
      if (!file) return;
      const target = session, step = session.step;
      try {
        requireEdit();
        if (file.size > 2 * 1024 * 1024) throw Error('清单文件超过本地演练的 2 MB 上限。');
        const value = await file.text();
        if (session !== target || session.step !== step || !input.isConnected || !live()) return;
        const prefix = input.dataset.a84AssetsFile === 'goldText' ? 'gold' : 'sample';
        session[prefix + 'Text'] = value;
        session[prefix + 'File'] = file.name;
        session[prefix + 'Preview'] = null;
        paint();
      } catch (err) {error(err.message);}
    });
    document.addEventListener('submit',event => {
      if (event.target.matches('[data-a84-assets-form]')) event.preventDefault();
    });
    document.addEventListener('click',event => {
      const el = event.target.closest('[data-a84-assets]');
      if (!el || el.disabled || !live()) return;
      const s = session;
      const measure = s.draft.measure;
      try {
        requireEdit();
        switch (el.dataset.a84Assets) {
          case 'go-samples': s.step='samples'; break;
          case 'go-gold': s.step='gold'; break;
          case 'go-metric': s.step='metric'; break;
          case 'sample-fill': s.sampleText=A.sampleCsv(measure,sourceDataset()); s.sampleFile=''; s.samplePreview=null; break;
          case 'sample-check': s.samplePreview=A.samples(s.sampleText,measure,sourceDataset()); break;
          case 'reuse-samples':
            if (!sourceDataset()) throw Error('请先选择 E01 的有宠清单版本。');
            s.dataRef=s.sourceRef; s.goldText=''; s.goldFile=''; s.goldRef=''; s.goldPreview=null; s.step='gold';
            good('已引用来源样本清单固定版本。'); return;
          case 'sample-save': {
            if (!clean(s.sampleName) || !s.samplePreview) throw Error('请填写清单名称并先校验。');
            const asset = A.createDataset(EvalUI.core.id(measure === 'miss' ? 'A84-VIDEO' : 'A84-DATA'),clean(s.sampleName),
              s.samplePreview,measure,s.sourceRef);
            s.dataRef=publish(asset);
            s.goldText=''; s.goldFile=''; s.goldRef=''; s.goldPreview=null; s.step='gold';
            good('已发布演练样本清单固定版本。'); return;
          }
          case 'gold-fill': s.goldText=A.goldCsv(dataset(),measure); s.goldFile=''; s.goldPreview=null; break;
          case 'gold-check': s.goldPreview=A.gold(s.goldText,dataset(),measure); break;
          case 'gold-save': {
            if (!clean(s.goldName) || !clean(s.basis) || !s.goldPreview) throw Error('请填写金标名称、标注依据并先核对。');
            const asset=A.createGold(EvalUI.core.id('A84-GOLD'),clean(s.goldName),dataset(),s.goldPreview,clean(s.basis),measure);
            s.goldRef=publish(asset);
            s.step='metric';
            good('已发布与样本版本配对的独立金标。'); return;
          }
          case 'metric-map': s.mapping={...M.definition(s.draft.measure).mapping}; s.verification=null; break;
          case 'metric-check': s.verification=validateMetric().verification; break;
          case 'metric-save': {
            if (!s.verification || !clean(s.metricName)) throw Error('请先试算并填写指标名称。');
            const {program,window}=validateMetric();
            s.metricRef=publish(A.createMetric(EvalUI.core.id('A84-METRIC'),clean(s.metricName),program,window));
            good('已发布可执行的演练指标版本。'); return;
          }
          case 'apply':
            if (s.dataRef && (s.dataRef !== s.draft.dataRef || measure === 'latency')) {
              s.draft.dataRef=s.dataRef;
              s.draft.sampleIds=measure === 'latency' && s.origin?.dataRef === s.dataRef ? [...s.origin.sampleIds] :
                dataset().config.agentEvaluation.samples.map(row=>row.id);
            }
            if (s.goldRef) s.draft.goldRef=s.goldRef;
            if (s.metricRef) {
              s.draft.metricRef=s.metricRef;
              if (AgentEvaluation.spec(measure).kind === 'milliseconds') s.draft.windowMs=s.testWindow;
            }
            session=null;
            good('已带回新建资产。确认观察窗后保存试评版本。'); return;
          case 'close': session=null; break;
        }
        paint();
      } catch (err) {error(err.message);}
    });
  }

  window.A84AssessmentAssetsUI = {open,render,wire};
})();
