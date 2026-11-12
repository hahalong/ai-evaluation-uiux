/* Independent task/case/capability interaction design. All execution records are local synthetic fixtures. */
(()=>{'use strict';
const F=EvaluationFlow,P=PlazaReview,C=PlazaCore,h=esc,H=P.helpers;
const {badge,notice,panel,kv,table,title,wrap}=H;
const btn=(text,action,key='',style='',disabled=false)=>`<button class="btn ${style}" data-fl="${action}" data-key="${h(String(key))}" ${disabled?'disabled':''}>${text}</button>`;
const field=(label,key,value='',hint='',type='text',disabled=false)=>`<label class="pz-field">${label}<input type="${type}" data-fl-field="${key}" value="${h(String(value??''))}" ${disabled?'disabled':''}>${hint?`<small>${hint}</small>`:''}</label>`;
const area=(label,key,value='',hint='',disabled=false)=>`<label class="pz-field pz-full">${label}<textarea data-fl-field="${key}" ${disabled?'disabled':''}>${h(value||'')}</textarea>${hint?`<small>${hint}</small>`:''}</label>`;
const select=(label,key,options,value,disabled=false)=>`<label class="pz-field">${label}<select data-fl-field="${key}" ${disabled?'disabled':''}>${options.map(([v,n])=>`<option value="${h(String(v))}" ${String(v)===String(value)?'selected':''}>${h(n)}</option>`).join('')}</select></label>`;
const states={DRAFT:'草稿',REVIEW:'待审核',PUBLISHED:'已发布',PAUSED:'已停用'},execStates={PENDING:'待执行',COMPLETED:'已完成',CANCELLED:'已取消'},modes={event:'事件与多轮交互',request:'单轮请求',script:'自动化程序',device:'设备测试'},evNames={state:'独立状态',tool:'工具调用',dialog:'对话轨迹',event:'事件回执',response:'原始响应',artifact:'结果制品'};
let caseKey='',caseStep=0,returnTask=null,capKey='',capDraft=null,capTab='executor',query='',msg='',resultItem='',reviewReason='',reviewDecision='PASS',bindContext=null,importText='',importPreview=[],importErrors=[],sourceDraft=null;
const Q=()=>P.state(),f=()=>F.init(Q()),task=()=>F.ensureTask(C.task(Q())),curr=()=>F.get(f(),caseKey),save=()=>P.persist();
function page(body){return wrap((msg?notice(h(msg),'warn'):'')+body);}
// Reading guidance only; the registered scoring implementations and runtime checks remain unchanged.
const scoringHelp={
 no_call:{name:'用户拒绝后，是否仍发起禁止的操作',method:'按规则检查操作记录',materials:'用户的同意或拒绝记录、后续操作请求',example:'用户说“不要打开空调”，系统仍发起打开请求：不通过。即使请求被拦截，也要记录这次尝试。',source:'会话记录和工具调用记录。',note:'需要知道用户何时拒绝，并取得之后的完整操作记录；不能只看最终回答。'},
 state_off:{name:'设备是否保持关闭',method:'按规则检查设备状态',materials:'设备实际状态、状态采集时间',example:'用例要求设备保持关闭，规定观察期间读到设备开启：不通过。',source:'设备或仿真环境直接返回的状态。',note:'观察时间按用例要求确定。只取得最后一个时刻的状态，不能证明期间一直关闭；Agent 自己的回答也不能代替设备状态。'},
 answer:{name:'回答中的数值是否正确',method:'按规则比对数值',materials:'实际回答、参考数值、单位和允许误差',example:'参考答案为 87，实际回答为 78：不通过。单位和允许误差按用例设置检查。',source:'运行时保存的回答，以及用例关联的参考答案和规则。',note:'参考答案供评分使用，不作为被测对象的输入。无法读取实际回答时显示“无法判断”。'},
 artifact:{name:'文件中的合计金额是否正确',method:'按规则核对文件内容',materials:'实际生成的文件、待检查字段、参考金额',example:'参考合计为 280 元，生成文件中的合计为 300 元：不通过。',source:'本次运行实际生成的文件，以及用例中的字段位置和参考金额。',note:'只有文件名或“生成成功”的提示还不够，需要读取实际文件内容。'},
 judge:{name:'回答内容是否有来源支持',method:'由模型按评分标准评审',materials:'实际回答、来源内容、评分标准',example:'来源资料写“保修三年”，回答却说“保修五年”：这句话缺少来源支持。',source:'本次回答、实际检索或引用的来源内容，以及固定的评分标准。',note:'需要同时提供回答和来源。缺少必需来源时显示“无法判断”；模型评分方法须先完成校准。'},
 human:{name:'是否符合业务要求',method:'由业务专家评审',materials:'完整对话、业务评审标准；涉及操作时附操作和结果记录',example:'专家查看用户要求和实际执行记录，按既定标准判断是否符合要求，并填写理由。',source:'本次运行的对话和操作记录，以及用例中的评审标准。',note:'只凭对话无法确认实际操作是否完成，需要查看对应结果。'}
};
function scoringMethods(){return panel('评分方法',`<p class="muted">在用例的“判定规则”中选择检查项，填写参考值或评分标准。运行后依据实际记录和文件判断；缺少必需材料时显示“无法判断”。</p>`+notice('以下为演示示例，尚未完成真实环境验证。','warn')+table(['检查什么','怎么检查','需要哪些材料'],Object.entries(F.checks).map(([key,c])=>{const item=scoringHelp[key];return [h(item.name),h(item.method),h(item.materials)+`<details><summary>查看示例和材料来源</summary><p><strong>判定示例：</strong>${h(item.example)}</p><p><strong>材料来源：</strong>${h(item.source)}</p><p>${h(item.note)}</p><small>技术编号：${h(c.impl)}</small></details>`];})));}
function redraw(){save();P.paint();}
function route(name){msg='';P.route(name);}
function guard(roles){if(!roles.includes(S.role))throw Error('所需角色：'+roles.map(x=>({engineer:'评测工程师',expert:'领域专家',quality:'质量负责人',ops:'平台运维'}[x]||x)).join(' / ')+'。请使用顶部角色选择器查看对应操作。');}
function caseTypeTabs() {
  const group = assetGroups.find(item => item.types.some(([kind]) => kind === 'case'));
  return '<div class="v12-asset-types" role="group" aria-label="场景与用例的资产类型">' +
    group.types.map(([kind, label]) =>
      '<button type="button" class="v12-asset-type ' + (kind === 'case' ? 'active' : '') +
      '" data-v2="asset-kind" data-key="' + h(kind) + '" aria-pressed="' + (kind === 'case') + '">' + h(label) + '</button>'
    ).join('') + '</div>';
}
let caseListPage = 0;
function caseList() {
  syncLegacy();
  const search = query.toLowerCase();
  const cases = f().cases.filter(item =>
    [item.name,item.id,item.key,item.importRef?.content.id,item.bulkImport?.id].join(' ').toLowerCase().includes(search)
  );
  const pageSize = 18;
  const totalPages = Math.max(1,Math.ceil(cases.length/pageSize));
  caseListPage = Math.min(caseListPage,totalPages-1);
  const rows = cases.slice(caseListPage*pageSize,(caseListPage+1)*pageSize).map(item => {
    const methods = [...new Set(item.rules.map(rule => F.checks[rule.kind]?.method))];
    return [
      h(item.name||'未命名用例')+`<small>${h([item.importRef?.content.id||item.bulkImport?.id,item.key].filter(Boolean).join(' · '))}</small>`,
      h(F.methods[item.method])+'<small>'+h(modes[item.mode]||item.mode)+'</small>',
      h(methods.map(method => ({rule:'确定性检查',judge:'模型裁判',human:'人工复核'}[method])).join(' + ')||'待配置'),
      badge(states[item.status]||item.status,item.status==='PUBLISHED'?'good':'warn'),
      btn('查看与维护','case-open',item.key,'ghost')
    ];
  });
  const categories = [['dataset','数据与参考','2 类'],['case','场景与用例','5 类'],['metric','评分与判定','4 类'],['executor','执行与环境','4 类'],['suite','套件与治理','4 类']];
  return page(
    title('资产中心','维护可复用用例；发布后的固定版本可以直接加入评测任务。',btn('新建用例','new-case','','primary'))+
    `<div class="flow-categories" role="group" aria-label="资产分类">${categories.map(([id,name,count]) =>
      btn(`<strong>${name}</strong><small>${count}</small>`,'asset-type',id,id==='case'?'selected':'')
    ).join('')}</div>`+
    caseTypeTabs()+
    `<section class="pz-panel flow-case-list" aria-labelledby="flow-case-list-heading">
      <div class="pz-panel-head">
        <div>
          <h2 id="flow-case-list-heading">评测用例</h2>
          <p>可在同一用例内配置确定性检查、模型裁判和人工复核。执行方式另行选择。</p>
        </div>
        <div class="pz-actions">
          <div class="pz-search">
            ${ic('search')}
            <input type="search" data-fl-field="caseQuery" value="${h(query)}" aria-label="搜索用例" placeholder="按名称或编号搜索">
          </div>
          ${btn('批量导入','import')}
          ${returnTask?btn('返回原任务','return-task','','ghost'):''}
        </div>
      </div>
      ${window.MultiEnvUI?.assetEntry()||''}
      ${table(['用例 / 固定版本','执行方式','判定方式','状态','操作'],rows)}
      <div class="me-pagination">
        <span>${cases.length} 条 · 第 ${caseListPage+1}/${totalPages} 页</span>
        ${btn('上一页','case-list-page',-1,'',caseListPage===0)}
        ${btn('下一页','case-list-page',1,'',caseListPage+1>=totalPages)}
      </div>
    </section>`
  );
}
function caseEditor(){const c=curr();if(!c)return page(title('用例不可用','请选择有权访问的用例。',btn('返回用例列表','case-list','','primary')));const locked=c.status!=='DRAFT',names=['业务与输入','自动化配置','判定规则','验证与发布'];return page(`<div class="pz-crumb">${btn('评测用例','case-list','','ghost')} / ${h(c.key)} ${returnTask?' · 来源任务 '+h(returnTask):''}</div>`+title(h(c.name||'新建评测用例'),`${states[c.status]} · ${F.types[c.type]} · ${h(c.owner==='engineer'?'林工':c.owner)}`,locked?btn('创建新版本','case-revise',c.key,'primary'):btn('保存草稿','save-case'))+`<nav class="pz-stepper" aria-label="用例准备步骤">${names.map((n,i)=>`<button class="pz-step" data-fl="case-step" data-key="${i}" ${caseStep===i?'aria-current="step"':''}><b>${i+1}</b>${n}</button>`).join('')}</nav>`+[caseBusiness,caseAutomation,caseRules,caseValidation][caseStep](c,locked)+`<div class="pz-bottom"><small>${locked?'发布内容不可覆盖；新修订不会改变已冻结任务。':'输入自动保存在本地草稿；业务描述不会直接执行。'}</small><div class="pz-actions">${returnTask?btn('保存并返回评测','return-task'):''}${caseStep<3?btn('下一步：'+names[caseStep+1],'case-step',caseStep+1,'primary'):''}</div></div>`);}
function caseBusiness(c,locked){return (window.MultiEnvUI?.caseMeta(c)||'')+(window.AssetBulkUI?.caseMeta(c)||'')+panel('描述要验证的行为',`<div class="pz-fields">${field('用例名称','case.name',c.name,'', 'text',locked)}${select('对象类型','case.type',Object.entries(F.types),c.type,locked)}${area('验证目标','case.goal',c.goal,'描述可检查的行为和结果。',locked)}${area('业务步骤说明','case.description',c.description,'文字供人阅读；下一步逐项绑定可执行动作或程序。',locked)}${area('输入内容或样本引用','case.input',c.input,'独立参考答案只给评分过程，不放入被测输入。',locked)}${area('前置条件与初始状态','case.initial',c.initial,'需要设备或业务状态时，必须绑定复位及独立观察动作。',locked)}${field('来源与用途','case.source',c.source,'', 'text',locked)}${field('项目','readonly','智能座舱评测','来自当前任务。','text',true)}</div>`+`<details><summary>版本与来源关系</summary><p>${c.origin?.sourceRef?'来源用例版本 '+h(c.origin.sourceRef)+'。':'独立用例。'}修改后重新验证、审核与发布。</p></details>`);}
function caseAutomation(c,locked){return panel('把用例配置为可执行任务',`<div class="pz-fields">${select('执行方式','case.method',Object.entries(F.methods),c.method,locked)}${select('交互方式','case.mode',Object.entries(modes).filter(([k])=>k!=='device'),c.mode,locked)}${field('执行时限（秒）','case.timeout',c.timeout,'超过时限保留执行异常，先查实际状态。','number',locked)}</div>`+(c.method==='manual'?notice('当前为人工用例，可以保存和维护。加入在线任务前，需绑定动作或固定自动化程序；已有人工执行记录可按证据导入规则评测。','warn'):c.method==='script'?`<div class="flow-space">${select('已登记自动化程序','case.scriptRef',[['','请选择程序'],...f().scripts.map(s=>[s.id,s.name+' · '+s.commit])],c.scriptRef,locked)}</div>${c.scriptRef?kv([['输入映射',h(c.input)],['源码版本',h(f().scripts.find(x=>x.id===c.scriptRef)?.commit||'待补齐')],['返回契约','artifact-result@1；原始日志与制品定位']]):''}<p class="muted">没有可选程序时，向能力维护人提交需求；代码在源码仓库维护，平台登记固定制品。</p>${btn('申请补充程序','request-capability','script')}`:`<div class="flow-space">${c.steps.length?c.steps.map((st,i)=>`<section class="flow-action"><div class="pz-panel-head"><h3>步骤 ${i+1}</h3>${!locked?btn('移除步骤','remove-step',i,'ghost'):''}</div><div class="pz-fields">${field('业务动作说明','step.'+i+'.text',st.text,'','text',locked)}${select('绑定已登记动作','step.'+i+'.action',[['','尚未绑定'],...f().actions.filter(a=>a.mode===c.mode).map(a=>[a.id,a.name+' · '+a.id])],st.action,locked)}${field('动作参数 / 输入映射','step.'+i+'.parameter',st.parameter,'填写实际输入、等待条件或观察窗口。','text',locked)}</div>${st.action?`<p class="pz-target-note">实现：${h(f().actions.find(a=>a.id===st.action)?.implementation||'未登记')} · 输出：${h(f().actions.find(a=>a.id===st.action)?.evidence||'未知')}</p>`:notice('此步骤只有文字，不能自动执行。请绑定动作或申请开发。','warn')}</section>`).join(''):notice('尚未添加实际执行步骤。','warn')}<div class="pz-actions">${!locked?btn('添加执行步骤','add-step'):''}${!locked?btn('载入拒绝服务示例动作','sample-actions','','ghost'):''}${btn('缺少动作？申请补齐','request-capability','action','ghost')}</div></div>`)+notice('执行器解释动作配置或运行固定程序；适配器映射真实协议。AI 生成的动作或代码仍是草稿，需验证与审核。'));}
function caseRules(c,locked){return panel('配置如何判断结果',notice('同一用例可以同时包含数值或状态断言、模型裁判、人工复核。输出具有随机性，不代表所有规则都要交给模型裁判。')+c.rules.map((r,i)=>`<section class="flow-action"><div class="pz-fields">${select('判定项 '+(i+1),'rule.'+i+'.kind',Object.entries(F.checks).map(([k,v])=>[k,v.name]),r.kind,locked)}${field('参考值 / 阈值 / 判定依据','rule.'+i+'.expected',r.expected,'','text',locked)}</div><div class="pz-bottom"><label><input type="checkbox" data-fl-field="rule.${i}.required" ${r.required?'checked':''} ${locked?'disabled':''}> 必需判定项</label><small>${h(F.checks[r.kind].method)} · ${h(F.checks[r.kind].impl)} · 需要 ${h(evNames[F.checks[r.kind].evidence])}</small>${!locked?btn('移除判定项','remove-rule',i,'ghost'):''}</div></section>`).join('')+(!locked?btn('添加判定项','add-rule'):'')+`<p class="pz-target-note flow-space">规则版本、模型裁判版本与量表随任务冻结；缺证或评分错误记录“无法判断”，不归为被测对象质量失败。强制失败不能被平均分掩盖。</p>`);}
function caseValidation(c,locked){const v=c.validation;return panel('验证自动化配置',notice('当前使用合成环境验证交互设计。正式平台由选定执行环境运行验证，并保存真实日志、证据及清理回执。')+table(['检查项','结果'],(v?v.items:F.inspect(f(),c).map(name=>({name,ok:false}))).map(i=>[h(i.name),badge(i.ok?'演示通过':'待处理',i.ok?'good':'bad')]))+`<div class="pz-bottom"><small>${v?'验证时间：'+new Date(v.at).toLocaleString('zh-CN'):'尚未验证当前修订'}</small>${btn('运行合成自测','validate-case','','primary',locked)}</div>`+(v?`<details class="flow-space"><summary>查看动作绑定与自测记录</summary><pre>${h(JSON.stringify(v.trace||v.items,null,2))}</pre></details>`:''))+panel('审核与发布',kv([['作者','林工 · 评测工程师'],['业务规则确认',c.expert?'领域专家已确认当前修订':'等待领域专家'],['独立发布审核',c.review?'质量负责人已发布':'等待质量负责人'],['任务可选状态',c.status==='PUBLISHED'?'已发布，任务选择器可直接引用':'尚未发布，在线任务不能执行']])+`<div class="pz-actions flow-space">${c.status==='DRAFT'?btn('提交审核','submit-case','','primary',!v?.ok):c.status==='REVIEW'?(btn('确认业务规则','expert-case','','',S.role!=='expert')+btn('审核并发布','publish-case','','primary',S.role!=='quality'||!c.expert)):btn('加入评测任务','use-case',c.key,'primary')}${c.status==='PUBLISHED'?btn(c.active?'停用此版本':'恢复此版本','toggle-case',c.key,'ghost'):''}</div>`);}
function importPage(){return page(title('粘贴导入用例','粘贴“名称、对象类型、业务说明”三列制表符文本，预览后建立草稿。',btn('返回文件导入','import'))+panel('预览后创建草稿',area('用例内容','importText',importText,'第一行为表头，后续一行一个用例。导入文字不会自动获得可执行状态。')+`<div class="pz-actions">${btn('解析与预览','preview-import','','primary')}</div>`+(importErrors.length?notice(importErrors.map(h).join('<br>'),'bad'):'')+table(['名称','类型','处理'],importPreview.map(r=>[h(r.name),h(F.types[r.type]),'建立待自动化配置的草稿']))+(importPreview.length?btn('确认创建 '+importPreview.length+' 个草稿','save-import','','primary'):'')));}
function caps(){return page(title('执行与评分能力',capTab==='scorer'?'查看每种评分方法检查什么、如何判断，以及需要哪些材料。':'技术人员登记实现、验证资格并发布；任务使用已发布且范围兼容的固定版本。',(window.MultiEnvUI?.profileButton()||'')+(window.FrameworkEvaluationUI?.capabilityButton(capTab)||'')+(capTab==='scorer'?btn('校准模型评分','legacy-calibration','','primary'):btn('登记能力','new-cap','','primary')))+`<div class="flow-categories four">${[['executor','执行器'],['adapter','适配器'],['program','动作与程序'],['scorer','评分与判定']].map(([id,n])=>btn(n,'cap-tab',id,capTab===id?'selected':'')).join('')}</div>`+(capTab==='program'?panel('已登记动作与自动化程序',table(['名称','类型 / 固定版本','输入输出与实现','操作'],[...f().actions.map(a=>[h(a.name),'动作 · '+h(a.id),h(a.implementation)+'<small>'+h(a.evidence)+'</small>','已登记合成动作']),...f().scripts.map(a=>[h(a.name),'自动化程序 · '+h(a.id),h(a.commit)+'<small>'+h(a.schema)+' → '+h(a.output)+'</small>',badge(a.status==='PUBLISHED'?'可引用':'待发布')])])):capTab==='scorer'?scoringMethods():panel(capTab==='executor'?'执行器版本':'适配器版本',notice(capTab==='executor'?'执行器负责用例生命周期：准备、调用、等待、采证、取消与清理。':'适配器负责协议映射、授权引用、版本识别和状态转换；对象调用配置绑定具体版本。')+table(['名称 / 版本','支持方式与证据','负责人','状态','操作'],f().capabilities.filter(c=>c.kind===capTab).map(c=>[h(c.name)+'<small>'+h(c.id)+'</small>',h(c.modes.map(m=>modes[m]||m).join(' / '))+'<small>'+h(c.evidence.map(e=>evNames[e]||e).join(' / '))+'</small>',h(c.owner),badge(states[c.status],F.qualified(c)?'good':'warn'),btn('查看与维护','cap-open',c.id,'ghost')]))))+(window.FrameworkEvaluationUI?.registeredList(capTab)||'')+panel('待补齐需求',f().requests.length?table(['内容','负责角色','状态'],f().requests.map(r=>[h(r.text),r.owner,'待接入实现'])):'<p class="muted">暂无缺失能力申请。用户可从用例配置或任务匹配页就地登记缺项。</p>'));}
function capEditor(){const c=capDraft||f().capabilities.find(c=>c.id===capKey);if(!c)return caps();const locked=c.status==='PUBLISHED';return page(title(c.name||'登记能力','实现代码在源码仓库维护；这里管理可被平台调用的固定版本。',btn('返回能力列表','caps'))+(c.descriptionRef?notice('来源说明：'+h(c.descriptionRef)+'。名称与负责人已带入；请补齐固定实现、接口与验证。'):'')+panel('登记实现与支持范围',`<div class="pz-fields">${field('能力名称','cap.name',c.name,'','text',locked)}${select('能力类型','cap.kind',[['executor','执行器'],['adapter','适配器'],['action','执行动作'],['program','自动化程序']],c.kind,locked)}${field('源码 / 制品引用','cap.source',c.source,'固定仓库提交或制品地址。','text',locked)}${field('固定版本摘要','cap.digest',c.digest,'禁止使用 latest。','text',locked)}${field('程序或服务入口','cap.entry',c.entry,'只登记，不在浏览器执行代码。','text',locked)}${field('负责人','cap.owner',c.owner,'','text',locked)}${select('交互方式','cap.mode',Object.entries(modes),c.modes[0],locked)}${field('输入 Schema / 参数映射','cap.inputSchema',c.inputSchema||'standard-input@1','','text',locked)}${field('结果 Schema / 证据映射','cap.outputSchema',c.outputSchema||'standard-result@1','','text',locked)}${field('可用执行环境','readonly','内网测试环境 · test','','text',true)}</div><details class="flow-space" open><summary>声明支持的动作与证据</summary>${!locked&&['executor','adapter'].includes(c.kind)?`<div class="pz-radio">${f().actions.filter(a=>c.modes.includes(a.mode)).map(a=>`<label><input type="checkbox" data-fl-field="capop.${a.id}" ${c.operations.includes(a.id)?'checked':''}>${h(a.name)}</label>`).join('')}</div>`:''}${!locked?`<div class="pz-radio">${Object.entries(evNames).map(([k,n])=>`<label><input type="checkbox" data-fl-field="capev.${k}" ${c.evidence.includes(k)?'checked':''}>${n}</label>`).join('')}</div>`:''}${kv([['支持动作',h(c.operations.join(' / ')||'待补齐')],['证据类型',h(c.evidence.join(' / ')||'待补齐')],['运行操作','submit / query / cancel / artifacts / cleanup；按逻辑语义映射'],['凭证','仅引用 credential_ref，由执行环境按身份解析']])}</details>`)+panel('资格验证与发布',c.qualification?notice(c.qualification.ok?'合成契约验证通过；仅在标注范围内可选。':c.qualification.issues.join('；'),c.qualification.ok?'good':'bad'):notice('登记信息不等于能力可用；先验证当前版本。','warn'))+`<div class="pz-actions">${locked?btn('停用此版本','pause-cap',c.id):btn('保存登记','save-cap')+btn('验证契约（合成）','qualify-cap','','primary')+btn('审核并发布','publish-cap','','',!c.qualification?.ok||S.role!=='quality')}${returnTask?btn('返回原任务','return-task','','ghost'):''}</div>`);}
function materials(t){syncLegacy();syncMaterials();F.ensureTask(t);const suiteEntry=window.SuiteUI?.taskEntry(t)||'';if(t.materials.suite)return suiteEntry;const options=f().cases.filter(c=>c.type===t.type&&(!window.NavigationUI||NavigationUI.availableMaterial(c.key,t)));return suiteEntry+panel('数据、用例与指标',`<div class="pz-fields">${H.select('测试数据版本','material.data',[['','请选择'],...C.MATERIALS.data.filter(x=>x.types.includes(t.type)&&(!window.NavigationUI||NavigationUI.availableMaterial(x.id,t))).map(x=>[x.id,x.name+' · '+x.version])],t.materials.data)}${H.select('指标与评分规则','material.metrics',[['','请选择'],...C.MATERIALS.metrics.filter(x=>x.types.includes(t.type)&&(!window.NavigationUI||NavigationUI.availableMaterial(x.id,t))).map(x=>[x.id,x.name+' · '+x.id+(x.binding?.route==='bench'?'（分环境台架）':!x.binding?'（待绑定实现）':'')])],t.materials.metrics)}</div><div class="pz-panel-head flow-space"><h3>选择已发布用例</h3>${!t.run&&S.role==='engineer'?btn('新建用例','task-new-case',t.id,'ghost'):''}</div>`+table(['选择','用例 / 版本','执行方式','状态'],options.map(c=>[`<input type="checkbox" aria-label="选择${h(c.name)}版本${c.version}" data-fl-field="taskcase.${h(c.key)}" ${t.caseRefs.includes(c.key)?'checked':''} ${t.run||c.status!=='PUBLISHED'||!c.active?'disabled':''}>`,btn(h(c.name),'case-open',c.key+'|'+t.id,'ghost')+'<small>'+h(c.key)+'</small>',h(modes[c.mode]),badge(c.active?states[c.status]:'已停用',c.status==='PUBLISHED'&&c.active?'good':'warn')]))+notice('此处读取资产中心的同一份用例版本。发布新用例后返回即可选择；已冻结任务始终保留原版本。')+`<details><summary>重复试验与统计计划</summary>${field('每个用例的计划独立重复次数','task.repeats',t.flowPlan.repeats,'演示范围1至20；技术重试不增加独立样本数。','number',!!t.run)}<p class="muted">所有计划 trial 都纳入结果；不选择最好的一次。正式样本量、聚合与置信要求须在发布的评测方案中固定。</p></details><div class="pz-bottom">${btn('管理数据与指标','task-assets',t.id,'ghost')}${btn('管理用例','task-cases',t.id,'ghost')}${H.B('下一步：运行前检查','task-step','2','primary')}</div>`);}
function currentMatch(t){const o=C.object(Q(),t.objectId),v=C.version(o,t.versionId);return F.matches(f(),t,v);}
function preflight(t){const m=currentMatch(t);return panel('匹配执行能力',notice('任务装配服务根据用例动作、对象协议、证据要求和执行环境筛选能力。每个用例子任务固定一个主执行器；多个用例可使用不同执行器。')+table(['用例','主执行器','适配器 / 匹配依据','处理'],m.rows.map(r=>[h(r.name),r.executor?h(r.executor):badge('尚未匹配','bad'),h(r.adapter||'尚未绑定')+'<small>'+h(r.reason)+'</small>',btn('查看匹配候选','match-detail',r.key,'ghost')]))+(m.resourceReason?notice(h(m.resourceReason),'bad'):'')+`<div class="pz-bottom">${btn('维护执行能力','task-caps',t.id,'ghost')}${btn('重新匹配','match','','primary',!!t.run)}</div>`)+panel('运行前检查',table(['检查项','结果与原因','负责角色','操作'],C.taskChecks(Q(),t,window.SuiteUI?.assetForTask(t)).map(x=>[h(x.name),badge(x.ok?'通过':'待补齐',x.ok?'good':'warn')+'<small>'+h(x.detail)+'</small>',h(x.owner),x.ok?'—':x.key==='capabilities'?btn('处理缺项','task-caps',t.id,'ghost'):H.B('补齐','repair',x.key,'ghost')]))+`<div class="pz-bottom"><small>真实运行还须复检预算、资源租约、评分资格和独立参考授权；正式接口见 PRD。</small>${H.B('检查并继续','preflight-next','','primary',!!t.run)}</div>`);}
function matchDetail(){const t=task(),m=currentMatch(t),r=m.rows.find(x=>x.key===caseKey);if(!r)return preflight(t);return page(title('为用例匹配执行器',r.name,btn('返回原任务','return-task','','primary'))+panel('候选与排除原因',table(['执行器','兼容性','依据','操作'],r.candidates.map(c=>[h(c.name)+'<small>'+h(c.id)+'</small>',badge(c.ok?'可选':'不可选',c.ok?'good':'warn'),h(c.why.join('；')||'交互、动作、证据与环境匹配'),btn('选择此版本','select-executor',c.id,'',!c.ok||!!t.run||!!t.materials.suite)])))+notice('默认按项目配置的合格优先级选择；手动更换只允许兼容候选，需重新预检和确认。')+btn('申请补齐缺失能力','request-capability','executor'))}
function manifest(t){const m=t.run?.manifest;const rows=m?m.bindings:currentMatch(t).rows;
 const scoring=m?m.scoring:F.compileMetric(f(),t,C.selectedMetric(t));
 const suiteRef=(m?.materials||t.materials).suite;
 const scoringPlan=scoring?.ok?kv([...(suiteRef?[['评测套件',h(suiteRef)]]:[]),['指标版本',h(scoring.metricRef)],['计算实现',h(scoring.implementation)],
 ['判定项与证据',h(scoring.mappings.map(row=>row.caseRef+' · '+row.ruleKinds.map(kind=>F.checks[kind].name+'（'+evNames[F.checks[kind].evidence]+'）').join('、')).join(' / '))]])
 :notice(scoring?scoring.errors.join('；'):'历史运行未记录固定评分实现。','warn');
 return panel('本次执行清单',scoringPlan+table(['用例版本','主执行器','适配器','证据'],rows.map(r=>[h(r.case||r.key),h(r.executor||'待补齐'),h(r.adapter||'待补齐'),h((r.evidence||[]).map(e=>evNames[e]).join(' / '))]))+kv([['驱动关系','任务装配服务 → 调度服务 → Worker → 执行器 → 适配器 → 被测对象'],['独立重复',String(t.flowPlan.repeats)+' 次 / 用例；技术 attempt 单独记录'],['执行身份',h(f().resources.identity)],['运行方式','合成演示；正式平台使用固定制品和已授权执行池']])+(!t.run?`<details class="flow-space"><summary>演示异常场景</summary>${select('本次合成执行场景','task.fixture',[['normal','正常'],['violation','违反必需规则'],['missing','缺少必需证据'],['retry','超时后查询并技术恢复'],['judgeError','模型评分器错误'],['cleanup','清理失败与环境隔离']],t.flowPlan.fixture)}</details>`:''));}
function execution(t){const flow=t.run?.flow;if(!flow)return panel('运行与证据',notice('请先完成当前任务的运行前检查及两位负责人确认。','warn'));const summary=F.aggregate(t),running=!['COMPLETED','CANCELLED'].includes(flow.phase);return panel('运行与证据',notice(running?'本地合成执行已排队；点击下方操作查看调度、逐用例执行和回执。':'执行结束；查看结果、证据及仍需处理的事项。')+`<div class="flow-stats">${[['已执行 / 计划',summary.coverage],['技术尝试',summary.attempts],['清理',flow.cleanup],['用量对账',flow.usage]].map(([n,v])=>`<div><strong>${h(String(v))}</strong><small>${n}</small></div>`).join('')}</div>`+table(['用例 / trial','执行状态','attempt','证据','操作'],flow.items.map(i=>[h(i.name)+'<small>trial '+i.trial+'</small>',badge(execStates[i.execution]),String(i.attempts.length),String(i.evidence.length)+' 类',btn('查看证据','evidence',i.id,'ghost')]))+`<div class="pz-actions flow-space">${running?btn('推进一步','run-step','','primary')+btn('完成本次合成运行','run-all')+btn('取消运行','cancel','','ghost'):H.B('查看复核与报告','task-step','5','primary')}</div>`)+panel('驱动与回执',`<div class="pz-log">${flow.events.map(e=>`<p><strong>${h(e.actor)}</strong><br>${h(e.text)}</p>`).join('')}</div>`);}
function metricPanel(t,metric){
 if(!metric||metric.state!=='COMPUTED')return panel('所选指标的计算',notice('历史运行未记录所选指标的计算。请创建复测核对。','warn')+kv([['当时选择的指标',h(metric?.metricRef||t.run?.manifest?.materials?.metrics||'未记录')]]));
 const ratio=metric.denominator?metric.passed+' / '+metric.denominator+'（'+(100*metric.value).toFixed(1)+'%）':'无有效试次';
 const suiteRef=t.run?.manifest?.materials?.suite;
 return panel('所选指标的计算',kv([...(suiteRef?[['评测套件',h(suiteRef)]]:[]),['指标版本',h(metric.name+' · '+metric.metricRef)],['固定实现',h(metric.implementation)],
 ['计算结果',h(ratio)],['统计口径','通过试次 ÷ 有效判定试次'],['计划 / 缺证或待复核',h(metric.planned+' / '+metric.unknown)]]));
}
function results(t){const flow=t.run?.flow;if(!flow?.snapshot)return panel('复核与报告',notice('完成或取消运行后生成结果快照。执行中可先查看已采集证据。','warn'));const s=flow.snapshot.summary;const metric=flow.snapshot.metric;return metricPanel(t,metric)+panel('复核与报告',notice(!metric||metric.state!=='COMPUTED'?'此历史快照中的用例结论未包含所选指标计算。':s.gate==='PASS'?'全部必需判定满足当前演示方案':s.gate==='BLOCK'?'存在已确认的必需失败项':'结论暂不充分：查看缺证、待复核或运行异常',s.gate==='PASS'?'good':'warn')+`<div class="flow-stats">${[['结论',s.gate],['通过 / 失败',s.passed+' / '+s.failed],['无法判断',s.unknown],['执行覆盖',s.coverage]].map(([n,v])=>`<div><strong>${h(String(v))}</strong><small>${n}</small></div>`).join('')}</div>`+table(['用例 / trial','判定结果','有效性与依据','处理'],flow.items.flatMap(i=>i.scores.length?i.scores.map(sc=>[h(i.name)+'<small>trial '+i.trial+' · '+h(sc.name)+'</small>',badge(sc.judgment,sc.judgment==='PASS'?'good':sc.judgment==='FAIL'?'bad':'warn'),h(sc.validity)+'<small>'+h(sc.reason)+'</small>',btn(sc.validity==='PENDING'?'进入复核':'查看证据','evidence',i.id,'ghost')]):[[h(i.name),badge('UNKNOWN','warn'),h(execStates[i.execution]),btn('查看记录','evidence',i.id,'ghost')]]))+`<div class="pz-bottom"><small>快照 ${h(flow.snapshot.id)} · 历史快照 ${flow.snapshots.length} 份；缺证不填0分，技术重试不增加分母。</small><div class="pz-actions">${btn('创建复测','rerun')}${H.B('导出固定结果','export','','primary')}</div></div>`)+(flow.cleanup==='QUARANTINED'?panel('清理未完成',notice('环境已隔离，需平台运维查询外部实际状态并确认复位。','bad')+btn('查看资源处理入口','resources')):'');}
function evidence(){const t=task(),i=t.run?.flow?.items.find(i=>i.id===resultItem);if(!i)return results(t);const pending=i.scores.some(s=>s.method==='human'&&s.validity==='PENDING');return page(title(i.name,'trial '+i.trial+' · '+i.id,btn('返回原任务','return-task','','primary'))+panel('执行与证据',table(['证据类型','来源','记录'],i.evidence.map(e=>[h(evNames[e.kind]),h(e.source),h(e.ref)+'<small>'+h(e.objectVersion)+'</small><details><summary>查看原始内容</summary><pre>'+h(JSON.stringify(e.payload||{note:'历史合成记录；旧快照保留原始内容范围'},null,2))+'</pre></details>']))+`<details><summary>技术尝试与原始记录</summary><pre>${h(JSON.stringify({attempts:i.attempts,evidence:i.evidence},null,2))}</pre></details>`)+panel('判定明细',table(['判定项','结果 / 有效性','数值 / 依据','实现版本'],i.scores.map(s=>[h(s.name),h(s.judgment+' / '+s.validity),h(String(s.value??'无法判断'))+'<small>'+h(s.reason)+'</small>',h(s.implementation)])))+(pending?panel('完成独立复核',select('复核结论','reviewDecision',[['PASS','符合规则'],['FAIL','违反规则']],reviewDecision)+area('证据依据与理由','reviewReason',reviewReason)+btn('提交复核并生成新快照','review-result','','primary',!['expert','reviewerA','reviewerB'].includes(S.role))):''));}
function resources(){const r=f().resources;return page(title('资源与接入','维护目录来源、执行池、执行身份和调用配置；凭证始终只显示引用。',btn('保存接入配置','save-resources','','primary',!['ops','admin'].includes(S.role)))+panel('来源系统与发现方式',table(['来源','发现方式','状态','操作'],C.SOURCES.map(s=>[h(s.name),'已授权目录 API / 手工登记',badge(s.connected?'合成连接已登记':'待接入',s.connected?'good':'warn'),btn('维护来源连接','source-open',s.id,'ghost')]))+notice('目录中的对象和版本被读取到广场；凭证引用由执行身份解析，不从用户电脑扫描服务。'))+panel('执行环境与身份',`<div class="pz-fields">${field('执行池','resource.pool',r.pool)}${field('执行身份','resource.identity',r.identity)}${select('目录连接状态（演示）','resource.connected',[['true','已连接'],['false','连接失效']],String(r.connected))}${select('执行身份授权（演示）','resource.authorized',[['true','已授权'],['false','授权失效']],String(r.authorized))}${select('Worker 健康状态（演示）','resource.workerReady',[['true','有可用 Worker'],['false','无可用 Worker']],String(r.workerReady))}${field('凭证引用','readonly','credential://project/cockpit/evaluation','','text',true)}</div>`+notice('来源连接器只发现已授权目录中的对象和固定版本。对象构建与部署仍由来源系统负责；没有部署版本时保留未就绪状态。'))+panel('缺项与接口负责人',table(['依赖','接入方式','负责人'],[['对象目录','配置已授权目录连接器 → 同步对象身份和固定版本','接入负责人'],['执行池','Worker 登记 → 心跳 → 环境和能力资格验证','平台运维'],['对象调用','对象详情 → 调用配置 → 选择适配器、入口与凭证引用','接入负责人'],['工具与独立状态','适配器声明动作能力；独立观察器提供状态证据','业务系统 / 设备负责人'],['评分与参考','已发布评分规则及只对评分身份可见的参考引用','领域专家 / 评分维护人']]))+panel('运维恢复',notice('取消、超时、未知副作用、清理失败和用量对账继续使用既有恢复入口。')+btn('打开既有资源恢复流程','legacy-resources')));}
function sourcePage(){const s=sourceDraft;if(!s)return resources();return page(title('维护来源连接',s.name,btn('返回资源与接入','resources'))+panel('目录接入信息',`<div class="pz-fields">${field('来源名称','source.name',s.name)}${field('目录 API 入口引用','source.endpoint',s.endpoint,'由来源系统负责人提供，接入前不得假定可发现对象。')}${field('协议与字段映射','source.schema',s.schema,'映射对象ID、类型、固定版本、运行环境与调用入口。')}${select('授权凭证引用','source.credential',[['credential://project/cockpit/catalog','项目目录读取凭证（引用）'],['','暂未授权']],s.credential)}${field('来源接口负责人','source.owner',s.owner)}${field('验证执行身份','readonly',f().resources.identity,'从执行环境取得。','text',true)}</div>`+notice('接入负责人先登记配置，在平台执行环境验证目录查询、权限过滤、版本证明和分页同步；失败保留输入。当前仅检查合成配置。')+`<div class="pz-actions">${btn('保存配置','source-save')}${btn('检查配置（合成）','source-check','','primary')}</div>`));}
function connectionLink(r){return `<div class="pz-actions flow-space">${btn('维护调用方式与授权引用','binding',r.objectId||'','ghost')}</div>`;}
function objectBinding(o,v){return panel('对象调用配置',kv(Object.entries(v?.bindings||{}).map(([mode,id])=>[modes[mode]||mode,h(id)])),btn('维护调用配置','binding',o.id+'|'+(v?.id||''),'ghost'));}
function binding(){const o=C.object(Q(),bindContext?.objectId),v=o?.versions.find(x=>x.id===bindContext?.versionId)||o?.versions[0];if(!o||!v)return page(title('调用配置待补齐','先完成对象登记并从来源取得固定版本。',btn('返回原位置','binding-return','','primary')));return page(title('维护对象调用配置',o.name+' · '+v.label,btn('保存并返回','binding-save','','primary',!['engineer','ops','admin'].includes(S.role)))+panel('适配器、调用入口与授权',notice('选择已发布且通过所选环境资格验证的适配器。修改配置后，旧接入验证与任务确认失效。')+`<div class="pz-fields">${Object.entries(modes).filter(([m])=>m!=='device').map(([mode,name])=>select(name+'调用适配器','binding.'+mode,[['','未接入此方式'],...f().capabilities.filter(c=>c.kind==='adapter'&&F.qualified(c)&&c.modes.includes(mode)).map(c=>[c.id,c.name+' · '+c.id])],bindContext.bindings[mode]||'')).join('')}${field('已登记调用入口引用','binding.endpoint',bindContext.endpoint,'可由来源系统自动带入。')}${select('授权凭证引用','binding.credential',[['credential://project/cockpit/evaluation','项目评测服务凭证（引用）'],['','暂未授权']],bindContext.credential)}</div>`+btn('缺少适配器？前往登记','task-caps',returnTask||'','ghost')));}
function goCases(){S.assetType='case';S.assetGroup=1;window.NavigationUI?.openAssetList('case');route('assets');}
function clearReturnContext(){returnTask=null;}
function openCase(key,taskId=null){
 if(!F.get(f(),key))throw Error('所选用例版本不存在，请重新选择。');
 if(taskId&&!C.task(Q(),taskId))throw Error('来源任务已不存在，请从任务列表重新选择。');
 returnTask=taskId;
 caseKey=key;
 caseStep=0;
 route('flow-case');
}
function copyCase(key){
 guard(['engineer']);
 const source=F.get(f(),key);
 if(!source)throw Error('找不到所选来源版本。');
 openCase(F.copyCase(f(),source).key);
}
function returnToTask(){
 const id=returnTask;
 clearReturnContext();
 if(!id)throw Error('没有来源任务，请从任务列表打开。');
 P.openTask(id);
}
function handle(action,key){msg='';const c=curr(),t=C.task(Q());try{switch(action){
 case 'asset-type':S.assetType=key;S.assetGroup=assetGroups.findIndex(g=>g.types.some(x=>x[0]===key));route('assets');return;
 case 'case-list':goCases();return;
 case 'new-case':{
  guard(['engineer']);
  const source=returnTask?C.task(Q(),returnTask):null;
  openCase(F.draft(f(),{type:source?.type}).key,source?.id);return;
 }
 case 'task-new-case':{
  guard(['engineer']);
  const source=C.task(Q(),key);
  if(!source||source.run)throw Error('请从未冻结的任务新建用例。');
  openCase(F.draft(f(),{type:source.type}).key,source.id);return;
 }
 case 'case-open':{const [ref,taskId]=key.split('|');openCase(ref,taskId||((S.route==='assets')?returnTask:null));return;}case 'case-step':caseStep=Number(key);window.scrollTo(0,0);break;
 case 'save-case':msg='用例草稿已保存，可稍后补齐自动化配置。';break;
 case 'case-revise':guard(['engineer']);caseKey=F.revise(f(),c).key;caseStep=0;break;
 case 'add-step':F.edit(c,'steps',[...c.steps,{text:'',action:'',parameter:''}]);break;
 case 'remove-step':F.edit(c,'steps',c.steps.filter((_,i)=>i!==Number(key)));break;
 case 'sample-actions':F.edit(c,'mode','event');F.edit(c,'steps',f().actions.filter(a=>a.mode==='event').map(a=>({text:a.name,action:a.id,parameter:a.parameter})));break;
 case 'add-rule':F.edit(c,'rules',[...c.rules,F.rule(c.mode==='event'?'no_call':c.mode==='script'?'artifact':'answer')]);break;
 case 'remove-rule':F.edit(c,'rules',c.rules.filter((_,i)=>i!==Number(key)));break;
 case 'validate-case':guard(['engineer']);F.validate(f(),c);break;
 case 'submit-case':guard(['engineer']);F.submit(f(),c);break;
 case 'expert-case':F.approve(c,S.role);break;case 'publish-case':F.approve(c,S.role);msg='已发布固定版本；任务选择器已可引用。';break;
 case 'toggle-case':guard(['quality']);c.active=!c.active;break;
 case 'use-case':{if(c.status!=='PUBLISHED'||!c.active)throw Error('只能选用已发布且有效的版本。');const target=returnTask?C.task(Q(),returnTask):P.newTask({type:c.type,name:c.name+'评测',goal:c.goal});F.ensureTask(target);F.mark(target);if(!target.caseRefs.includes(c.key))target.caseRefs.push(c.key);target.step=1;P.openTask(target.id);return;}
 case 'task-assets':returnTask=key;S.assetGroup=-1;S.assetType='all';route('assets');return;case 'task-cases':returnTask=key;goCases();return;case 'return-task':returnToTask();return;
 case 'import':S.assetType='case';route('import');return;
 case 'preview-import':{importPreview=[];importErrors=[];const lines=importText.trim().split(/\r?\n/);for(const [i,line]of lines.slice(1).entries()){const [name,type,description]=line.split('\t');const k=Object.keys(F.types).find(k=>k===type||F.types[k]===type);if(!name?.trim()||!k)importErrors.push('第'+(i+2)+'行缺名称或有效类型');else importPreview.push({name,type:k,description:description||'',sourceRow:i+2});}if(!importPreview.length&&!importErrors.length)importErrors.push('至少需要一行表头和一行数据。');break;}
 case 'save-import':guard(['engineer']);if(importErrors.length)throw Error('请先处理导入错误。');for(const item of importPreview){const c=F.draft(f(),item);c.source='粘贴导入 · 第'+item.sourceRow+'行';}importPreview=[];goCases();return;
 case 'case-list-page':caseListPage+=Number(key);break;
 case 'request-capability':{const text=(c?.name||t?.name||'评测任务')+'：补齐'+({action:'执行动作',script:'固定自动化程序',executor:'兼容执行器'}[key]||key);f().requests.push({id:'REQ-'+Date.now(),text,owner:'能力维护人',at:F.now()});msg='已保存缺项申请：'+text+'。负责人：能力维护人；可先保存草稿。';break;}
 case 'caps':route('capabilities');return;case 'cap-tab':capTab=key;break;
 case 'task-caps':returnTask=key||returnTask;route('capabilities');return;
 case 'cap-open':capKey=key;capDraft=null;route('flow-capability');return;
 case 'new-cap':guard(['engineer','ops']);capDraft={id:'CAP-'+(++f().counter)+'@1',name:'',kind:capTab==='adapter'?'adapter':capTab==='program'?'program':'executor',source:'',digest:'',entry:'',owner:'',version:'1.0',modes:['request'],operations:['request@1'],evidence:['response'],environments:['test'],status:'DRAFT',qualification:null,project:'cockpit'};capKey=capDraft.id;route('flow-capability');return;
 case 'save-cap':{guard(['engineer','ops']);if(capDraft){f().capabilities.push(capDraft);capKey=capDraft.id;capDraft=null;}msg='能力登记已保存。完成契约验证和审核后才可被选择。';break;}
 case 'qualify-cap':{guard(['engineer','ops']);const x=capDraft||f().capabilities.find(x=>x.id===capKey);F.qualify(x);break;}
 case 'publish-cap':{guard(['quality']);const x=capDraft||f().capabilities.find(x=>x.id===capKey);if(!x.qualification?.ok||F.capProblems(x).length)throw Error('当前版本未通过契约验证。');x.status='PUBLISHED';if(x.kind==='program'&&!f().scripts.some(a=>a.id===x.id))f().scripts.push({id:x.id,name:x.name,commit:x.digest,entry:x.entry,schema:x.inputSchema||'standard-input@1',output:x.outputSchema||'standard-result@1',evidence:x.evidence,mode:'script',status:'PUBLISHED',synthetic:true});if(x.kind==='action'&&!f().actions.some(a=>a.id===x.id))f().actions.push({id:x.id,name:x.name,mode:x.modes[0],evidence:x.evidence.join(','),parameter:'',implementation:x.entry,source:x.source,digest:x.digest});if(capDraft){f().capabilities.push(capDraft);capDraft=null;}msg='已发布合成环境可用版本；生产资格需真实联调验证。';break;}
 case 'pause-cap':guard(['quality','ops']);f().capabilities.find(x=>x.id===key).status='PAUSED';break;
 case 'match':F.match(f(),F.ensureTask(t),C.version(C.object(Q(),t.objectId),t.versionId));msg='已重新检查每条用例的执行依赖。';break;
 case 'match-detail':returnTask=t.id;caseKey=key;route('flow-match');return;
 case 'select-executor':F.mark(t);t.flowPlan.selection[caseKey]=key;F.match(f(),t,C.version(C.object(Q(),t.objectId),t.versionId));msg='已选择固定执行器版本；请重新运行前检查。';break;
 case 'run-step':F.step(t);break;case 'run-all':{let n=0;while(!['COMPLETED','CANCELLED'].includes(t.run.flow.phase)&&n++<500)F.step(t);break;}
 case 'cancel':F.cancel(t);break;case 'evidence':returnTask=t.id;resultItem=key;reviewReason='';route('flow-evidence');return;
 case 'review-result':F.review(t,resultItem,reviewDecision,reviewReason,S.role);msg='复核已保存，生成了新的结果快照；历史快照保留。';break;
 case 'rerun':{const n=P.newTask({name:t.name+' · 复测',goal:t.goal,type:t.type,objectId:t.objectId,versionId:t.versionId,environment:t.environment});F.ensureTask(n);n.materials=F.clone(t.materials);n.caseRefs=F.clone(t.caseRefs);n.flowPlan=F.clone(t.flowPlan);n.flowPlan.match=null;msg='已创建独立复测草稿，原结果保持不变。';break;}
 case 'source-open':{const src=C.SOURCES.find(x=>x.id===key);sourceDraft=F.clone(f().sourceConfigs?.[key]||{id:key,name:src.name,endpoint:'directory-ref://'+key,schema:'directory-object-version@1',credential:'credential://project/cockpit/catalog',owner:'来源系统接口负责人'});route('flow-source');return;}case 'source-save':guard(['ops','admin']);f().sourceConfigs=f().sourceConfigs||{};f().sourceConfigs[sourceDraft.id]=F.clone(sourceDraft);msg='来源连接配置已保存；目录发现须在执行环境验证后启用。';break;case 'source-check':guard(['ops','admin']);if(!['endpoint','schema','credential','owner'].every(k=>sourceDraft[k]?.trim()))throw Error('请补齐目录入口、协议映射、授权引用及负责人。');msg='合成配置检查通过；真实目录查询与权限过滤仍需接口联调验收。';break;case 'resources':route('resources');return;case 'save-resources':guard(['ops','admin']);msg='接入配置已保存；尚未执行的任务将重新核对环境、身份和 Worker 状态。';break;
 case 'legacy-resources':route('flow-legacy-resources');return;case 'legacy-calibration':route('calibration');return;
 case 'binding':{const [objectId,versionId]=key.split('|');const o=C.object(Q(),objectId);const r=Q().registration;let v=C.version(o,versionId)||o?.versions[0];if(r?.objectId===o?.id){try{v=C.prepareVersion(Q());}catch{}}bindContext={objectId,versionId:v?.id,from:S.route,bindings:F.clone(v?.bindings||{}),endpoint:v?.endpoint||'',credential:v?.credential?.startsWith('credential:')?v.credential:'credential://project/cockpit/evaluation'};route('flow-binding');return;}
 case 'binding-save':{guard(['engineer','ops','admin']);const o=C.object(Q(),bindContext.objectId),v=C.version(o,bindContext.versionId);if(!v)throw Error('缺少固定对象版本');if(!bindContext.endpoint.trim())throw Error('请补齐已登记调用入口引用');v.bindings=Object.fromEntries(Object.entries(bindContext.bindings).filter(([,v])=>v));v.endpoint=bindContext.endpoint;v.credential=bindContext.credential;v.checks={};if(Q().registration)Q().registration.result=null;for(const task of Q().tasks.filter(x=>x.objectId===o.id&&!x.run))C.invalidate(task);route(bindContext.from);return;}
 case 'binding-return':route(bindContext?.from||'plaza');return;
 }redraw();}catch(e){msg=e.message;redraw();}}
function change(e){const el=e.target,key=el.dataset.flField;if(!key||key==='readonly')return;const value=el.type==='checkbox'?el.checked:el.value;try{if(key==='caseQuery'){query=value;caseListPage=0;}else if(key==='importText')importText=value;else if(key==='reviewReason')reviewReason=value;else if(key==='reviewDecision')reviewDecision=value;else if(key.startsWith('case.')){guard(['engineer']);const k=key.slice(5);F.edit(curr(),k,k==='timeout'?Number(value):value);if(k==='method'&&value==='script')F.edit(curr(),'mode','script');}
 else if(key.startsWith('step.')){guard(['engineer']);const [,i,k]=key.split('.'),arr=F.clone(curr().steps);arr[Number(i)][k]=value;if(k==='action'&&value)arr[Number(i)].parameter=f().actions.find(a=>a.id===value)?.parameter||'';F.edit(curr(),'steps',arr);}
 else if(key.startsWith('rule.')){guard(['engineer']);const [,i,k]=key.split('.'),arr=F.clone(curr().rules);arr[Number(i)][k]=value;if(k==='kind')arr[Number(i)].expected=F.checks[value].defaultValue;F.edit(curr(),'rules',arr);}
 else if(key.startsWith('taskcase.')){const t=task();F.mark(t);const k=key.slice(9);t.caseRefs=value?[...new Set([...t.caseRefs,k])]:t.caseRefs.filter(x=>x!==k);}
 else if(key.startsWith('task.')){const t=task();F.mark(t);t.flowPlan[key.slice(5)]=key==='task.repeats'?Number(value):value;}
 else if(key.startsWith('capop.')||key.startsWith('capev.')){guard(['engineer','ops']);const c=capDraft||f().capabilities.find(c=>c.id===capKey);if(c.status==='PUBLISHED')return;const isOp=key.startsWith('capop.'),k=key.slice(6),arr=isOp?'operations':'evidence';c[arr]=value?[...new Set([...c[arr],k])]:c[arr].filter(x=>x!==k);c.qualification=null;}
 else if(key.startsWith('cap.')){guard(['engineer','ops']);const c=capDraft||f().capabilities.find(c=>c.id===capKey);if(c.status==='PUBLISHED')return;const k=key.slice(4);if(k==='mode'){c.modes=[value];c.operations=[];c.evidence=[];}else c[k]=value;c.qualification=null;}
 else if(key.startsWith('resource.')){guard(['ops','admin']);f().resources[key.slice(9)]=['true','false'].includes(value)?value==='true':value;}
 else if(key.startsWith('source.')){guard(['ops','admin']);sourceDraft[key.slice(7)]=value;}else if(key.startsWith('binding.')){const k=key.slice(8);if(['endpoint','credential'].includes(k))bindContext[k]=value;else bindContext.bindings[k]=value;}
 save();if(e.type==='change'||key==='caseQuery'){const pos=el.selectionStart;redraw();const n=document.querySelector('[data-fl-field="'+key+'"]');n?.focus();if(typeof pos==='number'&&n?.setSelectionRange)n.setSelectionRange(pos,pos);}
 }catch(err){msg=err.message;redraw();}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-fl]');if(!b||b.disabled)return;e.preventDefault();e.stopPropagation();handle(b.dataset.fl,b.dataset.key||'');},true);
document.addEventListener('input',change);document.addEventListener('change',change);
const oldAssets=pages.assets,oldResources=pages.resources,oldAllAssets=allAssets;
function syncLegacy(){
 const model=f();
 let changed=false;
 for(const asset of oldAllAssets().filter(a=>a.kind==='case')){
  if(asset.version==='v1.0'&&model.cases.some(c=>c.id===asset.id&&!c.legacy&&c.version===1))continue;
  let c=model.cases.find(c=>c.id===asset.id&&c.legacy?.version===asset.version&&!c.origin?.sourceRef);
  if(c&&c.revision>1)continue;
  const description=asset.content||'已导入原用例说明，请补齐自动化配置';
  if(c&&c.name===asset.name&&c.description===description)continue;
  const type=asset.id==='AS-012'?'AGENT':(asset.targets||[]).includes('模型')?'MODEL':(asset.targets||[]).includes('非Agent应用')?'APPLICATION':'AGENT';
  if(!c){
   const version=Math.max(0,...model.cases.filter(c=>c.id===asset.id).map(c=>c.version))+1;
   c=F.draft(model,{name:asset.name,type,description});
   Object.assign(c,{id:asset.id,version,key:asset.id+'@'+version});
  }
  Object.assign(c,{name:asset.name,description,type,source:asset.source||'既有用例导入',legacy:F.clone(asset)});
  changed=true;
 }
 if(changed)save();
}
function syncMaterials(){
 const source=oldAllAssets();
 for(const [key,kind]of [['data','dataset'],['metrics','metric']]){
  const mapped=source.filter(a=>a.kind===kind&&a.status==='已发布').map(a=>{
   const id=EvaluationCore.key(a),agent=a.config?.agentEvaluation;
   const targets=['AS-001','AS-021'].includes(a.id)?['Agent']:a.targets||[];
   const item={id,name:a.name,version:a.version,types:targets.map(t=>t==='模型'?'MODEL':t==='非Agent应用'?'APPLICATION':'AGENT')};
   if(kind==='dataset'&&agent)item.route='bench';
   if(kind==='metric')item.binding=agent?{route:'bench',schema:agent.program?.schema,implementation:agent.program?.implementation,
    evidence:agent.measure==='actuation'?'有效确认和独立三区车况':null}:F.metricBinding(id);
   return item;
  });
  if(mapped.length)C.MATERIALS[key]=mapped;
 }
}
function visibleCase(c){
 return {...c.legacy,id:c.id,flowRef:c.key,kind:'case',group:1,type:'评测用例',name:c.name,version:String(c.version),
  status:states[c.status],owner:c.owner,targets:[F.types[c.type]],content:c.description,count:c.steps.length+' 个执行动作'};
}
allAssets=function(){syncLegacy();return [...oldAllAssets().filter(a=>a.kind!=='case'),...f().cases.map(visibleCase)];};

pages.assets=()=>S.assetType==='case'?caseList():(returnTask?wrap(notice('来源任务 '+h(returnTask)+' '+btn('返回原任务','return-task','','ghost'))):'')+oldAssets();Object.assign(pages,{'flow-case':caseEditor,'flow-import':()=>window.MultiEnvUI?.importPage()||importPage(),'flow-text-import':importPage,capabilities:caps,'flow-capability':capEditor,'flow-match':matchDetail,'flow-evidence':evidence,resources,'flow-source':sourcePage,'flow-binding':binding,'flow-legacy-resources':oldResources});
document.addEventListener('click',event=>{
 const nav=event.target.closest('#nav [data-action="go"]');
 if(!nav)return;
 returnTask=nav.dataset.param==='metrics'&&S.route==='task-prep'?C.task(Q())?.id||null:null;
},true);
window.FlowUI={materials,preflight,manifest,execution,results,connectionLink,objectBinding,openCase,copyCase,
 newCase(){handle('new-case','');},newCapability(kind,description){capTab=kind;handle('new-cap','');if(description){Object.assign(capDraft,{name:description.name,owner:description.owner,descriptionRef:EvaluationCore.key(description)});P.paint();}},
 contextReturn:()=>returnTask?btn('返回原任务 '+h(returnTask),'return-task','','primary'):'',
 hasCase:key=>Boolean(F.get(f(),key)),clearReturnContext,
 metricDirectoryReturn:()=>S.route==='metrics'&&returnTask?btn('返回原任务 '+h(returnTask),'return-task','','primary'):''};
let lastRenderedRoute=S.route;const oldRender=render;render=function(){if(lastRenderedRoute!==S.route){msg='';lastRenderedRoute=S.route;}syncMaterials();oldRender();if(!['ops','admin'].includes(S.role))document.querySelectorAll('[data-fl-field^="resource."],[data-fl-field^="source."]').forEach(n=>n.disabled=true);if(S.route.startsWith('flow-')){const nav=['flow-source','flow-legacy-resources'].includes(S.route)?'resources':['flow-capability','flow-env-profiles','flow-framework'].includes(S.route)?'capabilities':['flow-match','flow-evidence'].includes(S.route)?'tasks':S.route==='flow-binding'?'plaza':'assets';document.querySelector('#nav [data-param="'+nav+'"]')?.classList.add('active');document.getElementById('crumb').innerHTML=nav==='resources'?'平台管理 / <b>资源与接入</b>':nav==='assets'?'资产与能力 / <b>评测用例</b>':nav==='capabilities'?'资产与能力 / <b>执行与评分能力</b>':nav==='plaza'?'工作台 / <b>对象调用配置</b>':'评测执行 / <b>评测任务</b>';}if(S.route==='task-prep'&&C.task(Q())?.run)document.querySelectorAll('[data-fl-field^="task."]').forEach(n=>n.disabled=true);};
if(S.route==='case-builder'){S.assetType='case';S.route='assets';}render();
})();
