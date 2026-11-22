---
type: regex
pattern: "^R1\\. (WHEN|IF|WHILE|WHERE|THE) .+ SHALL .+\\[source: "
flags: m
target:
  source: file
  path: keel/features/APP-30-exportar-csv/requirements.md
---
