# AI 评测平台 · UI/UX 交互原型

当前界面为 **流程整合版 2026.11.11 / R1**，于 2026-11-12 同步到本仓库。用于方案评审、操作演练和验收走查；设备、执行器、框架响应与裁判结果使用本地合成回放。

- 在线原型：[GitHub Pages](https://hahalong.github.io/ai-evaluation-uiux/)
- 最新流程、截图及 Demo：[完整评测流程_PRD补全](https://baic.feishu.cn/wiki/NGhXwwxLBiBJ4BkDZAHcYfwdndt)
- 可维护源码：`dist/`，无需 npm 安装或编译。

## 这次更新

- Agent/模型广场、资产中心、执行与评分能力及同类列表采用统一布局。
- 导航先进入项目列表；业务演练从“帮助与示例 → 示例中心”进入。
- 支持批量导入的资产把批量导入与单条创建放在同一操作区，并提供分类模板和说明。
- 套件支持新建、草稿维护和固定版本复用；从任务补材料后返回原任务原步骤。
- V2 工作簿导入保留来源和差异，按云端、台架、实车展开计划。
- E01–E06 以样本、独立金标、执行器、适配器和可执行指标串起评测；E03 与 Ripple 回传校验固定版本、重复回传及缺失证据。
- 示例中心展示 OpenCompass、AgentCompass、Ragas 的不同分工，以及 E03 三类能力的配置前准备和联调。

## 使用

打开在线原型后，日常工作从对应目录新建或维护。要学习完整流程，进入示例中心，先走 E03：准备样本与金标、复用通过验证的能力、预检、冻结、执行回放、接收证据、计算并查看报告。

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
