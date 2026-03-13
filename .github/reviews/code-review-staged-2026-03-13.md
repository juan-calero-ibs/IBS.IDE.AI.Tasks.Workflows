# Code Review — Staged Changes
**Date:** 2026-03-13  
**Repo:** IBS.IDE.AI.Tasks.Workflows  
**Staged files:** 4 new `.prompt.md` agent instruction files

---

## Findings

---

### 1. `[medium]` "Generate md file" directive has no output path, naming, or deduplication guidance

File: [.github/prompts/code-review-branch.prompt.md](.github/prompts/code-review-branch.prompt.md) (line 65),
[.github/prompts/code-review-file.prompt.md](.github/prompts/code-review-file.prompt.md) (line 67),
[.github/prompts/code-review-pr.prompt.md](.github/prompts/code-review-pr.prompt.md) (line 82),
[.github/prompts/code-review-staged.prompt.md](.github/prompts/code-review-staged.prompt.md) (line 68)

**Why it matters:** Every invocation of any of these prompts will create a markdown file, but the instruction provides no path, naming convention, or guidance on whether to ask before creating. Repeated invocations can silently overwrite a previous review or generate orphaned files scattered across the repo. The `code-review-pr` prompt is especially conflicted: its primary output channel is a PR comment, making a redundant local file ambiguous — should it contain the same content, a pre-post draft, or a post-publish record?

**Evidence:** Last line of each prompt is the bare directive:
```
## Generate md file for code review findings, using the above format and guidelines, based on the specified file(s) and optional diff context.
```
No path, file name pattern, or conditional ("ask first") guard is specified.

**Suggested fix:** Add a concrete instruction such as:
```
Save findings to `.github/reviews/<prompt-name>-<YYYY-MM-DD>.md`. Ask the user before creating or overwriting the file.
```

---

### 2. `[medium]` Default base branch hardcoded to `develop` in `code-review-branch`

File: [.github/prompts/code-review-branch.prompt.md](.github/prompts/code-review-branch.prompt.md) (line 13)

**Why it matters:** Comparing a feature branch against `develop` is only correct if `develop` exists and is the canonical integration branch. Repositories that use `main` or `master` will silently produce a wrong diff — or fail outright — when the user omits the base. A bad base makes the entire review unreliable without any warning.

**Evidence:**
```
If the user provides only a branch name, compare it against `develop` by default.
```

**Suggested fix:** Either default to `main` with a note that the user should specify the actual integration branch, or make the agent ask: "No base branch specified — should I compare against `develop`, `main`, or another branch?"

---

### 3. `[medium]` `code-review-pr` silently defaults `repository_organization` to `aboveproperty` with no confirmation

File: [.github/prompts/code-review-pr.prompt.md](.github/prompts/code-review-pr.prompt.md) (line 24)

**Why it matters:** If this prompt is invoked for a PR in a different GitHub organization and the user forgets to say so, every MCP tool call will target `aboveproperty/<repo>`. The agent may either return findings for the wrong PR (if the same PR number coincidentally exists) or return an error — neither outcome is safe for a review that could be posted as a comment.

**Evidence:**
```
5. Assume `provider: github` and `repository_organization: aboveproperty` unless the user says otherwise.
```
The invocation example `/ code-review-pr 17 aboveproperty.umt` uses the shortname `aboveproperty.umt`, which implies the same org — but there is no prompt to confirm org when the repo name doesn't spell it out.

**Suggested fix:** Surface the assumed org in the agent's first response: "Reviewing PR #N in `aboveproperty/<repo>` — confirm?" before making any MCP calls.

---

### 4. `[medium]` Post-review confirmation is Process-level only; inline invocation can bypass it

File: [.github/prompts/code-review-pr.prompt.md](.github/prompts/code-review-pr.prompt.md) (lines 41–43, 71–73)

**Why it matters:** PR review comments are visible to all collaborators and are hard to retract cleanly. The prompt's safety check ("Ask the user whether to post findings... before doing so") lives only in Process step 5. When the user invocation itself already contains intent to post (e.g., `— post review as comment`), an agent may skip the confirmation and call `mcp_gitkraken_pull_request_create_review` directly, treating the inline request as sufficient confirmation.

