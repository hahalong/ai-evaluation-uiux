/* Local sample inputs and synthetic bench observations for V2 rows 152–155. */
(() => {
  'use strict';

  const policy = 'V2-DEMO-FREQ@1';
  const negativeGroups = {
    no_pet:'真实无宠', comfortable:'有宠 · 适温', disabled:'有宠 · 开关关闭',
    cancel_limit:'有宠 · 已达取消上限', cooldown:'有宠 · 冷却期'
  };
  const negative = [
    ['empty','空舱','no_pet',false,false,'NO_PET'],
    ['toy','玩偶干扰','no_pet',true,true,'ALLOW'],
    ['screen','屏幕图像','no_pet',true,false,'NO_PET'],
    ['comfortable','有宠 · 22℃','comfortable',true,false,'COMFORTABLE'],
    ['disabled','有宠 · 开关关闭','disabled',true,false,'DISABLED'],
    ['cancel-limit','有宠 · 已达取消上限','cancel_limit',true,false,'CANCEL_LIMIT'],
    ['cooldown','有宠 · 冷却期','cooldown',true,null,'COOLDOWN']
  ];
  const thermal = [
    {cabinC:30,outsideC:32,target:22},
    {cabinC:30,outsideC:31,target:24},
    {cabinC:20,outsideC:10,target:26},
    {cabinC:20,outsideC:11,target:24}
  ];
  const cycleActions = {
    confirm:'确认', cancel:'取消', pending:'保留 Pending', no_pet:'E02 无宠对照', conflict:'规则冲突'
  };
  const cycles = [
    ['confirm','确认后继续观察','confirm',1,[15000]],
    ['cancel','取消后重复提醒','cancel',1,[15000,32000,49000]],
    ['pending','保留 Pending','pending',1,[15000,15000]],
    ['no-pet','E02 空舱对照','no_pet',0,[]],
    ['conflict','开门与冷却口径冲突','conflict',null,[15000,35000]]
  ];
  const sampleId = (prefix,index) => prefix + '-' + String(index + 1).padStart(2,'0');
  const specs = {
    'false-alert': {
      sampleTitle:'创建无宠与有宠抑制清单', goldTitle:'配对不应提醒金标',
      sampleHelp:'真实无宠组和四类有宠抑制组分开登记。每段素材保留场景，台架按组设置对应前置条件。',
      goldHelp:'按独立视频标注和业务决策表填写有无宠、是否应提醒、应走的门控。只有真实无宠组进入供应商误报统计。',
      sampleHeaders:['sample_id','video_ref','slice','group'], goldHeaders:['sample_id','pet_present','expected_reminder','expected_reason','reviewer'],
      basis:'V2 第 152 行 · 独立有无宠标注及抑制决策表',
      sampleRows:() => negative.map(([key,slice,group],i)=>[sampleId('NEG',i),'fixture://negative/'+key,slice,group]),
      goldRow:sample=>[sample.id,sample.parameters.group !== 'no_pet',false,expectedReason(sample.parameters.group),'演练复核员']
    },
    actuation: {
      sampleTitle:'创建四组温度与有效确认样本', goldTitle:'配对三区与实际动作目标',
      sampleHelp:'从 E01 清单引用同一稳定有宠视频。每行新建会话，设置舱温与外温，在卡片有效期内点击确认。',
      goldHelp:'业务复核人按独立决策表填写三区目标、空调开关、循环模式。判定读取实际车况。',
      sampleHeaders:['sample_id','source_sample_id','slice','cabin_c','outside_c'],
      goldHeaders:['sample_id','left_c','right_c','rear_c','ac_on','air_mode','reviewer'],
      basis:'V2 第 153 行 · 四组温度及确认后的三区与适用动作',
      source:'miss', sourceLabel:'复用的 E01 有宠清单',
      sampleRows:source=>thermal.map(({cabinC,outsideC},i)=>
        [sampleId('TEMP',i),source?.[0]?.id || 'PET-01',cabinC+'/'+outsideC+'℃',cabinC,outsideC]),
      goldRow:sample=>{
        const {target} = thermal.find(t=>t.cabinC === sample.parameters.cabinC && t.outsideC === sample.parameters.outsideC);
        return [sample.id,target,target,target,true,'outside','演练复核员'];
      }
    },
    latency: {
      sampleTitle:'复用 E01 同批有宠视频', goldTitle:'配对首次可识别时刻标注',
      sampleHelp:'引用 E01 样本的同一版本和已选范围。执行时采用单车单并发。',
      goldHelp:'标注人员给出视频内首次可识别偏移，供对齐和复核。两段时延分别用当次采图与有效点击计时。',
      goldHeaders:['sample_id','first_recognizable_ms','reviewer'], basis:'V2 第 154 行 · 视频内首次可识别标注和统一时钟',
      source:'miss', sourceLabel:'复用的 E01 有宠清单', reuse:true,
      goldRow:(sample,index)=>[sample.id,[420,780,900,660,540][index] ?? 500,'演练复核员']
    },
    repeat: {
      sampleTitle:'创建独立上电周期清单', goldTitle:'配对每周期允许提醒次数',
      sampleHelp:'按确认、取消、保留 Pending 登记 60 秒演练片段，另引用 E02 无宠对照。频控冲突场景单列。',
      goldHelp:'业务复核人按冻结频控规则填写每周期允许次数。冲突待裁决行保留规则依据，留空允许次数。',
      sampleHeaders:['sample_id','video_ref','slice','action','source_sample_id'],
      goldHeaders:['sample_id','allowed_reminders','policy_ref','conflict','reviewer'],
      basis:'V2 第 155 行 · 冻结频控演练规则 ' + policy,
      source:'false-alert', sourceLabel:'复用的 E02 无宠对照清单',
      sampleRows:source=>cycles.map(([key,slice,action],i)=>[
        sampleId('CYCLE',i), action === 'no_pet' ? '' : 'fixture://cycle/'+key,slice,action,
        action === 'no_pet' ? source?.find(row=>row.parameters?.group === 'no_pet')?.id || 'NEG-01' : ''
      ]),
      goldRow:sample=>{
        const [, , action,allowed] = cycles.find(row=>row[2]===sample.parameters.action);
        return [sample.id,allowed ?? '',policy,action === 'conflict','演练复核员'];
      }
    }
  };

  function expectedReason(group) {
    return {no_pet:'NO_PET',comfortable:'COMFORTABLE',disabled:'DISABLED',cancel_limit:'CANCEL_LIMIT',cooldown:'COOLDOWN'}[group];
  }

  function negativeObservation(trial) {
    const fixture = negative.find(([key])=>trial.inputRef === 'fixture://negative/'+key);
    if (!fixture) throw Error('无宠与抑制场景缺少可回放片段。');
    const [, , , modelPetDetected,card,gateReason] = fixture;
    return [card === null ? 'UNKNOWN' : card ? 'FAILED' : 'SUCCEEDED',
      {clockAligned:true,triggerAtMs:10000,reminderVisibleMs:card ? 11000 : null,
        hmiObservedUntilMs:card === null ? 12000 : 15000,hmiCaptureHealthy:card !== null,modelPetDetected,gateReason},
      card === null ? '冷却组 HMI 采集缺失' : card ? '台架采集到卡片' : ''];
  }

  function thermalObservation(trial) {
    const i = thermal.findIndex(row=>row.cabinC === trial.parameters?.cabinC && row.outsideC === trial.parameters?.outsideC);
    if (i < 0) throw Error('温度组合超出 V2 台架演练范围。');
    const requestId = 'HVAC-' + trial.id;
    const t = thermal[i].target;
    const confirmation = {requestId,cardVisibleAtMs:10000,expiresAtMs:14000,clickedAtMs:11000,observedUntilMs:14500,healthy:true};
    const command = {requestId,sentAtMs:11100,requestedZonesC:[t,t,t]};
    const readback = i === 3 ? null : {requestId,source:'independent-hvac',healthy:true,observedUntilMs:18000,
      samples:[{atMs:11000+[1800,2600,2200][i],zonesC:[t,t,i === 1 ? 22 : t],acOn:true,airMode:'outside'}]};
    return [i === 3 ? 'UNKNOWN' : i === 1 ? 'FAILED' : 'SUCCEEDED',
      {clockAligned:true,confirmation,command,hvacReadback:readback},i === 3 ? '未采到独立车况读回' : ''];
  }

  function latencyObservation(trial) {
    const clip = /^fixture:\/\/pet\/0([1-5])$/.exec(trial.inputRef || '');
    const sample = /^PET-0([1-5])$/.exec(trial.sampleId);
    const i = Number((clip || sample)?.[1]) - 1;
    if (!Number.isInteger(i)) throw Error('时延样本须引用 E01 有宠片段。');
    const captureStartedMs = 10000, reminderVisibleMs = captureStartedMs + [1230,1550,1290,990,1510][i];
    const confirmedAtMs = i === 3 ? null : reminderVisibleMs + [860,950,900,0,700][i];
    const effectiveStateAtMs = [2,3].includes(i) ? null : confirmedAtMs + [2090,2700,0,0,1800][i];
    return [i === 3 ? 'UNKNOWN' : i === 2 ? 'TIMED_OUT' : 'SUCCEEDED',
      {clockAligned:i !== 3,captureStartedMs,modelOutputAtMs:10550,omsReceivedAtMs:10730,reminderVisibleMs,
        confirmedAtMs,effectiveStateAtMs,effectiveStateSource:effectiveStateAtMs === null ? null : 'independent-hvac'},
      i === 3 ? '时钟未校准' : i === 2 ? '独立终态测点缺失' : ''];
  }

  function cycleObservation(trial) {
    const action = trial.parameters?.action;
    const fixture = cycles.find(row=>row[2] === action);
    if (!fixture) throw Error('上电周期缺少可回放的交互方式。');
    const [, , , , timestamps] = fixture;
    return [action === 'cancel' ? 'FAILED' : 'SUCCEEDED', {
      clockAligned:true,powerCycle:{onAtMs:10000,offAtMs:70000},
      hmiAppearances:{healthy:true,observedUntilMs:70000,events:timestamps.map(atMs=>({appearanceId:'card-'+atMs,atMs}))},
      interactionEvents:[{kind:action,atMs:20000}],
      modelTransitions:(action === 'no_pet' ? [false] : [true,false,true]).map((petDetected,i)=>({petDetected,atMs:12000+i*8000}))
    }, ''];
  }

  const replay = {'false-alert':negativeObservation,actuation:thermalObservation,latency:latencyObservation,repeat:cycleObservation};
  window.A84V2Fixtures = {specs,negativeGroups,negative,thermal,cycleActions,cycles,replay,expectedReason};
})();
