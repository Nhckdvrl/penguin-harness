---
name: mce-rsi-toolkit
description: Run Meta Context Engineering on selected Project Benchmarks by evolving a context-engineering Skill across iterations, letting it build the solving context from training rollouts, selecting the context by validation score and testing frozen baseline and final States.
version: 2026.11.02.1
---

# MCE

You are the experiment controller. Read the selected Project Benchmarks, prepare a continuing learning environment, collect the learned context and arrange independent testing.

[Meta Context Engineering via Agentic Skill Evolution](https://arxiv.org/abs/2601.21557) (ICML 2026) and the [author implementation at c4b7a7c](https://github.com/metaevo-ai/meta-context-engineering/tree/c4b7a7c2ce3ffc4bf4a74c52d2dd8a9a8fb14c30) make the context-engineering procedure itself learnable. MCE has two levels. A **meta-agent** reads the history of earlier iterations (each iteration's learning Skill, the context it produced, and their training and validation scores) and writes the next learning Skill by agentic crossover: it keeps what worked, addresses what failed and tries new strategies. A **base agent**, the context engineer, executes that learning Skill on training rollouts and updates the context, starting from the best context so far. The context has no fixed structure; it is files and, optionally, code the solving Agent reads. Model weights and solving tools stay fixed.

The output is the **context with the highest validation score**, installed as one Skill folder. The learning Skills, the skill database and training answers stay in learning records. [Training instructions](references/training.md) describe the algorithm and its adaptations.

## Before you start

If the request only names this Skill, ask which Target and Benchmark to use. Resolve supplied experiment details from the request and Project before asking for anything else.

Follow [initialization](references/initialization.md) and the [installed Benchmark instructions](references/benchmark.md). Resolve Train/Test packages, task-source commit, runtime, feedback and export locations from their manifests and Case Markdown. An installed Benchmark name is sufficient.

Use all declared Train and Test questions unless a subset is requested. Train once per independent benchmark or training unit. Record the Target Agent, model, thinking level, experiment version, MCE configuration and resource limits. Prefer user-specified settings.

| Setting | Default |
| --- | --- |
| Training runs per independent unit | 1 |
| MCE iterations, R | 3; each runs the meta-agent once |
| Training batch per sub-iteration | Up to 25 Train tasks, so five Train tasks form one sub-iteration |
| Validation set | A separately supplied one; otherwise all Train tasks |
| Iteration 0 (empty-context validation) | Off, as in the implementation's default start |
| Context selection | Highest validation score over iterations 1…R; the earliest wins a tie |
| Complete Test repetitions per frozen State | 3 |

These are toolkit choices. The implementation's command-line default is one iteration and its example scripts run two; R=3 gives the meta-agent two crossovers over measured history. Cap the batch at the available tasks. With five Train tasks reused for validation, each iteration runs ten fresh Solver sessions (five rollouts and five validation runs), so R=3 means 30 Solver sessions, three meta-agent sessions and three context-engineer sessions in one training run. A smoke budget uses R=1. Fix the finite learning budget before launch and honor the Benchmark's runtime limits.

## Choose the validation tasks

Use an independent validation set when the Benchmark supplies one. Otherwise, use **all Train tasks for both learning and validation** by default, or a requested fixed subset of Train for validation. Do not remove any task from learning.

Fix the validation task IDs and aggregation rule before the first iteration. Record whether the set is independent or overlaps Train. The paper selects on a separate validation split; reusing Train is this toolkit's compatibility policy, and overlapping scores are training measurements, not held-out validation. Held-out Test is used only after freezing and never selects a context.

## Learn and freeze

Give the training Agent [training.md](references/training.md) with its two role references, the resolved settings, a train-only benchmark brief and the authorized validation tasks. Start the documented continuous Train environment once. Keep the training Session and business container throughout the learning run; the training Agent drives the iterations with Penguin's existing tools.

1. **Evolve the learning Skill.** A fresh meta-agent session reads the skill database and writes the iteration's learning Skill. The first iteration designs one from the task description alone.
2. **Roll out.** Fresh Solver sessions execute a Train batch with the current context. The training Agent requests feedback for each frozen answer and records the results.
3. **Engineer the context.** A fresh context-engineer session executes the learning Skill on those results and updates the context, which starts from the best earlier iteration's context.
4. **Validate.** Fresh Solver sessions run every validation task with the iteration's final context. Record the validation score and archive the learning Skill in the skill database.
5. **Select and export.** After R iterations, export the context of the iteration with the highest validation score, with its learning records and the benchmark-required answers.

Solver sessions receive only the public task, the frozen context and their output location. Measuring a changed context means producing new answers; regrading old answers does not measure it.

## Test and report

Build `baseline` and `final` from the same saved base State and fixed reader. Baseline is the pre-learning State; final adds the exported context. Follow [evaluation and reporting](references/evaluation.md): measure each frozen State on the complete Test set three times by default, with a fresh environment and conversation per case and repetition. Reuse the same context for every repetition.

Report `baseline`, `final`, `mean`, `std` and `final_minus_baseline`, plus versions and per-unit/per-case cost, time and token categories. Record each iteration's rollout and validation measurements as numbered `step` records with `curve_kind: benchmark_score`, keeping the two task roles distinct and the selected iteration separate from the last one. Intermediate context tests are optional. Test feedback never reopens learning.

Keep job IDs and artifact paths, respect the shared container limit including sidecars, and collect every requested result. Report incomplete work explicitly.

## Method adaptations

Report these with the results; do not claim an exact reproduction of the paper's numbers.

- The implementation runs the meta-agent and context engineer as Claude Agent SDK agents over a workspace directory. Here both are fresh Penguin sessions started with `run_subagent`, sharing the training container's filesystem. Their read and write limits are instructions, not filesystem isolation.
- The paper's tasks are single-turn question answering and classification, with an agentic diagnosis variant whose solver explores a `context/` folder. Benchmark tasks here are multi-step and use business tools, so the context is one Skill folder the Solver reads at task start, and any code in it runs with the Solver's own tools. The implementation's `utils/llm.py` and `utils/embedding.py` helpers are not provided; the context engineer may delegate analysis with `run_subagent`, and context code must work without model or embedding calls.
- Training feedback is the Benchmark's normalized score and correctness feedback, not a reference answer. A score of 100 counts as correct; fractional scores are kept.
- Without a separate validation set, validation reuses Train as described above.
