#!/usr/bin/env python3
"""Build a PenguinHarness Benchmark (RFC-0001 Workspace cases) from WebArena Shopping tasks.

The subset is fixed by rule, not picked by hand:
  1. tasks whose only site is `shopping`;
  2. whose evaluation is `string_match` and/or `url_match` (scorable from the Target's final answer
     and the URLs its Trace shows); `program_html` tasks need the page's DOM after the run, which a
     Workspace evaluation cannot read, so they are left out;
  3. one task per `intent_template_id` (the lowest task_id), so no template is counted twice;
  4. the first N of those by task_id.

Usage: make_benchmark.py <webarena test.raw.json> <out_dir> [--site-url http://localhost:7770] [--n 30]
"""

import argparse
import hashlib
import json
import pathlib
import textwrap

WEBARENA_COMMIT = "dce04686a56253aefba7b18a4fa0937cf1dc987b"
BENCH_ID = "skillweaver-webarena-shopping"
ALLOWED = {"string_match", "url_match"}


def select(tasks, n):
    pool = [
        t
        for t in tasks
        if t["sites"] == ["shopping"] and set(t["eval"]["eval_types"]) <= ALLOWED
    ]
    first_per_template = {}
    for t in sorted(pool, key=lambda t: t["task_id"]):
        first_per_template.setdefault(t["intent_template_id"], t)
    return sorted(first_per_template.values(), key=lambda t: t["task_id"])[:n]


def site(url, site_url):
    return url.replace("__SHOPPING__", site_url.rstrip("/"))


def statement(t, site_url):
    url_task = "url_match" in t["eval"]["eval_types"]
    answer_task = "string_match" in t["eval"]["eval_types"]
    lines = [
        f"# WebArena Shopping task {t['task_id']}",
        "",
        f"Website: {site_url.rstrip('/')} (an online store; you are already signed in as its customer in the agent browser)",
        f"Start page: {site(t['start_url'], site_url)}",
        "",
        "## Task",
        "",
        t["intent"],
        "",
        "## How to answer",
        "",
        "Start from the specified page. Access this website only with `penguin browser` and any registered SkillWeaver APIs that invoke it. Do not use `curl`, `wget`, standalone HTTP clients or other browser tools, including for verification or fallback. Browser scripts remain within the site's origin. Keep your Agent State, including memory, read-only. Keep the storefront read-only for this task. Do not add, remove, or change cart or wishlist items, change account details, submit forms that modify store data, sign out, or buy anything. Use a learned API only if it leaves the store state unchanged.",
    ]
    if answer_task:
        lines.append(
            "End your final reply with one line `ANSWER: <your answer>`. If the task cannot be done on this website, answer `ANSWER: N/A` and say why in one sentence above it."
        )
    if url_task:
        lines.append(
            "When you are on the page the task asks for, stay there and run `penguin browser tabs` as your last command, so the page you ended on is recorded."
        )
        if not answer_task:
            lines.append("Then end your final reply with one line `ANSWER: done`.")
    return "\n".join(lines) + "\n"


