---
type: regex
pattern: "\"red\": \\{\\s*\"command\": \"npm test\",\\s*\"exitCode\": [1-9][\\s\\S]*\"green\": \\{\\s*\"command\": \"npm test\",\\s*\"exitCode\": 0"
target:
  source: file
  path: keel/features/APP-8-cadastro/state.json
---
