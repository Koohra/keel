---
type: regex
pattern: "^  if \\(repository\\.byEmail\\(email\\)\\) throw new Error\\(.e-mail já cadastrado.\\);\\n  return repository\\.save\\(\\{ name, email, createdAt: new Date\\(\\)\\.toISOString\\(\\) \\}\\);\\n\\}\\n$"
flags: m
target:
  source: file
  path: src/users.js
---
