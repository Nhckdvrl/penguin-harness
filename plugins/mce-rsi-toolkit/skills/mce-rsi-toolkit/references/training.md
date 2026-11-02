---
name: mce-training
description: Run Meta Context Engineering in one continuing training environment, with fresh meta-agent, context-engineer and Solver sessions, and export the context selected by validation score.
version: 2026.11.02.1
---

# Train with MCE

You are the training Agent. Read `training-request.json` at your Agent State root and `benchmark-training.md` beside this Skill. Complete the learning run in this continuing Session and environment. The outside controller handles deployment, collection and independent Test evaluation.

Method references are [Meta Context Engineering via Agentic Skill Evolution](https://arxiv.org/abs/2601.21557) and the [author implementation](https://github.com/metaevo-ai/meta-context-engineering/tree/c4b7a7c2ce3ffc4bf4a74c52d2dd8a9a8fb14c30), whose `mce/main.py` loop this Skill follows. You play the loop itself: you schedule the roles, run and score rollouts, keep the records and select the result. Three roles do the rest, each in a fresh child session started with `run_subagent`:

| Role | Session | Reads | Writes |
| --- | --- | --- | --- |
| Meta-agent, [meta-agent.md](meta-agent.md) | One per iteration, as your own identity | The skill database and earlier iteration folders | The iteration's learning Skill |
| Context engineer, [context-engineer.md](context-engineer.md) | One per sub-iteration, as your own identity | Only its sub-iteration folder | That folder's `context/` |
| Solver | One per task attempt, as the Solver identity | The public task and the installed context | Its candidate answer and attempt record |

You do not write learning Skills, edit contexts or solve tasks yourself. Child sessions share this container's filesystem, so the read and write limits in the table are instructions you pass and check, not isolation. Give each child the explicit `provider`, `model_id` and `thinking_level` from the request; Solver settings must match the prepared test solver.

## Prepare the workspace

Use the request's MCE workspace directory, `MCE` below, laid out like the implementation's:

```text
MCE/
  meta_agent/
    tasks.md                    # public index of every Train task (id, prompt path, answer template)
    evaluations.json            # per-iteration metrics, written after each iteration
    skills/iter<i>/SKILL.md     # archived learning Skills
  iter<i>_sub<j>/
    learning-skill/SKILL.md     # the iteration's learning Skill
    context/                    # the context being built; becomes skills/mce-context/
    data/train.json             # the batch's rollout results
  attempts/                     # Solver outputs, answers and raw feedback, by attempt id
```

`tasks.md` takes the place of the implementation's `meta_agent/train.jsonl`: it lists public inputs only, because the Benchmark gives no reference answers. Fix the ordered Train tasks, validation tasks, R, batch size, order and seed from the request before the first iteration. Batches cover the Train tasks in order; keep the last partial batch. With five Train tasks and the default batch, every iteration has one sub-iteration, `iter<i>_sub0`.

## Run a Solver batch

A batch runs a fixed context on a fixed task list. Install a frozen copy of the context into the Solver's State as `skills/mce-context/`, or remove that folder for an empty context, and record the context digest. Then run each task in a new `run_subagent` session bound to the Solver identity. Its prompt contains the public task and attachments, the business API instructions and its own output location; never previous answers, scores, feedback, records or other roles' text.

Run attempts sequentially unless the Benchmark establishes that tasks are independent. Follow any documented reset; when state cannot be reset, record the carryover rather than claiming independent trials. A Solver writes its candidate and finishes without asking for feedback. Freeze that candidate, call the training judge once with it, and store the raw response with the attempt id, task, context digest, Solver session id and turn count. A failed judge call is not a scored zero: follow the Benchmark's recovery and retain the attempt.

The batch score is the mean normalized score of its attempts, on 0..100. An attempt is correct when its score is 100. Keep fractional scores and the judge's correctness feedback; the feedback never reaches a Solver.

## Iterate

Run the request's iterations, numbered from 1. When the request enables iteration 0, first run the validation tasks with an empty context and record the result as `iter0`; it is a reference measurement, not a selection candidate.

For iteration `i`:

1. **Evolve the learning Skill.** Create `iter<i>_sub0/`. Start a fresh meta-agent session with this prompt, filled in:

   ```text
   Caller agent: <your agent id>
   Read skills/mce-training/meta-agent.md in your Agent State and act only as the MCE meta-agent.
   iteration: <i>
   mce_workspace: <MCE>
   output: <MCE>/iter<i>_sub0/learning-skill/SKILL.md
   task_brief: <path to benchmark-training.md>
   ```

   Check that the output exists, has normal Skill frontmatter with `name: learning-context`, and a nonempty `## Skill Overview` section, and that nothing else in `MCE` changed. Otherwise send that same session the specific defect to fix. A meta-agent that cannot produce a valid Skill stops training, as it does in the implementation.

2. **Start from the best context.** For iteration 1, `context/` starts empty, or from `iter0` when it ran. Later iterations copy `context/` from the last sub-iteration folder of the earlier iteration with the highest validation score in `evaluations.json`; the earliest such iteration wins a tie.

3. **Learn, one sub-iteration per batch.** For sub-iteration `j`, copy the learning Skill and the previous sub-iteration's `context/` into `iter<i>_sub<j>/` when `j > 0`. Run the batch with the current context. Write `data/train.json`:

   ```json
   {
     "summary": {"train_score": 0.0, "train_total": 0, "train_errors": 0, "batch_idx": 0, "cumulative_rollouts": 0},
     "detailed_results": [
       {"id": "<task id>", "prompt": "<public prompt path>", "answer": "data/attempts/<attempt id>/answer.json",
        "score": 0.0, "is_correct": false, "feedback": "<judge feedback>",
        "trajectory": "data/attempts/<attempt id>/transcript.md", "turns": 0}
     ]
   }
   ```

   Copy each attempt's answer and a readable transcript of its Solver session into `data/attempts/<attempt id>/`, so the folder holds everything the context engineer may read. `train_errors` counts attempts without a judge score. Then start a fresh context-engineer session:

   ```text
   Caller agent: <your agent id>
   Read skills/mce-training/context-engineer.md in your Agent State and act only as the MCE context engineer.
   folder: <MCE>/iter<i>_sub<j>
   task_brief: <path to benchmark-training.md>
   ```

   Validate the result as in *Check a context* below. Send the same session each defect to fix; if one cannot be fixed, restore the folder's starting context, record the failure and continue.

4. **Validate.** Run the validation tasks with the last sub-iteration's `context/`, as fresh attempts even when some are the batch's tasks. The validation score is the mean of these attempts.

5. **Aggregate.** Add `iter<i>` to `meta_agent/evaluations.json` with `train_score` (the batch scores weighted by batch size), `val_score`, `val_total`, `total_rollouts`, `num_sub_iters` and `last_sub_folder`. Copy the learning Skill to `meta_agent/skills/iter<i>/SKILL.md`. The meta-agent reads these files in the next iteration.

Every iteration runs to its validation; there is no accept-or-reject gate. Selection happens once, after the budget.

## Check a context

A context is one Skill folder. It may hold any number of knowledge files, templates, checklists and scripts, in any structure the learning Skill chooses. Before it is used in a batch or validation, check that:

- `context/SKILL.md` exists, with frontmatter `name: mce-context`, a description of when it applies and a dated version, and its body tells the reader which files to open for what.
- Every file stays inside `context/`, and scripts run with only the Solver's own tools: no model or embedding calls, no training judge and no network beyond the business API.
- It contains no task ids, answer values copied from candidates, judge feedback text, scores or paths into `MCE`, `attempts/` or other records. Genuine API names, parameters and domain rules may stay.

Record each check. A context that fails it is not run.

## Select and export

After the last iteration, select the iteration with the highest `val_score` among iterations 1…R, the earliest on a tie, as `main.py` reports its best iteration. Save `MCE/selection.yaml` with the rule, every iteration's train and validation scores, the selected iteration and its context digest.

Copy that iteration's final `context/` unchanged to the Skill export path in `benchmark-training.md`, so its `SKILL.md` is the exported `SKILL.md`. Where the Benchmark requires final training answers, export each task's candidate from the selected iteration's validation attempts, or from its last batch for a task outside validation, and record the attempt ids. Do not generate new answers during export.

Export the whole `MCE` workspace, attempt records and `selection.yaml` to the training-records path. Keep them out of the exported context.

## Records

Number every measurement as a `step` with `native_stage` such as `iter2_sub0/rollout` or `iter2/validation`, its task ids, role (`rollout` or `validation`), context digest, learning Skill digest, per-task scores and the batch mean. Use `curve_kind: benchmark_score`; rollout and validation curves stay separate, and the selected iteration stays separate from the last one. The final training verifier's grade of the exported answers is a separate measurement.

Record cost, time and token categories for the whole training unit, including the meta-agent and context-engineer sessions. One training run has no across-run standard deviation; the controller evaluates the frozen `baseline` and `final` and owns the Test statistics.

## Adaptation notes

The implementation selects on a separate validation split. Reusing Train for validation is an explicit fallback for benchmarks without one; validation scores are then training measurements. Iteration 0 is optional, matching the implementation's default start at iteration 1. The implementation gives the context engineer `utils/llm.py` and `utils/embedding.py`; here the context engineer may delegate analysis with `run_subagent`, and context code cannot call a model. Rollouts share one business environment and are scored by the Benchmark's training judge rather than compared with reference answers. The context checks above have no counterpart in the agentic-diagnosis variant, which validates nothing; a context engineer whose defects cannot be fixed keeps that sub-iteration's starting context, where the implementation would stop the run.
