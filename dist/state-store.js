(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.StateStore=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const viewKeys=['role','route','assetGroup','assetType','assetObject','assetSearch','activeWork','workTab','runId','runTab','caseId','evalTaskId','assetId','compareMode','demandAssetId','demandEditingKey'];
function businessState(value){
 if(!value||typeof value!=='object')return value;
 const copy=JSON.parse(JSON.stringify(value));
 for(const key of viewKeys)delete copy[key];
 if(copy.prd15)for(const key of ['collapsed','permissionTab','visited'])delete copy.prd15[key];
 if(copy.v2)for(const key of ['activeAsset','views','editContext','collabEditReturn'])delete copy.v2[key];
 for(const task of copy.evalTasks||[])if(task.prd)delete task.prd.step;
 if(Array.isArray(copy.audit))copy.audit=copy.audit.filter(x=>x.action!=='切换演示角色');
 return copy;
}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
function create(storage,key,onConflict=()=>{},project=value=>value){
 let expected=storage.getItem(key),stale=false;
 const signature=raw=>{try{return JSON.stringify(canonical(project(JSON.parse(raw))));}catch{return raw;}};
 function check(){const current=storage.getItem(key);if(!stale&&current!==expected){if(signature(current)===signature(expected))expected=current;else{stale=true;onConflict();}}return !stale;}
 return {check,save(value){if(!check())return false;const next=JSON.stringify(value);if(next!==expected)storage.setItem(key,next);expected=next;return true;},get stale(){return stale;}};
}
function fieldLabel(e){
 const label=e.labels?.[0];let name='';
 if(label){const clean=label.cloneNode(true);clean.querySelectorAll('input,textarea,select,button').forEach(x=>x.remove());name=clean.textContent.trim();}
 return name||e.getAttribute('aria-label')||e.placeholder||e.id||e.name||'字段';
}
function collectFields(doc){
 return [...doc.querySelectorAll('main input,main textarea,main select,.modal input,.modal textarea,.modal select')].filter(e=>!['password','hidden','button','submit'].includes(e.type)).map(e=>{
  let value=e.value;
  if(e.tagName==='SELECT')value=[...e.selectedOptions].map(o=>o.textContent.trim()).join('、');
  else if(e.type==='file')value=[...e.files].map(f=>f.name).join('、')||'未选择文件';
  else if(['checkbox','radio'].includes(e.type))value=e.checked?'已选':'未选';
  return fieldLabel(e)+': '+value;
 }).join('\n');
}
function downloadBackup(doc,text){
 const win=doc.defaultView,blob=new win.Blob([text],{type:'text/plain;charset=utf-8'}),url=win.URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;a.download='evaluation-form-backup.txt';doc.body.append(a);a.click();a.remove();win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);
}
function notifyConflict(doc){
 if(doc.getElementById('state-update-notice'))return;
 const notice=doc.createElement('aside');notice.id='state-update-notice';notice.setAttribute('role','status');
 notice.innerHTML='<strong>其他标签页保存了新的数据</strong><span>本页内容仍保留。继续提交前请载入更新，避免覆盖新版本。</span><button type="button">查看与同步</button>';
 notice.querySelector('button').addEventListener('click',()=>showConflict(doc));doc.body.append(notice);
}
function showConflict(doc){
 let dialog=doc.getElementById('state-conflict');if(dialog?.open)return;
 if(!dialog){dialog=doc.createElement('dialog');dialog.id='state-conflict';dialog.setAttribute('aria-labelledby','state-conflict-title');
 dialog.innerHTML='<h2 id="state-conflict-title">提交前需要同步最新数据</h2><p>其他标签页保存了任务、资产或评测结果。本页尚未同步，暂时不能提交修改；已保存的数据不会丢失。</p><details><summary>查看本页表单内容</summary><label for="state-conflict-draft">表单备份（只读）</label><textarea id="state-conflict-draft" readonly rows="6"></textarea><p class="state-help">备份包含当前填写值和所选项；上传文件只记录名称，原文件请保留在本机。</p></details><p class="state-help">载入更新会重新打开页面。请先下载需要保留的表单内容，再对照最新数据填写。</p><div class="state-actions"><button type="button" data-sync="later">稍后处理</button><button type="button" data-sync="backup">下载表单备份</button><button type="button" data-sync="reload">载入更新</button></div>';
 dialog.querySelector('[data-sync="later"]').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-sync="backup"]').addEventListener('click',()=>downloadBackup(doc,dialog.querySelector('textarea').value));
 dialog.querySelector('[data-sync="reload"]').addEventListener('click',()=>doc.defaultView.location.reload());
 doc.body.append(dialog);}
 dialog.querySelector('textarea').value=collectFields(doc)||'当前页面没有表单字段。';dialog.showModal();
}
function watch(win,store){
 win.addEventListener('storage',e=>{if(e.key===null||e.key==='baic-eval-uiux-v4')store.check();});
 // Keep text selection, copying, scrolling, links and dismissing dialogs usable.
 // The save guard remains authoritative for timers and non-click writes.
 for(const type of ['click','change','submit','keydown'])win.addEventListener(type,e=>{
  if(e.target.closest?.('#state-conflict,#state-update-notice'))return;
  const action=type==='submit'||type==='click'&&e.target.closest?.('button,[role="button"]')||type==='change'&&e.target.matches?.('select,input[type="checkbox"],input[type="radio"],input[type="file"]')||type==='keydown'&&e.key==='Enter';
  if(action&&!store.check()){e.preventDefault();e.stopImmediatePropagation();showConflict(win.document);}
 },true);
}
return {create,businessState,fieldLabel,collectFields,notifyConflict,showConflict,watch};
});
