# Credits

spec-system 1.0's workflow layer adapts mechanics from two MIT-licensed
projects. Nothing is vendored; the text in this repo is rewritten around
the spec layer. [COMPOSITION.md](COMPOSITION.md) says what came from where
and what changed on the way in.

## obra/superpowers

<https://github.com/obra/superpowers>, audited at v6.4.1 (`5bf4e78`).

The subagent-driven loop (a fresh implementer and a reviewer per task, a
convergent five-round fix loop with scoped re-review, a final whole-branch
review), rulings with a closed list of stops, the on-disk ledger that
survives compaction, files-not-pastes between agents, the four-status
implementer contract, the anti-pre-judging tripwire, plan fields for review
focus and interfaces, test-gated task completion, the brainstorming path
classification, the systematic-debugging techniques (root-cause tracing,
defence in depth, condition-based waiting, polluter bisection), the testing
guide's "name the break" and mutation check, finishing-a-branch safety
details, and a SessionStart hook that re-injects after compaction.

```
MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## mattpocock/skills

<https://github.com/mattpocock/skills>, audited at v1.2.3 (`c55ee46`).

The test-seam discipline and vertical-slice TDD, the diagnosis loop's
"red feedback loop before any theory" gate and ranked falsifiable
hypotheses, the deep-module vocabulary with the deletion test, dependency
categories and design-it-twice, the architecture survey, two-axis review
that never merges its axes, tracer-bullet slicing with expand–contract,
the three-gate ADR test, the glossary discipline, merge-conflict
resolution by primary sources, and the prototype and research recipes for
closing a question.

```
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
