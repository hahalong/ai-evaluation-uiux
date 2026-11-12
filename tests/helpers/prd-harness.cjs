const vm=require('node:vm'),fs=require('node:fs');
const PRDContracts=require('../../dist/prd-contracts'),WalkthroughContracts=require('../../dist/walkthrough-contracts'),RunLifecycle=require('../../dist/run-lifecycle');
const E=require('../../dist/prd-engine'),F=require('../../dist/prd-fixtures'),C=require('../../dist/evaluation-core');
require('../../dist/walkthrough-fixtures')(F);
function harness(){
 const nodes=new Map(),timers=[],events={};const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',checked:false,options:[],append(x){this.options.push(x)},before(){},classList:{add(){}}});return nodes.get(id)};
 const S={role:'engineer',route:'overview',evalTasks:[],runs:[]},ctx={S,PRDContracts,WalkthroughContracts,RunLifecycle,PRDEngine:E,PRD_FIXTURES:F,EvaluationCore:C,roleNames:{engineer:'评测负责人'},navGroups:Array.from({length:5},()=>({items:[]})),pages:{task:()=>''},window:{addEventListener(){}},document:{getElementById:node,createElement:()=>({}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(name,fn){(events[name]||(events[name]=[])).push(fn)}},location:{search:'',hash:'',pathname:'/'},history:{pushState(){},replaceState(){}},URLSearchParams,TextDecoder,esc:x=>String(x??''),ic:()=>'',save(){},toast(){},download(name,value){ctx.downloads=ctx.downloads||[];ctx.downloads.push({name,value})},modal(...args){ctx.lastModal=args},setTimeout:fn=>timers.push(fn),renderNav(){},render(){ctx.html=ctx.pages[S.route]?.()},go(route){S.route=route;ctx.render()},EvalUI:{core:C.create(S),commit(){},forceClose(){},assetDetail(){}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/prd-data.js','utf8'),ctx);ctx.PRD_DATA=ctx.window.PRD_DATA;vm.runInContext(fs.readFileSync('dist/prd-v15.js','utf8'),ctx);
 return {ctx,S,node,timers,events,ui:ctx.window.PRDUI,act:(a,k='')=>ctx.window.PRDUI.handle(a,k)};
}
module.exports={harness};
