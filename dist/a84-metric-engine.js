/* Versioned observation contracts and deterministic scorers for V2 Agent assessment. */
(() => {
  'use strict';

  const fields = {
    captureStartedMs: {label:'采图开始',type:'time'},
    reminderVisibleMs: {label:'HMI 卡片可见',type:'event'},
    hmiObservedUntilMs: {label:'HMI 观察截至',type:'time'},
    hmiCaptureHealthy: {label:'HMI 采集健康',type:'boolean'},
    triggerAtMs: {label:'本次触发',type:'time'},
    gateReason: {label:'门控原因',type:'reason'},
    modelPetDetected: {label:'原始模型是否识别到宠物',type:'boolean'},
    confirmation: {label:'点击、卡片有效期及采证范围',type:'confirmation'},
    command: {label:'同请求下发的控车指令',type:'command'},
    hvacReadback: {label:'独立三区、开关及循环模式读回',type:'readback'},
    confirmedAtMs: {label:'有效确认点击',type:'time'},
    effectiveStateAtMs: {label:'独立终态实际生效',type:'time'},
    powerCycle: {label:'上电与下电时间',type:'cycle'},
    hmiAppearances: {label:'带出现 ID 的 HMI 可见事件与采证范围',type:'appearances'},
    interactionEvents: {label:'确认、取消、保留 Pending 等交互轨迹',type:'interactions'},
    modelTransitions: {label:'连续识宠状态轨迹',type:'model-series'},
    dependencyRestoredMs: {label:'依赖恢复',type:'time'},
    newFlowClosedMs: {label:'新业务闭环',type:'event'},
    recoveryObservedUntilMs: {label:'恢复观察截至',type:'time'},
    recoveryTraceHealthy: {label:'恢复链路采集健康',type:'boolean'},
    clockAligned: {label:'同一时钟基准',type:'boolean'},
    stateVerified: {label:'独立终态已验证',type:'boolean'},
    oldTaskReplayed: {label:'旧请求重放',type:'boolean'},
    wrongControl: {label:'误控车',type:'boolean'},
    staleCard: {label:'残留卡片',type:'boolean'}
  };
  const proof = ['oldTaskReplayed','wrongControl','staleCard'];
  const rules = {
    miss: {
      implementation:'event-window-miss@1', name:'事件窗口漏判计算器', schema:'bench.hmi-timeline@1',
      mapping:{start:'captureStartedMs', event:'reminderVisibleMs', coverage:'hmiObservedUntilMs', healthy:'hmiCaptureHealthy'}
    },
    'false-alert': {
      implementation:'event-window-false-alert@1', name:'误提醒与无宠误报计算器', schema:'bench.false-alert-timeline@1',
      mapping:{start:'triggerAtMs',event:'reminderVisibleMs',coverage:'hmiObservedUntilMs',healthy:'hmiCaptureHealthy',
        gate:'gateReason',model:'modelPetDetected'}
    },
    actuation: {
      implementation:'confirmed-hvac-state@1', name:'有效确认与独立车况计算器', schema:'bench.confirmed-hvac@1',
      mapping:{click:'confirmation',command:'command',state:'hvacReadback'}
    },
    latency: {
      implementation:'paired-endpoint-latency@1', name:'配对测点时延计算器', schema:'bench.end-to-end-timestamps@1',
      mapping:{capture:'captureStartedMs',visible:'reminderVisibleMs',confirmed:'confirmedAtMs',effective:'effectiveStateAtMs'}
    },
    repeat: {
      implementation:'cycle-reminder-overage@1', name:'周期提醒超额计算器', schema:'bench.power-cycle-timeline@1',
      mapping:{cycle:'powerCycle',appearances:'hmiAppearances',interaction:'interactionEvents',transitions:'modelTransitions'}
    },
    recovery: {
      implementation:'recovery-window@1', name:'恢复闭环计算器', schema:'bench.recovery-timeline@1',
      mapping:{start:'dependencyRestoredMs', event:'newFlowClosedMs', coverage:'recoveryObservedUntilMs', healthy:'recoveryTraceHealthy'}
    }
  };
  const mappingLabels = {
    start:'窗口起点',event:'目标事件',coverage:'观察截止',healthy:'采集健康',
    gate:'门控原因',model:'原始识宠结果',click:'有效点击依据',command:'控车指令',state:'独立车况读回',
    capture:'提醒段起点',visible:'提醒段终点',confirmed:'执行段起点',effective:'执行段终点',
    cycle:'周期边界',appearances:'HMI 实际出现',interaction:'交互轨迹',transitions:'原始模型轨迹'
  };
  const time = value => Number.isSafeInteger(value) && value >= 0;
  const has = key => Object.hasOwn(rules,key);
  const supported = measure => has(measure);

  function definition(measure) {
    return has(measure) ? rules[measure] : null;
  }

  function configure(measure, mapping) {
    const rule = definition(measure);
    if (!rule || !mapping || Object.keys(mapping).length !== Object.keys(rule.mapping).length ||
        Object.keys(rule.mapping).some(key => mapping[key] !== rule.mapping[key])) {
      throw Error('请选择与本用例和证据结构匹配的字段。');
    }
    return {measure, implementation:rule.implementation, schema:rule.schema, mapping:{...mapping}};
  }

  function validateProgram(program) {
    const verified = configure(program?.measure,program?.mapping);
    if (verified.schema !== program.schema || verified.implementation !== program.implementation) {
      throw Error('指标实现或回传结构版本不匹配。');
    }
  }

  const result = (value, calculation, detail = {}) => ({value,calculation,...detail});
  const elapsed = (start, end) => time(start) && time(end) && end >= start ? end - start : null;
  const intervalLabel = (start, end) => end + ' − ' + start + ' = ' + (end - start) + ' ms';

  function scoreFalseAlert(program, fact, gold, windowMs) {
    const {start,event,coverage,healthy,gate,model} = program.mapping;
    const t0 = fact[start], visible = fact[event], end = fact[coverage];
    const delay = elapsed(t0,visible), observed = elapsed(t0,end);
    const detail = {
      modelDetected:typeof fact[model] === 'boolean' ? fact[model] : null,
      gateReason:typeof fact[gate] === 'string' ? fact[gate] : ''
    };
    const modelLabel = detail.modelDetected === null ? '缺证' : detail.modelDetected ? '识宠' : '无宠';
    const withEvidence = calculation => calculation + ' · 门控 ' + (detail.gateReason || '缺证') + ' · 原始模型 ' + modelLabel;
    if (gold?.expectedReminder !== false) return result(null,'缺少“不应提醒”独立金标',detail);
    if (fact.clockAligned !== true || fact[healthy] !== true || observed === null ||
        (visible !== null && (delay === null || visible > end))) {
      return result(null,withEvidence('HMI 采证或时序不完整'),detail);
    }
    if (delay !== null && delay <= windowMs) return result(1,withEvidence(intervalLabel(t0,visible) + '，窗内出现卡片'),detail);
    if (observed < windowMs) return result(null,withEvidence('未采全观察窗'),detail);
    return result(0,withEvidence('采证覆盖 ' + windowMs + ' ms，窗内无卡片'),detail);
  }

  function scoreActuation(program, fact, gold, windowMs) {
    const {click,command,state} = program.mapping;
    const input = fact[click], cmd = fact[command], observed = fact[state];
    if (fact.clockAligned !== true || input?.healthy !== true || elapsed(input.cardVisibleAtMs,input.expiresAtMs) === null ||
        !time(input.observedUntilMs) || typeof input.requestId !== 'string' || !input.requestId) {
      return result(null,'缺有效点击的独立取证', {eligible:null});
    }
    const at = input.clickedAtMs;
    const absent = at === null && input.observedUntilMs >= input.expiresAtMs;
    const outOfRange = time(at) && at <= input.observedUntilMs && (at < input.cardVisibleAtMs || at > input.expiresAtMs);
    if (absent || outOfRange) {
      return result(null,'未在卡片有效期内点击，不进入成功率分母',{eligible:false});
    }
    if (!time(at) || at > input.observedUntilMs) return result(null,'有效点击待核对',{eligible:null});
    const eligible = {eligible:true};
    if (!gold || !Array.isArray(gold.zonesC) || observed?.source !== 'independent-hvac' || observed.healthy !== true ||
        observed.requestId !== input.requestId || elapsed(at,observed.observedUntilMs) === null || !Array.isArray(observed.samples)) {
      return result(null,'已证实有效点击，缺同请求独立车况读回',eligible);
    }
    const deadline = at + windowMs;
    const readings = observed.samples.filter(reading => time(reading?.atMs) && reading.atMs >= at &&
      reading.atMs <= observed.observedUntilMs && Array.isArray(reading.zonesC) && reading.zonesC.length === gold.zonesC.length &&
      reading.zonesC.every(Number.isFinite) && typeof reading.acOn === 'boolean' && ['inside','outside'].includes(reading.airMode));
    const matches = reading => reading.acOn === gold.acOn && reading.airMode === gold.airMode &&
      reading.zonesC.every((zone,i)=>zone===gold.zonesC[i]);
    const alignedCommand = cmd?.requestId === input.requestId && elapsed(at,cmd.sentAtMs) !== null;
    const first = alignedCommand ? readings.filter(reading=>reading.atMs >= cmd.sentAtMs && matches(reading))
      .sort((a,b)=>a.atMs-b.atMs)[0] : null;
    if (first?.atMs <= deadline) {
      return result(1,intervalLabel(at,first.atMs) + '，三区、开关与循环模式均到位',eligible);
    }
    if (observed.observedUntilMs < deadline || !readings.length || readings.length !== observed.samples.length) {
      return result(null,'已证实有效点击，独立车况采证未覆盖判定窗口',eligible);
    }
    if (!alignedCommand && readings.some(reading=>reading.atMs <= deadline && matches(reading))) {
      return result(null,'车况与金标一致，缺同请求指令关联',eligible);
    }
    if (first) return result(0,intervalLabel(at,first.atMs) + '，超出 ' + windowMs + ' ms',eligible);
    const last = readings.reduce((current,reading)=>!current || reading.atMs > current.atMs ? reading : current,null);
    return result(0,'窗内未全部到位 · 三区读回 ' + last.zonesC.join('/') +
      '℃，金标 ' + gold.zonesC.join('/') + '℃ · 开关 ' + (last.acOn ? '开' : '关') +
      ' · ' + (last.airMode === 'outside' ? '外循环' : '内循环'),eligible);
  }

  function scoreLatency(program, fact, gold) {
    const {capture,visible,confirmed,effective} = program.mapping;
    if (fact.clockAligned !== true) return result([null,null],'时钟未校准，阶段测点不参与分位数',{dwell:null});
    const reminder = elapsed(fact[capture],fact[visible]);
    const actuation = fact.effectiveStateSource === 'independent-hvac' ? elapsed(fact[confirmed],fact[effective]) : null;
    const dwell = elapsed(fact[visible],fact[confirmed]);
    const calculation = ['提醒 ' + (reminder === null ? '缺有效测点' : intervalLabel(fact[capture],fact[visible])),
      '执行 ' + (actuation === null ? '缺独立终态或有效点击' : intervalLabel(fact[confirmed],fact[effective])),
      '用户停留 ' + (dwell === null ? '缺有效测点' : dwell + ' ms')];
    if (time(gold?.firstRecognizableMs)) calculation.push('视频标注 ' + gold.firstRecognizableMs + ' ms');
    return result([reminder,actuation],calculation.join(' · '),{dwell});
  }

  function scoreCycle(program, fact, gold) {
    const {cycle,appearances,interaction,transitions} = program.mapping;
    if (gold?.conflict === true) return result(null,'频控规则冲突待裁决 · ' + gold.policyRef,{eligible:false});
    if (!time(gold?.allowed)) return result(null,'缺每周期允许次数金标',{eligible:null});
    const power = fact[cycle], hmi = fact[appearances], events = hmi?.events;
    const on = power?.onAtMs, off = power?.offAtMs;
    const inCycle = at => time(at) && at >= on && at < off;
    if (fact.clockAligned !== true || elapsed(on,off) === null || on === off || hmi?.healthy !== true ||
        !time(hmi.observedUntilMs) || hmi.observedUntilMs < off || !Array.isArray(events) ||
        events.some(row=>typeof row?.appearanceId !== 'string' || !row.appearanceId || !time(row.atMs))) {
      return result(null,'HMI 或周期边界缺证',{eligible:true});
    }
    if (gold.action) {
      const actions = fact[interaction];
      if (!Array.isArray(actions) || actions.some(row=>typeof row?.kind !== 'string' || !time(row.atMs))) {
        return result(null,'缺周期内交互证据',{eligible:true});
      }
      const response = actions.filter(row=>inCycle(row.atMs) && ['confirm','cancel'].includes(row.kind))
        .sort((a,b)=>a.atMs-b.atMs)[0]?.kind;
      const expected = ['confirm','cancel'].includes(gold.action) ? gold.action : undefined;
      if (response !== expected) return result(null,'实际交互和预登记周期分支不符',{eligible:true});
    }
    const unique = new Map();
    for (const {appearanceId,atMs} of events) {
      if (!inCycle(atMs)) continue;
      if (unique.has(appearanceId) && unique.get(appearanceId) !== atMs) {
        return result(null,'同一出现 ID 有冲突时间',{eligible:true});
      }
      unique.set(appearanceId,atMs);
    }
    const series = fact[transitions];
    const points = Array.isArray(series) && series.every(row=>typeof row?.petDetected === 'boolean' && time(row.atMs)) ?
      series.filter(row=>inCycle(row.atMs)).sort((a,b)=>a.atMs-b.atMs) : [];
    const modelChanges = points.length ? points.slice(1).filter((row,i)=>row.petDetected !== points[i].petDetected).length : null;
    const extra = Math.max(unique.size - gold.allowed,0);
    return result(extra,'实际 ' + unique.size + ' − 允许 ' + gold.allowed + '，额外 ' + extra + ' 次' +
      (modelChanges === null ? ' · 模型轨迹缺证' : ' · 模型状态变化 ' + modelChanges + ' 次'),{eligible:true,modelChanges});
  }

  const additional = {'false-alert':scoreFalseAlert,actuation:scoreActuation,latency:scoreLatency,repeat:scoreCycle};

  function score(program, fact, gold, windowMs) {
    if (Object.hasOwn(additional,program.measure)) return additional[program.measure](program,fact,gold,windowMs);
    const rule = program.mapping;
    const start = fact[rule.start], event = fact[rule.event], end = fact[rule.coverage], healthy = fact[rule.healthy];
    if (program.measure === 'miss' && gold !== true) return result(null,'缺少“应提醒”独立金标');
    if (fact.clockAligned !== true || !time(start) || !time(end) || end < start || !time(windowMs) || windowMs === 0) {
      return result(null,'起点、采证截至或时钟基准不完整');
    }
    if (healthy !== true) return result(null,'采证不完整，无法确认窗口内发生了什么');
    const deadline = start + windowMs;
    if (!time(deadline) || (event !== null && (!time(event) || event < start || event > end))) {
      return result(null,'目标事件缺失或时序无效');
    }
    const interval = event === null ? '' : intervalLabel(start,event);
    const inWindow = event !== null && event <= deadline;
    if (program.measure === 'miss') {
      if (inWindow) return result(0,interval + '，在 ' + windowMs + ' ms 窗内可见');
      if (end >= deadline) return result(1,event === null ?
        '采证覆盖 ' + (end - start) + ' ms，窗内无卡片' : interval + '，超过 ' + windowMs + ' ms');
      return result(null,'仅采到 ' + (end - start) + ' ms，观察窗为 ' + windowMs + ' ms');
    }
    const violation = proof.find(key => fact[key] === true);
    if (violation) return result(0,'观测到' + fields[violation].label);
    if (end < deadline) return result(null,'恢复观察窗尚未采全');
    if (!inWindow) return result(0,event === null ? '恢复窗内未见新业务闭环' : interval + '，超出恢复窗');
    if (fact.stateVerified === false) return result(0,'独立终态与预期不符');
    if (fact.stateVerified !== true || proof.some(key => fact[key] !== false)) {
      return result(null,'缺独立终态或禁止副作用的完整证明');
    }
    return result(1,interval + '，终态已验证，观察窗内无禁止副作用');
  }

  function validate(program, windowMs) {
    validateProgram(program);
    if (['latency','repeat'].includes(program.measure)) return verifyAdditional(program,null);
    if (!time(windowMs) || windowMs === 0 || windowMs > 3600000) throw Error('试算窗口须为 1–3600000 毫秒。');
    if (Object.hasOwn(additional,program.measure)) return verifyAdditional(program,windowMs);
    const isMiss = program.measure === 'miss', start = 10000;
    const mapping = program.mapping;
    const base = {[mapping.start]:start,[mapping.coverage]:start+windowMs+1,[mapping.healthy]:true,clockAligned:true,
      stateVerified:true,oldTaskReplayed:false,wrongControl:false,staleCard:false};
    const tests = [
      ['窗内出现目标', {[mapping.event]:start + Math.floor(windowMs / 2)},isMiss ? 0 : 1],
      ['恰好到达窗口边界', {[mapping.event]:start + windowMs},isMiss ? 0 : 1],
      ['超过观察窗', {[mapping.event]:start + windowMs + 1},isMiss ? 1 : 0],
      ['完整观察窗内无目标', {[mapping.event]:null},isMiss ? 1 : 0],
      ['采证缺失', {[mapping.event]:null,[mapping.healthy]:false},null]
    ];
    if (!isMiss) tests.push(['闭环后发现旧任务重放',{[mapping.event]:start,oldTaskReplayed:true},0]);
    return tests.map(([name,overrides,expected]) => {
      const actual = score(program,{...base,...overrides},true,windowMs);
      return {name,expected,actual:actual.value,calculation:actual.calculation,ok:expected===actual.value};
    });
  }

  function verifyAdditional(program,windowMs) {
    let gold, tests;
    if (program.measure === 'false-alert') {
      gold = {expectedReminder:false,petPresent:false};
      const base = {clockAligned:true,triggerAtMs:10000,reminderVisibleMs:null,hmiObservedUntilMs:10000+windowMs,
        hmiCaptureHealthy:true,modelPetDetected:false,gateReason:'NO_PET'};
      tests = [
        ['全窗内无卡片',base,0],['恰到边界出现卡片',{...base,reminderVisibleMs:10000+windowMs},1],
        ['模型识宠但 HMI 未显示',{...base,modelPetDetected:true},0],
        ['无 HMI 采证',{...base,hmiCaptureHealthy:false},null]
      ];
    } else if (program.measure === 'actuation') {
      gold = {zonesC:[24,24,24],acOn:true,airMode:'outside'};
      const confirmation = {healthy:true,requestId:'A',cardVisibleAtMs:10000,expiresAtMs:14000,clickedAtMs:11000,observedUntilMs:14500};
      const end = 11000 + windowMs;
      const reading = {atMs:end,zonesC:[24,24,24],acOn:true,airMode:'outside'};
      const hvacReadback = {source:'independent-hvac',healthy:true,requestId:'A',observedUntilMs:end+1,samples:[reading]};
      const base = {clockAligned:true,confirmation,command:{requestId:'A',sentAtMs:11000},hvacReadback};
      tests = [
        ['有效点击且三项车况按时生效',base,1,true],
        ['后排未到目标',{...base,hvacReadback:{...hvacReadback,samples:[{...reading,zonesC:[24,24,22]}]}},0,true],
        ['同请求车况迟到',{...base,hvacReadback:{...hvacReadback,samples:[{...reading,atMs:end+1}]}},0,true],
        ['已有效点击但缺独立读回',{...base,hvacReadback:null},null,true],
        ['点击超出有效期',{...base,confirmation:{...confirmation,clickedAtMs:14400}},null,false]
      ];
    } else if (program.measure === 'latency') {
      gold = {firstRecognizableMs:420};
      const base = {clockAligned:true,captureStartedMs:10000,reminderVisibleMs:11300,confirmedAtMs:12200,
        effectiveStateAtMs:14700,effectiveStateSource:'independent-hvac'};
      tests = [
        ['两个阶段有效，用户停留另算',base,[1300,2500],undefined,{dwell:900}],
        ['保留提醒段，执行段缺测',{...base,effectiveStateAtMs:null},[1300,null]],
        ['指令回执不能充当终态',{...base,effectiveStateSource:'ack'},[1300,null]],
        ['时钟未校准',{...base,clockAligned:false},[null,null]]
      ];
    } else {
      gold = {allowed:1,policyRef:'V2-DEMO-FREQ@1',conflict:false};
      const events = [20,30,40].map(atMs=>({appearanceId:String(atMs),atMs}));
      const base = {clockAligned:true,powerCycle:{onAtMs:10,offAtMs:50},
        hmiAppearances:{healthy:true,observedUntilMs:50,events}};
      tests = [
        ['实际 3 次、允许 1 次',base,2,true],
        ['同一可见事件重复回传',{...base,hmiAppearances:{...base.hmiAppearances,events:[events[0],events[0]]}},0,true],
        ['其他周期的卡片不计入',{...base,hmiAppearances:{...base.hmiAppearances,events:[events[0],{appearanceId:'other',atMs:50}]}},0,true],
        ['下电前采证中断',{...base,hmiAppearances:{...base.hmiAppearances,observedUntilMs:45}},null,true],
        ['频控冲突单列',base,null,false,{}, {...gold,conflict:true,allowed:null}]
      ];
    }
    return tests.map(([name,fact,expected,eligible,detail = {},reference = gold])=>{
      const actual = score(program,fact,reference,windowMs);
      return {name,expected,actual:actual.value,eligible,calculation:actual.calculation,
        ok:JSON.stringify(actual.value) === JSON.stringify(expected) &&
          (eligible === undefined || actual.eligible === eligible) &&
          Object.keys(detail).every(key=>actual[key] === detail[key])};
    });
  }

  function aggregate(measure,items) {
    if (measure === 'false-alert') {
      const groups = new Map(), noPet = [];
      for (const item of items) {
        const gold = item.trial.gold;
        if (!groups.has(gold.group)) groups.set(gold.group,[]);
        groups.get(gold.group).push(item);
        if (gold.petPresent === false) noPet.push(item);
      }
      const modelValid = noPet.filter(item=>typeof item.modelDetected === 'boolean');
      return {groups:[...groups].map(([group,rows])=>({group,planned:rows.length,wrong:rows.filter(row=>row.value === 1).length,
        unknown:rows.filter(row=>row.value === null).length})), vendor:{planned:noPet.length,valid:modelValid.length,
        wrong:modelValid.filter(item=>item.modelDetected).length}};
    }
    if (measure === 'actuation') {
      const eligible = items.filter(item=>item.eligible === true);
      return {denominator:eligible.length,passed:eligible.filter(item=>item.value === 1).length,
        unknown:eligible.filter(item=>item.value === null).length,
        excluded:items.filter(item=>item.eligible === false).length,unconfirmed:items.filter(item=>item.eligible == null).length};
    }
    if (measure === 'repeat') {
      const eligible = items.filter(item=>item.trial.gold?.conflict !== true);
      const valid = eligible.filter(item=>Number.isInteger(item.value));
      const worst = valid.reduce((max,item)=>!max || item.value > max.value ? item : max,null);
      return {denominator:eligible.length,conflicts:items.length - eligible.length,unknown:eligible.length - valid.length,
        extra:valid.reduce((sum,item)=>sum+item.value,0),violations:valid.filter(item=>item.value > 0).length,
        worst:worst?.value > 0 ? worst : null};
    }
    return null;
  }

  function replay(schema, old, windowMs) {
    const start = 10000;
    if (schema === rules.miss.schema) {
      const covered = old.fullHmiWindow === true || typeof old.cardMs === 'number';
      return {captureStartedMs:start,reminderVisibleMs:typeof old.cardMs === 'number' ? start + old.cardMs : null,
        hmiObservedUntilMs:covered ? start + Math.max(windowMs,old.cardMs || 0) : start,
        hmiCaptureHealthy:covered,clockAligned:true};
    }
    if (schema === rules.recovery.schema) {
      const covered = typeof old.recovered === 'boolean' && typeof old.recoveryMs === 'number';
      return {dependencyRestoredMs:start,newFlowClosedMs:old.recovered ? start + old.recoveryMs : null,
        recoveryObservedUntilMs:covered ? start + Math.max(windowMs,old.recoveryMs) : start,
        recoveryTraceHealthy:covered,clockAligned:true,stateVerified:old.recovered === true,
        oldTaskReplayed:old.replayed,wrongControl:old.wrongControl,staleCard:old.staleCard};
    }
    throw Error('外部回放尚不支持所选观测结构。');
  }

  window.A84MetricEngine = {fields,mappingLabels,supported,definition,configure,validateProgram,score,validate,replay,aggregate,
    schemas:()=>Object.values(rules).map(rule=>rule.schema)};
})();
