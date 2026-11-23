'use strict';
const AssetDefinitions=[
  {
    "key": "dataset",
    "label": "数据集",
    "role": "评测负责人",
    "material": "PDF与问题表、媒体与标签、状态事件表；每行边界清楚，文件可定位",
    "fields": [],
    "consumer": "执行器读取评测输入；报告读取样本标签",
    "check": "单条与导入同规则；来源查重、类型与文件引用检查",
    "special": "dataset",
    "kind": "dataset",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "dataset_spec",
    "english_name": "Dataset"
  },
  {
    "key": "reference",
    "label": "独立参考",
    "role": "业务负责人、评测负责人",
    "material": "参考答案、原文位置、识别真值或预期动作；与样本一一对应",
    "fields": [
      {
        "key": "dataset_version_id",
        "label": "关联数据集版本",
        "type": "ref",
        "required": true,
        "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
        "example": null,
        "ref_kinds": [
          "dataset"
        ]
      },
      {
        "key": "reference_kind",
        "label": "参考内容类型",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "answer",
        "options": [
          [
            "answer",
            "答案"
          ],
          [
            "annotation",
            "识别标注"
          ],
          [
            "facts",
            "事实依据"
          ],
          [
            "end_state",
            "预期终态"
          ],
          [
            "judge_gold",
            "裁判验证金标"
          ]
        ]
      },
      {
        "key": "expert_provenance",
        "label": "参考出处与确认依据",
        "type": "text",
        "required": true,
        "hint": "填写文件及页码、需求条款或专家确认记录",
        "example": "设备供电说明.pdf 第1页参数表"
      },
      {
        "key": "disclosure",
        "label": "披露状态",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "PUBLIC",
        "options": [
          [
            "PUBLIC",
            "当前评测成员可见"
          ],
          [
            "SEALED",
            "封存"
          ],
          [
            "DISCLOSED",
            "已披露"
          ]
        ]
      },
      {
        "key": "use_partition",
        "label": "使用分区",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "development",
        "options": [
          [
            "development",
            "评测开发"
          ],
          [
            "qualification",
            "独立资格验证"
          ]
        ]
      },
      {
        "key": "records",
        "label": "逐样本参考",
        "type": "array",
        "required": true,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "sample_id",
            "label": "关联样本",
            "type": "sample_ref",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "expected",
            "label": "参考内容",
            "type": "json",
            "required": true,
            "hint": "配置值：填写本资产实际使用的值，不填写字段类型定义。按所选数据集的参考字段定义填写",
            "example": {}
          }
        ]
      },
      {
        "key": "approval_record_ref",
        "label": "金标审核与锁定记录",
        "type": "text",
        "required": false,
        "hint": "选择裁判验证金标时必填；关联人工评测模块的独立审核与锁定结果",
        "example": null
      }
    ],
    "consumer": "评分器按数据版本＋样本编号读取；人评核对出处",
    "check": "样本存在、无重复、参考字段与评分依赖一致",
    "special": "reference",
    "kind": "reference",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "reference_spec",
    "english_name": "Reference / Reference Output"
  },
  {
    "key": "scenario",
    "label": "场景模板",
    "role": "评测负责人",
    "material": "可复用的前置条件、可变参数、步骤与检查点",
    "fields": [
      {
        "key": "objective",
        "label": "评测目标",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "验证用户拒绝后不执行车控"
      },
      {
        "key": "task_type",
        "label": "适用任务类型",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "agent.proactive_service"
      },
      {
        "key": "parameter_schema",
        "label": "可变参数定义",
        "type": "json",
        "required": true,
        "hint": "结构定义：填写字段标识、显示名、类型、必填条件及子字段。声明参数名、类型、允许值；实例化时逐项填写",
        "example": {
          "decision": {
            "type": "string",
            "enum": [
              "confirm",
              "reject"
            ]
          }
        }
      },
      {
        "key": "preconditions",
        "label": "公共前提",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "功能开关打开"
        ],
        "item_type": "text"
      },
      {
        "key": "sequence_template",
        "label": "步骤模板",
        "type": "array",
        "required": true,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "step_id",
            "label": "步骤编号",
            "type": "text",
            "required": true,
            "hint": "",
            "example": "s1"
          },
          {
            "key": "action",
            "label": "操作名称",
            "type": "text",
            "required": true,
            "hint": "",
            "example": "等待推荐卡片"
          },
          {
            "key": "input_path",
            "label": "参数来源",
            "type": "text",
            "required": false,
            "hint": "",
            "example": "inputs.events"
          },
          {
            "key": "timeout_ms",
            "label": "步骤时限（ms）",
            "type": "integer",
            "required": true,
            "hint": "",
            "example": 10000,
            "min": 1
          }
        ]
      },
      {
        "key": "coverage_tags",
        "label": "覆盖分支",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "确认",
          "拒绝"
        ],
        "item_type": "text"
      },
      {
        "key": "risk_constraints",
        "label": "不可覆盖的约束",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "未确认不执行车控"
        ],
        "item_type": "text"
      }
    ],
    "consumer": "实例化生成用例；保留模板版本与具体参数",
    "check": "参数合法、步骤编号唯一、有时限",
    "kind": "scenario",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "scenario_spec",
    "english_name": "Scenario Template"
  },
  {
    "key": "case",
    "label": "用例",
    "role": "评测负责人",
    "material": "已有Excel／飞书表格中的用例，或新建目标、输入与预期；按需关联自动化",
    "fields": [
      {
        "key": "execution_mode",
        "label": "执行方式",
        "type": "select",
        "required": false,
        "example": "manual",
        "hint": "",
        "options": [
          [
            "manual",
            "人工执行"
          ],
          [
            "platform",
            "平台执行"
          ],
          [
            "external",
            "外部派工回传"
          ]
        ]
      },
      {
        "key": "object_type",
        "label": "适用对象类型",
        "type": "select",
        "required": false,
        "example": "agent",
        "hint": "",
        "options": [
          [
            "model",
            "模型"
          ],
          [
            "application",
            "非 Agent 应用"
          ],
          [
            "agent",
            "Agent"
          ]
        ]
      },
      {
        "key": "case_elements",
        "label": "本例需要检查的内容",
        "type": "array",
        "required": false,
        "example": [],
        "hint": "",
        "item_type": "text"
      },
      {
        "key": "source_namespace",
        "label": "来源范围",
        "type": "text",
        "required": false,
        "example": "",
        "hint": ""
      },
      {
        "key": "source_case_id",
        "label": "来源用例编号",
        "type": "text",
        "required": false,
        "example": "",
        "hint": ""
      },
      {
        "key": "manual_steps",
        "label": "业务操作步骤",
        "type": "array",
        "required": false,
        "example": [],
        "hint": "",
        "children": [
          {
            "key": "step_id",
            "label": "步骤编号",
            "type": "text",
            "required": false,
            "example": "",
            "hint": ""
          },
          {
            "key": "action_text",
            "label": "操作说明",
            "type": "text",
            "required": false,
            "example": "",
            "hint": ""
          }
        ]
      },
      {
        "key": "automation",
        "label": "已关联自动化",
        "type": "json",
        "required": false,
        "example": {},
        "hint": ""
      },
      {
        "key": "source_snapshot",
        "label": "原表格快照",
        "type": "json",
        "required": false,
        "example": {},
        "hint": ""
      },
      {
        "key": "source_rows",
        "label": "原始行号",
        "type": "array",
        "required": false,
        "example": [],
        "hint": "",
        "item_type": "integer"
      },
      {
        "key": "priority",
        "label": "优先级",
        "type": "text",
        "required": false,
        "example": "",
        "hint": ""
      },
      {
        "key": "tags",
        "label": "用例标签",
        "type": "array",
        "required": false,
        "example": [],
        "hint": "",
        "item_type": "text"
      },
      {
        "key": "scenario_version_id",
        "label": "来源模板",
        "type": "ref",
        "required": false,
        "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
        "example": null,
        "ref_kinds": [
          "scenario"
        ]
      },
      {
        "key": "sample_refs",
        "label": "使用样本",
        "type": "array",
        "required": false,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "dataset_version_id",
            "label": "数据版本",
            "type": "ref",
            "required": true,
            "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
            "example": null,
            "ref_kinds": [
              "dataset"
            ]
          },
          {
            "key": "sample_id",
            "label": "样本编号",
            "type": "sample_ref",
            "required": true,
            "hint": "从选定数据集复制或选择系统样本编号；不填行号",
            "example": null
          }
        ]
      },
      {
        "key": "parameters",
        "label": "本例参数",
        "type": "json",
        "required": false,
        "hint": "配置值：填写本资产实际使用的值，不填写字段类型定义。独立用例可直接填写；模板用例按模板定义检查",
        "example": {}
      },
      {
        "key": "objective",
        "label": "本例目标",
        "type": "text",
        "required": true,
        "hint": "",
        "example": ""
      },
      {
        "key": "preconditions",
        "label": "执行前检查",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [],
        "item_type": "text"
      },
      {
        "key": "steps",
        "label": "自动执行操作（已有执行器操作时选择）",
        "type": "array",
        "required": false,
        "hint": "与关联现有自动化入口二选一；业务文字步骤单独保存",
        "example": [],
        "children": [
          {
            "key": "step_id",
            "label": "步骤编号",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "action",
            "label": "操作名称",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "input_path",
            "label": "输入来源",
            "type": "text",
            "required": false,
            "hint": "",
            "example": null
          },
          {
            "key": "timeout_ms",
            "label": "步骤时限（ms）",
            "type": "integer",
            "required": true,
            "hint": "",
            "example": null,
            "min": 1
          },
          {
            "key": "operation_id",
            "label": "已登记操作",
            "type": "text",
            "required": false,
            "hint": "选择执行器操作目录后带出，不以自由文本授予执行能力",
            "example": null
          }
        ]
      },
      {
        "key": "metric_versions",
        "label": "需要检查的指标",
        "type": "array",
        "required": false,
        "hint": "可以在任务中统一选择；自动评分前必须确定权威指标与评分器",
        "example": [],
        "item_type": "ref",
        "ref_kinds": [
          "metric"
        ]
      },
      {
        "key": "reference_version_id",
        "label": "使用参考",
        "type": "ref",
        "required": false,
        "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
        "example": null,
        "ref_kinds": [
          "reference"
        ]
      },
      {
        "key": "script_version_id",
        "label": "模拟用户／故障脚本",
        "type": "ref",
        "required": false,
        "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
        "example": null,
        "ref_kinds": [
          "simulator",
          "fault"
        ]
      },
      {
        "key": "forbidden_effects",
        "label": "禁止结果",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [],
        "item_type": "text"
      },
      {
        "key": "timeout_ms",
        "label": "用例总时限（ms）",
        "type": "integer",
        "required": false,
        "hint": "",
        "example": 10000,
        "min": 1
      },
      {
        "key": "cleanup",
        "label": "结束后的恢复",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [],
        "item_type": "text"
      },
      {
        "key": "inline_inputs",
        "label": "用例自带输入",
        "type": "json",
        "required": false,
        "hint": "",
        "example": {}
      },
      {
        "key": "inline_expected",
        "label": "用例自带参考",
        "type": "json",
        "required": false,
        "hint": "",
        "example": {}
      },
      {
        "key": "interaction_stop",
        "label": "交互停止条件",
        "type": "text",
        "required": false,
        "example": "",
        "hint": "按本例实际启用要素检查"
      },
      {
        "key": "initial_state",
        "label": "初始状态",
        "type": "text",
        "required": false,
        "example": "",
        "hint": "按本例实际启用要素检查"
      },
      {
        "key": "state_observation",
        "label": "状态观测方式",
        "type": "text",
        "required": false,
        "example": "",
        "hint": "按本例实际启用要素检查"
      }
    ],
    "consumer": "人工执行读取业务步骤；执行器读取自动化入口与输入；评分服务读取独立参考与实际记录",
    "check": "分别检查业务内容完整性和执行准备；手工用例无需自动化脚本",
    "kind": "case",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "case_spec",
    "english_name": "Test Case"
  },
  {
    "key": "simulator",
    "label": "用户模拟器",
    "role": "平台研发",
    "material": "收到什么事件后回复什么、何时停止的脚本",
    "fields": [
      {
        "key": "script_type",
        "label": "模拟方式",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "deterministic_user",
        "options": [
          [
            "deterministic_user",
            "固定规则"
          ],
          [
            "model_user",
            "模型模拟"
          ]
        ]
      },
      {
        "key": "implementation_ref",
        "label": "程序或镜像固定版本",
        "type": "implementation",
        "required": true,
        "hint": "能力维护人员从实现登记目录选择；回显固定版本，系统生成引用",
        "example": null
      },
      {
        "key": "states",
        "label": "交互规则",
        "type": "array",
        "required": true,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "id",
            "label": "规则编号",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "on_event",
            "label": "收到的事件",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "response",
            "label": "用户回复",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "next",
            "label": "下一状态",
            "type": "text",
            "required": false,
            "hint": "",
            "example": null
          }
        ]
      },
      {
        "key": "allowed_inputs",
        "label": "允许读取的上下文",
        "type": "json",
        "required": true,
        "hint": "结构定义：填写字段标识、显示名、类型、必填条件及子字段。从接口协议导入。每项说明字段标识、中文名、类型、必填及嵌套字段；与运行输入逐项检查。",
        "example": [
          {
            "key": "query",
            "label": "问题",
            "type": "text",
            "role": "input",
            "required": true
          }
        ]
      },
      {
        "key": "max_turns",
        "label": "最大交互轮数",
        "type": "integer",
        "required": true,
        "hint": "",
        "example": 3,
        "min": 1
      },
      {
        "key": "timeout_ms",
        "label": "最长运行时间（ms）",
        "type": "integer",
        "required": true,
        "hint": "",
        "example": 10000,
        "min": 1
      },
      {
        "key": "model_config",
        "label": "模型模拟配置",
        "type": "json",
        "required": false,
        "hint": "配置值：填写本资产实际使用的值，不填写字段类型定义。模型模拟时填写固定模型、提示和采样参数；固定规则可留空",
        "example": {}
      }
    ],
    "consumer": "执行器把实际事件交给模拟用户，取得确认／拒绝等交互；不提供参考内容",
    "check": "规则能命中并停止；模型模拟配置完整；输入只含执行上下文",
    "kind": "simulator",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "script_spec",
    "english_name": "User Simulator"
  },
  {
    "key": "fault",
    "label": "故障脚本",
    "role": "平台研发",
    "material": "注入位置、触发条件、异常内容、恢复与核查脚本",
    "fields": [
      {
        "key": "implementation_ref",
        "label": "程序或镜像固定版本",
        "type": "implementation",
        "required": true,
        "hint": "能力维护人员从实现登记目录选择；回显固定版本，系统生成引用",
        "example": null
      },
      {
        "key": "fault_point",
        "label": "注入位置",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "工具返回"
      },
      {
        "key": "trigger",
        "label": "触发条件",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "第一次文档下载请求"
      },
      {
        "key": "injection",
        "label": "注入内容",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "返回受控超时"
      },
      {
        "key": "duration_ms",
        "label": "最长生效时间（ms）",
        "type": "integer",
        "required": true,
        "hint": "",
        "example": 3000,
        "min": 1
      },
      {
        "key": "recovery_recipe",
        "label": "恢复操作",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "撤销故障规则并探测下载接口"
      },
      {
        "key": "recovery_check",
        "label": "恢复成功依据",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "健康探测返回成功并无残留规则"
      }
    ],
    "consumer": "执行器在指定位置注入并采集生效记录；结束时恢复",
    "check": "明确注入位置、恢复方法及恢复失败处理",
    "kind": "fault",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "script_spec",
    "english_name": "Fault Injection Script"
  },
  {
    "key": "metric",
    "label": "指标",
    "role": "评分能力负责人",
    "material": "业务指标口径：衡量什么、怎么算、统计哪些样本",
    "fields": [
      {
        "key": "meaning",
        "label": "业务含义",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "有效样本中，回答事实与参考一致的比例"
      },
      {
        "key": "formula",
        "label": "计算公式",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "事实一致的有效样本数 / 有效样本数"
      },
      {
        "key": "unit",
        "label": "单位",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "ratio",
        "options": [
          [
            "ratio",
            "比例（0～1）"
          ],
          [
            "count",
            "次数"
          ],
          [
            "ms",
            "毫秒"
          ],
          [
            "score",
            "分值"
          ]
        ]
      },
      {
        "key": "better",
        "label": "优劣方向",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "HIGH",
        "options": [
          [
            "HIGH",
            "越高越好"
          ],
          [
            "LOW",
            "越低越好"
          ],
          [
            "EXACT",
            "符合指定值"
          ]
        ]
      },
      {
        "key": "numerator_rule",
        "label": "分子纳入条件",
        "type": "text",
        "required": false,
        "hint": "汇总方式为比例时必填；平均值或求和填写数值与纳入范围",
        "example": "回答事实与参考一致"
      },
      {
        "key": "denominator_rule",
        "label": "分母纳入条件",
        "type": "text",
        "required": false,
        "hint": "汇总方式为比例时必填；平均值或求和填写数值与纳入范围",
        "example": "已执行且回答和参考齐全的样本"
      },
      {
        "key": "aggregation",
        "label": "汇总方式",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "ratio",
        "options": [
          [
            "mean",
            "有效值平均"
          ],
          [
            "sum",
            "有效值求和"
          ],
          [
            "ratio",
            "按分子分母求比例"
          ]
        ]
      },
      {
        "key": "missing_policy",
        "label": "缺失处理",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "UNKNOWN",
        "options": [
          [
            "UNKNOWN",
            "暂无法判定"
          ],
          [
            "EXCLUDE_WITH_REASON",
            "说明原因后排除"
          ]
        ]
      },
      {
        "key": "required_evidence",
        "label": "必需判定依据",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "实际回答"
        ],
        "item_type": "text"
      },
      {
        "key": "independent_key",
        "label": "独立统计单位",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "sample_id",
        "options": [
          [
            "sample_id",
            "每个样本一次"
          ],
          [
            "group_key",
            "每个关联分组一次"
          ]
        ]
      }
    ],
    "consumer": "评分器输出此指标值；报告按本口径汇总，门禁单独引用阈值",
    "check": "公式、单位、分母、方向明确；这里不配置通过阈值",
    "kind": "metric",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "metric_spec",
    "english_name": "Metric"
  },
  {
    "key": "scorer",
    "label": "评分器",
    "role": "评分能力负责人",
    "material": "可运行的评分程序、入出参样例、对应指标及验证材料",
    "fields": [
      {
        "key": "method",
        "label": "评分方式",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "deterministic",
        "options": [
          [
            "deterministic",
            "确定性规则"
          ],
          [
            "model_judge",
            "模型裁判"
          ],
          [
            "native",
            "外部原生评分"
          ]
        ]
      },
      {
        "key": "implementation_ref",
        "label": "程序或镜像固定版本",
        "type": "implementation",
        "required": true,
        "hint": "能力维护人员从实现登记目录选择；回显固定版本，系统生成引用",
        "example": null
      },
      {
        "key": "metric_versions",
        "label": "对应指标版本",
        "type": "array",
        "required": true,
        "hint": "逐项选择已发布固定版本；至少选择一项",
        "example": [],
        "item_type": "ref",
        "ref_kinds": [
          "metric"
        ]
      },
      {
        "key": "input_mapping",
        "label": "评分输入映射（实际结果、独立参考与上下文 → 评分输入）",
        "type": "mapping",
        "required": true,
        "hint": "选择来源字段、转换方式和目标参数；来源范围：actual,expected,inputs,metadata",
        "example": [],
        "roots": [
          "actual",
          "expected",
          "inputs",
          "metadata"
        ]
      },
      {
        "key": "checks",
        "label": "规则评分检查",
        "type": "array",
        "required": false,
        "hint": "确定性评分必填；模型裁判和外部原生评分由对应实现输出指标",
        "example": [],
        "children": [
          {
            "key": "metric_version_id",
            "label": "输出指标",
            "type": "ref",
            "required": true,
            "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
            "example": null,
            "ref_kinds": [
              "metric"
            ]
          },
          {
            "key": "actual_path",
            "label": "实际值路径",
            "type": "text",
            "required": true,
            "hint": "",
            "example": "answer"
          },
          {
            "key": "expected_path",
            "label": "参考值路径",
            "type": "text",
            "required": false,
            "hint": "相等、容差、窗口等比较时必填；直接测量数值时留空",
            "example": "gold_answer"
          },
          {
            "key": "comparison",
            "label": "比较方式",
            "type": "select",
            "required": true,
            "hint": "",
            "example": "eq",
            "options": [
              [
                "eq",
                "相等"
              ],
              [
                "approx",
                "数值容差"
              ],
              [
                "gte",
                "实际不小于参考"
              ],
              [
                "coverage",
                "观察窗口覆盖"
              ],
              [
                "value",
                "读取实际数值"
              ]
            ]
          },
          {
            "key": "tolerance",
            "label": "比较容差",
            "type": "number",
            "required": true,
            "hint": "",
            "example": 0,
            "min": 0
          }
        ]
      },
      {
        "key": "output_schema",
        "label": "评分输出定义",
        "type": "json",
        "required": true,
        "hint": "结构定义：填写字段标识、显示名、类型、必填条件及子字段。从接口协议导入。每项说明字段标识、中文名、类型、必填及嵌套字段；与运行输入逐项检查。",
        "example": [
          {
            "key": "value",
            "label": "指标值",
            "type": "number",
            "role": "input",
            "required": true
          }
        ]
      },
      {
        "key": "judge_config",
        "label": "模型裁判配置",
        "type": "json",
        "required": false,
        "hint": "配置值：填写本资产实际使用的值，不填写字段类型定义。模型裁判需固定模型、提示、规约版本与采样参数；不以模型名代替固定版本",
        "example": {}
      },
      {
        "key": "rubric_version_id",
        "label": "评分规约",
        "type": "ref",
        "required": false,
        "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
        "example": null,
        "ref_kinds": [
          "rubric"
        ]
      },
      {
        "key": "timeout_ms",
        "label": "评分超时（ms）",
        "type": "integer",
        "required": true,
        "hint": "",
        "example": 30000,
        "min": 1
      },
      {
        "key": "qualification_policy_ref",
        "label": "资格验证依据",
        "type": "text",
        "required": true,
        "hint": "选择或填写资格策略记录；正式使用核对独立验证结果",
        "example": "评分验证：正例、反例、缺参考、缺实际返回"
      }
    ],
    "consumer": "自动评分服务读取固定实现及评分输入映射，输出值、有效性与判定依据；模型裁判还读取规约",
    "check": "输出指标均已声明；输入来源合法；缺失判定依据不填0",
    "kind": "scorer",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "scorer_spec",
    "english_name": "Scorer / Evaluator"
  },
  {
    "key": "rubric",
    "label": "评分规约",
    "role": "业务负责人、评分能力负责人",
    "material": "评分维度、分档说明、举例、复核与分歧处理规则",
    "fields": [
      {
        "key": "criteria",
        "label": "评分维度",
        "type": "array",
        "required": true,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "id",
            "label": "维度编号",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "label",
            "label": "维度名称",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "definition",
            "label": "判定说明",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "levels",
            "label": "分档及例子",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "required_evidence",
            "label": "需要查看的判定依据",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          }
        ]
      },
      {
        "key": "blind_fields",
        "label": "需隐藏的信息",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "对象品牌",
          "旧评分"
        ],
        "item_type": "text"
      },
      {
        "key": "review_policy",
        "label": "复核触发和分派",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "引用无法定位时交领域专家复核"
      },
      {
        "key": "arbitration_rule",
        "label": "意见不一致的处理",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "提交独立专家仲裁并保留原意见"
      },
      {
        "key": "allowed_verdicts",
        "label": "允许意见",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "PASS",
          "FAIL",
          "UNKNOWN"
        ],
        "item_type": "text"
      },
      {
        "key": "qualification_scope",
        "label": "专家领域要求",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "汽车电气设计"
      }
    ],
    "consumer": "人工评测页面生成检查项；模型裁判按固定规约组织评分提示",
    "check": "维度明确、档位有例子、争议处理可执行",
    "kind": "rubric",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "rubric_spec",
    "english_name": "Rubric"
  },
  {
    "key": "executor",
    "label": "执行器",
    "role": "平台研发",
    "material": "可运行程序／镜像，启动、查询、取消、采集及恢复说明",
    "fields": [
      {
        "key": "implementation_ref",
        "label": "程序或镜像固定版本",
        "type": "implementation",
        "required": true,
        "hint": "能力维护人员从实现登记目录选择；回显固定版本，系统生成引用",
        "example": null
      },
      {
        "key": "capabilities",
        "label": "支持的操作",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "文件上传",
          "提交问题",
          "采集回答"
        ],
        "item_type": "text"
      },
      {
        "key": "input_schema",
        "label": "运行输入字段",
        "type": "json",
        "required": true,
        "hint": "结构定义：填写字段标识、显示名、类型、必填条件及子字段。从接口协议导入。每项说明字段标识、中文名、类型、必填及嵌套字段；与运行输入逐项检查。",
        "example": [
          {
            "key": "query",
            "label": "问题",
            "type": "text",
            "role": "input",
            "required": true
          }
        ]
      },
      {
        "key": "output_schema",
        "label": "返回结果字段",
        "type": "json",
        "required": true,
        "hint": "结构定义：填写字段标识、显示名、类型、必填条件及子字段。从接口协议导入。每项说明字段标识、中文名、类型、必填及嵌套字段；与运行输入逐项检查。",
        "example": [
          {
            "key": "query",
            "label": "问题",
            "type": "text",
            "role": "input",
            "required": true
          }
        ]
      },
      {
        "key": "entrypoints",
        "label": "运行入口",
        "type": "array",
        "required": true,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "operation",
            "label": "操作",
            "type": "select",
            "required": true,
            "hint": "",
            "example": "submit",
            "options": [
              [
                "submit",
                "启动"
              ],
              [
                "query",
                "查询"
              ],
              [
                "cancel",
                "取消"
              ],
              [
                "artifacts",
                "取得产物"
              ]
            ]
          },
          {
            "key": "entrypoint",
            "label": "注册的函数或操作名",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          }
        ]
      },
      {
        "key": "adapter_versions",
        "label": "可配合的适配器",
        "type": "array",
        "required": true,
        "hint": "逐项选择已发布固定版本；至少选择一项",
        "example": [],
        "item_type": "ref",
        "ref_kinds": [
          "adapter"
        ]
      },
      {
        "key": "environment_version_id",
        "label": "默认环境模板",
        "type": "ref",
        "required": false,
        "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
        "example": null,
        "ref_kinds": [
          "environment"
        ]
      },
      {
        "key": "cleanup_contract",
        "label": "清理与复位约定",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "删除临时上传文件；查询确认工作目录已清理"
      },
      {
        "key": "timeout_ms",
        "label": "运行超时（ms）",
        "type": "integer",
        "required": true,
        "hint": "",
        "example": 60000,
        "min": 1
      },
      {
        "key": "supported_objects",
        "label": "已验证的对象版本",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "Office演示对象v1"
        ],
        "item_type": "text"
      },
      {
        "key": "operations",
        "label": "已登记可执行操作",
        "type": "array",
        "required": true,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "operation_id",
            "label": "操作标识",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "label",
            "label": "操作名称",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "input_paths",
            "label": "读取的输入路径",
            "type": "array",
            "required": false,
            "hint": "",
            "example": null,
            "item_type": "text"
          },
          {
            "key": "produces",
            "label": "产生的实际记录",
            "type": "array",
            "required": false,
            "hint": "",
            "example": null,
            "item_type": "text"
          }
        ]
      },
      {
        "key": "engine_binding",
        "label": "评测引擎接入（技术配置）",
        "type": "json",
        "required": false,
        "hint": "技术配置维护；普通评测自动沿用所选执行器版本。",
        "example": {
          "engine": "agentcompass",
          "version": "demo-v1"
        }
      }
    ],
    "consumer": "运行服务按固定实现启动执行器；执行器读取任务输入与步骤，调用所选适配器并返回评测记录",
    "check": "接口、动作、所需文件和清理完整；实际能力另有联调记录",
    "kind": "executor",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "executor_spec",
    "english_name": "Executor"
  },
  {
    "key": "adapter",
    "label": "适配器",
    "role": "平台研发",
    "material": "对象接口协议、真实请求／返回／状态样例及鉴权方式",
    "fields": [
      {
        "key": "protocol",
        "label": "调用协议",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "sync_http",
        "options": [
          [
            "sync_http",
            "同步 HTTP"
          ],
          [
            "sse",
            "流式事件"
          ],
          [
            "async_job",
            "异步任务"
          ],
          [
            "browser",
            "网页操作"
          ],
          [
            "device",
            "设备消息"
          ]
        ]
      },
      {
        "key": "implementation_ref",
        "label": "程序或镜像固定版本",
        "type": "implementation",
        "required": true,
        "hint": "能力维护人员从实现登记目录选择；回显固定版本，系统生成引用",
        "example": null
      },
      {
        "key": "request_schema",
        "label": "对象请求字段",
        "type": "json",
        "required": true,
        "hint": "结构定义：填写字段标识、显示名、类型、必填条件及子字段。从接口协议导入。每项说明字段标识、中文名、类型、必填及嵌套字段；与运行输入逐项检查。",
        "example": [
          {
            "key": "query",
            "label": "问题",
            "type": "text",
            "role": "input",
            "required": true
          }
        ]
      },
      {
        "key": "request_mapping",
        "label": "请求映射（评测输入 → 对象请求）",
        "type": "mapping",
        "required": true,
        "hint": "选择来源字段、转换方式和目标参数；来源范围：inputs",
        "example": [],
        "roots": [
          "inputs"
        ]
      },
      {
        "key": "response_mapping",
        "label": "返回映射（对象返回 → 实际结果）",
        "type": "mapping",
        "required": true,
        "hint": "选择来源字段、转换方式和目标参数；来源范围：returned",
        "example": [],
        "roots": [
          "returned"
        ]
      },
      {
        "key": "status_mapping",
        "label": "状态对应",
        "type": "array",
        "required": true,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "source",
            "label": "对象状态",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "target",
            "label": "平台执行状态",
            "type": "select",
            "required": true,
            "hint": "",
            "example": "RUNNING",
            "options": [
              [
                "RUNNING",
                "运行中"
              ],
              [
                "COMPLETED",
                "执行完成"
              ],
              [
                "FAILED",
                "执行故障"
              ],
              [
                "UNKNOWN",
                "状态未明确"
              ]
            ]
          }
        ]
      },
      {
        "key": "credential_profile_ref",
        "label": "测试身份配置",
        "type": "text",
        "required": true,
        "hint": "填写已登记的身份配置名称／引用，不填写密钥",
        "example": "测试身份：Office演示账号"
      },
      {
        "key": "capabilities",
        "label": "接口能力",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "query",
          "cancel"
        ],
        "item_type": "text"
      },
      {
        "key": "contract_test_ref",
        "label": "接口检查记录",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "正常、超时、重复请求检查记录"
      }
    ],
    "consumer": "执行器经适配器调用对象；返回映射生成实际结果，执行状态与质量结论分开",
    "check": "请求不读参考；目标字段无冲突；未知状态保留 UNKNOWN",
    "kind": "adapter",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "adapter_spec",
    "english_name": "Adapter"
  },
  {
    "key": "check",
    "label": "检查包",
    "role": "评分能力负责人",
    "material": "一组可运行检查、对应指标及需要采集的判定依据",
    "fields": [
      {
        "key": "implementation_ref",
        "label": "程序或镜像固定版本",
        "type": "implementation",
        "required": true,
        "hint": "能力维护人员从实现登记目录选择；回显固定版本，系统生成引用",
        "example": null
      },
      {
        "key": "metric_versions",
        "label": "对应指标",
        "type": "array",
        "required": true,
        "hint": "逐项选择已发布固定版本；至少选择一项",
        "example": [],
        "item_type": "ref",
        "ref_kinds": [
          "metric"
        ]
      },
      {
        "key": "scorer_versions",
        "label": "复用评分器",
        "type": "array",
        "required": false,
        "hint": "逐项选择已发布固定版本；无依赖时可留空",
        "example": [],
        "item_type": "ref",
        "ref_kinds": [
          "scorer"
        ]
      },
      {
        "key": "checks",
        "label": "检查项",
        "type": "array",
        "required": true,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "id",
            "label": "检查编号",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "name",
            "label": "检查名称",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "metric_version_id",
            "label": "输出指标",
            "type": "ref",
            "required": true,
            "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
            "example": null,
            "ref_kinds": [
              "metric"
            ]
          },
          {
            "key": "evidence_path",
            "label": "判定依据位置",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "condition",
            "label": "检查条件",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          }
        ]
      },
      {
        "key": "input_mapping",
        "label": "判定依据 → 检查输入",
        "type": "mapping",
        "required": true,
        "hint": "选择来源字段、转换方式和目标参数；来源范围：actual,expected,inputs,metadata",
        "example": [],
        "roots": [
          "actual",
          "expected",
          "inputs",
          "metadata"
        ]
      },
      {
        "key": "failure_policy",
        "label": "检查故障处理",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "检查器异常记为评分故障，指标暂无法判定"
      }
    ],
    "consumer": "评分服务或评测流程运行检查包；结果按指标和判定依据回传",
    "check": "检查项与输出指标匹配，缺判定依据与业务失败分开",
    "kind": "check",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "scorer_spec",
    "english_name": "Check Package"
  },
  {
    "key": "environment",
    "label": "环境模板",
    "role": "平台研发",
    "material": "固定镜像或工程配置、资源需求、初始化／健康／复位脚本",
    "fields": [
      {
        "key": "image_or_config_ref",
        "label": "镜像或工程固定版本",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "demo://office-runtime@1"
      },
      {
        "key": "capabilities",
        "label": "环境能力",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "文件上传",
          "网络调用"
        ],
        "item_type": "text"
      },
      {
        "key": "initialization",
        "label": "初始化操作",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "创建本次任务独立工作目录"
      },
      {
        "key": "reset_and_health",
        "label": "健康与复位检查",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "接口可达；工作目录为空"
      },
      {
        "key": "cpu",
        "label": "CPU核数",
        "type": "integer",
        "required": true,
        "hint": "",
        "example": 2,
        "min": 1
      },
      {
        "key": "memory_mb",
        "label": "内存（MB）",
        "type": "integer",
        "required": true,
        "hint": "",
        "example": 4096,
        "min": 1
      },
      {
        "key": "concurrency",
        "label": "并发上限",
        "type": "integer",
        "required": true,
        "hint": "",
        "example": 1,
        "min": 1
      },
      {
        "key": "network_policy_ref",
        "label": "网络策略版本",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "Office测试域名白名单 v1"
      },
      {
        "key": "external_pool_ref",
        "label": "已有设备池引用",
        "type": "text",
        "required": false,
        "hint": "",
        "example": ""
      }
    ],
    "consumer": "运行前分配实例并校验能力；保存实例和租约到运行记录",
    "check": "固定配置可定位、资源正数、健康与复位可验证",
    "kind": "environment",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "environment_spec",
    "english_name": "Environment Template"
  },
  {
    "key": "tool",
    "label": "工具",
    "role": "平台研发",
    "material": "工具协议、入参、受理回执、查询与副作用说明",
    "fields": [
      {
        "key": "operation",
        "label": "操作名称",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "cabin.read_temperature"
      },
      {
        "key": "request_schema",
        "label": "请求字段",
        "type": "json",
        "required": true,
        "hint": "结构定义：填写字段标识、显示名、类型、必填条件及子字段。从接口协议导入。每项说明字段标识、中文名、类型、必填及嵌套字段；与运行输入逐项检查。",
        "example": [
          {
            "key": "query",
            "label": "问题",
            "type": "text",
            "role": "input",
            "required": true
          }
        ]
      },
      {
        "key": "response_schema",
        "label": "返回字段",
        "type": "json",
        "required": true,
        "hint": "结构定义：填写字段标识、显示名、类型、必填条件及子字段。从接口协议导入。每项说明字段标识、中文名、类型、必填及嵌套字段；与运行输入逐项检查。",
        "example": [
          {
            "key": "query",
            "label": "问题",
            "type": "text",
            "role": "input",
            "required": true
          }
        ]
      },
      {
        "key": "side_effect",
        "label": "操作影响",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "READ",
        "options": [
          [
            "READ",
            "只读"
          ],
          [
            "WRITE",
            "写入"
          ],
          [
            "DEVICE",
            "控制设备"
          ]
        ]
      },
      {
        "key": "idempotency_support",
        "label": "支持幂等",
        "type": "boolean",
        "required": true,
        "hint": "",
        "example": true
      },
      {
        "key": "query_cancel_contract",
        "label": "查询和取消约定",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "按 operation_id 查询实际状态；只读查询无需取消"
      },
      {
        "key": "state_observer_ref",
        "label": "独立状态观测工具",
        "type": "ref",
        "required": false,
        "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
        "example": null,
        "ref_kinds": [
          "tool"
        ]
      },
      {
        "key": "consent_policy_ref",
        "label": "用户确认规则版本",
        "type": "text",
        "required": false,
        "hint": "",
        "example": ""
      }
    ],
    "consumer": "执行器调用工具，保存受理与独立终态；评分读取实际评测记录",
    "check": "写入或设备操作检查观测和授权约定；避免循环依赖",
    "kind": "tool",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "tool_spec",
    "english_name": "Tool"
  },
  {
    "key": "replay",
    "label": "时序回放资产",
    "role": "评测负责人",
    "material": "录制文件、时间基准、事件匹配规则、未匹配处理说明",
    "fields": [
      {
        "key": "recording_ref",
        "label": "录制文件",
        "type": "file",
        "required": true,
        "hint": "上传并选择固定录制文件",
        "example": null
      },
      {
        "key": "time_unit",
        "label": "原时间单位",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "ms",
        "options": [
          [
            "ms",
            "毫秒"
          ],
          [
            "s",
            "秒"
          ]
        ]
      },
      {
        "key": "time_origin",
        "label": "时间起点",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "本次场景开始为0"
      },
      {
        "key": "offset_ms",
        "label": "归一偏移（ms）",
        "type": "integer",
        "required": true,
        "hint": "",
        "example": 0
      },
      {
        "key": "alignment_tolerance_ms",
        "label": "允许对齐误差（ms）",
        "type": "number",
        "required": true,
        "hint": "",
        "example": 20,
        "min": 0
      },
      {
        "key": "event_mapping",
        "label": "录制字段 → 事件输入",
        "type": "mapping",
        "required": true,
        "hint": "选择来源字段、转换方式和目标参数；来源范围：recording",
        "example": [],
        "roots": [
          "recording"
        ]
      },
      {
        "key": "match_rules",
        "label": "请求匹配规则",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "按事件名和时间窗口匹配"
      },
      {
        "key": "unmatched_policy",
        "label": "未匹配处理",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "ERROR",
        "options": [
          [
            "ERROR",
            "报错停止"
          ],
          [
            "PAUSE",
            "暂停核查"
          ]
        ]
      },
      {
        "key": "coverage",
        "label": "录制覆盖范围",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "车门全关到有宠上报的10秒窗口"
      },
      {
        "key": "limitations",
        "label": "可代表的测试范围",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "验证事件后的服务逻辑；识别质量由真实媒体测试验证"
      }
    ],
    "consumer": "执行器按归一时钟回放；结果保存原时间与转换规则",
    "check": "事件时间非负有序，缺帧和超容差显示缺口",
    "kind": "replay",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "replay_spec",
    "english_name": "Replay Asset"
  },
  {
    "key": "suite",
    "label": "评测套件",
    "role": "评测负责人",
    "material": "可复用的完整评测组合及必测覆盖清单",
    "fields": [
      {
        "key": "dataset_versions",
        "label": "数据集版本",
        "type": "array",
        "required": false,
        "hint": "逐项选择已发布固定版本；无依赖时可留空",
        "example": [],
        "item_type": "ref",
        "ref_kinds": [
          "dataset"
        ]
      },
      {
        "key": "case_versions",
        "label": "用例版本",
        "type": "array",
        "required": false,
        "hint": "逐项选择已发布固定版本；无依赖时可留空",
        "example": [],
        "item_type": "ref",
        "ref_kinds": [
          "case"
        ]
      },
      {
        "key": "reference_version_id",
        "label": "配套参考",
        "type": "ref",
        "required": false,
        "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
        "example": null,
        "ref_kinds": [
          "reference"
        ]
      },
      {
        "key": "executor_version_id",
        "label": "主执行器",
        "type": "ref",
        "required": true,
        "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
        "example": null,
        "ref_kinds": [
          "executor"
        ]
      },
      {
        "key": "adapter_version_id",
        "label": "适配器",
        "type": "ref",
        "required": true,
        "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
        "example": null,
        "ref_kinds": [
          "adapter"
        ]
      },
      {
        "key": "environment_version_id",
        "label": "环境模板",
        "type": "ref",
        "required": true,
        "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
        "example": null,
        "ref_kinds": [
          "environment"
        ]
      },
      {
        "key": "metric_versions",
        "label": "指标版本",
        "type": "array",
        "required": true,
        "hint": "逐项选择已发布固定版本；至少选择一项",
        "example": [],
        "item_type": "ref",
        "ref_kinds": [
          "metric"
        ]
      },
      {
        "key": "scorer_versions",
        "label": "评分器版本",
        "type": "array",
        "required": true,
        "hint": "逐项选择已发布固定版本；至少选择一项",
        "example": [],
        "item_type": "ref",
        "ref_kinds": [
          "scorer"
        ]
      },
      {
        "key": "gate_version_id",
        "label": "门禁与统计规则",
        "type": "ref",
        "required": false,
        "hint": "选填；不选门禁与统计规则时只展示指标，不选评测流程模板时使用平台标准流程",
        "example": null,
        "ref_kinds": [
          "gate"
        ]
      },
      {
        "key": "pipeline_version_id",
        "label": "评测流程",
        "type": "ref",
        "required": false,
        "hint": "选填；不选门禁与统计规则时只展示指标，不选评测流程模板时使用平台标准流程",
        "example": null,
        "ref_kinds": [
          "pipeline"
        ]
      },
      {
        "key": "optional_versions",
        "label": "其他依赖",
        "type": "array",
        "required": false,
        "hint": "逐项选择已发布固定版本；无依赖时可留空",
        "example": [],
        "item_type": "ref",
        "ref_kinds": [
          "simulator",
          "fault",
          "tool",
          "replay",
          "rubric",
          "check"
        ]
      },
      {
        "key": "coverage_map",
        "label": "必测项与材料对应",
        "type": "array",
        "required": true,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "required_item",
            "label": "必测项",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "member",
            "label": "用例编号或数据切片",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "metric_version_id",
            "label": "观察指标",
            "type": "ref",
            "required": true,
            "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
            "example": null,
            "ref_kinds": [
              "metric"
            ]
          }
        ]
      },
      {
        "key": "smoke_evidence_ref",
        "label": "试运行记录",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "正例、反例与缺判定依据演示记录"
      }
    ],
    "consumer": "任务一键带入固定组合；用户明确修改后建立新方案版本",
    "check": "至少一个数据集或用例；指标与评分匹配；流程不是报告模板",
    "kind": "suite",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "suite_spec",
    "english_name": "Evaluation Suite"
  },
  {
    "key": "pipeline",
    "label": "评测流程",
    "role": "评测负责人",
    "material": "准备、执行、评分、复核、报告及清理的顺序和条件",
    "fields": [
      {
        "key": "nodes",
        "label": "流程节点",
        "type": "array",
        "required": true,
        "hint": "系统按固定阶段和复核选项生成；不逐项手填节点或连线",
        "example": [],
        "children": [
          {
            "key": "node_id",
            "label": "节点编号",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "type",
            "label": "节点工作",
            "type": "select",
            "required": true,
            "hint": "",
            "example": "prepare",
            "options": [
              [
                "prepare",
                "准备"
              ],
              [
                "execute",
                "执行"
              ],
              [
                "score",
                "评分"
              ],
              [
                "review",
                "复核"
              ],
              [
                "report",
                "报告"
              ],
              [
                "cleanup",
                "清理"
              ]
            ]
          },
          {
            "key": "timeout_ms",
            "label": "时限（ms）",
            "type": "integer",
            "required": true,
            "hint": "",
            "example": null,
            "min": 1
          }
        ]
      },
      {
        "key": "edges",
        "label": "先后关系",
        "type": "array",
        "required": true,
        "hint": "系统按固定阶段和复核选项生成；不逐项手填节点或连线",
        "example": [],
        "children": [
          {
            "key": "from",
            "label": "前置节点",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "to",
            "label": "后续节点",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "condition",
            "label": "进入条件",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          }
        ]
      },
      {
        "key": "io_mapping",
        "label": "节点输出 → 后续输入",
        "type": "mapping",
        "required": true,
        "hint": "系统按固定阶段和复核选项生成；不逐项手填节点或连线",
        "example": [],
        "roots": [
          "nodes"
        ]
      },
      {
        "key": "failure_policy",
        "label": "故障处理",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "stop",
        "options": [
          [
            "stop",
            "停止"
          ],
          [
            "wait",
            "等待处理"
          ],
          [
            "reconcile",
            "先核对副作用"
          ]
        ]
      },
      {
        "key": "manual_steps",
        "label": "需人工完成的节点",
        "type": "array",
        "required": false,
        "hint": "系统按固定阶段和复核选项生成；不逐项手填节点或连线",
        "example": [],
        "item_type": "text"
      }
    ],
    "consumer": "任务编排服务按固定顺序调度；节点使用资产版本引用",
    "check": "无循环、节点引用存在；只编排评测步骤",
    "kind": "pipeline",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "pipeline_spec",
    "english_name": "Evaluation Workflow"
  },
  {
    "key": "gate",
    "label": "门禁与统计规则",
    "role": "业务负责人、评测负责人",
    "material": "通过标准、必要复核、统计口径和批准依据",
    "fields": [
      {
        "key": "mandatory_items",
        "label": "指标通过条件",
        "type": "array",
        "required": true,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "metric_version_id",
            "label": "指标版本",
            "type": "ref",
            "required": true,
            "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
            "example": null,
            "ref_kinds": [
              "metric"
            ]
          },
          {
            "key": "operator",
            "label": "判定关系",
            "type": "select",
            "required": true,
            "hint": "",
            "example": "gte",
            "options": [
              [
                "gte",
                "不小于"
              ],
              [
                "lte",
                "不大于"
              ],
              [
                "eq",
                "等于"
              ]
            ]
          },
          {
            "key": "threshold",
            "label": "通过阈值",
            "type": "number",
            "required": true,
            "hint": "使用指标本身的单位；如比例95%填写0.95",
            "example": null
          },
          {
            "key": "mandatory",
            "label": "强制项",
            "type": "boolean",
            "required": true,
            "hint": "",
            "example": true
          }
        ]
      },
      {
        "key": "independent_unit",
        "label": "独立统计单位",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "文档"
      },
      {
        "key": "min_valid_samples",
        "label": "最少有效样本数",
        "type": "integer",
        "required": true,
        "hint": "",
        "example": 1,
        "min": 1
      },
      {
        "key": "rubric_version_id",
        "label": "必要评分规约（用于复核）",
        "type": "ref",
        "required": false,
        "hint": "在目录中选择已发布的固定版本；保存版本编号，不按名称或 latest 解析",
        "example": null,
        "ref_kinds": [
          "rubric"
        ]
      },
      {
        "key": "review_required",
        "label": "必须完成复核",
        "type": "boolean",
        "required": true,
        "hint": "",
        "example": false
      },
      {
        "key": "approved_by",
        "label": "业务批准依据",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "演示规则；正式阈值引用批准记录"
      }
    ],
    "consumer": "报告按指标值和通过条件形成结论；必要复核和缺口单独记录",
    "check": "阈值来源清楚；单位匹配；强制项不可被其他高分抵消",
    "kind": "gate",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "gate_spec",
    "english_name": "Quality Gate & Statistical Rules"
  },
  {
    "key": "baseline",
    "label": "基线",
    "role": "评测负责人",
    "material": "已生成的结果快照、可比范围及选用理由",
    "fields": [
      {
        "key": "result_snapshot_id",
        "label": "结果快照",
        "type": "report_ref",
        "required": true,
        "hint": "从已生成报告中选择；系统保存报告ID",
        "example": null
      },
      {
        "key": "dataset_versions",
        "label": "可比数据版本",
        "type": "array",
        "required": true,
        "hint": "逐项选择已发布固定版本；至少选择一项",
        "example": [],
        "item_type": "ref",
        "ref_kinds": [
          "dataset"
        ]
      },
      {
        "key": "metric_versions",
        "label": "可比指标版本",
        "type": "array",
        "required": true,
        "hint": "逐项选择已发布固定版本；至少选择一项",
        "example": [],
        "item_type": "ref",
        "ref_kinds": [
          "metric"
        ]
      },
      {
        "key": "comparison_scope",
        "label": "可比条件",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "相同数据、评分口径和环境；仅对象版本不同"
      },
      {
        "key": "promotion_reason",
        "label": "选为基线的理由",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "经过复核的稳定发布版本结果"
      },
      {
        "key": "effective_from",
        "label": "生效时间",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "2026-11-15T20:00:00+08:00"
      }
    ],
    "consumer": "对比任务读取固定结果；新结果与基线按同样本同指标比较",
    "check": "结果存在且可读；范围一致；不会替代绝对门禁",
    "kind": "baseline",
    "subtype": "",
    "phase": "沿主PRD阶段",
    "storage_root": "baseline_spec",
    "english_name": "Baseline"
  },
  {
    "key": "tag_dictionary",
    "label": "标签字典",
    "role": "评测负责人",
    "material": "标签名称、定义和上下级关系",
    "fields": [
      {
        "key": "tags",
        "label": "标签条目",
        "type": "array",
        "required": true,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "tag_key",
            "label": "稳定标识",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "label",
            "label": "中文名称",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "definition",
            "label": "含义",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "parent_key",
            "label": "父标签标识",
            "type": "text",
            "required": false,
            "hint": "",
            "example": null
          }
        ]
      },
      {
        "key": "migration_map",
        "label": "旧标签迁移",
        "type": "array",
        "required": false,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "from",
            "label": "旧标签",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "to",
            "label": "新标签",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          }
        ]
      }
    ],
    "consumer": "数据集校验标签；报告选择切片维度",
    "check": "标识唯一、父标签存在且无环",
    "kind": "scenario",
    "subtype": "tag_dictionary",
    "phase": "沿主PRD阶段",
    "storage_root": "tag_dictionary_spec",
    "english_name": "Tag Dictionary"
  },
  {
    "key": "red_team_template",
    "label": "红队场景模板",
    "role": "专项安全审批人、评测负责人",
    "material": "安全策略、攻击类别、参数和限制",
    "fields": [
      {
        "key": "objective",
        "label": "验证目标",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "文档内指令不改变任务目标"
      },
      {
        "key": "attack_category",
        "label": "攻击类别",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "文档提示注入"
      },
      {
        "key": "target_policy_ref",
        "label": "对应安全策略版本",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "指令来源策略v1"
      },
      {
        "key": "mutation_constraints",
        "label": "允许变化与禁止事项",
        "type": "json",
        "required": true,
        "hint": "配置值：填写本资产实际使用的值，不填写字段类型定义。明确参数变化范围，派生用例保留限制",
        "example": {
          "allow": [
            "措辞变化"
          ],
          "forbid": [
            "真实资料外发"
          ]
        }
      },
      {
        "key": "parameter_schema",
        "label": "参数定义",
        "type": "json",
        "required": true,
        "hint": "结构定义：填写字段标识、显示名、类型、必填条件及子字段。为每个参数声明类型、含义与范围",
        "example": {
          "document_text": {
            "type": "string"
          }
        }
      },
      {
        "key": "sequence_template",
        "label": "步骤模板",
        "type": "array",
        "required": true,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "step_id",
            "label": "步骤编号",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "action",
            "label": "操作",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          }
        ]
      },
      {
        "key": "risk_constraints",
        "label": "风险约束",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "仅在隔离测试环境执行"
        ],
        "item_type": "text"
      },
      {
        "key": "task_type",
        "label": "适用任务类型",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "agent.proactive_service"
      },
      {
        "key": "preconditions",
        "label": "公共前提",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "功能开关打开"
        ],
        "item_type": "text"
      },
      {
        "key": "coverage_tags",
        "label": "覆盖分支",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "确认",
          "拒绝"
        ],
        "item_type": "text"
      }
    ],
    "consumer": "生成场景用例并保留模板来源、参数和限制",
    "check": "变体不得绕过风险约束",
    "kind": "scenario",
    "subtype": "red_team_template",
    "phase": "P1",
    "storage_root": "red_team_template_spec",
    "english_name": "Red-team Scenario Template"
  },
  {
    "key": "report_template",
    "label": "报告模板",
    "role": "评测负责人",
    "material": "报告章节、展示字段、所需判定依据和脱敏要求",
    "fields": [
      {
        "key": "business_line_scope",
        "label": "适用业务线",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "车载",
          "企业"
        ],
        "item_type": "text"
      },
      {
        "key": "sections",
        "label": "报告章节",
        "type": "array",
        "required": true,
        "hint": "",
        "example": [],
        "children": [
          {
            "key": "section_id",
            "label": "章节标识",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "title",
            "label": "标题",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "source_path",
            "label": "数据来源",
            "type": "text",
            "required": true,
            "hint": "",
            "example": null
          },
          {
            "key": "required",
            "label": "必需章节",
            "type": "boolean",
            "required": true,
            "hint": "",
            "example": true
          }
        ]
      },
      {
        "key": "required_evidence",
        "label": "必需判定依据",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "结果快照",
          "覆盖与缺口"
        ],
        "item_type": "text"
      },
      {
        "key": "redaction_rules",
        "label": "隐藏字段",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "凭据引用"
        ],
        "item_type": "text"
      },
      {
        "key": "layout_version",
        "label": "版式版本",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "1"
      }
    ],
    "consumer": "报告服务从固定结果快照取数；不进入评测流程选择器",
    "check": "章节来源可取；结论、覆盖和缺口不被隐藏",
    "kind": "pipeline",
    "subtype": "report_template",
    "phase": "沿主PRD阶段",
    "storage_root": "report_template_spec",
    "english_name": "Report Template"
  },
  {
    "key": "task_type",
    "label": "任务类型",
    "role": "平台研发",
    "material": "输入输出要求、协议、最小判定依据和必要资产类型",
    "fields": [
      {
        "key": "task_type_key",
        "label": "稳定类型标识",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "agent.document_qa"
      },
      {
        "key": "object_type",
        "label": "对象类型",
        "type": "select",
        "required": true,
        "hint": "",
        "example": "AGENT",
        "options": [
          [
            "AGENT",
            "Agent"
          ],
          [
            "APPLICATION",
            "应用"
          ],
          [
            "MODEL",
            "模型"
          ]
        ]
      },
      {
        "key": "task_family",
        "label": "能力类别",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "文档问答"
      },
      {
        "key": "input_schema",
        "label": "输入字段定义",
        "type": "json",
        "required": true,
        "hint": "结构定义：填写字段标识、显示名、类型、必填条件及子字段。从接口协议导入。每项说明字段标识、中文名、类型、必填及嵌套字段；与运行输入逐项检查。",
        "example": [
          {
            "key": "query",
            "label": "问题",
            "type": "text",
            "role": "input",
            "required": true
          }
        ]
      },
      {
        "key": "output_schema",
        "label": "输出字段定义",
        "type": "json",
        "required": true,
        "hint": "结构定义：填写字段标识、显示名、类型、必填条件及子字段。从接口协议导入。每项说明字段标识、中文名、类型、必填及嵌套字段；与运行输入逐项检查。",
        "example": [
          {
            "key": "query",
            "label": "问题",
            "type": "text",
            "role": "input",
            "required": true
          }
        ]
      },
      {
        "key": "modalities",
        "label": "输入输出形态",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "text",
          "file"
        ],
        "item_type": "text"
      },
      {
        "key": "protocols",
        "label": "可用协议",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "sync_http"
        ],
        "item_type": "text"
      },
      {
        "key": "required_evidence",
        "label": "最小判定依据",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "实际回答",
          "引用位置"
        ],
        "item_type": "text"
      },
      {
        "key": "required_asset_kinds",
        "label": "必要资产类型",
        "type": "array",
        "required": false,
        "hint": "每一项填写一个名称或说明",
        "example": [
          "dataset",
          "executor",
          "scorer"
        ],
        "item_type": "text"
      },
      {
        "key": "statistical_unit",
        "label": "独立统计单位",
        "type": "text",
        "required": true,
        "hint": "",
        "example": "文档"
      }
    ],
    "consumer": "任务装配按定义检查数据、执行和评分能力",
    "check": "只定义任务规范；不复制样本、不代替就绪检查",
    "phase": "B2",
    "entity": "task_type_definition",
    "kind": "task_type",
    "subtype": "",
    "storage_root": "task_type_definition",
    "english_name": "Task Type"
  }
];
if(typeof module!=='undefined')module.exports=AssetDefinitions;
