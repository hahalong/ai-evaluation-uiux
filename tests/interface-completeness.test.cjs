const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const inventory=read('docs/interface-directory/inventory.json'),base=read('docs/interface-directory/base.json');
const rows=inventory.rows,by=Object.fromEntries(rows.map(r=>[r.id,r]));
const page=fs.readFileSync(path.join(root,'dist/design/index.html'),'utf8');
test('original contracts, HTTP operations and CT traceability are preserved',()=>{
 assert.equal(rows.length,new Set(rows.map(r=>r.id)).size);
 for(const b of base.rows){assert(by[b.id]);assert.equal(by[b.id].operation,b.operation);assert.deepEqual(by[b.id].providers,b.providers)}
 const http=rows.filter(r=>r.kind==='HTTP');assert.equal(http.length,108);
 assert.equal(new Set(http.map(r=>r.operation)).size,108);
 for(const h of http){const port=by[h.application_port];assert(port,h.id+' needs application boundary');assert(port.providers.some(m=>h.providers.includes(m)));assert(port.callers.includes('API接口'));if(port.id.startsWith('AP'))assert(port.related.includes(h.id))}
 assert.equal(Object.keys(inventory.ct_contract_sources).length,46);
 for(const [ct,refs] of Object.entries(inventory.ct_index)){assert(refs.length);for(const ref of refs)assert(by[ref],ct+': '+ref)}
});
test('all module endpoints and event consumers are accounted for',()=>{
 for(const m of inventory.modules){assert(rows.some(r=>r.providers.includes(m)),m+' provides');assert(rows.some(r=>r.callers.includes(m)),m+' calls')}
 for(const r of rows){
  for(const m of [...r.providers,...r.callers])assert(inventory.modules.includes(m),r.id+': '+m);
  for(const p of [...r.product_providers,...r.product_callers])assert(inventory.products[p]);
  assert(r.inputs&&r.outputs&&r.scenario&&r.source,r.id+' contract missing');
  for(const related of r.related)assert(by[related],r.id+': '+related);
 }
 const events=rows.filter(r=>r.kind==='消息事件');assert.equal(events.length,17);
 for(const ev of events)for(const consumer of ev.callers){const handlers=rows.filter(r=>r.kind==='消息处理接口'&&r.related.includes(ev.id)&&r.providers.includes(consumer));assert.equal(handlers.length,1,ev.id+': '+consumer)}
 assert.equal((page.match(/class="iface-module-update"/g)||[]).length,16);
});
test('type-specific capabilities have real provider contracts instead of only audit events',()=>{
 const contracts={P03:['PL02','EX01','OC01','OC06'],P04:['PL03','EX02','EX04','EX05','EX06','AC01','AC06'],P05:['PL04','EX03'],P06:['AS01','AS02','AS03','RS01','OS01','GS01']};
 for(const [product,ids] of Object.entries(contracts))for(const id of ids){assert(by[id].product_providers.includes(product),id);assert.notEqual(by[id].kind,'消息事件');assert.match(by[id].status,/设计补充/)}
 assert.deepEqual(by['CT38.1'].product_providers,[]);assert.deepEqual(by.AC01.product_providers,['P04']);assert.deepEqual(by.AC01.related,['CT38.1']);
 assert.equal(by.WF02.kind,'Worker协议');assert(by.WF02.related.includes('op049'));assert(!rows.some(r=>r.id.startsWith('DB')&&r.callers.includes('执行器')));
 assert(by.RF01.status.includes('待明确'));assert(by.AP061.status.includes('待明确'));
 assert.equal(inventory.questions.length,8);
});
test('publication counts and fragment targets cannot drift from the complete catalog',()=>{
 const v=read('docs/design-publication.json').interface_directory;assert.equal(v.total_rows,rows.length);assert.equal(v.technical_questions,inventory.questions.length);
 for(const [kind,n] of Object.entries(v.interface_kinds))assert.equal(rows.filter(r=>r.kind===kind).length,n);
 const ids=new Set([...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 const section=page.match(/<section id="interface-directory">([\s\S]*?)<\/section>/)[1];
 for(const m of section.matchAll(/href="#([^"]+)"/g))assert(ids.has(m[1]),'Broken link '+m[1]);
 assert(!/<a\b[^>]*\bdownload(?:=|\s|>)/i.test(section));
});
