"""Complete the design inventory, preserving the historical HTTP/CT/event IDs.
New signatures are design contracts, not assertions about deployed implementation.
"""
import json, re, html, hashlib
from pathlib import Path
from collections import Counter
R=Path(__file__).resolve().parents[1];D=R/'docs/interface-directory'
MODULE_PATHS=dict(zip(json.loads((D/'base.json').read_text())['modules'],['access_api','policy','registry','ingestion','plan_compiler','workflow','dispatch','execution','evidence','assessment','review','aggregation','integration','assistance','operations','reference']))

def complete(data):
 rows=data['rows'];by={r['id']:r for r in rows};products=data['products'];dtos=json.loads((D/'http-dto-index.json').read_text())
 def ids(s):return [f'P{int(x):02}' for x in s.split()]
 def add(id,name,provider,caller,p,c,inputs,outputs,rules,source,kind='内部接口',mode='同进程公开Port',stage='B1',related=(),component='',external_provider=''):
  row=dict(id=id,name=name,operation=name,providers=provider.split('、') if provider else [],callers=caller.split('、') if caller else [],kind=kind,mode=mode,scenario=rules,refs=[source],note='本次补充的设计契约，待实现与契约测试；不表示已有代码或新增远程服务。',external=[],status='设计补充',target='contract-'+id,product_providers=ids(p),product_callers=ids(c),product_note='按此方法具体能力归属映射；同技术模块可实现不同产品策略。',inputs=inputs,outputs=outputs,source=source,stage=stage,related=list(related),component=component or name.split('.')[0])
  if not p:row['product_provider_scope']=external_provider or '公共技术能力（无独立产品归属）'
  row['external_provider']=external_provider
  rows.append(row);by[id]=row;return row
 # Baseline contracts get explicit execution boundaries and traceable source.
 for row in rows:
  row['scenario']=row['scenario'] or row['name']+'；按原逐字段合同校验请求、当前主体权限与版本，不接受客户端替代服务端判定。'
  row['source']='详细设计附录B' if row['kind']=='HTTP' else '详细设计附录E'
  row['stage']='沿用原合同';row['related']=[];row['component']=row['operation'].split('(')[0]
  row['inputs']=dtos[row['id']]['请求'] if row['kind']=='HTTP' else '沿用原CT/事件合同；未列字段须在接口待明确项收敛'
  row['outputs']=dtos[row['id']]['响应'] if row['kind']=='HTTP' else ('消费回执及所属模块状态；不以ACK代替业务成功' if row['kind']=='消息事件' else '沿用原合同返回；不得跨模块返回ORM实体')
  row['call_chain']=(' → '.join(row['external'] or row['callers'])+' → API接口/Worker网关 → '+'、'.join(row['providers'])) if row['kind']=='HTTP' else '、'.join(row['callers'])+' → '+'、'.join(row['providers'])
 # Route-to-application interfaces. Keep each HTTP DTO and exact original contract link.
 names='''SessionService.get AssetDraftService.create AssetQueryService.list AssetDraftService.update VersionService.create ConfirmationService.record ReleaseService.publish ReleaseService.disable ImportService.create ImportService.get RecordImportService.create ObjectRegistry.create AccessProfileRegistry.create ValidationService.start Orchestrator.create TaskQueryService.list TaskQueryService.get PlanService.save PlanService.preflight PlanService.confirm PlanService.freeze Orchestrator.start Orchestrator.cancel_run Orchestrator.resume ReviewService.create_batch ReviewService.assign ReviewService.get_task ReviewService.record_opinion ReviewService.arbitrate ReviewService.lock CalibrationService.create QualificationService.decide SnapshotService.get ReportService.create AcceptanceService.record ComparisonService.create DiagnosisService.create IssueLinkService.create SubscriptionService.create WebhookService.receive ProposalService.create ProposalService.adopt BudgetService.list OperationsService.execute OperationQueryService.get PermissionGrantService.create PermissionGrantService.revoke AuditService.list DispatchService.claim DispatchService.heartbeat ActionService.prepare ActionService.record_receipt UploadService.create EvidenceService.commit EvidenceService.project ReferenceService.stage ReferenceService.resolve ImportService.commit_rows AssessmentService.commit ReportService.commit EngineReceiptService.receive CheckpointService.record UsageService.record ResourceService.release_after_reset BudgetService.create ResourceService.register TaskEventService.stream AssetQueryService.get VersionService.get ObjectRegistry.list ObjectRegistry.get PlanService.get UploadService.create_user UploadService.commit_file DownloadGrantService.create ResourceService.list ReviewService.get_batch ReportService.get Orchestrator.cancel_task PilotService.create PilotService.get PilotService.complete ReviewService.audit ManualExecutionService.create ManualExecutionService.start ManualExecutionService.record_step ManualExecutionService.complete DispatchService.complete CalibrationService.record_results PermissionPackService.create PermissionPackService.publish MatchRuleService.create MatchRuleService.publish TaskPermissionService.bind BaselineService.promote TrendService.select CollaborationService.create CollaborationService.handoff CollaborationService.share FeedbackService.create FeedbackService.regress PilotReviewService.assign PilotReviewService.get_task PilotReviewService.record_opinion EvidenceService.commit_user AttemptService.complete AttemptService.reconcile CleanupService.verify'''.split()
 assert len(names)==108
 for n,name in enumerate(names,1):
  h=by[f'op{n:03}'];query=h['operation'].startswith('GET ');req=dtos[h['id']]['请求'];resp=dtos[h['id']]['响应']
  if h['id']=='op022':h['application_port']='CT11.1';continue
  if h['id']=='op055':
   h['application_port']='CT19.1'
   by['CT19.1']['callers']=list(dict.fromkeys(by['CT19.1']['callers']+['API接口']))
   by['CT19.1']['note']+=' API接口作为op055的Worker网关，在鉴权后调用同一投影Port；不改变材料访问范围。'
   continue
  port=add('AP'+str(n).zfill(3),name+'(ctx, request'+('' if query else ', uow')+')','、'.join(h['providers']),'API接口',' '.join(x[1:] for x in h['product_providers']),' '.join(x[1:] for x in h['product_callers']),f'RequestContext；{req}；路径ID/查询游标与{h["id"]}一致',resp+'；字段与原HTTP合同一致',h['scenario']+('；只读投影，不泄漏ORM。' if query else '；由所属模块应用服务管理事务，uow仅在同数据库进程内传递；跨服务不传uow。'),h['id'],related=[h['id']],component=name.split('.')[0])
  port['target_source']=h['target'];port['product_provider_scope']=h.get('product_provider_scope','')
  port['note']='HTTP路由调用应用服务的显式签名补充；沿用原HTTP DTO、权限与业务语义，不重复创建业务对象或网络请求。'
  port['mode']='服务内应用Port'+('／SSE异步迭代' if n==67 else '')
  h['application_port']=port['id'];h['related'].append(port['id'])
  if n in [61]:port['status']='设计补充／归属待明确';port['note']+=' IF-Q01仍须确认回执接收责任。'
 # Domain collaborators and type-specific strategies, separated from generic HTTP surfaces.
 specs=[
 ('PL01','EffectiveConfigResolver.resolve','方案管理','方案管理','2','2','默认/模板/用户覆盖：ConfigLayer[]；schema_version','EffectiveConfig{value, provenance, config_hash}','显式删除与未填写分开；确定性合并；不解析latest','§5.1/18.1'),
 ('PL02','ModelPlanner.plan','方案管理','方案管理','3','2','EffectiveConfig；精确对象/资产版本；purpose；资源能力','PlanFragment{nodes, units, required_scope, resource_requirements}','模型/微调/量化/端侧策略；已有记录不造执行节点；不领取资源','§5.1/6.7/18.8'),
 ('PL03','AgentPlanner.plan','方案管理','方案管理','4','2','EffectiveConfig；用例步骤；对象能力；授权范围；simulator_ref可选','PlanFragment{steps, dependencies, observation_requirements, stop_conditions}','单/多轮/多Agent按能力选择；禁止动作与终态证据要求保留；不调用对象','§5.1/6.7/18.8'),
 ('PL04','ApplicationPlanner.plan','方案管理','方案管理','5','2','EffectiveConfig；RAG/摘要/抽取类型；知识快照/解析器精确版本','PlanFragment{nodes, units, material_contracts}','按实际取得方式生成节点；RAG检索可观测缺口阻断超范围验收','§5.1/6.7/18.8'),
 ('PL05','PlanCompiler.compile','方案管理','方案管理','2','2','EffectiveConfig；PlanFragment；compiler_version；source_hashes','PlanIR{schema_version, nodes, units, scoring_plan, config_hash}','校验循环/悬空边/重复键/材料不足；纯人工无AUTO_SCORE；不写冻结状态','§5.1/18.1'),
 ('PL06','ManifestReader.get_exact','方案管理','流程编排、任务调度、自动评分、结果与报告','2','2 6 8','ctx；manifest_id；expected_hash','不可变清单及按用途裁剪的输入引用','跨模块读冻结清单，不直读planning表；Worker通过领取工作取得裁剪包','§2.3/5.2/5.4'),
 ('WF01','Orchestrator.refresh_node','流程编排','流程编排、消息与集成','2','2 11','EventEnvelope；node_id；expected_version；uow','NodeTransition{state, next_work_refs, outbox_ids}','Inbox去重；依赖/材料屏障满足才推进；不因HTTP202生成完成事实','§5.3/11.2/18.12'),
 ('WF02','RuntimeCheckpoint.resume_work','执行器','任务调度','4','2','ExecutionBundle；checkpoint_ref/version；resume_key；epoch','ResumeReceipt{accepted, actual_step, evidence_refs}','经op024审批后以已定义工作领取通道下发，非控制端直连Worker；不重做已成功副作用','CT42/§5.5'),
 ('EX01','ModelExecutor.execute','执行器','执行器','3','2','ExecutionBundle；精确模型/adapter_ref；local_parallel_limit；seed','ExecutionFacts{unit_results, raw_artifacts, usage, cleanup_state}','模型推理/端侧实测；行为事实与评分分离；使用CT16/CT38，不直写DB','§6.7/7/18.8'),
 ('EX02','AgentExecutor.execute','执行器','执行器','4','2','ExecutionBundle；用例初态/步骤；授权/工具范围；观察窗；epoch','ExecutionFacts{steps, action_receipts, traces, terminal_observations, cleanup_state}','执行用例、工具与独立终态采集；所有副作用先经op051；UNKNOWN不重放','§5.5/6.7/18.8'),
 ('EX03','ApplicationExecutor.execute','执行器','执行器','5','2','ExecutionBundle；RAG/摘要/抽取输入；knowledge_snapshot_ref','ExecutionFacts{outputs, retrieved_refs, context, citations, artifacts}','记录实际检索/回答/引用；缺过程证据保持缺口，不补造轨迹','§6.7/18.8'),
 ('EX04','MultiTurnRunner.run','执行器','执行器','4','4','会话上下文；simulator_ref/version；seed；max_turns；stop_rules','TurnTrace[]{turn_index, messages, branch_id, stop_reason}','逐轮保留实际分支；达到上限与平台超时区分；授权撤回停止新动作','§6.7/18.8'),
 ('EX05','UserSimulator.next_turn','执行器','执行器','4','4','已获准上下文投影；history；turn_index；seed；scenario_state','SimulatedTurn{message, branch_id, stop, usage}','只见允许输入，不读expected/封存参考，不担任裁判；模型调用沿批准出口','§6.7/18.8'),
 ('EX06','HandoffCoordinator.accept','执行器','执行器','4','4','agent_id；session_id；message_id；parent_call；上下文范围；action_id','HandoffReceipt{duplicate, accepted, span_id, evidence_refs}','同message去重；成员副作用按action_id去重；缺成员证据仅报告黑盒','§6.7/18.8'),
 ('EX07','TerminalObserver.observe','执行器','执行器','4','4','动作关联ID；批准观察器版本；expected_state_projection；时间窗','Observation{observed_state, observed_at, source_ref, availability}','独立观测对象实际状态；接收执行所需目标投影，不接收封存评分参考；无观测返回UNKNOWN','§4.4/6.7/18.8'),
 ('EX08','ArtifactCollector.collect','执行器','执行器','2','3 4 5','invocation_id；允许文件目录/对象引用；大小限额；context','ArtifactManifest{file_refs, hashes, mime_types, provenance}','路径和大小白名单；经证据服务上传；只返回引用，不把产物当作有效评分','§4.4/7.3/附录A.8'),
 ('DA01','Parser.parse','数据处理','数据处理','1','1 2','文件引用；parser_version；encoding；限制；context','TypedRows{source_row, values, parse_errors}','Excel/JSON/JUnit等解析；禁外部实体与公式执行；来源行可追溯','§4.3/6.1/18.3'),
 ('DA02','RowValidator.validate','数据处理','数据处理','1','1 2','typed_row；schema_ref；mapping_ref；purpose','RowValidation{valid, field_errors, canonical_hash}','逐字段必填/类型/引用校验；不静默修复实测值；逐行回执','§4.3/18.2'),
 ('DA03','RecordImport.commit_context','证据管理','数据处理','8','2','EXISTING_RECORDS上下文；manifest_ref；来源/授权；file_refs；uow','EvidenceSetRef；逐条来源登记回执','无真实执行不造run/attempt；材料不能伪装实际采集','CT43/§6.1/18.3'),
 ('AS01','RuleScorer.score','自动评分','自动评分','6','6','ScoringBundle；metric_ref；规则版本；允许actual/reference投影','CandidateScore{raw_value, unit, validity, reason_code, evidence_refs}','规则计算与最终采用分开；无效/NaN非零分；不直接写总体结论','§6.2/18.7'),
 ('AS02','ModelJudge.score','自动评分','自动评分','6','6','ScoringBundle；rubric_ref；judge_model_ref；参数；校准资格','CandidateScore；模型请求引用；usage','冻结评分器和资格；评分身份才可读参考；失败分类不转对象FAIL','§6.2/6.4/7'),
 ('AS03','MetricNormalizer.normalize','自动评分','自动评分','6','6','原始指标值/单位；metric_mapping_version；validity','NormalizedScore{raw, normalized, validity, reason_code}','仅登记的确定性转换；保留原值；缺映射隔离；无效值不填0','§7.2/7.3'),
 ('RV01','ReviewReadiness.inspect_pilot','人工评测','方案管理','7','2','pilot_id；config_hash；protocol_ref；真实参与人引用','Readiness{qualified, independent, missing_items}','不允许客户端verified替代真实独立意见；未齐备不冻结','§5.2/18.6/18.14'),
 ('RG01','BaselineCandidate.create','资产管理','结果与报告','1','9','snapshot_ref；比较批准；基线元数据；expected_version；ctx/uow','候选asset_version_ref；发布待办引用','基线晋升只建候选；双方确认发布沿P01原流程；不跨模块写registry表','§6.6/18.10/op095'),
 ('RG02','RegressionPlan.create_draft','方案管理','结果与报告、消息与集成','2','11','feedback/trigger_ref；source_snapshot；精确资产引用；source_key','task_id；plan_revision_id；缺口列表','当前权限/资格重验；同source_key只建一次；不复用过期授权','§8.2/18.10/op101'),
 ('RG03','SnapshotReader.get_projection','结果与报告','消息与集成、AI助手','8','10 11 12','ctx；snapshot_id；purpose；字段范围','不可变结果投影及允许证据引用','仅查询；没有业务验收写权限；内部Port还是HTTP承载仍见IF-Q03','CT26/§6.6/8.3'),
 ('RG04','FeedbackCandidate.create','资产管理','结果与报告','1','11','feedback_id；获准失败样本引用；来源/授权；expected_version','候选资产引用；逐项冲突/缺口','反馈沉淀是候选，不自动发布；参考内容按用途隔离','§18.10/op100'),
 ('AI01','ContextProjector.project','AI助手','AI助手','12','12','ctx；target；purpose；输入引用；允许字段','AssistanceContext{visible_inputs, version_refs, source_refs}','调用Registry/结果查询公开Port；无封存参考和盲评意见；模型输入可审计','§8.3/附录A.14'),
 ('AI02','ProposalGenerator.generate','AI助手','AI助手','12','12','AssistanceContext；批准模型配置；输出Schema；limit','ProposalDraft{changes, evidence_refs, usage, validation_errors}','建议非事实；不直接发布/冻结/执行；结构校验后等待用户采纳','§8.3/18.10'),
 ('OP01','AuditService.append','运维监控','消息与集成','15','15','EV15 EventEnvelope；主体/动作/对象/结果；audit_id；uow','AuditReceipt{audit_id, duplicate}','唯一audit_id；消费审计请求并追加，不更新历史审计；无敏感正文','CT33/EV15'),
 ('RF01','ReferenceRelease.link_candidate','参考数据管理','人工评测','1','7','ctx；锁定人工参考；候选version_ref；source_hash；purpose_grant','ReferenceRef；关联状态；审计引用','独立reference-api承载；禁止跨服务传uow；发布关联与可读状态有恢复流程','CT35/§6.4/18.6'),
 ]
 for tup in specs:
  id,name,provider,caller,p,c,inp,out,rules,source=tup
  stage='B2' if id in ['EX04','EX05','EX06'] else ('B1；专项按原批次扩展' if id in ['PL02','PL03','PL04','EX01','EX02','EX03'] else 'B1')
  x=add(id,name+'(ctx, input)',provider,caller,p,c,inp,out,rules,source,stage=stage)
  if id=='WF02':x['kind']='Worker协议';x['mode']='op049工作投影下发＋op062/op106回传';x['related']=['op024','op049','op062','op106']
  if id=='RF01':x['mode']='内部HTTPS命令；具体路径待明确';x['status']='设计补充／路径待明确';x['related']=['CT35.2']
  if id=='RG03':x['status']='设计补充／承载待明确';x['related']=['CT26.1']
 # The adapter contract has six lifecycle operations, not only the three in CT16.
 for id,method,inp,out,rules in [
 ('AD01','prepare','AccessProfile精确版本；ExecutionBundle；租约/批准资源','PreparedSession{session_ref, capabilities, environment_ref}','验证隔离和前置状态，不把准备完成当作执行成功'),
 ('AD02','artifacts','session_ref/job_ref；上下文；允许产物类型','ArtifactManifest{refs, hashes, observed_at}','只读获准产物；经证据提交校验，不泄漏目录'),
 ('AD03','cleanup','session_ref/job_ref；epoch；清理策略','CleanupReceipt{verified, residue, observation_refs}','终止进程不等于业务状态复位；清理未知不释放资源')]:
  add(id,'Adapter.'+method+'(ctx, input)','执行器','执行器','','3 4 5',inp,out,rules,'§4.4/§7/CT16',kind='插件接口',mode='本地适配器Port；外部协议由接入档案固定')
 # Concrete, frozen engine bindings. A single contract can have distinct implementations.
 for tag,engine,p,c,ops in [('OC','OpenCompass','3','3',['prepare','submit','query','cancel','artifacts','cleanup']),('AC','AgentCompass','4','4',['prepare','submit','query','cancel','artifacts','cleanup'])]:
  for i,op in enumerate(ops,1):
   x=add(tag+str(i).zfill(2),engine+'ExecutionAdapter.'+op+'(ctx, input)','执行器','执行器',p,c,'EngineBindingRef；ExecutionBundle或invocation_ref；epoch；limit','CT38.'+str(i)+'规定的准备/作业/查询/取消/产物/清理回执','冻结binding选择此实现；capabilities声明不支持的动作；平台唯一派工；未知副作用禁止盲重试','§7.1—7.3/CT38',kind='插件接口',mode='受控Python进程／SDK封装',stage='按已批准引擎资格',related=['CT38.'+str(i)])
   x['note']='明确通用契约的类型实现归属；本表方法是平台封装契约，不宣称第三方SDK存在同名方法。具体引擎版本、支持动作与资格待验证。'
 for tag,engine in [('RS','Ragas'),('OS','OpenCompass'),('GS','AgentCompass')]:
  x=add(tag+'01',engine+'ScoringAdapter.score(ctx, bundle)','自动评分','自动评分','6','6','ScoringBundle；engine_binding；metric_mapping_version；模型配置引用','CandidateScore[]；原始产物引用；usage','仅score-worker；无映射/NaN/缺失隔离；第三方输出不直接决定验收','§7.1—7.3/CT39',kind='插件接口',mode='受控Python进程／SDK封装',stage='按已批准引擎资格',related=['CT39.1'])
  x['note']='平台封装方法，非第三方原生API声明；Ragas服务P05指标场景，但评分能力提供方仍为P06。'
 # External and infrastructure boundaries: actual direction is kept, no fake product owners.
 external=[
 ('XT01','IdentityProvider.verify_token','API接口、权限管理','13','OIDC token；issuer/audience；JWKS缓存版本','IdentityClaims或鉴权错误','HTTPS／OIDC/JWKS','验签及过期；密钥缓存有刷新与失败关闭；不信任客户端角色','身份提供方','§3.3/附录B op001'),
 ('XT02','ModelClient.generate','自动评分、AI助手、执行器','4 6 12','获准模型引用；用途投影；推理参数；token限额；request_id','模型输出/流片段；provider_request_id；usage','批准模型协议／HTTPS','裁判/助手/模拟器身份用途分离；出口白名单；不默认调用外部模型','批准模型服务','§7.3/8.3'),
 ('XT03','EmbeddingClient.embed','自动评分','6','模型配置引用；文本批次；purpose；限额','向量批次；维度；usage','批准embedding协议／HTTPS','只有所选指标需要时调用；批准模型及维度匹配；不把失败填零','批准embedding服务','§7.3'),
 ('XT04','ObjectStore.put_signed','数据处理、执行器、自动评分、结果与报告','1 2 3 4 5 6 8','单对象签名URL；文件字节；content_type；checksum','上传响应；对象版本标识','HTTPS／S3兼容协议','平台签名URL仅可写指定key/大小/用途；不能列桶；凭据不入日志','对象存储','CT18/§18.3'),
 ('XT05','ObjectStore.verify_object','证据管理、参考数据管理','1 8','server-side object_ref/version；预期size/hash','实际字节/hash/扫描结果及版本','HTTPS／S3兼容协议','服务端核实后登记；不信任上传者etag/hash；参考独立桶/前缀角色','对象存储','§6.1/18.3'),
 ('XT06','ObjectStore.get_scoped','数据处理、执行器、自动评分、结果与报告、证据管理、参考数据管理','1 2 3 4 5 6 8','由所属服务授权的单对象引用/短期票据；purpose','文件字节／范围读取；实际对象版本','HTTPS／S3兼容协议','按身份用途投影；执行器无reference前缀读取权；禁止接受任意URL','对象存储','CT19/20/§18.3'),
 ('XT07','MessageBroker.publish','消息与集成','15','Outbox事件信封；routing_key；event_id；schema_version','publisher confirm/nack','AMQP／持久化发布','确认后标已投递；崩溃可重发；不能跨DB/MQ宣称exactly-once','RabbitMQ','CT30/§8.2/18.12'),
 ('XT08','MessageBroker.consume','消息与集成','15','队列绑定；consumer_name；prefetch；重试/死信策略','事件投递；ack/nack通道','AMQP／至少一次','业务事务与Inbox提交后ack；消费者独立幂等；毒消息隔离','RabbitMQ','CT30/§18.12'),
 ('XT09','Cache.get_set_invalidate','API接口、权限管理、任务调度、参考数据管理','2 13 14','项目/主体/用途/版本隔离key；TTL；撤权代次','缓存值/未命中/失效回执','Redis协议','缓存不作为资格/权限/租约权威；撤权消费者清单仍见IF-Q05','Redis','§3.3/12/IF-Q05'),
 ('XT10','Telemetry.export','API接口、权限管理、资产管理、数据处理、方案管理、流程编排、任务调度、执行器、证据管理、自动评分、人工评测、结果与报告、消息与集成、AI助手、运维监控、参考数据管理','15','trace/span；无敏感正文的指标/结构日志；project/request关联','接收回执或采集失败计数','OTLP／指标抓取／结构日志','遥测失败不得伪造业务成功；指标标签禁高基数正文；运行日志非审计事实','可观测采集服务','§12.5'),
 ('XT11','AlertRouter.deliver','运维监控','15','alert_key；严重级别；脱敏摘要；runbook链接','通知回执/重试状态','HTTPS／企业告警通道','去重/限流；具体通道和接收配置待环境确认','企业告警服务','§8.4/12.5'),
 ]
 for id,name,caller,c,inp,out,mode,rules,provider,source in external:
  x=add(id,name,'',caller,'',c,inp,out,rules,source,kind='基础设施接口' if int(id[2:])>=4 else '外部适配',mode=mode,external_provider=provider)
  x['note']='外部协议适配边界；此名称是平台Port设计，不是对供应商原生路径或方法的假定。'
  if id=='XT09':x['status']='设计补充／调用方待明确';x['note']+=' 此处列缓存使用的候选控制端；精确用途、撤权队列和订阅身份仍须IF-Q05确认，不表示已登记消费者。'
 # Database is per-module infrastructure, never a cross-module business API or Worker permission.
 for n,m in enumerate(data['modules'],1):
  if m=='执行器':continue
  add('DB'+str(n).zfill(2),'Repository/UoW · '+m,'',m,'','','模块限定DTO/查询条件；uow；数据库角色','本模块持久化实体映射/提交版本/回滚错误','只访问本模块schema；跨模块业务变化走公开Port；计算Worker没有主库凭据；参考服务独立角色','§2.3/9.4/附录A',kind='基础设施接口',mode='PostgreSQL事务／参数化SQL',external_provider='PostgreSQL（'+m+'所属schema）')
 # Explicit consumer contracts; one delivery is routed to the owning consumer, not a fan-out mutation.
 for event in [r for r in rows if r['kind']=='消息事件']:
  for n,consumer in enumerate(event['callers'],1):
   x=add('SUB-'+event['id'].replace('.','-')+'-'+str(n),consumer+'.handle('+event['operation']+')',consumer,'消息与集成',' '.join(x[1:] for x in event['product_callers']),'15','EventEnvelope{event_id, schema_version, project_id, aggregate_id, sequence, payload_ref, trace_id}','ConsumerReceipt{processed, duplicate, deferred, reason_code}',event['scenario']+'；Inbox消费名+event_id去重；状态变化与Inbox同事务；成功后ack，乱序校验版本。',event['id'],kind='消息处理接口',mode='AMQP投递 → 消费者公开处理器',related=[event['id']])
   x['product_note']='按消费者在该事件中的职责映射；事件生产产品见关联事件行。'
   # Do not assign all consumers all product responsibilities.
   consumer_owner={'流程编排':'2','任务调度':'14','资产管理':'1','数据处理':'1','自动评分':'6','人工评测':'7','结果与报告':'8','消息与集成':'10 11','运维监控':'15','参考数据管理':'1','API接口':''}
   x['product_providers']=ids(consumer_owner.get(consumer,''))
   if event['id'].startswith('EV04') or event['id'].startswith('EV12'):
    x['status']='设计补充／路由待明确';x['note']+=' IF-Q06(kind路由)/IF-Q05(撤权订阅)未关闭。'
 # Source coverage: every original item survives and every public HTTP entry names its application boundary.
 # Cross-cutting authorization is a library Port invoked by the owning control service.
 # Workers only use their scoped HTTP contracts; they are not granted a policy/database channel.
 policy=by['CT01.1']
 policy['callers']=[m for m in data['modules'] if m!='执行器']
 policy['note']+=' 本次补齐控制端应用服务的当前权限校验依赖；执行Worker不因此获得策略服务或数据库直连。'
 policy['source']='CT01/§2.3/§3.3/§6.8'
 data['coverage']={'http_count':108,'ct_groups':46,'event_count':17,'modules':len(data['modules']),'original_count':180,'total':len(rows),'kinds':dict(Counter(r['kind'] for r in rows)),'scope':'现有16个技术模块的公开交互边界、产品策略/插件契约、外部及基础设施协议；不逐项列无调用边界的私有辅助函数。','verification':'设计清单覆盖核对，不是代码实现或联调通过声明'}
 data['questions'] += [
 ['IF-Q07','类型策略/运行插件及引擎绑定','新增平台封装契约需落到精确DTO Schema与锁定引擎版本；每个引擎支持动作、超时与取消语义需资格测试确认。','方案管理、执行器、自动评分','PL/EX/AD/OC/AC/RS/OS/GS标设计补充，不宣称第三方具备同名SDK方法。'],
 ['IF-Q08','跨进程参考关联与外部协议配置','RF01的内部HTTPS路径、失败恢复与引用关联补偿，以及模型、告警、遥测的企业端点/认证配置需确认。','参考数据管理、权限管理、运维监控','先明确责任与输入输出，不捏造已有HTTP地址或凭据。']]
 return data