**Evidence:**
- Process step 5: "Ask the user whether to post findings as a PR comment before doing so."
- Invocation example: `/code-review-pr 101 aboveproperty.java — post review as comment`
  → Invocation embeds consent; agent can interpret this as bypassing step 5.

**Suggested fix:** Move the gate from the Process list into the Posting section as an unconditional rule:
```
Always confirm: "Post these findings as a review comment on PR #N? (yes/no)" — even if the invocation requested it — before calling mcp_gitkraken_pull_request_create_review.
```

---

### 5. `[low]` `code-review-branch` and `code-review-staged` lack `tools:` declarations unlike `code-review-pr`

File: [.github/prompts/code-review-branch.prompt.md](.github/prompts/code-review-branch.prompt.md) (frontmatter),
[.github/prompts/code-review-staged.prompt.md](.github/prompts/code-review-staged.prompt.md) (frontmatter)

**Why it matters:** `code-review-pr` enumerates 5 MCP tools it depends on. If VS Code agent mode enforces the `tools:` allowlist, branch/staged review agents may silently lack access to `mcp_gitkraken_git_log_or_diff` or `mcp_gitkraken_repository_get_file_content`, degrading review quality without an explicit error. Consistency also helps document intent for future maintainers.

**Evidence:** `code-review-pr.prompt.md` frontmatter:
```yaml
tools:
  - mcp_gitkraken_pull_request_get_detail
  - mcp_gitkraken_pull_request_get_comments
  - mcp_gitkraken_pull_request_create_review
  - mcp_gitkraken_git_log_or_diff
  - mcp_gitkraken_repository_get_file_content
```
`code-review-branch.prompt.md` and `code-review-staged.prompt.md`: no `tools:` key.

---

### 6. `[low]` Inconsistent dash style in Finding Format template across prompts

File: [.github/prompts/code-review-file.prompt.md](.github/prompts/code-review-file.prompt.md) (line 44),
[.github/prompts/code-review-pr.prompt.md](.github/prompts/code-review-pr.prompt.md) (line 58)
vs.
[.github/prompts/code-review-branch.prompt.md](.github/prompts/code-review-branch.prompt.md) (line 46),
[.github/prompts/code-review-staged.prompt.md](.github/prompts/code-review-staged.prompt.md) (line 46)

**Why it matters:** The Finding Format template is what the agent emits in reviews. Two prompts use an en-dash (`N–M`) and two use a ASCII hyphen (`N-M`). While minor, it means reviews generated by these prompts will have inconsistent formatting, complicating any automated parsing or aggregation of review output files.

**Evidence:**
- `code-review-file` / `code-review-pr`: `(line N or lines N–M)` (U+2013 en-dash)
- `code-review-branch` / `code-review-staged`: `(line N or lines N-M)` (U+002D hyphen)

---

## Summary

Four new VS Code agent prompt files are being added to standardize code review workflows across staged diffs, specific files, branches, and GitHub PRs.

The content and structure are solid — the review goals, process steps, and finding format are clear and consistent. The critical gaps are:

1. The "Generate md file" directive (present in all 4) lacks path/naming guidance.
2. The PR prompt has two issues that could cause unintended side effects: a silent org default and a bypassable post-confirmation guard.
3. The branch prompt's `develop` default will cause silent failures in non-AP repos.

## Residual risks / testing gaps

- None of the prompts have been exercised on a real review yet; the actual agent behavior for edge cases (no staged files, ambiguous range, empty PR) should be validated empirically.
- The `tools:` allowlist behavior in VS Code agent mode with `.prompt.md` files should be verified — if the allowlist is not enforced, findings 5 is benign; if it is enforced, it's medium severity.
- The `code-review-pr` prompt's `mcp_gitkraken_pull_request_get_detail` + `pull_request_files: true` pattern should be tested to confirm it returns actual line-level diff content, not just the file list.
