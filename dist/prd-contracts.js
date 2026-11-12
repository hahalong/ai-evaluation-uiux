/* UI data contracts. Registration remains a draft, never execution qualification. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.PRDContracts=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const kinds={executor:'执行器',adapter:'调用适配器',scorer:'评分器 / 裁判',check:'检查包'};
  const objects=['模型','Agent','非Agent应用'];
  const protocols={sync_http:'同步 HTTP',stream:'流式',async_job:'异步任务',browser:'浏览器',device:'设备',replay:'回放'};
  const unique=a=>[...new Set(a||[])];
  function capability(input){
    if(!input.name?.trim())throw Error('请填写能力名称。');
    if(!kinds[input.kind])throw Error('请选择能力类型。');
    const targets=unique(input.targets),ps=unique(input.protocols),refs=unique(input.taskTypeRefs);
    if(targets.some(x=>!objects.includes(x))||ps.some(x=>!protocols[x]))throw Error('对象类型或协议不在当前登记范围，请核对。');
    if(refs.some(x=>!/^\S+@\S+$/.test(x)))throw Error('任务类型引用须使用稳定 key@版本，每行一项；请勿填写业务案例名称。');
    return {name:input.name.trim(),kind:input.kind,type:kinds[input.kind],targets,config:{capabilityRegistration:true,contractVersion:2,taskTypeRefs:refs,protocols:ps,matchingStatus:'UNVERIFIED'}};
  }
  function clearReplay(p){Object.assign(p,{scene:null,importedInput:null,files:{},sourceFiles:[],externalConfig:null,externalEvidenceMode:false,taskTypeRef:'',outputs:{},metricIds:[],supportedMetrics:[],dependencies:[],inputReady:false,samplePolicy:null,connectionVerified:false,entry:'待选择',pilot:null,preflight:null,confirmations:{},manifest:null});}
  return {kinds,objects,protocols,capability,clearReplay};
});
