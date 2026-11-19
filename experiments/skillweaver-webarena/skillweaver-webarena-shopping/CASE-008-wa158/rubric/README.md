# Scoring rubric (max 100 points)

- 100 pts: every check below passes. Otherwise 0: WebArena multiplies its checks, so there is no partial credit.

Source: WebArena task 158 (web-arena-x/webarena@dce04686a56253aefba7b18a4fa0937cf1dc987b, `config_files/test.raw.json`), scored with the rules of its `evaluation_harness/evaluators.py`.

## Page check

The final page is the active tab's URL in the last `penguin browser` output of the Trace (the `tabs` the statement asks for, else the last `open`, `scan` or `exec` header); the Target's own claim does not count. Strip trailing `/`. It passes when, for at least one reference below, the reference's host+path is a substring of the final page's host+path, and every query parameter of the references has at least one of its values among the final page's values for that parameter (WebArena's `GOLD in PRED` rule):
- `http://localhost:7770/heiying-game-card-case-for-nintendo-switch-switch-oled-game-card-or-micro-sd-memory-cards-portable-switch-game-memory-card-storage-with-24-game-card-slots-and-24-micro-sd-card-slots-black.html`

Score from the Trace and the final reply only: never visit the website to check.
