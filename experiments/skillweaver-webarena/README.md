# SkillWeaver 实验：WebArena Shopping（Windows 上运行）

> **接手的智能体请先读 [`HANDOFF.md`](HANDOFF.md)**：目标、背景、审阅标准、已知风险和判断原则都在那里。本文件只讲环境搭建和运行步骤。

这个分支 = SkillWeaver 插件代码（与 PR 分支 `feat/skillweaver-rsi-toolkit` 相同）+ 本目录的实验材料。实验材料不进 PR。

## 目录内容

| 文件 | 用途 |
|---|---|
| `make_benchmark.py` | 从 WebArena 官方任务按固定规则生成 Benchmark，可复现 |
| `skillweaver-webarena-shopping/` | 生成好的 Benchmark：30 题，其中 20 道答案题、10 道页面题 |
| `skillweaver-webarena-shopping.manifest.json` | 题目清单、选题规则、WebArena 提交号和源文件哈希 |
| `skillweaver-webarena-shopping.zip` | 同一个 Benchmark 的压缩包，可在评测中心上传（已用服务端导入代码验证过） |
| `reset-shopping.sh` | 把 Shopping 站重置为镜像初始状态，并在启动前禁用容器的计划维护（在 Git Bash 里运行） |

选题规则：
- 只取 Shopping 单站点的任务，评测类型限 `string_match` / `url_match`，即能从最终答案或最终页面 URL 判分的题；
- 每个意图模板只取 task_id 最小的一题，再按 task_id 取前 30 题；
- 子集中没有会改动站点状态的题（`require_reset` 均为 false）；
- 不选 `program_html` 类，因为它需要读运行后的页面 DOM，按 Workspace 评测拿不到。PR 里会把这一点写成声明的适配。

## 1. 准备（Windows）

- **Docker Desktop**（WSL2 后端），磁盘留足：镜像 tar 文件加上导入后的镜像，大约要 tar 文件大小的两倍。
- **Git for Windows**：PenguinHarness 在 Windows 上用 Git Bash 执行命令，Skill 里的命令都是 bash 写法。
- **Node 24**，然后执行 `corepack enable`。
- 模型 API key。记下**精确模型 ID 和版本**（如 `deepseek-flash-1017`），PR 里必须写。
- 跑的时候电脑不能睡眠：Windows 设置 → 电源 → 睡眠设为「从不」。

## 2. 下载并加载 Shopping 镜像

`shopping_final_0712.tar`，WebArena 官方列出的镜像源：
- Google Drive：https://drive.google.com/file/d/1gxXalk9O0p9eu1YkIJcmZta1nvvyAJpA/view?usp=sharing
- CMU：http://metis.lti.cs.cmu.edu/webarena-images/shopping_final_0712.tar
- archive.org 目前显示不可用。

在 **Git Bash** 里执行：

```bash
docker load --input shopping_final_0712.tar
bash experiments/skillweaver-webarena/reset-shopping.sh http://localhost:7770
```

最后一行出现 `reset done …`，浏览器打开 http://localhost:7770 能看到 One Stop Market 首页，就说明站点起来了。

每次正式测量前，在重置后登录同一个 WebArena 测试客户，留在项目浏览器的账号页面，再执行下述初始化。站点在首次查看结账页面时可能把地址簿中的默认地址附到现有购物车。两边均在采集数据库初始指纹前完成这一步，避免把站点的延迟初始化混入测量。

```bash
penguin browser exec --tab "$TAB_ID" --json --no-monitor < experiments/skillweaver-webarena/prime-shopping.js
penguin browser exec --tab "$TAB_ID" --json --no-monitor < experiments/skillweaver-webarena/prime-shopping.js
```

`TAB_ID` 是已登录的项目账号页标签。两次执行都应返回四条同站路径。核验两次访问后，测试客户的活动购物车都有同样的已保存账单和收货地址，商品条目和数量保持不变。保存核验证据，再开始本阶段的测量。

## 3. 启动 PenguinHarness

```bash
git clone -b skillweaver-experiment https://github.com/Nhckdvrl/penguin-harness.git
cd penguin-harness
corepack enable
pnpm install
pnpm desktop
```

