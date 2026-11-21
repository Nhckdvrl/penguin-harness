# 交接文档：SkillWeaver 插件的真实验证与收尾

> 写给：在 Windows 电脑上接手这项工作的智能体（用 StepFun Step API 运行）。
> 你的角色：**自主负责人**，不是照单执行的脚本。这份文档讲的是目标、背景、约束、已知风险和判断原则；具体怎么做由你决定。遇到问题先理解原因，再动手修，修完验证。不要绕过问题，也不要放弃。
> 交还给谁：做完后交回给仓库主人（GitHub 账号 Nhckdvrl），由另一个审查者把关，然后才提交 PR。**你不要自己开 PR、发评论、在社区 issue 里认领或撤回。**

---

## 1. 我们要做成什么

### 1.1 一句话目标

让 `skillweaver-rsi-toolkit` 插件在**真实的网页任务**上端到端跑通，拿到**一次就能通过社区审阅**的证据（基线 vs 进化后的结果），把证据和必要的代码修复整理好交回。

### 1.2 背景

- 我们在为 Prism-Shadow 的 PenguinHarness 社区做贡献。社区任务（quest）完成并合入 PR 后结算 EXP。
- 我们认领的是社区任务 **#74 「Integrate SkillWeaver Method」**（https://github.com/Prism-Shadow/penguin-harness-community/issues/74，100 EXP）：把论文 SkillWeaver（arXiv:2504.07079）复现并集成为 PenguinHarness 的 RSI 插件。
- 社区对算法插件的规范是 RFC-0003：插件只包含**方法**，不能和任何具体数据集硬绑定。
- 插件代码已经写完，在 fork 的 `feat/skillweaver-rsi-toolkit` 分支上（将来就用这个分支开 PR），三平台 CI 已通过。**缺的是真实任务上的效果证据。**

### 1.3 审阅人会怎么验收（已核实的先例，务必读懂）

- 审阅人 lzh368 对每个新算法 PR 都会给同一条意见（见 Reflexion PR #1555、DGM PR #1553）：
  > 请补充**真实任务上的端到端实验验证**……请说明所选任务和**模型版本**，提供**基线与进化后的结果**及**复现记录**。
- 他推荐的 GDPevo 是办公任务，没有网站，SkillWeaver 在上面跑不起来，所以我们改用论文的主基准 **WebArena**（只用 Shopping 一个站点）。PR 里要主动说明原因。
- RRSI 插件（PR #1535）合入后，维护者又**对照论文和作者代码**补了提交。所以保真度会按论文本身检查，不只看代码。
- 我们上一个插件 InfraRSI（PR #1551）**被退回了三次**，教训见 `pr1551-retrospective.md`（同目录）。**动手前通读一遍。** 核心一句话：每次只回应上一轮被点名的问题，没有一开始就按审阅人的标准把证据做完整。

---

## 2. 方法：SkillWeaver 是什么，我们怎么实现的

### 2.1 论文方法（三阶段）

智能体在**没有任务数据**的情况下自主探索一个网站：

1. **Skill Proposal**：根据当前页面、已有技能和网站知识，提出一个值得掌握的新技能（论文要求短小、可复用、能一次 API 调用完成）。
2. **Skill Synthesis**：智能体练习这个技能；成功检查器（reward model）判定成功后，把轨迹合成为参数化的 Playwright 函数（API），文档里带「使用记录」。静态检查不通过就带着违规项重写（最多 10 次）。
3. **Skill Honing**：挑未测试的 API，生成测试参数实际调用；失败就修。

最终产物是一个 API 库。之后做该网站的任务时，智能体可以调用这些 API。参考实现：https://github.com/OSU-NLP-Group/SkillWeaver （MIT），我们对照的版本是 `f2a63d65d0f6ff46ac30e817cede8797f8f25b97`。

### 2.2 我们在 PenguinHarness 里的实现

插件位置：`plugins/skillweaver-rsi-toolkit/`。**先完整读一遍 `skills/skillweaver-rsi-toolkit/SKILL.md` 和 `references/` 下的文件。** 它们就是方法本身，由「控制者」智能体执行。

