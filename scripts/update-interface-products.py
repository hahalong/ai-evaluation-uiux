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
http([45], '', '1 2 6 7 8 10 11 12 15',note='通用异步操作查询由API接口提供；operation原始业务归属用于授权和路由，不能当作查询接口的多个提供方。')
http([46,47,90,91,92,93], '13')
http([94], '13', '2 13')
http([49,50,88], '2', '1 2 3 4 5 6 8',note='通用工作生命周期属于P02调度运行；调用产品随IMPORT/EXECUTE/SCORE/REPORT等kind确定，不代表全部同时调用。')
http([51,52,62,106], '2', '2 3 4 5')
http([53], '', '1 2 3 4 5 6 8',note='证据管理提供共用文件暂存能力；资产、任务等是材料用途及调用场景，不是文件服务的并列产品归属。')
http([54], '8', '1 2 3 4 5 6 8',note='证据提交与追溯归P08；资产、执行和评分模块作为材料生产方调用，不因此成为服务提供方。')
http([55], '8', '2 3 4 5 6 8')
http([56,58], '1', '1 2')
http([57], '1', '6 7',note='参考内容归P01资产；访问决策由P13协作提供。执行器不在调用方。')
http([59,89], '6')
http([60], '8')
http([61], '2 6', '3 4 5 6',note='按执行回执/评分回执条件归P02/P06；技术接收责任仍存在IF-Q01，未因产品映射关闭。')
http([63], '14', '1 2 3 4 5 6 8',note='仅映射原清单四类Worker的用量用途；AI助手入账仍见CT29.1/IF-Q04。')
http([64], '14', '2 3 4 5')
http([67], '2', '2 3 4 5 7 8')
http([73,74], '', '1 2 7',note='共用文件暂存/确认只形成file_object；资产导入、人工采集和试评是调用用途，此时不等于正式证据登记。')
http([75], '8', '1 2 7 8 10')
http([80,81,82], '2', '1 2',note='方案管理提供试评的创建、查询与确认，按P02管理试评流程；P01资产试评复用该接口，属于调用方。')
http([84,85,86,87], '2', '2 3 4 5')
http([102,103,104], '7', '1 2 7')
http([105], '8', '1 2 7',note='证据管理提供人工证据提交，归P08证据追溯；P01/P02/P07是提交入口对应的调用场景。')
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
put('CT18.1','','1 2 3 4 5 6 8',note='与op053同一公共上传能力；调用产品和材料用途不改变提供方归属。')
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
put('CT34.1 CT34.3','2 14','15',note='候选归属，非已确认共同提供：原契约合并流程与资源动作，唯一入口及分工待IF-Q02明确；不得据此分派多个共同负责方。');put('CT34.2','14','15');put('CT34.4','15','15')
put('CT35.1 CT35.2','1','7');put('CT35.3','1','6')
put('CT36.1','','1 2 3 4 5 6 8 10 11 12',note='提供方为受控出口基础设施（非独立产品模块）；P13/P15负责安全与运维治理，不因此成为本动作的服务提供方。')
put('CT37.1','1','2')
put('CT38.1 CT38.2 CT38.3 CT38.4 CT38.5 CT38.6','','2 3 4 5',note='执行器运行时直接调用同模块内的引擎执行适配，共用契约无独立产品归属。P02任务执行及P03模型、P04 Agent、P05非Agent应用为使用场景，具体实现由冻结绑定决定；不是四个产品服务互相调用。')
put('CT39.1','6','6')
put('CT44.1 CT44.2 CT44.3','','2 3 4',note='提供方为外部设备/注入环境；模型端侧与Agent设备场景按批准接入能力调用。')
put('CT45.1','1 13','2',note='候选归属，非已确认共同提供：权限规则与资产规则查询被合并，唯一入口及协作分工待IF-Q02明确。');put('CT46.1','','8 11',note='外部CI/业务API接收回执，平台P08结果交付/P11持续评测触发回调。')

put('EV01.AssetPublished','1','2 6 11')
put('EV02.import.completed','1 2','1 2',note='消息生产场景分别为P01资产导入、P02已有记录导入；按import用途确定本条消息的生产归属，不是一个同步服务有两个所有者。')
put('EV03.plan.frozen','2','2 15')
put('EV04.work.completed','2','1 2 6 8',note='按work.kind唯一处理；完整kind映射仍见IF-Q06。')
put('EV05.node.completed','2','2')
put('EV06.run.started EV06.run.ended','2','8 14 15')
put('EV07.evidence.recorded','8','2 8',note='证据管理在证据登记后生产事件，归P08；P02流程编排消费事件推进任务，不是该事实的生产方。')
put('EV08.score.completed','6','2 8')
put('EV09.review.required','6','2',note='本事件的直接消费者为流程编排P02，再经CT23创建P07批次；不把间接P07写成事件直接消费者。')
put('EV10.review.completed','7','1 2 8')
put('EV11.snapshot.published','8','2 8 9 10 11',note='按已登记消息与集成/API投影的结果、对比、诊断及持续评测用途映射，不表示新增独立事件消费者。')
put('EV12.pack.revoked','13','1 2 14',note='仅映射已明确的编排、调度、参考模块；未明确查询缓存消费者仍见IF-Q05。')
put('EV13.usage.recorded','14','8');put('EV13.budget.exhausted','14','2')
put('EV14.qualification.changed','6','2 8')
put('EV15.audit.append.requested','1 2 3 4 5 6 7 8 9 10 11 12 13 14 15','15',note='消息行列的是实际业务动作的生产场景，各产品可请求审计；P15消费并落审计记录。多生产者不表示审计服务归属全部产品。')

assert set(M)=={r['id'] for r in data['rows']},set(M)^{r['id'] for r in data['rows']}
for row in data['rows']:
 row.update(M[row['id']])
 for key in ('product_providers','product_callers'):assert all(p in products for p in row[key])
 if not row['product_providers']:
  scope={'op045':'公共查询能力（无独立产品归属）',
         **dict.fromkeys(['op053','op073','op074','CT18.1'],'公共文件能力（无独立产品归属）'),
         **dict.fromkeys([f'CT38.{i}' for i in range(1,7)],'公共执行能力（无独立产品归属）'),
         'CT36.1':'公共基础设施（非独立产品模块）'}
  row['product_provider_scope']=scope.get(row['id'],'平台外部（非产品模块）')
data['products']=products
data['product_mapping_basis']={'date':'2026-11-28','sources':['主PRD V1.3 §5.2产品职责/模块协作','概要设计 V2.4 §4.1产品功能—技术能力映射','详细设计 V1.2逐接口合同、CT与事件定义'],'status':'技术设计的业务归属映射；不是运行调用统计或新增授权；原IF-Q01—06不关闭'}
# Generate one catalog for HTTP, application ports, domain collaborators, plugins,
# event consumers and infrastructure. Keep the reviewed base ownership rules above.
import importlib.util
spec=importlib.util.spec_from_file_location('complete_interfaces',R/'scripts/complete-interface-inventory.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
module.publish(data)
