---
name: code-review-staged
description: Review staged files in the current git repository for bugs, regressions, risky logic, and missing tests with findings-first output.
argument-hint: Optional review focus or intent, such as a JIRA ticket, expected behavior, or a risk area to scrutinize
agent: agent
---

# Code Review Staged

Review only the staged changes in the **git repository that owns the currently open file**.
Determine the repository root by running `git rev-parse --show-toplevel` from the directory of the active file.

If no files are staged, say so explicitly and stop.

If the workspace spans multiple git roots and you cannot determine which repository the user intends, ask before proceeding.

If a file has partially staged changes, review only the staged hunks; use broader file context only when needed to assess impact.

If the user provides extra context — a JIRA ticket, expected behavior, or a risk area — use it to focus the review.

## Review Goals

- Find real defects, behavioral regressions, risky assumptions, security issues, and meaningful test gaps.
- Prioritize correctness, data integrity, security, performance, and missing validation.
- Ignore purely stylistic nits unless they hide a real engineering risk.
- Do not review unstaged or untracked changes.

## Process

1. Run `git rev-parse --show-toplevel` from the active file's directory to confirm the repository root.
2. Run `git diff --cached --name-only` to list staged files. Stop if there are none.
3. Run `git diff --cached` to inspect the full staged diff.
4. Read surrounding file context only where needed to validate behavior or impact.
5. Cross-reference related callers, callees, or tests only when needed to confirm a finding.
6. Produce findings ordered by severity.

## Finding Format

Use this structure for each finding:

1. `[severity]` Short title  
   File: `path/to/file` (line N or lines N–M)  
   Why it matters: concise risk explanation  
   Evidence: specific staged behavior, code path, or diff detail

Severity scale:
- `high` — likely bug, regression, security issue, data loss, or broken behavior
- `medium` — important risk, fragile logic, missing validation, or notable test gap
- `low` — smaller issue that is real but unlikely to break core behavior

## Output Structure

1. **Findings** — ordered by severity (high → low).
2. *(optional)* **Open questions or assumptions**
3. *(optional)* **Change summary** — one paragraph max
4. *(optional)* **Residual risks / testing gaps**

If no findings are discovered, say so explicitly and note any residual risks or testing gaps.

## Invocation Examples

- `/code-review-staged`
- `/code-review-staged HOSAPS-8580 promo setting change`
- `/code-review-staged focus on null-handling and backward compatibility`

## Save Review to File

**Always ask the user before creating or overwriting a file.**

Save to: `.github/reviews/code-review-staged-<slug>-<YYYY-MM-DD>.md`  
Where `<slug>` is a short kebab-case summary of the staged change (e.g., `update-promo-flag`, `null-check-fix`) or `na` if not determinable.

Include a **Review metadata** header at the top of the saved file:

```
## Review metadata

Date: YYYY-MM-DD
branchName: <branch or n/a>
commitHash: <HEAD hash or n/a>
stagedFiles: <reviewed file path(s) or n/a>
prKey: <PR number or n/a>
```

Use `n/a` for any field that cannot be determined. Follow the header with findings and any optional sections in the format above.