| 上游 | 这里 |
|---|---|
| 被探索的网站 | 用户指定的 `site_url`（永远不是 Benchmark 的题目） |
| Playwright Python 智能体 | **Target 智能体**，通过 `penguin browser`（browser-automation 插件）操作内置浏览器 |
| Python API 函数 | **Node 脚本** `apis/<name>.mjs`：导出 `meta` 和 `run(args)`，通过随附的运行时 `skillweaver-api.mjs` 调用 `penguin browser … --json`，输出一行 JSON |
| 知识库 | Target 自己的 Skill `skillweaver-apis/`：`INDEX.md`（API 索引）、`apis/*.mjs`、`site.md`（网站知识）、`apis/library.json`（版本和测试记录） |
| 提案、成功检查、合成、测试参数 | 四个用 `run_subagent` 启动的角色：Proposer、Judge、Synthesiser、Tester（见 `references/roles.md`） |
| 代码校验 | `scripts/skillweaver.mjs check`（语法、唯一允许的导入、命名和参数规则、首次导航为相对路径、至少两次浏览器调用） |
| 测试选择 | `skillweaver.mjs pick-test`，按上游的练习效用（交互次数减版本号）做 softmax |

**控制者工具** `scripts/skillweaver.mjs` 的子命令：`init / check / register / tested / pick-test / index / fingerprint / verify-runtime`。

**完整性护栏**（运行时强制，不是写在提示词里的约定）：
- 技能库只能通过 Publish 步骤修改。每个练习单元、每次角色调用前后都要对比 `fingerprint`，不一致就停止。
- 技能库里的运行时文件必须和插件随附的版本逐字节一致（`verify-runtime`）。
- 只有通过 `check` 的 API 才会注册并写进索引。

**只是指令、没有机制保证的部分**（PR 和报告里必须如实写）：角色的读取范围、真实网站安全规则、10 步上限、Target 不得修改自身 State。代码检查只是质量门槛，不是沙箱。

### 2.3 已声明的适配（与论文/上游的差异，PR 里要列出）

- API 用基于 `penguin browser` 的 Node 脚本实现，不是 Playwright Python；执行者是 Target 自己，不是上游的代码生成智能体；10 步上限只是指令。
- Target 通过阅读 `INDEX.md` 自己挑 API，不走上游的检索调用。
- Judge 只看 Trace，加上能拿到时的最终截图；论文的 reward model 能看到每一步的截图。
- **截图通常拿不到**：页面不在桌面应用的 Browser 面板里显示时，会被「停放」到屏幕外（x = −20000），不渲染画面，截图命令会超时。所有后台会话（练习单元、评测单元）都属于这种情况。插件已改成截图失败就跳过，只用文本。
- 论文里的信息检索类提案和抓取提示词，上游代码在这个版本里根本没有调用，我们按代码实现，并声明为适配。
- 上游 `allow_recovery` 会在调用过程中修复失效的定位器；我们没有对应实现，而是由 Target 自己绕过失败的调用，再由 Synthesiser 根据那次 Trace 更新 API。
- 探索是串行的，每轮只做一次尝试。

---

## 3. 实验设计（为什么这样设计）

**基准**：WebArena 的 Shopping 站（OneStopShop），本地用 Docker 自托管，`live_site: false`。
- 任务子集用 `make_benchmark.py` 按固定规则生成，共 30 题：20 道 `string_match`、10 道 `url_match`。规则和题目清单见 manifest。
- `program_html` 类题目需要在运行后读取页面 DOM，按 Workspace 方式评测拿不到，所以没有选。
- 评分用 rubric，按 WebArena `evaluation_harness/evaluators.py` 的规则写成文字，由评测 worker 执行。这不是 WebArena 原生的程序化评测器，属于声明的适配。

