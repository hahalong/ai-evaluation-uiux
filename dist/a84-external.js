(() => {
  'use strict';
  const M = MultiEnvCore, A = AgentEvaluation;
  const el = id => document.getElementById(id);
  let manifest = null, output = null, bench = false, examples = new Map();
  const status = text => {el('status').textContent = text;};

  function show(data) {
    if (data?.scope !== 'local-rehearsal' || typeof data.id !== 'string') throw Error('请选择本地回放范围内的派工清单。');
    bench = data.schema === A.benchSchema && data.environment === 'bench' && Array.isArray(data.entries);
    const ripple = data.schema === 'baic.prototype.ripple-handoff/v1' && data.environment === 'cloud' &&
      typeof data.dependencies?.script?.sha256 === 'string' && data.trials?.length === 1;
    if (!bench && !ripple) throw Error('当前工具接收台架或 Ripple 的派工文件。');
    const rows = bench ? data.entries.map(entry => [entry.caseId,entry.caseRef,entry.observationSchema || '台架输入、HMI 与适用独立状态',entry.trials.length]) :
      [[data.trials[0].caseId,data.trials[0].caseRef,data.dependencies.script.name,data.trials.length]];
    el('job-title').textContent = bench ? '台架采集 · 本地回放' : 'Ripple 脚本 · 本地回放';
    const summary = [['派工单',data.id],['子计划',data.childPlanId],['环境',M.environments[data.environment]],
      ['被测对象版本',typeof data.objectVersion === 'string' ? data.objectVersion : data.objectVersion?.id],
      ['适配器',data.profile?.adapterVersion],['执行器',data.profile?.executorVersion],
      ...(bench ? [] : [['冻结断言',data.scoring?.ruleRef],['脚本 SHA-256',data.dependencies.script.sha256]])];
    el('summary').replaceChildren(...summary.flatMap(([name,value]) => {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = name;
      dd.textContent = value || '未提供';
      return [dt,dd];
    }));
    el('trials').replaceChildren(...rows.map(row => {
      const tr = document.createElement('tr');
      for (const value of row) tr.insertCell().textContent = value;
      return tr;
    }));
    el('execute').textContent = bench ? '回放台架采集' : '回放 Ripple 运行';
    el('job').hidden = false;
    manifest = data;
  }

  el('manifest').addEventListener('change', async event => {
    manifest = null;
    output = null;
    el('download').disabled = true;
    el('job').hidden = true;
    el('observation').hidden = true;
    el('observation').open = false;
    el('result').textContent = '';
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) throw Error('派工文件超出本地工具的 2 MB 上限。');
      show(JSON.parse(await file.text()));
      status('已读取平台派工。执行回放后下载结果，再返回平台上传。');
    } catch (error) {status(error.message);}
  });

  el('execute').addEventListener('click', () => {
    if (!manifest) return;
    try {
      const result = bench ? A.benchFixture(manifest) : M.sampleRipple(manifest);
      const count = bench ? result.rows.length : result.results.length;
      output = result;
      el('download').disabled = false;
      el('result').textContent = result.externalRunId + ' · 已生成 ' + count + ' 条本地观测。';
      if (bench) showObservations(result.rows);
    } catch (error) {status(error.message);}
  });

  function showObservations(rows) {
    const byId = new Map(rows.filter(row=>row.factSchema).map(row=>[row.trialId,row]));
    examples = new Map();
    for (const entry of manifest.entries) {
      const samples = entry.trials.map(trial=>byId.get(trial.id)).filter(Boolean);
      if (samples.length) examples.set(entry.caseId,{samples,measure:entry.measure});
    }
    el('observation').hidden = !examples.size;
    if (!examples.size) return;
    el('observation-case').replaceChildren(...[...examples.keys()].map(id=>new Option(id,id)));
    selectObservationCase();
  }

  function selectObservationCase() {
    const {samples,measure} = examples.get(el('observation-case').value);
    el('observation-sample').replaceChildren(...samples.map(row=>new Option(row.sampleId,row.trialId)));
    el('observation-description').textContent = MeasureRehearsal.getRule(measure).evidence;
    selectObservationSample();
  }

  function selectObservationSample() {
    const group = examples.get(el('observation-case').value);
    const sample = group.samples.find(row=>row.trialId === el('observation-sample').value);
    el('observation-json').textContent = JSON.stringify({样本:sample.sampleId,观测结构:sample.factSchema,
      采集字段:sample.fact,证据:sample.artifact,试次:sample.trialId},null,2);
  }

  el('observation-case').addEventListener('change',selectObservationCase);
  el('observation-sample').addEventListener('change',selectObservationSample);

  el('download').addEventListener('click', () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = manifest.id + (bench ? '-台架回传.json' : '-Ripple回传.json');
    link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  });
  el('return').addEventListener('click', () => history.back());
})();
