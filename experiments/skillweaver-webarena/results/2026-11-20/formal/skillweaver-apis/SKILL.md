---
name: skillweaver-apis
description: A skill library of tested API scripts for one website, learned by practising on it - read its index before your first action on a task on that website.
version: 2026.11.21.40
---

# Skill library

`apis/INDEX.md` beside this file lists API scripts that automate tasks on the website it names, each with its parameters, what it returns, how often it was tested and a usage log; `site.md` describes the website's features. Before your first action on a task on that website, read both in full and decide, step by step, which APIs could help with the task. Call an API from the shell as `node <absolute path of this directory>/apis/<name>.mjs --args '<JSON object of its parameters>'`; it drives the agent browser and prints one JSON line. Check its result against what the page shows; when it fails or no API fits, do the task with your ordinary browser tools. An API is a shortcut, not a guarantee: prefer the tested ones, and keep the output the task asks for. Never change this Skill, its files or anything else in your Agent State.
