/* Embedded editor uses the existing navigation, asset versions, task dependencies and approval flow. */
(()=>{
 const channel='asset-workspace-r10',bridge=AssetWorkspaceTransfer;
 S.assetWorkspaceSessions||={};let session=S.assetWorkspaceSessions[S.activeAssetWorkspace]||null;
 function stamps(map){return Object.fromEntries(Object.entries(map).map(([sid,k])=>{const a=EvalUI.core.find(k);return [sid,{key:k,digest:a?EvaluationCore.digest(a):null,head:a?EvaluationCore.key(EvalUI.core.list().filter(v=>v.id===a.id).at(-1)):null}];}));}
 const names={dataset:'数据集',case:'用例'},h=esc;
 const frame=()=>document.getElementById('asset-workspace-frame');
 const send=(type,extra={})=>frame()?.contentWindow?.postMessage({channel,sessionId:session?.id,type,...extra},location.origin);
 function open(kind='dataset',intent='new',asset=null){
  if(!['dataset','case'].includes(kind))return false;if(!guard('engineer'))return false;
  const id='workspace-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
  session={id,kind,intent,origin:S.route==='asset-workspace'?'assets':S.route,scroll:window.scrollY||0,assetType:S.assetType||kind,context:S.v2?.editContext?{...S.v2.editContext}:null,asset:asset?.config?.assetWorkspace?bridge.reopen(EvalUI.core,asset):null,map:{},saved:[]};
  if(asset&&session.asset)session.map=bridge.recoverMap(EvalUI.core,asset);session.stamps=stamps(session.map);
  S.assetWorkspaceSessions[id]=session;S.activeAssetWorkspace=id;EvalUI.forceClose();go('asset-workspace');save();return true;
 }
 function resume(id){session=S.assetWorkspaceSessions[id];if(!session)return;S.activeAssetWorkspace=id;go('asset-workspace');}
 function back(){const s=session;if(!s)return;S.assetType=s.assetType;EvalUI.forceClose();S.route=s.origin||'assets';save();render();window.requestAnimationFrame?.(()=>window.scrollTo({top:s.scroll,behavior:'instant'}));}
 function persistPayload(payload,intent){
  if(!session)throw Error('编辑会话已结束，请重新打开资产。');
  session.checkpoint=payload.checkpoint;save();const current=stamps(session.map);for(const [sid,stamp] of Object.entries(session.stamps||{}))if(JSON.stringify(current[sid])!==JSON.stringify(stamp))throw Error('这个资产已有新修改。当前填写已暂存，请回列表重新打开最新版本后核对。');
  const result=bridge.commit(EvalUI.core,payload,session.kind,session.map);session.map=result.map;session.stamps=stamps(session.map);session.saved=result.saved.map(x=>EvaluationCore.key(x.asset));
  const primary=result.saved.filter(x=>x.asset.kind===session.kind).map(x=>x.asset);
  if(primary.length===1&&session.context){const task=S.evalTasks.find(t=>t.id===session.context.taskId),dep=task?.deps?.find(d=>d.key===session.context.depKey);if(dep)EvalUI.core.bind(task,primary[0],dep);}
  EvalUI.commit();save();
  const message=primary.length?'已保存 '+primary.length+' 个'+names[session.kind]+'草稿':'填写进度已保存';
  if(intent==='return'){back();toast(message);}
  else if(intent==='review'&&primary.length){back();EvalUI.assetDetail(primary[0]);if(primary.length>1)toast('已保存全部用例；先查看第一条，其余可在用例列表继续检查。');}
  else{const el=document.getElementById('asset-workspace-feedback');if(el)el.textContent=message+' · 可继续编辑';}
 }
 pages['asset-workspace']=()=>{if(!session)return '<p>请选择需要编辑的资产。</p>';return `<div class="aw-shell"><header class="aw-heading"><div><small>资产中心 / ${h(names[session.kind])}</small><h1>${session.intent==='import'?'导入':'编辑'}${h(names[session.kind])}</h1></div><div><button class="btn" data-aw="return">保存并返回${session.context?'原评测任务':'原列表'}</button><button class="btn primary" data-aw="save">保存草稿</button></div></header><div id="asset-workspace-feedback" role="status">${session.saved.length?'已保存草稿，可继续编辑':'填写进度自动保留'}</div><iframe id="asset-workspace-frame" title="${h(names[session.kind])}编辑区" src="./asset-workspace/index.html"></iframe></div>`;};
 // Capture before existing document handlers; other asset types retain their established editor.
 window.addEventListener('click',e=>{const b=e.target.closest?.('[data-aw],[data-dir],[data-v2],[data-action]');if(!b)return;
  if(b.dataset.aw){e.preventDefault();e.stopImmediatePropagation();if(b.dataset.aw==='resume')resume(b.dataset.key);else send('request-save',{intent:b.dataset.aw==='return'?'return':'save'});return;}
  const kind=b.dataset.key||S.assetType;
  if((['new-asset','import'].includes(b.dataset.dir)&&['dataset','case'].includes(kind))||(b.dataset.action==='asset-create'&&['dataset','case'].includes(S.assetType))){e.preventDefault();e.stopImmediatePropagation();S.v2.editContext=null;open(kind,b.dataset.dir==='import'?'import':'new');}
 },true);
 const originalEdit=EvalUI.editAsset;EvalUI.editAsset=function(a,context=null){if(a?.config?.assetWorkspace&&['dataset','case'].includes(a.kind)){S.v2.editContext=context;return open(a.kind,'edit',a);}return originalEdit(a,context);};
 const originalData=window.assetEditorOpen;if(originalData)window.assetEditorOpen=function(options={}){if((options.kind||options.asset?.kind)==='dataset'&&(!options.asset||options.asset.config?.assetWorkspace))return open('dataset',options.asset?'edit':'new',options.asset);return originalData(options);};
 const oldRender=render;render=function(){oldRender();if(S.route==='asset-workspace'){const crumb=document.getElementById('crumb');if(crumb)crumb.innerHTML='资产与能力 / <b>评测资产</b>';}else if(['assets','cases'].includes(S.route)){const pending=Object.values(S.assetWorkspaceSessions).filter(s=>s.checkpoint&&s.kind===(S.assetType||'dataset'));const main=document.getElementById('main');if(pending.length&&main?.insertAdjacentHTML)main.insertAdjacentHTML('afterbegin',`<div class="aw-resume"><span>继续编辑</span>${pending.slice(-3).map(s=>`<button class="btn sm" data-aw="resume" data-key="${h(s.id)}">${h(s.checkpoint?.state?.draft?.name||s.checkpoint?.state?.case_workbench?.sourceName||names[s.kind])}</button>`).join('')}</div>`);}};
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame()?.contentWindow||e.data?.channel!==channel||!session)return;const m=e.data;if(m.type!=='ready'&&m.sessionId!==session.id)return;
  try{
   if(m.type==='ready')send('initialize',{value:{snapshot:session.checkpoint,kind:session.kind,intent:session.intent,asset:session.asset}});
   else if(m.type==='checkpoint'){session.checkpoint=m.checkpoint;save();}
   else if(m.type==='save'){
    persistPayload(m.payload,m.intent);
    if(m.confirmCaseSave)send('case-save-result',{ok:true});
   }else if(m.type==='error')toast(m.message,'error');
  }catch(error){
   if(m.type==='save'&&m.confirmCaseSave)send('case-save-result',{ok:false,message:error.message});
   toast(error.message,'error');
  }
 });
 window.AssetWorkspaceUI={open,resume,back,persistPayload,get session(){return session;}};render();
})();
