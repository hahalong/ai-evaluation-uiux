/* Authoring and dispatch views for Agent assessment inside the task workspace. */
(() => {
  'use strict';

  const A = AgentEvaluation, R = MeasureRehearsal, M = A84MetricEngine, Assets = A84AssessmentAssetsUI, h = esc;
  const {badge, panel, notice, kv, table} = PlazaReview.helpers;
  const {key} = EvaluationCore;
  const evidenceNames = {oms:'当次 OMS', hmi:'HMI 采集', reason:'门控与卡片事件',
    'vehicle-state':'独立车况', clock:'同源时钟', 'recovery-trace':'恢复链路'};
  const button = (label, action, value = '', variant = '', disabled = false) =>
    `<button type="button" class="btn ${variant}" data-ae="${action}" data-key="${h(value)}"${disabled ? ' disabled' : ''}>${label}</button>`;
  const select = (label, name, list, value, hint = '选择固定版本') =>
    `<label class="pz-field">${label}<select name="${name}" data-ae-field="${name}" required><option value="">${hint}</option>${list.map(a =>
      `<option value="${h(key(a))}"${key(a) === value ? ' selected' : ''}>${h(a.name)} · ${h(a.version)}</option>`).join('')}</select></label>`;
  const catalog = () => EvalUI.core.list();
  const current = task => task.suitePlan.agentReview;
  const latest = (review, row) => review?.versions[row.unit.key]?.at(-1);
  const refLabel = ref => {
    const a = EvalUI.core.find(ref);
    return a && key(a) === ref ? a.name + ' · ' + a.version : ref || '待选择';
  };
  let selectedKey = '', lastTask = '', edit = null, pending = null, receiveError = '', reportKey = '';

  function context(task) {
    const rows = A.rows(task.suitePlan);
    if (lastTask !== task.id) {
      lastTask = task.id;
      selectedKey = rows[0]?.unit.key || '';
      reportKey = '';
      edit = null;
      pending = null;
      receiveError = '';
    }
    return {rows, row: rows.find(item => item.unit.key === selectedKey) || rows[0], review: current(task)};
  }

  function seedAssets() {
    let changed = false;
    function adopt(asset) {
      if (EvalUI.core.find(key(asset))) return;
      EvalUI.core.adopt(asset, {trusted: true});
      changed = true;
    }
    A.assets().forEach(adopt);
    A84AssessmentAssets.prepared(catalog()).forEach(adopt);
    if (changed) EvalUI.commit();
  }

  function create(task) {
    seedAssets();
    const plan = task.suitePlan;
    if (plan.agentReview) return;
    const rows = A.rows(plan);
    if (!rows.length) throw Error('当前导入批次缺少可构建的 Agent 评测行。');
    plan.agentReview = { drafts: Object.fromEntries(rows.map(row => [row.unit.key, A.initialDraft(plan, row)])), versions:{}, run:null };
  }

  function activeDraft(review, row) {
    if (!edit || edit.caseRef !== row.unit.caseRef) {
      edit = EvaluationCore.clone(latest(review, row)?.draft ?? review.drafts[row.unit.key]);
    }
    return edit;
  }

  function sourceLabel(source) {
    const label = `${h(source.sheet)} · 第 ${h(source.row)} 行`;
    return source.url === A.sourceUrl ? `<a href="${A.sourceUrl}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
  }

  function authoring(task) {
    const {rows, row, review} = context(task);
    if (!review) {
      return panel('从原表构建 Agent 评测用例',
        '<p class="muted">选择已导入的 Agent 评测行。系统保留原表定位、台架标签和前置、步骤、预期的导入内容。</p>' +
        table(['原表定位','评测用例','适用环境'], rows.map(({item,unit}) =>
          [h('测试案例 · 第 ' + item.original + ' 行'), `<strong>${h(unit.caseId)}</strong><small>${h(item.title)}</small>`, '台架模拟'])) +
        `<div class="me-actions">${button('从原表创建 ' + rows.length + ' 条评测草稿','create','','primary')}</div>`);
    }
    const draft = activeDraft(review,row);
    const buildAssets = Assets.render(task);
    if (buildAssets) return buildAssets;
    const version = latest(review,row);
    const prepared = rows.filter(item => latest(review,item)).length;
    const choice = A.choices(catalog(), draft.measure);
    const dataset = choice.data.find(a => key(a) === draft.dataRef);
    const references = choice.gold.filter(a => a.config.agentEvaluation.dataRef === draft.dataRef);
    const reference = references.find(a => key(a) === draft.goldRef);
    const metric = choice.metric.find(a => key(a) === draft.metricRef);
    const program = metric?.config?.agentEvaluation?.program;
    const rule = R.getRule(draft.measure), spec = A.spec(draft.measure);
    const samples = dataset?.config.agentEvaluation.samples || [];
    const gold = new Map(reference?.config.agentEvaluation.rows.map(row => [row.sampleId, row.label]));
    const done = review.run ? '本次台架派工已冻结。可查看定义和版本。' :
      prepared + '/' + rows.length + ' 条已保存试评版本。可逐条编辑，剩余用例可套用建议。';
    const readOnly = Boolean(review.run);
    return panel('Agent 评测用例构建',
      `<div class="ae-author"><div class="ae-list" role="group" aria-label="选择评测用例">${rows.map(({unit,item}) =>
        `<button type="button" class="ae-case" data-ae="select" data-key="${h(unit.key)}" aria-pressed="${unit.key === row.unit.key}">
          <strong>${h(unit.caseId)}</strong><span>${h(item.title)}</span><small>${latest(review,{unit}) ? '已保存试评版本' : '待配置'}</small>
        </button>`).join('')}</div>
      <div class="ae-editor">
        <div class="ae-heading"><div><h3>${h(row.unit.caseId + ' · ' + row.item.title)}</h3><p>${sourceLabel(draft.source)} · 台架模拟 · ${h(version?.version || '评测草稿')}</p></div>${badge(row.item.definitionSource || '导入定义')}</div>
        <form data-ae-form="case" class="me-form">
        <details class="ae-definition">
          <summary>核对原表前置、步骤和预期</summary>
          ${Object.entries({precondition:'前置条件',steps:'操作步骤',expected:'预期结果'}).map(([field,label]) =>
            `<label class="pz-field">${label}<textarea name="${field}" data-ae-definition="${field}" rows="2" ${readOnly ? 'readonly' : 'required'}>${h(draft.definition[field])}</textarea></label>`).join('')}
        </details>
        ${readOnly ? kv([['样本清单',h(refLabel(draft.dataRef))],['独立参考',h(refLabel(draft.goldRef))],['指标',h(refLabel(draft.metricRef))],
          ['观察窗',h(spec.window + (spec.ms ? ' · ' + draft.windowMs + ' ms' : ''))]]) : `
        <div class="pz-fields ae-material">
          ${select('样本清单','dataRef',choice.data,draft.dataRef)}
          ${select('独立金标 / 参考','goldRef',references,draft.goldRef,dataset ? '选择匹配的版本' : '请先选样本清单')}
          ${select('指标与计算规则','metricRef',choice.metric,draft.metricRef)}
          ${spec.kind === 'milliseconds' ? `<label class="pz-field">观察窗（ms）<input type="number" name="windowMs" data-ae-input="windowMs" min="1" max="3600000" step="1" value="${h(draft.windowMs)}" required></label>` :
            `<div class="ae-static"><strong>观察窗</strong><span>${h(spec.window)}</span></div>`}
        </div>`}
        ${spec.kind === 'milliseconds' ? `<p class="me-hint">${h(spec.window)}。演练时长由评测人填写，正式门槛待业务确认。</p>` : ''}
        ${samples.length ? `<details class="ae-samples"><summary>核对所选样本和独立参考（${draft.sampleIds.length}/${samples.length}）</summary>${table(
          ['纳入','样本 ID','切片','独立参考'], samples.map(sample => [
            `<input type="checkbox" data-ae-sample="${h(sample.id)}" aria-label="纳入样本 ${h(sample.id)}" ${draft.sampleIds.includes(sample.id) ? 'checked' : ''} ${readOnly ? 'disabled' : ''}>`,
            h(sample.id), h(sample.slice), h(gold.get(sample.id) || '待关联')
          ]))}</details>` : ''}
        ${metric ? `<div class="ae-rule">${kv([['统计单位 / 分母',h(rule.population)],['计算',h(rule.count)],['判定所需证据',h(rule.evidence)],
          ['评分实现',h(program ? program.implementation + ' · ' + program.schema : '内置规则 · 已登记的回放实现')]])}</div>` : ''}
        ${!readOnly ? `<div class="me-actions"><button class="btn primary" type="submit">保存试评版本</button>${button('套用本例建议','suggest-one','','ghost')}</div>` : ''}
        </form>
      </div></div>
      <div class="ae-footer"><span>${h(done)}</span><div class="pz-actions">
      ${readOnly ? '' : button('套用剩余用例建议','suggest-rest','','',prepared === rows.length)}
      ${button('去执行准备','stage','dependencies','primary',prepared !== rows.length)}</div></div>`,
      !readOnly && M.supported(draft.measure) ? button('创建评测资产','build-assets','','') : '');
  }

  function saveVersion(task, row, draft) {
    const review = current(task);
    if (review.run) throw Error('本次台架派工已冻结。请从导入批次生成新计划复测。');
    const versions = review.versions[row.unit.key] || [];
    const version = A.confirm(catalog(), draft, versions);
    if (version !== versions.at(-1)) review.versions[row.unit.key] = [...versions, version];
    review.drafts[row.unit.key] = EvaluationCore.clone(version.draft);
    return version;
  }

  function suggested(draft) {
    const next = {...draft,...A.recommended(draft.measure)};
    const {data} = A.choices(catalog(),draft.measure);
    next.sampleIds = data.find(a => key(a) === next.dataRef)?.config.agentEvaluation.samples.map(sample => sample.id) || [];
    return next;
  }

  function connectivity(task, profiles, selectedProfile) {
    const plan = task.suitePlan, flow = PlazaReview.state().flow;
    const groups = [
      {env:'bench',label:'台架模拟 · Agent 指标',evidence:A.needs(A.rows(plan)),schemas:A.requiredSchemas(plan.agentReview?.versions,catalog())},
      {env:'cloud',label:'云端模拟 · Ripple 功能',evidence:['door-session','oms-card','ac-request']}
    ];
    const eligible = (p, group) => A.qualified(p,flow,group.env,group.evidence,task.project,group.schemas);
    const data = groups.map(group => {
      const available = profiles.filter(profile => eligible(profile,group));
      const selected = selectedProfile(group.env,plan.profileRefs[group.env]);
      const profile = eligible(selected,group) ? selected : available.at(-1);
      return {...group,available,selected:eligible(selected,group) ? selected : null,profile};
    });
    const rows = data.map(group => {
      const p = group.selected || group.profile;
      const frozen = group.env === 'bench' ? Boolean(current(task)?.run) : Boolean(plan.manifest);
      return [h(group.label), p ? `<strong>${h(p.name)}</strong><small>${h(p.adapterVersion)} / ${h(p.executorVersion)}</small>` : '待接入维护人登记',
        p ? badge(group.selected ? '已引用 · 回放验证' : '推荐 · 回放验证','good') + `<small>${h(p.qualification.id)} · ${h(group.evidence.map(item => evidenceNames[item] || item).join('、'))}</small>` +
          (group.schemas?.length ? `<small>回传结构 ${h(group.schemas.join('、'))}</small>` : '') : badge('待验证','warn'),
        frozen ? '已冻结派工' : group.available.length ? `<label class="pz-field"><span class="ae-sr">选择${h(group.label)}组合</span><select data-ae-profile="${group.env}" aria-label="选择${h(group.label)}组合">
          <option value="">请选择</option>${group.available.map(option => `<option value="${h(option.id)}"${group.selected?.id === option.id ? ' selected' : ''}>${h(option.name)}</option>`).join('')}</select></label>` : '等待合格版本'];
    });
    rows.push(['实车 · 现场取证','现场团队领取并确认工况','按原表实车范围另行联调','等待现场回传']);
    return panel('复用已验证的接入组合',
      '<p class="muted">评测人选用组合。接入维护人在「执行与评分能力」验证协议、采证范围和回传格式后发布固定版本。当前组合资格限开发回放。</p>' +
      table(['执行范围','适配器 / 执行器','资格与证据覆盖','本任务引用'],rows) +
      `<div class="me-actions">${button('引用推荐组合','profiles','','primary',data.every(group => group.selected || !group.profile))}</div>`);
  }

  function benchHandoff(task, benchProfile, objectVersion) {
    const {rows, review} = context(task);
    const run = review?.run;
    const planned = run ? run.manifest.entries.reduce((total, entry) => total + entry.trials.length, 0) : 0;
    const check = run ? null : A.benchPreflight(task,rows,review?.versions,catalog(),benchProfile,PlazaReview.state().flow,objectVersion);
    const trace = (caseRef, version) => `${h(caseRef)}<br><small>${h(version || '待保存试评')}</small>`;
    const checks = run ? run.manifest.entries.map(entry => [h(entry.caseId),trace(entry.caseRef,entry.caseVersion),
      h(entry.metricRef) + '<br><small>' + h(entry.program?.implementation) + '</small>',
      h(entry.dataRef) + '<br><small>' + h(entry.goldRef) + '</small>',h(entry.program?.schema),badge('已冻结','good')]) :
      check.checks.map(({unit,version,material,issues}) => [h(unit.caseId),trace(unit.caseRef,version?.version),
        version ? h(version.draft.metricRef) + '<br><small>' + h(material?.metricAsset?.config?.agentEvaluation?.program?.implementation || '待验证') + '</small>' : '待选择',
        version ? h(version.draft.dataRef) + '<br><small>' + h(version.draft.goldRef) + '</small>' : '待选择',
        h(material?.metricAsset?.config?.agentEvaluation?.program?.schema || '待验证'),
        issues.length ? badge('待补齐','warn') + '<br><small>' + h(issues.join('；')) + '</small>' : badge('通过','good')]);
    return panel('台架执行 · E01–E06',
      `<div class="ae-heading"><p>平台冻结样本、观察窗和采证要求。试次是某个用例在固定样本、环境与参数下的一次计划执行。台架回传每次执行的记录，平台用独立参考计算。</p>
      ${badge(run ? (run.records.length === planned ? '逐试次已收齐' : run.records.length ? '已收部分结果' : '待台架执行与回传') : '待平台发起',run?.records.length ? 'good' : 'warn')}</div>` +
      (run ? kv([['台架派工单',h(run.manifest.id)],['台架子计划',h(run.manifest.childPlanId)],
        ['被测对象版本',h(run.manifest.objectVersion)],['适配器 / 执行器',h(run.manifest.profile.adapterVersion + ' / ' + run.manifest.profile.executorVersion)],
        ['已登记 / 已收',h(planned + ' / ' + run.records.length)],
        ['外部运行 ID',h(run.externalRunId || '等待回传')]]) :
        kv([['被测对象版本',h(objectVersion?.id || '待选择')],['适配器 / 执行器',h(benchProfile ? benchProfile.adapterVersion + ' / ' + benchProfile.executorVersion : '待引用')]]) +
        notice(check.ok ? '台架运行前检查通过，可冻结以下配置。' : '台架运行前检查未通过。' + (check.errors.length ? ' 请' + h(check.errors.join('；')) + '。' : ' 查看下表待补齐的用例。'),check.ok ? '' : 'warn')) +
      `<details class="ae-raw"${run ? '' : ' open'}><summary>${run ? '查看冻结的用例和评分版本' : '查看用例预检明细'}</summary>${table(['用例','固定用例 / 试评版本','指标 / 计算器','样本 / 金标','采证结构','状态'],checks)}</details>` +
      `<div class="me-actions">${run ? button('下载台架派工 JSON','bench-download','','primary') + externalLink() :
        button('发起台架派工','bench-start','','primary',!check.ok)}</div>` +
      (run ? `<div class="ae-receive"><label class="pz-field">上传台架回传 JSON<input type="file" accept=".json,application/json" data-ae-file="bench"></label>
        ${receiveError ? notice(h(receiveError),'bad') : ''}
        ${pending ? kv([['外部运行 ID',h(pending.body.externalRunId)],['本次新增 / 重复',h(pending.added + ' / ' + pending.duplicates)],
          ['接收后仍待回传',h(String(pending.planned - pending.records.length))]]) + button('确认接收台架结果','bench-accept','','primary') : ''}
        ${run.records.length ? button('查看台架报告','stage','report','ghost') : ''}</div>` : ''));
  }

  function externalLink() {
    return '<a class="btn ae-external-link" href="./a84-external.html">打开外部执行回放</a>';
  }

  function metricSummary(row) {
    if (!row.received) return '等待回传';
    const {measure} = row.manifest, {items,total,summary} = row.report;
    if (measure === 'latency') {
      const label = index => {
        const p95 = R.percentiles(items,index)[2];
        return typeof p95 === 'number' ? p95 + ' ms' : '待采';
      };
      return '提醒 p95 ' + label(0) + ' · 确认 p95 ' + label(1);
    }
    if (measure === 'actuation' && summary) return summary.denominator ?
      summary.passed + ' / ' + summary.denominator + ' · 有效点击' : '等待有效点击';
    if (measure === 'repeat' && summary) return summary.extra + ' 次额外提醒 · ' +
      summary.violations + '/' + summary.denominator + ' 同口径周期';
    if (items.every(item => item.value === null)) return '待有效观测';
    const count = items.reduce((sum,item) => sum + (item.value ?? 0),0);
    if (measure === 'repeat') return count + ' 次额外提醒 · ' + items.filter(item => item.value > 0).length + '/' + total + ' 周期';
    return count + ' / ' + total + '（' + (100 * count / total).toFixed(0) + '%）';
  }

  function report(task, renderDetail) {
    const run = current(task)?.run;
    if (!run?.records.length) return '';
    const list = A.reports(run);
    const selected = list.find(item => item.manifest.caseId === reportKey) || list[0];
    return panel('台架 Agent 指标', table(['用例','指标','本地观测','已收 / 计划','缺测或未回传','逐试次'],list.map(row => [
      h(row.manifest.caseId), h(R.getRule(row.manifest.measure).title), h(metricSummary(row)), h(row.received + ' / ' + row.report.total),
      h(String(row.manifest.program ? row.report.unknown :
        row.report.items.filter(item => item.value === null || Array.isArray(item.value) && item.value.some(value => value === null)).length)),
      button('查看 ' + h(row.manifest.caseId),'report',row.manifest.caseId,selected === row ? 'primary' : 'ghost')
    ])) + renderDetail(selected) +
      `<details class="ae-raw"><summary>查看台架原始回传观测</summary><pre>${h(JSON.stringify(run.records,null,2))}</pre></details>`);
  }

  function wire(handlers) {
    const {activeTask,requireEdit,paint,good,error,download,selectedProfile,profiles} = handlers;
    Assets.wire(handlers);
    document.addEventListener('click', event => {
      const el = event.target.closest('[data-ae]');
      if (!el || el.disabled) return;
      const task = activeTask();
      if (!task?.suitePlan) return;
      const {rows,row,review} = context(task);
      const plan = task.suitePlan;
      const value = el.dataset.key;
      try {
        switch (el.dataset.ae) {
          case 'select':
            selectedKey = value;
            edit = null;
            paint(); return;
          case 'stage':
            handlers.stage(value); return;
          case 'report':
            reportKey = value; paint();
            document.querySelector('[aria-label="' + CSS.escape(value + ' 本地试评结果') + '"]')?.scrollIntoView({block:'nearest'});
            return;
          case 'create':
            requireEdit(); create(task); good('已根据导入行建立评测草稿。'); return;
          case 'build-assets':
            requireEdit();
            if (review.run) throw Error('本次台架派工已冻结。');
            seedAssets();
            Assets.open(task,activeDraft(review,row));
            paint(); window.scrollTo(0,0); return;
          case 'suggest-one':
            requireEdit(); seedAssets(); edit = suggested(activeDraft(review,row)); paint(); return;
          case 'suggest-rest': {
            requireEdit();
            seedAssets();
            const pendingVersions = rows.filter(item => !latest(review,item)).map(item =>
              [item,suggested(review.drafts[item.unit.key])]);
            for (const [,draft] of pendingVersions) A.confirm(catalog(),draft,[]);
            for (const [item,draft] of pendingVersions) saveVersion(task,item,draft);
            edit = null;
            good('剩余用例已套用固定资产和观察窗建议，已保存的版本保留。'); return;
          }
          case 'profiles':
            requireEdit();
            for (const env of ['bench','cloud']) {
              if (env === 'bench' ? review?.run : plan.manifest) continue;
              const evidence = env === 'bench' ? A.needs(rows) : ['door-session','oms-card','ac-request'];
              const schemas = env === 'bench' ? A.requiredSchemas(review?.versions,catalog()) : [];
              if (A.qualified(selectedProfile(env,plan.profileRefs[env]),PlazaReview.state().flow,env,evidence,task.project,schemas)) continue;
              const recommended = profiles().filter(p => A.qualified(p,PlazaReview.state().flow,env,evidence,task.project,schemas)).at(-1);
              if (recommended) plan.profileRefs[env] = recommended.id;
            }
            good('已引用合格的固定适配器和执行器组合。'); return;
          case 'bench-start':
            requireEdit();
            if (!review || review.run) throw Error('请选择待发起的台架计划。');
            const platform = PlazaReview.state();
            const objectVersion = PlazaCore.version(PlazaCore.object(platform,task.objectId),task.versionId);
            review.run = A.benchRun(task,rows,review.versions,catalog(),selectedProfile('bench',plan.profileRefs.bench),
              platform.flow,'BENCH-' + crypto.randomUUID().slice(0,8).toUpperCase(),objectVersion);
            good('台架派工已冻结，等待外部执行与回传。'); return;
          case 'bench-download':
            download(A.dispatchFile(review.run.manifest),review.run.manifest.id + '-台架派工.json'); return;
          case 'bench-accept': {
            requireEdit();
            if (!pending) throw Error('请先上传并核对台架回传。');
            const receipt = A.accept(review.run,pending.body);
            pending = null;
            good(receipt.added ? '已接收 ' + receipt.added + ' 条台架观测，已按冻结指标计算。' : '相同观测已接收，试次及分母保持不变。'); return;
          }
        }
      } catch (err) { error(err.message); }
    });

    document.addEventListener('input', event => {
      if (!edit) return;
      const el = event.target;
      if (el.dataset.aeInput) edit[el.dataset.aeInput] = el.value;
      if (el.dataset.aeDefinition) edit.definition[el.dataset.aeDefinition] = el.value;
    });
    document.addEventListener('change', async event => {
      const el = event.target, field = el.dataset.aeField, env = el.dataset.aeProfile;
      if (!field && !env && !el.dataset.aeSample && !el.dataset.aeFile) return;
      const task = activeTask(), {rows,review} = context(task);
      if (el.dataset.aeFile) {pending = null; receiveError = '';}
      try {
        requireEdit();
        if (env) {
          if (env === 'bench' ? review?.run : task.suitePlan.manifest) throw Error('已冻结的派工保留原组合。');
          const p = selectedProfile(env,el.value);
          const evidence = env === 'bench' ? A.needs(rows) : ['door-session','oms-card','ac-request'];
          const schemas = env === 'bench' ? A.requiredSchemas(review?.versions,catalog()) : [];
          if (el.value && !A.qualified(p,PlazaReview.state().flow,env,evidence,task.project,schemas)) throw Error('组合资格不符合本任务。');
          task.suitePlan.profileRefs[env] = el.value;
          paint(); return;
        }
        if (el.dataset.aeFile) {
          const file = el.files?.[0];
          if (!file) return;
          if (file.size > 2 * 1024 * 1024) throw Error('回传文件超出本地原型的 2 MB 上限。');
          const body = JSON.parse(await file.text());
          if (activeTask()?.id !== task.id) return;
          pending = A.preview(review.run,body);
          good('台架回传已对账，请核对后确认接收。'); return;
        }
        if (review.run) throw Error('本次台架派工已冻结。');
        if (field) {
          edit[field] = el.value;
          if (field === 'dataRef') {
            edit.goldRef = '';
            const dataset = EvalUI.core.find(edit.dataRef);
            edit.sampleIds = dataset?.config?.agentEvaluation?.samples?.map(sample => sample.id) || [];
          }
          paint(); document.querySelector('[data-ae-field="' + field + '"]')?.focus(); return;
        }
        const sampleId = el.dataset.aeSample;
        edit.sampleIds = el.checked ? [...new Set([...edit.sampleIds,sampleId])] : edit.sampleIds.filter(id => id !== sampleId);
        const header = el.closest('details').querySelector('summary');
        const total = EvalUI.core.find(edit.dataRef).config.agentEvaluation.samples.length;
        header.textContent = '核对所选样本和独立参考（' + edit.sampleIds.length + '/' + total + '）';
      } catch (err) {
        if (activeTask()?.id !== task.id) return;
        if (el.dataset.aeFile) {receiveError=err.message;paint();return;}
        error(err.message);
      }
    });
    document.addEventListener('submit', event => {
      if (!event.target.matches('[data-ae-form="case"]')) return;
      event.preventDefault();
      const task = activeTask(), {row,review} = context(task);
      try {
        requireEdit();
        const version = saveVersion(task,row,activeDraft(review,row));
        good('已保存 ' + row.unit.caseId + ' · 试评版本 ' + version.revision + '。');
      } catch (err) { error(err.message); }
    });
  }

  function selectCase(task,value) {
    context(task);
    selectedKey = value;
    edit = null;
  }

  window.AgentEvaluationUI = {authoring,connectivity,benchHandoff,externalLink,report,wire,selectCase};
})();
