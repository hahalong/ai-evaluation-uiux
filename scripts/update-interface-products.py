"""Add reviewed, operation-specific PRD mappings without replacing other design sections."""
from pathlib import Path
import json,re,html,hashlib
R=Path(__file__).resolve().parents[1]
D=R/'docs/interface-directory'
data=json.loads((D/'base.json').read_text())
names=['评测资产','对象接入与任务管理','模型评测','Agent 评测','非 Agent 应用评测','自动评分','人工评测','评测报告与结果追溯','实验对比','问题诊断','持续评测与反馈','AI 辅助协作','权限与业务隔离','预算与资源','运行保障与审计']
products={f'P{i:02}':n for i,n in enumerate(names,1)}
def ids(s):return [f'P{int(x):02}' for x in s.split()]
M={}
def put(keys,p,c=None,note='按主PRD产品职责及本接口业务场景映射；同产品模块的页面/运行子组件也可作为调用方。'):
    for k in keys.split():
        assert k not in M, k
        M[k]={'product_providers':ids(p),'product_callers':ids(c if c is not None else p),'product_note':note}
def http(nums,p,c=None,note=None):
    put(' '.join('op'+str(n).zfill(3) for n in nums),p,c,**({'note':note} if note else {}))

# Explicit product ownership: the technical registry owns BOTH P01 assets and P02 objects.
http([1], '13', '1 2 3 4 5 6 7 8 9 10 11 12 13 14 15')
http([2,4,5,6,7,8,9,10], '1')
http([3,68,69], '1', '1 2 6 8 9 12')
http([11,12,13,14,16,17,20,21,23,24,70,71,79], '2')
http([15,18,19,22,72], '2', '2 3 4 5 9 11')
http([25], '7', '2 6 7')
http([26,27,28,29,30,77,83], '7')
http([31,32], '6', '1 6')
http([33], '8', '2 3 4 5 8 9 10 11 12')
http([34,35,78], '8')
http([36,95], '9')
http([37,38], '10')
http([39,40,96,100,101], '11')
http([41,42,97,98,99], '12')
http([43,65,66,76], '14', '2 14')
http([44,48], '15')
http([45], '1 2 6 7 8 10 11 12 15',note='跨产品异步操作查询：归属随operation的原始作业；不是全部归属P02或P15。')
http([46,47,90,91,92,93], '13')
http([94], '13', '2 13')
http([49,50,88], '2', '1 2 3 4 5 6 8',note='通用工作生命周期属于P02调度运行；调用产品随IMPORT/EXECUTE/SCORE/REPORT等kind确定，不代表全部同时调用。')
http([51,52,62,106], '2', '2 3 4 5')
http([53,54], '1 2 8', '1 2 3 4 5 6 8',note='共享材料服务按资产上传P01、任务原始记录P02、证据追溯P08区分；主PRD未将全部原始记录指定给单一产品，技术写入责任不变。')
http([55], '8', '2 3 4 5 6 8')
http([56,58], '1', '1 2')
http([57], '1', '6 7',note='参考内容归P01资产；访问决策由P13协作提供。执行器不在调用方。')
http([59,89], '6')
http([60], '8')
http([61], '2 6', '3 4 5 6',note='按执行回执/评分回执条件归P02/P06；技术接收责任仍存在IF-Q01，未因产品映射关闭。')
http([63], '14', '1 2 3 4 5 6 8',note='仅映射原清单四类Worker的用量用途；AI助手入账仍见CT29.1/IF-Q04。')
http([64], '14', '2 3 4 5')
http([67], '2', '2 3 4 5 7 8')
http([73,74], '1 2 8', '1 2 7',note='通用文件暂存/确认；业务使用方按资产导入、人工采集和试评材料区分。')
http([75], '8', '1 2 7 8 10')
http([80,81,82], '1 2', '1 2',note='资产试评与方案试评共用能力；由pilot所属资产/方案区分产品归属。')
http([84,85,86,87], '2', '2 3 4 5')
http([102,103,104], '7', '1 2 7')
http([105], '2 8', '1 2 7')
http([107], '2', '2 15')
http([108], '14', '2 15')

