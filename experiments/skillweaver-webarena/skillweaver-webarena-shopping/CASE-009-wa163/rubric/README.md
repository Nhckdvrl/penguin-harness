# Scoring rubric (max 100 points)

- 100 pts: every check below passes. Otherwise 0: WebArena multiplies its checks, so there is no partial credit.

Source: WebArena task 163 (web-arena-x/webarena@dce04686a56253aefba7b18a4fa0937cf1dc987b, `config_files/test.raw.json`), scored with the rules of its `evaluation_harness/evaluators.py`.

## Answer check

The answer is the text after `ANSWER:` on the last such line of the Target's final reply; no such line scores 0. Normalise both the answer and every reference value as WebArena's `clean_answer` does: strip surrounding whitespace, then one pair of surrounding single or double quotes, then lowercase.

- must_include: each of these normalised values appears in the normalised answer as a substring:
  - `I ordered the 16gb but I only got 14 gigs even though I formatted the card`
  - `The memory card is kind of slow on games and downloads`
  - `No original packaging It's used and the previous owners data has not been erased`
  - `The product is a legit sony hardware that have been owned by someone else before`
  - `The media could not be loaded`
  - `I could not format the card so I wasn’t able to use it for my VITA`

Score from the Trace and the final reply only: never visit the website to check.