**协议**（每一条都对应一次被退回的教训）：
1. **基线 H1** = 空技能库的同一个 Target，同一个模型（记录精确版本和调用日期）、同一推理等级。基线不能挑。
2. 重置站点 → 登录 → 测 H1 → 练习 N 轮（默认 40；论文是 160，预算允许可以增加，事先定好并写明）→ **再次重置站点** → 登录 → 测最终库。练习会改动站点数据，不重置的话两次测的不是同一个站。
3. 两边各 `runs = 3`，报告每题每次的分数、均值和标准差。
4. 逐题列出 Trace 里**实际调用了哪些 API**。读过索引不算用过，用过也不代表带来了提升。
5. 报告全部成本：所有角色、所有单元，包括失败和重试的。
6. **所有单元串行执行**：内置浏览器是一组共享的标签页，并行会互相干扰。
7. 没有提升就照实报告，并做根因分析（参考 RRSI 作者 yenanjing 在 PR #1535 下对「flat result」的分析）。不要删数据，不要换基线，不要事后改题。

**预注册原则**：Benchmark 题目、rubric、选题规则、练习轮数、runs，**在看到 H1 结果之前定死**。如果事后不得不改（比如发现某题 rubric 有错），只能通过修改 `make_benchmark.py` 重新生成，H1 和最终测量**都重跑**，并在报告里写明改了什么、为什么改。预注册约束的是**题目、评分和预算**，不是让你自己追加更严的作废规则。

### 3.1 环境有效性：什么算污染，什么不算

判断标准只有一条：**这个变化会不会改变某道题的正确答案或评分依据**。不会，就只记录，不作废。

30 道题读取的数据（见 manifest 里的 intent）：
- 订单和订单明细、退款（`sales_order*`、`sales_creditmemo*`）；
- 商品、类目、价格、搜索结果页 URL（`catalog_*`）；
- 商品评价（`review*`、`rating*`）；
- 账户本身和地址簿（`customer_entity`、`customer_address_entity`）。

**算污染**：Target 改动了上面这些数据，例如下单、取消订单、写评价、改账户或地址簿。处理方法：标出受影响的单元，查清从哪一格开始受影响，只对**读到这些数据的题**补跑受影响的格。不要作废整组。

**不算污染，只记日志**：
- 购物车相关（`quote*`）：游客购物车、空购物车行、购物车上的账单和收货地址（Magento 打开结账页时会自动从地址簿写入）、加购物车；
- 访客和会话记录（`customer_visitor`、`customer_log`）、缓存、索引；
- Magento 定时任务的清理（例如 `sales_clean_quotes` 清空购物车）。

这些是 Magento 浏览时的正常副作用。WebArena 官方协议对 `require_reset: false` 的题，题与题之间根本不重置站点。没有一道题读购物车，所以它们不影响任何答案。数据库校验可以保留，但只作为审计记录，**不要为每个事件写调查报告，也不要因此停下测量**。

两次测量的站点必须用**同一个重置流程**（同一个脚本、同样的 cron 设置、同样的登录步骤）。只要两边一致，站点里那些不被读取的表有什么差别都无所谓。

真拿不准某个变化算不算污染：先继续跑，把事件记下来，交回时写进报告，由我们判断。**宁可多一条待判断的记录，也不要作废十几个小时的数据。**

### 3.2 已有正式数据的处理（2026-11-21 决定）

前两次正式运行都是按过严的自定规则作废的：第 1 次因为定时任务清空了购物车，第 2 次因为第 66 格打开结账页、Magento 把默认地址写进了购物车。按 3.1 的标准，两次都不是污染。

- **第 2 次（`sw_shop_formal_r2`，experiment `sw_shop_formal_r2-20261120T053006Z`）的 H1 90 格就是正式基线**，matrix 分 65.56（第 3 格按 rubric 更正为 0 已计入）。不要再重跑 H1。
- 从这个实验的第 0 轮接着做：40 轮练习 → 用与 H1 **完全相同**的重置流程重置（`reset-shopping.sh` 关闭 cron 的版本，**不加** `prime-shopping.js` 预热，因为 H1 没有做）→ 登录 → 最终测量 30×3。
- 如果已经开始了第 3 次运行，停掉，数据和用量保留在 `results/` 里，计入总成本。
- 在 RESULTS.md 里如实写明：原计划的作废规则过严；第 66 格具体发生了什么；为什么它不影响任何题的答案；第 1、3 次运行的耗时和用量同样计入总成本。

