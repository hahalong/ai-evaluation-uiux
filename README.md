# AI 评测平台 · UI/UX 交互原型

当前界面为 **P01 R11 / P02 R2.1 整合版 · 2026.11.22**。基于原 UI/UX 页面、统一任务台账和资产中心更新，用于方案评审、操作演练与交互走查。

- 在线原型：[GitHub Pages](https://hahalong.github.io/ai-evaluation-uiux/)
- 本次变更与检查：[R11 / R2.1 整合说明](docs/uiux-r11-r21-review.md)
- 可维护源码：`dist/`，无需 npm 安装或编译。
- 历史流程与 Demo：[完整评测流程_PRD补全](https://baic.feishu.cn/wiki/NGhXwwxLBiBJ4BkDZAHcYfwdndt)

## 这次更新

- 统一六步任务流程：需求与对象 → 数据与评分 → 检查与试评 → 确认与冻结 → 运行与证据 → 复核与报告。
- 自动执行、人工执行、已有记录接收分别显示所需材料；自动评分、人工评分和混合评分按指标配置，模板只预填。
- 对象先登记身份，再维护固定版本与接入配置；新版本不继承旧验证结果。
- 冻结方案与启动运行分开；两人确认绑定当前修订，修改配置使旧确认失效。
- 同一任务保留修订、独立运行、取消核实、证据隔离、报告快照与业务验收。
- 资产编辑器合入 R11 业务模板、必填优先、已发布用例只读及 Office / RAG / 携宠导入示例，同时保留已有源码发现与程序绑定。
- 始终显示保存入口和成本摘要；离开未保存页面时可继续编辑、放弃或保存离开。

此站点仍是浏览器本地交互原型。样例校验不代表真实服务接入验证；外部调用、资源调度、实际成本和评分器服务没有由本次前端更新实现。未知结果保留为“暂无法判定”，页面不会伪造真实执行成功。

## 使用

打开在线原型后，从“评测任务 → 新建评测”进入新流程；也可先在“Agent/模型广场”登记对象。要学习完整流程，进入示例中心，先走 E03：准备样本与金标、复用通过验证的能力、预检、冻结、执行回放、接收证据、计算并查看报告。

回放资格不等于真实服务的运行资格。5000 ms、3000 ms 等演练窗口及示例门槛不作为正式业务验收标准。执行状态、质量结论和证据覆盖分别显示，缺少独立读回的数据保留为 UNKNOWN。

最新 Demo、当前截图和历史资料在上方飞书文档第 11 节统一提供。旧 `walkthrough.html`、`demos/` 和历史截图保留原始内容与日期，供追溯使用。

## 本地维护与验证

```sh
git clone https://github.com/hahalong/ai-evaluation-uiux.git
cd ai-evaluation-uiux
node --test tests/*.test.cjs
python3 scripts/prepare-pages.py
python3 -m http.server 8000 --directory dist
```

访问 `http://127.0.0.1:8000/`。主界面在 `dist/index.html`；E03 接入验证台在 `dist/e03-prep/index.html`；外部执行回放在 `dist/a84-external.html`。

`scripts/prepare-pages.py` 从已提交的 V23 分片快照恢复缺失的旧示例资源，并逐文件核对摘要。它不会覆盖 `dist/` 中的新源码，也不会访问原 Sites 站点。分片仍用于保存原始历史资源，当前界面直接维护 `dist/`。

推送到 `main` 后，现有 GitHub Actions 执行测试、恢复旧资源并发布 Pages。分片和引导包应随仓库一同保留。

浏览器草稿保存在当前网页来源的 localStorage 中。原 Sites、本地预览和 GitHub Pages 的草稿不会自动迁移。
