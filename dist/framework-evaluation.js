/* Versioned local replay fixtures and framework handoff contracts. No external calls. */
(() => {
  'use strict';
  const scope = 'DEMO_REPLAY_ONLY';
  const clean = (value) => JSON.parse(JSON.stringify(value));
  const canonical = (value) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : Array.isArray(value) ? value.map(canonical) : value;
  const same = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  const key = (id, name, kind, source, entry, contract) => ({id,name,kind,source,entry,contract});
  const openQuestions = [
    ['M01','3 件商品，每件 29 元，合计多少元？',['78 元','87 元','97 元','116 元'],'B'],
    ['M02','2 件商品，每件 39 元，另付 10 元运费，实付多少元？',['78 元','82 元','88 元','98 元'],'C'],
    ['M03','两笔订单分别为 100 元和 180 元，合计多少元？',['180 元','240 元','270 元','280 元'],'D']
  ];
  const ragQuestions = [
    ['R01','国内单次差旅交通费用报销上限是多少？','每次不超过 3000 元。'],
    ['R02','差旅结束多久内要提交报销？','差旅结束后 30 天内提交。'],
    ['R06','北京酒店每人每晚限额是多少？请给出依据。','每人每晚 650 元。']
  ];
  const specs = {
    open: {
      name:'OpenCompass', lane:'模型基准', object:'通用对话模型', objectVersion:'MODEL-CHAT@fixture-1', type:'MODEL',
      environment:'云端 · 本地回放', source:'资产中心 · 3 件商品合计 87 元（CASE-EXAMPLE-MODEL@1）及两条同口径回归题',
      caseRef:'模型算术选择题回归@1', data:'算术选择题样本@1', reference:'独立答案键@1',
      config:'零样本；统一选择题模板；temperature=0；只返回 A/B/C/D。',
      metric:{id:'choice-accuracy@1',name:'选择题准确率',definition:'正确的有效预测 ÷ 有效可解析预测；同时显示有效覆盖。超时及无法解析单列。'},
      capabilities:[
        key('opencompass-replay@1','OpenCompass 主执行器包装','执行器','replay://opencompass/predictions@1','batch_infer','模型请求 → 逐样本预测和执行状态'),
        key('model-http-replay@1','模型请求适配器','适配器','replay://model-http@1','map_chat_response','题目与选项 → 原始回答 / 超时')
      ],
      samples:openQuestions.map(([id,question,options,gold])=>({id,input:{question,options},gold})),
      action:'回放云端预测', status:'云端 Worker 已领取（回放）',
      collects:'原始预测、运行状态、框架任务号；平台解析选项，再与独立答案对照。'
    },
    agent: {
      name:'AgentCompass', lane:'宠物出行 V2', object:'携宠出行主动推荐 Agent', objectVersion:'A8-4@bench-fixture', type:'AGENT',
      environment:'台架模拟 · 本地回放', source:'V2 原表第 153 行 · E03；本地归档工作簿「用例索引」',
      caseRef:'E03 · 确认后实际执行成功率', data:'稳定有宠视频 × 四组温度@1', reference:'独立三区车况目标@1',
      config:'复用 PET-01 稳定有宠切片，每组重建会话；卡片有效期内点击。演练观察窗：有效点击后 5000 ms。',
      metric:{id:'confirmed-hvac-state@1',name:'确认后实际执行成功率',definition:'窗内三区、开关及循环均达标的试次 ÷ 已证实有效点击的试次。有效点击但缺独立读回仍留在分母。'},
      capabilities:[
        key('agentcompass-bench-replay@1','AgentCompass 台架交互包装','执行器','replay://agentcompass/harness@1','scenario_harness','初态、场景动作、点击与控车轨迹'),
        key('bench-aidl-signals@3','台架 AIDL / 车况信号适配器','适配器','replay://a84/bench-aidl-signals@3','map_bench_observation','沿用 A8-4 已有映射：独立三区、开关、循环模式')
      ],
      samples:A84V2Fixtures.thermal.map(({cabinC,outsideC,target},i)=>({id:'TEMP-0'+(i+1),
        input:{videoRef:'fixture://pet/01',cabinC,outsideC,interaction:'在卡片有效期内点击确认'},
        gold:{zonesC:[target,target,target],acOn:true,airMode:'outside'}})),
      action:'回放台架采集', status:'已派给台架 Worker（回放）',
      collects:'AgentCompass 包装回传点击与控车轨迹；台架独立观察器另回实际三区状态。同请求号对齐。'
    },
    rag: {
      name:'Ragas', lane:'知识问答 RAG', object:'差旅制度问答应用', objectVersion:'TravelPolicyRAG@2.1.0-fixture', type:'APPLICATION',
      environment:'云端 · 本地回放', source:'原型差旅问答用例 R01 / R02 / R06 · 模拟制度材料',
      caseRef:'差旅知识库更新后的问答回归', data:'差旅问答 3 题@1', reference:'差旅制度参考答案@1',
      config:'应用固定为 TravelPolicyRAG 2.1.0，知识库 KB-TRAVEL-2026.09，保留实际命中的片段和版本。',
      metric:{id:'ragas-faithfulness-replay@1',name:'Ragas 忠实度（裁判回放）',definition:'逐题有检索证据支持的陈述数 ÷ 回答陈述数。对有分试次取均值，另报覆盖。'},
      capabilities:[
        key('rag-app-replay@1','轻量应用执行器','执行器','replay://travel-rag/app@1','invoke_app','问题 → 同一请求的回答与实际检索片段'),
        key('rag-response-replay@1','应用响应与检索适配器','适配器','replay://travel-rag/response@1','map_retrieval_response','响应 → user_input / response / retrieved_contexts'),
        key('ragas-faithfulness-replay@1','Ragas 忠实度评分实现','评分实现','replay://ragas/faithfulness-verdicts@1','score_faithfulness','问题、回答、实际检索片段 → 陈述归因及分值')
      ],
      samples:ragQuestions.map(([id,question,gold])=>({id,input:{question,kbVersion:'KB-TRAVEL-2026.09'},gold})),
      action:'回放应用请求', status:'应用 Worker 已领取（回放）',
      collects:'应用适配器回传同一请求的回答与实际检索片段。入库后评分 Worker 才可调用 Ragas 实现。'
    }
  };

  function registration(scene) {
    const s=specs[scene];
    return {scene,stage:'DRAFT',scope,environment:s.environment,
      bindings:clean(s.capabilities.map(c=>({...c,version:c.id.split('@')[1]}))),qualification:null,reviewedAt:null};
  }

  function ready(reg) {
    return reg?.stage==='PUBLISHED' && reg.scope===scope && reg.qualification?.ok &&
      reg.qualification.signature===JSON.stringify(reg.bindings);
  }

  function freeze(scene,id,reg,choice,validateOnly=false) {
    const s=specs[scene];
    const [executor,adapter,scorer] = reg?.bindings || [];
    if ((!ready(reg) && !validateOnly) || !executor || !adapter) throw Error('当前组合尚未通过审核并发布。');
    if (choice.executor!==executor.id || choice.adapter!==adapter.id || choice.metric!==s.metric.id ||
        choice.data!==s.data || choice.reference!==s.reference || (scorer && choice.metric!==scorer.id)) {
      throw Error('执行器、适配器、材料和指标须与已验证的组合及当前用例一致。');
    }
    return {id,scene,scope,objectVersion:s.objectVersion,environment:s.environment,bindings:clean(reg.bindings),
      dataset:choice.data,reference:choice.reference,metric:clean(s.metric),observationMs:scene==='agent'?5000:null,
      trials:s.samples.map(row=>({id:id+'/'+row.id,attemptId:'attempt-1',sampleId:row.id,input:clean(row.input)})),
      gold:Object.fromEntries(s.samples.map(row=>[row.id,clean(row.gold)])),frozenAt:new Date().toISOString()};
  }

  function dispatch(m) {
    const {id,scene,scope,objectVersion,environment,observationMs,trials}=m;
    return {schema:'framework-dispatch@1',runId:id,subtaskId:id+'-01',scene,scope,objectVersion,environment,observationMs,
      executor:m.bindings[0].id,adapter:m.bindings[1].id,trials:clean(trials)};
  }

  function defaultChoice(scene) {
    const s=specs[scene];
    return {data:s.data,reference:s.reference,executor:s.capabilities[0].id,adapter:s.capabilities[1].id,metric:s.metric.id};
  }

  const ragReplay = {
    R01:{answer:'国内单次差旅交通报销上限为 3000 元。',hits:[['travel-2026:交通','单次差旅交通费用报销上限为3000元。']]},
    R02:{answer:'应在差旅结束后 30 天内提交。逾期系统会自动补报。',hits:[['travel-2026:时限','差旅结束后30天内提交报销。']]},
    R06:{answer:'北京住宿每人每晚 650 元。',hits:null}
  };
  function replay(job) {
    if (job.scope!==scope || job.schema!=='framework-dispatch@1') throw Error('仅可回放本地演练派工。');
    const preparedBench=job.scene==='agent' && job.executor===E03Contract.executor.id
      ? E03BenchExecutor.createExecutor(E03PreparationFixtures.createDriver()) : null;
    const frames=job.trials.map(t=>{
      const idx=specs[job.scene].samples.findIndex(s=>s.id===t.sampleId);
      if(idx<0 || !same(t.input,specs[job.scene].samples[idx].input)) throw Error('当前样本无匹配的回放记录。');
      const common={trialId:t.id,attemptId:t.attemptId,sampleId:t.sampleId,
        externalId:job.runId+'-job/'+t.sampleId, evidenceId:job.runId+'/evidence/'+t.sampleId};
      if(job.scene==='open') {
        const prediction=['答案：B','答案：A',null][idx];
        return {...common,status:prediction?'SUCCEEDED':'TIMED_OUT',
          observation:{source:'opencompass-predictions-replay',prediction}};
      }
      if(preparedBench) {
        if(job.adapter!==E03Contract.adapter.id)throw Error('E03 的执行器和台架适配器版本不匹配。');
        const {videoRef,cabinC,outsideC}=t.input;
        const request={schema:E03Contract.dispatchSchema,scope,caseId:'E03',trialId:t.id,attemptId:t.attemptId,
          sampleId:t.sampleId,observationMs:job.observationMs,input:{videoRef,cabinC,outsideC}};
        const result=preparedBench.run(preparedBench.submit(request).id);
        if(result.status!=='SUCCEEDED')throw Error(result.error?.message || 'E03 台架采证未完成。');
        const fact=result.artifact.evidence;
        return {...common,status:result.status,evidenceId:result.artifact.evidenceId,rawSignals:result.artifact.raw,
          observation:{source:'agentcompass-harness-replay',clockAligned:fact.clockAligned,confirmation:fact.confirmation,
            toolTrace:fact.command},independentObservation:fact.hvacReadback,cleanup:result.cleanup};
      }
      if(job.scene==='agent') {
        const [,fact] = A84V2Fixtures.replay.actuation({id:t.id,
          parameters:{cabinC:t.input.cabinC,outsideC:t.input.outsideC}});
        return {...common,status:'SUCCEEDED',
          observation:{source:'agentcompass-harness-replay',clockAligned:fact.clockAligned,confirmation:fact.confirmation,
            toolTrace:{...fact.command,ack:true}},
          independentObservation:fact.hvacReadback};
      }
      const x=ragReplay[t.sampleId];
      return {...common,status:'SUCCEEDED',observation:{source:'rag-app-replay',user_input:t.input.question,response:x.answer,
        retrieved_contexts:x.hits?.map(([,passage])=>passage)??null,chunk_refs:x.hits?.map(([ref])=>ref)??[]}};
    });
    return {schema:'framework-callback@1',scope,scene:job.scene,runId:job.runId,subtaskId:job.subtaskId,
      objectVersion:job.objectVersion,environment:job.environment,executor:job.executor,adapter:job.adapter,records:frames};
  }

  function receive(m,packet,previous=[]) {
    const j=dispatch(m);
    if (packet?.schema!=='framework-callback@1' ||
        ['scene','scope','runId','subtaskId','objectVersion','environment','executor','adapter'].some(k=>packet[k]!==j[k]) ||
        !Array.isArray(packet.records)) throw Error('回传与冻结的运行、能力版本或环境不匹配。');
    const received=new Map(previous.map(r=>[r.trialId,r]));
    for (const r of packet.records) {
      const t=j.trials.find(x=>x.id===r.trialId);
      if (!t || t.attemptId!==r.attemptId || t.sampleId!==r.sampleId || !r.evidenceId || !r.externalId ||
          !r.observation || !['SUCCEEDED','FAILED','UNKNOWN','TIMED_OUT'].includes(r.status)) throw Error('回传缺少正确的试次、尝试或证据关联。');
      if (received.has(r.trialId) && !same(received.get(r.trialId),r)) throw Error('同一试次重复回传但内容不同，暂缓计分。');
      received.set(r.trialId,clean(r));
    }
    return [...received.values()];
  }

  // The judge attribution rows are prerecorded test fixtures; the aggregate is computed here.
  function judgeReplay(t,o) {
    const fixture=ragReplay[t.sampleId];
    if (o.user_input!==t.input.question || o.response!==fixture.answer ||
        !same(o.retrieved_contexts,fixture.hits?.map(([,x])=>x))) return null;
    return t.sampleId==='R01'
      ? [{claim:'交通报销上限 3000 元',supported:true,evidence:o.chunk_refs[0]}]
      : [{claim:'差旅结束后 30 天内提交',supported:true,evidence:o.chunk_refs[0]},
        {claim:'逾期系统会自动补报',supported:false,evidence:null}];
  }

  function score(m,records) {
    const items=m.trials.map(t=>{
      const r=records.find(x=>x.trialId===t.id), o=r?.observation;
      const base={trial:t,status:r?.status||'PENDING',evidence:r||null,reference:m.gold[t.sampleId],value:null};
      if(!r) return {...base,reason:'尚未收到该试次证据'};
      if(m.scene==='open') {
        const parsed=r.status==='SUCCEEDED' && /^(?:答案[：:]\s*)?([A-D])[。.]?$/.exec(o.prediction?.trim()||'');
        const value=parsed ? Number(parsed[1]===base.reference) : null;
        return {...base,value,parsed:parsed?.[1]||null,
          reason:value===null?(r.status==='TIMED_OUT'?'接口超时，无预测；单列缺测':'预测无法解析为 A–D'):
            '解析 '+parsed[1]+'，金标 '+base.reference+(value?'，答对':'，答错')};
      }
      if(m.scene==='agent') {
        const fact={clockAligned:o.clockAligned,confirmation:o.confirmation,command:o.toolTrace,hvacReadback:r.independentObservation};
        if(m.bindings[0].id===E03Contract.executor.id) {
          const scored=E03ActuationScorer.scoreTrial({sampleId:t.sampleId,evidenceId:r.evidenceId,
            evidence:{...fact,schema:E03Contract.evidenceSchema}},{sampleId:t.sampleId,...base.reference},m.observationMs);
          return {...base,value:scored.value,eligible:scored.eligible,reason:scored.reason};
        }
        const def=A84MetricEngine.definition('actuation');
        const program=A84MetricEngine.configure('actuation',def.mapping);
        const result=A84MetricEngine.score(program,fact,base.reference,m.observationMs);
        return {...base,value:result.value,eligible:result.eligible,reason:result.calculation};
      }
      if (!Array.isArray(o.retrieved_contexts)||!o.retrieved_contexts.length) {
        return {...base,reason:'该应用应回传检索片段，本次缺失；忠实度无法判断'};
      }
      const claims=judgeReplay(t,o);
      if (!claims?.length) return {...base,reason:'当前证据没有匹配的裁判回放记录'};
      const supported=claims.filter(c=>c.supported).length;
      return {...base,value:supported/claims.length,claims,
        reason:supported+' / '+claims.length+' 条陈述有来源支持'};
    });
    const valid=items.filter(i=>i.value!==null);
    const count=valid.reduce((sum,i)=>sum+i.value,0);
    const denom=m.scene==='agent'?A84MetricEngine.aggregate('actuation',items).denominator:valid.length;
    const coverage=valid.length+'/'+items.length;
    return {id:m.id+'-S1',metric:m.metric.id,items,numerator:count,denominator:denom,value:denom?count/denom:null,
      planned:items.length,received:records.length,valid:valid.length,unknown:items.length-valid.length,coverage,scope};
  }

  function validate(reg) {
    const scene=reg.scene, s=specs[scene], checks=[];
    const check=(name,run)=>{try {checks.push({name,ok:!!run()});}catch{checks.push({name,ok:false});}};
    const m=freeze(scene,'QUAL-'+scene,reg,defaultChoice(scene),true);
    const j=dispatch(m), packet=replay(j), rs=receive(m,packet), ss=score(m,rs);
    check('固定版本及契约登记齐全',()=>reg.bindings.length===s.capabilities.length &&
      reg.bindings.every((c,i)=>c.id===s.capabilities[i].id && c.source && c.entry && c.contract));
    check('执行端只收到输入，独立参考留在评分侧',()=>!Object.hasOwn(j,'gold') && !Object.hasOwn(j,'reference') &&
      j.trials.every(t=>!Object.hasOwn(t,'gold')));
    check('同一回传去重，运行或能力版本错配拦截',()=>{
      let blocked=false; try {receive(m,{...packet,adapter:'unmatched@1'});} catch {blocked=true;}
      return blocked && receive(m,packet,rs).length===m.trials.length;
    });
    check(scene==='agent'?'实际状态与回执分开；后排未到位能检出':
      scene==='rag'?'裁判回放区分有依据和无依据的陈述':'逐题解析、正例和反例计算准确',()=>
      scene==='agent'?ss.items[0].value===1 && ss.items[1].value===0 && ss.denominator===4 :
      scene==='rag'?ss.items[0].value===1 && ss.items[1].value===0.5 && ss.value===0.75 :
        ss.items[0].value===1 && ss.items[1].value===0 && ss.value===0.5);
    check(scene==='agent'?'只有 ACK、无独立读回时保留未知':'缺证或超时保持空值',()=>ss.items.at(-1).value===null);
    return {at:new Date().toISOString(),scope,signature:JSON.stringify(reg.bindings),ok:checks.every(c=>c.ok),checks};
  }

  window.FrameworkEvaluation={specs,scope,registration,ready,freeze,dispatch,replay,receive,score,validate,defaultChoice};
})();