def render(data):
 E=html.escape;rows=data['rows'];products=data['products'];modules=data['modules']
 def domid(id):return 'iface-'+re.sub(r'[^a-zA-Z0-9_-]','-',id)
 def label(ps):return '<br>'.join(E(x+' '+products[x]) for x in ps)
 def link(r):return '<a href="#'+E(domid(r['id']))+'">'+E(r['id'])+'</a>'
 def table(headers,rs):return '<div class="table-wrap"><table><thead><tr>'+''.join('<th scope="col">'+E(x)+'</th>' for x in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+x+'</td>' for x in row)+'</tr>' for row in rs)+'</tbody></table></div>'
 out=['<section id="interface-directory"><h3>3.5 全模块接口清单与交互依赖索引</h3>',
 '<p><strong>范围：</strong>覆盖现有16个技术模块的HTTP入口、应用Port、领域协作、消息及消费处理器、Worker下发与回执、产品策略/插件、外部系统及基础设施协议。私有辅助函数不作为模块接口；跨模块不得通过直读业务表替代公开接口。下方为设计清单，不代表代码已实现或联调已通过。</p>',
 '<p><strong>本次补齐：</strong>保留原108项HTTP、46组CT追踪及17类事件；明确HTTP到应用服务的入口，新增规划器、Agent/模型/应用执行、模拟器、多Agent交接、引擎具体实现及基础设施边界。每行标注来源和契约状态；“设计补充”表示本次明确的设计签名，不伪装为已有实现；未决项单列。</p>',
 '<p id="iface-product-help"><strong>方向：</strong>提供方按方法实际能力归属，调用方列直接依赖模块；同技术模块内的不同组件也明确展示。公共EngineExecution契约与AgentCompass具体实现分别列出，不把所有实现归为公共，也不把所有使用者当成提供方。事件行是生产→消费；消息处理接口行是消息与集成→所属消费者处理器。产品筛选不替代技术模块依赖。<strong>搜索：</strong>六个条件取交集；Agent评测/Agent 评测等价，P04按编号精确匹配；关键词也搜索输入输出、组件、协议和场景。所有类型默认可见。</p>']
 out+=['<div class="iface-controls"><label>关键词<input id="iface-query" type="search" placeholder="接口 / 产品编号、模块名、路径或场景"></label>']
 for id,name in [('provider','提供／生产模块'),('caller','调用／消费模块')]:out.append('<label>'+name+'<select id="iface-'+id+'"><option value="">全部</option>'+''.join('<option>'+E(x)+'</option>' for x in modules)+'</select></label>')
 out.append('<label>接口类型<select id="iface-kind"><option value="">全部</option><option>非事件接口</option>'+''.join('<option>'+E(x)+'</option>' for x in dict.fromkeys(r['kind'] for r in rows))+'</select></label>')
 for id,name,ph in [('product-provider','提供方产品模块','P04 或Agent评测'),('product-caller','调用方产品模块','P02 或对象接入')]:out.append('<label>'+name+'<input id="iface-'+id+'" type="search" list="iface-product-options" placeholder="'+ph+'"></label>')
 out.append('<datalist id="iface-product-options">'+''.join('<option value="'+E(x+' '+v)+'"></option>' for x,v in products.items())+'</datalist><button type="button" id="iface-reset">重置筛选</button><span id="iface-count" class="iface-count" role="status" aria-live="polite">'+str(len(rows))+'条</span></div>')
 headers=['接口编号／类型／状态','接口名称／方法／组件','提供／生产技术模块','提供方产品模块','调用／消费技术模块清单','调用方产品模块','交互方式／阶段','输入输出、调用场景与约束','来源／关联契约']
 out.append('<div class="iface-scroll"><table id="interface-table"><thead><tr>'+''.join('<th scope="col">'+h+'</th>' for h in headers)+'</tr></thead><tbody>')
 by={r['id']:r for r in rows}
 for r in rows:
  meta={k:r[k] for k in ('providers','callers','kind','product_providers','product_callers')}
  meta['product_provider_labels']=[p+' '+products[p] for p in r['product_providers']]+([r.get('product_provider_scope','')] if not r['product_providers'] else [])
  meta['product_caller_labels']=[p+' '+products[p] for p in r['product_callers']]
  meta['product_labels']=meta['product_provider_labels']+meta['product_caller_labels']
  info='<details><summary>输入／输出与调用约束</summary><p><strong>输入：</strong>'+E(r['inputs'])+'</p><p><strong>输出：</strong>'+E(r['outputs'])+'</p><p><strong>约束：</strong>'+E(r['scenario'])+'</p><p><strong>说明：</strong>'+E(r['note'])+'</p>'
  info+='<p><strong>提供方代码边界：</strong>'+E('；'.join('packages/backend/src/eval_platform/'+MODULE_PATHS[m]+'/ports/（接口），application/或infrastructure/（实现）' for m in r['providers']) or '平台外部；调用侧infrastructure适配')+'</p>'
  if r.get('call_chain'):info+='<p><strong>链路：</strong>'+E(r['call_chain'])+'</p>'
  info+='</details>'
  source='<a href="#'+E(r.get('target_source',r['target']))+'">原合同</a>' if r.get('target_source') or not r['target'].startswith('contract-') else E(r['source'])
  source+=''.join('<br>'+link(by[x]) for x in r.get('related',[]) if x in by)
  if r.get('application_port'):source+='<br>'+link(by[r['application_port']])
  pp=label(r['product_providers']) or E(r.get('product_provider_scope','公共技术能力'))
  if '待明确' in r['status']:pp='<small class="iface-status">归属/契约待明确，见说明</small>'+pp
  cells=['<b>'+E(r['id'])+'</b><small>'+E(r['kind'])+'</small><small class="iface-status">'+E(r['status'])+'</small>',E(r['name'])+'<br><code>'+E(r['operation'])+'</code><small>组件：'+E(r['component'])+'</small>',E('、'.join(r['providers']) or r.get('external_provider') or r.get('product_provider_scope','平台外部')),pp+'<details><summary>产品归属说明</summary>'+E(r['product_note'])+'</details>',E('、'.join(r['callers']) or '外部调用方')+('<small>外部发起方：'+E('、'.join(r['external']))+'</small>' if r['external'] else ''),label(r['product_callers']) or '公共／基础设施调用',E(r['mode'])+'<small>'+E(r['stage'])+'</small>',E(r['scenario'])+info,source]
  out.append('<tr id="'+domid(r['id'])+'" data-iface="'+E(json.dumps(meta,ensure_ascii=False),quote=True)+'">'+''.join('<td>'+x+'</td>' for x in cells)+'</tr>')
 out.append('</tbody></table></div><p id="iface-empty" hidden>没有匹配的接口，请调整关键词或重置筛选。</p>')
 # These are totals across the whole scope, deliberately separate from the filtered result count.
 out.append('<details open id="interface-module-coverage"><summary>16个技术模块双向覆盖核对（全量，不随筛选变化）</summary><p>每个数字可筛选对应接口；模块索引按提供/调用分别计算，一个接口可能被多个模块依赖。消息消费处理器是接口，业务事件单独统计。</p>')
 mr=[]
 for m in modules:
  nums=[]
  for role,key,event in [('provide','providers',False),('call','callers',False),('publish','providers',True),('subscribe','callers',True)]:
   count=sum(m in r[key] and (r['kind']=='消息事件')==event for r in rows)
   nums.append('<button type="button" data-iface-module="'+m+'" data-iface-role="'+role+'">'+str(count)+'</button>')
  mr.append([E(m),*nums,'<code>'+MODULE_PATHS[m]+'/ports/</code>'])
 out.append(table(['技术模块','提供接口','调用接口','生产事件','消费事件','代码边界'],mr)+'</details>')
 out.append('<details open id="interface-product-coverage"><summary>15个产品模块能力覆盖（提供与调用分别核对）</summary><p>产品能力可由多个技术组件实现；以下列出提供侧代表契约，不能把公共服务调用数当作产品能力数。点击条目可定位，完整清单用上方产品筛选。</p>')
 pr=[]
 for p,name in products.items():
  supplied=[r for r in rows if p in r['product_providers'] and r['kind']!='消息事件'];called=[r for r in rows if p in r['product_callers'] and r['kind']!='消息事件']
  preferred=[r for r in supplied if re.match(r'PL|EX|AC|OC|RS|RG|AI|AS',r['id'])]
  sample=(preferred or supplied)[:10]
  pr.append([E(p+' '+name),str(len(supplied)),str(len(called)),'、'.join(E(x) for x in sorted({m for r in supplied for m in r['providers']})), '；'.join(link(r)+' '+E(r['name']) for r in sample)])
 out.append(table(['产品模块','提供接口','调用接口','实现技术模块','能力契约示例'],pr)+'</details>')
 out.append('<details id="interface-ct-coverage"><summary>CT01—CT46与逐接口条目追踪</summary>')
 ct=[]
 for c,old in data['ct_index'].items():
  ids=list(old)
  for r in rows:
   if any(x in old for x in r.get('related',[])) and r['id'] not in ids:ids.append(r['id'])
  ct.append([c,'、'.join(link(by[x]) for x in ids)])
 out.append(table(['原契约','本清单条目及应用/实现契约'],ct)+'</details>')
 out.append('<details open id="interface-open-questions"><summary>接口待明确项（'+str(len(data['questions']))+'项）</summary><p>清单完整性与契约确定性分别核对。下列问题没有因补入一行而自动关闭；需要同时更新原HTTP/CT、DTO、测试和实现。</p>')
 out.append(table(['编号／范围','待明确问题','责任模块','当前处理'],[[E(q[0]+' '+q[1]),E(q[2]),E(q[3]),E(q[4])] for q in data['questions']])+'</details>')
 cov=data['coverage'];out.append('<p id="interface-coverage-summary"><strong>覆盖核对：</strong>'+str(len(rows))+'条设计交互记录；16/16技术模块双向建账；108/108 HTTP入口均定位到应用Port；46/46 CT组可追踪；17/17事件均列消费处理器。新增公开方法须同步此清单与模块测试。'+E(cov['verification'])+'。</p>')
 out.append('</section>')
 return ''.join(out)

