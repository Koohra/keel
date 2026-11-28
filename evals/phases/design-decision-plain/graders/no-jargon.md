---
type: regex
pattern: "(?<!\\([^()\\n]*)(?<![\\p{L}\\p{N}_])(degraus?|portas?|mappers?|adaptador(es)?|agregados?|ports?|adapters?|aggregates?|rungs?)(?![\\p{L}\\p{N}_])"
flags: imu
match: not_contains
target: last_message
---
