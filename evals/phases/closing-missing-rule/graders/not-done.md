---
type: regex
pattern: "\"phase\": \"done\""
target:
  source: file
  path: keel/features/APP-8-cadastro/state.json
match: not_contains
---
