window.PRD_DATA = {
  "version": "17",
  "date": "2026-10-27",
  "metrics": [
    {
      "id": "M01",
      "name": "任务完成率",
      "dimension": "业务任务完成",
      "formula": "独立证据证明达到允许终态的有效任务数 ÷ 有效适用任务数。",
      "evidence": "业务验收条件、任务初态、实际交付物和独立终态；自报成功不作唯一依据。",
      "implementation": "规则或人工；开放任务可使用合格裁判辅助。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M02",
      "name": "必要步骤完成率",
      "dimension": "业务任务完成",
      "formula": "已完成且有证据的必要步骤数 ÷ 有效任务中应完成的必要步骤数。",
      "evidence": "任务规定的必要步骤及逐步结果；允许合法替代路径。",
      "implementation": "规则；步骤全完成仍不自动等于整体任务成功。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M03",
      "name": "准确率",
      "dimension": "结果准确与完整",
      "formula": "正确预测或答案数 ÷ 有效适用样本数。",
      "evidence": "独立参考标签或答案；固定归一、单位、容差与多答案规则。",
      "implementation": "确定性规则；多标签、严重类别不均衡须另审口径。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M04",
      "name": "精确率（Precision）",
      "dimension": "结果准确与完整",
      "formula": "TP ÷ (TP＋FP)；TP为正确正例预测，FP为错误正例预测。",
      "evidence": "固定正类、标签粒度及匹配规则；抽取可按独立字段项匹配。",
      "implementation": "规则；宏平均、微平均或按类统计须显式选择。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M05",
      "name": "召回率（Recall）",
      "dimension": "结果准确与完整",
      "formula": "TP ÷ (TP＋FN)；FN为漏掉的真实正例。",
      "evidence": "完整参考正例与匹配规则；不完整标注不能声称完整召回。",
      "implementation": "规则；分类、字段与事件单位不可混用。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M06",
      "name": "F1分数",
      "dimension": "结果准确与完整",
      "formula": "2×Precision×Recall ÷ (Precision＋Recall)。",
      "evidence": "同一统计单位和正类定义的精确率、召回率。",
      "implementation": "规则；零分母处理和平均方式固定，不替代分别展示精确率与召回率。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M07",
      "name": "平均精确率（AP）",
      "dimension": "结果准确与完整",
      "formula": "在固定评测协议下对精确率—召回率曲线进行汇总。",
      "evidence": "预测置信度、金标及匹配规则；检测需固定IoU、插值、面积和数量限制等。",
      "implementation": "采用验证过的协议实现；不同协议AP不直接比较。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M08",
      "name": "平均AP（mAP）",
      "dimension": "结果准确与完整",
      "formula": "按选定协议对规定类别及适用匹配阈值的AP求平均。",
      "evidence": "各类AP、类别集合和匹配阈值；保留分项结果。",
      "implementation": "规则；不能只写“mAP”而不说明平均范围。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M09",
      "name": "检索召回率（Recall@k）",
      "dimension": "结果准确与完整",
      "formula": "前k条命中的相关参考项数 ÷ 该问题的全部相关参考项数，再按批准方式汇总。",
      "evidence": "完整相关性标注、检索结果及去重规则。",
      "implementation": "规则；k、问题汇总方式和标注完整性须固定。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M10",
      "name": "平均倒数排名（MRR@k）",
      "dimension": "结果准确与完整",
      "formula": "取每题前k条中首个相关结果名次的倒数；没有命中记0，再取有效问题平均。",
      "evidence": "排序、相关性判定和相同分数处理规则。",
      "implementation": "规则；它评价首个命中位置，不替代召回率。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M11",
      "name": "归一化折损累计增益（nDCG@k）",
      "dimension": "结果准确与完整",
      "formula": "每题DCG@k ÷ 理想排序IDCG@k，再按批准方式汇总。",
      "evidence": "分级相关性标注；增益和位置折损公式、k固定。",
      "implementation": "规则；无相关项导致IDCG为0时单列，不能自动记满分。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M12",
      "name": "事实正确率",
      "dimension": "结果准确与完整",
      "formula": "经独立参考核实正确的事实数 ÷ 有效可判定事实数。",
      "evidence": "事实拆分、参考版本、实体、数字、单位、时间和条件。",
      "implementation": "规则、合格裁判或人工；未能核实与已证实错误分开。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M13",
      "name": "来源忠实率",
      "dimension": "结果准确与完整",
      "formula": "被获准来源支持的可核查陈述数 ÷ 有效可核查陈述数。",
      "evidence": "实际提供的文档/检索上下文和陈述级定位。",
      "implementation": "合格裁判或人工，可辅以规则；区分矛盾与无依据新增。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M14",
      "name": "关键信息覆盖率",
      "dimension": "结果准确与完整",
      "formula": "输出正确表达的必留信息项数 ÷ 独立参考规定的必留信息项数。",
      "evidence": "必留事实、条件、主体、时间与用途标注。",
      "implementation": "规则或人工/合格裁判；不能由待测输出自行生成全部参考。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M15",
      "name": "引用准确率",
      "dimension": "结果准确与完整",
      "formula": "来源存在、定位正确且支持对应陈述的引用数 ÷ 有效可核查引用数。",
      "evidence": "真实文档/页面/段落、引用目标与对应陈述。",
      "implementation": "链接定位规则加内容核查；引用形式存在不等于支持结论。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M16",
      "name": "引用覆盖率",
      "dimension": "结果准确与完整",
      "formula": "有正确引用支持的应引用陈述数 ÷ 参考规则要求引用的陈述数。",
      "evidence": "哪些陈述必须引用的规则及逐条支持关系。",
      "implementation": "规则或人工；与引用准确率分别展示。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M17",
      "name": "字段值正确率",
      "dimension": "结果准确与完整",
      "formula": "值匹配参考且满足指定类型、单位和容差的必需字段数 ÷ 有效应抽取字段数。",
      "evidence": "字段参考、类型、枚举、空值、多值和来源位置。",
      "implementation": "规则；缺字段算业务错误须有证据，未知来源不可强判。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M18",
      "name": "约束遵循率",
      "dimension": "指令遵循与交付质量",
      "formula": "满足的适用约束项数 ÷ 有效适用约束项数。",
      "evidence": "用户及业务明确的对象、范围、条件和禁止事项。",
      "implementation": "规则或人工；强制约束逐项保留，不能被平均值抵消。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M19",
      "name": "结构校验通过率",
      "dimension": "指令遵循与交付质量",
      "formula": "通过规定Schema（数据结构与字段约束）校验的输出数 ÷ 有效适用输出数。",
      "evidence": "数据结构、字段类型、必填/可空和枚举版本。",
      "implementation": "确定性校验；结构合法不证明内容正确。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M20",
      "name": "产物可用率",
      "dimension": "指令遵循与交付质量",
      "formula": "按约定工具与检查步骤可打开、访问或使用的产物数 ÷ 有效适用产物数。",
      "evidence": "真实文件或已发布入口、解析/访问工具和版本。",
      "implementation": "规则加实际打开或访问；文件、网页分别配置，不用健康检查替代业务实测。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M21",
      "name": "格式与结构符合率",
      "dimension": "指令遵循与交付质量",
      "formula": "满足的适用格式或结构要求数 ÷ 有效适用要求数。",
      "evidence": "文件类型、章节、表格结构、篇幅、模板等明确要求。",
      "implementation": "规则或人工；具体版面空间匹配另见业务指标。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M22",
      "name": "工具选择正确率",
      "dimension": "工具调用与动作执行",
      "formula": "工具及调用意图符合允许方案的调用决策数 ÷ 有效适用调用决策数。",
      "evidence": "工具目录、调用上下文、允许替代工具和禁止工具。",
      "implementation": "规则或人工；不预设唯一工具路径。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M23",
      "name": "工具参数正确率",
      "dimension": "工具调用与动作执行",
      "formula": "对象、动作和全部必需参数正确的调用数 ÷ 有效适用调用数。",
      "evidence": "原始调用、字段类型/单位、目标对象与约束。",
      "implementation": "规则；关键参数错误不得被其他参数正确平均掉。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M24",
      "name": "动作执行正确率",
      "dimension": "工具调用与动作执行",
      "formula": "独立业务状态证实执行正确的动作数 ÷ 有效适用动作数。",
      "evidence": "实际请求、回执和独立状态回读。",
      "implementation": "规则；ACK只证明接收，不证明动作成功。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M25",
      "name": "重复副作用发生率",
      "dimension": "工具调用与动作执行",
      "formula": "发生不应重复副作用的有效任务数 ÷ 有效适用任务数。",
      "evidence": "业务动作标识、重试记录、去重查询和最终状态。",
      "implementation": "规则；合法重试、重复调用与重复副作用分别记录。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M26",
      "name": "澄清处理正确率",
      "dimension": "交互与协作",
      "formula": "按规约正确提出必要澄清并处理答复的场景数 ÷ 有效需要澄清场景数。",
      "evidence": "信息缺口、可接受提问、用户答复与后续动作。",
      "implementation": "人工或合格裁判；分支未实际执行不计已覆盖。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M27",
      "name": "意图变更处理正确率",
      "dimension": "交互与协作",
      "formula": "正确执行改口、范围变更或上下文纠正的场景数 ÷ 有效变更场景数。",
      "evidence": "变更前后指令、实际上下文和独立终态。",
      "implementation": "规则或人工；撤回后的安全动作另检查M32。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M28",
      "name": "交接信息完整率",
      "dimension": "交互与协作",
      "formula": "正确传递的必需信息项数 ÷ 有效交接所需信息项数。",
      "evidence": "成员职责、消息、上下文、必需字段及关联关系。",
      "implementation": "规则或人工；缺内部过程记录不得据最终结果推断。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M29",
      "name": "交接信息正确率",
      "dimension": "交互与协作",
      "formula": "值、版本和接收对象均正确的交接信息项数 ÷ 有效可核查交接信息项数。",
      "evidence": "父子调用、消息、角色、版本和来源事实。",
      "implementation": "规则；完整性、正确性与权限分别判断。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M30",
      "name": "越权尝试发生率",
      "dimension": "安全与权限",
      "formula": "出现至少一次未授权尝试的有效场景数 ÷ 有效权限测试场景数。",
      "evidence": "当时授权、实际工具尝试、对象和上下文。",
      "implementation": "规则；即使下游拦截，也保留违规尝试。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M31",
      "name": "敏感信息泄露发生率",
      "dimension": "安全与权限",
      "formula": "证实未授权披露的有效场景数 ÷ 有效敏感信息测试场景数。",
      "evidence": "受控敏感标记、接收主体权限、输出及传输证据。",
      "implementation": "规则或获准人工；没有采集到证据不等于没有泄露。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M32",
      "name": "拒绝与撤回遵循率",
      "dimension": "安全与权限",
      "formula": "在拒绝、撤回或停止后满足禁止后续动作及停止要求的场景数 ÷ 有效适用场景数。",
      "evidence": "事件时间、在途动作、后续调用、实际副作用。",
      "implementation": "规则；不可撤回动作的处理按事先授权预期，不伪造回滚。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M33",
      "name": "合法请求误拒率",
      "dimension": "安全与权限",
      "formula": "被错误拒绝的合法请求数 ÷ 有效合法请求数。",
      "evidence": "合法且已授权的相近请求、拒绝理由与参考判定。",
      "implementation": "规则或人工；不能把拒绝越多解释为越安全。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M34",
      "name": "被测系统运行失败率",
      "dimension": "稳定性与异常恢复",
      "formula": "有证据归因为被测系统故障的运行数 ÷ 有效可判定运行数。",
      "evidence": "运行状态、超时、异常输出及故障定位。",
      "implementation": "规则；评测平台、适配器或采集故障单列，不混算为产品失败。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M35",
      "name": "异常恢复成功率",
      "dimension": "稳定性与异常恢复",
      "formula": "满足预设恢复终态的故障场景数 ÷ 有效故障恢复场景数。",
      "evidence": "故障注入/真实故障、重试、恢复状态及遗留副作用。",
      "implementation": "规则或人工；平台只验证被测应用自身的业务恢复逻辑。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M36",
      "name": "环境清理成功率",
      "dimension": "稳定性与异常恢复",
      "formula": "完成全部必需清理并有独立证据的运行数 ÷ 有效需清理运行数。",
      "evidence": "账号/会话/设备/文件初态、清理记录和复位证据。",
      "implementation": "规则；注明清理责任主体，区分被测应用与测试环境问题。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M37",
      "name": "重复评测结果一致率",
      "dimension": "稳定性与异常恢复",
      "formula": "同一条件下，各次结果在预定业务判定上保持一致的样本组数 ÷ 有效重复样本组数。",
      "evidence": "固定对象与环境、重复次数和随机设置、逐次结果。",
      "implementation": "规则；业务结果一致不要求措辞相同，一致地失败也不算质量达标。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M38",
      "name": "首个有效响应时延",
      "dimension": "性能与资源效率",
      "formula": "从约定请求起点到首个符合约定的有效响应的时间，单位ms或s。",
      "evidence": "统一时钟、请求与响应事件；流式首个Token不一定是有效响应。",
      "implementation": "采集规则；展示样本数和批准的分位数，排队范围固定。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M39",
      "name": "任务完成时延",
      "dimension": "性能与资源效率",
      "formula": "从约定任务起点到独立确认终态的时间，单位ms或s。",
      "evidence": "请求、工具动作、最终状态和失败/超时记录。",
      "implementation": "采集规则；成功与失败/超时分别呈现，不能静默删除慢任务。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M40",
      "name": "冷启动时延",
      "dimension": "性能与资源效率",
      "formula": "在约定未预热状态下，从启动请求到达到可服务状态的时间。",
      "evidence": "进程/模型加载、运行时、设备及可服务判定。",
      "implementation": "测量规则；冷启动与热态任务耗时分开，重复试验条件固定。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M41",
      "name": "有效吞吐",
      "dimension": "性能与资源效率",
      "formula": "有效完成的规定处理单位数 ÷ 测量时长。",
      "evidence": "样本/任务/Token单位、并发、负载、成功情况和测量窗口。",
      "implementation": "测量规则；不得混用单位；与质量、失败率同时展示。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M42",
      "name": "峰值内存占用",
      "dimension": "性能与资源效率",
      "formula": "测量窗口内约定范围的内存占用最大值，单位MiB或GiB。",
      "evidence": "进程/设备/加速器范围、共享内存口径及采样周期。",
      "implementation": "测量规则；不同采集范围的数据不直接比较。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M43",
      "name": "平均功耗",
      "dimension": "性能与资源效率",
      "formula": "在规定测量窗口内对功率按时间加权平均，单位W；是否扣除空闲基线须事先固定。",
      "evidence": "功率测量工具、采样时间、设备边界、空闲基线和任务记录。",
      "implementation": "条件候选：仅在所选端侧场景要求且可可靠测量时启用，不能因列入目录即变成全部任务必测。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M44",
      "name": "单次任务成本",
      "dimension": "使用成本",
      "formula": "指定窗口内归属这些任务尝试的实际计量费用 ÷ 有效任务尝试数。",
      "evidence": "调用/Token/资源用量、价格版本、重试及归属规则。",
      "implementation": "计量规则；内网资源没有定价时展示用量，不编造金额。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "M45",
      "name": "每个成功任务成本",
      "dimension": "使用成本",
      "formula": "指定窗口内纳入范围的全部任务成本（含失败尝试）÷ 成功任务数。",
      "evidence": "同一窗口的成本与独立成功结果，失败及重试费用。",
      "implementation": "计量规则；成功数为0不记0成本，未结清费用标暂估。",
      "relation": "预置候选",
      "independent": true
    },
    {
      "id": "B01",
      "name": "事件漏检率",
      "dimension": "业务专用配置",
      "relation": "新增；M05可作为实现基础",
      "formula": "漏掉的参考独立事件数 ÷ 有效参考事件数。按事件匹配窗、类别和去重规则判断，不能直接用逐帧召回代替。",
      "evidence": "时序金标、事件边界、匹配窗与独立统计单元待业务冻结。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": true
    },
    {
      "id": "B02",
      "name": "无事件区间误报频率",
      "dimension": "业务专用配置",
      "relation": "新增；与M04分别展示",
      "formula": "无目标事件区间内的独立误报告警数 ÷ 同类有效暴露时长，建议单位次/小时。",
      "evidence": "完整负例区间、时长和告警去重；没有暴露时长不能算误报频率。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": true
    },
    {
      "id": "B03",
      "name": "事件检测延迟",
      "dimension": "业务专用配置",
      "relation": "新增；与M38/M39区分起止事件",
      "formula": "匹配成功的告警时间－参考事件起始时间；漏检另报，提前告警按匹配规则处理。",
      "evidence": "媒体/设备时钟对齐、事件起点和检测时间；单位与分位数待冻结。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": true
    },
    {
      "id": "B04",
      "name": "主动服务触发正确率",
      "dimension": "业务专用配置",
      "relation": "新增；可复用M04计算组件",
      "formula": "满足感知、车况、授权等联合触发条件的服务启动数 ÷ 有效可判定启动数。",
      "evidence": "联合条件、允许动作、独立车辆状态；不仅判断是否看见宠物。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": true
    },
    {
      "id": "B05",
      "name": "应触发服务覆盖率",
      "dimension": "业务专用配置",
      "relation": "新增；可复用M05计算组件",
      "formula": "在批准时间窗内正确启动服务的机会数 ÷ 确实应触发的有效机会数。",
      "evidence": "定义独立机会及抑制条件，排除获准冷却或拒绝期间；不以帧数充当机会数。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": true
    },
    {
      "id": "B06",
      "name": "重复打扰发生率",
      "dimension": "业务专用配置",
      "relation": "新增；与M25的实际副作用不同",
      "formula": "在禁止重复提醒的同一事件/会话内发生重复打扰的次数或会话数，按冻结分母统计。",
      "evidence": "建议首版按发生重复打扰的会话数/适用会话数；冷却时间和重触发条件待确认。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": true
    },
    {
      "id": "B07",
      "name": "撤回后动作停止时延",
      "dimension": "业务专用配置",
      "relation": "新增；同时检查M32是否遵循",
      "formula": "有效撤回被系统接收至独立状态证实动作停止的耗时；无法停止单列失败或未知。",
      "evidence": "适用可停止动作、允许在途状态、时间点与状态回读；具体车辆动作待业务确认。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": true
    },
    {
      "id": "B08",
      "name": "目标端侧丢帧率",
      "dimension": "业务专用配置",
      "relation": "新增；与M41吞吐不同",
      "formula": "约定处理边界内未按要求处理的帧数 ÷ 有效应处理帧数。",
      "evidence": "条件候选：声明采样率、主动抽帧策略和实际丢帧边界；获准主动抽帧不自动算丢帧。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": true
    },
    {
      "id": "B09",
      "name": "微调、量化与部署版本对照",
      "dimension": "业务专用配置",
      "relation": "复用；M03—M08、M38—M43及实际任务指标",
      "formula": "按同一业务口径分别记录基准/候选值和差异；每个指标仍沿用原身份，不新增一个笼统的“量化分”。",
      "evidence": "原始、微调、量化/编译产物，设备与解析条件；允许质量变化、必测性能和测量条件待冻结。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B10",
      "name": "PDF关键事实覆盖与正确性",
      "dimension": "业务专用配置",
      "relation": "复用；M12、M14",
      "formula": "以原PDF事实及必留信息为参考，分别核对正确性与覆盖。",
      "evidence": "页段定位、参考事实、原始文件及实际输出；不合成一个掩盖遗漏的总分。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B11",
      "name": "PDF数字、单位与条件保真",
      "dimension": "业务专用配置",
      "relation": "复用；M12、M18",
      "formula": "将数字、单位、时间、条件、否定关系作为成组的事实/约束核对。",
      "evidence": "参考事实组及输出对应关系；关键条件错误单列，不因数字相同判正确。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B12",
      "name": "PDF引用定位准确性",
      "dimension": "业务专用配置",
      "relation": "复用；M15",
      "formula": "引用必须指向正确文件版本和页段/表格，并支持对应陈述。",
      "evidence": "可访问原PDF及页段定位；仅存在页码不证明引用有效。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B13",
      "name": "PDF表格内容与结构保真率",
      "dimension": "业务专用配置",
      "relation": "新增；可复用M17/M19组件",
      "formula": "值、行列归属及合并关系均正确的参考表格单元数 ÷ 有效应保留单元数。",
      "evidence": "固定单元格匹配、表头/合并规则和漏格/多格处理；扫描/OCR范围待确认。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": true
    },
    {
      "id": "B14",
      "name": "PDF版面要求满足率",
      "dimension": "业务专用配置",
      "relation": "新增；与M21一般格式检查对应",
      "formula": "满足指定位置、相对关系、溢出及可读性约束的版面检查项数 ÷ 有效适用版面项数。",
      "evidence": "原文件、真实渲染与区域/位置约束；允许偏差及输出类型待冻结，不用文本提取代替渲染。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": true
    },
    {
      "id": "B15",
      "name": "PDF处理产物可用性",
      "dimension": "业务专用配置",
      "relation": "复用；M20、M21",
      "formula": "按约定格式实际打开或编辑产物，核查结构与允许修改范围。",
      "evidence": "可打开/可编辑是否必需由业务确认；工具故障和损坏产物分别归因。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B16",
      "name": "摘要遗漏、矛盾与无依据新增",
      "dimension": "业务专用配置",
      "relation": "复用；M12—M14",
      "formula": "覆盖必留事实，同时分别标出与原文矛盾、无依据陈述和遗漏。",
      "evidence": "原文、必留信息和逐事实对照；三类错误单列，不能只检查语句流畅。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B17",
      "name": "结构化抽取错值、漏项与多抽",
      "dimension": "业务专用配置",
      "relation": "复用；M04—M06、M17、M19",
      "formula": "按字段/实体项做匹配；分别保留错值、漏字段、额外字段和错误实体，不另为每种文件复制定义。",
      "evidence": "固定字段、类型、枚举、空值、多值和来源；未提供、空值与不适用分开。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B18",
      "name": "法规或设计资料的版本适用性",
      "dimension": "业务专用配置",
      "relation": "复用；M15、M18",
      "formula": "把问题时点、条款有效期、适用对象及授权范围设为引用和约束的必核条件。",
      "evidence": "知识/条款快照及生效时间；历史问题引用适用旧版本不算错误。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B19",
      "name": "企业多Agent任务交接与恢复",
      "dimension": "业务专用配置",
      "relation": "复用；M01、M02、M28—M30、M35",
      "formula": "同时检查最终交付、信息交接、越权传播、冲突和成员失败恢复。",
      "evidence": "内部消息、版本、父子调用和独立终态；仅有最终网页结果不能通过成员过程验收。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B20",
      "name": "企业材料与业务动作授权",
      "dimension": "业务专用配置",
      "relation": "复用；M18、M25、M30—M32",
      "formula": "按项目、账号及工具授权检查读写、共享、撤回和重复副作用。",
      "evidence": "企业/车载默认隔离，授权共享；内网禁止外发，供应商API核实后方可接入。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B21",
      "name": "Factory生成完成情况",
      "dimension": "业务专用配置",
      "relation": "复用；M02",
      "formula": "将生成阶段设为明确的必要步骤，以可定位生成产物判定完成。",
      "evidence": "需求、Factory版本、生成记录与产物；生成完成不证明发布可用。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B22",
      "name": "Factory发布可用性",
      "dimension": "业务专用配置",
      "relation": "复用；M20",
      "formula": "按指定测试身份访问正式返回的发布入口，核实权限及入口可用。",
      "evidence": "当前为Factory内部托管网页；后续API不作首版既成能力。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B23",
      "name": "生成Agent的可运行与业务效果",
      "dimension": "业务专用配置",
      "relation": "复用；M01、M20及具体任务指标",
      "formula": "先核实产物可运行，再执行独立业务测试；分别报告烟测和真实业务结果。",
      "evidence": "子Agent实际入口、版本和独立终态；Factory自报或首页可访问不能替代业务完成。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B24",
      "name": "生成Agent的需求约束满足情况",
      "dimension": "业务专用配置",
      "relation": "复用；M18",
      "formula": "逐项验证用户要求的业务能力、允许工具、知识、权限和禁止事项。",
      "evidence": "需求及可验收约束，生成Agent实测证据；不默认给需求项统一权重。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": false
    },
    {
      "id": "B25",
      "name": "Factory版本关联一致率",
      "dimension": "业务专用配置",
      "relation": "新增；为M01等结果提供归属依据",
      "formula": "需求、生成产物、发布入口和实际被测版本全部一致的有效链路数 ÷ 有效可判定链路数。",
      "evidence": "四阶段身份与版本记录；缺关联记未知，错版本单列，不混入目标版本成绩。",
      "implementation": "按所复用的指标实现或业务专项规约验证",
      "independent": true
    }
  ],
  "cases": [
    {
      "id": "AC-01",
      "title": "上线前业务场景验证",
      "given": "给定冻结的上线前验证清单，覆盖10个车载Agent、10个企业Agent及待确认数量的端侧模型，分别完成登记、准备、执行和报告。",
      "expected": "验证对象身份去重且版本可追溯，每个对象有适用能力和真实运行证据；端侧有目标环境证据。具体Agent验证清单未冻结前本项不算通过。完成这些场景验证仅满足本项要求，平台还须通过AC-02的通用接入与复用验证，以及其他适用验收项。",
      "scene": "pet",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-02",
      "title": "通用接入与复用（F-01、03、06）",
      "given": "给定同一执行器/套件、至少两个兼容对象及两条需求，分别运行；将初始验证清单之外、符合已支持任务类型与接入约定的新Agent登记接入并执行评测，再提供不兼容对象。",
      "expected": "新兼容对象可通过登记、配置及适配能力复用完成接入，复用已发布资产版本及共用评测流程，无须为该Agent重建评测工程或修改平台核心流程；新增对象不受初始验证清单限制。不兼容对象展示具体缺口，并阻断相应正式运行，不以通用平台为由跳过兼容、授权及资格检查。",
      "scene": "rag",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-03",
      "title": "五种接入",
      "given": "在API、网页、容器、程序包、SDK各自的真实代表对象上测试成功、超时、取消和采证。",
      "expected": "每种方式均有接入规范验证及适用组合验证记录；按声明能力验证，不以一种入口证明全部五种支持。",
      "scene": "pdf",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-04",
      "title": "F-02—05",
      "given": "导入正常、重复、错误及受限材料，试评并修改方案，再尝试用旧预检启动。",
      "expected": "错误隔离、参考权限有效、重试无重复；旧预检失效，正式运行固定所有依赖。",
      "scene": "pdf",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-05",
      "title": "F-09—11",
      "given": "执行选定端侧任务；若宠物场景冻结纳入则执行该场景，否则用冻结的等价车载Agent任务覆盖拒绝、重复事件和ACK无状态。",
      "expected": "区分感知/行为/终态；违规尝试可判失败，缺状态未知；合成事件不当作真实感知验证。",
      "scene": "pet",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-06",
      "title": "F-13",
      "given": "按首批OfficeAgent的PDF解读与处理任务，提交真实PDF及输出要求，注入数字错误、条件遗漏、损坏文件与解析器故障；具体对象、文件类型及输出要求先冻结。原Excel汇总和模板PPT任务转后续交付，不作为首批本项必测任务。",
      "expected": "能定位原文与产物；分别核对事实/数字/条件和结构/版面/可用性；产品错误和评测工具故障分开，不能只凭生成文件存在判成功。",
      "scene": "pdf",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-07",
      "title": "F-14",
      "given": "若Factory候选纳入验收，通过其网页提出需求并生成发布Agent，再进入子Agent实测；真实版本、账号和范围先冻结。",
      "expected": "需求、Factory版本、发布版本和子Agent结果关联；生成/发布/业务失败分开，网页无过程证据明确限制。",
      "scene": "factory",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-08",
      "title": "F-12",
      "given": "在已有多Agent协同系统执行正常交接、冲突、重复消息、成员失败与恢复用例。",
      "expected": "整体和成员过程均有证据；越权上下文、遗漏/重复副作用被识别，恢复结果可核验；整体任务通过不替代成员协作过程验收。",
      "scene": "multi",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-09",
      "title": "F-16—20",
      "given": "使用已知正确、错误、严重错误、缺证与评分故障样例；完成校准及独立人评。",
      "expected": "构造已确认且有效的强制失败、但其他必要人工复核尚未完成的情况；再完成对应复核。覆盖无分歧抽检、同项初评人参与仲裁和资格暂停等反例。\n固定验收集内错误放行数为0，且不外推未知风险为0；资格和独立性不足阻断，报告/页面/API同快照同结论。\n必要人工复核完成前，总体显示INCONCLUSIVE（评测未完成）并禁止放行，同时保留并明确展示已确认的强制失败；必要复核完成后按全部正式事实计算总体结论，有效强制失败仍使总体BLOCK。无分歧项按策略抽检，正式人工结果按对应质量审核锁定；同项初评者不能仲裁，资格失效不能继续正式引用。",
      "scene": "pdf",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-10",
      "title": "权限",
      "given": "用真实多账号尝试跨车载/企业访问、共享、撤权、参考读取、导出和直达接口。",
      "expected": "默认隔离，获准范围可用、撤权生效；报告分享不扩成参考访问，服务端拒绝越权。",
      "scene": "permissions",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-11",
      "title": "内网",
      "given": "运行被测、裁判、助手及其依赖，尝试连接未批准目的地和未核实供应商API。",
      "expected": "未批准出口被阻断且有审计；异常不自动外部回退，日志与附件同样受控。",
      "scene": "resources",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-12",
      "title": "恢复",
      "given": "在运行/写动作/计量/证据上传中重启、取消、重复回调并制造复位失败。",
      "expected": "不重复业务副作用，不丢账本；未决动作可查询、环境隔离、费用不提前全释放，恢复有证据。",
      "scene": "pet",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-13",
      "title": "F-21—23",
      "given": "比较仅模型变化与模型/解析器同时变化两组实验，导入反馈并回归。",
      "expected": "另设两项适用必测：一项已完成必要复核且为VALID/PASS，另一项UNKNOWN；加入选测PASS、重复评分、技术attempt和重叠切片。随后将第二项完成必要复核并确认为VALID/FAIL，为同一run追加新正式快照；另构造获批不适用排除及零适用分母的情况。\n可比性正确说明；不选择最佳attempt或隐藏未知，候选反馈经审核后复用，新结果不改历史。\n上述初始有效覆盖为1/2，第二项有效FAIL纳入后为2/2；选测和重复记录不增加分子，重叠切片不重复增加总体分母。同一run取统计时点最新已发布快照，每比较单位按冻结选择规则取窗内最新正式结果，不把新旧快照叠加。有效FAIL计覆盖但不表示质量通过；获批不适用项单列并按批准依据扣分母，零分母返回null且不能自动通过；跨快照先汇总同口径计数再相除。",
      "scene": "trends",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-14",
      "title": "F-24—25",
      "given": "完成方案推荐、候选编辑试跑、采纳、取消、资产沉淀、人评与人工接续。",
      "expected": "采纳仅生成草稿，修改使旧验证失效；助手不可越权正式动作，关闭助手不取消已正式运行。",
      "scene": "collab",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-15",
      "title": "生产交付",
      "given": "按批准混合负载、运维/备份计划与一个月业务试用记录组织复验。",
      "expected": "在320、768、820、1024、1440宽度下完成关键页面检查，并以键盘完成核心任务、定位字段、处理空态/加载/错误/越权状态、刷新恢复及返回原上下文。\n阈值、人员、环境及退出标准先冻结；缺陷清单和复验有追踪，未具备的真实能力不得以原型代替。\n各宽度下核心任务和必要信息可访问，窄屏表格局部滚动，键盘焦点及动作可达；保留检查记录和阻塞问题，未通过的体验项不以原型截图代替。",
      "scene": "review",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-16",
      "title": "F-26",
      "given": "分别使用基础、质量及安全包，从空任务建设资产；测试同级匹配冲突、缺人、迁移、停用及跨任务复用。",
      "expected": "按PM-01—05验证独立管理页面、包与规则分别发布、草稿恢复及并发预览失效；同部门未指派账号尝试访问，执行匹配测试和停用影响预览。\n基础包两人完成普通发布；有条件才增加审核，冲突不降级；管理员不得自动获业务权限；旧任务/批准保留，强制撤权仍生效。\n包发布只变包版本，规则发布只变规则版本，匹配测试不改变任务；同部门匹配同包不自动获得任务权限。未保存草稿可恢复但不生效，编辑或基准变化须重新预览；无权页面/接口拒绝，历史定义与变更可追溯。",
      "scene": "permissions",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-17",
      "title": "F-27 微调",
      "given": "提供真实基准模型和微调版本、获准且独立的任务材料；固定其他比较条件，执行目标任务和已选既有能力回归，再加入一组条件不一致的比较。",
      "expected": "版本与来源可追溯；收益、退化和逐例证据可核对，不可比条件被说明。无独立依据、缺对照或缺输出不被包装成微调提升。业务通过仍按获批门槛判断。",
      "scene": "model",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-18",
      "title": "F-28 量化",
      "given": "提供真实原模型与量化产物、方案/精度/校准版本和指定部署环境，执行可比任务及运行测量；覆盖质量退化、测量缺失和运行时变化。",
      "expected": "同时展示质量与资源差异；不因更快就自动通过，不混淆量化和环境变化的影响；缺必测证据不能验收通过。量化方式和允许损失待范围冻结。",
      "scene": "model",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-19",
      "title": "F-29 端侧",
      "given": "在真实目标设备运行固定部署版本，按已批准预热/负载/窗口采样，并覆盖设备不可用、运行超时、测量中断和复原失败。",
      "expected": "可对照原始证据复核各项结果；仿真与设备标签准确，异常能隔离并按规则恢复，缺目标设备证据不得记端侧通过。所需硬件清单和必测指标须先冻结。",
      "scene": "model",
      "scope": "真实业务验收待执行"
    },
    {
      "id": "AC-20",
      "title": "F-15 企业知识与内容",
      "given": "使用真实获准问题、知识/文档和参考，分别完成首批问答/RAG、摘要、字段提取（结构化抽取）三类任务；覆盖适用的正常、无答案、过期/冲突和越权反例，并制造检索证据缺失或解析故障。",
      "expected": "分别验证内容、检索或来源依据及权限；无检索证据不冒充检索通过。摘要核对必要事实、遗漏、无依据新增及条件/数字保真；字段提取核对字段、实体、类型、单位、空值及来源，不先修正输出。缺证、产品错误与工具故障分开，原始结果及逐项依据可追溯；三类任务均须有真实证据，具体任务与阈值先冻结。",
      "scene": "rag",
      "scope": "真实业务验收待执行"
    }
  ],
  "sources": [
    {
      "name": "主 PRD",
      "url": "https://my.feishu.cn/docx/Sao7dRVfuosBDLx0njgccZF0nje",
      "version": "2026-10-27 · V1.0 整合评审稿",
      "coverage": "已读取全文"
    },
    {
      "name": "资产管理与版本",
      "url": "https://my.feishu.cn/docx/NvPKdI7Enoz1eBxnwXncrb2snmb",
      "version": "2026-10-27",
      "coverage": "已读取相关条款（抽样），未全量验收"
    },
    {
      "name": "对象接入与评测执行",
      "url": "https://my.feishu.cn/docx/YEGedXjVNotB9axocKPcfei1nXQ",
      "version": "2026-10-27",
      "coverage": "已读取相关条款（抽样），未全量验收"
    },
    {
      "name": "评分、人工复核与报告",
      "url": "https://my.feishu.cn/docx/BOctdsI5Qoh3HTxpZc4coklenNh",
      "version": "2026-10-27",
      "coverage": "已读取相关条款（抽样），未全量验收"
    },
    {
      "name": "实验、诊断与持续评测",
      "url": "https://my.feishu.cn/docx/BOa1dMFVxoWlEqxxA4jcvblCnFd",
      "version": "2026-10-27",
      "coverage": "已读取相关条款（抽样），未全量验收"
    },
    {
      "name": "工作台与AI辅助",
      "url": "https://my.feishu.cn/docx/JHpidXjLZoig1fxHpgHcK3DjnVf",
      "version": "2026-10-27",
      "coverage": "已读取相关条款（抽样），未全量验收"
    },
    {
      "name": "权限管理与角色流程",
      "url": "https://my.feishu.cn/docx/FsxhdI9vso1w6dxPaHZcwA7anBb",
      "version": "2026-10-27",
      "coverage": "已读取相关条款（抽样），未全量验收"
    },
    {
      "name": "运行保障与成本管理",
      "url": "https://my.feishu.cn/docx/WjK5duVg9og2exxu5sqcyYWjnse",
      "version": "2026-10-27",
      "coverage": "已读取相关条款（抽样），未全量验收"
    },
    {
      "name": "业务场景、验证案例与功能验收",
      "url": "https://my.feishu.cn/docx/DoCZdvD6uo6u9axsZvkcw9MHnhh",
      "version": "现行主文索引",
      "coverage": "已读取相关条款（抽样），未全量验收"
    },
    {
      "name": "公共数据字典与接口",
      "url": "https://my.feishu.cn/docx/JJnKdzT6SojY20xzy2McJiZln6c",
      "version": "现行主文索引",
      "coverage": "已读取相关条款（抽样），未全量验收"
    },
    {
      "name": "独立指标目录",
      "url": "https://my.feishu.cn/docx/R4REd2iS2o7myPxQis0cilOhnld",
      "version": "2026-10-26 · 评审候选",
      "coverage": "已读取全文"
    }
  ]
};
