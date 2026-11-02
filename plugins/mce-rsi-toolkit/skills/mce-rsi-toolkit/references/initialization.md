# Prepare the experiment

Resolve the Project from the current Penguin Environment's App Data Dir. Use the host and output directory named by the user; otherwise use this Session's workspace or scratchpad. Record the selected packages, task sources, runtime, one training run per training unit, test repetitions (default: three), MCE settings, comparison versions and resource limits in a short experiment record.

Use the user's experiment/report version when supplied; otherwise assign a stable version before launch and include it in every progress and final report. Resolve component versions with the same priority: user-specified versions first, otherwise compatible versions selected from the environment and benchmark instructions. Record the Harness and runner versions, benchmark package version and resolved source revision, provider/model identifier and thinking level for each role, and toolkit version. Record a concrete model revision when exposed by the provider; otherwise retain the actual model identifier. Keep this configuration fixed throughout the experiment and add each State version and digest when it is frozen.

## Runtime and directories

Read the selected Case statements and benchmark instructions. They specify Docker, Harbor or another runner, its adapter, model configuration, task paths and artifact collection. Reuse the current CLI and configured model connection. Follow the benchmark's installation procedure for the Target; use the same prepared source build throughout when the experiment requests one. The adapter copies credentials privately; keep them out of prompts and experiment records.

Use a separate directory for each benchmark or independent training unit, with one set of frozen State archives and learning records. Give test outputs distinct paths by State, repetition and case. Keep a launch index so the controller can resume collection after context compaction. Keep task source and grading implementation unchanged during the experiment. Fetch benchmark source once at the requested version, or resolve the installed package's link when no version was requested; an existing unrelated checkout is not an input.

Before starting training, verify that a training attempt can obtain the evaluator feedback MCE needs. A reachable business service alone does not confirm that training feedback is available.

Inspect active runs without changing ownership or permissions on their mounted log directories. Organize a completed trial's artifacts after its runner exits, so collection does not interrupt another trial's logging.

## The common base State

Use the requested base Agent, or create a fresh Agent through the CLI. It is separate from the experiment controller. A new Agent can be created with:

```bash
penguin agent create --agent-id <unused-id> --project-id <project-id> --json
```

Use the same base for all comparisons, without a learned business Skill unless one was requested as the baseline. Set the requested thinking level in `system_config.yaml`. Disable persistent memory and state-mutating hooks in these experiment States. Align the State's turn limits, including `compaction.max_session_turns`, and the runner's limits with the benchmark. These settings do not clear the continuing training conversation.

Snapshot this base before adding learning instructions. Pass the selected provider, model and thinking level explicitly to every launch, including delegated child sessions.

## The Solver template and the context reader

Copy the base into a Solver template. It receives one fixed reader instruction in `AGENTS.md`, the same one every final test State receives:

```text
Complete the supplied benchmark task. If skills/mce-context/SKILL.md is
installed, read it at task start, explore the files it points to and use
what applies to this task. Follow the supplied task's input and output
contract.
```

The template has no `skills/mce-context/` folder: an iteration's first rollouts run without context, as the implementation's do. The training Agent installs a frozen copy of the current context into the Solver's State before each batch. The Solver template and the final test State differ only by runtime-managed attempt artifacts and the installed context, not their solving capabilities.

## The training State

Copy the base, then install:

| Source | Destination relative to the training Agent State |
| --- | --- |
| Toolkit `references/training.md` | `skills/mce-training/SKILL.md` |
| Toolkit `references/meta-agent.md` | `skills/mce-training/meta-agent.md` |
| Toolkit `references/context-engineer.md` | `skills/mce-training/context-engineer.md` |
| The prepared Solver template | `skills/mce-training/assets/solver-state/` |
| Public benchmark training brief | `skills/mce-training/benchmark-training.md` |
| Resolved run configuration | `training-request.json` at the State root |

`training-request.json` contains this run's benchmark, training unit and ordered Train task IDs, the fixed validation task IDs and validation source, iterations R, batch size, task order and seed when applicable, whether iteration 0 runs, the selection rule and tie-break, the Solver identity, Project and provider/model/thinking, the meta-agent and context-engineer model settings (the training Agent's own by default), runtime limits, the Solver template location, the MCE workspace directory and the export locations. Paths must resolve inside the container. Test repetition indices belong to the controller's test schedule and do not create additional training requests.

Write `benchmark-training.md` from the selected benchmark's learner-facing instructions: where training inputs and tools are, how to request feedback, what the score means, the state reset semantics, and where to export answers, the final Skill and learning records. Include public Train inputs and authorized validation tasks, with their roles and overlap stated explicitly; held-out Test questions and repository grader files do not belong in this brief.

Add a short reader instruction to the training State's `AGENTS.md`:

```text
For a whole training run, read training-request.json beside this file and
skills/mce-training/SKILL.md, then complete MCE in this continuing Session
and environment. For a delegated meta-agent or context-engineer request,
read only the role file that request names and do that role; do not start
an MCE loop. Run every Solver attempt as the supplied Solver identity.
```

Use the in-container CLI to create the Solver identity and install the template in its State. Every Solver call binds that identity and runtime explicitly, so it receives solving instructions rather than training instructions. The training Agent receives learner instructions, not the outer experiment-controller Skill.

## The test States

After training, identify the selected iteration from the learning records and preserve its complete context folder. Prepare two test States from the same base: the pre-training base, without a learned Skill unless the user supplied one, and the same base with exactly the selected `skills/mce-context/` folder plus the fixed reader instruction above. Learning Skills, the skill database, training answers, feedback and conversations do not enter either test State.

Keep each State frozen during measurement and record its version and digest. Reuse the same archive for all three test repetitions of that State, restoring it into a fresh environment and conversation for each case. Test outputs stay outside the frozen archive. Preserve existing snapshots; distinct States of the same Agent use distinct versions.

## State handoff

Follow the runner's current State-import contract. For the Penguin Harbor adapter, `agent_state_tar` takes an archive whose root contains the State files, not an enclosing `agent_state/` directory:

```bash
tar --exclude=./.vault.toml --exclude=./memory --exclude=./schedule \
  -czf "$STATE_TAR" -C "$STATE_DIR" .
```

The executable installation and the Agent State are separate inputs. Pass the frozen archive to the adapter using the argument documented by the benchmark. Verify that the selected context reaches the final test State before launching tests.

## Source-built runtime when requested

Method instructions and learned contexts travel in State archives. Use the Benchmark's normal executable installation unless a source build is requested. Prefer a prepared bundle; otherwise follow the current adapter's installation-bundle contract and stage the CLI with its production dependencies, plugin resources, Benchmark packages and compatible runtime. Keep credentials and State separate. Record the source commit and bundle digest, and reuse that executable for all trials; context changes only change the State.
