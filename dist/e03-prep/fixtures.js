/* V2 E03 sample metadata and a recording fixture driver for local verification. */
(() => {
  'use strict';
  const C = E03Contract;
  const samples = A84V2Fixtures.thermal.map(({cabinC,outsideC},index)=>({
    id:'TEMP-0'+(index+1), input:{videoRef:'fixture://pet/01',cabinC,outsideC}
  }));
  const reference = {
    version:'e03-v2-gold-fixture@1',
    rows:[22,24,26,24].map((target,i)=>({
      sampleId:samples[i].id,zonesC:[target,target,target],acOn:true,airMode:'outside'
    }))
  };
  function dispatch(sample, trialId) {
    return {schema:C.dispatchSchema,scope:C.scope,caseId:'E03',trialId,attemptId:'attempt-1',
      sampleId:sample.id,observationMs:5000,input:C.clone(sample.input)};
  }
  function rawSignals(request, requestId, scenario) {
    const sample = samples.find(row=>row.id===request.sampleId);
    C.requireField(sample && JSON.stringify(sample.input)===JSON.stringify(request.input),
      'MISSING_FIXTURE', '未找到同版本的样本回放。');
    const [,fact] = A84V2Fixtures.replay.actuation({id:request.trialId,parameters:request.input});
    const {confirmation,command,hvacReadback} = fact;
    const observer = hvacReadback ? {
      source:'independent-hvac', request_id:requestId, healthy:hvacReadback.healthy,
      capture_until_ms:hvacReadback.observedUntilMs,
      readings:hvacReadback.samples.map(r=>({at_ms:r.atMs,zone_deci_c:r.zonesC.map(v=>v*10),ac_bit:r.acOn?1:0,
        recirc_bit:r.airMode==='inside'?1:0}))
    } : null;
    const raw = {
      clock_aligned:fact.clockAligned,
      hmi:{source:'bench-hmi',request_id:requestId,card_ms:confirmation.cardVisibleAtMs,
        expires_ms:confirmation.expiresAtMs,click_ms:confirmation.clickedAtMs,
        capture_until_ms:confirmation.observedUntilMs,healthy:confirmation.healthy},
      tool:{source:'agent-tool-trace',request_id:requestId,sent_ms:command.sentAtMs,
        target_deci_c:command.requestedZonesC.map(v=>v*10),accepted:true},
      observer
    };
    if (scenario==='on-deadline' || scenario==='late') {
      raw.observer.readings[0].at_ms=raw.hmi.click_ms+request.observationMs+(scenario==='late'?1:0);
      raw.observer.readings[0].zone_deci_c=[240,240,240];
    }
    if (scenario==='missing') raw.observer=null;
    if (scenario==='expired') raw.hmi.click_ms=14400;
    if (scenario==='wrong-request') raw.observer.request_id='OTHER-REQUEST';
    return raw;
  }
  function createDriver(scenario='baseline') {
    let held=false, count=0;
    return {
      acquire() { if(held)throw Error('台架被占用。');held=true;return 'lease-e03'; },
      reset() { if(!held)throw Error('需先取得台架。'); },
      collect(_lease,request,requestId) {
        if(!held)throw Error('台架未领取。');
        count++;
        if(scenario==='driver-error')throw Error('模拟采证通道故障。');
        return rawSignals(request,requestId,scenario);
      },
      release() { if(scenario==='release-error')throw Error('模拟台架复位失败。');held=false; },
      stats() { return {held,collectCount:count}; }
    };
  }
  globalThis.E03PreparationFixtures = {samples,reference,dispatch,createDriver};
})();
