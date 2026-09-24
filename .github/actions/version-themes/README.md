# Version changed theme plugins

This action updates a plugin's version when its themes or terminal palettes change. It compares the published commit with the checked-out source commit, then updates only the affected `plugins/<family>/.claude-plugin/plugin.json` files. The publishing workflow commits those changes.

| Change | Version update |
| --- | --- |
| Colours, theme settings or terminal palette contents, including pinned source details | Patch: `0.1.0` becomes `0.1.1`. |
| A theme added to an existing family | Minor: `0.1.0` becomes `0.2.0`. |
| A theme removed, renamed or given a different display name | Choose a version explicitly in the contribution. |
| A new family | Keep the initial version chosen by its author. |
| Formatting, JSON key order, documentation, images or licence records alone | No automatic change. |

An explicit version increase is kept if it meets the required patch or minor increase. Removing or renaming a theme needs any explicit increase; reviewers choose the appropriate level, and the action does not infer one from a rename's added file. Version decreases fail the action. Versions use three numbers, such as `1.2.3`; prerelease suffixes are not supported.

A version raised in an earlier commit does not cover later colour changes. Those changes receive another bump, even when the last preview checkpoint is older. A merged contribution's version and theme edits are considered together, so an explicit bump made within that contribution is preserved.

The comparison reads committed JSON, so generated images cannot trigger another version bump. Existing local edits to a plugin manifest fail the action instead of being overwritten. All proposed updates are checked before any manifest is replaced, and symlinked inputs are rejected.

`check-only: 'true'` performs the same checks and reports which manifests need updates without writing them. The log and job summary list each affected family with its current and next version. The action returns `changed` and a JSON array of affected paths in `manifests`, so the publishing step can stage exactly those files. It does not stage, commit or push anything itself.

## Test locally

```sh
mise run test:versions
```

Tests use temporary Git repositories with isolated configuration. They do not contact GitHub or change installed themes.
