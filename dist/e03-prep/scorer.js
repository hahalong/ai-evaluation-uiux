/* Scorer entry point. Delegate the metric itself to the existing E03 calculator. */
(() => {
  'use strict';
  const C = E03Contract;
  const {mapping} = A84MetricEngine.definition('actuation');
  const program = A84MetricEngine.configure('actuation',mapping);
  function scoreTrial(artifact, gold, observationMs) {
    C.requireField(artifact?.evidence?.schema===C.evidenceSchema && artifact.evidenceId &&
      gold?.sampleId===artifact.sampleId && Array.isArray(gold.zonesC) &&
      gold.zonesC.length===3 && gold.zonesC.every(Number.isFinite) &&
      typeof gold.acOn==='boolean' && ['inside','outside'].includes(gold.airMode) &&
      C.time(observationMs) && observationMs>0, 'INVALID_SCORE_INPUT', '证据结构、金标样本或观察窗不匹配。');
    const result = A84MetricEngine.score(program,artifact.evidence,gold,observationMs);
    const verdict = result.eligible===false ? 'EXCLUDED' : result.value===null ? 'UNKNOWN' : result.value===1 ? 'PASS' : 'FAIL';
    return {verdict,value:result.value,eligible:result.eligible,reason:result.calculation,evidenceId:artifact.evidenceId};
  }
  globalThis.E03ActuationScorer = {scoreTrial};
})();
