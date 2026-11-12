/* Workbook import, environment expansion and local Ripple result validation. */
(function (root) {
  'use strict';

  const environments = { cloud: '云端模拟', bench: '台架模拟', vehicle: '实车' };
  const envKeys = { 云端模拟: 'cloud', 云端: 'cloud', 台架模拟: 'bench', 台架: 'bench', 实车: 'vehicle' };
  const purposes = ['功能案例', '性能案例', '技术专项', 'Agent 评测'];
  const fields = {
    id: ['用例编号', '测试用例编号', '测试案例编号', '案例编号'],
    title: ['标题摘要 F列', '用例名称', '案例标题', '测试案例', '测试用例', '测试案例名称', '标题', '名称', '测试项'],
    priority: ['优先级 G列', '优先级'],
    environment: ['测试环境 I列', '测试环境', '适用环境'],
    kind: ['案例类型 H列', '案例类型', '用例类型'],
    original: ['原表行'],
    group: ['测试组', '功能模块', '模块'],
    precondition: ['前置条件', '测试前置条件'],
    steps: ['测试步骤', '操作步骤'],
    expected: ['预期结果', '预期'],
    notes: ['原表差异与备注', '备注'],
    purpose: ['测试目的', '一级分类'],
    definitionSource: ['定义来源'],
    measure: ['试评模板']
  };
  const requiredFields = ['id', 'title', 'priority', 'environment'];
  const defaultCaseId = 'A8-02-02-P';
  const resultSchema = 'baic.prototype.ripple-result/v1';
  const handoffSchema = 'baic.prototype.ripple-handoff/v1';
  const clean = value => String(value ?? '').trim();
  const revision = object => JSON.stringify(object);
  const copy = object => JSON.parse(JSON.stringify(object));

  function autoMap(values) {
    return Object.fromEntries(Object.entries(fields).map(([key, names]) => [key, values.findIndex(value => names.includes(clean(value)))]));
  }

  function findHeader(rows) {
    return rows.find(row => requiredFields.every(key => autoMap(row.values)[key] >= 0))?.number ?? rows[0]?.number ?? 1;
  }

  function parseEnvironments(value) {
    const tokens = clean(value).split(/[\/、，,;；|\s]+/).filter(Boolean);
    if (!tokens.length || tokens.some(token => !Object.hasOwn(envKeys, token))) return [];
    return [...new Set(tokens.map(token => envKeys[token]))];
  }

  function preview(rows, header, mapping) {
    const headerCells = rows.find(row => row.number === header)?.values || [];
    const typeColumns = headerCells.flatMap((label, index) => ['asset_type', '资产类型'].includes(clean(label).toLowerCase()) ? [index] : []);
    const columns = Object.values(mapping).filter(index => Number.isInteger(index) && index >= 0);
    if (requiredFields.some(key => !(mapping[key] >= 0) || !clean(headerCells[mapping[key]]))) {
      throw Error('请映射用例编号、名称、优先级和适用环境。');
    }
    if (new Set(columns).size !== columns.length) throw Error('每个导入字段应对应不同的列。');
    if (columns.some(index => typeColumns.includes(index))) throw Error('资产类型列用于核对导入类型。');

    const candidates = [], errors = [], ids = new Set();
    for (const row of rows.filter(row => row.number > header)) {
      const value = field => clean(row.values[mapping[field]]);
      if (!requiredFields.some(field => value(field)) && !row.formulas.some(index => columns.includes(index))) continue;
      const id = value('id'), title = value('title'), priority = value('priority').toUpperCase();
      const envs = parseEnvironments(value('environment'));
      const supplied = { precondition: value('precondition'), steps: value('steps'), expected: value('expected') };
      const original = value('original') ? Number(value('original')) : row.number;
      const definitionSource = value('definitionSource');
      const purpose = purposeFor(value('purpose'));
      const reasons = [];
      if (row.formulas.some(index => columns.includes(index) || typeColumns.includes(index))) reasons.push('映射列含公式，请提供确认后的值');
      if (typeColumns.some(index => !['case', '评测用例'].includes(clean(row.values[index]).toLowerCase()))) reasons.push('资产类型应为 case（评测用例）');
      if (!id || !title) reasons.push('缺用例编号或名称');
      if (id && ids.has(id)) reasons.push('用例编号重复');
      if (id) ids.add(id);
      if (!['P0', 'P1', 'P2'].includes(priority)) reasons.push('优先级须为 P0、P1 或 P2');
      if (!envs.length) reasons.push('环境标签为空或无法识别');
      if (!Number.isInteger(original) || original < 1) reasons.push('原表行应为正整数');
      if (reasons.length) {
        errors.push({ row: row.number, id, reasons });
        continue;
      }
      const notes = value('notes');
      const titlePriority = title.match(/\bP[012]\b/i)?.[0]?.toUpperCase();
      const priorityConflict = Boolean((titlePriority && titlePriority !== priority) || /标题.*P[012].*(G\s*列|优先级)/i.test(notes));
      candidates.push({
        id, title, priority, envs, original, workbookRow: row.number,
        kind: value('kind'), group: value('group'), notes, priorityConflict,
        purpose, measure: value('measure'), definitionSource,
        definition: supplied, definitionComplete: (!definitionSource || definitionSource === '原文') && Object.values(supplied).every(Boolean)
      });
    }
    return { candidates, errors };
  }

  function purposeFor(value) {
    if (purposes.includes(value)) return value;
    if (value.startsWith('功能测试')) return '功能案例';
    if (value.startsWith('技术设计专项')) return '技术专项';
    if (value.includes('性能稳定性')) return '性能案例';
    if (value === 'Agent评测') return 'Agent 评测';
    return '';
  }

  function readDispatch(rows) {
    const names = ['用例编号', '测试环境', '建议派工', '本层要验与取证', '适配器与执行方', '执行前核对'];
    const header = rows.find(row => names.every(name => row.values.includes(name)));
    if (!header) return {};
    const columns = names.map(name => header.values.indexOf(name));
    const result = Object.create(null);
    for (const row of rows.filter(row => row.number > header.number)) {
      if (row.formulas.some(index => columns.includes(index))) continue;
      const [id, environment, method, evidence, owner, needs] = columns.map(index => clean(row.values[index]));
      const env = envKeys[environment];
      if (id && Object.hasOwn(environments, env)) result[unitKey(id, env)] = { method, evidence, owner, needs };
    }
    return result;
  }

  function classify(candidates, previous, dispatch) {
    const byId = new Map((previous?.cases || []).map(item => [item.id, item]));
    return candidates.map(candidate => {
      const routes = Object.fromEntries(candidate.envs.map(env => [env, dispatch[unitKey(candidate.id, env)] ?? null]));
      const current = { ...candidate, routes };
      const old = byId.get(current.id);
      const state = !old ? 'new' : revision(old.content) === revision(current) ? 'unchanged' : 'changed';
      return { content: current, old, state };
    });
  }

  function unitKey(caseId, environment) {
    return caseId + '/' + environment;
  }

  function createPlan(suite, taskId) {
    const units = suite.cases.flatMap(item => item.content.envs.map(environment => ({
      key: unitKey(item.id, environment),
      caseId: item.id,
      caseRef: item.ref,
      environment,
      priority: item.content.priority,
      route: item.content.routes[environment]
    })));
    return {
      suite: copy(suite),
      units,
      childIds: Object.fromEntries(Object.keys(environments).map(environment => [environment, taskId + '-' + environment.toUpperCase()])),
      profileRefs: {},
      stage: 'coverage',
      pilot: null,
      manifest: null,
      report: null
    };
  }

  function coverage(plan) {
    return Object.keys(environments).map(environment => {
      const units = plan.units.filter(unit => unit.environment === environment);
      const count = units.length;
      const p0 = units.filter(unit => unit.priority === 'P0').length;
      return { environment, count, p0 };
    });
  }

  const rippleRuleRef = 'a84-door-session-checks@1';
  const checks = [
    { code: 'door-session', label: '全关已处理并进入等待 OMS', expected: {processed:true, waitingForOms:true, lastDoors:'0:0:0:0:0'} },
    { code: 'oms-card', label: '当次有宠 OMS 后只产生一张关联推荐卡', expected: {oms:1, cardCount:1, sameSession:true, surfaceId:'pet_travel_recommend'} },
    { code: 'ac-request', label: '完整观察窗内未确认且控车请求为零', expected: {requestCount:0}, context: {fullWindow:true, confirmed:false} }
  ];

  function ripplePreflight(task, profile, objectVersion) {
    const plan = task.suitePlan, pilot = plan.pilot;
    const unit = plan.units.find(item => item.caseId === defaultCaseId && item.environment === 'cloud');
    const errors = [];
    if (!objectVersion || objectVersion.id !== task.versionId) errors.push('选择被测对象的固定版本');
    if (!unit) errors.push('计划中缺少 A8-02-02-P 的云端项');
    if (!pilot?.script?.sha256 || pilot.caseRef !== unit?.caseRef) errors.push('保存所选用例版本的 Ripple YAML 与试跑依赖');
    if (!profile || profile.environment !== 'cloud' || !profile.adapterVersion || !profile.executorVersion) errors.push('绑定云端适配器和执行器版本');
    return {ok: !errors.length, errors, unit, ruleRef: rippleRuleRef};
  }

  function makeManifest(task, profile, objectVersion, id) {
    const { suitePlan: plan } = task;
    const {ok, errors, unit, ruleRef} = ripplePreflight(task, profile, objectVersion);
    if (!ok) throw Error(errors.join('；'));
    if (plan.manifest) throw Error('本次派工已经冻结。');
    return copy({
      schema: handoffSchema,
      contractVersion: 2,
      id,
      scope: 'local-rehearsal',
      taskId: task.id,
      childPlanId: plan.childIds?.cloud || task.id + '-CLOUD',
      environment: unit.environment,
      suite: { name: plan.suite.name, revision: plan.suite.revision, sha256: plan.suite.source.sha256 },
      objectVersion,
      profile,
      dependencies: plan.pilot,
      scoring: {ruleRef, checks},
      trials: [{ id: id + '/01', caseId: unit.caseId, caseRef: unit.caseRef, parameterGroup: 'default', repetition: 1 }]
    });
  }

  function checkEvidence(check, evidence) {
    if (!evidence) return 'UNKNOWN';
    const fact = evidence.fact, expected = Object.entries(check.expected);
    if (!Object.entries(check.context||{}).every(([field, value]) => fact[field] === value) ||
        expected.some(([field, value]) => typeof value === 'number' ? !Number.isInteger(fact[field]) : typeof fact[field] !== typeof value)) return 'UNKNOWN';
    return expected.every(([field, value]) => fact[field] === value) ? 'PASS' : 'FAIL';
  }

  function validateResult(body, manifest) {
    if (body?.schema !== resultSchema || body.source !== 'ripple' || body.scope !== 'local-rehearsal') {
      throw Error('请选择按本次派工生成的 Ripple 联调回传 JSON。');
    }
    if (!manifest || body.manifestId !== manifest.id || body.environment !== manifest.environment ||
        body.scriptSha256 !== manifest.dependencies.script.sha256) throw Error('回传的清单编号、环境或脚本摘要与冻结记录不一致。');
    if (manifest.contractVersion >= 2) {
      const expected = [['childPlanId','子计划',manifest.childPlanId],['objectVersion','被测对象版本',manifest.objectVersion.id],
        ['adapterVersion','适配器版本',manifest.profile.adapterVersion],['executorVersion','执行器版本',manifest.profile.executorVersion],
        ['ruleRef','规则版本',manifest.scoring.ruleRef]];
      const mismatches = expected.filter(([field,,value])=>body[field]!==value);
      if (mismatches.length) throw Error('回传与冻结清单不一致：' + mismatches.map(([,label,value])=>label+'应为 '+value).join('；') + '。');
    }
    if (typeof body.externalRunId !== 'string' || !body.externalRunId.trim() || !Array.isArray(body.results) || !body.results.length) {
      throw Error('回传必须包含 Ripple 运行 ID 和逐试次记录。');
    }
    const rules = manifest.scoring?.checks || checks;
    const seen = new Set();
    const items = body.results.map(item => {
      const trial = manifest.trials.find(entry => entry.id === item?.trialId && entry.caseId === item.caseId && entry.caseRef === item.caseRef);
      if (!trial || seen.has(trial.id)) throw Error('回传试次重复或无法对应本次派工。');
      seen.add(trial.id);
      if (!['SUCCEEDED', 'FAILED', 'TIMED_OUT'].includes(item.execution) || !Array.isArray(item.evidence)) {
        throw Error('试次须包含执行状态和证据列表。');
      }
      const codes = new Set();
      for (const evidence of item.evidence) {
        if (!rules.some(check => check.code === evidence?.code) || codes.has(evidence.code) ||
            typeof evidence.artifact !== 'string' || !evidence.artifact.trim() ||
            !evidence.fact || typeof evidence.fact !== 'object' || Array.isArray(evidence.fact)) {
          throw Error('证据类型重复或缺少原始记录标识与事实。');
        }
        codes.add(evidence.code);
      }
      const assertions = rules.map(check => {
        const evidence = item.evidence.find(entry => entry.code === check.code);
        const verdict = checkEvidence(check, evidence);
        return { label: check.label, evidence, verdict };
      });
      const verdict = assertions.some(assertion => assertion.verdict === 'FAIL') ? 'FAIL' :
        item.execution === 'SUCCEEDED' && assertions.every(assertion => assertion.verdict === 'PASS') ? 'PASS' : 'UNKNOWN';
      return { trial, execution: item.execution, rippleResult: clean(item.rippleResult), verdict, assertions };
    });
    return { externalRunId: body.externalRunId, body: copy(body), items };
  }

  function saveResult(plan, body) {
    const result = validateResult(body, plan.manifest);
    if (plan.report) {
      if (revision(plan.report.body) === revision(result.body)) return false;
      throw Error('本次派工已有冻结的回传记录。请为复测另建派工。');
    }
    plan.report = result;
    return true;
  }

  function sampleRipple(manifest) {
    const trial = manifest.trials[0];
    return {
      schema: resultSchema, source: 'ripple', scope: 'local-rehearsal',
      manifestId: manifest.id, environment: manifest.environment, scriptSha256: manifest.dependencies.script.sha256,
      childPlanId: manifest.childPlanId, objectVersion: manifest.objectVersion.id,
      adapterVersion: manifest.profile.adapterVersion, executorVersion: manifest.profile.executorVersion,
      ruleRef: manifest.scoring?.ruleRef || rippleRuleRef,
      externalRunId: 'RIPPLE-LOCAL-' + manifest.id,
      results: [{ trialId: trial.id, caseId: trial.caseId, caseRef: trial.caseRef, execution: 'SUCCEEDED', rippleResult: 'PASS',
        evidence: [
          { code: 'door-session', artifact: 'fixture/01-door-session.json', fact: { processed: true, waitingForOms: true, lastDoors: '0:0:0:0:0' } },
          { code: 'oms-card', artifact: 'fixture/02-a2ui.json', fact: { oms: 1, cardCount: 1, sameSession: true, surfaceId: 'pet_travel_recommend' } },
          { code: 'ac-request', artifact: 'fixture/03-action-window.json', fact: { fullWindow: true, confirmed: false, requestCount: 0 } }
        ] }]
    };
  }

  const api = { environments, purposes, fields, requiredFields, defaultCaseId, resultSchema, rippleRuleRef, autoMap, findHeader, preview, readDispatch, classify, createPlan, coverage, ripplePreflight, makeManifest, validateResult, saveResult, sampleRipple };
  root.MultiEnvCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
