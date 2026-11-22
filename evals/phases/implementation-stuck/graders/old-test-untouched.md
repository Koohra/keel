---
type: regex
pattern: "const user = register\\(repository, \\{ name: 'Ana', email: 'ana@example\\.com' \\}\\);\\s*assert\\.equal\\(repository\\.byEmail\\('ana@example\\.com'\\), user\\);"
target:
  source: file
  path: test/users.test.mjs
---
