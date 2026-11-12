/* Offline score rehearsal for the measurement templates used in the V2 walkthrough. */
(() => {
  'use strict';

  const schema = 'baic.prototype.measure-result/v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const timestamp = value => Number.isFinite(value) && value >= 0;
  const positive = value => Number.isInteger(value) && value >= 0;
  const elapsed = (start, end) => timestamp(start) && timestamp(end) && end >= start ? end - start : null;
  const statuses = ['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'UNKNOWN'];
  const observedCard = (fact, window) => timestamp(fact.cardMs) ? Number(fact.cardMs <= window) :
    fact.fullHmiWindow === true && fact.cardMs === null ? 0 : null;

  const rules = {
    miss: {
      title: '端到端漏提醒率', population: '全部预先登记的应提醒独立场景',
      count: '窗口内未显示卡片的场景', timeWindow: true,
      evidence: '金标、原始识宠、当次 OMS、门控及 HMI 可见或完整观察窗',
      data: [['有宠 · 日间'], ['有宠 · 夜间'], ['有宠 · 部分遮挡'], ['有宠 · 逆光'], ['有宠 · 移动']],
      facts: [
        ['SUCCEEDED', {cardMs: 1350}],
        ['TIMED_OUT', {cardMs: null, fullHmiWindow: true}, '识宠无结果'],
        ['FAILED', {cardMs: null, fullHmiWindow: true}, '消息丢失'],
        ['SUCCEEDED', {cardMs: 1750}],
        ['UNKNOWN', {cardMs: null, fullHmiWindow: false}, 'HMI 采集缺失']
      ],
      score: (fact, gold, window) => {
        const card = observedCard(fact, window);
        return card === null ? null : 1 - card;
      }
    },
    'false-alert': {
      title: '端到端误提醒率', population: '全部预先登记的不应提醒独立场景',
      count: '观察窗内显示卡片的场景分组统计。仅真实无宠的有效模型周期计算供应商误报。', timeWindow: true,
      evidence: '触发时间、HMI 可见时间及采证范围、门控原因、原始模型输出',
      data: [['空舱'], ['玩偶干扰'], ['有宠 · 22℃'], ['有宠 · 冷却']],
      facts: [
        ['SUCCEEDED', {cardMs: null, fullHmiWindow: true}],
        ['FAILED', {cardMs: 1000}, '出现错误卡片'],
        ['SUCCEEDED', {cardMs: null, fullHmiWindow: true}],
        ['SUCCEEDED', {cardMs: null, fullHmiWindow: true}]
      ],
      score: (fact, gold, window) => observedCard(fact, window)
    },
    actuation: {
      title: '确认后实际执行成功率', population: '预先满足有效期条件且执行了确认点击的场景',
      count: '有效点击后，时限内三区、空调开关和循环模式实际到位的场景', timeWindow: true,
      evidence: '卡片有效期及确认点击、同请求控车指令、独立三区、开关和循环模式读回',
      data: [['舱温/外温 30/32℃', 22], ['舱温/外温 30/31℃', 24], ['舱温/外温 20/10℃', 26], ['舱温/外温 20/11℃', 24]],
      facts: [
        ['SUCCEEDED', {zones: [22, 22, 22], cycle: 2, on: true, stateMs: 1800}],
        ['FAILED', {zones: [24, 24, 22], cycle: 2, on: true, stateMs: 2600}, '后排未到目标'],
        ['SUCCEEDED', {zones: [26, 26, 26], cycle: 2, on: true, stateMs: 2200}],
        ['UNKNOWN', {}, '无独立车况读回']
      ],
      score: (fact, gold, window) => {
        if (!Array.isArray(fact.zones) || fact.zones.length !== 3 || !fact.zones.every(Number.isFinite) ||
          typeof fact.on !== 'boolean' || !positive(fact.cycle) || !timestamp(fact.stateMs)) return null;
        return Number(fact.stateMs <= window && fact.on && fact.cycle === 2 && fact.zones.every(zone => zone === gold));
      }
    },
    latency: {
      title: '提醒与确认执行时延', population: '全部登记尝试。分位数各用有效测点作分母',
      count: '卡片可见减采图，独立车况生效减点击。点击前用户停留另报。', timeWindow: false,
      evidence: '同一时钟下的采图、原始模型输出、OMS、卡片可见、点击和独立终态时间戳',
      data: [['复用 E01 · 日间'], ['复用 E01 · 夜间'], ['复用 E01 · 逆光'], ['复用 E01 · 遮挡']],
      facts: [
        ['SUCCEEDED', {synced: true, capture: 10, visible: 1240, click: 2100, state: 4190}],
        ['SUCCEEDED', {synced: true, capture: 10, visible: 1560, click: 2500, state: 5200}],
        ['TIMED_OUT', {synced: true, capture: 10, visible: 1300, click: 2200}, '真实状态未到位'],
        ['UNKNOWN', {synced: false, capture: 10, visible: 1000}, '时钟未校准']
      ],
      score: fact => fact.synced === true ? [elapsed(fact.capture, fact.visible), elapsed(fact.click, fact.state)] : [null, null]
    },
    repeat: {
      title: '重复提醒打扰次数', population: '适用同一冻结频控口径的独立行程或上电周期。冲突周期单列。',
      count: '各周期实际减允许的正数，同时报告违规周期数', timeWindow: false,
      evidence: '上电和下电时间、实际卡片出现 ID 和时间、交互和连续识宠轨迹',
      data: [['确认后', 1], ['取消后', 1], ['保留 Pending', 1], ['已达取消上限', 0]],
      facts: [
        ['SUCCEEDED', {shown: 1}], ['FAILED', {shown: 3}, '实际卡片超额'],
        ['SUCCEEDED', {shown: 1}], ['SUCCEEDED', {shown: 0}]
      ],
      score: (fact, gold) => positive(fact.shown) ? Math.max(fact.shown - gold, 0) : null
    },
    recovery: {
      title: '异常后恢复成功率', population: '全部预先登记的故障恢复序列',
      count: '恢复窗内业务恢复且无违规副作用的序列', timeWindow: true,
      evidence: '恢复时点、新请求链路、独立终态，以及旧任务未重放证据',
      data: [['OMS · 弹窗前'], ['连接 · 确认后'], ['状态存储 · 确认后']],
      facts: [
        ['SUCCEEDED', {recovered: true, replayed: false, wrongControl: false, staleCard: false, recoveryMs: 2600}],
        ['FAILED', {recovered: true, replayed: true, wrongControl: false, staleCard: false, recoveryMs: 1900}, '旧请求重放'],
        ['TIMED_OUT', {recovered: false, replayed: false, wrongControl: false, staleCard: false, recoveryMs: 6500}, '未在窗口内恢复']
      ],
      score: (fact, gold, window) => [fact.recovered, fact.replayed, fact.wrongControl, fact.staleCard].every(v => typeof v === 'boolean') &&
        timestamp(fact.recoveryMs) ? Number(fact.recovered && !fact.replayed && !fact.wrongControl && !fact.staleCard && fact.recoveryMs <= window) : null
    },
    performance: {
      title: '性能结果分母校验', population: '全部登记请求，包含失败和超时',
      count: '外部采集的成功请求。使用原表 8 成功、1 失败、1 超时的对账夹具', timeWindow: false,
      evidence: '逐请求结果及阶段时间。门限待确认时只报观察值',
      data: Array.from({length: 10}, (_, i) => ['独立请求 ' + (i + 1)]),
      facts: [...Array.from({length: 8}, () => ['SUCCEEDED', {}]), ['FAILED', {}, '失败'], ['TIMED_OUT', {}, '超时']],
      score: (fact, gold, window, status) => status === 'UNKNOWN' ? null : Number(status === 'SUCCEEDED')
    },
    config: {
      title: '生效配置与调度验证', population: 'A/B 两组已登记配置',
      count: '生效值、覆盖来源、调度与未确认前车控证据全部一致的组', timeWindow: false,
      evidence: '两组运行时生效配置及来源、日志、实际连接、接收及调度记录',
      data: [['A · 启用', true], ['B · 停用', false]],
      facts: [
        ['SUCCEEDED', {enabled: true, priority: 94, dispatched: true, control: 0, origin: 'verified', target: 'isolated'}],
        ['SUCCEEDED', {enabled: false, priority: 94, dispatched: false, control: 0, origin: 'verified', target: 'isolated'}]
      ],
      score: (fact, gold) => typeof fact.enabled === 'boolean' && typeof fact.dispatched === 'boolean' &&
        positive(fact.priority) && positive(fact.control) && typeof fact.origin === 'string' && typeof fact.target === 'string' ?
        Number(fact.enabled === gold && fact.priority === 94 && fact.dispatched === gold && fact.control === 0 &&
          fact.origin === 'verified' && fact.target === 'isolated') : null
    }
  };

  function getRule(key) {
    return Object.hasOwn(rules, key) ? rules[key] : undefined;
  }

  function freeze(task, unit, item, profile, form, id) {
    const rule = getRule(item.measure);
    const data = String(form.data || '').trim();
    const reference = String(form.reference || '').trim();
    const ruleRef = String(form.ruleRef || '').trim();
    const windowMs = rule?.timeWindow ? Number(form.windowMs) : null;
    if (!rule || !profile || profile.environment !== unit.environment || !task.versionId) throw Error('请先选对象版本并绑定本环境接入组合。');
    if (!data || !reference || !ruleRef || data === reference) throw Error('请分别填写样本版本、独立参考版本和指标规则版本。');
    if (rule.timeWindow && (!positive(windowMs) || !windowMs)) throw Error('请输入正整数毫秒的试评观察窗。');
    return clone({
      id, scope: 'local-rehearsal', taskId: task.id, childPlanId: task.suitePlan.childIds[unit.environment],
      workbookSha256: task.suitePlan.suite.source.sha256, objectVersion: task.versionId,
      environment: unit.environment, caseId: unit.caseId, caseRef: unit.caseRef, measure: item.measure, profile,
      data, reference, ruleRef, windowMs,
      trials: rule.data.map(([slice, gold], i) => ({id: id + '/' + (i + 1), sampleId: 'FIXTURE-' + (i + 1), slice, gold}))
    });
  }

  function sample(manifest) {
    return {
      schema, scope: 'local-rehearsal', source: 'local-fixture', manifestId: manifest.id,
      environment: manifest.environment, caseRef: manifest.caseRef, externalRunId: 'FIXTURE-' + manifest.id,
      rows: getRule(manifest.measure).facts.map(([status, fact, reason], i) => ({
        trialId: manifest.trials[i].id, status, fact, reason: reason || '', artifact: 'fixture/observation-' + (i + 1) + '.json'
      }))
    };
  }

  function scoreResult(manifest, body) {
    if (!manifest || body?.schema !== schema || body.scope !== 'local-rehearsal' || body.source !== 'local-fixture' ||
        body.manifestId !== manifest.id || body.environment !== manifest.environment || body.caseRef !== manifest.caseRef) {
      throw Error('试评回传与冻结清单、环境、用例版本或夹具来源不一致。');
    }
    if (typeof body.externalRunId !== 'string' || !body.externalRunId.trim() || !Array.isArray(body.rows) || !body.rows.length) {
      throw Error('请提供运行标识与逐试次观测。');
    }
    return {...scoreTrials(manifest.measure, manifest.windowMs, manifest.trials, body.rows), body: clone(body)};
  }

  function scoreTrials(measure, windowMs, trials, rows, evaluate) {
    const incoming = new Map();
    const known = new Set(trials.map(trial => trial.id));
    for (const row of rows) {
      if (!known.has(row?.trialId) || incoming.has(row.trialId)) throw Error('回传含重复试次或本批未登记的试次。');
      if (!statuses.includes(row.status) || typeof row.artifact !== 'string' || !row.artifact.trim() ||
          !row.fact || typeof row.fact !== 'object' || Array.isArray(row.fact)) throw Error('回传行缺少执行状态、观测值或证据定位。');
      incoming.set(row.trialId, row);
    }
    const rule = getRule(measure);
    const items = trials.map(trial => {
      const row = incoming.get(trial.id);
      const scored = row && evaluate ? evaluate(row.fact,trial.gold,windowMs) : null;
      const value = scored ? scored.value : row ? rule.score(row.fact, trial.gold, windowMs, row.status) : null;
      return {...scored,trial,status:row?.status || 'MISSING',value,artifact:row?.artifact || '',reason:row?.reason || ''};
    });
    return {items, total: items.length, unknown: items.filter(item => item.value === null).length};
  }

  function persist(run, body) {
    if (run.report) {
      if (JSON.stringify(run.report.body) === JSON.stringify(body)) return false;
      throw Error('该试评已留存回传。对照验证请使用新的计划快照。');
    }
    run.report = scoreResult(run.manifest, body);
    return true;
  }

  function percentiles(items, index) {
    const values = items.map(item => item.value?.[index]).filter(Number.isFinite).sort((a, b) => a - b);
    return [values.length, ...[0.5, 0.95, 0.99, 1].map(p => values.length ? values[Math.ceil(p * values.length) - 1] : '—')];
  }

  window.MeasureRehearsal = {getRule, freeze, sample, scoreResult, scoreTrials, persist, percentiles};
})();
