/* Create assessment assets from typed rows and qualify a configured scoring implementation. */
(() => {
  'use strict';
  const A = AgentEvaluation, M = A84MetricEngine, F = A84V2Fixtures;
  const clean = value => String(value ?? '').trim();
  const sampleHeaders = ['sample_id','video_ref','slice'];
  const goldHeaders = ['sample_id','expected_reminder','reviewer'];
  const samplesCsv = sampleHeaders.join(',') + '\n' + [
    ['PET-01','fixture://pet/01','有宠 · 日间'],
    ['PET-02','fixture://pet/02','有宠 · 夜间'],
    ['PET-03','fixture://pet/03','有宠 · 部分遮挡'],
    ['PET-04','fixture://pet/04','有宠 · 逆光'],
    ['PET-05','fixture://pet/05','有宠 · 移动']
  ].map(row => row.join(',')).join('\n');
  const version = EvaluationCore.key;
  const records = dataset => dataset?.config?.agentEvaluation?.samples || [];
  const number = value => clean(value) === '' ? NaN : Number(value);
  const int = value => Number.isSafeInteger(number(value)) && number(value) >= 0;
  const flag = value => ({true:true,false:false})[clean(value).toLowerCase()];
  const config = measure => Object.hasOwn(F.specs,measure) ? F.specs[measure] : null;
  const csv = (headers,rows) => [headers,...rows].map(row => row.map(value => {
    const cell = String(value ?? '');
    return /[",\n]/.test(cell) ? '"' + cell.replaceAll('"','""') + '"' : cell;
  }).join(',')).join('\n');

  function parse(text, required) {
    const {headers,rows} = CaseFileImport.parse(text);
    if (!required.every(name => headers.includes(name)) || !rows.length) {
      throw Error('请提供表头和记录。必填列为 ' + required.join('、') + '。');
    }
    return rows;
  }

  function sampleCsv(measure,source) {
    const spec = config(measure);
    return spec ? csv(spec.sampleHeaders,spec.sampleRows(records(source))) : samplesCsv;
  }

  function sourceClip(source,id,measure) {
    const sample = records(source).find(row=>row.id === id);
    if (!sample) throw Error('来源版本中没有样本 ' + id + '。');
    if (measure === 'repeat') {
      if (sample.parameters?.group !== 'no_pet') throw Error('E05 对照必须引用 E02 真实无宠组。');
      return sample.inputRef;
    }
    const clip = sample.inputRef || (/^PET-0[1-5]$/.test(sample.id) ? 'fixture://pet/' + sample.id.slice(-2) : '');
    if (!/^fixture:\/\/pet\/0[1-5]$/.test(clip)) throw Error('来源清单没有已登记的有宠片段。');
    return clip;
  }

  function samples(text,measure = 'miss',source = null) {
    const seen = new Set(), scenarios = new Set();
    const spec = config(measure);
    if (spec?.source && !source) throw Error('先选需要复用的来源清单版本。');
    return parse(text,spec?.sampleHeaders || sampleHeaders).map((row,i) => {
      const id = clean(row.sample_id), slice = clean(row.slice), sourceSampleId = clean(row.source_sample_id);
      let inputRef = clean(row.video_ref), parameters;
      if (!/^[A-Za-z0-9][\w.-]{0,59}$/.test(id) || seen.has(id)) throw Error('第 ' + (i+1) + ' 条记录的样本 ID 为空、不合规或重复。');
      if (measure === 'false-alert') {
        const group = clean(row.group);
        if (!F.negative.some(([key,,kind])=>inputRef === 'fixture://negative/'+key && group === kind)) {
          throw Error('第 ' + (i+1) + ' 条的片段与无宠或抑制分组不匹配。');
        }
        parameters = {group};
      } else if (measure === 'actuation') {
        const cabinC = number(row.cabin_c), outsideC = number(row.outside_c);
        if (!F.thermal.some(pair=>pair.cabinC === cabinC && pair.outsideC === outsideC)) {
          throw Error('请填写 V2 的四组舱温与外温之一。');
        }
        inputRef = sourceClip(source,sourceSampleId,measure);
        parameters = {cabinC,outsideC,response:'confirm'};
      } else if (measure === 'repeat') {
        const action = clean(row.action);
        if (action === 'no_pet') inputRef = sourceClip(source,sourceSampleId,measure);
        else if (sourceSampleId || !F.cycles.some(([key,,kind])=>inputRef === 'fixture://cycle/'+key && kind === action)) {
          throw Error('第 ' + (i+1) + ' 条的连续片段与周期交互不匹配。');
        }
        parameters = {action,clipDurationMs:60000};
      } else if (!/^fixture:\/\/pet\/0[1-5]$/.test(inputRef)) {
        throw Error('第 ' + (i+1) + ' 条记录的片段引用未登记为可回放素材。');
      }
      if (!slice) throw Error('第 ' + (i+1) + ' 条记录缺少切片标签。');
      const scenarioKey = JSON.stringify([inputRef,parameters]);
      if (scenarios.has(scenarioKey)) throw Error('第 ' + (i+1) + ' 条重复登记了同一片段和场景参数。');
      seen.add(id);
      scenarios.add(scenarioKey);
      return {id,inputRef,slice,...(parameters ? {parameters} : {}),...(sourceSampleId ? {sourceSampleId} : {})};
    });
  }

  function goldTarget(measure,row,sample) {
    if (measure === 'false-alert') {
      const group = sample.parameters?.group;
      const petPresent = flag(row.pet_present), expectedReminder = flag(row.expected_reminder), expectedReason = clean(row.expected_reason);
      if (!F.expectedReason(group) || petPresent !== (group !== 'no_pet') || expectedReminder !== false || expectedReason !== F.expectedReason(group)) {
        throw Error('有无宠、应提醒和预期门控须与 V2 抑制分组匹配。');
      }
      return {target:{group,petPresent,expectedReminder,expectedReason},label:(petPresent ? '有宠抑制' : '无宠') + ' · 不应提醒 · ' + expectedReason};
    }
    if (measure === 'actuation') {
      const zonesC = [row.left_c,row.right_c,row.rear_c].map(number);
      const acOn = flag(row.ac_on), airMode = clean(row.air_mode);
      if (zonesC.some(value=>!Number.isFinite(value) || value < 16 || value > 32) ||
          typeof acOn !== 'boolean' || !['outside','inside'].includes(airMode)) {
        throw Error('请填写 16–32℃ 的三区目标、开关布尔值和循环模式。');
      }
      return {target:{zonesC,acOn,airMode},label:zonesC.join('/') + '℃ · ' + (acOn ? '空调开' : '空调关') +
        ' · ' + (airMode === 'outside' ? '外循环' : '内循环')};
    }
    if (measure === 'latency') {
      if (!int(row.first_recognizable_ms)) throw Error('首次可识别时刻须填写非负毫秒数。');
      const firstRecognizableMs = number(row.first_recognizable_ms);
      return {target:{firstRecognizableMs},label:'视频内首次可识别 ' + firstRecognizableMs + ' ms'};
    }
    if (measure === 'repeat') {
      const policyRef = clean(row.policy_ref), conflict = flag(row.conflict), action = sample.parameters?.action;
      if (!/^[\w.-]+@[\w.-]+$/.test(policyRef) || typeof conflict !== 'boolean' ||
          (conflict ? clean(row.allowed_reminders) !== '' : !int(row.allowed_reminders))) {
        throw Error('请填写频控版本。正常周期填允许次数，冲突周期留空并标为 true。');
      }
      const allowed = conflict ? null : number(row.allowed_reminders);
      return {target:{allowed,policyRef,conflict,action},label:conflict ? '冲突待裁决 · ' + policyRef : '允许 ' + allowed + ' 次 · ' + policyRef};
    }
    const target = flag(row.expected_reminder);
    if (typeof target !== 'boolean') throw Error('应提醒须填写 true 或 false。');
    return {target,label:target ? '应提醒' : '不应提醒'};
  }

  function gold(text, dataset,measure = 'miss') {
    const sampleRows = records(dataset);
    if (!sampleRows.length) throw Error('请先选择样本清单固定版本。');
    const byId = new Map(sampleRows.map(sample => [sample.id,sample])), seen = new Set();
    const rows = parse(text,config(measure)?.goldHeaders || goldHeaders).map((row,i) => {
      const sampleId = clean(row.sample_id), reviewer = clean(row.reviewer);
      if (!byId.has(sampleId) || seen.has(sampleId)) throw Error('第 ' + (i+1) + ' 条金标的样本 ID 与所选清单不符或重复。');
      if (!reviewer) throw Error('每条金标需填写独立复核人。');
      seen.add(sampleId);
      return {sampleId,reviewer,...goldTarget(measure,row,byId.get(sampleId))};
    });
    const missing = sampleRows.filter(row => !seen.has(row.id));
    if (missing.length) throw Error('这些样本缺少独立金标。' + missing.map(row => row.id).join('、'));
    if (measure === 'repeat' && new Set(rows.map(row=>row.target.policyRef)).size !== 1) {
      throw Error('同一清单的周期需引用同一冻结频控规则版本。');
    }
    return rows;
  }

  function goldCsv(dataset,measure = 'miss') {
    const spec = config(measure);
    return spec ? csv(spec.goldHeaders,records(dataset).map(spec.goldRow)) :
      csv(goldHeaders,records(dataset).map(row=>[row.id,true,'演练复核员']));
  }

  function createDataset(id,name,rows,measure = 'miss',sourceRef = '') {
    const asset = A.assetBase('dataset',id,name,{dataFamily:A.spec(measure).data,samples:rows,sourceRef});
    if (sourceRef) asset.config.references = [sourceRef];
    asset.contentSet = {member_kind:'sample',members:rows.map(row => row.id)};
    asset.count = rows.length + ' 个样本';
    return asset;
  }

  function createGold(id,name,dataset,rows,basis,measure = 'miss') {
    const dataRef = version(dataset);
    const asset = A.assetBase('reference',id,name,{dataRef,measure,rows,basis});
    asset.config.references = [dataRef];
    asset.count = rows.length + ' 条独立标注';
    return asset;
  }

  function createMetric(id,name,program,windowMs) {
    const verification = M.validate(program,windowMs);
    if (!verification.every(test => test.ok)) throw Error('试算未通过，指标不可发布。');
    const rule = MeasureRehearsal.getRule(program.measure);
    const asset = A.assetBase('metric',id,name,{
      measure:program.measure,population:rule.population,formula:rule.count,method:'确定性计算',
      missing:'保留登记分母并单列缺失',threshold:'待业务确认',program,verification:{windowMs,tests:verification}
    });
    asset.count = M.definition(program.measure).name + ' · 开发验证';
    return asset;
  }

  function prepared(catalog) {
    const pet = catalog.find(asset=>version(asset) === A.recommended('miss').dataRef);
    const assets = [];
    let noPet;
    for (const [measure,spec] of Object.entries(F.specs)) {
      const refs = A.recommended(measure);
      const source = spec.source === 'miss' ? pet : spec.source === 'false-alert' ? noPet : null;
      const data = spec.reuse ? source : createDataset(refs.dataRef,spec.sampleTitle.replace(/^创建/, '') + ' · 演练',
        samples(sampleCsv(measure,source),measure,source),measure,source ? version(source) : '');
      if (!spec.reuse) assets.push(data);
      if (measure === 'false-alert') noPet = data;
      assets.push(createGold(refs.goldRef,spec.goldTitle.replace(/^配对/, '') + ' · 演练',data,
        gold(goldCsv(data,measure),data,measure),spec.basis,measure));
    }
    for (const measure of ['miss',...Object.keys(F.specs),'recovery']) {
      const refs = A.recommended(measure), program = M.configure(measure,M.definition(measure).mapping);
      assets.push(createMetric(refs.metricRef,MeasureRehearsal.getRule(measure).title + ' · 可执行',program,refs.windowMs || null));
    }
    return assets;
  }

  window.A84AssessmentAssets = {samplesCsv,sampleCsv,samples,gold,goldCsv,config,createDataset,createGold,createMetric,prepared};
})();