`pnpm desktop` 会先整体构建，第一次比较慢；它用独立的数据目录 `~/.penguin/dev-data`，不碰你平时的数据。

在应用里：
1. 添加模型并设为默认。
2. 新建一个控制者智能体，只装 `skillweaver-rsi-toolkit` 插件。

## 4. 导入 Benchmark

任选一种：
- 评测中心 → 上传 `experiments/skillweaver-webarena/skillweaver-webarena-shopping.zip`；
- 或把 `experiments/skillweaver-webarena/skillweaver-webarena-shopping/` 整个目录复制到 `%USERPROFILE%\.penguin\dev-data\default_project\benchmarks\` 下。

评测中心里能看到「WebArena Shopping subset for SkillWeaver」，共 30 题。

## 5. 先演练 2 轮（必做，约半小时）

对控制者发：

> 使用 `skillweaver-rsi-toolkit` 技能：被测智能体 `create: sw_dry`，练习网站 `https://books.toscrape.com`，live_site 为 true，iterations 2，不用 Benchmark。先给我看计划，我同意后再开始。

检查以下几点，有任何一项不对就先停下来，把截图或报错发给我：
- 控制者先给出计划，等你同意才开始；
- 控制者的 OUT 目录里有 `experiment.yaml`、`state.yaml`（含技能库指纹），以及每轮的 `choose.json`；
- 练习单元前后执行了 `skillweaver.mjs fingerprint` 和 `verify-runtime`，没有报错；
- `sw_dry` 的 Agent State 里有 `skills/skillweaver-apis/`（`SKILL.md`、`site.md`、`apis/library.json`、`apis/INDEX.md`、`apis/skillweaver-api.mjs`）。

截图失败是正常的：后台会话的页面不在 Browser 面板里显示，渲染不出画面，Skill 会跳过截图继续。

## 6. 正式实验

流程：重置站点 → 登录 → 测 H1（30 题 × 3 次）→ 练习 40 轮 → **再次重置** → 登录 → 测最终库（30 题 × 3 次）。

登录用 WebArena 公开的测试账号 `emma.lopez@gmail.com` / `Password.123`。在桌面应用的 **Browser** 面板里由你自己登录，智能体按规定不替你输入密码。

对控制者发（把路径换成你电脑上的实际位置，Git Bash 写法，例如 `/c/Users/<你>/penguin-harness/...`）：

> 使用 `skillweaver-rsi-toolkit` 技能：被测智能体 `create: sw_target`，练习网站 `http://localhost:7770`，live_site 为 false，iterations 40，benchmark_id `skillweaver-webarena-shopping`，runs 3。重置站点的命令是 `bash <仓库绝对路径>/experiments/skillweaver-webarena/reset-shopping.sh http://localhost:7770`，每次重置后等我在浏览器里登录客户账号并回复「已登录」再继续。所有单元一个一个跑。先给我看计划，我同意后再开始。

**时间估算**：测量 2 × 30 × 3 = 180 个单元，练习 40 个单元，全部串行，每个单元约 2–4 分钟，**总共约 10–14 小时**。可以分两次跑，先测 H1，之后再练习和做最终测量；进度存在 OUT 的 `state.yaml` 里，Skill 会接着跑。

跑的时候不要用桌面应用的浏览器做别的事。

## 7. 跑完发回给我

- 控制者的最终报告全文；
- 控制者的 OUT 目录，整个打包（报告里有路径）；
- `sw_target` 的 `agent_state/skills/skillweaver-apis/` 整个目录；
- Benchmark 目录下的 `scoreboard.yaml`；
- 两次重置的输出（各一行 `reset done …`）；
- 模型 ID 和版本、Windows 版本、`git rev-parse HEAD` 的输出。

拿到这些后，我来整理成 PR 描述里的验证部分：每题每次的分数、均值和标准差、逐题 API 调用、总成本、复跑命令和 gist。

## 许可

- WebArena：代码为 Apache-2.0；Docker 镜像中网站数据的许可没有明确说明，待核实后在 PR 中写明。
- SkillWeaver 上游：MIT，改写的提示词文本已在插件的 `references/source-notes.md` 中附上许可全文。
