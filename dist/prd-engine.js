/* Deterministic prototype domain rules. No network calls or production authorization. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object') module.exports = api; else root.PRDEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const clone = x => JSON.parse(JSON.stringify(x));
  const stamp = () => new Date().toISOString();
  const hash = x => { const s=JSON.stringify(x); let h=2166136261; for(let i=0;i<s.length;i++) h=Math.imul(h^s.charCodeAt(i),16777619); return (h>>>0).toString(16); };
  const get = (o,p) => p.split('.').reduce((v,k)=>v?.[k],o);
  function coverage(rows) {
    const units = new Map();
    for(const r of rows.filter(r=>r.required!==false)) {
      const key=r.unitId||r.id;
      if(!units.has(key)) units.set(key,r);
      else if(hash(units.get(key))!==hash(r)) {
        const old=units.get(key);
        if(old.judgment!==r.judgment||old.validity!==r.validity||old.reviewPending!==r.reviewPending) units.set(key,{...old,judgment:'UNKNOWN',validity:'PENDING',conflict:true});
      }
    }
    const all=[...units.values()];
    const excluded=all.filter(r=>r.judgment==='NOT_APPLICABLE'&&r.exclusionApproval?.frozen===true&&r.exclusionApproval.reason).length;
    const applicable=all.length-excluded;
    const effective=all.filter(r=>['PASS','FAIL'].includes(r.judgment)&&r.validity==='VALID'&&!r.reviewPending).length;
    return {original:all.length,excluded,applicable,effective,ratio:applicable?effective/applicable:null};
  }
  function aggregate(rows, opts={}) {
    const c=coverage(rows), required=rows.filter(r=>r.required!==false);
    const pending=opts.reviewPending||required.some(r=>r.reviewPending);
    const failures=required.filter(r=>r.judgment==='FAIL'&&r.validity==='VALID');
    const gaps=c.effective<c.applicable||!c.applicable||opts.qualificationMissing||opts.statisticsMissing;
    const verdict=pending?'INCONCLUSIVE':failures.length?'BLOCK':gaps?'INCONCLUSIVE':'PASS';
    return {verdict,label:pending?'评测未完成':verdict==='INCONCLUSIVE'?'证据不足':verdict==='BLOCK'?'阻断':'通过',release:verdict==='PASS',failures:failures.length,pending:!!pending,coverage:c};
  }
  function trend(snapshots, asOf) {
    const latest=new Map();
    for(const s of snapshots) if(s.published&&s.at<=asOf&&(!latest.has(s.runId)||latest.get(s.runId).at<s.at||(latest.get(s.runId).at===s.at&&latest.get(s.runId).revision<s.revision))) latest.set(s.runId,s);
    const comparison=new Map();
    for(const s of latest.values()) { const key=s.comparisonUnit||s.runId; if(!comparison.has(key)||comparison.get(key).at<s.at) comparison.set(key,s); }
    const ss=[...comparison.values()], counts=ss.map(s=>coverage(s.rows));
    const effective=counts.reduce((n,c)=>n+c.effective,0),applicable=counts.reduce((n,c)=>n+c.applicable,0);
    return {snapshots:ss,effective,applicable,ratio:applicable?effective/applicable:null};
  }
  const actors={engineer:{id:'demo-eval-001',name:'林工 · 评测负责人'},business:{id:'demo-biz-002',name:'赵经理 · 业务负责人'},admin:{id:'demo-admin-003',name:'平台管理员'},quality:{id:'demo-quality-004',name:'周经理 · 质量审核'},expert:{id:'demo-expert-005',name:'陈专家 · 领域专家'},reviewerA:{id:'demo-review-006',name:'独立评审 A'},reviewerB:{id:'demo-review-007',name:'独立评审 B'},ops:{id:'demo-ops-008',name:'王工 · 平台运维'},finops:{id:'demo-finops-009',name:'成本查看员'}};
  actors.engineer.permissions=['report.read','report.export','evidence.export'];
  for(const k of ['business','quality','expert'])actors[k].permissions=['report.read'];
  actors.ops.permissions=['technical.recover'];actors.finops.permissions=['cost.read'];
  actors.maintainer={id:'demo-maintainer-010',name:'系统维护人',permissions:['technical.recover']};
  actors.costManager={id:'demo-cost-011',name:'获准成本人员',permissions:['cost.read','cost.policy']};
  actors.reporter={id:'demo-report-012',name:'报告使用者',permissions:['report.read','report.export']};
  actors.service={id:'demo-service-013',name:'获准报告服务',permissions:['report.read','report.export']};
  function packages() { return [
    {id:'PKG-BASIC',name:'双角色基础包',version:1,status:'PUBLISHED',enabled:true,roles:['engineer','business'],assetNodes:['类型验证','技术确认','业务内容与用途批准','评测负责人发布'],evaluationNodes:['准备','试评','预检','冻结','运行','复核与报告','业务验收']},
    {id:'PKG-QUALITY',name:'质量复核包',version:1,status:'PUBLISHED',enabled:true,roles:['engineer','business','quality'],assetNodes:['类型验证','技术确认','业务内容与用途批准','独立质量审核','评测负责人发布'],evaluationNodes:['准备','试评','预检','冻结','运行','独立质量审核','报告','业务验收']},
    {id:'PKG-SAFETY',name:'安全评审包',version:1,status:'PUBLISHED',enabled:true,roles:['engineer','business','quality','expert'],assetNodes:['类型验证','技术确认','业务内容与用途批准','质量审核','专项安全审核','发布'],evaluationNodes:['准备','试评','运行前安全确认','冻结','运行','质量审核','业务验收']}
  ]; }
  function matchPackage(classification,rules,packs) {
    if(!classification.department||!classification.type) return {status:'BLOCKED',reason:'可信分类不完整，请确认需求来源。'};
    const matching=rules.filter(r=>r.enabled!==false&&(!r.department||r.department===classification.department)&&(!r.type||r.type===classification.type));
    const rank=r=>r.department&&r.type?3:r.department?2:r.type?1:0;
    matching.sort((a,b)=>rank(b)-rank(a)||(b.priority||0)-(a.priority||0));
    if(!matching.length) return {status:'BLOCKED',reason:'无有效匹配规则，不能静默降级。'};
    if(matching.length>1&&rank(matching[0])===rank(matching[1])&&(matching[0].priority||0)===(matching[1].priority||0)) return {status:'BLOCKED',reason:'同最高优先级规则冲突，请管理员修正规则。'};
    const rule=matching[0], pack=packs.filter(p=>p.id===rule.packageId&&p.status==='PUBLISHED').sort((a,b)=>b.version-a.version)[0];
    if(!pack||!pack.enabled) return {status:'BLOCKED',reason:'命中的权限包未发布或已停用，不能回退基础包。'};
    return {status:'READY',rule:clone(rule),pack:clone(pack),reason:rule.department&&rule.type?'部门与业务类型匹配':rule.department?'部门匹配':rule.type?'业务类型匹配':'平台默认规则'};
  }
  function ruleErrors(rules,packs) {
    const errors=[];
    if(rules.filter(r=>r.enabled!==false&&!r.department&&!r.type).length!==1) errors.push('须且只能有一条启用的平台默认规则。');
    for(const r of rules.filter(r=>r.enabled!==false)) if(!packs.some(p=>p.id===r.packageId&&p.status==='PUBLISHED'&&p.enabled)) errors.push(r.id+'目标包未发布或已停用');
    const departments=[...new Set(['车载研发','企业业务',...rules.map(r=>r.department).filter(Boolean)])];
    const types=[...new Set(['模型','Agent','非Agent应用',...rules.map(r=>r.type).filter(Boolean)])];
    for(const department of departments) for(const type of types) {const m=matchPackage({department,type},rules,packs);if(m.status==='BLOCKED')errors.push(department+' / '+type+'：'+m.reason);}
    return [...new Set(errors)];
  }
  function confirm(asset,role,actor) {
    if(!['engineer','business'].includes(role)) throw Error('该角色没有普通资产确认权限。');
    if(!actor?.id) throw Error('缺少真实账号标识。');
    if(!asset.validated||asset.validationHash!==hash(asset.content)) throw Error('当前内容尚未完成类型验证。');
    const other=role==='engineer'?'business':'engineer';
    if(asset.confirmations?.[other]?.actorId===actor.id) throw Error('两项确认必须由不同账号完成。');
    asset.confirmations=asset.confirmations||{};
    asset.confirmations[role]={actorId:actor.id,name:actor.name,version:asset.version,hash:hash(asset.content),at:stamp()};
    return asset;
  }
  function publish(asset,actor,extraApproved=false) {
    const e=asset.confirmations?.engineer,b=asset.confirmations?.business;
    if(!e||!b||e.actorId===b.actorId||e.hash!==hash(asset.content)||b.hash!==hash(asset.content)||e.version!==asset.version||b.version!==asset.version) throw Error('当前版本的双人确认未齐备或已失效。');
    if(actor.id!==e.actorId) throw Error('由本资产评测负责人发起发布。');
    if(asset.specialistRequired&&!extraApproved) throw Error('专项验证或独立审核尚未完成。');
    if(!asset.validated||asset.validationHash!==hash(asset.content)) throw Error('发布前复检失败。');
    asset.status='PUBLISHED';asset.publishedAt=stamp();return asset;
  }
  function evaluate(spec,output,options={}) {
    return spec.checks.map(c=>{
      const actual=get(output,c.path),expected=c.expected;
      let judgment='UNKNOWN',validity='VALID',reason='必要证据缺失';
      if(output.parserError) {validity='INVALID';reason='评测解析器故障；不计为产品错误';}
      else if(actual!==undefined&&(actual!==null||expected===null)) {
        let ok=c.op==='includes'?Array.isArray(actual)&&expected.every(v=>actual.includes(v)):c.op==='max'?typeof actual==='number'&&actual<=expected:c.op==='min'?typeof actual==='number'&&actual>=expected:JSON.stringify(actual)===JSON.stringify(expected);
        judgment=ok?'PASS':'FAIL';reason=ok?'原始证据满足冻结规则':'原始证据不满足冻结规则';
      }
      return {id:c.id,unitId:c.id,name:c.name,metric:c.metric,required:c.required!==false,judgment,validity,actual:actual??null,expected,reason,evidence:c.evidence,reviewPending:!!options.reviewPending&&(c.review===true||options.forceReview===true)};
    });
  }
  function preflight(task,pack) {
    const p=task.prd,gaps=[];
    const add=(field,text,owner)=>gaps.push({field,text,owner});
    if(!p?.scene) add('capability','任务尚未绑定已验证执行能力；请补齐类型目录、资产与真实接入，或显式载入合成 Demo','技术负责人');
    if(!task.object) add('object','被测对象未填写','评测负责人');
    if(!task.objectVersion) add('version','缺少精确对象版本','技术负责人');
    if(!task.objectProof?.ref||/^https?:/.test(task.objectProof.ref)) add('proof','构建 / 配置版本证明未提供；URL不能代替版本','技术负责人');
    if(!task.goal) add('goal','评测目标未填写','业务负责人');
    if(!p?.inputReady) add('input','请载入或核验输入与独立参考','业务负责人');
    if(!p?.metricIds?.length) add('metrics','至少选择一个适用指标','评测负责人');
    if(p?.metricIds?.some(id=>!(p.supportedMetrics||p.metricIds).includes(id))) add('metrics','所选候选指标缺少当前回放评分实现，请补充能力或移除额外指标','评测负责人');
    if(!p?.samplePolicy) add('policy','请确认合成演示的统计口径与门槛','业务负责人');
    if(!pack) add('members','无有效权限包','平台管理员');
    if(!p?.members?.engineer||!p?.members?.business||p.members.engineer===p.members.business) add('members','业务与评测须指定不同账号','评测负责人');
    if(pack?.roles.some(role=>!p.members?.[role])) add('members','缺少权限包规定的必需人员','评测负责人');
    if(!p?.pilot||p.pilot.digest!==planHash(task)) add('pilot','尚未完成当前方案的试评','评测负责人');
    if(!Number.isFinite(task.budget)||task.budget<=0) add('budget','预算须为正数','评测负责人');
    if(p?.externalEvidenceMode){if(!p.files?.input||!p.files?.output||!p.sourceFiles?.length)add('evidence','外部证据回放须导入输入JSON、原始输出和源文件/观测附件','技术负责人');if(p.externalConfig?.objectVersion!==task.objectVersion)add('externalVersion','接入配置与被测对象版本不一致','技术负责人');}
    if(!p?.connectionVerified) add('connection','当前入口尚未完成接入验证；仅可使用内置回放','技术负责人');
    return {status:gaps.length?'BLOCKED':'READY',gaps,digest:planHash(task),at:stamp()};
  }
  function planHash(task) {const p=task.prd; return hash({object:task.object,type:task.type,department:p.department,entry:p.entry,dependencies:p.dependencies,version:task.objectVersion,proof:task.objectProof,goal:task.goal,budget:task.budget,scene:p.scene,taskTypeRef:p.taskTypeRef,assemblyMode:p.assemblyMode,contentMode:p.contentMode,outputs:p.outputs,externalConfig:p.externalConfig,files:p.files,sourceFiles:p.sourceFiles,importedInput:p.importedInput,externalEvidenceMode:p.externalEvidenceMode,metricIds:p.metricIds,policy:p.samplePolicy,members:p.members,package:p.package,input:p.inputReady,connection:p.connectionVerified,reportGrants:p.reportGrants,dataScope:p.dataScope,cleanupPolicy:p.cleanupPolicy,price:p.price});}
  function freeze(task,actor) {
    const p=task.prd;
    if(actor.id!==p.members.engineer) throw Error('仅任务评测负责人可冻结。');
    if(!p.preflight||p.preflight.status!=='READY'||p.preflight.digest!==planHash(task)) throw Error('预检未通过或已失效，请重新预检。');
    if(!p.confirmations?.business||p.confirmations.business.digest!==planHash(task)||p.confirmations.business.id!==p.members.business) throw Error('业务负责人尚未确认当前范围与演示门槛。');
    p.manifest={id:'MF-'+task.id+'-'+task.revision,hash:planHash(task),at:stamp(),objectVersion:task.objectVersion,package:clone(p.package),members:clone(p.members),metricIds:clone(p.metricIds),outputs:clone(p.outputs),policy:clone(p.samplePolicy),scope:'SYNTHETIC_REPLAY_ONLY',externalConfig:clone(p.externalConfig||null),files:clone(p.files||{}),sourceFiles:clone(p.sourceFiles||[]),importedInput:clone(p.importedInput||null),dependencies:clone(p.dependencies||[]),reportGrants:clone(p.reportGrants||[]),dataScope:p.dataScope,cleanupPolicy:clone(p.cleanupPolicy||{}),price:clone(p.price||{})};
    task.manifest=p.manifest; return p.manifest;
  }
  function reserve(ledger,key,amount) {
    if(ledger.reservations[key]) return false;
    const available=ledger.limit-ledger.confirmed-ledger.pending-Object.values(ledger.reservations).reduce((a,b)=>a+b,0);
    if(!Number.isInteger(amount)||amount<=0||available<amount) throw Error('预算不足，停止派发新工作。');
    ledger.reservations[key]=amount;return true;
  }
  function charge(ledger,key,eventId,amount) {
    if(ledger.events.includes(eventId))return false;
    if(!Number.isInteger(amount)||amount<0||amount>(ledger.reservations[key]||0))throw Error('用量不合法或超出预留；需核查在途成本。');
    ledger.reservations[key]-=amount;ledger.pending+=amount;ledger.events.push(eventId);return true;
  }
  function release(ledger,key,unresolved) {if(unresolved)throw Error('未决外部动作或费用待核实，不能提前释放。');const n=ledger.reservations[key]||0;delete ledger.reservations[key];return n;}
  return {clone,hash,stamp,get,coverage,aggregate,trend,actors,packages,matchPackage,ruleErrors,confirm,publish,evaluate,preflight,planHash,freeze,reserve,charge,release};
});
