/* Agent assessment assets, versioned definitions and local bench handoff. */
(() => {
  'use strict';

  const R = MeasureRehearsal, M = A84MetricEngine, V2 = A84V2Fixtures;
  const copy = value => JSON.parse(JSON.stringify(value));
  const clean = value => String(value ?? '').trim();
  function ordered(value) {
    if (Array.isArray(value)) return value.map(ordered);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key,ordered(value[key])]));
  }
  const same = (left, right) => JSON.stringify(ordered(left)) === JSON.stringify(ordered(right));
  const sourceUrl = 'https://baic.feishu.cn/sheets/ZivOs3xeDhmTSvt5Fp8clEIXnGg?sheet=90f811';
  const scope = 'DEMO_REPLAY_ONLY';
  const benchSchema = 'baic.prototype.bench-handoff/v1';
  const resultSchema = 'baic.prototype.bench-result/v1';
  const definitions = {
    miss: { data: 'PET-CLIPS', reference: 'REMIND', prefix: 'PET', kind: 'milliseconds', ms: 5000,
      window: '当次采图 → 卡片可见或观察到期', needs: ['oms', 'hmi'] },
    'false-alert': { data: 'NEGATIVE', reference: 'SILENT', prefix: 'NEG', kind: 'milliseconds', ms: 5000,
      window: '本次触发 → 观察是否出现卡片', needs: ['oms', 'hmi', 'reason'] },
    actuation: { data: 'THERMAL', reference: 'HVAC', prefix: 'TEMP', kind: 'milliseconds', ms: 5000,
      window: '有效确认 → 独立车况生效或观察到期', needs: ['oms', 'hmi', 'vehicle-state'] },
    latency: { data: 'PET-CLIPS', reference: 'CLOCK', prefix: 'PET', kind: 'stages',
      window: '从当次采图采集到独立终态，统计时延使用实际测点', needs: ['oms', 'hmi', 'vehicle-state', 'clock'] },
    repeat: { data: 'REMINDER-CYCLES', reference: 'FREQUENCY', prefix: 'CYCLE', kind: 'cycle',
      window: '本次上电周期，从上电到下电', needs: ['hmi', 'reason', 'clock'] },
    recovery: { data: 'RECOVERY', reference: 'RECOVER', prefix: 'FAULT', kind: 'milliseconds', ms: 5000,
      window: '依赖恢复 → 新业务闭环或观察到期', needs: ['oms', 'hmi', 'vehicle-state', 'recovery-trace'] }
  };
  const assetRef = (kind, key) => 'A84-' + kind + '-' + key + '@r1';
  const assetBase = (kind, ref, name, config) => ({
    id: ref.split('@')[0], version: ref.split('@')[1] || 'r1', name, kind, status: '已发布', targets: ['Agent'],
    type: {dataset:'数据集',reference:'独立参考',metric:'指标'}[kind],
    group: kind === 'metric' ? 2 : 0, governanceDomain: '开发', owner: '评测负责人',
    source: 'V2 走查 · 本地合成资产', config: {agentEvaluation: config}
  });
  const datasetNames = {
    'PET-CLIPS': '有宠视频切片清单', NEGATIVE: '无宠与业务抑制清单', THERMAL: '有效确认与四组温度输入',
    'REMINDER-CYCLES': '独立上电周期清单', RECOVERY: '预登记故障恢复序列'
  };
  const referenceNames = {
    REMIND:'应提醒独立金标', SILENT:'不应提醒独立金标', HVAC:'三区空调目标参考',
    CLOCK:'时钟与测点参考', FREQUENCY:'每周期允许提醒次数', RECOVER:'业务恢复及禁止副作用参考'
  };

  function spec(measure) {
    return Object.hasOwn(definitions, measure) ? definitions[measure] : undefined;
  }

  function assets() {
    const catalog = new Map();
    for (const [measure, def] of Object.entries(definitions)) {
      const rule = R.getRule(measure);
      const dataRef = assetRef('DATA', def.data);
      const sampleRows = (measure === 'latency' ? R.getRule('miss') : rule).data.map(([slice], i) => ({
        id: def.prefix + '-' + String(i + 1).padStart(2, '0'), slice,
        ...(measure === 'actuation' ? {parameters: {cabinC: i < 2 ? 30 : 20, outsideC: [32,31,10,11][i], response: 'confirm'}} : {})
      }));
      if (!catalog.has(dataRef)) {
        const data = assetBase('dataset', dataRef, datasetNames[def.data], {samples: sampleRows});
        data.contentSet = {member_kind: 'sample', members: sampleRows.map(sample => sample.id)};
        data.count = sampleRows.length + ' 个本地样本';
        catalog.set(dataRef, data);
      }
      const goldRef = assetRef('GOLD', def.reference);
      const rows = sampleRows.map((sample, i) => {
        const target = rule.data[i]?.[1] ?? (measure === 'miss' ? true : measure === 'false-alert' ? false : null);
        return {sampleId: sample.id, target, label: goldLabel(measure, target)};
      });
      const gold = assetBase('reference', goldRef, referenceNames[def.reference], {dataRef, measure, rows});
      gold.config.references = [dataRef];
      gold.count = rows.length + ' 条独立参考';
      catalog.set(goldRef, gold);
      const metricRef = assetRef('METRIC', measure.toUpperCase());
      const metric = assetBase('metric', metricRef, rule.title, {measure, population: rule.population,
        formula: rule.count, method: '确定性计算', missing: '保留登记分母并单列缺失', threshold: '待业务确认'});
      metric.count = '固定规则 · 正式门槛待确认';
      catalog.set(metricRef, metric);
    }
    return [...catalog.values()];
  }

  function goldLabel(measure, target) {
    if (measure === 'miss') return '应提醒';
    if (measure === 'false-alert') return '不应提醒';
    if (measure === 'actuation') return target + '℃ · 三区及适用动作';
    if (measure === 'repeat') return '允许 ' + target + ' 次';
    if (measure === 'recovery') return '正确恢复且无违规副作用';
    return '采图、可见、确认与独立终态均按同一时钟解释';
  }

  function eligibleAsset(asset) {
    const g = asset?.governance;
    return Boolean(g?.lifecycle === 'PUBLISHED' && g.availability === 'ACTIVE' && g.authorization?.status === 'VALID' &&
      g.authorization.scope === scope && asset.validated);
  }

  function choices(catalog, measure) {
    const def = spec(measure);
    return {
      data: catalog.filter(a => a.kind === 'dataset' && (a.id === 'A84-DATA-' + def.data ||
        a.config?.agentEvaluation?.dataFamily === def.data) && eligibleAsset(a)),
      gold: catalog.filter(a => a.kind === 'reference' && a.config?.agentEvaluation?.measure === measure && eligibleAsset(a)),
      metric: catalog.filter(a => a.kind === 'metric' && a.config?.agentEvaluation?.measure === measure && eligibleAsset(a))
    };
  }

  function recommended(measure) {
    const def = spec(measure);
    const newer = Object.hasOwn(V2.specs,measure);
    const ref = (kind,key,updated) => updated ? 'A84-' + kind + '-' + key + '@r2' : assetRef(kind,key);
    return {dataRef: ref('DATA',def.data,newer && !V2.specs[measure].reuse), goldRef: ref('GOLD',def.reference,newer),
      metricRef: ref('METRIC',measure.toUpperCase(),M.supported(measure)), windowMs: def.ms ?? ''};
  }

  function origin(plan, item) {
    return {url: plan.suite.source.upstream || '',
      sheet: plan.suite.source.upstream ? '测试案例' : plan.suite.source.sheet, row: item.original,
      importedSheet: plan.suite.source.sheet, importedRow: item.workbookRow, sourceDigest: plan.suite.source.sha256};
  }

  function rows(plan) {
    const items = new Map(plan.suite.cases.map(item => [item.id, item.content]));
    return plan.units.flatMap(unit => {
      const item = items.get(unit.caseId);
      return unit.environment === 'bench' && item?.purpose === 'Agent 评测' && spec(item.measure) ? [{unit, item}] : [];
    });
  }

  function initialDraft(plan, row) {
    const {unit, item} = row;
    return {caseId: unit.caseId, caseRef: unit.caseRef, measure: item.measure, source: origin(plan, item),
      definition: copy(item.definition), dataRef:'', goldRef:'', metricRef:'', windowMs:'', sampleIds:[]};
  }

  function resolve(catalog, draft) {
    const {data, gold, metric} = choices(catalog, draft.measure);
    const lookup = (items, ref) => items.find(a => EvaluationCore.key(a) === ref);
    const dataset = lookup(data, draft.dataRef), reference = lookup(gold, draft.goldRef), metricAsset = lookup(metric, draft.metricRef);
    const errors = [];
    const def = spec(draft.measure);
    if (Object.values(draft.definition).some(value => !clean(value))) errors.push('补齐前置、步骤和预期');
    if (!dataset) errors.push('选择可用的样本清单版本');
    if (!reference || reference.config.agentEvaluation.dataRef !== draft.dataRef) errors.push('选择与数据版本配对的独立参考');
    if (!metricAsset) errors.push('选择已登记的指标规则');
    const scoring = metricAsset?.config?.agentEvaluation;
    if (scoring?.program) {
      try { M.validateProgram(scoring.program); } catch (error) { errors.push(error.message); }
      if (scoring.program.measure !== draft.measure || !scoring.verification?.tests?.length ||
          !scoring.verification.tests.every(test => test.ok)) errors.push('选择已通过试算且与本用例匹配的计算规则');
    }
    const sampleRows = dataset?.config?.agentEvaluation?.samples || [];
    const unique = new Set(draft.sampleIds);
    if (!unique.size || unique.size !== draft.sampleIds.length || draft.sampleIds.some(id => !sampleRows.some(sample => sample.id === id))) {
      errors.push('选择本版本中的独立样本');
    }
    const selected = sampleRows.filter(sample => unique.has(sample.id));
    const goldRows = reference?.config?.agentEvaluation?.rows || [];
    if (selected.some(sample => !goldRows.some(row => row.sampleId === sample.id))) errors.push('独立参考须覆盖所有已选样本');
    if (['miss','false-alert'].includes(draft.measure) && selected.some(sample => {
      const target = goldRows.find(row => row.sampleId === sample.id)?.target;
      return draft.measure === 'miss' ? target !== true :
        scoring?.program ? target?.expectedReminder !== false : target !== false;
    })) {
      errors.push('独立参考与当前指标的适用样本不匹配');
    }
    if (scoring?.program && ['actuation','latency','repeat'].includes(draft.measure) &&
        selected.some(sample=>typeof goldRows.find(row=>row.sampleId===sample.id)?.target !== 'object' ||
          goldRows.find(row=>row.sampleId===sample.id)?.target === null)) {
      errors.push('选择与本计算器匹配的结构化金标');
    }
    if (!scoring?.program && ['actuation','repeat'].includes(draft.measure) &&
        selected.some(sample=>typeof goldRows.find(row=>row.sampleId===sample.id)?.target !== 'number')) {
      errors.push('请选择与结构化金标匹配的可执行指标版本');
    }
    const ms = def.kind === 'milliseconds' ? Number(draft.windowMs) : null;
    if (def.kind === 'milliseconds' && (!Number.isInteger(ms) || ms < 1 || ms > 3600000)) errors.push('填写 1–3600000 毫秒的观察窗');
    return {errors, dataset, reference, metricAsset, selected, goldRows, window: {kind: def.kind, ms, label: def.window}};
  }

  function confirm(catalog, draft, previous) {
    const material = resolve(catalog, draft);
    if (material.errors.length) throw Error(material.errors.join(' · '));
    const next = copy(draft);
    next.windowMs = material.window.ms;
    const last = previous.at(-1);
    if (last && same(last.draft, next)) return last;
    const version = (last?.revision || 0) + 1;
    return {revision: version, version: draft.caseRef + '/eval-' + version, draft: next};
  }

  function needs(reviewRows) {
    return [...new Set(reviewRows.flatMap(row => spec(row.item.measure).needs))];
  }

  function requiredSchemas(versions, catalog) {
    const refs = new Set(Object.values(versions || {}).map(items=>items.at(-1)?.draft.metricRef));
    return [...new Set(catalog.filter(asset=>asset.kind === 'metric' && refs.has(EvaluationCore.key(asset)))
      .map(asset=>asset.config?.agentEvaluation?.program?.schema).filter(Boolean))];
  }

  function qualified(profile, flow, env, evidence, project, schemas = []) {
    if (profile?.environment !== env || profile.qualification?.scope !== scope ||
        schemas.some(schema => !profile.qualification.observationSchemas?.includes(schema))) return false;
    return [['adapter', profile.adapterVersion], ['executor', profile.executorVersion]].every(([kind, id]) => {
      const cap = flow.capabilities.find(cap => cap.id === id && cap.kind === kind);
      return EvaluationFlow.qualified(cap) && cap.project === project && cap.environments.includes(env) &&
        cap.modes.includes(env === 'bench' ? 'bench-file' : 'ripple-file') &&
        cap.qualification.scope === scope && ['prepare','observe','return'].every(operation => cap.operations.includes(operation)) &&
        evidence.every(field => cap.evidence.includes(field)) &&
        schemas.every(schema => cap.qualification.observationSchemas?.includes(schema));
    });
  }

  function benchPreflight(task, rows, versions, catalog, profile, flow, objectVersion) {
    const errors = [];
    if (!objectVersion || objectVersion.id !== task.versionId) errors.push('选择被测对象的固定版本');
    if (!rows.length) errors.push('台架计划没有可执行的 Agent 用例');
    if (!qualified(profile, flow, 'bench', needs(rows), task.project, requiredSchemas(versions,catalog))) {
      errors.push('引用覆盖所需证据与观测结构的已验证台架组合');
    }
    const checks = rows.map(({unit, item}) => {
      const version = versions?.[unit.key]?.at(-1);
      const issues = [];
      if (!EvaluationFlow.get(flow,unit.caseRef)) issues.push('固定的用例版本不存在');
      if (!version || version.draft.caseRef !== unit.caseRef) issues.push('保存此用例版本的试评配置');
      const material = issues.length ? null : resolve(catalog, version.draft);
      if (material) {
        issues.push(...material.errors);
        if (material.metricAsset && !material.metricAsset.config.agentEvaluation.program) issues.push('选择有已验证计算器的指标版本');
      }
      return {unit, item, version, material, issues};
    });
    return {ok: !errors.length && checks.every(row=>!row.issues.length), errors, checks};
  }

  function benchRun(task, rows, versions, catalog, profile, flow, id, objectVersion) {
    const check = benchPreflight(task,rows,versions,catalog,profile,flow,objectVersion);
    if (!check.ok) throw Error([...check.errors,...check.checks.filter(row=>row.issues.length)
      .map(row=>row.unit.caseId + '：' + row.issues.join('、'))].join('；'));
    const entries = check.checks.map(({unit, item, version, material}) => {
      const program = material.metricAsset.config.agentEvaluation.program;
      return {caseId: unit.caseId, caseRef: unit.caseRef, caseVersion: version.version, measure: item.measure,
        source: version.draft.source, definition: version.draft.definition, window: material.window,
        dataRef: version.draft.dataRef, goldRef: version.draft.goldRef, metricRef: version.draft.metricRef,
        program,
        trials: material.selected.map(sample => {
          const reference = material.goldRows.find(row=>row.sampleId === sample.id);
          const petClip = ['miss','latency'].includes(item.measure) && /^PET-0[1-5]$/.test(sample.id);
          const inputRef = sample.inputRef || (petClip ? 'fixture://pet/' + sample.id.slice(-2) : undefined);
          const parameters = item.measure === 'latency' && program ? {...sample.parameters,vehicles:1,concurrency:1} : sample.parameters;
          return {...sample,inputRef,parameters,id:id + '/' + unit.caseId + '/' + sample.id,sampleId:sample.id,
            gold:reference.target,goldLabel:reference.label};
        })};
    });
    return copy({manifest: {schema:benchSchema, contractVersion:2, id, scope:'local-rehearsal', taskId: task.id,
      childPlanId: task.suitePlan.childIds.bench, objectVersion: task.versionId, environment:'bench', profile, entries},
    records: [], externalRunId: null, receivedAt: null});
  }

  function dispatchFile(manifest) {
    const {entries, profile, ...head} = manifest;
    const publicProfile = {id: profile.id, adapterVersion: profile.adapterVersion, executorVersion: profile.executorVersion};
    return {...head, profile: publicProfile, entries: entries.map(entry => ({
      caseId: entry.caseId, caseRef: entry.caseRef, caseVersion: entry.caseVersion, measure: entry.measure,
      source: entry.source, dataRef: entry.dataRef, window: entry.window,
      observationSchema: entry.program?.schema,
      instructions: {precondition: entry.definition.precondition, steps: entry.definition.steps},
      trials: entry.trials.map(({id, sampleId, inputRef, slice, parameters}) => ({id,sampleId,inputRef,slice,parameters}))
    }))};
  }

  function benchFixture(manifest) {
    if (manifest?.schema !== benchSchema || manifest.scope !== 'local-rehearsal' || manifest.environment !== 'bench' ||
        !manifest.id || !Array.isArray(manifest.entries) || !manifest.entries.length) throw Error('请上传平台冻结的台架派工清单。');
    const rows = manifest.entries.flatMap(entry => {
      const def = spec(entry.measure);
      if (!def || !Array.isArray(entry.trials) || !entry.trials.length) throw Error('派工缺少可回放用例或预登记试次。');
      const rule = R.getRule(entry.measure);
      return entry.trials.map(trial => {
        const factSchema = entry.observationSchema;
        let status, observation, reason;
        const fixture = Object.hasOwn(V2.replay,entry.measure) ? V2.replay[entry.measure] : null;
        if (factSchema && fixture) {
          if (factSchema !== M.definition(entry.measure).schema) throw Error('台架回放不支持这项观测结构。');
          [status,observation,reason] = fixture(trial);
        } else {
          const clip = /^fixture:\/\/pet\/(0[1-5])$/.exec(trial.inputRef || '');
          const index = Number(clip ? clip[1] : clean(trial.sampleId).split('-').at(-1)) - 1;
          if (!Number.isInteger(index) || index < 0 || (trial.inputRef ? !clip : !trial.sampleId.startsWith(def.prefix + '-'))) {
            throw Error('派工样本无法映射到本地回放。');
          }
          [status,observation,reason] = rule.facts[index] ?? ['UNKNOWN', {}, '缺少同步的终态测点'];
          if (factSchema) observation = M.replay(factSchema,observation,entry.window.ms);
        }
        return {trialId:trial.id, caseRef:entry.caseRef, caseVersion:entry.caseVersion, sampleId:trial.sampleId,
          status, factSchema, fact:observation,
          reason: reason || '', artifact:'fixture/bench/' + entry.caseId + '/' + trial.sampleId + '.json'};
      });
    });
    return {schema:resultSchema, source:'bench-replay', scope:manifest.scope, environment:'bench', manifestId:manifest.id,
      childPlanId:manifest.childPlanId, objectVersion:manifest.objectVersion,
      adapterVersion:manifest.profile?.adapterVersion, executorVersion:manifest.profile?.executorVersion,
      externalRunId:'BENCH-REPLAY-' + manifest.id, rows};
  }

  function scoreEntry(entry, rows) {
    const program = entry.program;
    if (program && rows.some(row => row.factSchema !== program.schema)) {
      throw Error(entry.caseId + ' · 回传观测结构与冻结的评分实现不兼容。');
    }
    const report = R.scoreTrials(entry.measure,entry.window.ms,entry.trials,rows,
      program ? (fact,gold,window) => M.score(program,fact,gold,window) : undefined);
    if (!program) return report;
    const summary = M.aggregate(entry.measure,report.items);
    let unknown = report.unknown;
    if (entry.measure === 'actuation') unknown = summary.unknown + summary.unconfirmed;
    if (entry.measure === 'repeat') unknown = summary.unknown;
    if (entry.measure === 'latency') unknown = report.items.filter(item=>!item.value || item.value.some(value=>value === null)).length;
    return {...report,summary,unknown};
  }

  function preview(run, body) {
    const manifest = run?.manifest;
    if (!manifest || body?.schema !== resultSchema || body.source !== 'bench-replay' || body.scope !== manifest.scope ||
        body.environment !== manifest.environment || body.manifestId !== manifest.id ||
        body.childPlanId !== manifest.childPlanId || body.objectVersion !== manifest.objectVersion) {
      throw Error('回传清单、子计划、对象版本或环境与本次台架派工不一致。');
    }
    if (manifest.contractVersion >= 2 && (body.adapterVersion !== manifest.profile.adapterVersion ||
        body.executorVersion !== manifest.profile.executorVersion)) throw Error('回传的适配器或执行器版本与台架派工不一致。');
    if (typeof body.externalRunId !== 'string' || !body.externalRunId.trim() ||
        !Array.isArray(body.rows) || !body.rows.length || (run.externalRunId && run.externalRunId !== body.externalRunId)) {
      throw Error('请提供本批台架运行编号和逐试次观测。');
    }
    const known = new Map(manifest.entries.flatMap(entry => entry.trials.map(trial => [trial.id, {entry, trial}])));
    const records = new Map(run.records.map(row => [row.trialId, row]));
    const seen = new Set();
    const byCase = new Map();
    let added = 0;
    for (const row of body.rows) {
      const entry = known.get(row?.trialId);
      if (!entry || seen.has(row.trialId)) throw Error('回传含未登记或重复的试次。');
      if (row.caseRef !== entry.entry.caseRef || row.caseVersion !== entry.entry.caseVersion || row.sampleId !== entry.trial.sampleId) {
        throw Error(entry.entry.caseId + ' · ' + entry.trial.sampleId + ' 的回传版本或样本不符。应使用 ' + entry.entry.caseVersion + '。');
      }
      seen.add(row.trialId);
      if (!byCase.has(entry.entry.caseId)) byCase.set(entry.entry.caseId, []);
      byCase.get(entry.entry.caseId).push(row);
      if (records.has(row.trialId)) {
        if (!same(records.get(row.trialId), row)) throw Error('已收试次与本次内容冲突。请核对来源。');
      } else {
        records.set(row.trialId, row);
        added++;
      }
    }
    for (const entry of manifest.entries) {
      scoreEntry(entry,byCase.get(entry.caseId) || []);
    }
    return {body:copy(body), records:copy([...records.values()]), added, duplicates:body.rows.length-added, planned:known.size};
  }

  function accept(run, body) {
    const receipt = preview(run, body);
    if (!receipt.added) return receipt;
    run.records = receipt.records;
    run.externalRunId = body.externalRunId;
    run.receivedAt = new Date().toISOString();
    return receipt;
  }

  function reports(run) {
    if (!run) return [];
    const records = new Map(run.records.map(row => [row.trialId, row]));
    return run.manifest.entries.map(entry => {
      const rows = entry.trials.map(trial => records.get(trial.id)).filter(Boolean);
      return {manifest: {...entry, id:run.manifest.id, environment:'bench', childPlanId:run.manifest.childPlanId,
        objectVersion:run.manifest.objectVersion, profile:run.manifest.profile}, received:rows.length,
        report: {...scoreEntry(entry,rows), body:{externalRunId:run.externalRunId}}};
    });
  }

  window.AgentEvaluation = {scope, benchSchema, sourceUrl, assets, assetBase, spec, rows, choices, recommended, initialDraft,
    resolve, confirm, needs, requiredSchemas, qualified, benchPreflight, benchRun, dispatchFile, benchFixture, preview, accept, reports};
})();
