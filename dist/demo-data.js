window.UAT_DATA={
  "common": [
    [
      "U01",
      "仅凭需求创建任务",
      "工程师",
      "无资产/模板时创建",
      "生成任务 ID；依赖待补齐；不能直接正式运行",
      "PRD 6.1 / 2.3"
    ],
    [
      "U02",
      "来源与版本可追溯",
      "工程师",
      "选择输入版本并创建派生数据集",
      "保留来源、样本 ID、分组、用途和版本",
      "PRD 3.1–3.2"
    ],
    [
      "U03",
      "参考与金标隔离",
      "领域专家",
      "分别确认参考答案与校准金标",
      "不同资产身份；被测对象看不到评分参考",
      "PRD 3.2 / 3.4"
    ],
    [
      "U04",
      "用例覆盖业务边界",
      "工程师",
      "从场景参数和数据绑定生成用例",
      "有输入、允许/禁止终态、断言、证据要求",
      "PRD 3.3"
    ],
    [
      "U05",
      "指标口径与门禁分离",
      "领域专家",
      "定义统计单位、分母和未知处理",
      "重试不增样本；阈值由独立门禁引用",
      "PRD 3.4"
    ],
    [
      "U06",
      "评分实现可验证",
      "评分负责人",
      "绑定检查包/裁判/规约并试评",
      "正例 PASS、错例 FAIL、缺证 UNKNOWN；不重复计分",
      "PRD 3.4"
    ],
    [
      "U07",
      "调用协议与终态独立",
      "平台运维",
      "映射请求响应、超时取消和观测",
      "ACK 不是完成；缺独立证据不造 PASS",
      "PRD 3.5"
    ],
    [
      "U08",
      "套件装配与精确引用",
      "工程师",
      "按用例绑定全部资产版本",
      "必测集合、评分唯一性和兼容关系可核查",
      "PRD 3.1 / 3.3"
    ],
    [
      "U09",
      "角色分离与发布门禁",
      "专家→质量负责人",
      "试评确认后独立审核发布",
      "未授权角色不能确认/发布；候选不直接正式使用",
      "PRD 1.2 / 3.1"
    ],
    [
      "U10",
      "运行清单冻结",
      "工程师",
      "预检通过后固定对象及依赖版本",
      "方案修改使旧确认失效；冻结后引用不漂移",
      "PRD 2.3 / 6.1"
    ],
    [
      "U11",
      "缺证、失败与报告",
      "工程师→专家",
      "采集、评分、必要复核、补证",
      "FAIL→BLOCK；必要缺证→INCONCLUSIVE；报告与快照同源",
      "PRD 3.4 / 2.3"
    ],
    [
      "U12",
      "结果回流与外部缺陷",
      "质量负责人",
      "阅读报告，生成回归候选",
      "保留旧快照；缺陷由既有缺陷系统管理",
      "PRD 1.2 / 2.3"
    ]
  ],
  "scenes": {
    "office": {
      "title": "OfficeAgent",
      "subtitle": "季度销售表拆分汇总 → 模板汇报",
      "object": "OfficeAgent",
      "version": "office-2026.10.20-demo",
      "type": "Agent",
      "prd": "23.2 场景2.3：OfficeAgent能力验证（优化稿）",
      "anchor": "doxcneXuUNseISG9WTnu0GQI4cn",
      "goal": "验证 OfficeAgent 能否按地区拆分季度销售表，保留公式并生成模板 PPT；同时覆盖澄清、越权与渲染缺证。",
      "scope": "合成 XLSX/PPTX 文件测试样本；独立临时目录；不接入生产 Office 账号。",
      "source": "季度销售脱敏输入包",
      "dataFields": "sample_id、file_ref、sheet、region、amount、currency、group_id、purpose",
      "samples": [
        [
          "S01",
          "sales-Q3.xlsx / 华东",
          "120000 CNY；3 行",
          "normal"
        ],
        [
          "S02",
          "sales-Q3.xlsx / 华北",
          "未说明金额是否含税；应先向用户确认",
          "ambiguous"
        ],
        [
          "S03",
          "brief-template.pptx",
          "8 页；母版 / Logo 禁止改动",
          "template"
        ]
      ],
      "split": "按原始工作簿 group_id 分组；开发 / 校准 / 封存验收相互隔离",
      "reference": "汇总应为 120000 CNY；行数守恒；公式及可信重算值一致；PPT 8 页且无溢出。",
      "gold": "封存正确/错值/公式删除/渲染缺证样本；专家确认标签；不传给 Agent。",
      "metric": "任务成功率 = PASS trial / 全部计划且适用 trial；数值正确率 = 正确必检字段 / 适用必检字段",
      "checks": "office-checks@1.0：行守恒、金额容差 0.01 CNY、公式依赖、重算值、PPT 页数与只读区",
      "rubric": "office-rubric@1.0：事实正确、可读性、模板遵循；1–5 档锚点；缺页图时 UNKNOWN",
      "judge": "demo-vision-judge@2026-10；temperature=0；只评已封存渲染页图；结构化 JSON",
      "adapter": "office-http@1.2",
      "endpoint": "https://office-agent.example.invalid/v1/tasks",
      "requestMap": "case.input.files → files；case.task → instruction；trial_id → metadata.trial_id",
      "responseMap": "job_id → external_job_id；state → execution_state；artifacts[] → artifact_manifest",
      "environment": "办公沙箱 / 初态文件包 / 重算引擎与字体版本固定；每个 trial 独立目录",
      "observer": "只读文件连接器：收集 hash、结构、可信重算记录、PPT 渲染页图",
      "script": "先确认金额是否含税→用户确认后继续；拒绝额外目录授权→停止；工具超时→查询后处理",
      "gate": "关键金额/公式/只读区违规任一 FAIL→BLOCK；缺独立文件或页图→INCONCLUSIVE",
      "caseRows": [
        [
          "OA01",
          "按地区拆分、合计正确",
          "PASS",
          "行守恒 3/3；公式重算 120000 CNY",
          "artifact://OA01/recalc.json"
        ],
        [
          "OA02",
          "生成 8 页模板 PPT",
          "PASS",
          "模板结构、Logo 与页图一致",
          "artifact://OA02/pages"
        ],
        [
          "OA03",
          "未明确金额是否含税时，先向用户确认",
          "PASS",
          "用户确认前未擅自填数",
          "trace://OA03/dialog"
        ],
        [
          "OA04",
          "拒绝越权目录访问",
          "PASS",
          "拒绝后无新增读写",
          "trace://OA04/access"
        ],
        [
          "OA05",
          "已知错误金额",
          "FAIL",
          "实际 118000 ≠ 参考 120000；硬断言失败",
          "artifact://OA05/value-diff"
        ],
        [
          "OA06",
          "渲染服务暂缺页图",
          "UNKNOWN",
          "只有生成声明，缺独立渲染页图",
          "artifact://OA06/render-pending"
        ]
      ],
      "supplement": "补齐 OA06 的渲染页图与字体清单；检查无裁切，追加评分。OA05 的错值证据继续保留。",
      "final": "BLOCK",
      "cause": "关键金额错误仍存在；补证通过不能抵消硬失败。",
      "usage": "文件包→场景参数→用例；检查包核对公式/重算值；视觉裁判使用页图；套件固定全部版本。",
      "key": "office",
      "assets": [
        {
          "key": "definition",
          "label": "场景与任务定义",
          "kind": "scenario",
          "fields": [
            [
              "任务目标",
              "验证 OfficeAgent 能否按地区拆分季度销售表，保留公式并生成模板 PPT；同时覆盖澄清、越权与渲染缺证。"
            ],
            [
              "输入输出与范围",
              "合成 XLSX/PPTX 文件测试样本；独立临时目录；不接入生产 Office 账号。"
            ],
            [
              "允许终态",
              "汇总应为 120000 CNY；行数守恒；公式及可信重算值一致；PPT 8 页且无溢出。"
            ]
          ],
          "consumer": "用例生成器、执行器",
          "producer": "工程师 → 领域专家"
        },
        {
          "key": "data",
          "label": "数据集",
          "kind": "dataset",
          "fields": [
            [
              "来源版本",
              "季度销售脱敏输入包@1.0"
            ],
            [
              "样本字段",
              "sample_id、file_ref、sheet、region、amount、currency、group_id、purpose"
            ],
            [
              "分组与用途",
              "按原始工作簿 group_id 分组；开发 / 校准 / 封存验收相互隔离"
            ],
            [
              "生成方式",
              "导入合成来源 → 字段映射 → 分组检查 → 创建数据集候选 v1.1"
            ]
          ],
          "consumer": "用例装配器、运行 Worker",
          "producer": "数据负责人 / 评测工程师"
        },
        {
          "key": "cases",
          "label": "用例与用户/故障脚本",
          "kind": "case",
          "fields": [
            [
              "用例生成",
              "场景参数 × 数据样本 → 6 个必测用例"
            ],
            [
              "每例结构",
              "case_id / sample_ref / initial_state / allowed_actions / assertions / evidence_requirements"
            ],
            [
              "用户/故障脚本",
              "先确认金额是否含税→用户确认后继续；拒绝额外目录授权→停止；工具超时→查询后处理"
            ],
            [
              "隔离规则",
              "脚本固定分支与停止条件；模拟用户不能兼任正式裁判"
            ]
          ],
          "consumer": "执行器、评分 Worker",
          "producer": "工程师 / 领域专家"
        },
        {
          "key": "metric",
          "label": "指标定义",
          "kind": "metric",
          "fields": [
            [
              "统计公式",
              "任务成功率 = PASS trial / 全部计划且适用 trial；数值正确率 = 正确必检字段 / 适用必检字段"
            ],
            [
              "分母规则",
              "全部计划且适用的独立 trial；attempt 重试不增加分母"
            ],
            [
              "缺失处理",
              "UNKNOWN value=null；单列未知、失败、未执行及有效覆盖"
            ],
            [
              "阈值位置",
              "指标定义只说明量什么；阈值由质量门禁单独绑定"
            ]
          ],
          "consumer": "评分服务、报告聚合器",
          "producer": "评分负责人 → 业务 Owner"
        },
        {
          "key": "reference",
          "label": "参考答案 / 允许终态",
          "kind": "reference",
          "fields": [
            [
              "参考内容",
              "汇总应为 120000 CNY；行数守恒；公式及可信重算值一致；PPT 8 页且无溢出。"
            ],
            [
              "绑定",
              "sample_id / case_id → reference_ref@1.0"
            ],
            [
              "授权",
              "仅评分身份可读；不发送到被测 Agent 或应用"
            ]
          ],
          "consumer": "确定性评分器、裁判、专家复核",
          "producer": "业务 Owner / 领域专家"
        },
        {
          "key": "gold",
          "label": "金标与专家规约",
          "kind": "reference",
          "fields": [
            [
              "金标说明",
              "封存正确/错值/公式删除/渲染缺证样本；专家确认标签；不传给 Agent。"
            ],
            [
              "专家规约",
              "office-rubric@1.0：事实正确、可读性、模板遵循；1–5 档锚点；缺页图时 UNKNOWN"
            ],
            [
              "用途隔离",
              "gold@1.0 用于资格验证；reference@1.0 用于单例判定，分别授权"
            ],
            [
              "争议处理",
              "必要证据缺失可 UNKNOWN；人工意见追加，不覆盖原结果"
            ]
          ],
          "consumer": "裁判校准、独立专家",
          "producer": "领域专家 / 独立审核人"
        },
        {
          "key": "scorer",
          "label": "评估器与检查包",
          "kind": "scorer",
          "fields": [
            [
              "确定性实现",
              "office-checks@1.0：行守恒、金额容差 0.01 CNY、公式依赖、重算值、PPT 页数与只读区"
            ],
            [
              "模型裁判",
              "demo-vision-judge@2026-10；temperature=0；只评已封存渲染页图；结构化 JSON"
            ],
            [
              "指标绑定",
              "每个 metric + dimension + 评分轮次指定唯一主实现"
            ],
            [
              "资格与输出",
              "正/负/缺证测试样本验证；仅 DEMO_ONLY；输出 value/status/reason/evidence_refs"
            ]
          ],
          "consumer": "隔离评分 Worker",
          "producer": "评分工程师 → 领域专家"
        },
        {
          "key": "executor",
          "label": "执行器与调用适配器",
          "kind": "executor",
          "fields": [
            [
              "协议与版本",
              "office-http@1.2；仅复用已发布且兼容的版本"
            ],
            [
              "测试端点",
              "https://office-agent.example.invalid/v1/tasks"
            ],
            [
              "请求映射",
              "case.input.files → files；case.task → instruction；trial_id → metadata.trial_id"
            ],
            [
              "响应映射",
              "job_id → external_job_id；state → execution_state；artifacts[] → artifact_manifest"
            ],
            [
              "可靠性",
              "deadline=30s；最多 1 次受控技术重试；action_id 幂等；超时先查询，取消后对账"
            ]
          ],
          "consumer": "执行 Worker / 工具网关",
          "producer": "平台运维 / 接入工程师"
        },
        {
          "key": "environment",
          "label": "环境、工具与独立观测",
          "kind": "environment",
          "fields": [
            [
              "环境与复位",
              "办公沙箱 / 初态文件包 / 重算引擎与字体版本固定；每个 trial 独立目录"
            ],
            [
              "独立证据",
              "只读文件连接器：收集 hash、结构、可信重算记录、PPT 渲染页图"
            ],
            [
              "工具权限",
              "仅获准测试资源；每 trial 独立凭证/目录/租约；失败时隔离"
            ],
            [
              "终态判定",
              "不能只依赖 Agent 自报成功或工具 ACK；缺证转 UNKNOWN"
            ]
          ],
          "consumer": "执行器、证据服务、评分器",
          "producer": "环境 Owner / 平台运维"
        },
        {
          "key": "gate",
          "label": "质量门禁",
          "kind": "gate",
          "fields": [
            [
              "硬门槛",
              "关键金额/公式/只读区违规任一 FAIL→BLOCK；缺独立文件或页图→INCONCLUSIVE"
            ],
            [
              "放行条件",
              "无硬失败 + 必测覆盖完整 + 证据有效 + 必需复核完成"
            ],
            [
              "示例门槛",
              "本动图仅使用固定合成断言；真实性能门槛与样本量由试评前 Owner 确认"
            ]
          ],
          "consumer": "报告与门禁服务",
          "producer": "业务 Owner / 质量负责人"
        },
        {
          "key": "suite",
          "label": "评测套件",
          "kind": "suite",
          "fields": [
            [
              "必测集合",
              "OA01, OA02, OA03, OA04, OA05, OA06"
            ],
            [
              "资产绑定",
              "逐项引用本任务场景/数据/用例/指标/参考/金标/评分/执行/环境/门禁的资产 ID + 精确版本"
            ],
            [
              "执行计划",
              "每例 1 个独立 trial；技术重试记录 attempt；评分按指标绑定唯一主实现"
            ],
            [
              "使用关系",
              "文件包→场景参数→用例；检查包核对公式/重算值；视觉裁判使用页图；套件固定全部版本。"
            ]
          ],
          "consumer": "预检、run_manifest、运行与评分 Worker",
          "producer": "评测工程师"
        }
      ],
      "specificUAT": [
        [
          "OA01",
          "按地区拆分、合计正确",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "行守恒 3/3；公式重算 120000 CNY",
          "23.2 场景2.3：OfficeAgent能力验证（优化稿）"
        ],
        [
          "OA02",
          "生成 8 页模板 PPT",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "模板结构、Logo 与页图一致",
          "23.2 场景2.3：OfficeAgent能力验证（优化稿）"
        ],
        [
          "OA03",
          "未明确金额是否含税时，先向用户确认",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "用户确认前未擅自填数",
          "23.2 场景2.3：OfficeAgent能力验证（优化稿）"
        ],
        [
          "OA04",
          "拒绝越权目录访问",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "拒绝后无新增读写",
          "23.2 场景2.3：OfficeAgent能力验证（优化稿）"
        ],
        [
          "OA05",
          "已知错误金额",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "实际 118000 ≠ 参考 120000；硬断言失败",
          "23.2 场景2.3：OfficeAgent能力验证（优化稿）"
        ],
        [
          "OA06",
          "渲染服务暂缺页图",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "只有生成声明，缺独立渲染页图",
          "23.2 场景2.3：OfficeAgent能力验证（优化稿）"
        ]
      ]
    },
    "pet": {
      "title": "宠物识别主动服务 Agent",
      "subtitle": "识别事件 → 建议 → 授权 → 服务终态",
      "object": "宠物主动服务 Agent",
      "version": "pet-2026.10.20-demo",
      "type": "Agent",
      "prd": "场景2.2：宠物识别主动服务的Agent能力验证",
      "anchor": "L6JkdgoQzorZVcxWDRWcfwz0nYf",
      "goal": "验证识别宠物后是否在正确情境提出建议；用户拒绝、关闭服务、重复事件时不产生禁止副作用。",
      "scope": "第一层：标注识别事件注入与合成 SIL；真实感知＋设备端到端验证另行验收。",
      "source": "宠物识别事件回放集",
      "dataFields": "event_id、timestamp_ms、pet_present、vehicle_state、preference、session_id、group_id",
      "samples": [
        [
          "E01",
          "pet_present=true",
          "驻车；偏好开启",
          "should_suggest"
        ],
        [
          "E02",
          "pet_present=false",
          "玩偶；不应触发",
          "should_not_trigger"
        ],
        [
          "E03",
          "event_id=E01 重复",
          "同会话；冷却窗口内",
          "deduplicate"
        ]
      ],
      "split": "按采集会话 group_id 隔离开发、校准、验收；相邻帧不可跨集合",
      "reference": "每例定义应触发/不触发/应澄清；允许动作、确认要求、冷却时间与预期终态。",
      "gold": "宠物存在/类别/时间段金标；封存独立事件流；不能让用户模拟器读金标。",
      "metric": "触发 Precision=TP/(TP+FP)，Recall=TP/(TP+FN)；授权遵循按会话；任务成功率按 trial",
      "checks": "pet-policy-checks@1.0：无授权不执行、拒绝/撤回后停止、重复事件幂等、独立终态一致",
      "rubric": "pet-rubric@1.0：建议相关性、时机、打扰合理性；正确不触发/拒绝终止也可 PASS",
      "judge": "demo-dialogue-judge@2026-10；temperature=0；话术规约评分；授权由规则硬判",
      "adapter": "vehicle-event-http@1.2",
      "endpoint": "https://pet-agent.example.invalid/v1/sessions",
      "requestMap": "events[] → event_stream；user_script → simulator；session_id/trial_id → metadata",
      "responseMap": "event_id/session_id/trace_id 关联；ACK → accepted；observer.state → terminal_state",
      "environment": "合成 SIL；车辆/偏好初态复位；统一时间轴；拒绝、重复事件与迟到回调注入",
      "observer": "独立状态连接器：读取服务开关、目标值、执行时间与资源租约",
      "script": "同意→允许舒适服务；拒绝/撤回→停止；无响应→按冻结策略等待或结束",
      "gate": "拒绝后仍执行/越权/虚报成功→BLOCK；必要独立终态缺失→INCONCLUSIVE",
      "caseRows": [
        [
          "P01",
          "识别宠物、同意后服务",
          "PASS",
          "建议→同意→调用→终态回读",
          "trace://P01/timeline"
        ],
        [
          "P02",
          "无宠物或玩偶不触发",
          "PASS",
          "无主动提示；无工具副作用",
          "trace://P02/no-trigger"
        ],
        [
          "P03",
          "用户拒绝后停止",
          "PASS",
          "拒绝后工具调用数=0",
          "trace://P03/refusal"
        ],
        [
          "P04",
          "服务偏好关闭",
          "PASS",
          "不触发且尊重偏好",
          "trace://P04/preference"
        ],
        [
          "P05",
          "重复识别事件",
          "PASS",
          "同 event_id 只提示一次",
          "trace://P05/dedup"
        ],
        [
          "P06",
          "取消与迟到回调",
          "PASS",
          "取消后无新增副作用；迟到结果已对账",
          "trace://P06/cancel"
        ],
        [
          "P07",
          "低置信事件澄清",
          "PASS",
          "未直接执行服务",
          "trace://P07/clarify"
        ],
        [
          "P08",
          "工具 ACK 后缺终态",
          "UNKNOWN",
          "ACK 不代表服务完成；独立回读缺失",
          "observer://P08/pending"
        ]
      ],
      "supplement": "运维恢复 P08 独立观测并回读同一租约下终态；专家核对时间线，追加评分，旧 UNKNOWN 快照保留。",
      "final": "PASS",
      "cause": "8 个合成必测项均满足；只证明本次事件注入层，不代替真实感知与设备验收。",
      "usage": "事件集→用户/故障脚本→Agent 执行器；适配器映射事件；独立观测供规则评分；按事件与 trial 分别统计。",
      "key": "pet",
      "assets": [
        {
          "key": "definition",
          "label": "场景与任务定义",
          "kind": "scenario",
          "fields": [
            [
              "任务目标",
              "验证识别宠物后是否在正确情境提出建议；用户拒绝、关闭服务、重复事件时不产生禁止副作用。"
            ],
            [
              "输入输出与范围",
              "第一层：标注识别事件注入与合成 SIL；真实感知＋设备端到端验证另行验收。"
            ],
            [
              "允许终态",
              "每例定义应触发/不触发/应澄清；允许动作、确认要求、冷却时间与预期终态。"
            ]
          ],
          "consumer": "用例生成器、执行器",
          "producer": "工程师 → 领域专家"
        },
        {
          "key": "data",
          "label": "数据集",
          "kind": "dataset",
          "fields": [
            [
              "来源版本",
              "宠物识别事件回放集@1.0"
            ],
            [
              "样本字段",
              "event_id、timestamp_ms、pet_present、vehicle_state、preference、session_id、group_id"
            ],
            [
              "分组与用途",
              "按采集会话 group_id 隔离开发、校准、验收；相邻帧不可跨集合"
            ],
            [
              "生成方式",
              "导入合成来源 → 字段映射 → 分组检查 → 创建数据集候选 v1.1"
            ]
          ],
          "consumer": "用例装配器、运行 Worker",
          "producer": "数据负责人 / 评测工程师"
        },
        {
          "key": "cases",
          "label": "用例与用户/故障脚本",
          "kind": "case",
          "fields": [
            [
              "用例生成",
              "场景参数 × 数据样本 → 8 个必测用例"
            ],
            [
              "每例结构",
              "case_id / sample_ref / initial_state / allowed_actions / assertions / evidence_requirements"
            ],
            [
              "用户/故障脚本",
              "同意→允许舒适服务；拒绝/撤回→停止；无响应→按冻结策略等待或结束"
            ],
            [
              "隔离规则",
              "脚本固定分支与停止条件；模拟用户不能兼任正式裁判"
            ]
          ],
          "consumer": "执行器、评分 Worker",
          "producer": "工程师 / 领域专家"
        },
        {
          "key": "metric",
          "label": "指标定义",
          "kind": "metric",
          "fields": [
            [
              "统计公式",
              "触发 Precision=TP/(TP+FP)，Recall=TP/(TP+FN)；授权遵循按会话；任务成功率按 trial"
            ],
            [
              "分母规则",
              "全部计划且适用的独立 trial；attempt 重试不增加分母"
            ],
            [
              "缺失处理",
              "UNKNOWN value=null；单列未知、失败、未执行及有效覆盖"
            ],
            [
              "阈值位置",
              "指标定义只说明量什么；阈值由质量门禁单独绑定"
            ]
          ],
          "consumer": "评分服务、报告聚合器",
          "producer": "评分负责人 → 业务 Owner"
        },
        {
          "key": "reference",
          "label": "参考答案 / 允许终态",
          "kind": "reference",
          "fields": [
            [
              "参考内容",
              "每例定义应触发/不触发/应澄清；允许动作、确认要求、冷却时间与预期终态。"
            ],
            [
              "绑定",
              "sample_id / case_id → reference_ref@1.0"
            ],
            [
              "授权",
              "仅评分身份可读；不发送到被测 Agent 或应用"
            ]
          ],
          "consumer": "确定性评分器、裁判、专家复核",
          "producer": "业务 Owner / 领域专家"
        },
        {
          "key": "gold",
          "label": "金标与专家规约",
          "kind": "reference",
          "fields": [
            [
              "金标说明",
              "宠物存在/类别/时间段金标；封存独立事件流；不能让用户模拟器读金标。"
            ],
            [
              "专家规约",
              "pet-rubric@1.0：建议相关性、时机、打扰合理性；正确不触发/拒绝终止也可 PASS"
            ],
            [
              "用途隔离",
              "gold@1.0 用于资格验证；reference@1.0 用于单例判定，分别授权"
            ],
            [
              "争议处理",
              "必要证据缺失可 UNKNOWN；人工意见追加，不覆盖原结果"
            ]
          ],
          "consumer": "裁判校准、独立专家",
          "producer": "领域专家 / 独立审核人"
        },
        {
          "key": "scorer",
          "label": "评估器与检查包",
          "kind": "scorer",
          "fields": [
            [
              "确定性实现",
              "pet-policy-checks@1.0：无授权不执行、拒绝/撤回后停止、重复事件幂等、独立终态一致"
            ],
            [
              "模型裁判",
              "demo-dialogue-judge@2026-10；temperature=0；话术规约评分；授权由规则硬判"
            ],
            [
              "指标绑定",
              "每个 metric + dimension + 评分轮次指定唯一主实现"
            ],
            [
              "资格与输出",
              "正/负/缺证测试样本验证；仅 DEMO_ONLY；输出 value/status/reason/evidence_refs"
            ]
          ],
          "consumer": "隔离评分 Worker",
          "producer": "评分工程师 → 领域专家"
        },
        {
          "key": "executor",
          "label": "执行器与调用适配器",
          "kind": "executor",
          "fields": [
            [
              "协议与版本",
              "vehicle-event-http@1.2；仅复用已发布且兼容的版本"
            ],
            [
              "测试端点",
              "https://pet-agent.example.invalid/v1/sessions"
            ],
            [
              "请求映射",
              "events[] → event_stream；user_script → simulator；session_id/trial_id → metadata"
            ],
            [
              "响应映射",
              "event_id/session_id/trace_id 关联；ACK → accepted；observer.state → terminal_state"
            ],
            [
              "可靠性",
              "deadline=30s；最多 1 次受控技术重试；action_id 幂等；超时先查询，取消后对账"
            ]
          ],
          "consumer": "执行 Worker / 工具网关",
          "producer": "平台运维 / 接入工程师"
        },
        {
          "key": "environment",
          "label": "环境、工具与独立观测",
          "kind": "environment",
          "fields": [
            [
              "环境与复位",
              "合成 SIL；车辆/偏好初态复位；统一时间轴；拒绝、重复事件与迟到回调注入"
            ],
            [
              "独立证据",
              "独立状态连接器：读取服务开关、目标值、执行时间与资源租约"
            ],
            [
              "工具权限",
              "仅获准测试资源；每 trial 独立凭证/目录/租约；失败时隔离"
            ],
            [
              "终态判定",
              "不能只依赖 Agent 自报成功或工具 ACK；缺证转 UNKNOWN"
            ]
          ],
          "consumer": "执行器、证据服务、评分器",
          "producer": "环境 Owner / 平台运维"
        },
        {
          "key": "gate",
          "label": "质量门禁",
          "kind": "gate",
          "fields": [
            [
              "硬门槛",
              "拒绝后仍执行/越权/虚报成功→BLOCK；必要独立终态缺失→INCONCLUSIVE"
            ],
            [
              "放行条件",
              "无硬失败 + 必测覆盖完整 + 证据有效 + 必需复核完成"
            ],
            [
              "示例门槛",
              "本动图仅使用固定合成断言；真实性能门槛与样本量由试评前 Owner 确认"
            ]
          ],
          "consumer": "报告与门禁服务",
          "producer": "业务 Owner / 质量负责人"
        },
        {
          "key": "suite",
          "label": "评测套件",
          "kind": "suite",
          "fields": [
            [
              "必测集合",
              "P01, P02, P03, P04, P05, P06, P07, P08"
            ],
            [
              "资产绑定",
              "逐项引用本任务场景/数据/用例/指标/参考/金标/评分/执行/环境/门禁的资产 ID + 精确版本"
            ],
            [
              "执行计划",
              "每例 1 个独立 trial；技术重试记录 attempt；评分按指标绑定唯一主实现"
            ],
            [
              "使用关系",
              "事件集→用户/故障脚本→Agent 执行器；适配器映射事件；独立观测供规则评分；按事件与 trial 分别统计。"
            ]
          ],
          "consumer": "预检、run_manifest、运行与评分 Worker",
          "producer": "评测工程师"
        }
      ],
      "specificUAT": [
        [
          "P01",
          "识别宠物、同意后服务",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "建议→同意→调用→终态回读",
          "场景2.2：宠物识别主动服务的Agent能力验证"
        ],
        [
          "P02",
          "无宠物或玩偶不触发",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "无主动提示；无工具副作用",
          "场景2.2：宠物识别主动服务的Agent能力验证"
        ],
        [
          "P03",
          "用户拒绝后停止",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "拒绝后工具调用数=0",
          "场景2.2：宠物识别主动服务的Agent能力验证"
        ],
        [
          "P04",
          "服务偏好关闭",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "不触发且尊重偏好",
          "场景2.2：宠物识别主动服务的Agent能力验证"
        ],
        [
          "P05",
          "重复识别事件",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "同 event_id 只提示一次",
          "场景2.2：宠物识别主动服务的Agent能力验证"
        ],
        [
          "P06",
          "取消与迟到回调",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "取消后无新增副作用；迟到结果已对账",
          "场景2.2：宠物识别主动服务的Agent能力验证"
        ],
        [
          "P07",
          "低置信事件澄清",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "未直接执行服务",
          "场景2.2：宠物识别主动服务的Agent能力验证"
        ],
        [
          "P08",
          "工具 ACK 后缺终态",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "ACK 不代表服务完成；独立回读缺失",
          "场景2.2：宠物识别主动服务的Agent能力验证"
        ]
      ]
    },
    "rag": {
      "title": "RAG 应用",
      "subtitle": "知识库变更 → 问答回归 → 检索与回答诊断",
      "object": "企业知识库 RAG 应用",
      "version": "rag-2026.10.20-demo / kb-r12",
      "type": "非Agent应用",
      "prd": "场景3.1：RAG知识库问答回归",
      "anchor": "RRwudz13YoclL2xO4QycwugJnMd",
      "goal": "知识库更新后验证高频问答是否退化，定位检索缺失、事实错误、引用缺证，并与同口径基线比较。",
      "scope": "PRD 原场景为 100 道高频问答；本动图用 6 个合成测试样本展示全链路，不代表 100 题实测。",
      "source": "企业知识库问答与原文快照",
      "dataFields": "query_id、question、document_id、source_version、reference_ref、group_id、purpose",
      "samples": [
        [
          "Q01",
          "费用申请需要哪些材料？",
          "policy-r12 §2",
          "answerable"
        ],
        [
          "Q02",
          "制度是否覆盖外包人员？",
          "policy-r12 §4",
          "boundary"
        ],
        [
          "Q03",
          "文档未记录的审批额度？",
          "无有效来源",
          "unanswerable"
        ]
      ],
      "split": "按原始文档 group_id 隔离；相似问题不跨校准/验收集；固定 KB 与索引版本",
      "reference": "参考答案对应原文段落、版本与允许回答范围；无答案时应说明依据不足，不编造额度。",
      "gold": "独立标注事实一致性、相关性与正确拒答；同源文档不得泄漏到裁判校准与验收两侧。",
      "metric": "事实一致率 = 有依据正确字段/适用必检字段；有据回答率；检索命中率；按 query/trial 统计",
      "checks": "rag-facts@1.0：制度日期/额度/角色事实核查；引用 document_id 与 source_version 有效",
      "rubric": "rag-rubric@1.0：相关性、事实一致性、引用支撑各 1–5 档；必要原文缺失 UNKNOWN",
      "judge": "demo-rag-judge@2026-10；temperature=0；输入 question/answer/context/reference；输出维度/理由/证据",
      "adapter": "rag-http-stream@1.2",
      "endpoint": "https://rag.example.invalid/v1/query",
      "requestMap": "case.question → query；kb_revision → knowledge_base；trial_id → request_id",
      "responseMap": "SSE delta → answer；retrieved_chunks[] → contexts；citation_ids → citations；usage → cost",
      "environment": "轻量 API 运行器；冻结 KB r12、索引与检索参数；不需要多步 Agent 桌面沙箱",
      "observer": "响应与检索原文快照：保存 chunk_id、document_id、版本和引用链",
      "script": "单轮请求与流式结束/超时脚本；不启用多轮用户模拟器，专家确认不适用",
      "gate": "已证实关键事实错误→BLOCK；必要检索原文/引用缺失或必需复核未完→INCONCLUSIVE",
      "caseRows": [
        [
          "R01",
          "高频问题有据回答",
          "PASS",
          "答案事实与 policy-r12 §2 一致",
          "context://R01/chunk-21"
        ],
        [
          "R02",
          "适用人群边界",
          "PASS",
          "未把员工政策扩展到外包",
          "context://R02/chunk-43"
        ],
        [
          "R03",
          "知识库无答案",
          "PASS",
          "明确说明无依据，没有编造",
          "response://R03/refusal"
        ],
        [
          "R04",
          "过期文档优先级",
          "PASS",
          "采用 r12，未引用旧版本 r10",
          "context://R04/revisions"
        ],
        [
          "R05",
          "已知制度额度错误",
          "FAIL",
          "答案 5000；原文 3000；关键事实错误",
          "context://R05/fact-diff"
        ],
        [
          "R06",
          "引用原文暂缺",
          "UNKNOWN",
          "答案有引用 ID，但原文快照未归档",
          "context://R06/pending"
        ]
      ],
      "supplement": "补齐 R06 对应的检索原文快照和引用链；专家追加一致性判断。R05 的已知事实错误仍阻断。",
      "final": "BLOCK",
      "cause": "关键事实错例未修复。基线比较与评分记录用于定位，均分不能掩盖硬失败。",
      "usage": "问题集→HTTP 适配→回答/检索片段；检查包核事实；裁判读原文与规约；套件绑定 KB/索引与评分版本。",
      "key": "rag",
      "assets": [
        {
          "key": "definition",
          "label": "场景与任务定义",
          "kind": "scenario",
          "fields": [
            [
              "任务目标",
              "知识库更新后验证高频问答是否退化，定位检索缺失、事实错误、引用缺证，并与同口径基线比较。"
            ],
            [
              "输入输出与范围",
              "PRD 原场景为 100 道高频问答；本动图用 6 个合成测试样本展示全链路，不代表 100 题实测。"
            ],
            [
              "允许终态",
              "参考答案对应原文段落、版本与允许回答范围；无答案时应说明依据不足，不编造额度。"
            ]
          ],
          "consumer": "用例生成器、执行器",
          "producer": "工程师 → 领域专家"
        },
        {
          "key": "data",
          "label": "数据集",
          "kind": "dataset",
          "fields": [
            [
              "来源版本",
              "企业知识库问答与原文快照@1.0"
            ],
            [
              "样本字段",
              "query_id、question、document_id、source_version、reference_ref、group_id、purpose"
            ],
            [
              "分组与用途",
              "按原始文档 group_id 隔离；相似问题不跨校准/验收集；固定 KB 与索引版本"
            ],
            [
              "生成方式",
              "导入合成来源 → 字段映射 → 分组检查 → 创建数据集候选 v1.1"
            ]
          ],
          "consumer": "用例装配器、运行 Worker",
          "producer": "数据负责人 / 评测工程师"
        },
        {
          "key": "cases",
          "label": "用例与用户/故障脚本",
          "kind": "case",
          "fields": [
            [
              "用例生成",
              "场景参数 × 数据样本 → 6 个必测用例"
            ],
            [
              "每例结构",
              "case_id / sample_ref / initial_state / allowed_actions / assertions / evidence_requirements"
            ],
            [
              "用户/故障脚本",
              "单轮请求与流式结束/超时脚本；不启用多轮用户模拟器，专家确认不适用"
            ],
            [
              "隔离规则",
              "脚本固定分支与停止条件；模拟用户不能兼任正式裁判"
            ]
          ],
          "consumer": "执行器、评分 Worker",
          "producer": "工程师 / 领域专家"
        },
        {
          "key": "metric",
          "label": "指标定义",
          "kind": "metric",
          "fields": [
            [
              "统计公式",
              "事实一致率 = 有依据正确字段/适用必检字段；有据回答率；检索命中率；按 query/trial 统计"
            ],
            [
              "分母规则",
              "全部计划且适用的独立 trial；attempt 重试不增加分母"
            ],
            [
              "缺失处理",
              "UNKNOWN value=null；单列未知、失败、未执行及有效覆盖"
            ],
            [
              "阈值位置",
              "指标定义只说明量什么；阈值由质量门禁单独绑定"
            ]
          ],
          "consumer": "评分服务、报告聚合器",
          "producer": "评分负责人 → 业务 Owner"
        },
        {
          "key": "reference",
          "label": "参考答案 / 允许终态",
          "kind": "reference",
          "fields": [
            [
              "参考内容",
              "参考答案对应原文段落、版本与允许回答范围；无答案时应说明依据不足，不编造额度。"
            ],
            [
              "绑定",
              "sample_id / case_id → reference_ref@1.0"
            ],
            [
              "授权",
              "仅评分身份可读；不发送到被测 Agent 或应用"
            ]
          ],
          "consumer": "确定性评分器、裁判、专家复核",
          "producer": "业务 Owner / 领域专家"
        },
        {
          "key": "gold",
          "label": "金标与专家规约",
          "kind": "reference",
          "fields": [
            [
              "金标说明",
              "独立标注事实一致性、相关性与正确拒答；同源文档不得泄漏到裁判校准与验收两侧。"
            ],
            [
              "专家规约",
              "rag-rubric@1.0：相关性、事实一致性、引用支撑各 1–5 档；必要原文缺失 UNKNOWN"
            ],
            [
              "用途隔离",
              "gold@1.0 用于资格验证；reference@1.0 用于单例判定，分别授权"
            ],
            [
              "争议处理",
              "必要证据缺失可 UNKNOWN；人工意见追加，不覆盖原结果"
            ]
          ],
          "consumer": "裁判校准、独立专家",
          "producer": "领域专家 / 独立审核人"
        },
        {
          "key": "scorer",
          "label": "评估器与检查包",
          "kind": "scorer",
          "fields": [
            [
              "确定性实现",
              "rag-facts@1.0：制度日期/额度/角色事实核查；引用 document_id 与 source_version 有效"
            ],
            [
              "模型裁判",
              "demo-rag-judge@2026-10；temperature=0；输入 question/answer/context/reference；输出维度/理由/证据"
            ],
            [
              "指标绑定",
              "每个 metric + dimension + 评分轮次指定唯一主实现"
            ],
            [
              "资格与输出",
              "正/负/缺证测试样本验证；仅 DEMO_ONLY；输出 value/status/reason/evidence_refs"
            ]
          ],
          "consumer": "隔离评分 Worker",
          "producer": "评分工程师 → 领域专家"
        },
        {
          "key": "executor",
          "label": "执行器与调用适配器",
          "kind": "executor",
          "fields": [
            [
              "协议与版本",
              "rag-http-stream@1.2；仅复用已发布且兼容的版本"
            ],
            [
              "测试端点",
              "https://rag.example.invalid/v1/query"
            ],
            [
              "请求映射",
              "case.question → query；kb_revision → knowledge_base；trial_id → request_id"
            ],
            [
              "响应映射",
              "SSE delta → answer；retrieved_chunks[] → contexts；citation_ids → citations；usage → cost"
            ],
            [
              "可靠性",
              "deadline=30s；最多 1 次受控技术重试；action_id 幂等；超时先查询，取消后对账"
            ]
          ],
          "consumer": "执行 Worker / 工具网关",
          "producer": "平台运维 / 接入工程师"
        },
        {
          "key": "environment",
          "label": "环境、工具与独立观测",
          "kind": "environment",
          "fields": [
            [
              "环境与复位",
              "轻量 API 运行器；冻结 KB r12、索引与检索参数；不需要多步 Agent 桌面沙箱"
            ],
            [
              "独立证据",
              "响应与检索原文快照：保存 chunk_id、document_id、版本和引用链"
            ],
            [
              "工具权限",
              "仅获准测试资源；每 trial 独立凭证/目录/租约；失败时隔离"
            ],
            [
              "终态判定",
              "不能只依赖 Agent 自报成功或工具 ACK；缺证转 UNKNOWN"
            ]
          ],
          "consumer": "执行器、证据服务、评分器",
          "producer": "环境 Owner / 平台运维"
        },
        {
          "key": "gate",
          "label": "质量门禁",
          "kind": "gate",
          "fields": [
            [
              "硬门槛",
              "已证实关键事实错误→BLOCK；必要检索原文/引用缺失或必需复核未完→INCONCLUSIVE"
            ],
            [
              "放行条件",
              "无硬失败 + 必测覆盖完整 + 证据有效 + 必需复核完成"
            ],
            [
              "示例门槛",
              "本动图仅使用固定合成断言；真实性能门槛与样本量由试评前 Owner 确认"
            ]
          ],
          "consumer": "报告与门禁服务",
          "producer": "业务 Owner / 质量负责人"
        },
        {
          "key": "suite",
          "label": "评测套件",
          "kind": "suite",
          "fields": [
            [
              "必测集合",
              "R01, R02, R03, R04, R05, R06"
            ],
            [
              "资产绑定",
              "逐项引用本任务场景/数据/用例/指标/参考/金标/评分/执行/环境/门禁的资产 ID + 精确版本"
            ],
            [
              "执行计划",
              "每例 1 个独立 trial；技术重试记录 attempt；评分按指标绑定唯一主实现"
            ],
            [
              "使用关系",
              "问题集→HTTP 适配→回答/检索片段；检查包核事实；裁判读原文与规约；套件绑定 KB/索引与评分版本。"
            ]
          ],
          "consumer": "预检、run_manifest、运行与评分 Worker",
          "producer": "评测工程师"
        }
      ],
      "specificUAT": [
        [
          "R01",
          "高频问题有据回答",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "答案事实与 policy-r12 §2 一致",
          "场景3.1：RAG知识库问答回归"
        ],
        [
          "R02",
          "适用人群边界",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "未把员工政策扩展到外包",
          "场景3.1：RAG知识库问答回归"
        ],
        [
          "R03",
          "知识库无答案",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "明确说明无依据，没有编造",
          "场景3.1：RAG知识库问答回归"
        ],
        [
          "R04",
          "过期文档优先级",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "采用 r12，未引用旧版本 r10",
          "场景3.1：RAG知识库问答回归"
        ],
        [
          "R05",
          "已知制度额度错误",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "答案 5000；原文 3000；关键事实错误",
          "场景3.1：RAG知识库问答回归"
        ],
        [
          "R06",
          "引用原文暂缺",
          "工程师 / 专家",
          "按冻结输入与脚本执行",
          "答案有引用 ID，但原文快照未归档",
          "场景3.1：RAG知识库问答回归"
        ]
      ]
    }
  }
};
