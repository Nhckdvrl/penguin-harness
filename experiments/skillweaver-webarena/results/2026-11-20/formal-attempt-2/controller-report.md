# Controller end-report — sw_shop_formal_r2-20261120T053006Z

**Experiment status: `invalid-env-store-state` (supervisor ruling, 2026-11-21).**
Run identity: SkillWeaver on Target `sw_shop_formal_r2`, site http://localhost:7770
(`live_site: false`), settings `iterations: 40`, `test_probability: 0.5`,
`max_actions: 10`, `return_home: every iteration`; benchmark
`skillweaver-webarena-shopping` (30 cases × 3 runs); runtime `custom/step-5-preview`,
`thinking_level: medium`, fixed for the whole experiment; every role and every Target
unit strictly serial. Reset-1 and the H1 sign-in were supervisor-executed before this
round; H1 ran cells 1–90, then the practice loop was halted by the supervisor steering
below. This report is the round's complete record; all evidence is preserved in this
OUT directory.

## 1. Outcome

- **H1 measurement: 90/90 cells executed and recorded** (30 cases × 3 runs), every cell
  `status: ok`, every `cost: null`, the State-core check clean in every cell.
- **The H1 matrix is INVALID**: during CASE-022-wa313 run 3 (cell 66) the Target's run
  wrote real, persistent billing/shipping address rows onto the signed-in test
  customer's active cart (quote 255) — an actual store-state change in the
  pre-registered invalidation set. Per the pre-registered plan (plan.md phase 2) and
  the supervisor's ruling, the experiment is marked **invalid-env-store-state**.
- **No H1 evaluation record was appended to `BENCHMARK/scoreboard.yaml`** (no scoreboard
  file exists for this benchmark). The recorded matrix score, for the record only and
  **not scoreboard-eligible**, is **65.56** (average of the 30 Case averages; cell-003
  corrected score applied).
- **Practice loop: 0 of 40 iterations completed** — halted by supervisor steering before
  iteration 0's practice cell; no Target practice cell ever ran and the library is
  unchanged from H1 (empty, no registered API; library digest
  `189211de47ef178bfa9c0cc62dce7aea9e026b5e54634e3502b16509e57be0f7`, identical to
  `library_fingerprint_h1.txt`).
- **No reset-2 and no final measurement** were performed (supervisor steering: no
  pairable final measurement for an invalid environment). The supervisor re-runs
  separately with a new run; both phases use the same post-login initialization flow.

## 2. The invalidation event (cell 66, CASE-022-wa313 run 3)

Full record: `h1/cell-066/README.md`. The task statement demands a read-only storefront.
During the run (Target session `session-2026-11-21-01-02-17-abfd2cc5`, duration
1,285,802 ms), the Target's own `penguin browser exec` fetches of `/checkout/cart/`
(17:19:01, 17:21:33 UTC) and `/customer/address/` (17:19:45) caused Magento to
auto-assign the signed-in customer's default billing/shipping addresses onto the
customer's ACTIVE quote 255: `quote_address` rows 1251 (billing, 17:19:49) and 1252
(shipping, 17:21:35) with real content (customer_id 27, customer_address_id 26 — Emma
Lopez, <REDACTED>, San Mateo 94010); quote 255's `updated_at` moved. Cart items
(`quote_item`), the address book (`customer_address_entity`), `customer_entity`,
`sales_order` and all other business tables were unchanged. The Target submitted no
form, but the store-state change is real and persistent. Score 100.00 stands for that
cell (the pre-registered rubric scores only the ANSWER line; the rubric never changes).

## 3. Other recorded integrity events

- **Cells 64 and 65 — `customer_visitor` session tracking** (`h1/cell-064/README.md`,
  `h1/cell-065/README.md`): the checksum delta is the test customer's own
  visitor-session tracking row (visitor_id 47, `last_visit_at` moved inside the run
  window). Classified "matrix stays valid" (session tracking, outside the
  cart/wishlist/order/review/account set) — this ruling was never separately confirmed;
  the matrix is invalid regardless, on cell 66.
- **Cells 85, 86, 87, 88, 90 — mechanical "REAL CHANGE" verdicts, scaffolding only**
  (per-cell READMEs): `check_db_change.sh`'s scaffolding query counts `quote_address`
  rows since the MATRIX BASELINE, so the two historical cell-66 rows are permanently
  re-counted whenever quote/quote_address change. Window-scoped investigation proved
  each of these cells created only empty guest quotes (customer NULL, 0 items) and
  their all-NULL address rows — the verified-empty guest scaffolding the rules allow —
  with no new real-content write. Scores stand. The check scripts were not modified.

## 4. Scoring correction (cell 3, CASE-001-wa21 run 3)

Original worker reply: 100.00 (`h1/cell-003/worker-reply.yaml`, kept unchanged). The
rubric counts only the final `ANSWER:` line; that line lacked the required name
`Joseph Brzezinski` (present only in the reply body, which the rubric does not count).
Independent re-score: 0.00 (`independent-rescore.yaml`). Post-matrix scoring-role
re-review of the SAME Trace (`session-2026-11-20-13-50-41-2bbb186e`) with the SAME
rubric, without consulting the prior records: 0.00 (`scoring-role-recheck.yaml`).
Deterministic audit agrees (audit 0 vs worker 100 — the audit's single disagreement,
which validates the correction). **Corrected score used for the matrix: 0.00.**

