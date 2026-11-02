# MCE RSI 工具包

- **Date:** 2026-11-02
- **Type:** feature
- **Scope:** `skills`, `docs`

[English](2026-11-02-mce-rsi-toolkit.md)

新增 `mce-rsi-toolkit`，在 Project 选定的 Benchmark 上运行 [Meta Context Engineering](https://arxiv.org/abs/2601.21557)（ICML 2026）。负责人：[Nhckdvrl](https://github.com/Nhckdvrl)。

## 学习过程

- 每一轮由新的 meta-agent 会话阅读之前的学习 Skill、它们产出的上下文和得分，写出下一版学习 Skill。
- 新的上下文工程师会话在本轮训练 rollout 上执行这份 Skill，在目前最好的上下文基础上更新。上下文是一个结构不限的 Skill 文件夹，Solver 在任务开始时读取。
- rollout 与验证题都由新的 Solver 会话完成，训练 Agent 用 Benchmark 的训练评分接口为每个答案评分一次。
- 默认三轮之后，导出验证得分最高的上下文并冻结，与无 Skill 基线各做三次完整测试。没有独立验证集时，验证复用 Train。

## 打包

插件已登记到 core、CLI、桌面端、中英文插件目录、自我进化 / Skill / 评测中心 / 简介文档、官网算法清单和 UI Gallery 演示。插件带有库内其他 Skill 插件同样运行的 SKILL.md 解析检查。评测参考沿用 SkillOpt 的版本，以验证取代候选筛选。
