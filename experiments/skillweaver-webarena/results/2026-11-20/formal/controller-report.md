# Controller final report — sw_shop_formal_r2 (experiment sw_shop_formal_r2-20261120T053006Z)

Written 2026-11-22 by the controller agent (sw_shop_formal_r2_ctl), after the final 30x3
measurement, all audits, and the scoreboard append. The older `report.md` in this directory
is the pre-invalidation practice-phase history and is kept unchanged; this file is the
final report for the H1 + final-library pairing.

## 1. Outcome (headline)

- **Final library (Skill 2026.11.21.40 / State v41) measured on the published benchmark
  skillweaver-webarena-shopping: 30 cases x 3 runs = 90 cells, all `status: ok`, 90 unique
  session ids, runtime fixed `custom` / `step-5-preview` / `medium`, strictly serial.
  Overall score 65.56 (mean of the 30 case means).**
- H1 baseline (empty library, State v1): **65.56** — already the accepted entry in
  BENCHMARK/scoreboard.yaml. The identical aggregate is a **genuine coincidence**, not a
  copy: 20/30 case means are identical, 10 cases differ at run level, and the deltas cancel
  exactly (9 cells up, 9 cells down, 72 cells unchanged) — independently verified by the
  supervisor.
- Supervisor's independent re-check (this session): 90 pairs re-read against the same task
  statements; 9 up / 9 down / 72 same; 70 deterministically re-scorable cells all match the
  worker scores, including CASE-030 run 3 (Markdown-bold `ANSWER: N/A` renders to a valid
  answer line); actual API runs only in CASE-008 runs 2/3 — matches the controller's own
  trace audit below.

## 2. Frozen state under measurement (unchanged after cell 90)

- Target `sw_shop_formal_r2`; LIB digest
  `9a75f2c1807daba38d60d309262090f5310a53152118cc4232a9a9f542282a92`;
  system_config.yaml sha256 `01635b89bbe9d9ff6b20274ff74d842e3f8b4c12582e2a51646e4da796f01250`;
  SKILL.md sha256 `2a3421202afa81751a4055ebae653d44d8491e514a4fd9f74b108920569ad44e`;
  version 41, thinking_level medium.
- Snapshots: `snapshots/v1.tar.gz` sha256
  `f89d5510ad206a36a8d497730a0f477f3cb0cc7b70bdff9aa3dae96d57e8aff0`,
  `snapshots/v41.tar.gz` sha256
  `5f15a08018d6a762c97f89ff6057d049efa951e89e1d25048247c31b4fe49c9b` — both present and
  unchanged after cell 90 (supervisor read-only verification of v41 content:
  `final-snapshot-verification.txt`, 122 files byte-identical).
- Site state: second reset (reset-2, 2026-11-21T17:24:18Z, same image as H1,
  sha256 8f9618d9194a46bc9f7bc96dc14deba0b968abce6c393d59cc7cd1dfec86ed6f, cron disabled,
  no prewarming); login evidence verified by the supervisor and copied byte-identical to
  `final-login.txt` (sha256 b0d43f01…d557ca6). No further reset, no H1 rerun, no practice.

## 3. Per-case, per-run scores — H1 vs FINAL (the two matrices)

Scores are 0/100 per run; case score = mean of 3 runs (2dp). Durations are case-mean
milliseconds (H1 convention: truncate the exact mean).