## 5. H1 per-case table (corrected scores; runs in order → case average)

| case | runs | avg | | case | runs | avg |
|------|------|-----|---|------|------|-----|
| CASE-001-wa21 | 0/0/0 | 0.00 | | CASE-016-wa269 | 0/100/0 | 33.33 |
| CASE-002-wa47 | 100/100/100 | 100.00 | | CASE-017-wa274 | 100/100/100 | 100.00 |
| CASE-003-wa96 | 100/100/100 | 100.00 | | CASE-018-wa279 | 100/100/100 | 100.00 |
| CASE-004-wa117 | 100/100/100 | 100.00 | | CASE-019-wa283 | 0/100/100 | 66.67 |
| CASE-005-wa124 | 0/0/0 | 0.00 | | CASE-020-wa284 | 100/100/100 | 100.00 |
| CASE-006-wa141 | 0/0/0 | 0.00 | | CASE-021-wa298 | 100/100/100 | 100.00 |
| CASE-007-wa146 | 0/0/0 | 0.00 | | CASE-022-wa313 | 100/0/100 | 66.67 |
| CASE-008-wa158 | 0/0/0 | 0.00 | | CASE-023-wa319 | 100/0/0 | 33.33 |
| CASE-009-wa163 | 0/0/0 | 0.00 | | CASE-024-wa324 | 0/0/0 | 0.00 |
| CASE-010-wa188 | 100/100/100 | 100.00 | | CASE-025-wa329 | 0/100/100 | 66.67 |
| CASE-011-wa225 | 100/100/100 | 100.00 | | CASE-026-wa334 | 100/100/100 | 100.00 |
| CASE-012-wa226 | 100/100/0 | 66.67 | | CASE-027-wa351 | 100/100/100 | 100.00 |
| CASE-013-wa231 | 100/100/100 | 100.00 | | CASE-028-wa358 | 100/100/100 | 100.00 |
| CASE-014-wa238 | 0/0/100 | 33.33 | | CASE-029-wa368 | 100/100/100 | 100.00 |
| CASE-015-wa260 | 100/100/100 | 100.00 | | CASE-030-wa376 | 100/100/100 | 100.00 |

Case-sum 1966.67 / 30 = **65.56**; mean cell duration 422,889 ms; every cell cost null.
Also in `h1-summary.md` and `h1-deterministic-audit.csv`.

## 6. Integrity verification performed

- **STATE read-only through the matrix**: TOOL fingerprint after the matrix
  (`state_fingerprint_h1_after.txt`, digest
  `f6cc97f0ed9c54cb3459cd674e9df5db8858f54ac9fc3304871c5d97fd6314a6`) differs from the
  before-digest only by 90 new files, all under `workspaces/`, `memory/case-*` and
  `scratchpad/` — the cells' own outputs; 0 removed, 0 changed. The 12 registered core
  files are byte-identical (`state_core_after_h1.txt`: "STATE CORE OK: all 12
  registered files byte-identical"; the same check passed in every cell).
- **Library unchanged**: digest identical to the H1 fingerprint; no Publish, no test,
  no role edit.
- **Deterministic audit** (`h1-deterministic-audit.csv`): 69 deterministic checks,
  1 disagreement — the cell-003 correction (Section 4).
- **Worker discipline**: every worker reply is exactly one plain YAML document; prose
  prefixes were corrected by asking the SAME worker to resend (no rerun); no Target
  session was ever repeated or relaunched.
- **Infrastructure**: no 429 or other infrastructure events during cells 86–90 or the
  halted iteration 0 (`events-429.md` records only the 2026-11-20 pre-H1 rate-limit
  episode, which executed no measurement cell).

## 7. Practice-loop halt (supervisor steering, 2026-11-21)

After H1 completed, the supervisor ruled: keep the 90 cells, the corrected scoring, the
state evidence and the full history; mark the experiment `invalid-env-store-state`; do
not start new iterations; do not execute reset-2; no pairable final measurement; write
this end-report and end the session. Iteration 0 had completed only its home-page step
(`iter_0/page.txt`), its choose step (`iter_0/choose.json`, u = 0.7216 → explore) and
its Proposer call (`iter_0/proposer-reply.json` — the advanced-search skill proposal);
**no practice cell (Target run) was started** and none is started now. The library
remains exactly as H1 left it.

## 8. What remains for the supervisor

- A ruling, if wanted, on the `customer_visitor` event class (cells 64/65) — moot for
  this run, which is invalid on cell 66 regardless.
- The planned re-run as a NEW experiment (new run id), with both phases using the same
  post-login initialization flow (supervisor-executed sign-in, then reset before H1 and
  before the final measurement), per the pre-registered plan.
- Artifacts in this OUT: `plan.md`, `experiment.yaml`, `state.yaml` (terminal:
  `invalid-env-store-state`), `h1/cell-001…090/` (worker replies, DB and State verdicts;
  READMEs at cells 003, 009, 034, 052, 064, 065, 066, 085–088, 090), `h1-summary.md`,
  `h1-deterministic-audit.csv`, `iter_0/`, `reset-1.log`, `h1-login.txt`,
  `events-429.md`, the fingerprint files and the check scripts.
