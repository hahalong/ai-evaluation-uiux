/* Re-run every acceptance criterion against the three delivered entries. */
(() => {
  'use strict';
  const C = E03Contract, F = E03PreparationFixtures;
  const assertions = (got,want) => {
    if (JSON.stringify(got)!==JSON.stringify(want)) {
      throw Error('预期 '+JSON.stringify(want)+'，实际 '+JSON.stringify(got));
    }
  };
  function execute(sample, scenario='baseline') {
    const driver = F.createDriver(scenario), executor = E03BenchExecutor.createExecutor(driver);
    const dispatch = F.dispatch(sample,'E03-PREP/'+sample.id);
    const job = executor.run(executor.submit(dispatch).id);
    const gold = F.reference.rows.find(row=>row.sampleId===sample.id);
    const score = job.status==='SUCCEEDED' ? E03ActuationScorer.scoreTrial(job.artifact,gold,dispatch.observationMs) : null;
    return {dispatch,job,gold,score};
  }
  function verify(generatedAt=new Date().toISOString()) {
    const checks=[];
    function check(id,name,expected,run) {
      try {
        const actual=run();
        assertions(actual,expected);
        checks.push({id,name,expected,actual,ok:true});
      } catch(err) {
        checks.push({id,name,expected,actual:err.message,ok:false});
      }
    }
    const sample=F.samples[1];
    let trace=null;
    check('adapter-fields','TEMP-02 字段转换及独立来源','240/240/220 → 24/24/22 ℃，外循环',()=>{
      trace=execute(sample);
      const raw=trace.job.artifact.raw.observer, ev=trace.job.artifact.evidence.hvacReadback;
      assertions(ev.source,'independent-hvac');
      assertions(ev.requestId,trace.job.artifact.evidence.confirmation.requestId);
      return raw.readings[0].zone_deci_c.join('/')+' → '+ev.samples[0].zonesC.join('/')+' ℃，'+
        (ev.samples[0].airMode==='outside'?'外循环':'内循环');
    });
    for (const [scenario,label,verdict,eligible] of [
      ['on-deadline','截止时刻三区、空调、循环到位','PASS',true],
      ['baseline','TEMP-02 后排未达标','FAIL',true],
      ['late','截止后 1 ms 才全部到位','FAIL',true],
      ['missing','已点击且指令受理，缺独立读回','UNKNOWN',true],
      ['expired','确认点击超出卡片有效期','EXCLUDED',false]
    ]) {
      const labelResult=eligible?'计入分母':'排除分母';
      check(scenario,label,verdict+' · '+labelResult,()=>{
        const {score}=execute(sample,scenario);
        return score.verdict+' · '+(score.eligible?'计入分母':'排除分母');
      });
    }
    check('request-mismatch','拒收不同请求的独立车况','REQUEST_MISMATCH',()=>execute(sample,'wrong-request').job.error?.code);
    check('dispatch-scope','执行端拒收独立金标','INVALID_DISPATCH',()=>{
      const worker=E03BenchExecutor.createExecutor(F.createDriver());
      try { worker.submit({...F.dispatch(sample,'E03-PREP/gold'),gold:F.reference.rows[1]}); }
      catch(err) {return err.code;}
    });
    check('same-attempt','重发同一尝试先查回执，采集一次','SUCCEEDED · 1 次采集',()=>{
      const driver=F.createDriver(), worker=E03BenchExecutor.createExecutor(driver);
      const request=F.dispatch(sample,'E03-PREP/duplicate');
      const submitted=worker.submit(request);
      worker.run(submitted.id);
      worker.run(worker.submit(request).id);
      return worker.query(submitted.id).status+' · '+driver.stats().collectCount+' 次采集';
    });
    check('attempt-conflict','同一尝试更改输入时拦截','ATTEMPT_CONFLICT',()=>{
      const worker=E03BenchExecutor.createExecutor(F.createDriver()), request=F.dispatch(sample,'E03-PREP/conflict');
      worker.submit(request);
      try { worker.submit({...request,observationMs:5001}); } catch(err) {return err.code;}
    });
    check('cancel-before-run','排队时取消不触发采集','CANCELLED · 0 次采集',()=>{
      const driver=F.createDriver(), worker=E03BenchExecutor.createExecutor(driver);
      const job=worker.submit(F.dispatch(sample,'E03-PREP/cancel'));
      worker.cancel(job.id);
      return worker.run(job.id).status+' · '+driver.stats().collectCount+' 次采集';
    });
    check('cleanup','采证异常后释放台架','FAILED · RELEASED',()=>{
      const {job}=execute(sample,'driver-error');
      return job.status+' · '+job.cleanup;
    });
    check('quarantine','清理失败时保留隔离状态','FAILED · QUARANTINED',()=>{
      const {job}=execute(sample,'release-error');
      return job.status+' · '+job.cleanup;
    });
    check('full-v2','V2 四组样本复算','2/4 = 50%，有效覆盖 3/4',()=>{
      const scores=F.samples.map(row=>execute(row).score);
      const aggregate=A84MetricEngine.aggregate('actuation',scores);
      const coverage=scores.filter(s=>s.value!==null).length;
      return aggregate.passed+'/'+aggregate.denominator+' = '+(aggregate.passed/aggregate.denominator*100)+'%，有效覆盖 '+coverage+'/'+scores.length;
    });
    const build=E03PreparationBuild;
    const at=Date.parse(generatedAt);
    return {schema:C.reportSchema, scope:C.scope, caseId:'E03',
      reportId:'E03-'+build.fingerprint.slice(0,8)+'-'+at.toString(36), generatedAt,
      build, sampleId:sample.id, referenceVersion:F.reference.version, observationMs:5000,
      ok:checks.every(item=>item.ok),checks,trace};
  }
  function bindings() {
    return [C.executor,C.adapter,C.scorer].map(({file,...item})=>({
      ...item,source:'e03-prep/'+file,version:item.id.split('@')[1],
      digest:E03PreparationBuild.files[file]
    }));
  }
  function review(report, registeredBindings) {
    C.requireField(report?.schema===C.reportSchema && report.scope===C.scope && report.caseId==='E03' &&
      typeof report.generatedAt==='string' && Number.isFinite(Date.parse(report.generatedAt)) &&
      JSON.stringify(registeredBindings)===JSON.stringify(bindings()) &&
      report.build?.fingerprint===E03PreparationBuild.fingerprint,
      'PREPARATION_VERSION_MISMATCH','报告用例、环境或制品摘要与登记组合不一致。');
    const replay=verify(report.generatedAt);
    C.requireField(replay.ok && JSON.stringify(report)===JSON.stringify(replay),
      'PREPARATION_VERIFICATION_FAILED','报告与本地复跑结果不一致，或存在未通过项。');
    return {ok:true,scope:C.scope,at:new Date().toISOString(),reportId:replay.reportId,
      reportFingerprint:replay.build.fingerprint,checks:replay.checks,
      signature:JSON.stringify(registeredBindings)};
  }
  globalThis.E03Preparation = {verify,bindings,review};
})();
