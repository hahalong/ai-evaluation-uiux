const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(root,'dist/design/index.html'),'utf8');
const inventory=JSON.parse(fs.readFileSync(path.join(root,'docs/interface-directory/inventory.json'),'utf8'));
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const fixture=[...page.matchAll(/<tr\b([^>]*data-iface="([^"]+)"[^>]*)>(.*?)<\/tr>/gs)].map(m=>({id:/id="([^"]+)"/.exec(m[1])[1],meta:JSON.parse(decode(m[2])),text:decode(m[3].replace(/<[^>]+>/g,'')),cells:[...m[3].matchAll(/<td\b/g)].length}));
const js=/<script id="iface-script">(.*?)<\/script>/s.exec(page)[1];
function setup(){
 const el=extra=>Object.assign({value:'',hidden:false,textContent:'',listeners:{},addEventListener(k,f){this.listeners[k]=f},scrollIntoView(){}},extra);
 const names=['query','provider','caller','kind','product-provider','product-caller','reset','count','empty'];
 const fields=Object.fromEntries(names.map(n=>[n,el()]));
 const rows=fixture.map(r=>el({id:r.id,dataset:{iface:JSON.stringify(r.meta)},textContent:r.text}));
 const buttons=[...page.matchAll(/data-iface-module="([^"]+)" data-iface-role="([^"]+)"/g)].map(m=>el({dataset:{ifaceModule:m[1],ifaceRole:m[2]}}));
 const scroll={scrollTop:999};
 const parent={tagName:'DETAILS',open:false,parentElement:null},target={tagName:'DETAILS',open:false,parentElement:parent};
 const anchor=el({getAttribute:()=> '#s104'});
 const directory={querySelector:s=>s==='.iface-scroll'?scroll:s==='.iface-controls'?el():fields[s.replace('#iface-','')],querySelectorAll:s=>s==='tr[data-iface]'?rows:s==='[data-iface-module]'?buttons:s==='a[href^="#"]'?[anchor]:[]};
 vm.runInNewContext(js,{document:{getElementById:id=>id==='interface-directory'?directory:target}});
 return {fields,buttons,scroll,parent,target,anchor,visible:()=>rows.filter(r=>!r.hidden),set(n,v){fields[n].value=v;fields[n].listeners.input()},reset(){fields.reset.listeners.click()}};
}
test('interface product mapping preserves original HTTP rows and PRD names; objects differ from assets',()=>{
 assert.equal(fixture.length,inventory.rows.length);assert(fixture.every(r=>r.cells===9));
 assert.equal(inventory.rows.filter(r=>r.kind==='HTTP').length,108);assert.equal(Object.keys(inventory.products).length,15);
 const byId=Object.fromEntries(inventory.rows.map(r=>[r.id,r]));
 for(const [id,owner] of [['op002','P01'],['op012','P02'],['op036','P09'],['op037','P10'],['op096','P11']])assert.deepEqual(byId[id].product_providers,[owner]);
 assert.deepEqual(byId['CT16.1'].product_providers,[]);
 assert.deepEqual(byId['EV09.review.required'].product_callers,['P02']);
 assert.equal(inventory.questions.length,8);
 for(const r of fixture)assert(r.meta.product_providers&&r.meta.product_callers);
 assert(page.includes('#interface-table tr[hidden]{display:none!important}'));
 assert(!/<a\b[^>]*\bdownload(?:=|\s|>)/i.test(page));
});
test('P01 matches product identity and never interface substring op011/op101',()=>{
 const s=setup();s.set('query','P01');const rows=s.visible();assert(rows.length>0);
 assert(!rows.some(r=>r.id==='iface-op011'||r.id==='iface-op101'));
 for(const r of rows){const m=JSON.parse(r.dataset.iface);assert([...m.product_providers,...m.product_callers].includes('P01'))}
 s.set('query','op011');assert(s.visible().some(r=>r.id==='iface-op011'));assert(s.visible().some(r=>r.id==='iface-AP011'));s.set('kind','HTTP');assert.deepEqual(s.visible().map(r=>r.id),['iface-op011']);s.set('kind','');
 s.set('query','Ｐ０１');assert.equal(s.visible().length,rows.length);
 s.set('query','p01');assert.equal(s.visible().length,rows.length);
});
test('each product direction supports ID, Chinese name, and combined filters',()=>{
 const s=setup();
 for(const [id,name] of Object.entries(inventory.products)){
  for(const [field,key] of [['product-provider','product_providers'],['product-caller','product_callers']]){
   s.reset();s.set(field,id);const expected=inventory.rows.filter(r=>r[key].includes(id)).length;assert.equal(s.visible().length,expected);
   s.set(field,id+' '+name);assert.equal(s.visible().length,expected);
  }
 }
 s.reset();s.set('product-provider','评测资产');assert(s.visible().length>0);
 s.set('product-caller','P02');s.set('provider','资产管理');s.set('caller','方案管理');s.set('kind','内部接口');s.set('query','resolve_exact');
 assert.deepEqual(s.visible().map(r=>r.id),['iface-CT02-1','iface-CT37-1']);
 s.set('query','Registry.resolve_exact');assert.deepEqual(s.visible().map(r=>r.id),['iface-CT02-1']);
});
test('technical filters, event direction, module shortcuts, empty state and reset remain functional',()=>{
 const s=setup();assert.equal(s.visible().length,inventory.rows.length);
 s.set('kind','HTTP');assert.equal(s.visible().length,108);
 s.set('kind','消息事件');assert.equal(s.visible().length,17);
 s.reset();s.set('provider','资产管理');assert.equal(s.visible().filter(r=>/^iface-(op|CT|EV)/.test(r.id)).length,22);
 s.set('caller','方案管理');assert.equal(s.visible().filter(r=>/^iface-(op|CT|EV)/.test(r.id)).length,4);
 s.set('query','no-such-interface');assert.equal(s.visible().length,0);assert.equal(s.fields.empty.hidden,false);
 s.reset();assert.equal(s.visible().length,inventory.rows.length);assert(s.fields.empty.hidden);assert.equal(s.scroll.scrollTop,0);
 for(const b of s.buttons){s.set('product-provider','P15');b.listeners.click();assert.equal(s.fields['product-provider'].value,'');const role=b.dataset.ifaceRole;for(const r of s.visible()){const m=JSON.parse(r.dataset.iface);assert((['provide','publish'].includes(role)?m.providers:m.callers).includes(b.dataset.ifaceModule));assert.equal(m.kind==='消息事件',['publish','subscribe'].includes(role))}}
 s.anchor.listeners.click();assert(s.target.open&&s.parent.open);
});

