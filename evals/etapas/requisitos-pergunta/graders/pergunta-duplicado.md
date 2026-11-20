---
type: regex
pattern: "\\[PERGUNTA\\][^\\n]*(j[áa] (est[áa] )?cadastrad|duplicad|repetid|existente|mesmo e-?mail)"
flags: i
target:
  source: file
  path: keel/features/APP-8-cadastro/requirements.md
---