---

## 4. 当前状态：哪些验证过，哪些没有

### 已验证
- 插件单元测试 29 个，用一个替身 `penguin` 跑运行时，覆盖所有校验规则、指纹、技能库记录、Windows 的 `penguin.cmd` 解析、符号链接路径，以及文档中的示例 API。
- fork 上的全量 CI 在 Linux、macOS、Windows 三个平台都跑过（最后两个提交只改了文档，之后还没再跑全量 CI；macOS 任务偶尔被 GitHub 取消，属于基础设施问题）。
- 在一台 Linux 服务器上用虚拟显示（Xvfb）启动了桌面应用，验证了 `penguin browser` 的打开页面、执行 JS、点击都正常；一个由 Step 5 驱动的智能体通过 `penguin run` 正确完成了一个真实网页任务。截图在这种环境下不可用（原因见 2.3）。
- `make_benchmark.py` 重新生成的结果与提交的 Benchmark 逐字节一致；zip 用服务端的导入代码验证过能被接受。

### 从未验证（你会是第一个跑通的人）
- **控制者执行完整 SkillWeaver 流程**（提案 → 练习 → Judge → Synthesiser → Publish → 测试）。整个 Skill 从来没有被真实模型完整执行过。预计在提示词表述、角色输出格式、路径解析、等待后台单元等地方会出问题。
- Windows 上真实调用 API 脚本（运行时读 `penguin.cmd` 的那条路径只有单元测试覆盖，没有实测）。
- 评测 worker 按我们的 rubric 给网页题打分，包括从 Trace 里找最终 URL。
- `reset-shopping.sh` 从未执行过（写的时候没有 Docker 环境）。
- WebArena 镜像中网站数据的许可证（待核实）。

---

## 5. 最可能出问题的地方，以及怎么想

这些不是固定的排错步骤，而是提示你**先看哪里、怎么判断**：

- **控制者没按 Skill 做**（跳步、自己编随机数、自己写 API、并行跑单元）：去看 OUT 目录的记录（`choose.json`、`state.yaml`、各角色的请求和回复）。如果是 Skill 写得含糊，就修 Skill 的表述，让它更明确；不要只在对话里口头纠正。修 Skill 才能让问题不再出现。
- **角色输出格式不对**：Skill 规定「同一角色再问一次，绝不替它修」。如果某个模型反复出错，先看是不是 `roles.md` 的要求有歧义。
- **API 校验总是不通过**：看 `check` 报的具体问题。规则来自上游（禁止 `*_id`/`*_url` 参数、首次导航必须是相对路径等）。可以改进 `api-format.md` 或 Synthesiser 的提示，但**不要为了通过而放宽检查规则**。如果确实认为某条规则不合理，记下理由交回讨论。
- **API 在 Windows 上报 `penguin.cmd` 相关错误**：看 `skillweaver-api.mjs` 的 `parseWindowsShim` / `resolvePenguin`，对照你机器上 `<数据目录>/bin/penguin.cmd` 的实际内容。服务端生成这个文件的代码在 `packages/server/src/services/cli-shim.ts`（`windowsShimScript`），测试里已经用它做格式对照。
- **截图超时**：这是正常现象（原因见 2.3），流程应该继续。如果流程因此卡住，就是 Skill 或角色哪里没处理「截图拿不到」的情况，要修。
- **评测 worker 打分不可靠**（找不到 ANSWER 行、找错最终 URL）：先看 rubric 和题干的表述。改的话通过 `make_benchmark.py` 改，然后按预注册原则重跑。
- **站点状态**：每次重置后要重新登录。登录状态丢了，题目会失败但不是方法的问题，这种组要标出来并补跑。数据库里出现变化时，按 3.1 判断，大多数只需要记日志。
- **StepFun 限流**：并发上限约 8，超过会返回 429。一次只跑一个单元，基本碰不到。遇到了就等一会儿再续跑，被打断的单元记录为基础设施失败，不算作方法失败。
- **耗时**：220 个单元串行，10–14 小时。正式跑之前先用小预算（2 轮练习、3–5 题、runs 1）把流程完整走一遍，确认没问题再开长任务。InfraRSI 曾经作废了 5 次长任务，原因都是前期没有演练。

