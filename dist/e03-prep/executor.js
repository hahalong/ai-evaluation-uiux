/* Local Worker wrapper. Driver handles the resource and returns the recorded signals. */
(() => {
  'use strict';
  const C = E03Contract;
  const {requireField: check, clone} = C;
  function createExecutor(driver) {
    const jobs = new Map();
    const get = id => {
      const job = jobs.get(id);
      check(job, 'UNKNOWN_ATTEMPT', '未找到尝试。');
      return job;
    };
    function submit(request) {
      check(request?.schema===C.dispatchSchema && request.scope===C.scope && request.caseId==='E03' &&
        ['trialId','attemptId','sampleId'].every(k=>typeof request[k]==='string' && request[k]) &&
        C.time(request.observationMs) && request.observationMs>0 &&
        typeof request.input?.videoRef==='string' && ['cabinC','outsideC'].every(k=>Number.isFinite(request.input[k])),
        'INVALID_DISPATCH', '派工缺少 E03 试次、尝试、样本或观察窗。');
      const keys = ['schema','scope','caseId','trialId','attemptId','sampleId','observationMs','input'];
      check(Object.keys(request).every(k=>keys.includes(k)) &&
        Object.keys(request.input).every(k=>['videoRef','cabinC','outsideC'].includes(k)),
        'INVALID_DISPATCH', '派工只接受声明的输入字段。');
      const id = JSON.stringify([request.trialId,request.attemptId]);
      const {videoRef,cabinC,outsideC}=request.input;
      const normalized = {...Object.fromEntries(keys.slice(0,-1).map(k=>[k,request[k]])),input:{videoRef,cabinC,outsideC}};
      const existing = jobs.get(id);
      if (existing) {
        check(JSON.stringify(existing.request)===JSON.stringify(normalized), 'ATTEMPT_CONFLICT', '同一尝试的派工内容不同。');
        return clone(existing);
      }
      const job = {id, request:normalized, status:'QUEUED', cleanup:'NOT_ACQUIRED', artifact:null, error:null};
      jobs.set(id,job);
      return clone(job);
    }
    function query(id) { return clone(get(id)); }
    function cancel(id) {
      const job = get(id);
      if (job.status==='QUEUED') job.status='CANCELLED';
      return clone(job);
    }
    function run(id) {
      const job = get(id);
      if (job.status!=='QUEUED') return clone(job);
      const requestId = 'HVAC-' + encodeURIComponent(job.request.trialId) + '/' + encodeURIComponent(job.request.attemptId);
      job.status='RUNNING';
      let lease;
      try {
        lease = driver.acquire();
        driver.reset(lease);
        const raw = driver.collect(lease,job.request,requestId);
        const evidence = E03BenchAdapter.normalize(raw,requestId);
        job.artifact = {evidenceId:requestId+'/evidence', trialId:job.request.trialId,
          attemptId:job.request.attemptId, sampleId:job.request.sampleId, raw, evidence};
        job.status='SUCCEEDED';
      } catch (err) {
        job.status='FAILED';
        job.error={code:err.code || 'DRIVER_FAILED',message:err.message};
      } finally {
        if (lease) {
          try {
            driver.release(lease);
            job.cleanup='RELEASED';
          } catch (err) {
            job.cleanup='QUARANTINED';
            job.status='FAILED';
            job.error={code:'CLEANUP_FAILED',message:err.message};
          }
        }
      }
      return clone(job);
    }
    return {submit,query,cancel,run};
  }
  globalThis.E03BenchExecutor = {createExecutor};
})();
