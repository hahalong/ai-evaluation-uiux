# AI评测平台 · UI/UX交互稿

本仓库用于平台方案交互演示、验收走查和场景 Demo，基于 Sites 当前发布的 **V23** 迁移。它是浏览器本地交互原型，不代表生产评测服务已经建成。

- 原站点：https://ai-evaluation-uiux.medusalong.chatgpt.site
- GitHub Pages：https://hahalong.github.io/ai-evaluation-uiux/
- 来源提交：`9484622157f151de99e299eaad1e9a2d6fdcbe1e`
- 原始文件校验清单：`migration/sites-v23-manifest.json`

## 获取可编辑源码

仓库目前通过 11 个 `sites-v23-chunk-*.bin` 文件保存完整源码快照（共 924 个原始文件），不是仅有页面截图。发布任务只读取仓库，不向分支回写。首次在 Codex 或本地开发时先解包：

```sh
git clone https://github.com/hahalong/ai-evaluation-uiux.git
cd ai-evaluation-uiux
cat sites-v23-chunk-*.bin > /tmp/ai-evaluation-uiux-v23.tar.gz
echo '74d96665baf73d6fdb2d6bbe1183924a7161908b651c8c450a8c5a1eb492fbd9  /tmp/ai-evaluation-uiux-v23.tar.gz' | sha256sum --check
tar -xzf /tmp/ai-evaluation-uiux-v23.tar.gz --exclude=README.md
```

解包后有 `dist/`、`tests/`、`scripts/`、`docs/` 和校验清单。后续可正常编辑并将这些源码目录提交到仓库；发布任务检测到 `dist/index.html` 后会直接使用已提交的源码，跳过原快照解包。

## 编辑和发布

`dist/` 就是维护中的 HTML/CSS/JavaScript 源码，无需 npm 安装或构建。

```sh
node --test tests/*.test.cjs
python scripts/prepare-pages.py
python -m http.server 8000 --directory dist
```

推送到 `main` 后，GitHub Actions 测试并将 `dist/` 发布到 GitHub Pages。发布只使用仓库中的文件，不需要原 Sites 站点提供运行时资源。

## 入口与主要文件

- `dist/index.html`：平台入口、基础状态与脚本加载顺序。
- `dist/prd-v15.js`：当前任务页面和用户操作；文件名不表示发布版本。
- `dist/run-lifecycle.js`：自动用量计价、清理复位、取消、报告权限及独立状态。
- `dist/walkthrough.html`、`dist/walkthrough-current/`：12 个场景走查材料和合成验证记录。
- `dist/history/20261028/`：原历史材料，保留原始内容与原时间。
- `tests/`：126 项自动化测试；`docs/`：已有设计与评审记录。

## 维护约束

正常评测业务流程无需运维逐次确认。系统按批准价格幂等计费、自动执行已获准清理；只有技术异常才转交运维/系统维护人，价格或账单问题转有权限的成本/财务人员。运维身份不赋予报告权限；不导出报告不能阻止业务完成。执行、质量、验收、清理、费用、导出状态分别维护。

取消必须先停新派发，再核实执行影响、清理和费用。未知费用不能当作零；未核清预算不能全部释放；复位失败须隔离。业务接受或技术恢复不能改写质量结论。

旧日志、截图、导出和时间不得改写。合成验证记录不等于生产验收；新场景录像需真实重跑后再生成。本次迁移不重新生成业务走查证据。

任务状态保存在当前浏览器的 localStorage 中；原站点与 GitHub Pages 域名不同，浏览器中的个人演示状态不会自动迁移。