**判断原则**：
- 优先保证**方法忠实**（对照论文和上游代码）和**证据可信**，其次才是跑得快、分数高。
- 每个结论都要能指向一个原始记录，做不到就写「未验证」。
- 改动越小越好，每次修改都说明原因。
- **处理要和问题成比例**：一个单元数据有问题就补跑这个单元，不要作废整组。决定作废或重跑长任务（超过 1 小时）之前，先确认这个问题真的会改变某道题的分数；拿不准就记下来继续跑，交回时提出来。

---

## 6. 怎么改代码

### 6.1 分支与提交
- 插件修复提交到 **`feat/skillweaver-rsi-toolkit`**（PR 分支），推送后执行 `git merge feat/skillweaver-rsi-toolkit` 并入 `skillweaver-experiment`，再在后者上跑实验。这样 PR 分支只含插件改动。
- 实验材料、结果、说明文档只提交到 **`skillweaver-experiment`**，放在 `experiments/skillweaver-webarena/` 下。
- 提交身份：`git -c user.name=Nhckdvrl -c user.email=Nhckdvrl@users.noreply.github.com commit …`
- **提交信息、文件、文档里都不要出现任何 AI 署名或身份信息**（不要 `Co-Authored-By` 之类的署名行，不要写由什么工具或模型生成，不出现任何模型品牌名）。仓库主人用自己的账号贡献。
- 不要 force-push，不要 rebase 已推送的提交，不要推到上游 `Prism-Shadow/*`。
- 提交信息用英文，风格照已有提交：`fix(plugins): …`，正文写清楚改了什么、为什么改。

### 6.2 改完插件必须跑的检查（在仓库根目录执行）
```bash
corepack enable
pnpm install --frozen-lockfile
cd plugins/skillweaver-rsi-toolkit && pnpm build && pnpm test && cd ../..
cd packages/server && pnpm gen:ifaces && pnpm exec vitest run test/plugin-library.test.ts && cd ../..
pnpm exec prettier --check plugins/skillweaver-rsi-toolkit
pnpm exec oxlint plugins/skillweaver-rsi-toolkit
node scripts/check-plugin-versions.mjs origin/main
git diff --check
```
注意事项：
- **Prettier 只能在仓库根目录运行。** 在插件目录里运行时，根目录的忽略规则不生效，会把 `references/evaluation.md` 等 Markdown 文件改坏。
- `references/evaluation.md` 是社区所有 RSI 工具包共用的文件，**必须与其他工具包的副本逐字节一致**（有测试强制），不要改。
- 改了 `skills/` 下的内容，要把 `SKILL.md` 头部的 `version` 改成当天日期 `YYYY.MM.DD.N`。
- 修复 bug 时补一个能复现它的测试。现有测试的写法见 `test/scripts.test.ts`。
- 能跑的话，在 fork 上触发全量 CI（Actions → CI → Run workflow，`full: true`），或用 `gh workflow run ci.yml --repo Nhckdvrl/penguin-harness --ref feat/skillweaver-rsi-toolkit -f full=true`。

### 6.3 模型配置（StepFun）
- 端点：`https://api.stepfun.com/step_plan/v1`，客户端类型 `openai-chat`，模型用 `step-5-preview`（或你确认可用的其他 Step 模型）。
- 在桌面应用的模型设置里添加，或用 `penguin config model add --provider custom …`。
- **API key 不要写进任何文件、提交或日志。**
- 记录精确的模型 ID 和调用日期，PR 里要写。

---

## 7. 合规底线（已经踩过的坑）

