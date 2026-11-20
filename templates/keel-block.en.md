<!-- keel:start -->
## Keel
Stories in this repository follow Keel (a Claude Code plugin). `keel/` holds the product, ADRs and stories; before changing a story's code, read its folder under `keel/features/`.
Do not edit `keel/**/state.json` by hand; only Keel scripts write it.
During an active story, workflow order and gates (test before code, isolated review, developer approval of each commit) come from Keel. Commands, style and conventions come from this file. Outside a story, only this file applies.
<!-- keel:end -->
