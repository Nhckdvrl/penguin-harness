# WebArena Shopping task 351

Website: http://localhost:7770 (an online store; you are already signed in as its customer in the agent browser)
Start page: http://localhost:7770

## Task

List products from PS4 accessories category by ascending price

## How to answer

Start from the specified page. Access this website only with `penguin browser` and any registered SkillWeaver APIs that invoke it. Do not use `curl`, `wget`, standalone HTTP clients or other browser tools, including for verification or fallback. Browser scripts remain within the site's origin. Keep your Agent State, including memory, read-only. Keep the storefront read-only for this task. Do not add, remove, or change cart or wishlist items, change account details, submit forms that modify store data, sign out, or buy anything. Use a learned API only if it leaves the store state unchanged.
When you are on the page the task asks for, stay there and run `penguin browser tabs` as your last command, so the page you ended on is recorded.
Then end your final reply with one line `ANSWER: done`.