def publish(data):
 data=complete(data)
 # Use the overview's actual CT I/O, rather than inventing precise DTOs for old unresolved groups.
 overview=(R/'dist/design/overview.html').read_text();cts={}
 for tr in re.findall(r'<tr\b.*?</tr>',overview,re.S):
  cs=[html.unescape(re.sub('<[^>]+>',' ',v)).strip() for v in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>',tr,re.S)]
  if len(cs)>=6 and re.fullmatch(r'CT\d+',cs[0]):cts[cs[0]]=cs
 for r in data['rows']:
  if r['kind']!='HTTP' and r['id'].startswith('CT'):
   c=cts.get(r['id'].split('.')[0]);parts=c[4].split('→',1) if c else []
   if len(parts)==2:r['inputs']=parts[0].strip();r['outputs']=parts[1].strip();r['note']+=' 输入输出沿用原CT组约束；涉及多操作的精确签名仍以待明确项为准。'
 data['ct_contract_sources']=cts
 (D/'inventory.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 (D/'coverage.json').write_text(json.dumps(data['coverage'],ensure_ascii=False,indent=2)+'\n')
 p=R/'dist/design/index.html';s=p.read_text()
 # Keep each module chapter pointing at the same authoritative inventory.
 s=re.sub(r'<p class="iface-module-update">.*?</p>','',s,flags=re.S)
 for i,m in enumerate(data['modules'],1):
  provided=[r for r in data['rows'] if m in r['providers']]
  called=[r for r in data['rows'] if m in r['callers']]
  new_components=list(dict.fromkeys(r['component'] for r in provided if r['status'].startswith('设计补充') and not r['id'].startswith(('AP','SUB-'))))
  note='<p class="iface-module-update"><strong>全量接口更新：</strong>提供/生产 '+str(len(provided))+' 条；调用/消费 '+str(len(called))+' 条。新增公开组件：'+html.escape('、'.join(new_components) or '见应用Port及消费处理器')+'。<a href="#interface-directory">查看统一接口清单及双向筛选</a>；原CT仅为追踪分组，不代替逐接口清单。</p>'
  pattern=r'(<summary>A\.'+str(i)+' '+re.escape(m)+r'</summary>)'
  s=re.sub(pattern,lambda match:match[1]+note,s,count=1)

 s=re.sub(r'<section id="interface-directory">.*?</section>',lambda _:render(data),s,flags=re.S)
 s=re.sub(r'<script id="iface-script">.*?</script>',lambda _:'<script id="iface-script">'+(R/'scripts/interface-filter.js').read_text()+'</script>',s,flags=re.S)
 # Keep the nine-column layout; long signatures wrap inside their cell.
 s=re.sub(r'<style id="iface-product-style">.*?</style>','',s,flags=re.S)
 css='<style id="iface-product-style">#interface-table{min-width:1510px}#interface-table th:nth-child(1){width:115px}#interface-table th:nth-child(2){width:220px}#interface-table th:nth-child(3){width:120px}#interface-table th:nth-child(4){width:170px}#interface-table th:nth-child(5){width:140px}#interface-table th:nth-child(6){width:170px}#interface-table th:nth-child(7){width:140px}#interface-table th:nth-child(8){width:280px}#interface-table th:nth-child(9){width:110px}#interface-table code{white-space:normal;overflow-wrap:anywhere}#interface-table tr[hidden]{display:none!important}#interface-directory input{width:230px}#interface-directory .iface-count{flex-basis:100%;font-weight:600}#interface-directory small{display:block}#interface-directory details{max-width:100%}@media print{#interface-table{min-width:0}}</style>'
 s=s.replace('<section id="interface-directory">',css+'<section id="interface-directory">',1);p.write_text(s)
 manifest=R/'docs/design-publication.json';v=json.loads(manifest.read_text())
 for x in v['sources']:
  if x['page']=='index.html':x['published_sha256']=hashlib.sha256(p.read_bytes()).hexdigest()
 for x in v['checks']:
  if x['page']=='index.html':x['bytes']=p.stat().st_size
 v['interface_directory'].update({'product_modules':15,'product_fields':['提供方产品模块','调用方产品模块'],'updated':'2026-11-28','coverage':data['coverage'],'total_rows':len(data['rows']),'internal':data['coverage']['kinds']['内部接口'],'external_adapters':data['coverage']['kinds']['外部适配'],'technical_questions':len(data['questions']),'interface_kinds':data['coverage']['kinds']})
 manifest.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(data['coverage'],ensure_ascii=False))
