/* Review acceptance cases are separate from official AC-01–20. */
PRD_DATA.reviewCases = [
  {
    "id": "UX-01",
    "title": "能力分类混杂且隐式保存 Agent",
    "given": "演示角色：林工；使用合成数据与浏览器本地存储。",
    "steps": [
      "登记评分器；选模型＋非Agent应用、异步任务；保存、刷新、核对登记及实际内容。"
    ],
    "expected": "对象仍为模型＋非Agent应用；Agent未选，协议与类型引用保持；状态为草稿、未验证。",
    "scene": "capabilities",
    "verification": "浏览器保存/刷新及契约测试通过；真实目录匹配仍未接通。",
    "requirement": "资产规格「任务类型注册、验证和能力匹配」；字典「任务类型定义」",
    "severity": "P1"
  },
  {
    "id": "UX-02",
    "title": "需求入口新建后被归入旧版",
    "given": "演示角色：林工；使用合成数据与浏览器本地存储。",
    "steps": [
      "需求与对象填“摘要保真”和“合成摘要服务”，类型非Agent应用；创建并刷新。"
    ],
    "expected": "进入当前六步流程，原目标与对象保留；不会成为历史任务。",
    "scene": "requirements",
    "verification": "需求入口创建、当前台账回读、资产入口保留精确引用均通过。",
    "requirement": "主PRD 新需求起步、统一任务台账；工作台规格",
    "severity": "P1"
  },
  {
    "id": "UX-03",
    "title": "空白任务隐式绑定 PDF 规则",
    "given": "演示角色：林工；使用合成数据与浏览器本地存储。",
    "steps": [
      "新建空白任务并填非Agent摘要需求；查看数据与指标；预检；再显式载入摘要Demo。"
    ],
    "expected": "初始无PDF数据；未验证能力阻断；选择摘要后仅使用摘要规则，并保留需求。",
    "scene": "tasks",
    "verification": "浏览器空白、预检阻断、显式摘要载入通过；类型变更清理自动测试通过。",
    "requirement": "主PRD F05/F06、AC-02；资产类型扩展规则",
    "severity": "P1"
  },
  {
    "id": "UX-04",
    "title": "业务确认缺少可读决策内容",
    "given": "演示角色：林工；使用合成数据与浏览器本地存储。复核用周经理；取消清理由系统自动执行，只有技术异常转维护人。",
    "steps": [
      "摘要异常样例试评 → 预检 → 确认与冻结，切换业务负责人。"
    ],
    "expected": "能读到事实条件、失败数和范围；业务确认不会将质量结果提前设为通过。",
    "scene": "summary",
    "verification": "浏览器双角色确认与冻结通过。",
    "requirement": "主PRD 试评与方案确认；工作台角色分工（UX支持不足）",
    "severity": "P1"
  },
  {
    "id": "UX-05",
    "title": "资产表单缺少按类型收起与标签",
    "given": "演示角色：林工；使用合成数据与浏览器本地存储。",
    "steps": [
      "新建数据集：观察成员区；切换用例库并填写；展开开发配置。"
    ],
    "expected": "样本集合无用例成员字段；用例库显示成员；切换保留其他输入；控件有名称。",
    "scene": "assets",
    "verification": "浏览器样本/用例库切换、名称保留与标签回读通过。",
    "requirement": "工作台专业资产编辑；Nielsen识别优于记忆、简洁性",
    "severity": "P2"
  },
  {
    "id": "UX-06",
    "title": "已取消状态仍显示正在处理",
    "given": "演示角色：林工；使用合成数据与浏览器本地存储。复核用周经理；取消清理由系统自动执行，只有技术异常转维护人。",
    "steps": [
      "冻结Demo并启动；运行中停止，观察系统自动query/cancel和清理。注入未知费用或复位失败后检查技术待办。"
    ],
    "expected": "RECONCILING时未决；复位后CANCELLED/RESET/RECONCILED，无进度条及质量快照。",
    "scene": "demos",
    "verification": "2026-10-28为历史浏览器记录；新版取消已在共享控制器重新验证，浏览器范围见现行走查。",
    "requirement": "执行/运行保障规格：状态、环境、结算独立",
    "severity": "P2"
  },
  {
    "id": "UX-07",
    "title": "错误恢复提示与当前操作不匹配",
    "given": "演示角色：林工；使用合成数据与浏览器本地存储。",
    "steps": [
      "空需求提交；正常取消不切换运维；仅有技术异常时测试维护权限。"
    ],
    "expected": "指出缺失输入；正常取消自动核查；仅技术异常明确对应维护人，价格口径异常转获准成本人员。",
    "scene": "requirements",
    "verification": "旧空输入验证保留；新版异常权限以本次共享逻辑测试为准。",
    "requirement": "Nielsen错误恢复；权限/运行保障角色职责",
    "severity": "P2"
  },
  {
    "id": "UX-08",
    "title": "辅助文字对比度不足",
    "given": "演示角色：林工；使用合成数据与浏览器本地存储。",
    "steps": [
      "工作概览读取搜索、页脚；查看任务帮助文字。"
    ],
    "expected": "所查普通文本对比度至少4.5:1。",
    "scene": "overview",
    "verification": "实时颜色复测：搜索及页脚#52647a；计算均超过5.5:1。非整站像素扫描。",
    "requirement": "WCAG 1.4.3；工作台可读性",
    "severity": "P1"
  },
  {
    "id": "UX-09",
    "title": "隐藏侧栏仍可聚焦、切页焦点丢失",
    "given": "演示角色：林工；使用合成数据与浏览器本地存储。",
    "steps": [
      "320侧栏关闭时反向Tab；桌面用Enter进入资产中心。"
    ],
    "expected": "关闭的侧栏不能获得焦点；切页后焦点在可见main。",
    "scene": "assets",
    "verification": "实时隐藏样式与键盘切页焦点通过；未运行真实读屏器。",
    "requirement": "WCAG 2.4.7；工作台键盘导航",
    "severity": "P1"
  },
  {
    "id": "UX-10",
    "title": "平板搜索按钮没有可访问名称",
    "given": "演示角色：林工；使用合成数据与浏览器本地存储。",
    "steps": [
      "响应式验收选择768/820，检查搜索控件。"
    ],
    "expected": "可访问名称为“搜索页面、资产与协作事项”。",
    "scene": "acceptance",
    "verification": "768实测通过，断点共用同一稳定标签。",
    "requirement": "WCAG 4.1.2；工作台响应式",
    "severity": "P1"
  },
  {
    "id": "UX-11",
    "title": "320顶栏横向溢出",
    "given": "演示角色：林工；使用合成数据与浏览器本地存储。",
    "steps": [
      "320场景Demo，查看根横滚及角色边界；切到平板和桌面。"
    ],
    "expected": "根clientWidth与scrollWidth一致，角色控件完全位于可用宽度。",
    "scene": "acceptance",
    "verification": "320复测305/305，角色右缘297；768复测753/753。44px未作为AA硬性结论。",
    "requirement": "工作台响应式/AC-15",
    "severity": "P2"
  },
  {
    "id": "UX-12",
    "title": "权限子页刷新丢失位置",
    "given": "演示角色：林工；使用合成数据与浏览器本地存储。",
    "steps": [
      "进入角色与权限，刷新；切其他子页并回退。"
    ],
    "expected": "刷新保留角色与权限；地址为#permissions/roles。",
    "scene": "permissions",
    "verification": "浏览器角色页刷新与地址回读通过；真实后端权限不在本轮范围。",
    "requirement": "权限规格PM-01/PM-05；工作台刷新定位",
    "severity": "P2"
  },
  {
    "id": "UX-13",
    "title": "跨标签页更新替换未保存输入",
    "given": "演示角色：林工；使用合成数据与浏览器本地存储。",
    "steps": [
      "标签A填未保存需求；标签B切换页面；查看A保护提示和表单备份，再刷新同步。"
    ],
    "expected": "A不再自动清空输入或覆盖B；备份含原输入；刷新后能继续。",
    "scene": "requirements",
    "verification": "真实双标签页保留输入、弹出保护、刷新恢复通过；3项存储冲突测试通过。仅本地保护，不代表服务端并发控制。",
    "requirement": "工作台状态一致性；Nielsen错误预防",
    "severity": "P1"
  }
];
