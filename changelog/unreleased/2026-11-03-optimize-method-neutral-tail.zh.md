# 「优化」标签页把每个工具包的方法交给它自己的 Skill

- **Date:** 2026-11-03
- **Type:** fix
- **Scope:** `web`, `docs`
- **PR:** [#1431](https://github.com/Prism-Shadow/penguin-harness/pull/1431)
- **Issue:** [#1429](https://github.com/Prism-Shadow/penguin-harness/issues/1429)

[English](2026-11-03-optimize-method-neutral-tail.md)

以前，Default 以外的每个 RSI 工具包收到的都是同一段优化提示词：一个冻结的 Benchmark、每题运行次数、技能的冒烟预算，并把每个候选都记入这个 Benchmark 的记分板。这是 OPRO、APE、ACE 和 AWM 的协议。SkillAdam、SkillOpt、OpenSkill 和 TRACE 则在 Train 包上学习，再把冻结的 baseline 与 final State 放到配对的 Test 包上测试，默认测三次，也没有冒烟预算，所以提示词和它们自己的 Skill 互相矛盾。

现在提示词不再规定方法怎么运行。它只把被测智能体、Benchmark，以及被测智能体有基线时基线的 provider 与模型交给工具包的 Skill，要求它按 Skill 自己的定义运行方法，最后报告基线分、最终分与改了什么。每个 Skill 本来就写明了自己的协议、预算、评测与记录。Default 以外的工具包不再显示**每题运行次数**；想改预算或重复次数，写在**优化重点**里即可。Default 的表单与提示词不变。
