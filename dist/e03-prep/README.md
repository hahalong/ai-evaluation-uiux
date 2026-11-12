# E03 接入交付包

本包按宠物出行 V2 第 153 行准备四组输入，并用本地记录驱动模拟台架。Node.js 18 或以上可直接运行，无需安装依赖。解压后在包根目录运行：

    node e03-prep/run.cjs --out 联调产物

命令检查源文件摘要，实际调用三个入口，比较预期与实际。全部通过时退出码为 0。使用浏览器打开 e03-prep/index.html 可查看接口样例、复跑及导出报告。版本摘要和结果详见联调产物/e03-qualification.json。

| 交付 | 入口 | 输入与输出 |
| --- | --- | --- |
| 适配器 bench-aidl-signals@4 | adapter.js 中的 normalize(raw, requestId) | HMI、工具回执、独立车况原始信号 → bench.confirmed-hvac@1。独立读回可为 null，错请求号返回 REQUEST_MISMATCH。 |
| 执行器 agentcompass-bench-replay@2 | executor.js 中的 createExecutor(driver) | submit 接受 e03.bench-dispatch@1。query 查询同一尝试，run 领取和复位模拟台架，生成带证据 ID 的原始及映射记录，cancel 处理待执行任务。run 收尾后返回释放或隔离状态。 |
| 评分实现 confirmed-hvac-state@1 | scorer.js 中的 scoreTrial(artifact, gold, observationMs) | 同试次证据 + 同样本独立金标 + 观察窗 → verdict、value、eligible、reason、evidenceId。调用已有 a84-metric-engine.js。 |

samples.json 与 independent-gold.json 独立交付。执行端仅接收 dispatch-TEMP-02.json 所示字段。raw-TEMP-02.json 保留模拟来源，evidence-TEMP-02.json 是适配器的结构化输出，score-TEMP-02.json 保留判定依据。e03-qualification.json 串联本次验证和文件摘要。所有时间使用同试次的相对毫秒，三区顺序为前左、前右、后排，适配器把原始 0.1℃ 数值换算为摄氏度。

在原型进入「执行与评分能力 → 框架接入配置 → AgentCompass · 宠物出行 V2」。维护人登记草稿，上传或粘贴 e03-qualification.json 后核验并提交。质量负责人批准回放资格，评测工程师随后可选择这批执行器、适配器和评分实现。正式台架资格使用目标台架、被测版本及运行身份单独联调，并核实真实采证、在途取消和清理恢复。
