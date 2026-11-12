const {test}=require('node:test');
const assert=require('node:assert/strict');
global.CaseAuthoring=require('../dist/case-authoring.js');
const bulk=require('../dist/case-bulk.js');
test('CSV preserves quoted commas, newlines and escaped quotes',()=>{
  const rows=bulk.parse('external_id,name,input\r\nC1,"金额,汇总","第一行\n第二行"\r\nC2,"用户说""不要""",停止');
  assert.equal(rows[0].name,'金额,汇总');assert.equal(rows[0].input,'第一行\n第二行');assert.equal(rows[1].name,'用户说"不要"');
});
test('Excel pasted cells and Chinese headers map to concrete case fields',()=>{
  const rows=bulk.parse('外部用例ID\t用例名称\t实际输入\t预期结果\nC1\t数值题\t3×29\t87');
  const p=bulk.plan(rows,bulk.defaultMap(Object.keys(rows[0])),'math',[]);
  assert.equal(p[0].spec.input,'3×29');assert.equal(p[0].spec.expected,'87');assert.equal(p[0].issues.length,0);
});
test('invalid CSV and duplicate headers cannot silently create shifted cases',()=>{
  assert.throws(()=>bulk.parse('id,name\n1,"unfinished'));
  assert.throws(()=>bulk.parse('id,id\n1,2'));
  assert.throws(()=>bulk.parse('id,name\n1,a,extra'));
});
test('Excel trailing empty cells remain empty rather than shifting or losing columns',()=>{
  const rows=bulk.parse('external_id\tname\tsource\nC1\t待补齐\t');
  assert.deepEqual(rows,[{external_id:'C1',name:'待补齐',source:''}]);
});
test('UTF-8 BOM and a JSON cases envelope preserve independent input and expected data',()=>{
  const rows=bulk.parse('\uFEFF {"cases":[{"external_id":"C1","name":"计算","input":"3*29","expected":87}]}');
  assert.equal(rows[0].input,'3*29');assert.equal(rows[0].expected,87);
});
test('same source and external ID is quarantined without overwriting existing version',()=>{
  const rows=[{external_id:'C1',name:'新内容'}];const map=bulk.defaultMap(Object.keys(rows[0]));
  const old={importNamespace:'sourceA',importId:'C1',name:'旧内容',version:'v1'};
  assert.equal(bulk.plan(rows,map,'sourceA',[old])[0].issues.length,1);assert.equal(old.name,'旧内容');
  assert.equal(bulk.plan(rows,map,'sourceB',[old])[0].issues.length,0);
});
test('duplicate batch IDs are isolated; same titles with different IDs remain distinct',()=>{
  const rows=[{external_id:'C1',name:'相同标题'},{external_id:'C1',name:'第二行'},{external_id:'C2',name:'相同标题'}];
  const p=bulk.plan(rows,bulk.defaultMap(Object.keys(rows[0])),'source',[]);
  assert.equal(p.filter(r=>!r.issues.length).length,2);assert.ok(p[1].issues.includes('本批重复ID'));
});
test('input, expected result and forbidden behavior remain separate after batch mapping',()=>{
  const row={external_id:'PET1',...CaseAuthoring.examples.pet};
  const r=bulk.plan([row],bulk.defaultMap(Object.keys(row)),'pet',[])[0];
  assert.equal(r.spec.forbidden,row.forbidden);assert.equal(r.spec.expected,row.expected);assert.equal(r.spec.input,row.input);assert.equal(r.record,row);assert.equal(r.gaps.length,0);
});
test('partial cases may be drafts but retain explicit validation gaps',()=>{
  const rows=[{external_id:'C1',name:'待补齐'}];const r=bulk.plan(rows,bulk.defaultMap(Object.keys(rows[0])),'source',[])[0];
  assert.equal(r.issues.length,0);assert.ok(r.gaps.some(x=>x.key==='expected'));assert.ok(r.gaps.some(x=>x.key==='source'));
});
test('dataset cases require both exact dataset version and sample identity',()=>{
  const row={external_id:'C1',...CaseAuthoring.examples.model,inputMode:'dataset',datasetRef:'',sampleId:''};
  const p=bulk.plan([row],bulk.defaultMap(Object.keys(row)),'source',[])[0];
  assert.ok(p.gaps.some(x=>x.key==='datasetRef'));assert.ok(p.gaps.some(x=>x.key==='sampleId'));
});
test('empty or oversize batches and missing source identity are rejected',()=>{
  assert.throws(()=>bulk.plan([],{},'source',[]));assert.throws(()=>bulk.plan(Array(501).fill({}),{},'source',[]));assert.throws(()=>bulk.plan([{}],{},'',[]));
});
test('all four concrete examples have a complete description and preserve UNKNOWN policy',()=>{
  for(const s of Object.values(CaseAuthoring.examples)){assert.equal(CaseAuthoring.missing(s).length,0);assert.equal(s.missingPolicy,'UNKNOWN');}
});
