---
type: regex
pattern: "\\tcommit: "
target:
  source: file
  path: .git/logs/HEAD
match: not_contains
---
