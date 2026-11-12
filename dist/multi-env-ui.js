/* Multi-environment workspace inside the existing asset, capability and task pages. */
(() => {
  'use strict';
  const M = MultiEnvCore, P = PlazaReview, C = PlazaCore, F = EvaluationFlow, R = MeasureRehearsal,
    A = AgentEvaluation, AE = AgentEvaluationUI, h = esc;
  const { badge, panel, notice, kv, table, title, wrap } = P.helpers;
  const labels = {
    id: '用例编号', title: '名称', priority: '优先级', environment: '适用环境',
    kind: '用例类型', original: '原表行', group: '测试组',
    precondition: '前置条件', steps: '步骤', expected: '预期结果', notes: '备注',
    purpose: '测试目的', definitionSource: '定义来源', measure: '试评模板'
  };
  const stages = { coverage: '环境计划', dependencies: '依赖与接入', handoff: 'Ripple 交接', report: '结果报告' };
  const kinds = { new: '新增草稿', unchanged: '已有版本', changed: '新草稿版本' };
  const pageSize = 12;
  const defaults = {
    cloud: {
      name: 'A8-4 云端 Ripple 联调', resource: '隔离 MQTT 测试环境', identity: 'cred-ref:cockpit/ripple-qa',
      deployment: 'BrainApp / brain_kernel · 联调构建', observer: 'Ripple 下行订阅、门态和会话轨迹',
      adapterVersion: 'ripple-mqtt-protobuf@1', protocol: 'MQTT / protobuf · brain_kernel',
      inputs: 'brain/up/{uid}/car_state · brain/up/{uid}/oms',
      outputs: 'ui/down/{uid}/a2ui · pa/down/{uid}/action',
      executorVersion: 'ripple-file-handoff@1', executorName: 'Ripple 文件交接',
      executorEntry: '文件交接 · Ripple 控制台',
      reset: '每次使用隔离测试 UID，确认初态和清理'
    },
    bench: {
      name: 'A8-4 台架接入', resource: '8797 台架 · 待落实设备', identity: 'cred-ref:cockpit/bench-qa',
      deployment: '8797 车机与台架镜像 · 待核实', observer: 'HMI 观察及独立空调读回',
      adapterVersion: 'bench-aidl-signals@1', protocol: 'AIDL / 车门及 HMI 信号',
      inputs: '台架车门、车温、OMS 输入', outputs: '车机 HMI 与独立车态记录',
      executorVersion: 'bench-worker@1', executorName: '台架设备执行器',
      executorEntry: '台架执行池 · 接口待核验',
      reset: '独占设备租约，复位确认后释放'
    },
    vehicle: {
      name: 'A8-4 实车取证', resource: '获准测试车辆 · 待落实车窗', identity: 'auth-ref:cockpit/vehicle-test',
      deployment: '试验车辆与 OMS 版本 · 待核实', observer: '真实 OMS 金标、HMI、独立三区状态',
      adapterVersion: 'vehicle-evidence@1', protocol: '现场观察记录映射',
      inputs: '现场工况、真实 OMS 数据', outputs: '现场记录、视频授权引用及独立状态',
      executorVersion: 'vehicle-field-handoff@1', executorName: '现场测试与证据回传',
      executorEntry: '现场任务单与结构化回传',
      reset: '现场负责人确认获准操作和车辆恢复'
    }
  };
  let upload = null, importResult = null, recent = null, flash = null, loading = false;
  let profileEnvironment = 'cloud', profileTask = null, profileSelection = undefined, profileDirectory = false;
  let filter = { task: null, environment: 'cloud', q: '', page: 0, detail: '' };
  let pendingScript = null, pendingResult = null, resultError = '', dependencyDraft = {};
  let measureKey = '';

  function app() {
    const state = P.state();
    state.multiEnv ??= { imports: [], profiles: [] };
    return state.multiEnv;
  }

  function seedConnections() {
    const flows = P.state().flow.capabilities;
    const benchEvidence = ['oms','hmi','reason','vehicle-state','clock','recovery-trace'];
    for (const [env, version, name, mode, evidence, observationSchemas] of [
      ['bench', 2, '8797 台架 · 时间线与独立状态', 'bench-file', benchEvidence,
        ['miss','recovery'].map(measure=>A84MetricEngine.definition(measure).schema)],
      ['bench', 3, '8797 台架 · V2 六项 Agent 采证', 'bench-file', benchEvidence, A84MetricEngine.schemas()],
      ['cloud', 1, '云端 Ripple · MQTT / Protobuf', 'ripple-file', ['door-session','oms-card','ac-request'], []]
    ]) {
      const base = env === 'bench' ? {...defaults.bench,
        adapterVersion:'bench-aidl-signals@'+version,executorVersion:'bench-worker@'+version} : defaults[env];
      const qualification = {ok:true, synthetic:true, scope:A.scope,
        id:env === 'bench' ? 'DEV-QUAL-BENCH-0'+version : 'DEV-QUAL-RIPPLE-01',observationSchemas,
        tests:['固定版本与环境匹配','逐试次证据映射','错配与重复回传校验']};
      for (const [kind, id, title] of [
        ['adapter',base.adapterVersion,env === 'bench' ? '台架信号与证据适配器' : 'Ripple 报文与证据适配器'],
        ['executor',base.executorVersion,env === 'bench' ? '台架派工与采集执行器' : 'Ripple 文件交接执行器']
      ]) {
        if (flows.some(cap => cap.id === id)) continue;
        const cap = {id,name:title,kind,version:version + '.0',owner:'接入维护人',source:'a84-development-replay',
          digest:'fixture:' + id,entry:base.executorEntry,modes:[mode],operations:['prepare','observe','return'],
          evidence,environments:[env],project:'cockpit',status:'PUBLISHED',priority:100};
        const signature = JSON.stringify([cap.source,cap.digest,cap.entry,cap.modes,cap.operations,cap.evidence,cap.environments]);
        flows.push({...cap,qualification:{...qualification,signature}});
      }
      const id = env + '-verified@' + version;
      if (!app().profiles.some(p => p.id === id)) app().profiles.push({...base,id,name,environment:env,version,qualification});
    }
  }

  const activeTask = () => C.task(P.state());
  const selectedProfile = (environment, id) => app().profiles.find(profile => profile.environment === environment && profile.id === id);
  const latestProfile = environment => app().profiles.filter(profile => profile.environment === environment).at(-1);
  const canEdit = () => ['engineer', 'ops', 'admin'].includes(S.role);
  const error = message => { flash = { message, kind: 'bad' }; P.paint(); };
  const good = message => { flash = { message, kind: 'good' }; P.paint(); };
  const inform = () => flash ? notice(h(flash.message), flash.kind) : '';
  const paint = () => P.paint();
  const goTo = route => { flash = null; P.route(route); };
  const button = (text, action, value = '', type = '', disabled = false) =>
    `<button type="button" class="btn ${type}" data-me="${action}" data-value="${h(value)}"${disabled ? ' disabled' : ''}>${text}</button>`;
  const valueInput = (text, name, value, attrs = '') =>
    `<label class="pz-field">${text}<input name="${name}" value="${h(value)}" ${attrs}></label>`;
  const options = (text, name, list, value, attrs = '') =>
    `<label class="pz-field">${text}<select name="${name}" ${attrs}>${list.map(([key, label]) =>
      `<option value="${h(key)}"${String(key) === String(value) ? ' selected' : ''}>${h(label)}</option>`).join('')}</select></label>`;
  const fileInput = (text, key, accept, disabled = false) =>
    `<label class="pz-field me-file">${text}<input type="file" data-me-file="${key}" accept="${accept}"${disabled ? ' disabled' : ''}></label>`;
  const stat = (value, label) => `<div><strong>${h(value)}</strong><small>${label}</small></div>`;
  const stats = (...items) => `<div class="flow-stats me-stats">${items.join('')}</div>`;
  const pair = (label, value) => [label, h(value || '待补齐')];
  const shaLabel = sha => sha ? sha.slice(0, 12) + '…' : '待记录';

  function setSheet(name) {
    upload.name = name;
    upload.rows = upload.workbook.read(name);
    upload.upstream = upload.rows.slice(0,4).some(row => row.values.some(value => String(value).includes(A.sourceUrl))) ? A.sourceUrl : '';
    setHeader(M.findHeader(upload.rows));
  }

  function setHeader(number) {
    upload.header = number;
    upload.mapping = M.autoMap(upload.rows.find(row => row.number === number)?.values || []);
    importResult = null;
  }

  async function readWorkbook(file) {
    const buffer = await file.arrayBuffer();
    const workbook = await CaseFileImport.openWorkbook(buffer);
    if (!workbook.names.length) throw Error('工作簿内没有可选工作表。');
    const name = workbook.names.find(name => name === '用例索引') ?? workbook.names.find(name => name === '测试案例') ?? workbook.names[0];
    const dispatch = workbook.names.includes('分环境执行') ? M.readDispatch(workbook.read('分环境执行')) : {};
    upload = { fileName: file.name, sha256: await digest(buffer), workbook, dispatch };
    setSheet(name);
    recent = null;
  }

  function digest(buffer) {
    return crypto.subtle.digest('SHA-256', buffer).then(hash =>
      Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join(''));
  }

  function importPage() {
    const previous = recent || app().imports.at(-1);
    const content = fileInput('上传分环境工作簿（.xlsx）', 'workbook', '.xlsx', loading) +
      (loading ? notice('正在读取工作簿。') : '') +
      (upload ? sourceForm() : '<p class="muted">读取选中的工作表。上传后可检查表头和字段对应关系。</p>');
    return wrap(title('批量导入评测用例', '一条原表编号保留一个业务用例。环境标签用于展开执行计划。', button('返回用例库', 'case-library')) +
      inform() + panel('选择工作簿与来源', content, button('通用用例模板与导入', 'general-import', '', 'ghost')) +
      (importResult ? importPreview() : '') + (previous && !importResult ? receipt(previous) : ''));
  }

  function sourceForm() {
    const headerValues = upload.rows.find(row => row.number === upload.header)?.values || [];
    const columns = headerValues.flatMap((text, i) => text ? [[i, columnLabel(i) + ' · ' + text]] : []);
    const headers = upload.rows.slice(0, 40).map(row => [row.number, `第 ${row.number} 行`]);
    if (!headers.some(([n]) => n === upload.header)) headers.push([upload.header, `第 ${upload.header} 行`]);
    return `<div class="pz-fields me-fields">${options('工作表', 'source-sheet', upload.workbook.names.map(name => [name, name]), upload.name, 'data-me-change="sheet"')}
      ${options('表头位置', 'source-header', headers, upload.header, 'data-me-change="header"')}</div>
      <div class="me-source"><strong>${h(upload.fileName)}</strong><small>SHA-256 ${h(shaLabel(upload.sha256))}</small></div>
      <div class="pz-fields me-map">${Object.keys(labels).map(key => options(labels[key] + (M.requiredFields.includes(key) ? ' *' : ''), key,
        [[-1, '本表未提供'], ...columns], upload.mapping[key], 'data-me-change="mapping"')).join('')}</div>
      <div class="pz-actions me-actions">${button('预览导入', 'preview', '', 'primary')}</div>`;
  }

  function columnLabel(index) {
    return index < 26 ? String.fromCharCode(65 + index) :
      String.fromCharCode(64 + Math.floor(index / 26)) + String.fromCharCode(65 + index % 26);
  }

  function inspectImport() {
    const fileSource = upload.fileName.replace(/\.xlsx$/i, '') + ' / ' + upload.name;
    const sourceId = upload.upstream ? upload.upstream + ' / 测试案例' : fileSource;
    const previous = app().imports.find(batch => batch.sourceId === sourceId) ||
      app().imports.find(batch => batch.sourceId === fileSource || batch.source.sha256 === upload.sha256 && batch.source.sheet === upload.name);
    const draft = M.preview(upload.rows, upload.header, upload.mapping);
    const rows = M.classify(draft.candidates, previous, upload.dispatch);
    importResult = { sourceId, previous, rows, errors: draft.errors };
  }

  function importPreview() {
    const { rows, errors, previous } = importResult;
    const ready = rows.filter(row => row.content.definitionComplete).length;
    const conflicts = rows.filter(row => row.content.priorityConflict);
    const missingKind = rows.filter(row => !row.content.kind).length;
    const changes = rows.filter(row => row.state !== 'unchanged').length;
    const missing = (previous?.cases || []).filter(item => !rows.some(row => row.content.id === item.id)).length;
    const categorized = rows.some(row => row.content.purpose);
    return panel('核对本批次', stats(stat(rows.length, '有效编号'), stat(changes, '新增或变化'), stat(conflicts.length, '优先级待核对'), stat(errors.length, '隔离行')) +
      (categorized ? stats(...M.purposes.map(purpose => stat(rows.filter(row => row.content.purpose === purpose).length, purpose))) : '') +
      notice(`前置、步骤及预期完整 ${ready} 条。类型待补 ${missingKind} 条。优先级采用表中独立字段。`, 'warn') +
      (missing ? notice(`已有批次有 ${missing} 条本次未出现。新计划采用本次有效范围，历史计划保留原快照。`, 'warn') : '') +
      table(['原表行', '用例编号与名称', '优先级', '适用环境', '导入处理'], rows.slice(0, 7).map(({ content, state }) => [
        h(content.original), `<strong>${h(content.id)}</strong><small>${h(content.title)}</small>`, h(content.priority),
        h(content.envs.map(env => M.environments[env]).join(' / ')), badge(kinds[state])
      ])) +
      (errors.length ? table(['工作簿行', '用例', '待处理'], errors.map(row => [h(row.row), h(row.id), h(row.reasons.join('、'))])) : '') +
      (conflicts.length ? `<details><summary>查看 ${conflicts.length} 条优先级差异</summary>${table(['用例', '原表行', '采用优先级', '来源备注'], conflicts.map(({ content }) => [
        h(content.id), h(content.original), h(content.priority), h(content.notes || '标题与优先级列不一致')]))}</details>` : '') +
      `<p class="me-hint">预览前 ${Math.min(rows.length, 7)} 条。保存后可以在用例库检索全部候选。</p>
      <div class="pz-actions me-actions">${button(`保存 ${rows.length} 条用例候选`, 'save-import', '', 'primary', !rows.length)}</div>`);
  }

  function saveImport() {
    if (!importResult?.rows.length) throw Error('请先生成有有效行的导入预览。');
    const { sourceId, rows, previous, errors } = importResult;
    const state = P.state();
    const source = { file: upload.fileName, sheet: upload.name, header: upload.header, sha256: upload.sha256, upstream: upload.upstream };
    const cases = rows.map(({ content, old, state: classification }) => {
      if (classification === 'unchanged') return old;
      const c = F.draft(state.flow, { name: content.title, type: 'AGENT', description: content.definition.steps || content.title });
      if (old) {
        const oldCase = F.get(state.flow, old.ref);
        if (oldCase) {
          c.id = oldCase.id;
          c.version = Math.max(...state.flow.cases.filter(item => item.id === c.id).map(item => item.version)) + 1;
          c.key = c.id + '@' + c.version;
        }
      }
      c.source = `${source.sheet} · 原表第 ${content.original} 行`;
      c.input = content.definition.precondition;
      c.importRef = { source, content };
      return { id: content.id, ref: c.key, content };
    });
    const same = previous && previous.source.sha256 === source.sha256 && previous.cases.length === cases.length &&
      cases.every((item, i) => item.ref === previous.cases[i].ref);
    const hasNewProvenance = Boolean(source.upstream && source.upstream !== previous?.source.upstream);
    const batch = same && !hasNewProvenance ? previous : {
      sourceId, source, cases, errors, name: source.file.replace(/\.xlsx$/i, ''),
      revision: same ? previous.revision : (previous?.revision || 0) + 1
    };
    if (batch !== previous) app().imports = [...app().imports.filter(item => item !== previous && item.sourceId !== sourceId), batch];
    recent = batch;
    upload = null;
    importResult = null;
    good(same ? '已复用原批次，未创建重复用例。' : `已保存 ${cases.length} 条用例候选，可在用例库查看。`);
  }

  function receipt(batch) {
    const agents = batch.cases.filter(row => row.content.purpose === 'Agent 评测' && A.spec(row.content.measure));
    return panel('已保存的导入批次', kv([
      pair('工作簿', batch.source.file), pair('工作表与表头', `${batch.source.sheet} · 第 ${batch.source.header} 行`),
      pair('版本', 'v' + batch.revision), pair('用例候选', batch.cases.length + ' 条'), pair('隔离行', String(batch.errors.length))
    ]) + (agents.length ? notice('检测到 ' + agents.length + ' 条 Agent 评测，进入构建后可从原表行建立草稿。') : ''),
    button('生成分环境计划', 'create-plan', batch.sourceId, agents.length ? '' : 'primary') +
    (agents.length ? button('构建 Agent 评测', 'create-agent-plan', batch.sourceId, 'primary') : ''));
  }

  function assetEntry() {
    const batch = app().imports.at(-1);
    if (!batch) return '';
    return `<div class="me-inline">${badge(`最近导入 ${batch.cases.length} 条候选`, 'good')}${button('查看导入批次', 'import', '', 'ghost')}${button('生成分环境计划', 'create-plan', batch.sourceId, 'ghost')}</div>`;
  }

  function caseMeta(c) {
    if (!c.importRef) return '';
    const { content, source } = c.importRef;
    return panel('原表定位和执行依赖', kv([
      pair('用例编号', content.id), pair('原表行', '第 ' + content.original + ' 行'), pair('工作表行', source.sheet + ' · ' + content.workbookRow),
      pair('环境', content.envs.map(env => M.environments[env]).join(' / ')), pair('优先级', content.priority),
      pair('测试目的', content.purpose), pair('案例类型', content.kind), pair('定义来源', content.definitionSource),
      pair('前置', content.definition.precondition), pair('步骤', content.definition.steps),
      pair('预期', content.definition.expected), pair('来源备注', content.notes || '无')
    ]));
  }

  function createPlan(sourceId, stage = 'coverage', objectId = null) {
    const batch = app().imports.find(item => item.sourceId === sourceId) ?? app().imports.at(-1);
    if (!batch) { goTo('flow-import'); return; }
    const q = P.state();
    const object = objectId ? C.object(q,objectId) : q.objects.find(item => item.upstream === 'pet-agent' && item.visible);
    const task = C.createTask(q, { name: objectId ? batch.source.file+' · 分环境评测' : 'A8-4 V2 分环境评测', type: object?.type||'AGENT', objectId: object?.id, versionId: objectId ? null : object?.versions[0]?.id });
    task.suitePlan = M.createPlan(batch, task.id);
    task.suitePlan.stage = stage;
    task.status = 'BLOCKED';
    if (!objectId && !A.rows(task.suitePlan).length) {
      for (const environment of Object.keys(M.environments)) {
        const profile = latestProfile(environment);
        if (profile) task.suitePlan.profileRefs[environment] = profile.id;
      }
    }
    P.openTask(task.id);
  }

  function taskPage(task) {
    if (filter.task !== task.id) {
      filter = { task: task.id, environment: 'cloud', q: '', page: 0, detail: '' };
      pendingScript = null;
      pendingResult = null;
      resultError = '';
      dependencyDraft = {};
      measureKey = '';
    }
    const plan = task.suitePlan;
    const agent = A.rows(plan).length;
    const render = { coverage: coveragePage, dependencies, measure: agent ? AE.authoring : measurePage, auxiliary: measurePage, handoff, report: reportPage };
    const tabs = agent ? {coverage:'环境计划', measure:'Agent 用例构建', dependencies:'执行准备', handoff:'派工与回传', report:'结果报告'} :
      measureUnits(plan).length ? {
      coverage: stages.coverage, dependencies: stages.dependencies, measure: '评测构建与试评',
      handoff: stages.handoff, report: stages.report
    } : stages;
    return wrap(`<div class="pz-crumb">${button('评测任务', 'task-list', '', 'ghost')}<span>/</span><span>${h(task.id)}</span></div>` +
      title(h(task.name), `来源 ${h(plan.suite.source.sheet)} v${plan.suite.revision} · ${plan.suite.cases.length} 条候选 · 本地联调原型`,
        badge(plan.report ? '已收到云端联调回传' : '全量计划待执行', 'warn')) +
      `<nav class="me-tabs" aria-label="分环境评测步骤">${Object.entries(tabs).map(([key, label], i) =>
        `<button type="button" class="btn" data-me="stage" data-value="${key}" aria-current="${key === plan.stage ? 'step' : 'false'}"><small>${i + 1}</small>${label}</button>`).join('')}</nav>` +
      inform() + render[plan.stage](task));
  }

  function coveragePage(task) {
    const { suitePlan: plan } = task;
    const all = M.coverage(plan);
    const byCase = new Map(plan.suite.cases.map(row => [row.id, row.content]));
    const categorized = plan.suite.cases.some(row => row.content.purpose);
    const matches = plan.units.filter(unit => unit.environment === filter.environment && matchesSearch(byCase.get(unit.caseId)));
    const page = matches.slice(filter.page * pageSize, (filter.page + 1) * pageSize);
    const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
    const detail = plan.units.find(unit => unit.key === filter.detail);
    const current = all.find(item => item.environment === filter.environment);
    const benchReports = new Map(A.reports(plan.agentReview?.run).map(row => [row.manifest.caseId,row]));
    return stats(stat(plan.suite.cases.length, '业务用例'), stat(plan.units.length, '环境适用项'),
      stat(all.reduce((n, item) => n + item.p0, 0), 'P0 环境适用项'), stat((plan.report?.items.length || 0) +
        measureReports(plan).length + [...benchReports.values()].filter(row => row.received).length, '已回传本地试评')) +
      panel('按 Excel 环境标签展开', `<div class="me-env-switch" role="group" aria-label="测试环境">${all.map(item =>
        `<button class="me-env-button" type="button" data-me="environment" data-value="${item.environment}" aria-pressed="${item.environment === filter.environment}"><strong>${M.environments[item.environment]} <b>${item.count}</b></strong><small>P0 ${item.p0} 项</small></button>`).join('')}</div>
      <p class="me-hint">当前子计划 ${h(plan.childIds?.[current.environment] || task.id + '-' + current.environment.toUpperCase())}</p>
      ${categorized ? table(['测试目的', '用例', ...Object.values(M.environments)], M.purposes.map(purpose => [
        purpose, String(plan.suite.cases.filter(row => row.content.purpose === purpose).length),
        ...Object.keys(M.environments).map(env => String(plan.units.filter(unit => unit.environment === env && byCase.get(unit.caseId).purpose === purpose).length))
      ])) : ''}
      <form class="me-search" data-me-form="search"><label class="pz-field">查找用例<input name="query" value="${h(filter.q)}" placeholder="如 E01"></label>
      ${categorized ? options('测试目的', 'purpose-filter', [['', '全部'], ...M.purposes.map(purpose => [purpose, purpose])], filter.purpose || '', 'data-me-change="purpose-filter"') : ''}
      <button class="btn" type="submit">查找</button>${filter.q ? button('清除', 'clear-search', '', 'ghost') : ''}</form>` +
      table(['原表行', '用例编号和名称', '优先级', '建议派工', '状态', '取证要求'], page.map(unit => {
        const item = byCase.get(unit.caseId);
        const result = plan.report?.items.find(row => row.trial.caseId === unit.caseId && plan.manifest.environment === unit.environment);
        const state = result ? badge(result.verdict + ' · 联调', result.verdict === 'PASS' ? 'good' : 'warn') :
          badge(unit.environment === 'bench' && benchReports.get(unit.caseId)?.received ? '已收台架回传' : plan.agentReview?.versions[unit.key]?.length ? '已保存试评版本' :
            plan.measureRuns?.[unit.key]?.report ? '已收本地试评' : plan.manifest?.environment === unit.environment && plan.manifest.trials.some(trial => trial.caseId === unit.caseId) ? '已生成派工' : item.definitionComplete ? '待审核' : '待补正式定义', 'warn');
        return [h(item.original), `<strong>${h(item.id)}</strong><small>${h(item.title)}</small>${item.purpose ? badge(h(item.purpose)) : ''}`, h(unit.priority),
          h(unit.route?.method || '待确认'), state, button('查看', 'unit-detail', unit.key, 'ghost')];
      })) +
      (!page.length ? notice('当前环境和筛选条件下没有用例。') : '') +
      `<div class="me-pagination"><span>${M.environments[current.environment]} ${current.count} 项 · 当前匹配 ${matches.length} 项 · 第 ${filter.page + 1}/${totalPages} 页</span>
      ${button('上一页', 'page', '-1', '', filter.page === 0)}${button('下一页', 'page', '1', '', filter.page + 1 >= totalPages)}</div>` +
      (detail ? unitDetails(plan, detail) : ''), button('配置依赖与接入', 'stage', 'dependencies', 'primary'));
  }

  function matchesSearch(row) {
    if (filter.purpose && row.purpose !== filter.purpose) return false;
    if (!filter.q) return true;
    return [row.id, row.title, row.group].some(value => value.toLowerCase().includes(filter.q.toLowerCase()));
  }

  function unitDetails(plan, unit) {
    const item = plan.suite.cases.find(row => row.id === unit.caseId).content;
    const agent = item.purpose === 'Agent 评测' && A.spec(item.measure) && unit.environment === 'bench';
    const action = agent ? button('构建评测用例', 'agent-case', unit.key, 'primary') :
      R.getRule(item.measure) ? button('构建并试评此用例', 'measure-case', unit.key, 'primary') : '';
    const history = agent && plan.measureRuns?.[unit.key] ? button('打开既有试评', 'measure-case', unit.key, 'ghost') : '';
    return `<div class="me-detail" role="region" aria-label="用例取证要求"><h3>${h(item.id)} · ${M.environments[unit.environment]}</h3>` +
      kv([pair('用例版本', unit.caseRef), pair('原表行', String(item.original)), pair('本层取证', unit.route?.evidence),
        pair('执行方', unit.route?.owner), pair('执行前核对', unit.route?.needs), pair('来源备注', item.notes || '无')]) +
      (item.definitionSource === '原表摘要' ? kv([pair('原表步骤摘要', item.definition.steps), pair('原表预期摘要', item.definition.expected)]) : '') +
      `<div class="me-actions">${action}${history}${button('查看固定用例版本','view-case',unit.caseRef,'ghost')}</div></div>`;
  }

  function rippleCheck(task, profile) {
    const state = P.state(), objectVersion = C.version(C.object(state,task.objectId),task.versionId);
    const check = M.ripplePreflight(task,profile,objectVersion);
    if (check.unit && !EvaluationFlow.get(state.flow,check.unit.caseRef)) check.errors.push('固定的用例版本不存在');
    if (A.rows(task.suitePlan).length && profile && !A.qualified(profile,state.flow,'cloud',['door-session','oms-card','ac-request'],task.project)) {
      check.errors.push('引用覆盖三项证据的已验证 Ripple 组合');
    }
    return {...check,objectVersion,ok:!check.errors.length};
  }

  function dependencies(task) {
    const plan = task.suitePlan, object = C.object(P.state(), task.objectId);
    const pilot = plan.pilot, chosen = pendingScript ?? pilot?.script;
    const caseItem = plan.units.find(unit => unit.caseId === M.defaultCaseId && unit.environment === 'cloud');
    const profiles = Object.keys(M.environments).map(env => {
      const profile = selectedProfile(env, plan.profileRefs[env]);
      const list = app().profiles.filter(profile => profile.environment === env);
      return [M.environments[env], profile ? h(profile.name + ' · v' + profile.version) : badge('待配置', 'warn'),
        profile ? h(profile.adapterVersion) : '待绑定', profile ? h(profile.executorName + ' · ' + profile.executorVersion) : '待绑定',
        profile ? badge(env === 'cloud' ? '可用于本地交接' : '待设备联调', 'warn') : '待落实',
        plan.manifest ? '清单已冻结' : list.length ? options('已保存配置', 'profile-' + env,
          [['', '请选择'], ...list.map(p => [p.id, p.name + ' · v' + p.version])], profile?.id || '', `data-me-change="profile-ref" data-env="${env}"`) +
          button('维护组合', 'profile', env, 'ghost') : button('配置组合', 'profile', env, 'ghost')];
    });
    const agent = A.rows(plan).length;
    return panel('被测对象和版本', object ? options('Agent 版本', 'object-version',
      object.versions.map(version => [version.id, object.name + ' · ' + version.label + '（原型版本）']), task.versionId,
      plan.manifest || plan.agentReview?.run ? 'disabled' : 'data-me-change="version"') : notice('请在 Agent/模型广场登记宠物主动服务 Agent。', 'warn')) +
      (agent ? AE.connectivity(task,app().profiles,selectedProfile) :
        panel('适配器、执行器和环境', table(['环境', '环境配置', '适配器', '执行器', '接入状态', '操作'], profiles))) +
      panel(agent ? '云端 Ripple 脚本' : '试跑依赖数据与脚本', caseItem ? `<div class="me-inline"><strong>${M.defaultCaseId} · ${h(caseItem.caseRef)}</strong>${badge('仅用于云端联调', 'warn')}<small>${agent ? 'E01–E06 使用台架采集，保留独立的指标口径。' : '其余用例继续使用各自的原表依赖。'}</small></div>
      <form data-me-form="dependencies" class="me-form">
      <div class="pz-fields me-fields">${valueInput('数据包名称', 'name', dependencyDraft.name ?? pilot?.name ?? 'A8-4 关门会话初态 v1', plan.manifest ? 'disabled' : 'required')}
      ${valueInput('评分参考', 'reference', dependencyDraft.reference ?? pilot?.reference ?? 'V2 第 6 行 · 关门等待、当次 OMS、一张卡、确认前零控车', plan.manifest ? 'disabled' : 'required')}</div>
      ${kv([pair('初始状态', '上电已处理，功能启用，无旧 Pending'), pair('注入顺序', '左前门开 → 前四门全关 → 当次有宠 OMS'),
        pair('脚本输入', chosen ? `舱温 ${chosen.cabin}℃ · 外温 ${chosen.outside}℃ · OMS ${chosen.oms}` : '绑定 YAML 后从脚本读取'),
        pair('Ripple 脚本', chosen ? chosen.name + ' · SHA-256 ' + shaLabel(chosen.sha256) : '待绑定'),
        pair('计算规则', M.rippleRuleRef)])}
      ${plan.manifest ? notice('本次派工的数据、脚本和参考已冻结。') : fileInput('绑定已有 Ripple YAML', 'script', '.yml,.yaml')}
      ${!plan.manifest ? '<div class="pz-actions me-actions"><button class="btn primary" type="submit">保存试跑依赖</button></div>' : ''}</form>` :
      notice('当前套件没有选入可用于这条联调路径的云端用例。', 'warn')) +
      `<div class="pz-actions me-actions">${button(agent ? '去派工与回传' : '查看运行前检查', 'stage', 'handoff', 'primary')}</div>`;
  }

  function profilePage() {
    const env = profileEnvironment, profile = profileSelection === null ? Object.fromEntries(Object.keys(defaults[env]).map(key=>[key,''])) : profileSelection ? {...selectedProfile(env,profileSelection)} : { ...defaults[env], ...(window.NavigationUI?.isExample()?app().profiles.filter(p=>p.environment===env&&/-verified@/.test(p.id)).at(-1):latestProfile(env)) };
    return wrap(title('分环境接入组合', '维护人一次登记组合版本，评测任务按环境引用。', button('返回', 'profile-return', '', 'ghost')) +
      inform() + `<div class="me-tabs" aria-label="环境配置">${Object.entries(M.environments).map(([key, label]) =>
        `<button class="btn" type="button" aria-pressed="${key === env}" data-me="profile-env" data-value="${key}">${label}</button>`).join('')}</div>
      <form data-me-form="profile" class="me-form">` +
      panel('环境、资源与观测', `<div class="pz-fields me-fields">${valueInput('组合名称', 'name', profile.name, 'required')}
        ${valueInput('资源实例', 'resource', profile.resource, 'required')}${valueInput('授权引用', 'identity', profile.identity, 'required')}
        ${valueInput('实际部署或联调构建', 'deployment', profile.deployment, 'required')}
        ${valueInput('独立观测', 'observer', profile.observer, 'required')}${valueInput('隔离与复位', 'reset', profile.reset, 'required')}</div>`) +
      panel('适配器', `<div class="pz-fields me-fields">${valueInput('适配器固定版本', 'adapterVersion', profile.adapterVersion, 'required')}
        ${valueInput('协议与结构', 'protocol', profile.protocol, 'required')}${valueInput('注入入口', 'inputs', profile.inputs, 'required')}
        ${valueInput('采证入口', 'outputs', profile.outputs, 'required')}</div>`) +
      panel('执行器', `<div class="pz-fields me-fields">${valueInput('主执行器名称', 'executorName', profile.executorName, 'required')}
        ${valueInput('执行器固定版本', 'executorVersion', profile.executorVersion, 'required')}
        ${valueInput('交接入口', 'executorEntry', profile.executorEntry, 'required')}</div>` +
        (env === 'cloud' ? `<p class="me-hint">回传格式 ${M.resultSchema}</p>` : '') +
        notice(env === 'cloud' ? '本地交接支持导出派工与导入回传。Ripple 服务接口、取消和查询能力待真实联调。' :
          '配置可供计划引用。现场设备、执行资格及取证能力待联调。', 'warn')) +
      `<div class="pz-actions me-actions"><button class="btn primary" type="submit">${profileTask ? '保存组合并应用到任务' : '保存组合版本'}</button></div></form>`);
  }

  function measureUnits(plan) {
    const agent = A.rows(plan).length;
    const ids = new Set(plan.suite.cases.filter(row => R.getRule(row.content.measure) &&
      (!agent || row.content.purpose !== 'Agent 评测')).map(row => row.id));
    return plan.units.filter(unit => ids.has(unit.caseId) || plan.measureRuns?.[unit.key]);
  }

  function measureReports(plan) {
    const replayed = new Set(A.reports(plan.agentReview?.run).filter(row => row.received).map(row => row.manifest.caseId));
    return Object.values(plan.measureRuns || {}).filter(run => run.report &&
      !(run.manifest.environment === 'bench' && replayed.has(run.manifest.caseId)));
  }

  function measureUnit(plan) {
    const units = measureUnits(plan);
    return units.find(unit => unit.key === measureKey) || units.find(unit => unit.environment === 'bench' &&
      plan.suite.cases.some(row => row.id === unit.caseId && row.content.purpose === 'Agent 评测')) || units[0];
  }

  function measurePage(task) {
    const plan = task.suitePlan, unit = measureUnit(plan);
    if (!unit) return notice('本批次未导入可用于本地试评的模板。', 'warn');
    measureKey = unit.key;
    const item = plan.suite.cases.find(row => row.id === unit.caseId).content;
    const rule = R.getRule(item.measure), run = plan.measureRuns?.[unit.key];
    const profile = selectedProfile(unit.environment, plan.profileRefs[unit.environment]);
    return panel('构建本地试评', options('用例及环境', 'measure-unit', measureUnits(plan).map(row =>
      [row.key, row.caseId + ' · ' + M.environments[row.environment]]), unit.key, 'data-me-change="measure-unit"') +
      notice('台架、性能和专项回传使用本地合成夹具验证判定逻辑。正式执行需要真实的样本、证据与获批规则。', 'warn') +
      kv([pair('原表与用例版本', '第 ' + item.original + ' 行 · ' + unit.caseRef),
        pair('测试目的', item.purpose), pair('统计对象', rule.population), pair('计算规则', rule.count), pair('需要的证据', rule.evidence),
        pair('真实依赖摘要', item.definition.precondition)]) +
      (run ? kv([pair('冻结清单', run.manifest.id), pair('样本清单', run.manifest.data), pair('独立参考', run.manifest.reference),
        pair('指标规则', run.manifest.ruleRef), pair('本地观察窗', run.manifest.windowMs === null ? '不适用' : run.manifest.windowMs + ' ms'),
        pair('预登记试次', String(run.manifest.trials.length))]) :
        `<form data-me-form="measure" class="me-form">
          <div class="pz-fields me-fields">
          ${valueInput('样本清单版本', 'data', 'fixture-a84-' + item.id.toLowerCase() + '@1', 'required')}
          ${valueInput('独立参考或决策表版本', 'reference', 'ref-v2-row-' + item.original + '@local1', 'required')}
          ${valueInput('指标或检查规则版本', 'ruleRef', 'measure-' + item.measure + '@local1', 'required')}
          ${rule.timeWindow ? valueInput('本地观察窗（ms）', 'windowMs', '5000', 'type="number" min="1" step="1" required') : ''}</div>
          ${kv([pair('环境组合', profile?.name), pair('适配器 / 执行器', profile ? profile.adapterVersion + ' / ' + profile.executorVersion : ''),
            pair('预登记试次', String(rule.data.length)), pair('正式门槛', '按批准方案另行冻结')])}
          <div class="pz-actions me-actions"><button class="btn primary" type="submit"${profile ? '' : ' disabled'}>冻结本地试评</button>
          ${profile ? '' : button('去配置环境组合', 'stage', 'dependencies')}</div>
        </form>`)) +
      (run ? panel('接收逐试次观测', `<div class="pz-actions me-actions">
        ${button('下载试评清单', 'measure-manifest')}${button('下载本地回传夹具', 'measure-sample')}</div>` +
        fileInput('导入观测 JSON 并试评', 'measure-result', '.json,application/json') +
        (run.report ? measureResult(run) + button('查看汇总报告', 'stage', 'report', 'primary') :
          notice('等待逐试次观测，按冻结的清单和参考计算。'))) : '');
  }

  const metricRatio = (value,denominator) => denominator ?
    `${value} / ${denominator}（${(100 * value / denominator).toFixed(0)}%）` : '无适用分母';

  function v2Result(measure,summary,planned) {
    if (measure === 'false-alert') {
      const {groups,vendor} = summary;
      const wrong = groups.reduce((sum,group)=>sum+group.wrong,0);
      return kv([pair('已证实误提醒 / 登记场景',metricRatio(wrong,planned)),
        pair('真实无宠模型误报 / 有效模型周期',metricRatio(vendor.wrong,vendor.valid)),
        pair('模型有效 / 登记真实无宠',vendor.valid + ' / ' + vendor.planned)]) +
        table(['业务分组','已证实误提醒 / 登记场景','缺证'],groups.map(group=>[
          h(A84V2Fixtures.negativeGroups[group.group]),h(metricRatio(group.wrong,group.planned)),h(String(group.unknown))]));
    }
    if (measure === 'actuation') return kv([
      pair('已证实成功 / 有效点击',metricRatio(summary.passed,summary.denominator)),
      pair('有效点击 / 计划试次',summary.denominator + ' / ' + planned),
      pair('有效点击后缺车况证据',String(summary.unknown)),
      pair('未在有效期内点击',String(summary.excluded)),
      pair('点击资格待核对',String(summary.unconfirmed))
    ]);
    return kv([
      pair('已证实额外提醒总次数',String(summary.extra)),
      pair('违规周期 / 同口径周期',metricRatio(summary.violations,summary.denominator)),
      pair('同口径周期 / 计划周期',summary.denominator + ' / ' + planned),
      pair('频控冲突周期 · 待裁决',String(summary.conflicts)),
      pair('最严重周期',summary.worst ? summary.worst.trial.sampleId + ' · 额外 ' + summary.worst.value + ' 次' :
        summary.denominator > summary.unknown ? '未见额外提醒' : '待有效观测')
    ]);
  }

  function measureResult(run) {
    const { manifest, report } = run, rule = R.getRule(manifest.measure), items = report.items;
    const counts = {};
    for (const item of items) counts[item.status] = (counts[item.status] || 0) + 1;
    const total = items.reduce((n, item) => n + (Number.isFinite(item.value) ? item.value : 0), 0);
    const ratio = value => metricRatio(value,items.length);
    const program = manifest.program;
    let result;
    if (report.summary) {
      result = v2Result(manifest.measure,report.summary,items.length);
    } else if (manifest.measure === 'latency') {
      const phases = ['采图 → 卡片实际可见','确认点击 → 独立终态生效'].map((label,i)=>[
        label,...R.percentiles(items,i).map(h)]);
      if (program) phases.push(['用户停留 · 卡片可见 → 点击',...R.percentiles(items.map(item=>({value:[item.dwell]})),0).map(h)]);
      result = table(['阶段','有效测点','p50 ms','p95 ms','p99 ms','最大值 ms'],phases) +
        (program ? '<p class="me-hint">每段只用有效成对测点，按最近秩取分位数。用户停留单列。</p>' : '');
    } else if (manifest.measure === 'repeat') {
      result = kv([pair('额外提醒总次数', String(total)),
        pair('违规周期', ratio(items.filter(item => item.value > 0).length)),
        pair('最严重周期额外次数', String(Math.max(0, ...items.map(item => item.value || 0))))]);
    } else {
      const label = manifest.measure === 'miss' ? '已证实漏提醒 / 登记场景' :
        manifest.measure === 'false-alert' ? '已证实误提醒 / 登记场景' : '成功或符合预期 / 登记试次';
      result = kv([pair(label, ratio(total))]);
    }
    const unavailable = !program && manifest.measure === 'latency' ? items.filter(item => !item.value || item.value.some(value => value === null)).length : report.unknown;
    const availability = report.summary && ['actuation','repeat'].includes(manifest.measure) ? [] :
      [pair('完整可判定 / 登记试次',(items.length - unavailable) + ' / ' + items.length)];
    const trace = program ? `<div class="ae-rule">${kv([
      ...(manifest.caseVersion ? [pair('固定用例 / 试评版本',manifest.caseRef + ' · ' + manifest.caseVersion),
        pair('被测对象版本',manifest.objectVersion),pair('适配器 / 执行器',manifest.profile.adapterVersion + ' / ' + manifest.profile.executorVersion)] : []),
      pair('冻结的样本清单',manifest.dataRef),pair('独立金标版本',manifest.goldRef),pair('冻结的指标版本',manifest.metricRef),
      pair('计算器 / 观测结构',program.implementation + ' · ' + program.schema),
      pair('用例采证时段',manifest.window.ms === null ? manifest.window.label : manifest.window.ms + ' ms'),
      ...availability
    ])}</div>` : '';
    return `<div class="me-detail" role="region" aria-label="${h(manifest.caseId)} 本地试评结果">
      <h3>${h(manifest.caseId)} · ${h(rule.title)} ${badge('本地观测', 'warn')}</h3>
      <p class="me-hint">${h(manifest.id)} · ${h(report.body.externalRunId)} · ${M.environments[manifest.environment]}</p>` +
      stats(stat(items.length, '计划试次'), stat(counts.FAILED || 0, '执行失败'), stat(counts.TIMED_OUT || 0, '执行超时'),
    stat(unavailable, '证据或阶段缺失')) + result + trace +
      `<details><summary>查看逐试次结果与证据</summary>${table(['试次', '切片与独立参考', '执行状态', '观测判定', '说明及证据'], items.map(item => [
        h(item.trial.id), h(item.trial.slice) + (item.trial.goldLabel ? `<small class="ae-calculation">${h(item.trial.goldLabel)}</small>` : ''), h(item.status),
        h(observation(manifest.measure,item)),
        h([item.reason, item.artifact].filter(Boolean).join(' · ') || '等待回传') +
          (item.calculation ? `<small class="ae-calculation">${h(item.calculation)}</small>` : '')
      ]))}</details>
      <p class="me-hint">按夹具计算观测值。缺证据的登记试次仍留在计划内。正式结论待真实执行与门槛确认。</p></div>`;
  }

  function observation(measure,item) {
    if (item.status === 'MISSING') return '待回传';
    if (item.eligible === false) return measure === 'repeat' ? '口径冲突待裁决' : '未进入有效点击分母';
    if (item.value === null) return '未知';
    if (Array.isArray(item.value)) return item.value.map(value => value === null ? '未知' : value + ' ms').join(' / ');
    const labels = {miss:['按时提醒','漏提醒'],'false-alert':['未误提醒','误提醒'],
      actuation:['未全部到位','全部到位'],recovery:['恢复不符合','已恢复']};
    return labels[measure]?.[item.value] ?? (measure === 'repeat' ? item.value + ' 次' : item.value);
  }

  function handoff(task) {
    const plan = task.suitePlan, manifest = plan.manifest;
    const profile = selectedProfile('cloud', plan.profileRefs.cloud);
    const agent = A.rows(plan);
    const check = rippleCheck(task,profile);
    const bench = selectedProfile('bench',plan.profileRefs.bench);
    const responsibilities = agent.length ? panel('平台发起，外部执行，平台接收', `<div class="ae-route">
      <div><strong>1 平台发起</strong><span>锁定用例、对象和执行组合，生成各环境派工。</span></div>
      <div><strong>2 外部执行</strong><span>台架采集 E01–E06，Ripple 跑云端功能脚本。</span></div>
      <div><strong>3 平台接收</strong><span>按清单与试次对账，用冻结规则计算。</span></div>
      </div>`, button('返回执行准备','stage','dependencies','ghost')) +
      AE.benchHandoff(task,bench,check.objectVersion) : '';
    return responsibilities +
      panel(agent.length ? 'Ripple 执行 · 云端功能验证' : 'Ripple 文件交接', manifest ? kv([
        pair('冻结清单', manifest.id), pair('子计划', manifest.childPlanId), pair('固定用例版本', manifest.trials[0].caseRef),
        pair('被测对象版本', manifest.objectVersion.id),pair('冻结规则',manifest.scoring?.ruleRef || '历史派工规则'),
        pair('试次键', manifest.trials[0].id), pair('脚本', manifest.dependencies.script.name + ' · SHA-256 ' + shaLabel(manifest.dependencies.script.sha256)),
        pair('适配器 / 执行器', manifest.profile.adapterVersion + ' / ' + manifest.profile.executorVersion)
      ]) + `<div class="pz-actions me-actions">${button(agent.length ? '下载 Ripple 派工 JSON' : '下载派工 JSON', 'download-manifest', '', 'primary')}
        ${agent.length ? AE.externalLink() : button('下载联调回传样例', 'download-sample', '', 'ghost')}</div>
        <p class="me-hint">Ripple 使用对应脚本运行，回传清单、环境、试次、脚本摘要与证据。当前支持文件交接演练。</p>` :
        notice(check.ok ? 'Ripple 运行前检查通过。可冻结一条云端功能试次。' : 'Ripple 运行前检查未通过。请' + h(check.errors.join('；')) + '。',check.ok ? '' : 'warn') +
        kv([pair('固定用例版本',check.unit ? check.unit.caseId + ' · ' + check.unit.caseRef : '待纳入计划'),
          pair('被测对象版本',check.objectVersion?.id || '待选择'),pair('计算规则',check.ruleRef),
          pair('适配器 / 执行器',profile ? profile.adapterVersion + ' / ' + profile.executorVersion : '待配置'),
          pair('脚本',plan.pilot?.script ? plan.pilot.script.name + ' · SHA-256 ' + shaLabel(plan.pilot.script.sha256) : '待绑定')]) +
        `<div class="me-actions">${button(agent.length ? '发起 Ripple 派工' : '冻结云端试跑派工', 'freeze', '', 'primary', !check.ok)}${button('补齐依赖', 'stage', 'dependencies', 'ghost')}</div>`) +
      (manifest ? panel('接收逐试次结果', fileInput('上传 Ripple 联调回传 JSON', 'result', '.json,application/json') +
        (resultError ? notice(h(resultError),'bad') : '') +
        (pendingResult ? kv([pair('Ripple 运行 ID', pendingResult.externalRunId), pair('已对应试次', String(pendingResult.items.length)),
          pair('平台试判', pendingResult.items.map(item => item.verdict).join('、'))]) +
          button('确认接收并查看报告', 'accept-result', '', 'primary') : '') +
        (plan.report ? button('查看已接收报告', 'stage', 'report', 'ghost') : '')) : '');
  }

  function reportPage(task) {
    const { suitePlan: plan } = task;
    const got = plan.report?.items.length || 0;
    const passed = plan.report?.items.filter(item => item.verdict === 'PASS').length || 0;
    const envs = M.coverage(plan);
    const measurements = measureReports(plan);
    const benchCases = A.reports(plan.agentReview?.run).filter(row => row.received).length;
    return stats(stat(plan.units.length, '环境适用项'), stat(got + measurements.length + benchCases, '已收本地环境项'), stat(passed, 'Ripple 本地断言通过'), stat('INCONCLUSIVE', '正式评测结论')) +
      panel('分环境覆盖', table(['环境', '适用项', '联调回传', '待正式验证'], envs.map(env => [
        M.environments[env.environment], h(env.count), h((env.environment === plan.manifest?.environment ? got : 0) +
          measurements.filter(run => run.manifest.environment === env.environment).length + (env.environment === 'bench' ? benchCases : 0)), h(env.count)
      ])) + notice('联调记录用于核对交接和证据判定。全量正式结论继续等待各环境有效证据。', 'warn')) +
      AE.report(task,measureResult) +
      (measurements.length ? panel('Agent 指标和专项观测', measurements.map(measureResult).join('')) : '') +
      (plan.report ? panel('Ripple 回传与平台判定', kv([pair('Ripple 运行 ID', plan.report.externalRunId), pair('冻结清单', plan.manifest.id),
        pair('来源', '本地联调样例'), pair('环境', M.environments[plan.manifest.environment]),
        pair('被测对象版本', plan.manifest.objectVersion.id), pair('冻结规则',plan.manifest.scoring?.ruleRef || '历史派工规则'),
        pair('脚本',plan.manifest.dependencies.script.name + ' · SHA-256 ' + shaLabel(plan.manifest.dependencies.script.sha256)),
        pair('适配器 / 执行器',plan.manifest.profile.adapterVersion + ' / ' + plan.manifest.profile.executorVersion)]) +
        plan.report.items.map(item => `<div class="me-detail"><h3>${h(item.trial.caseId)} · ${badge(item.verdict, item.verdict === 'PASS' ? 'good' : 'warn')}</h3>
          <p class="me-hint">固定用例 ${h(item.trial.caseRef)} · 试次 ${h(item.trial.id)} · 外部执行 ${h(item.execution)} · Ripple 原始结论 ${h(item.rippleResult || '未提供')}</p>` +
          kv([pair('平台通过 / 冻结断言',item.assertions.filter(row=>row.verdict === 'PASS').length + ' / ' + item.assertions.length)]) +
          table(['平台断言', '判定', '证据记录', '观察值'], item.assertions.map(row => [h(row.label), badge(row.verdict, row.verdict === 'PASS' ? 'good' : 'warn'),
            h(row.evidence?.artifact || '缺失'), `<code>${h(row.evidence ? JSON.stringify(row.evidence.fact) : '—')}</code>`])) + '</div>').join('') +
        `<details><summary>查看接收的原始 JSON</summary><pre>${h(JSON.stringify(plan.report.body, null, 2))}</pre></details>`) :
        panel('Ripple 回传', notice('等待已冻结清单对应的回传文件。'), button('去交接', 'stage', 'handoff', 'primary')));
  }

  function download(body, name) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function scriptInfo(file) {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    if (!/^name:\s*["']?A8-02-02-P\b/m.test(text) || !/^protocol:\s*brain_kernel\s*$/m.test(text)) {
      throw Error('请选择 A8-02-02-P 的 brain_kernel Ripple YAML。');
    }
    const number = key => {
      const values = [...new Set(Array.from(text.matchAll(new RegExp('^\\s*' + key + ':\\s*(-?\\d+(?:\\.\\d+)?)\\s*$', 'gm')), match => Number(match[1])))];
      if (values.length !== 1) throw Error('脚本中缺少唯一的 ' + key + ' 值。');
      return values[0];
    };
    const oms = number('pet_presence_detection');
    if (oms !== 1) throw Error('关门联调脚本需使用当次有宠 OMS。');
    return { name: file.name, sha256: await digest(buffer), cabin: number('cabin_temperature'), outside: number('hvac_out_temperature'), oms };
  }

  document.addEventListener('click', event => {
    const el = event.target.closest('[data-me]');
    if (!el || el.disabled) return;
    const { me: action, value } = el.dataset;
    const task = activeTask(), plan = task?.suitePlan;
    flash = null;
    try {
      switch (action) {
        case 'import': goTo('flow-import'); return;
        case 'general-import': S.assetType = 'case'; goTo('import'); return;
        case 'case-library': S.assetType = 'case'; S.assetGroup = 1; goTo('assets'); return;
        case 'preview': inspectImport(); break;
        case 'save-import': requireEdit(); saveImport(); return;
        case 'task-list': goTo('tasks'); return;
        case 'create-plan': requireEdit(); if(window.NavigationUI&&!NavigationUI.isExample()){goTo('environment-plans');return;}createPlan(value); return;
        case 'create-agent-plan': requireEdit(); if(window.NavigationUI&&!NavigationUI.isExample()){NavigationUI.createEnvironment(value,'measure');return;}createPlan(value,'measure'); return;
        case 'stage': plan.stage = value; paint(); window.scrollTo(0, 0); return;
        case 'environment': filter = { ...filter, environment: value, page: 0, detail: '' }; break;
        case 'clear-search': filter = { ...filter, q: '', purpose: '', page: 0, detail: '' }; break;
        case 'page': filter.page += Number(value); filter.detail = ''; break;
        case 'unit-detail': filter.detail = filter.detail === value ? '' : value; break;
        case 'view-case': FlowUI.openCase(value,task.id); return;
        case 'measure-case': measureKey = value; plan.stage = A.rows(plan).length ? 'auxiliary' : 'measure'; paint(); window.scrollTo(0, 0); return;
        case 'agent-case': plan.stage = 'measure'; AE.selectCase(task,value); paint(); window.scrollTo(0, 0); return;
        case 'measure-manifest': {
          const { manifest } = plan.measureRuns[measureKey];
          download(manifest, manifest.id + '-本地试评清单.json');
          return;
        }
        case 'measure-sample': {
          const { manifest } = plan.measureRuns[measureKey];
          download(R.sample(manifest), manifest.id + '-本地回传夹具.json');
          return;
        }
        case 'profile': profileTask = S.route === 'task-prep' ? task.id : null; profileEnvironment = value; profileSelection=undefined;profileDirectory=false;goTo('flow-env-profiles'); return;
        case 'profile-env': profileEnvironment = value;if(profileDirectory)profileSelection=null;break;
        case 'profile-return': if (profileTask) P.openTask(profileTask); else goTo(profileDirectory?'connection-profiles':'capabilities'); return;
        case 'freeze': {
          requireEdit();
          const profile = selectedProfile('cloud',plan.profileRefs.cloud);
          const check = rippleCheck(task,profile);
          if (!check.ok) throw Error(check.errors.join('；'));
          const id = 'ME-' + crypto.randomUUID().slice(0, 8).toUpperCase();
          plan.manifest = M.makeManifest(task, profile, check.objectVersion, id);
          good('已冻结云端试跑的 1 个试次。'); return;
        }
        case 'download-manifest': download(plan.manifest, plan.manifest.id + '-Ripple派工.json'); return;
        case 'download-sample': download(M.sampleRipple(plan.manifest), plan.manifest.id + '-Ripple联调回传样例.json'); return;
        case 'accept-result':
          requireEdit();
          if (!pendingResult) throw Error('请先核对回传文件。');
          {
            const saved = M.saveResult(plan, pendingResult.body);
            pendingResult = null;
            plan.stage = 'report';
            good(saved ? '已接收 Ripple 回传并按冻结规则完成本地判定。' : '同一回传已接收，覆盖计数保持原值。');
          }
          window.scrollTo(0, 0); return;
      }
      paint();
    } catch (err) { error(err.message); }
  });

  function requireEdit() {
    if (!canEdit()) throw Error('请使用评测工程师或接入维护角色。');
  }

  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-me-form]');
    if (!form) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const task = activeTask();
    try {
      if (form.dataset.meForm === 'search') {
        filter = { ...filter, q: data.query.trim(), page: 0, detail: '' };
        paint(); return;
      }
      requireEdit();
      if (form.dataset.meForm === 'profile') {
        const saved = Object.fromEntries(Object.keys(defaults[profileEnvironment]).map(key => [key, String(data[key] || '').trim()]));
        if (Object.values(saved).some(value => !value)) throw Error('请补齐组合必填字段。');
        if (!/^(cred-ref|auth-ref):[\w./-]+$/.test(saved.identity)) throw Error('请填写 cred-ref 或 auth-ref 引用。');
        const version = (latestProfile(profileEnvironment)?.version || 0) + 1;
        const profile = { ...saved, environment: profileEnvironment, version, id: profileEnvironment + '@' + version, ...(window.NavigationUI?.exampleOrigin()?{exampleOrigin:NavigationUI.exampleOrigin()}:{}) };
        const target = C.task(P.state(), profileTask);
        if (target?.suitePlan?.manifest) throw Error('该任务已冻结，请为新任务选择新组合。');
        app().profiles.push(profile);
        if (target?.suitePlan) {
          target.suitePlan.profileRefs[profile.environment] = profile.id;
          flash = { message: `已应用 ${profile.name} v${profile.version}。`, kind: 'good' };
          P.openTask(target.id);
        } else { profileSelection=profile.id;good('已保存组合版本，可以在新计划中引用。'); }
        return;
      }
      const plan = task.suitePlan;
      if (form.dataset.meForm === 'measure') {
        const unit = measureUnit(plan);
        if (!unit) throw Error('请先选择要试评的用例和环境。');
        plan.measureRuns ??= {};
        if (plan.measureRuns[unit.key]) throw Error('此环境项已保存本地试评。');
        const item = plan.suite.cases.find(row => row.id === unit.caseId).content;
        const profile = selectedProfile(unit.environment, plan.profileRefs[unit.environment]);
        const id = 'MR-' + crypto.randomUUID().slice(0, 8).toUpperCase();
        plan.measureRuns[unit.key] = { manifest: R.freeze(task, unit, item, profile, data, id) };
        good('已冻结样本清单、独立参考和规则。请接收逐试次观测。'); return;
      }
      if (plan.manifest) throw Error('本次派工已经冻结。');
      const script = pendingScript || plan.pilot?.script;
      if (!script) throw Error('请先绑定已有 Ripple YAML。');
      if (!data.name.trim() || !data.reference.trim()) throw Error('请填写数据包和评分参考。');
      plan.pilot = {
        name: data.name.trim(), reference: data.reference.trim(), script,
        caseRef: plan.units.find(unit => unit.caseId === M.defaultCaseId && unit.environment === 'cloud').caseRef
      };
      pendingScript = null;
      dependencyDraft = {};
      good('已保存本条云端用例的试跑依赖。');
    } catch (err) { error(err.message); }
  });

  document.addEventListener('input', event => {
    const input = event.target;
    if (input.closest('[data-me-form="dependencies"]') && ['name', 'reference'].includes(input.name)) {
      dependencyDraft[input.name] = input.value;
    }
  });

  document.addEventListener('change', async event => {
    const el = event.target, task = activeTask(), plan = task?.suitePlan;
    if (!el.dataset.meChange && !el.dataset.meFile) return;
    flash = null;
    if (el.dataset.meFile === 'result') {pendingResult = null; resultError = '';}
    try {
      switch (el.dataset.meChange) {
        case 'sheet': setSheet(el.value); paint(); return;
        case 'header': setHeader(Number(el.value)); paint(); return;
        case 'mapping': upload.mapping[el.name] = Number(el.value); importResult = null; paint(); return;
        case 'purpose-filter': filter = { ...filter, purpose: el.value, page: 0, detail: '' }; paint(); return;
        case 'measure-unit': measureKey = el.value; paint(); return;
        case 'version': requireEdit(); if (!plan.manifest && !plan.agentReview?.run) task.versionId = el.value; paint(); return;
        case 'profile-ref': requireEdit(); if (!plan.manifest) plan.profileRefs[el.dataset.env] = el.value; paint(); return;
      }
      const file = el.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) throw Error('文件大于本地原型的 2 MB 上限。');
      switch (el.dataset.meFile) {
        case 'measure-result': {
          requireEdit();
          const key = measureKey;
          const run = plan.measureRuns[key];
          const body = JSON.parse(await file.text());
          if (activeTask()?.id !== task.id || measureKey !== key) return;
          const saved = R.persist(run, body);
          good(saved ? '已接收逐试次观测并完成本地计算。' : '本批观测已接收，试次和分母保持不变。');
          return;
        }
        case 'workbook':
          loading = true;
          upload = null;
          importResult = null;
          paint();
          try { await readWorkbook(file); } finally { loading = false; }
          paint(); return;
        case 'script':
          requireEdit();
          pendingScript = null;
          {
            const script = await scriptInfo(file);
            if (activeTask()?.id !== task.id || plan.manifest) return;
            pendingScript = script;
          }
          good('脚本已读取，请保存试跑依赖。'); return;
        case 'result':
          requireEdit();
          {
            const result = M.validateResult(JSON.parse(await file.text()), plan.manifest);
            if (activeTask()?.id !== task.id) return;
            pendingResult = result;
          }
          good('回传文件已匹配冻结清单，请核对后接收。'); return;
      }
    } catch (err) {
      if (el.dataset.meFile === 'result') {
        if (activeTask()?.id === task?.id) {resultError=err.message;paint();}
        return;
      }
      error(err.message);
    }
  });

  Object.assign(pages, { 'flow-env-profiles': profilePage });
  seedConnections();
  AE.wire({activeTask,requireEdit,paint,good,error,download,selectedProfile,profiles:() => app().profiles,
    stage(value){activeTask().suitePlan.stage = value; paint(); window.scrollTo(0,0);}});
  window.MultiEnvUI = { importPage, taskPage, assetEntry, caseMeta, planButton: () => button('多环境计划', 'create-plan'),
    createPlanFor(sourceId,objectId,stage='coverage'){requireEdit();createPlan(sourceId,stage,objectId);},
    openProfile(id,environment='cloud'){requireEdit();profileTask=null;profileDirectory=true;profileSelection=id;
      profileEnvironment=id?app().profiles.find(p=>p.id===id)?.environment:environment;goTo('flow-env-profiles');},
    openExampleProfile(){profileTask=null;profileDirectory=false;profileSelection=undefined;profileEnvironment='cloud';goTo('flow-env-profiles');},
    profileButton: () => button('分环境接入组合', 'profile', 'cloud', 'ghost') };
  P.paint();
})();
