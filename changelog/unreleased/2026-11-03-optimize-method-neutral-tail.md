# The Optimize tab leaves each toolkit's method to its own Skill

- **Date:** 2026-11-03
- **Type:** fix
- **Scope:** `web`, `docs`
- **PR:** [#1431](https://github.com/Prism-Shadow/penguin-harness/pull/1431)
- **Issue:** [#1429](https://github.com/Prism-Shadow/penguin-harness/issues/1429)

[中文版](2026-11-03-optimize-method-neutral-tail.zh.md)

Every RSI toolkit other than Default used to get the same Optimize prompt: one frozen Benchmark, runs per case, the Skill's smoke budget, and every candidate recorded on that Benchmark's scoreboard. That is OPRO's, APE's, ACE's and AWM's protocol. SkillAdam, SkillOpt, OpenSkill and TRACE learn on a Train package and test the frozen baseline and final States on the paired Test package, three times by default, with no smoke budget, so the prompt contradicted their own Skill.

The prompt now says nothing about how a method runs. It hands the toolkit's Skill the tested agent, the Benchmark and, when the tested agent has a baseline, its provider and model, then asks the Skill to run its method as the Skill defines it and to report the baseline score, the final score and what changed. Each Skill already states its own protocol, budget, evaluation and records. The tab no longer asks a toolkit other than Default for **Runs per case**; a different budget or repetition count goes in **Focus**. Default keeps its form and prompt.
