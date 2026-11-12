/* E03's local handoff. All timestamps share the trial's relative millisecond clock. */
(() => {
  'use strict';
  const scope = 'DEMO_REPLAY_ONLY';
  const evidenceSchema = 'bench.confirmed-hvac@1';
  const dispatchSchema = 'e03.bench-dispatch@1';
  const reportSchema = 'e03.preparation-report@1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const time = value => Number.isSafeInteger(value) && value >= 0;
  const ref = (id, name, kind, file, entry, contract) => ({id, name, kind, file, entry, contract});
  const executor = ref('agentcompass-bench-replay@2', 'E03 台架执行器', '执行器', 'executor.js',
    'createExecutor → submit / query / run / cancel', dispatchSchema + ' → ' + evidenceSchema);
  const adapter = ref('bench-aidl-signals@4', 'E03 台架信号适配器', '适配器', 'adapter.js',
    'normalize(raw, requestId)', 'HMI、控车回执、独立车况 → ' + evidenceSchema);
  const scorer = ref('confirmed-hvac-state@1', '有效确认与独立车况计算器', '评分实现', 'scorer.js',
    'scoreTrial(evidence, gold, observationMs)', evidenceSchema + ' + 独立金标 → 判定、分母资格与依据');
  function requireField(ok, code, message) {
    if (!ok) throw Object.assign(new Error(message), {code});
  }

  globalThis.E03Contract = {scope, evidenceSchema, dispatchSchema, reportSchema,
    executor, adapter, scorer, clone, time, requireField};
})();