- **只在允许自动化访问的环境里实验。** 我们查过：Drugs.com 的使用条款明确禁止自动化访问，**包括学术研究**，所以不能用。Cars.com 有反爬拦截。本地自托管的 WebArena 不受这些限制。
- 演练用的 books.toscrape.com 是专门给抓取练习的沙箱站，可以用。
- 不要在任何真实网站上创建账号、提交内容、下单。
- 上传任何结果之前先做匿名化：去掉 Windows 用户名、绝对路径、主机名、API key。上传后再回读一遍线上版本确认。

---

## 8. 「做完」的标准，以及交回什么

### 8.1 必须完成
1. 正式实验按第 3 节的协议跑完。如果跑了不止一次，**每一次都保留**，说明哪次是正式结果、为什么。
2. 所有代码修复都已推到 `feat/skillweaver-rsi-toolkit`，第 6.2 节的检查全部通过（如能跑全量 CI，附上链接）。
3. 在 `skillweaver-experiment` 的 `experiments/skillweaver-webarena/results/<日期>/` 下放好（匿名化后）：
   - 控制者的最终报告全文；
   - OUT 目录（单个文件超过 GitHub 100 MB 限制就压缩或拆分）；
   - 最终技能库（`skillweaver-apis/` 目录）；
   - Benchmark 的 `scoreboard.yaml`；
   - 两次重置的输出；
   - 环境信息：Windows 版本、Node 版本、Docker 版本、PenguinHarness 提交号（所有包在同一个提交上构建）、插件版本、模型 ID 和调用日期。
4. 一份 **`RESULTS.md`**（中文，简洁），包含：
   - 结果表：H1 和最终库每题每次的分数、均值、标准差；
   - 逐题 API 调用情况；
   - 成本和耗时；
   - 代码改了什么、为什么改，列出提交号；
   - 偏离预注册或协议的地方及原因；
   - 未解决的问题和你的判断；
   - 复跑命令。
5. 用 `pr1551-retrospective.md` 第三节的清单自查一遍，在 `RESULTS.md` 末尾逐项写出是否满足。

### 8.2 不要做
- 不要开 PR，不要在任何 issue 或 PR 下评论，不要 `/claim` 或 `/unclaim`。
- 不要修改 `references/evaluation.md`，不要为了通过而放宽完整性护栏或代码检查。
- 不要只挑好看的运行、不要删掉失败的数据。

---

## 9. 文件索引

| 位置 | 内容 |
|---|---|
| `plugins/skillweaver-rsi-toolkit/skills/skillweaver-rsi-toolkit/SKILL.md` | 方法主体（控制者执行） |
| `…/references/initialization.md` | 怎么在 Target 里建空技能库 |
| `…/references/roles.md` | 四个角色的提示词（改编自上游模板） |
| `…/references/api-format.md` | API 脚本的格式规则（与 `check` 一一对应） |
| `…/references/evaluation.md` | 社区共用的评测协议（不要改） |
| `…/references/source-notes.md` | 与上游代码和论文的逐项对照、上游 MIT 许可全文 |
| `…/scripts/skillweaver-api.mjs` | API 运行时 |
| `…/scripts/skillweaver.mjs` | 控制者工具 |
| `plugins/skillweaver-rsi-toolkit/test/` | 单元测试 |
| `changelog/unreleased/2026-11-18-skillweaver-rsi-toolkit*.md` | 变更日志（中英各一份） |
| `experiments/skillweaver-webarena/README.md` | 环境搭建和运行的操作说明 |
| `experiments/skillweaver-webarena/acceptance.md` | 验收清单与证据计划 |
| `experiments/skillweaver-webarena/pr1551-retrospective.md` | 上一个 PR 被退回三次的复盘（必读） |
| `experiments/skillweaver-webarena/make_benchmark.py` 等 | Benchmark 生成脚本、生成结果、重置脚本 |

论文：https://arxiv.org/abs/2504.07079 （先读第 2、3 节和附录 A）
上游代码：https://github.com/OSU-NLP-Group/SkillWeaver （重点看 `skillweaver/explore.py`、`skillweaver/knowledge_base/`、`skillweaver/templates/`）
WebArena：https://github.com/web-arena-x/webarena （评测规则见 `evaluation_harness/evaluators.py`）