| 题目 | H1 r1/r2/r3 | H1均值 | H1时长ms | FINAL r1/r2/r3 | FINAL均值 | FINAL时长ms | API调用(最终) |
|---|---|---|---|---|---|---|---|
| CASE-001-wa21 | 0/0/0 | 0.00 | 221972 | 0/0/0 | 0.00 | 186563 | 0/0/0 |
| CASE-002-wa47 | 100/100/100 | 100.00 | 201634 | 100/100/100 | 100.00 | 200670 | 0/0/0 |
| CASE-003-wa96 | 100/100/100 | 100.00 | 122151 | 100/100/100 | 100.00 | 78924 | 0/0/0 |
| CASE-004-wa117 | 100/100/100 | 100.00 | 136649 | 100/100/100 | 100.00 | 84448 | 0/0/0 |
| CASE-005-wa124 | 0/0/0 | 0.00 | 200891 | 0/0/0 | 0.00 | 324896 | 0/0/0 |
| CASE-006-wa141 | 0/0/0 | 0.00 | 317045 | 0/0/0 | 0.00 | 203406 | 0/0/0 |
| CASE-007-wa146 | 0/0/0 | 0.00 | 164327 | 0/0/0 | 0.00 | 108214 | 0/0/0 |
| CASE-008-wa158 | 0/0/0 | 0.00 | 354530 | 0/0/0 | 0.00 | 275691 | **0/4/1** |
| CASE-009-wa163 | 0/0/0 | 0.00 | 505309 | 0/0/0 | 0.00 | 153853 | 0/0/0 |
| CASE-010-wa188 | 100/100/100 | 100.00 | 277429 | 100/100/100 | 100.00 | 75793 | 0/0/0 |
| CASE-011-wa225 | 100/100/100 | 100.00 | 399356 | 100/100/**0** | 66.67 | 497172 | 0/0/0 |
| CASE-012-wa226 | 100/100/0 | 66.67 | 582660 | **0/0/0** | 0.00 | 504745 | 0/0/0 |
| CASE-013-wa231 | 100/100/100 | 100.00 | 99825 | 100/100/100 | 100.00 | 76366 | 0/0/0 |
| CASE-014-wa238 | 0/0/100 | 33.33 | 144469 | **100/100/100** | 100.00 | 217543 | 0/0/0 |
| CASE-015-wa260 | 100/100/100 | 100.00 | 63762 | 100/100/100 | 100.00 | 72424 | 0/0/0 |
| CASE-016-wa269 | 0/100/0 | 33.33 | 361024 | **100/0/100** | 66.67 | 202611 | 0/0/0 |
| CASE-017-wa274 | 100/100/100 | 100.00 | 78418 | 100/100/100 | 100.00 | 361118 | 0/0/0 |
| CASE-018-wa279 | 100/100/100 | 100.00 | 1069922 | 100/100/100 | 100.00 | 410705 | 0/0/0 |
| CASE-019-wa283 | 0/100/100 | 66.67 | 660229 | 0/100/**0** | 33.33 | 380519 | 0/0/0 |
| CASE-020-wa284 | 100/100/100 | 100.00 | 1045385 | 100/100/100 | 100.00 | 452048 | 0/0/0 |
| CASE-021-wa298 | 100/100/100 | 100.00 | 246330 | 100/100/100 | 100.00 | 94025 | 0/0/0 |
| CASE-022-wa313 | 100/0/100 | 66.67 | 1389535 | 100/**100**/100 | 100.00 | 780204 | 0/0/0 |
| CASE-023-wa319 | 100/0/0 | 33.33 | 998987 | **0/0/100** | 33.33 | 373290 | 0/0/0 |
| CASE-024-wa324 | 0/0/0 | 0.00 | 140933 | **100/0/100** | 66.67 | 148461 | 0/0/0 |
| CASE-025-wa329 | 0/100/100 | 66.67 | 361813 | **100/0/0** | 33.33 | 131172 | 0/0/0 |
| CASE-026-wa334 | 100/100/100 | 100.00 | 148287 | 100/100/100 | 100.00 | 168801 | 0/0/0 |
| CASE-027-wa351 | 100/100/100 | 100.00 | 275935 | 100/100/**0** | 66.67 | 297119 | 0/0/0 |
| CASE-028-wa358 | 100/100/100 | 100.00 | 62204 | 100/100/100 | 100.00 | 62518 | 0/0/0 |
| CASE-029-wa368 | 100/100/100 | 100.00 | 1284222 | 100/100/100 | 100.00 | 370912 | 0/0/0 |
| CASE-030-wa376 | 100/100/100 | 100.00 | 771425 | 100/100/100 | 100.00 | 141163 | 0/0/0 |
| **总体** | — | **65.56** | **422888** | — | **65.56** | **247846** | **共 5 次** |

Bold marks a run whose score changed H1 -> FINAL.

## 4. Full 90-cell record (final matrix; authoritative raw record: `final-cells.jsonl`)

Columns: 题目 | 次 | 分数 | 状态 | 时长ms | 实际API调用 | INDEX.md读取(不计) | session_id

| CASE-001-wa21 | 1 | 0.00 | ok | 160875 | 0 | 1 | session-2026-11-22-01-30-28-40a75b1b |
| CASE-001-wa21 | 2 | 0.00 | ok | 185798 | 0 | 2 | session-2026-11-22-01-35-02-4e423e25 |
| CASE-001-wa21 | 3 | 0.00 | ok | 213018 | 0 | 2 | session-2026-11-22-01-40-01-a45ebcdc |
| CASE-002-wa47 | 1 | 100.00 | ok | 389482 | 0 | 2 | session-2026-11-22-01-45-21-37b38479 |
| CASE-002-wa47 | 2 | 100.00 | ok | 116474 | 0 | 1 | session-2026-11-22-01-53-56-3b473cf9 |
| CASE-002-wa47 | 3 | 100.00 | ok | 96054 | 0 | 2 | session-2026-11-22-01-57-34-1dabbe2a |
| CASE-003-wa96 | 1 | 100.00 | ok | 86102 | 0 | 2 | session-2026-11-22-02-00-40-3b0bc735 |
| CASE-003-wa96 | 2 | 100.00 | ok | 70582 | 0 | 2 | session-2026-11-22-02-03-40-9d362eb8 |
| CASE-003-wa96 | 3 | 100.00 | ok | 80088 | 0 | 2 | session-2026-11-22-02-06-47-0ea0c827 |
| CASE-004-wa117 | 1 | 100.00 | ok | 88593 | 0 | 2 | session-2026-11-22-02-09-53-1f57ab79 |
| CASE-004-wa117 | 2 | 100.00 | ok | 90477 | 0 | 2 | session-2026-11-22-02-13-30-2603ece1 |
| CASE-004-wa117 | 3 | 100.00 | ok | 74275 | 0 | 2 | session-2026-11-22-02-16-38-ee78be9b |
| CASE-005-wa124 | 1 | 0.00 | ok | 501590 | 0 | 2 | session-2026-11-22-02-19-17-a1834d70 |
| CASE-005-wa124 | 2 | 0.00 | ok | 298987 | 0 | 2 | session-2026-11-22-02-29-08-27226cce |
| CASE-005-wa124 | 3 | 0.00 | ok | 174111 | 0 | 2 | session-2026-11-22-02-35-31-c4751193 |
| CASE-006-wa141 | 1 | 0.00 | ok | 123261 | 0 | 2 | session-2026-11-22-02-40-09-11e1f6e2 |
| CASE-006-wa141 | 2 | 0.00 | ok | 216165 | 0 | 2 | session-2026-11-22-02-44-12-c1c39721 |
| CASE-006-wa141 | 3 | 0.00 | ok | 270793 | 0 | 1 | session-2026-11-22-02-49-23-8368b142 |
| CASE-007-wa146 | 1 | 0.00 | ok | 123431 | 0 | 2 | session-2026-11-22-02-55-34-8c74a033 |
| CASE-007-wa146 | 2 | 0.00 | ok | 89860 | 0 | 2 | session-2026-11-22-02-59-54-77f169b9 |
| CASE-007-wa146 | 3 | 0.00 | ok | 111353 | 0 | 2 | session-2026-11-22-03-03-14-7ac6e6a1 |
| CASE-008-wa158 | 1 | 0.00 | ok | 153007 | 0 | 1 | session-2026-11-22-03-06-37-dc9d4bab |
| CASE-008-wa158 | 2 | 0.00 | ok | 178546 | **4** | 2 | session-2026-11-22-03-10-45-ad7a5e5f |
| CASE-008-wa158 | 3 | 0.00 | ok | 495521 | **1** | 2 | session-2026-11-22-03-15-15-b8f83c81 |
| CASE-009-wa163 | 1 | 0.00 | ok | 158644 | 0 | 2 | session-2026-11-22-03-25-29-e29149c8 |
| CASE-009-wa163 | 2 | 0.00 | ok | 146721 | 0 | 1 | session-2026-11-22-03-30-23-9b07cba4 |
| CASE-009-wa163 | 3 | 0.00 | ok | 156195 | 0 | 2 | session-2026-11-22-03-35-51-209611f2 |
| CASE-010-wa188 | 1 | 100.00 | ok | 71049 | 0 | 2 | session-2026-11-22-03-40-42-e96c7665 |
| CASE-010-wa188 | 2 | 100.00 | ok | 72227 | 0 | 2 | session-2026-11-22-03-44-10-41e733aa |
| CASE-010-wa188 | 3 | 100.00 | ok | 84103 | 0 | 2 | session-2026-11-22-03-46-38-ae643a3c |
| CASE-011-wa225 | 1 | 100.00 | ok | 619359 | 0 | 2 | session-2026-11-22-03-49-18-4c963083 |
| CASE-011-wa225 | 2 | 100.00 | ok | 372033 | 0 | 3 | session-2026-11-22-04-01-07-10fdd25c |
| CASE-011-wa225 | 3 | 0.00 | ok | 500126 | 0 | 2 | session-2026-11-22-04-09-01-59da3387 |
| CASE-012-wa226 | 1 | 0.00 | ok | 492573 | 0 | 2 | session-2026-11-22-04-19-33-464efa9c |
| CASE-012-wa226 | 2 | 0.00 | ok | 580680 | 0 | 2 | session-2026-11-22-04-28-51-5b046aa3 |
| CASE-012-wa226 | 3 | 0.00 | ok | 440984 | 0 | 2 | session-2026-11-22-04-41-20-ac06117b |
| CASE-013-wa231 | 1 | 100.00 | ok | 62143 | 0 | 2 | session-2026-11-22-04-50-18-aaeb0fd5 |
| CASE-013-wa231 | 2 | 100.00 | ok | 85178 | 0 | 2 | session-2026-11-22-04-52-40-ddd38c4c |
| CASE-013-wa231 | 3 | 100.00 | ok | 81778 | 0 | 2 | session-2026-11-22-04-56-24-2a59b560 |
| CASE-014-wa238 | 1 | 100.00 | ok | 225845 | 0 | 2 | session-2026-11-22-04-59-13-3c21b5d3 |
| CASE-014-wa238 | 2 | 100.00 | ok | 184340 | 0 | 2 | session-2026-11-22-05-06-29-d4214839 |
| CASE-014-wa238 | 3 | 100.00 | ok | 242446 | 0 | 2 | session-2026-11-22-05-11-00-79532706 |
| CASE-015-wa260 | 1 | 100.00 | ok | 66895 | 0 | 2 | session-2026-11-22-05-16-25-1b5d6ede |
| CASE-015-wa260 | 2 | 100.00 | ok | 65711 | 0 | 2 | session-2026-11-22-05-18-59-a54b4f43 |
| CASE-015-wa260 | 3 | 100.00 | ok | 84668 | 0 | 1 | session-2026-11-22-05-21-38-cebcd167 |
| CASE-016-wa269 | 1 | 100.00 | ok | 144881 | 0 | 2 | session-2026-11-22-05-24-17-84160b19 |
| CASE-016-wa269 | 2 | 0.00 | ok | 264369 | 0 | 2 | session-2026-11-22-05-28-24-16127840 |
| CASE-016-wa269 | 3 | 100.00 | ok | 198583 | 0 | 2 | session-2026-11-22-05-34-17-72ed1d49 |
| CASE-017-wa274 | 1 | 100.00 | ok | 91605 | 0 | 1 | session-2026-11-22-05-39-56-fcbffcd5 |
| CASE-017-wa274 | 2 | 100.00 | ok | 91451 | 0 | 0 | session-2026-11-22-05-42-52-b061f938 |
| CASE-017-wa274 | 3 | 100.00 | ok | 900300 | 0 | 2 | session-2026-11-22-05-45-43-d33ffba3 |
| CASE-018-wa279 | 1 | 100.00 | ok | 514032 | 0 | 1 | session-2026-11-22-06-03-05-06e4b90a |
| CASE-018-wa279 | 2 | 100.00 | ok | 359930 | 0 | 2 | session-2026-11-22-06-12-55-d1ed486a |
| CASE-018-wa279 | 3 | 100.00 | ok | 358154 | 0 | 2 | session-2026-11-22-06-20-57-7e79bee7 |
| CASE-019-wa283 | 1 | 0.00 | ok | 374412 | 0 | 2 | session-2026-11-22-06-28-42-3aab68fe |
| CASE-019-wa283 | 2 | 100.00 | ok | 496251 | 0 | 1 | session-2026-11-22-06-36-28-9defbe80 |
| CASE-019-wa283 | 3 | 0.00 | ok | 270896 | 0 | 2 | session-2026-11-22-06-46-23-e7a8b694 |
| CASE-020-wa284 | 1 | 100.00 | ok | 560612 | 0 | 2 | session-2026-11-22-06-52-38-0ddf17dd |
| CASE-020-wa284 | 2 | 100.00 | ok | 517769 | 0 | 2 | session-2026-11-22-07-03-47-4042a442 |
| CASE-020-wa284 | 3 | 100.00 | ok | 277763 | 0 | 2 | session-2026-11-22-07-13-58-7709fb91 |
| CASE-021-wa298 | 1 | 100.00 | ok | 78677 | 0 | 2 | session-2026-11-22-07-20-28-4c981be6 |
| CASE-021-wa298 | 2 | 100.00 | ok | 134983 | 0 | 2 | session-2026-11-22-07-23-08-8792ad90 |
| CASE-021-wa298 | 3 | 100.00 | ok | 68415 | 0 | 2 | session-2026-11-22-07-27-04-85317243 |
| CASE-022-wa313 | 1 | 100.00 | ok | 773934 | 0 | 2 | session-2026-11-22-07-31-39-8c3abbb2 |
| CASE-022-wa313 | 2 | 100.00 | ok | 645343 | 0 | 2 | session-2026-11-22-07-46-11-e2747b15 |
| CASE-022-wa313 | 3 | 100.00 | ok | 921337 | 0 | 1 | session-2026-11-22-07-58-15-8eacf892 |
| CASE-023-wa319 | 1 | 0.00 | ok | 434723 | 0 | 1 | session-2026-11-22-08-16-24-8517871d |
| CASE-023-wa319 | 2 | 0.00 | ok | 202714 | 0 | 2 | session-2026-11-22-08-26-10-8e51094f |
| CASE-023-wa319 | 3 | 100.00 | ok | 482434 | 0 | 2 | session-2026-11-22-08-32-01-11313925 |
| CASE-024-wa324 | 1 | 100.00 | ok | 154714 | 0 | 3 | session-2026-11-22-08-42-58-ca5a44c9 |
| CASE-024-wa324 | 2 | 0.00 | ok | 122217 | 0 | 3 | session-2026-11-22-08-47-29-df49cd71 |
| CASE-024-wa324 | 3 | 100.00 | ok | 168453 | 0 | 2 | session-2026-11-22-08-51-37-499959ac |
| CASE-025-wa329 | 1 | 100.00 | ok | 153375 | 0 | 2 | session-2026-11-22-08-56-15-558985e5 |
| CASE-025-wa329 | 2 | 0.00 | ok | 97218 | 0 | 3 | session-2026-11-22-09-00-25-6d6915f8 |
| CASE-025-wa329 | 3 | 0.00 | ok | 142923 | 0 | 2 | session-2026-11-22-09-03-51-7954383f |
| CASE-026-wa334 | 1 | 100.00 | ok | 197162 | 0 | 2 | session-2026-11-22-09-09-15-6a56ae94 |
| CASE-026-wa334 | 2 | 100.00 | ok | 155675 | 0 | 2 | session-2026-11-22-09-14-38-766ab0f8 |
| CASE-026-wa334 | 3 | 100.00 | ok | 153566 | 0 | 2 | session-2026-11-22-09-18-45-f3217201 |
| CASE-027-wa351 | 1 | 100.00 | ok | 404812 | 0 | 2 | session-2026-11-22-09-24-06-38cdddfa |
| CASE-027-wa351 | 2 | 100.00 | ok | 278186 | 0 | 2 | session-2026-11-22-09-32-48-8878f920 |
| CASE-027-wa351 | 3 | 0.00 | ok | 208361 | 0 | 2 | session-2026-11-22-09-39-08-52acc0a5 |
| CASE-028-wa358 | 1 | 100.00 | ok | 54642 | 0 | 2 | session-2026-11-22-09-44-10-e96c7665 |
| CASE-028-wa358 | 2 | 100.00 | ok | 59545 | 0 | 2 | session-2026-11-22-09-46-42-4b0986ee |
| CASE-028-wa358 | 3 | 100.00 | ok | 73368 | 0 | 2 | session-2026-11-22-09-49-21-a17cd920 |
| CASE-029-wa368 | 1 | 100.00 | ok | 878340 | 0 | 2 | session-2026-11-22-09-51-51-a0647bca |
| CASE-029-wa368 | 2 | 100.00 | ok | 89586 | 0 | 2 | session-2026-11-22-10-07-42-eea19a8a |
| CASE-029-wa368 | 3 | 100.00 | ok | 144812 | 0 | 2 | session-2026-11-22-10-12-21-21b7142d |
| CASE-030-wa376 | 1 | 100.00 | ok | 116210 | 0 | 2 | session-2026-11-22-10-16-14-0fe2fb06 |
| CASE-030-wa376 | 2 | 100.00 | ok | 128710 | 0 | 1 | session-2026-11-22-10-19-52-cb34c425 |
| CASE-030-wa376 | 3 | 100.00 | ok | 178569 | 0 | 2 | session-2026-11-22-10-24-05-e4992aec |

Session-id integrity: all 90 unique; every session's root Trace re-opened and its embedded
task number matched the cell's case (90/90 verified — `final-api-calls.jsonl`).

## 5. Actual API calls (INDEX.md reads excluded)

Counting rule: an actual API call = an `exec_command` tool call that launches an API script
of the frozen library (a `.mjs` under `skills/skillweaver-apis/apis/`), by full path or by
name after `cd` into that directory. Reads of `apis/INDEX.md` (0–3 per cell, listed in the
table above) are index reads and are NOT counted.

- **H1 matrix: 0 API calls in all 90 cells** (the library was empty at v1; cells could only
  read INDEX.md/site.md).
- **Final matrix: 5 API calls in total, all `search_products_in_category`, all in
  CASE-008-wa158 (runs 2 and 3 only; run 1 used none)** — matching the supervisor's
  independent audit exactly:
  - run 2 (session-2026-11-22-03-10-45-ad7a5e5f), 4 launch commands:
    1. `search_products_in_category {"category":"Video Games","keyword":"card case"}` —
       returned `{"ok":true,…}`, output truncated by the harness (archived).
    2. same script with output redirected to `/tmp/gamecard.json` + a `node -e`
       post-processing step — the post-processing failed with
       `Cannot find module '/tmp/gamecard.json'` (the redirect target was not visible to
       the follow-up process on this Windows host).
    3. same script with output redirected into the session scratchpad + post-processing —
       returned the filtered product list.
    4. same script, keyword `switch card`, scratchpad redirect + post-processing —
       returned the filtered product list.
  - run 3 (session-2026-11-22-03-15-15-b8f83c81), 1 launch command:
    5. `search_products_in_category {"category":"Video Games","keyword":"Game Card"}` —
       returned `{"ok":true,…}`, output truncated by the harness (archived).
  - Net: 2 successful launches with truncation flag, 2 post-processing runs that returned
    filtered results, 1 post-processing run that could not find `/tmp/gamecard.json`.
  - All 5 calls are read-only searches; CASE-008 is a read-only task (find a storage
    option) and scored 0 in both matrices for answer-format reasons unrelated to the API.
- No other cell in either matrix invoked any API script; every other cell worked through
  the agent browser (`penguin browser`) directly.

## 6. Costs and durations (all roles)

- **Cost: null in every cell of both matrices** (180 runs, H1 + final). No USD cost is
  recorded in any Trace — token usage only. The scoreboard entries therefore carry
  `cost: null` at evaluation, case and run level; the same applies to the scoring/review
  roles, whose work is controller-side with no metered cost.
- Durations (measurement-worker cells):
  - H1: 90 runs, total 38,059,997 ms, mean run 422,888.9 ms; scoreboard duration_ms
    422888 (mean of the 30 case means, H1 truncation convention).
  - FINAL: 90 runs, total 22,306,153 ms, mean run 247,846.1 ms; scoreboard duration_ms
    247846.
  - FINAL is faster on 21/30 case-mean durations, slower on 9/30.
  - Longest FINAL cells: CASE-017 run 3 (900,300 ms — infrastructure wait, see §8),
    CASE-022 run 3 (921,337 ms), CASE-029 run 1 (878,340 ms).
- Controller-side audit time (this session, not part of the matrix): DB fingerprint +
  window queries, trace API-call audit of 180 sessions, scoreboard append and re-parse —
  all read-only, no model runs.

## 7. Deviations between the two matrices

- Run-level differences (10 cases; all other runs identical):
  - CASE-011-wa225 [100,100,100] -> [100,100,0] (case 100.00 -> 66.67)
  - CASE-012-wa226 [100,100,0] -> [0,0,0] (case 66.67 -> 0.00)
  - CASE-014-wa238 [0,0,100] -> [100,100,100] (case 33.33 -> 100.00)
  - CASE-016-wa269 [0,100,0] -> [100,0,100] (case 33.33 -> 66.67)
  - CASE-019-wa283 [0,100,100] -> [0,100,0] (case 66.67 -> 33.33)
  - CASE-022-wa313 [100,0,100] -> [100,100,100] (case 66.67 -> 100.00)
  - CASE-023-wa319 [100,0,0] -> [0,0,100] (case 33.33 -> 33.33, same mean, different runs)
  - CASE-024-wa324 [0,0,0] -> [100,0,100] (case 0.00 -> 66.67)
  - CASE-025-wa329 [0,100,100] -> [100,0,0] (case 66.67 -> 33.33)
  - CASE-027-wa351 [100,100,100] -> [100,100,0] (case 100.00 -> 66.67)
- Cell level: 9 cells up, 9 cells down, 72 cells unchanged (supervisor-verified).
- The identical 65.56 aggregate is arithmetic coincidence: the 9 up-cells (+900) and 9
  down-cells (−900) cancel exactly, so the sum of case means is unchanged
  (1966.67/30 = 65.5556… -> 65.56 in both matrices). Nothing was copied or reused; both
  matrices come from independent runs with their own 90 session ids.

## 8. Audit conclusions (integrity)

- Matrix audit: 90/90 cells, 30/30 cases, runs exactly [1,2,3] per case, 90 unique session
  ids, all custom/step-5-preview/medium, all status ok.
- STATE audit after cell 90: LIB digest, system_config.yaml sha256, SKILL.md sha256,
  version 41, thinking_level medium — all unchanged; both snapshots unchanged. STATE tree
  digest moved 5e158141… -> c5644066… (expected runtime drift: every `penguin run` writes
  Traces; same pattern as H1). Diff of the live STATE tree vs v41.tar.gz: zero deletions;
  55 additions, all traces/memory/workspaces/scratchpad.
- Target-trace audit: 90/90 session->task mapping verified from the traces (this session).
- DB store-state audit (`final-db-audit.md`): read-only CHECKSUM fingerprint vs the
  post-reset baseline shows NO change to any business table a task reads
  (sales_order*, sales_creditmemo*, catalog_*, review*, rating*, customer_entity,
  customer_address_entity, wishlist* all identical). Only quote/quote_address (291 new
  empty guest quotes — all customer NULL, 0 items, 0 real-content address rows since
  reset-2) and customer_visitor/customer_log (session tracking) changed = §3.1
  record-only class. Verdict: matrix valid, no cell re-run.
- Infrastructure events (`events-browser.md`): CASE-017-wa274 run 3 hit the shared browser
  tab ceiling (too_many_tabs; tabs owned by other sessions), waited for a slot, finished
  within the 900 s budget (duration 900,300 ms), scored 100.00. No foreign process or tab
  was touched. `events-429.md`: no provider rate-limit events in this window.
- Scoreboard: one final-library evaluation appended to
  `<EXPERIMENT_ROOT>/penguin-data/default_project/benchmarks/skillweaver-webarena-shopping/scoreboard.yaml`
  at 2026-11-22T02:39:38Z (version 41, score 65.56, cost null, duration_ms 247846, 30
  cases x 3 runs with session ids); the file re-parses cleanly with both evaluations and
  the H1 entry byte-identical. Duration values follow the H1 convention (truncate the
  exact mean), verified against all 30 H1 cases and the H1 overall value.
- Records: nothing discarded. Every worker reply, cell record, audit output and event log
  is kept. One documentation defect found and worked around (not hidden): the session-id
  list inside handoff-h69 was written in a misaligned order (its 12th entry
  session-2026-11-22-02-16-38-ee78be9b is actually CASE-004 run 3, task 117, verified from
  the trace). The authoritative mapping is `final-cells.jsonl`, confirmed 90/90 against
  trace-embedded task numbers; the scoreboard uses the authoritative mapping.

## 9. Re-run materials

- OUT (this directory): `final-cells.jsonl` (90 lines, authoritative per-cell record),
  `final-api-calls.jsonl` (per-cell API/index/tool-call counts + session->task
  verification), `final-baseline.md`, `final-login.txt`, `final-snapshot-verification.txt`,
  `final-db-audit.md`, `db_fingerprint_final_after.txt`, `state.yaml` (phase
  final-measurement; final.status completed, score 65.56), `events-browser.md`,
  `events-429.md`, `experiment.yaml`, `h1/` (H1 per-cell records and the read-only DB
  scripts), `freeze.md`, `reset-2.log`.
- BENCHMARK: `<EXPERIMENT_ROOT>/penguin-data/default_project/benchmarks/skillweaver-webarena-shopping/`
  (30 published cases; scoreboard.yaml with the H1 and final entries).
- TARGET: `<EXPERIMENT_ROOT>/penguin-data/default_project/agents/sw_shop_formal_r2`
  (agent_state with snapshots v1+v41; workspaces/ with the 90 per-cell workspaces;
  traces/2026-11-22/ with the 90 root Traces named by session id).
- To re-verify any cell: open `TARGET/traces/2026-11-22/<session_id>_001.jsonl` (full
  tool-call transcript) and the matching `TARGET/workspaces/` directory; scores come from
  the pre-registered rubric in `BENCHMARK/<case>/rubric/` (private).

## 10. OUT path

`<EXPERIMENT_ROOT>/penguin-data/default_project/agents/sw_shop_formal_r2_ctl/agent_state/scratchpad/session-2026-11-20-13-28-32-d13e8890/skillweaver-rsi-toolkit/sw_shop_formal_r2-20261120T053006Z/`
