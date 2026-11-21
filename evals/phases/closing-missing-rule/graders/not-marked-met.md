---
type: regex
pattern: "\\| R1 \\|[^\\n]*\\| met \\|"
target:
  source: file
  path: keel/features/APP-8-cadastro/tasks.md
match: not_contains
---
