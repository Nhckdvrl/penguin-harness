# MCE RSI toolkit

- **Date:** 2026-11-02
- **Type:** feature
- **Scope:** `skills`, `docs`

[中文版](2026-11-02-mce-rsi-toolkit.zh.md)

Added `mce-rsi-toolkit`, which runs [Meta Context Engineering](https://arxiv.org/abs/2601.21557) (ICML 2026) on the Project's selected Benchmarks. Contributor: [Nhckdvrl](https://github.com/Nhckdvrl).

## Learning process

- Each iteration, a fresh meta-agent session reads the earlier learning Skills, the contexts they produced and their scores, and writes the next learning Skill.
- A fresh context-engineer session executes that Skill on the iteration's training rollouts, updating the best context so far. The context is a Skill folder of any structure, which the Solver reads at task start.
- Fresh Solver sessions run the rollouts and the validation tasks, and the training Agent scores each answer once with the Benchmark's training judge.
- After three iterations by default, the context with the highest validation score is exported, frozen and compared with the no-Skill baseline over three complete test repetitions. Without separate validation data, validation reuses Train.

## Packaging

Registered the plugin for core, CLI and desktop packaging, the bilingual plugin catalogs, the self-improvement, Skills, Evaluation Center and introduction docs, the landing algorithm list and the UI Gallery demo. The plugin carries the SKILL.md parse check the library's other skill plugins run. Its evaluation reference follows SkillOpt's, with validation in place of selection.