# Port mappings are scoped to the method, NOT the union of a technical package's features.
put('CT01.1','13','1 2 3 4 5 6 7 8 9 10 11 12 13 14 15')
put('CT02.1','1','1 2 6 8 9 12')
put('CT04.1','2','1 2')
put('CT06.1','1','1')
put('CT07.1','1','2 3 4 5 6')
put('CT09.1','6','2');put('CT09.2','7','2');put('CT09.3','13','2')
put('CT11.1','2','2 11');put('CT12.1','2','2')
put('CT16.1 CT16.2 CT16.3','','2 3 4 5',note='提供方是平台外部被测对象/接入端，不是主PRD产品模块；平台执行适配对应调用产品。')
put('CT18.1','1 2 8','1 2 3 4 5 6 8')
put('CT19.1','8','2 6 7 8 9 10 11')
put('CT21.1','6','2');put('CT22.1','2','6');put('CT23.1','7','2 6')
put('CT25.1','8','2 11');put('CT25.2','6','8');put('CT25.3','7','8')
put('CT26.1','8','10 11 12',note='仅映射读取用途；不授予调用方业务验收写权限，内部入口仍见IF-Q03。')
put('CT27.1','2','8');put('CT28.1 CT28.2 CT28.3','14','2');put('CT29.1','14','12')
put('CT30.1','15','1 2 3 4 5 6 7 8 9 10 11 12 13 14 15',note='Outbox是P15可靠运行公共机制；每次调用的业务归属取决于生产模块，并非P11业务订阅。')
put('CT30.2','15','1 2 6 8 9 10 11 13 14 15',note='Inbox为公共可靠运行机制；具体消费者以事件行和订阅登记为准。')
put('CT31.1','','10',note='提供方为外部缺陷系统；平台问题诊断经消息与集成调用。')
put('CT31.2','2','11');put('CT32.1','1','12');put('CT32.2','2','12')
put('CT33.1','15','1 2 3 4 5 6 7 8 9 10 11 12 13 14 15')
put('CT34.1 CT34.3','2 14','15');put('CT34.2','14','15');put('CT34.4','15','15')
put('CT35.1 CT35.2','1','7');put('CT35.3','1','6')
put('CT36.1','','1 2 3 4 5 6 8 10 11 12',note='提供方为受控出口基础设施（非独立产品模块）；P13/P15负责安全与运维治理，不因此成为本动作的服务提供方。')
put('CT37.1','1','2')
put('CT38.1 CT38.2 CT38.3 CT38.4 CT38.5 CT38.6','2 3 4 5','2 3 4 5',note='同技术模块内部的引擎执行桥接；按冻结对象类型选择P03/P04/P05，P02负责执行控制。')
put('CT39.1','6','6')
put('CT44.1 CT44.2 CT44.3','','2 3 4',note='提供方为外部设备/注入环境；模型端侧与Agent设备场景按批准接入能力调用。')
put('CT45.1','1 13','2');put('CT46.1','','8 11',note='外部CI/业务API接收回执，平台P08结果交付/P11持续评测触发回调。')

put('EV01.AssetPublished','1','2 6 11')
put('EV02.import.completed','1 2','1 2',note='资产导入或已有记录导入按import用途区分归属；消费方仍是原登记模块。')
put('EV03.plan.frozen','2','2 15')
put('EV04.work.completed','2','1 2 6 8',note='按work.kind唯一处理；完整kind映射仍见IF-Q06。')
put('EV05.node.completed','2','2')
put('EV06.run.started EV06.run.ended','2','8 14 15')
put('EV07.evidence.recorded','2 8','2 8')
put('EV08.score.completed','6','2 8')
put('EV09.review.required','6','2',note='本事件的直接消费者为流程编排P02，再经CT23创建P07批次；不把间接P07写成事件直接消费者。')
put('EV10.review.completed','7','1 2 8')
put('EV11.snapshot.published','8','2 8 9 10 11',note='按已登记消息与集成/API投影的结果、对比、诊断及持续评测用途映射，不表示新增独立事件消费者。')
put('EV12.pack.revoked','13','1 2 14',note='仅映射已明确的编排、调度、参考模块；未明确查询缓存消费者仍见IF-Q05。')
put('EV13.usage.recorded','14','8');put('EV13.budget.exhausted','14','2')
put('EV14.qualification.changed','6','2 8')
put('EV15.audit.append.requested','1 2 3 4 5 6 7 8 9 10 11 12 13 14 15','15')

assert set(M)=={r['id'] for r in data['rows']},set(M)^{r['id'] for r in data['rows']}
for row in data['rows']:
 row.update(M[row['id']])
 for key in ('product_providers','product_callers'):assert all(p in products for p in row[key])
 if not row['product_providers']:row['product_provider_scope']='公共基础设施（非独立产品模块）' if row['id']=='CT36.1' else '平台外部（非产品模块）'
