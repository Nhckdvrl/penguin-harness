# Scoring rubric (max 100 points)

- 100 pts: every check below passes. Otherwise 0: WebArena multiplies its checks, so there is no partial credit.

Source: WebArena task 368 (web-arena-x/webarena@dce04686a56253aefba7b18a4fa0937cf1dc987b, `config_files/test.raw.json`), scored with the rules of its `evaluation_harness/evaluators.py`.

## Answer check

The answer is the text after `ANSWER:` on the last such line of the Target's final reply; no such line scores 0. Normalise both the answer and every reference value as WebArena's `clean_answer` does: strip surrounding whitespace, then one pair of surrounding single or double quotes, then lowercase.

- fuzzy_match `N/A`: the task cannot be done. The answer passes when it is exactly `n/a` after normalisation, or when it says the task cannot be done for the reason: "There is no function to show only discount items" (WebArena's ua_match, a judgment).

Score from the Trace and the final reply only: never visit the website to check.