def rubric(t, site_url):
    ev = t["eval"]
    parts = [
        "# Scoring rubric (max 100 points)",
        "",
        "- 100 pts: every check below passes. Otherwise 0: WebArena multiplies its checks, so there is no partial credit.",
        "",
        f"Source: WebArena task {t['task_id']} (web-arena-x/webarena@{WEBARENA_COMMIT}, `config_files/test.raw.json`), scored with the rules of its `evaluation_harness/evaluators.py`.",
        "",
    ]
    if "string_match" in ev["eval_types"]:
        ref = ev["reference_answers"]
        parts += [
            "## Answer check",
            "",
            "The answer is the text after `ANSWER:` on the last such line of the Target's final reply; no such line scores 0. Normalise both the answer and every reference value as WebArena's `clean_answer` does: strip surrounding whitespace, then one pair of surrounding single or double quotes, then lowercase.",
            "",
        ]
        if "exact_match" in ref:
            parts.append(f"- exact_match: the normalised answer equals the normalised reference `{ref['exact_match']}`.")
        if "must_include" in ref:
            vals = ref["must_include"]
            rule = (
                "as a whole word (WebArena tokenises when there is one value of one character)"
                if len(vals) == 1 and len(vals[0].strip()) == 1
                else "as a substring"
            )
            parts.append("- must_include: each of these normalised values appears in the normalised answer " + rule + ":")
            parts += [f"  - `{v}`" for v in vals]
        if "fuzzy_match" in ref:
            fm = ref["fuzzy_match"]
            if fm == "N/A":
                note = ev.get("string_note", "")
                parts.append(
                    "- fuzzy_match `N/A`: the task cannot be done. The answer passes when it is exactly `n/a` after normalisation, or when it says the task cannot be done for the reason: "
                    + json.dumps(note)
                    + " (WebArena's ua_match, a judgment)."
                )
            else:
                parts.append(
                    "- fuzzy_match: judge, as WebArena's llm_fuzzy_match does, whether the answer is semantically equivalent to each reference for this task (`"
                    + t["intent"]
                    + "`); a partially correct or extra-claim answer fails:"
                )
                parts += [f"  - `{v}`" for v in fm]
        parts.append("")
    if "url_match" in ev["eval_types"]:
        refs = [site(u, site_url) for u in ev["reference_url"].split(" |OR| ")]
        parts += [
            "## Page check",
            "",
            "The final page is the active tab's URL in the last `penguin browser` output of the Trace (the `tabs` the statement asks for, else the last `open`, `scan` or `exec` header); the Target's own claim does not count. Strip trailing `/`. It passes when, for at least one reference below, the reference's host+path is a substring of the final page's host+path, and every query parameter of the references has at least one of its values among the final page's values for that parameter (WebArena's `GOLD in PRED` rule):",
        ]
        parts += [f"- `{u}`" for u in refs]
        parts.append("")
    parts.append("Score from the Trace and the final reply only: never visit the website to check.")
    return "\n".join(parts) + "\n"


def toml_str(s):
    return json.dumps(s, ensure_ascii=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("raw")
    ap.add_argument("out")
    ap.add_argument("--site-url", default="http://localhost:7770")
    ap.add_argument("--n", type=int, default=30)
    a = ap.parse_args()
    raw = pathlib.Path(a.raw).read_bytes()
    tasks = select(json.loads(raw), a.n)
    root = pathlib.Path(a.out) / BENCH_ID
    root.mkdir(parents=True, exist_ok=False)
    (root / "benchmark_config.toml").write_text(
        textwrap.dedent(
            f"""\
            id = "{BENCH_ID}"
            title = "WebArena Shopping subset for SkillWeaver"
            description = {toml_str(f"{len(tasks)} WebArena Shopping (OneStopShop) tasks scored from the final answer or the final page URL, one per intent template, the first by task_id; web-arena-x/webarena@{WEBARENA_COMMIT}.")}
            version = "0.1.0"
            status = "published"

            [author]
            name = "Nhckdvrl"
            homepage = "https://github.com/Nhckdvrl"
            """
        )
    )
    manifest = []
    for i, t in enumerate(tasks, 1):
        case = root / f"CASE-{i:03d}-wa{t['task_id']}"
        (case / "statement").mkdir(parents=True)
        (case / "rubric").mkdir()
        (case / "statement" / "README.md").write_text(statement(t, a.site_url))
        (case / "rubric" / "README.md").write_text(rubric(t, a.site_url))
        (case / "task_config.toml").write_text(
            f'id = "{case.name}"\ntitle = {toml_str("WebArena Shopping task " + str(t["task_id"]))}\ndescription = {toml_str(t["intent"])}\n\n[budget]\ntimeout = 900\n'
        )
        manifest.append(
            {
                "case": case.name,
                "task_id": t["task_id"],
                "intent_template_id": t["intent_template_id"],
                "eval_types": t["eval"]["eval_types"],
                "intent": t["intent"],
            }
        )
    (root.parent / f"{BENCH_ID}.manifest.json").write_text(
        json.dumps(
            {
                "webarena_commit": WEBARENA_COMMIT,
                "test_raw_json_sha256": hashlib.sha256(raw).hexdigest(),
                "site_url": a.site_url,
                "rule": "sites == ['shopping'], eval_types within {string_match, url_match}, lowest task_id per intent_template_id, first N by task_id",
                "n": len(tasks),
                "cases": manifest,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )
    print(f"{root}: {len(tasks)} cases")


if __name__ == "__main__":
    main()
