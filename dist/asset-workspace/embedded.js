(()=>{
 const origin=location.origin;let initialized=false,sessionId='',timer;
 let caseSaveNotice;
 const send=(type,value={})=>parent.postMessage({channel:'asset-workspace-r10',sessionId,type,...value},origin);
 function checkpoint(){if(!initialized)return;try{send('checkpoint',{checkpoint:AssetWorkspaceAPI.snapshot()});}catch(error){send('error',{message:error.message});}}
 function finishCaseSave(ok,message){
  if(!caseSaveNotice)return;
  const {heading,detail,title,summary}=caseSaveNotice;
  heading.textContent=ok?title:'用例草稿未登记';
  detail.textContent=ok?summary:message;
  caseSaveNotice=null;
 }
 function save(intent='save',confirmCaseSave=false){
  try{
   const payload=AssetWorkspaceAPI.save();
   send('save',{payload,intent,confirmCaseSave});
  }catch(error){
   if(confirmCaseSave)finishCaseSave(false,error.message);
   send('error',{message:error.message});
  }
 }
 window.addEventListener('message',e=>{
  if(e.source!==parent||e.origin!==origin||e.data?.channel!=='asset-workspace-r10')return;
  const m=e.data;
  if(m.type==='initialize'){
   sessionId=m.sessionId;
   AssetWorkspaceAPI.initialize(m.value);
   initialized=true;
   checkpoint();
  }else if(m.sessionId===sessionId){
   if(m.type==='request-save')save(m.intent);
   if(m.type==='case-save-result')finishCaseSave(m.ok,m.message);
  }
 });
 document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(['back','catalog-save-draft','ci-ux-home','ci-back'].includes(a)){e.preventDefault();e.stopImmediatePropagation();save('return');}
  else if(['publish','catalog-publish','ci-ux-publish'].includes(a)){e.preventDefault();e.stopImmediatePropagation();save('review');}
  else if(a==='nav'||a==='quick-data'||a==='show-spec'){e.preventDefault();e.stopImmediatePropagation();save('return');}
 },true);
 document.addEventListener('click',e=>{
  const action=e.target.closest('[data-act]')?.dataset.act;
  if(!['ci-ux-save-content','ci-ux-save-auto'].includes(action))return;
  const completion=document.querySelector('.ux-complete');
  if(!completion)return;
  const heading=completion.querySelector('h2'),detail=completion.querySelector('p');
  caseSaveNotice={heading,detail,title:heading.textContent,summary:detail.textContent};
  heading.textContent='正在登记用例草稿';
  detail.textContent='正在保存到资产中心。';
  save('save',true);
 });
 for(const name of ['input','change','click'])document.addEventListener(name,()=>{clearTimeout(timer);timer=setTimeout(checkpoint,200);});
 window.__assetWorkspaceRendered=()=>{document.querySelectorAll('[data-act="publish"],[data-act="catalog-publish"],[data-act="ci-ux-publish"]').forEach(b=>b.textContent='保存并进入检查');document.querySelectorAll('.publish-confirm').forEach(el=>el.hidden=true);};
 send('ready');
})();