data['products']=products
data['product_mapping_basis']={'date':'2026-11-28','sources':['主PRD V1.3 §5.2产品职责/模块协作','概要设计 V2.4 §4.1产品功能—技术能力映射','详细设计 V1.2逐接口合同、CT与事件定义'],'status':'技术设计的业务归属映射；不是运行调用统计或新增授权；原IF-Q01—06不关闭'}
(D/'inventory.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

p=R/'dist/design/index.html';s=p.read_text();E=html.escape
def labels(values):return '<br>'.join(E(k+' '+products[k]) for k in values)
count=0
def change_row(m):
 global count
 head,body=m[1],m[2]
 meta=json.loads(html.unescape(re.search(r'data-iface="([^"]+)"',head)[1]))
 domid=re.search(r'id="([^"]+)"',head)[1]
 row=next(r for r in data['rows'] if domid=='iface-'+re.sub(r'[^a-zA-Z0-9_-]','-',r['id']))
 cells=re.findall(r'<td\b[^>]*>.*?</td>',body,re.S)
 assert len(cells) in (7,9),(domid,len(cells))
 if len(cells)==9:cells=[cells[i] for i in (0,1,2,4,6,7,8)]
 for key in ('product_providers','product_callers'):meta[key]=row[key]
 meta['product_labels']=[k+' '+products[k] for k in sorted(set(row['product_providers']+row['product_callers']))]
 meta['product_provider_labels']=[k+' '+products[k] for k in row['product_providers']]
 meta['product_caller_labels']=[k+' '+products[k] for k in row['product_callers']]
 scope=row.get('product_provider_scope','')
 if scope:meta['product_provider_labels'].append(scope)
 head=re.sub(r'data-iface="[^"]+"',lambda _: 'data-iface="'+E(json.dumps(meta,ensure_ascii=False),quote=True)+'"',head)
 pp='<td class="iface-product-provider">'+(labels(row['product_providers']) or E(scope))+'<details><summary>产品归属说明</summary>'+E(row['product_note'])+'</details></td>'
 pc='<td class="iface-product-caller">'+labels(row['product_callers'])+'</td>'
 count+=1
 return head+''.join(cells[:3]+[pp,cells[3],pc]+cells[4:])+'</tr>'
s=re.sub(r'(<tr\b[^>]*data-iface="[^"]+"[^>]*>)(.*?)</tr>',change_row,s,flags=re.S)
assert count==180,count
headers=['接口编号／类型','接口名称／路径／方法','提供／生产技术模块','提供方产品模块','调用／消费技术模块清单','调用方产品模块','交互方式','调用场景与约束','原契约／事件与详情']
s=re.sub(r'(<table id="interface-table"><thead><tr>).*?(</tr></thead>)',lambda m:m[1]+''.join('<th scope="col">'+h+'</th>' for h in headers)+m[2],s,flags=re.S)
options='<datalist id="iface-product-options">'+''.join('<option value="'+E(k+' '+v)+'"></option>' for k,v in products.items())+'</datalist>'
newcontrols='<label for="iface-product-provider">提供方产品模块<input id="iface-product-provider" type="search" list="iface-product-options" placeholder="P01 或评测资产"></label><label for="iface-product-caller">调用方产品模块<input id="iface-product-caller" type="search" list="iface-product-options" placeholder="P02 或对象接入"></label>'+options
if 'id="iface-product-provider"' not in s:s=s.replace('<button type="button" id="iface-reset">',newcontrols+'<button type="button" id="iface-reset">',1)
s=s.replace('placeholder="接口编号、名称、路径或场景"','placeholder="接口 / 产品编号、模块名、路径或场景"')
note='<p id="iface-product-help"><strong>产品维度：</strong>提供方产品模块表示接口能力归属；调用方产品模块表示直接调用技术组件承接的产品场景，含同模块页面调用。消息行分别对应生产/消费产品；多值按用途或对象类型选择，不代表全部同时调用。主PRD P01—P15保持原名；外部系统、出口基础设施不伪造产品编号。映射依据主PRD产品职责及概要§4.1，再按每个操作细化，原有待明确项继续保留。<strong>筛选用法：</strong>六个条件组合取交集；产品字段支持编号或中文名称。P01按产品编号精确匹配，不会误命中op010。筛选只作用于下方逐接口表，技术模块统计索引仍显示全量。</p>'
if 'id="iface-product-help"' not in s:s=s.replace('<div class="iface-controls">',note+'<div class="iface-controls">',1)
css='''<style id="iface-product-style">#interface-table{min-width:1510px}#interface-table th:nth-child(1){width:100px}#interface-table th:nth-child(2){width:220px}#interface-table th:nth-child(3){width:115px}#interface-table th:nth-child(4){width:190px}#interface-table th:nth-child(5){width:130px}#interface-table th:nth-child(6){width:190px}#interface-table th:nth-child(7){width:120px}#interface-table th:nth-child(8){width:225px}#interface-table th:nth-child(9){width:100px}#interface-directory input{width:230px}#interface-directory .iface-controls label{max-width:100%}#interface-directory .iface-count{flex-basis:100%;font-weight:600}#interface-table tr[hidden]{display:none!important}@media print{#interface-table{min-width:0}}</style>'''
s=re.sub(r'<style id="iface-product-style">.*?</style>','',s,flags=re.S)
s=s.replace('<section id="interface-directory">',css+'<section id="interface-directory">',1)
js=(R/'scripts/interface-filter.js').read_text()
s=re.sub(r'<script id="iface-script">.*?</script>',lambda _: '<script id="iface-script">'+js+'</script>',s,flags=re.S)
p.write_text(s)
manifest=R/'docs/design-publication.json';v=json.loads(manifest.read_text())
for x in v['sources']:
 if x['page']=='index.html':x['published_sha256']=hashlib.sha256(p.read_bytes()).hexdigest()
for x in v['checks']:
 if x['page']=='index.html':x['bytes']=p.stat().st_size
v['interface_directory']['product_modules']=15
v['interface_directory']['product_fields']=['提供方产品模块','调用方产品模块']
v['interface_directory']['updated']='2026-11-28'
manifest.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
print('Updated 180 rows with bidirectional product mappings; preserved existing technical columns.')
