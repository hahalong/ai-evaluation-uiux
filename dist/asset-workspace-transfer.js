/* Canonical asset data only; editing checkpoints remain outside execution assets. */
(function(root,factory){if(typeof module==='object')module.exports=factory();else root.AssetWorkspaceTransfer=factory();})(globalThis,function(){
 const clone=x=>JSON.parse(JSON.stringify(x)),text=v=>typeof v==='string'?v:JSON.stringify(v??''),key=a=>a.id+'@'+a.version;
 const names={dataset:'数据集',reference:'独立参考',case:'用例'};
 function prepare(payload,kind){const out=[];
  function item(d,k,actual){return {sourceId:d.id,kind:k,data:{kind:k,type:names[k]||k,name:d.name||'未命名草稿',owner:d.owner||'',source:d.source||d.spec?.source_namespace||'',description:d.description||'',tags:clone(d.tags||[]),visibility:d.visibility||'project',purpose:d.purpose||'evaluation',config:{actual:clone(actual),workspaceFormat:1,assetWorkspace:{format:1,kind:k,sourceId:d.id}},status:'草稿'}};}
  if(kind==='dataset'&&payload.data){const d=payload.data,samples=(d.records||[]).map(r=>({sample_id:r.sample_id,inputs:clone(r.inputs||{}),metadata:clone(r.metadata||{}),source_sample_id:r.source_sample_id,source_namespace:r.source_namespace,group_key:r.group_key}));
   const ds=item(d,'dataset',{schema:clone(d.definition),mapping:clone(d.mapping||[]),samples,files:clone((payload.checkpoint?.state?.files||[]).filter(f=>JSON.stringify(samples).includes(JSON.stringify(f.id)))).map(f=>({...f,content_available:false}))});ds.data.contentSet={member_kind:'sample',members:samples};out.push(ds);
   const records=(d.records||[]).filter(r=>r.expected&&Object.keys(r.expected).length).map(r=>({sample_id:r.sample_id,reference_id:r.reference_id,expected:clone(r.expected)}));
   if(records.length){const ref=item({...d,id:d.id+'-reference',name:d.name+' · 独立参考'},'reference',{records});ref.datasetSourceId=d.id;out.push(ref);ds.referenceSourceId=ref.sourceId;}
  }else if(kind==='case'){for(const d of payload.cases||[]){const x=item(d,'case',d.spec||{}),s=d.spec||{};x.data.caseSpec={name:d.name,goal:s.objective||d.name,preconditions:text(s.preconditions),inputMode:s.dataset_version_id?'dataset':'inline',input:text(s.inline_inputs),datasetRef:s.dataset_version_id||'',sampleId:s.sample_id||'',steps:(s.manual_steps||[]).map((v,i)=>(i+1)+'. '+(v.action_text||v.action||v.text||'')).join('\n'),expected:text(s.inline_expected),source:x.data.source,executionMode:s.execution_mode||'manual'};out.push(x);}}
  return out;
 }
 function recoverMap(core,asset){const map={};if(!asset?.config?.assetWorkspace)return map;const sid=asset.config.assetWorkspace.sourceId;map[sid]=key(asset);const ref=core.find(asset.config.referenceVersion);if(ref)map[sid+'-reference']=key(ref);return map;}
 function metadata(d,old){return {...(old?{}:{governanceDomain:'开发',targets:[]}),...clone(d.data),config:{...clone(old?.config||{}),...clone(d.data.config),references:clone(old?.config?.references||[])}};}
 function comparable(a){const x=clone(a);delete x.config.referenceVersion;delete x.config.actual.dataset_ref;delete x.config.assetWorkspace;delete x.status;return JSON.stringify([x.name,x.owner,x.source,x.description,x.tags,x.visibility,x.purpose,x.config.actual,x.caseSpec,x.contentSet]);}
 function commit(core,payload,kind,existing={}){
  const descriptors=prepare(payload,kind),map={...existing},saved=[];
  const planned=descriptors.map(d=>{const old=map[d.sourceId]?core.find(map[d.sourceId]):null;return {d,old,patch:metadata(d,old)};});
  const changed=planned.some(p=>!p.old||comparable(p.patch)!==comparable(p.old))||planned.some(p=>p.d.kind==='dataset'&&Boolean(p.old?.config?.referenceVersion)!==Boolean(p.d.referenceSourceId));
  function needsRevision(a){return a&&(a.governance.lifecycle==='PUBLISHED'||a.governance.history.some(x=>['专家确认','审核发布','技术确认','业务确认','双人确认发布'].includes(x.action)));}
  for(const p of planned){p.id=p.old?.id||core.id('AS');p.revise=changed&&needsRevision(p.old);p.version=p.revise?'r'+(core.list().filter(a=>a.id===p.id).length+1):p.old?.version||'r1';map[p.d.sourceId]=p.id+'@'+p.version;}
  for(const p of planned){const {d,patch}=p;if(d.kind==='dataset'){if(d.referenceSourceId)patch.config.referenceVersion=map[d.referenceSourceId];else delete patch.config.referenceVersion;}
   if(d.datasetSourceId){patch.config.actual.dataset_ref=map[d.datasetSourceId];const previous=p.old?.config?.actual?.dataset_ref;patch.config.references=[...patch.config.references.filter(r=>r!==previous),map[d.datasetSourceId]];}
   const asset=!changed&&p.old?p.old:p.revise?core.revise(p.old,patch):p.old?core.edit(p.old,patch):core.adopt({...patch,id:p.id,version:p.version});map[d.sourceId]=key(asset);saved.push({sourceId:d.sourceId,asset});
  }return {saved,map};
 }
 function reopen(core,a){const x=a.config.actual,sid=a.config.assetWorkspace.sourceId;
  if(a.kind==='case')return {id:sid,name:a.name,owner:a.owner,source:a.source,description:a.description,tags:a.tags,visibility:a.visibility,purpose:a.purpose,catalog_key:'case',kind:'case',spec:clone(x)};
  if(a.kind==='dataset'){const ref=core.find(a.config.referenceVersion),records=ref?.config?.actual?.records||[];return {id:sid,name:a.name,owner:a.owner,source:a.source,description:a.description,tags:a.tags,visibility:a.visibility,purpose:a.purpose,definition:clone(x.schema),applied_fields:clone(x.schema.fields),mapping:clone(x.mapping),records:x.samples.map(r=>{const e=records.find(y=>y.sample_id===r.sample_id);return {...clone(r),expected:clone(e?.expected||{}),reference_id:e?.reference_id};}),files:clone(x.files||[]),formValues:{},sourceText:''};}
 }
 return {prepare,commit,recoverMap,reopen};
});
