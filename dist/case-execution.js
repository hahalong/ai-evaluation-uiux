/* Interaction design: structured action drafts, never a claim of runtime support. */
(function(root){
 const types={request:'发送请求',event:'发送事件',wait:'等待回应或事件',script:'运行用户脚本',observe:'采集执行证据',note:'步骤说明（不执行）'};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const action=(type='request')=>({type,source:'case_input',eventName:'',content:'',signal:'response',contains:'',timeout:30,channels:['response'],duration:5,note:''});
 function begin(d){const a=action(d.mode==='事件与用户脚本'?'event':'request');return {schemaVersion:1,status:'draft',runtimeVerified:false,actions:[a]};}
 function issues(d){const p=d.executionPlan;if(!p)return[];const out=[];if(!p.actions?.length)return['至少配置一个执行动作'];
 p.actions.forEach((a,i)=>{const at='动作'+(i+1)+'：';if(!types[a.type])out.push(at+'选择支持的动作类型');
 if(['request','event'].includes(a.type)){
 if(!['case_input','inline'].includes(a.source))out.push(at+'选择输入内容来源');
 if(a.source==='case_input'&&!d.bindings?.input)out.push(at+'先选择输入数据的具体版本');
 if(a.source==='inline'&&!a.content?.trim())out.push(at+'填写实际发送内容');
 if(a.type==='event'){if(!a.eventName?.trim())out.push(at+'填写事件名称');if(a.source==='inline'&&a.content?.trim()){try{const v=JSON.parse(a.content);if(!v||typeof v!=='object'||Array.isArray(v))throw Error();}catch(e){out.push(at+'事件数据必须是合法的JSON对象');}}}
 }
 if(a.type==='script'&&(!d.bindings?.script||d.mode!=='事件与用户脚本'))out.push(at+'切换为事件触发与模拟用户，并选择用户脚本版本');
 if(a.type==='wait'&&(!['response','event','completion'].includes(a.signal)||!Number.isFinite(Number(a.timeout))||Number(a.timeout)<=0||Number(a.timeout)>Number(d.timeout)))out.push(at+'选择等待内容，并设置不超过整条用例时限的等待秒数');
 if(a.type==='observe'&&(!a.channels?.length||a.channels.some(x=>!['response','tool_calls','device_state','output_files','retrieval'].includes(x))||!Number.isFinite(Number(a.duration))||Number(a.duration)<=0||Number(a.duration)>Number(d.timeout)))out.push(at+'选择证据来源，并设置有效采集时长');
 if(a.type==='note'&&!a.note?.trim())out.push(at+'填写步骤说明或移除此项');
 });
 if(!p.actions.some(a=>['request','event','script'].includes(a.type)))out.push('至少配置发送请求、发送事件或运行用户脚本，说明文字不会启动被测对象');return out;
 }
 function serialize(d){if(!d.executionPlan)return null;return {schema_version:1,status:'draft',runtime_verified:false,actions:d.executionPlan.actions.map(a=>{const x={...clone(a)};if(['request','event'].includes(a.type)){x.input_ref=a.source==='case_input'?{...(d.bindings?.input||{}),sample_id:d.sample||null}:null;}if(a.type==='script')x.user_script_ref=clone(d.bindings?.script||null);return x;}),requirements:['适配器确认请求与事件字段的对应关系','执行器支持所选动作及等待条件','证据采集通道可用','经过实际试运行验证']};}
 root.CaseExecution={types,action,begin,issues,serialize};if(typeof module==='object'&&module.exports)module.exports=root.CaseExecution;
})(typeof window==='undefined'?globalThis:window);
