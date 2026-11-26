"""Render the scoped engineering Markdown source; keep published documents in sync."""
from pathlib import Path
import html
import re
import json
import hashlib

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "docs/engineering-baseline"
OUT = ROOT / "dist/design"
source = BASE / "技术栈基线与开发规范.md"
md = source.read_text()

def inline(s):
    tokens = []
    def stash(v):
        tokens.append(v)
        return f"\x00{len(tokens)-1}\x00"
    s = re.sub(r'`([^`]+)`', lambda m: stash('<code>'+html.escape(m[1])+'</code>'), s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: stash('<a href="'+html.escape(m[2], quote=True)+'">'+html.escape(m[1])+'</a>'), s)
    s = html.escape(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    return re.sub(r'\x00(\d+)\x00', lambda m: tokens[int(m[1])], s)

def render(text):
    lines = text.splitlines(); out = []; toc = []; i = 0
    while i < len(lines):
        s = lines[i]
        if not s.strip(): i += 1; continue
        if s.startswith('```'):
            lang=s[3:]; i+=1; buf=[]
            while i<len(lines) and not lines[i].startswith('```'): buf.append(lines[i]); i+=1
            assert i<len(lines), 'Unclosed code block'
            out.append('<pre><code class="language-'+lang+'">'+html.escape('\n'.join(buf))+'</code></pre>'); i+=1; continue
        h=re.match(r'^(#{1,3}) (.*)',s)
        if h:
            level=len(h[1]); title=h[2]; num=re.match(r'(\d+(?:\.\d+)?)\.',title)
            anchor='eng-'+num[1].replace('.','-') if num else 'engineering-title'
            # Subheadings use both components, including their final digit.
            if level==3: anchor='eng-'+re.match(r'(\d+\.\d+)',title)[1].replace('.','-')
            out.append(f'<h{level} id="{anchor}">{inline(title)}</h{level}>')
            if level==2: toc.append((anchor,title))
            i+=1; continue
        if s.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].startswith('|'):
                row=[c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[:\-\s]+',c) for c in row): rows.append(row)
                i+=1
            assert all(len(row)==len(rows[0]) for row in rows), 'Unequal columns'
            out.append('<div class="table-wrap"><table><thead><tr>'+''.join('<th scope="col">'+inline(c)+'</th>' for c in rows[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+inline(c)+'</td>' for c in row)+'</tr>' for row in rows[1:])+'</tbody></table></div>'); continue
        li=re.match(r'^(?:- |\d+\. )',s)
        if li:
            ordered=not s.startswith('- '); tag='ol' if ordered else 'ul'; items=[]
            pattern=r'^\d+\. ' if ordered else r'^- '
            while i<len(lines) and re.match(pattern,lines[i]):
                items.append('<li>'+inline(re.sub(pattern,'',lines[i]))+'</li>'); i+=1
            out.append('<'+tag+'>'+''.join(items)+'</'+tag+'>'); continue
        out.append('<p>'+inline(s)+'</p>'); i+=1
    return ''.join(out),toc

body,toc=render(md)
nav='<nav class="doc-site-nav" aria-label="设计文档导航">'+''.join(f'<a href="{file}"'+(' aria-current="page"' if file=='engineering.html' else '')+f'>{name}</a>' for file,name in [('documents.html','文档中心'),('overview.html','概要设计'),('index.html','详细设计'),('engineering.html','技术栈与开发规范'),('tasks.html','开发任务'),('review.html','澄清与评审')])+'</nav>'
css='''*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:24px}body{margin:0;background:#f4f7fa;color:#203547;font:16px/1.85 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}main{max-width:1120px;margin:auto;padding:26px 28px 70px}h1{font-size:30px;line-height:1.45}h2{font-size:24px;margin:42px 0 16px;padding-top:16px;border-top:1px solid #d8e3eb}h3{font-size:19px}p,li{max-width:94ch}a{color:#126298}code{background:#e8eff5;border-radius:4px;padding:2px 4px;font-size:.9em;overflow-wrap:anywhere}pre{background:#132b3c;color:#e5f1f9;padding:20px;border-radius:8px;overflow:auto}pre code{background:none;color:inherit;padding:0;overflow-wrap:normal}table{border-collapse:collapse;width:100%;background:white;font-size:14px;line-height:1.7}th,td{border:1px solid #d5e0e8;padding:11px 13px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#e8f0f6;color:#193e58}tr:nth-child(even){background:#f8fafc}.table-wrap{overflow:auto;margin:18px 0}.doc-site-nav{display:flex;flex-wrap:wrap;gap:8px 20px;padding:8px 0 20px;border-bottom:1px solid #d8e3eb;font-size:14px}.doc-site-nav a{text-decoration:none}.doc-site-nav [aria-current]{font-weight:700}.toc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 24px;padding:18px 24px;background:#e8f0f6;border-radius:10px}.toc a{font-size:14px;text-decoration:none}li{margin:8px 0}a:focus-visible{outline:3px solid #1d7db3;outline-offset:3px}@media(max-width:700px){main{padding:16px}h1{font-size:25px}h2{font-size:21px}.toc{grid-template-columns:1fr}table{min-width:650px}}@media print{.doc-site-nav,.toc{display:none}main{max-width:none;padding:0}body{background:white}h2{break-after:avoid}tr{break-inside:avoid}pre{white-space:pre-wrap}}'''
contents='<nav class="toc" aria-label="章节目录">'+''.join(f'<a href="#{a}">{html.escape(t)}</a>' for a,t in toc)+'</nav>'
pos=body.index('<h2 ')
page='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI评测平台 · 技术栈基线与开发规范 V1.0</title><style>'+css+'</style></head><body><main>'+nav+body[:pos]+contents+body[pos:]+'</main></body></html>'
(OUT/'engineering.html').write_text(page)

# Extract literal configuration templates from the same source.
for lang,name in [('toml','pyproject-quality.toml'),('json','tsconfig.json'),('bash','quality-commands.sh')]:
    content=re.search(r'```'+lang+r'\n(.*?)\n```',md,re.S)[1]+'\n'
    (BASE/'templates'/name).write_text(content)

def block(text,key,content,before):
    start=f'<!-- {key}:start -->'; end=f'<!-- {key}:end -->'
    new=start+content+end
    if start in text: return re.sub(re.escape(start)+r'.*?'+re.escape(end),lambda m:new,text,flags=re.S)
    assert before in text, before
    return text.replace(before,new+before,1)

detail=OUT/'index.html'; text=detail.read_text()
fragment='''<h3 id="engineering-baseline">11.4 技术栈与版本锁定</h3><p>补充日期：2026-11-26。采用 React 19 / TypeScript 5.9 / Vite 8 / Ant Design 6、Node.js 24 LTS / pnpm 10；平台后端采用 Python 3.12 / FastAPI / Pydantic 2 / SQLAlchemy 2.0 / Alembic / psycopg 3；数据库 PostgreSQL 17，消息 RabbitMQ 4，文件企业 S3，部署 Docker Compose v2。完整版本约束、职责和锁定证据见<a href="engineering.html#eng-2">技术栈基线第 2 节</a>。</p><p>平台与 OpenCompass / AgentCompass / Ragas 分别维护依赖和镜像；Worker 不得持有主库、参考库或 MQ 凭据。版本线已选定，实际补丁版本与镜像 digest 必须由资格测试和发布清单冻结；不声明组合已验证。</p><h3 id="engineering-standards">11.5 开发规范与工程门禁</h3><p>新增配套规范<a href="engineering.html">《技术栈基线与开发规范 V1.0》</a>，作为本详设的工程实施附件。包括 16 个技术模块的目录/导入边界、后端异步与事务、前端状态和类型、逐接口变更、消息重投、数据库迁移、安全/遥测、本地开发、CI、Git/PR、发布与恢复。</p><div class="table-wrap"><table><thead><tr><th>实施要求</th><th>具体规则</th></tr></thead><tbody><tr><td>可复现</td><td>pnpm frozen lock、uv locked；禁止生产 latest；发布绑定 commit / 依赖锁 / 镜像 digest / 合同 / 迁移 / 配置摘要。</td></tr><tr><td>模块边界</td><td>application 调用 domain/ports，infrastructure 实现 ports；跨模块只走公开 Port，不导入对方 Repository。</td></tr><tr><td>合并门槛</td><td>适用 lint/type/合同/单测/集成/迁移/构建/安全检查通过；关键流程 E2E；至少一名非作者评审。</td></tr><tr><td>发布门槛</td><td>精确锁文件与资格、备份恢复、最小业务闭环、生产配置就绪；不能用本次文档校验替代运行验收。</td></tr></tbody></table></div><h3 id="engineering-delivery">11.6 工作包与待明确项</h3><p><a href="engineering.html#eng-15">工程交付映射</a>补充 WP-01—05、WP-37—39、WP-41、WP-44 的验收要求；不改变 46 个工作包编号或业务阶段。<a href="engineering.html#eng-14">ENG-Q01—Q07</a>分别记录企业环境、身份、存储、AgentCompass 版本、容量恢复目标、真实模型与 CI 条件。既有 IF-Q01—IF-Q06 继续保留。</p>'''
text=block(text,'engineering-supplement',fragment,'<h2 id="s57">')
text=text.replace('前端建议TypeScript＋React，合同类型由OpenAPI生成；具体包版本在WP-02锁定。','前端采用 TypeScript＋React，合同类型由 OpenAPI 生成；技术选型见第 11.4 节，前端精确依赖由 WP-04 锁定，WP-02 提供合同生成基础。')
text=text.replace('建议单仓库：apps/api','采用单仓库：apps/api')
old='<a href="#s53">11. 代码框架与关键类接口</a>'
if 'href="#engineering-baseline"' not in text: text=text.replace(old,old+'<a href="#engineering-baseline">11.4 技术栈与开发规范</a>')
detail.write_text(text)

overview=OUT/'overview.html'; text=overview.read_text()
text=block(text,'engineering-summary','''<h3 id="engineering-overview">10.5 工程基线与目录统一</h3><p>2026-11-26 补充：<a href="engineering.html">技术栈基线与开发规范 V1.0</a>统一规定版本线、锁定方式、16 模块代码边界、CI 与 Compose 发布门槛。技术选型已明确；精确运行版本、引擎资格与企业环境仍需工程验收。</p><p>本章前述 scaffold 是历史设计样例。新工程目录统一采用 apps/*、packages/backend/src/eval_platform/&lt;module&gt;、packages/contracts、plugins/*、web/src、migrations 和 deploy/compose；模块实现子目录统一为 domain/application/ports/infrastructure。旧 components 路径与 adapters 子目录按<a href="engineering.html#eng-4">目录映射</a>迁移，不保留第二套实施结构。</p>''','<h2 id="section-69">')
text=text.replace('技术栈候选继续使用 React/TypeScript、Python/FastAPI、SQLAlchemy/Alembic、PostgreSQL 17兼容基线、RabbitMQ、企业S3。版本与digest由研发交付清单锁定，本文不把候选当已部署事实。','技术栈已由配套《技术栈基线与开发规范 V1.0》确定，详见其第 2 节。继续采用 React/TypeScript、Python/FastAPI、SQLAlchemy/Alembic、PostgreSQL 17、RabbitMQ、企业 S3 和 Docker Compose；依赖精确版本与镜像 digest 经过工程资格测试后写入发布清单。选型决定不等于已部署验证。')
# Update the operative directory table; keep historical scaffold descriptions labelled as historical.
start=text.index('<h3 id="section-65">');end=text.index('<h3 id="section-66">',start)
part=text[start:end]
for a,b in [('packages/eval_platform/components/{16技术包}/','packages/backend/src/eval_platform/{16技术包}/'),('domain、application、ports.py、adapters、runtime','domain、application、ports、infrastructure'),('packages/eval_platform/planners/{model,agent,application}/','packages/backend/src/eval_platform/plan_compiler/domain/planners/{model,agent,application}/'),('packages/eval_platform/contracts/','packages/contracts/'),('workers/{importing,execution,browser,scoring,reporting}/','apps/workers/{importing,execution,browser,scoring,reporting}/'),('deployment、migrations、docs/decisions、tests','deploy/compose、migrations、docs/decisions、tests')]:part=part.replace(a,b)
text=text[:start]+part+text[end:]
text=text.replace('10.4 框架代码位置与交付边界','10.4 历史框架样例位置与交付边界')
overview.write_text(text)

task=OUT/'tasks.html';text=task.read_text()
task_notes={
'WP-01':'建立技术栈 ADR 与 ENG-Q01—Q07 责任/阻断清单。',
'WP-02':'交付 uv workspace/锁文件、Ruff/mypy 配置、合同生成与模块导入边界检查。',
'WP-03':'补齐 Session/CSRF、audience 隔离、项目越权、参考隔离与撤权验证。',
'WP-04':'交付 pnpm 锁文件、React/TS/Vite/antd 工程、前端命令入口及组件/E2E 配置。',
'WP-05':'交付 doctor/start/stop/smoke、业务 CI、SBOM、精确版本/digest 发布校验与 Compose 环境。',
'WP-37':'交付 OpenCompass 独立依赖/镜像、固定版本、输入结果映射和能力资格矩阵。',
'WP-38':'确认 AgentCompass 实际仓库与 commit；交付环境重置、隔离镜像与资格矩阵。',
'WP-39':'交付 Ragas 独立依赖/镜像、指标与模型绑定、无效分数及升级重资格测试。',
'WP-41':'记录生产候选的安全/容量/恢复实测，关键不变量用例全部通过。',
'WP-44':'完成精确版本清单、部署/回退/恢复手册与接收方恢复演练。'}
for key,note in task_notes.items():
    pattern=r'(<tr[^>]*id="'+key+r'"[^>]*>)(.*?)(</tr>)'
    m=re.search(pattern,text,re.S);assert m,key
    content=block(m[2],'eng-'+key,'<p><strong>工程规范补充：</strong>'+note+' <a href="engineering.html#eng-15">验收要求</a></p>','</details>')
    text=text[:m.start()]+m[1]+content+m[3]+text[m.end():]
text=block(text,'engineering-task-note','<section id="engineering-task-supplement"><h2>工程规范补充 · 2026-11-26</h2><p>已在 WP-01—05、WP-37—39、WP-41、WP-44 中补入技术栈与开发规范交付要求；<a href="engineering.html#eng-15">查看逐工作包验收表</a>。原 46 个工作包与阶段不变；原人时估算尚未单独核算本次细化增量，排期前由负责人复核是否已包含。</p></section>','</main>')
task.write_text(text)

review=OUT/'review.html';text=review.read_text()
q=md[md.index('## 14.'):md.index('## 15.')]
qhtml,_=render(q)
# Avoid duplicate section number in the review document.
qhtml=qhtml.replace('14. 待明确项与阻断范围','补充：工程环境待明确项与阻断范围')
text=block(text,'engineering-questions','<section id="engineering-questions">'+qhtml+'<p><a href="engineering.html">查看完整技术栈与开发规范</a></p></section>','</main>');review.write_text(text)

portal=OUT/'documents.html';text=portal.read_text()
card='<a class="card" href="engineering.html"><span>V1.0 · 2026-11-26 补充</span><h2>技术栈与开发规范</h2><p>版本基线、代码边界、前后端规范、CI 门槛、Compose 发布与工作包验收。</p><b>打开文档 →</b></a>'
text=block(text,'engineering-card',card,'</section>');portal.write_text(text)
for file in OUT.glob('*.html'):
    if file.name=='engineering.html': continue
    text=file.read_text()
    def add(m):
        s=m[0]
        if 'href="engineering.html"' not in s: s=s.replace('</nav>','<a href="engineering.html">技术栈与开发规范</a></nav>')
        return s
    text=re.sub(r'<nav class="doc-site-nav".*?</nav>',add,text,flags=re.S)
    file.write_text(text)

manifest=ROOT/'docs/design-publication.json'; data=json.loads(manifest.read_text())
for s in data['sources']: s['published_sha256']=hashlib.sha256((OUT/s['page']).read_bytes()).hexdigest()
eng={'page':'engineering.html','title':'技术栈与开发规范','version':'V1.0','source_file':str(source.relative_to(ROOT)),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'published_sha256':hashlib.sha256((OUT/'engineering.html').read_bytes()).hexdigest()}
data['sources']=[s for s in data['sources'] if s['page']!='engineering.html']+[eng]
data['engineering_supplement']={'date':'2026-11-26','sections':16,'external_questions':7,'work_packages':list(task_notes),'runtime_validation':'pending; documentation and template syntax checks only'}
for check in data['checks']: check['bytes']=(OUT/check['page']).stat().st_size
manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print('Rendered engineering baseline and updated five linked documents.')
