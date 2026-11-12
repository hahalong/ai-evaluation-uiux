/* View the runnable files, trace and reproducible acceptance results. */
(() => {
  'use strict';
  const el = id=>document.getElementById(id);
  const make = (tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
  const responsibilities = {
    '适配器':'台架接入维护人 · 同请求映射、温度单位、来源及字段校验',
    '执行器':'自动化维护人 · 领取、复位、采集、回传和释放',
    '评分实现':'评测工程师 · 版本化规则、独立金标、逐试次判定'
  };
  for(const item of E03Preparation.bindings()){
    const article=make('article','');
    article.className='card';
    article.append(make('h2',item.kind+' · '+item.id),make('small',responsibilities[item.kind]),
      make('p',item.contract),make('code',item.source+' / '+item.entry),
      make('p','SHA-256 '+item.digest.slice(0,16)+'…'));
    el('deliverable-cards').append(article);
  }
  el('fingerprint').textContent='联调组合摘要 '+E03PreparationBuild.fingerprint;
  let report;
  let preview;
  function examples(which){
    preview ??= E03Preparation.verify();
    const {dispatch,job,gold,score}=preview.trace;
    const raw=job.artifact.raw, evidence=job.artifact.evidence;
    const rawRead=raw.observer.readings[0], mapped=evidence.hvacReadback.samples[0];
    const rows={
      dispatch:['执行侧派工',dispatch,'评分侧金标',gold,'金标按样本 ID 配对。执行请求只带用例输入、采证观察窗及试次标识。'],
      evidence:['台架原始独立读回',{request_id:raw.observer.request_id,source:raw.observer.source,
        capture_until_ms:raw.observer.capture_until_ms,...rawRead},'适配后的独立读回',
        {requestId:evidence.hvacReadback.requestId,source:evidence.hvacReadback.source,
          observedUntilMs:evidence.hvacReadback.observedUntilMs,...mapped},
        '记录中的温度以 0.1℃ 为单位。适配器归一化为摄氏度并检查请求号；控车回执和独立读回分别留存。'],
      score:['评分输入摘要',{clickMs:evidence.confirmation.clickedAtMs,expiresMs:evidence.confirmation.expiresAtMs,
        observationMs:dispatch.observationMs,zonesC:mapped.zonesC,gold:gold.zonesC},'评分输出',score,
        '有效点击后 5000 ms 内，后排实测 22℃，低于 24℃目标。该试次计入分母，评分为未到位。']
    };
    const [ln,left,rn,right,note]=rows[which];
    el('left-name').textContent=ln;
    el('right-name').textContent=rn;
    const pretty=value=>JSON.stringify(value,null,2).replace(/\[\n\s+([\d.,\s]+)\n\s*\]/g,(_,numbers)=>
      '['+numbers.replace(/\s/g,'').replaceAll(',',', ')+']');
    el('left-example').textContent=pretty(left);
    el('right-example').textContent=pretty(right);
    el('interface-note').textContent=note;
  }
  function run(){
    report=E03Preparation.verify();
    el('summary').textContent=(report.ok?'组合联调通过':'组合联调未通过')+' · '+report.checks.filter(row=>row.ok).length+
      '/'+report.checks.length+' 项 · '+report.reportId+' · 资格仅限本地回放';
    el('summary').className=report.ok?'good':'bad';
    const body=el('checks').querySelector('tbody');
    body.replaceChildren();
    for(const item of report.checks){
      const row=body.insertRow();
      [item.name,item.expected,item.actual,item.ok?'通过':'不通过'].forEach(text=>row.insertCell().textContent=text);
      row.lastChild.className=item.ok?'good':'bad';
    }
    el('checks').hidden=false;
    el('report-details').hidden=false;
    el('report-data').value=JSON.stringify(report,null,2);
    el('download').disabled=false;
  }
  document.addEventListener('click',event=>{
    const page=event.target.dataset.page, which=event.target.dataset.interface;
    if(page) {
      document.querySelectorAll('[data-page]').forEach(button=>{
        const active=button.dataset.page===page;
        button.setAttribute('aria-selected',String(active));
        el(button.dataset.page).hidden=!active;
      });
      if(page==='interfaces')examples(document.querySelector('[data-interface][aria-selected="true"]').dataset.interface);
    }
    if(which){
      document.querySelectorAll('[data-interface]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.interface===which)));
      examples(which);
    }
  });
  el('run').addEventListener('click',run);
  el('download').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([el('report-data').value],{type:'application/json'}));
    const link=Object.assign(document.createElement('a'),{href:url,download:'e03-qualification.json'});
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
})();