test('Chinese/English spacing is equivalent in keyword and both product searches',()=>{
 const s=setup();
 for(const field of ['query','product-provider','product-caller']){
  for(const variants of [['Agent评测','Agent 评测','ＡＧＥＮＴ　评测','agent   评测'],['非Agent应用评测','非 Agent 应用评测'],['AI辅助协作','AI 辅助协作']]){
   s.reset();s.set(field,variants[0]);const expected=s.visible().map(r=>r.id);
   // Every product direction includes explicit strategy/service contracts where applicable.
   if(field!=='product-provider')assert(expected.length>0,field+': '+variants[0]);
   for(const value of variants.slice(1)){s.set(field,value);assert.deepEqual(s.visible().map(r=>r.id),expected,field+': '+value)}
  }
 }
 s.reset();s.set('query','P04 Agent评测');const expected=inventory.rows.filter(r=>[...r.product_providers,...r.product_callers].includes('P04')).map(r=>'iface-'+r.id.replace(/[^a-zA-Z0-9_-]/g,'-'));
 assert.deepEqual(s.visible().map(r=>r.id),expected);
 s.fields.query.value='';s.fields.query.listeners.search();assert.equal(s.visible().length,inventory.rows.length);
 s.fields.query.value='Agent评测';s.fields.query.listeners.compositionend();assert(s.visible().length>0);
});
test('shared ports do not list all beneficiary products as owners; event producers and unresolved ownership remain explicit',()=>{
 const byId=Object.fromEntries(inventory.rows.map(r=>[r.id,r]));
 for(let i=1;i<=6;i++){
  const row=byId['CT38.'+i];assert.deepEqual(row.product_providers,[]);
  assert.equal(row.product_provider_scope,'公共执行能力（无独立产品归属）');
  assert.deepEqual(row.product_callers,['P02','P03','P04','P05']);
 }
 for(const id of ['op053','op073','op074','CT18.1'])assert.deepEqual(byId[id].product_providers,[]);
 for(const id of ['op054','op105','EV07.evidence.recorded'])assert.deepEqual(byId[id].product_providers,['P08']);
 for(const id of ['op080','op081','op082']){assert.deepEqual(byId[id].product_providers,['P02']);assert.deepEqual(byId[id].product_callers,['P01','P02'])}
 assert.equal(byId['EV15.audit.append.requested'].product_providers.length,15);
 assert(page.includes('归属/契约待明确，见说明'));assert.equal(byId['AP061'].status,'设计补充／归属待明确');
 const s=setup();s.set('product-provider','P04');assert(!s.visible().some(r=>r.id==='iface-CT38-1'));
 s.reset();s.set('product-caller','P04');assert(s.visible().some(r=>r.id==='iface-CT38-1'));
});
