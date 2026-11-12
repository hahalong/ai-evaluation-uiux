/* Adapter for recorded bench signals. Preserve command ACK and observer data separately. */
(() => {
  'use strict';
  const C = E03Contract;
  const {requireField: check, time} = C;
  const hasId = (record, id) => record?.request_id === id;
  const zones = value => Array.isArray(value) && value.length === 3 && value.every(Number.isSafeInteger);
  function normalize(raw, requestId) {
    const {hmi, tool, observer} = raw || {};
    check(typeof raw?.clock_aligned === 'boolean' && hmi?.source === 'bench-hmi', 'INVALID_SIGNAL', '缺少 HMI 来源或时钟标志。');
    for (const signal of [hmi, tool, observer].filter(Boolean)) {
      check(hasId(signal, requestId), 'REQUEST_MISMATCH', '信号请求号与本试次不一致。');
    }
    check(time(hmi.card_ms) && time(hmi.expires_ms) && time(hmi.capture_until_ms) &&
      (hmi.click_ms === null || time(hmi.click_ms)) && typeof hmi.healthy === 'boolean',
      'INVALID_SIGNAL', 'HMI 事件字段不完整。');
    if (tool) {
      check(tool.source === 'agent-tool-trace' && time(tool.sent_ms) && zones(tool.target_deci_c) &&
        typeof tool.accepted === 'boolean', 'INVALID_SIGNAL', '控车回执结构不符。');
    }
    if (observer) {
      check(observer.source === 'independent-hvac' && time(observer.capture_until_ms) &&
        typeof observer.healthy === 'boolean' && Array.isArray(observer.readings) &&
        observer.readings.every(r => time(r.at_ms) && zones(r.zone_deci_c) &&
          [0, 1].includes(r.ac_bit) && [0, 1].includes(r.recirc_bit)), 'INVALID_SIGNAL', '独立车况字段或来源不符。');
    }
    return {
      schema:C.evidenceSchema, clockAligned:raw.clock_aligned,
      confirmation:{requestId, cardVisibleAtMs:hmi.card_ms, expiresAtMs:hmi.expires_ms,
        clickedAtMs:hmi.click_ms, observedUntilMs:hmi.capture_until_ms, healthy:hmi.healthy},
      command:tool ? {requestId, sentAtMs:tool.sent_ms, requestedZonesC:tool.target_deci_c.map(v=>v/10), ack:tool.accepted} : null,
      hvacReadback:observer ? {requestId, source:observer.source, healthy:observer.healthy,
        observedUntilMs:observer.capture_until_ms, samples:observer.readings.map(r=>({
          atMs:r.at_ms, zonesC:r.zone_deci_c.map(v=>v/10), acOn:r.ac_bit===1, airMode:r.recirc_bit===1?'inside':'outside'
        }))} : null
    };
  }
  globalThis.E03BenchAdapter = {normalize};
})();
