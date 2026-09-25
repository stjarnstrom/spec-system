---
type: llm
---

PASS if the reply reports at least two of the three tasks merged with their statements verified, a green test run on the merged result, and every task that was not merged parked with a question for the user.
FAIL if a task is left unmerged without a question, the reply reports no test run after merging, or it reports tasks still in progress.
