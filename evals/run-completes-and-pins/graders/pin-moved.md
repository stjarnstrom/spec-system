---
type: regex
target: { source: file, path: specs/registry.yaml }
pattern: '^\s+plan:'
flags: m
match: not_contains
---
