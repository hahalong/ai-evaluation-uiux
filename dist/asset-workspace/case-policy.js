'use strict';
const CasePolicy=(()=>{
 const objectTypes=[['model','模型'],['application','非 Agent 应用'],['agent','Agent']];
 const elements=[['interaction','多轮或事件交互'],['actions','操作顺序与工具调用'],['state','初始状态与结束状态'],['constraints','授权、禁止结果与恢复'],['files','输入文件或输出产物']];
 function decide({object_type='model',elements:chosen=[],reuse_manual=false}={}){const enabled=[...new Set(chosen)].filter(k=>elements.some(e=>e[0]===k));const needs_case=enabled.some(k=>['interaction','actions','state','constraints'].includes(k))||reuse_manual;return {object_type,elements:enabled,needs_case,reason:needs_case?'需要保存交互、步骤、状态、约束或已有手工用例，使用用例。':'按数据逐条评价即可：选择数据集、指标和评分器，不需要新建用例。',required:needs_case?['objective','input_or_precondition','expected_or_metric',...(enabled.includes('interaction')?['interaction_stop']:[]),...(enabled.includes('state')?['initial_state','state_observation']:[]),...(enabled.includes('constraints')?['forbidden_effects','cleanup']:[])]:[]};}
 return {objectTypes,elements,decide};
})();
if(typeof module!=='undefined')module.exports=CasePolicy;
