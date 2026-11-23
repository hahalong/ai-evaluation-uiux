const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const K=require('../dist/task-r21-core'),C=require('../dist/plaza-core');
function harness(){
 const q=C.initial(),events={},nodes={},S={route:'tasks',role:'engineer',v2:{}},oldTasks=new Set(q.tasks.map(t=>t.id));
 const h=x=>String(x??'').replaceAll('<','&lt;');
 const ctx={TaskR21:K,PlazaCore:C,S,esc:h,save(){},toast(){},structuredClone,Blob,URL,setTimeout(){},
  pages:{'task-prep':()=>'<p>历史任务</p>',runs:()=>'',review:()=>'',human:()=>'',cost:()=>''},
  document:{title:'',activeElement:null,getElementById:id=>nodes[id]||null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(n,f)=>(events[n]||=[]).push(f)},
  EvalUI:{core:{list:()=>[],find:()=>null}},NavigationUI:{projectTasks:()=>q.tasks.filter(t=>!oldTasks.has(t.id))},
  addEventListener:(n,f)=>(events['window:'+n]||=[]).push(f),
  render(){ctx.output=ctx.pages[S.route]?.()||'';},
  PlazaReview:{state:()=>q,persist(){},route(r){S.route=r;ctx.render();},openTask(id){q.activeTask=id;S.route='task-prep';ctx.render();},helpers:{
    panel:(name,body)=>`<section><h2>${name}</h2>${body}</section>`,table:(heads,rows)=>`<table><tr>${heads.join('|')}</tr>${rows.map(r=>'<tr>'+r.join('|')+'</tr>').join('')}</table>`,kv:r=>r.map(x=>x.join(':')).join(''),badge:s=>s,notice:s=>s
  }}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/task-r21-ui.js','utf8'),ctx);return {ctx,q,S,events,nodes};
}
test('new entry points share the original ledger and all six pages render',()=>{const {ctx,q,S}=harness();ctx.TaskR21UI.create();const task=C.task(q);assert(task.p02);assert.equal(q.tasks.filter(t=>t.id===task.id).length,1);for(let i=0;i<6;i++){ctx.TaskR21UI.handle('step',String(i));assert(ctx.output.includes('方案修订 1'));assert(ctx.output.includes('预计成本'));assert(ctx.output.includes('实际成本'));}ctx.TaskR21UI.handle('list');assert(ctx.output.includes(task.id));});
test('independent human evaluation starts without automatic scorer and renders conditional fields',()=>{const {ctx,q}=harness();ctx.TaskR21UI.create(true);assert.equal(C.task(q).p02.execution,'records');assert.equal(C.task(q).p02.metrics[0].mode,'human');assert(ctx.output.includes('记录来源'));assert(!ctx.output.includes('凭据引用 *'));ctx.TaskR21UI.handle('step','1');assert(ctx.output.includes('评分规约'));assert(!ctx.output.includes('评分器版本 *'));});
test('unsaved edit remains local until save and invalidates checks only on commit',()=>{const {ctx,q,events}=harness();ctx.TaskR21UI.create();const t=C.task(q);events.input[0]({target:{dataset:{r21Field:'task.goal'},tagName:'TEXTAREA',type:'textarea',value:'测试目标'}});assert.equal(t.goal,'');assert(ctx.TaskR21UI.dirty);ctx.TaskR21UI.handle('save');assert.equal(t.goal,'测试目标');assert(!ctx.TaskR21UI.dirty);});
test('legacy completed records keep their original page instead of being silently converted',()=>{const {ctx,q}=harness();const t=q.tasks[0];t.run={id:'OLD-RUN'};ctx.PlazaReview.openTask(t.id);assert.equal(t.p02,undefined);assert(ctx.output.includes('历史任务'));});
test('object directory renders fixed-version access and original objects',()=>{const {ctx,q,S}=harness();S.route='plaza';ctx.render();assert(ctx.output.includes(q.objects[0].name));ctx.TaskR21UI.handle('object',q.objects[0].id);assert(ctx.output.includes('固定版本'));assert(ctx.output.includes('验证历史'));});
