---
name: code-review-pr
description: Review a GitHub pull request by number for bugs, regressions, risky changes, and missing tests with findings-first output. Supports GitHub inline review comments and summary fallback.
argument-hint: PR number (e.g. 42), optionally repository name (defaults to aboveproperty.java)
agent: agent
tools:
  - gh
---

# Code Review PR

Review the specified pull request using a strict code-review mindset.

## Setup

1. Ask the user for the PR number if not provided. If no repository is provided, default to `aboveproperty.java`.
2. Fetch the PR diff using `gh pr diff <PR-number> --repo aboveproperty/<repo-name>`.
3. Use `gh pr view <PR-number> --repo aboveproperty/<repo-name>` to get PR details, title, and description.
4. Use `gh pr comment list <PR-number> --repo aboveproperty/<repo-name>` to check for existing comments.
5. Capture PR head/base metadata needed for inline review anchoring:
   - `gh pr view <PR-number> --repo aboveproperty/<repo-name> --json headRefOid,baseRefOid,headRefName,files`
6. Assume `provider: github` and `repository_organization: aboveproperty` unless the user says otherwise.

## Review Goals

- Find real defects, behavioral regressions, risky assumptions, and maintainability problems.
- Prioritize correctness, data integrity, security, performance, and missing test coverage.
- Cross-reference business intent from the PR title, description, and any linked JIRA ticket (e.g. `HOSAPS-NNNN`).
- Ignore purely stylistic nits unless they obscure correctness or create a real risk.
- Flag test coverage gaps for any changed logic.

## Process

1. Read PR title, description, and linked ticket to understand intent.
2. Walk each changed file, inspecting the diff and surrounding context.
3. Identify findings and classify by severity.
4. For each finding, map it to an inline anchor in the PR diff (`path` + `line`; use `start_line`/`line` for ranges).
5. Check whether existing tests cover the changed behavior; note gaps.
6. Ask the user whether to post findings as inline PR review comments before doing so.

## Output Requirements

- Present findings first, ordered by severity.
- For each finding, include severity, impact, and a concrete explanation.
- Reference the affected file, line number(s), and the exact line(s) of code where available.
- Include inline comment metadata for each finding when possible:
  - `path`
  - `line` (or `start_line` + `line` for range)
  - `side` (`RIGHT` for added/current lines)
- After findings, include: open questions, a brief PR summary, and residual risk or test gap notes.
- If no findings exist, say so explicitly and note any residual risks.
- If a finding cannot be anchored inline (e.g., deleted/outdated/binary context), mark it `inline_anchor: unavailable` and include it in the summary fallback section.

## Finding Format

Use this structure:

1. `[severity]` Short title  
   File: `path/to/file` (line N or lines N–M)  
   Inline: `path=<path>, line=<N>` (or `start_line=<N>, line=<M>, side=RIGHT`)  
   Code: `<exact line or snippet from that location>`  
   Why it matters: concise risk explanation  
   Evidence: specific method, expression, or condition  
   Suggested comment: concise, actionable reviewer note (prefer natural conversation tone)

After all findings, add any of the following sections that apply:

**Open questions**: assumptions or areas that need clarification from the author  
**PR summary**: one-paragraph description of what the change does  
**Residual risks / test gaps**: things that are not bugs today but could become problems

## Inline Comment Style

- Match GitHub review-thread tone: short, specific, and constructive.
- Prefer one issue per inline comment.
- When useful, frame as a clarifying question (similar to human reviewer conversations).
- Include impact in one sentence and, if clear, a suggested fix direction.
- Avoid generic style nits unless tied to correctness, risk, or maintainability.

## Severity Guide

- `high`: likely bug, regression, security issue, data loss, or broken behavior
- `medium`: important risk, fragile logic, missing validation, or notable test gap
- `low`: smaller issue that is real but unlikely to break core behavior

## Posting the Review

If the user confirms they want to post the review, prefer GitHub inline review comments (threaded on files/lines):

1. Build a review payload with `comments[]` items containing:
   - `path`
   - `line` (and optionally `start_line` for ranges)
   - `side: RIGHT`
   - `body`
2. Submit in one call via GitHub API, for example:

```bash
gh api \
  -X POST \
  repos/aboveproperty/<repo-name>/pulls/<PR-number>/reviews \
  -f event='COMMENT' \
  -f body='Automated review findings' \
  -F comments[][path]='src/main/java/example/File.java' \
  -F comments[][line]=217 \
  -F comments[][side]='RIGHT' \
  -F comments[][body]='Are we able to reuse the existing security check here and avoid the extra lookup?'
```

3. If any `high` severity findings exist, prefer `event='REQUEST_CHANGES'`.
4. If inline anchoring fails for any finding, post those items in a top-level fallback comment:
   - `gh pr comment <PR-number> --repo aboveproperty/<repo-name> --body "<unanchored-findings>"`
5. Approval workflows should be handled via PR reviews using `gh pr review <PR-number> --approve` only if the user explicitly approves the PR.

## Invocation Examples

- `/code-review-pr 42`
- `/code-review-pr 42 aboveproperty.java`
- `/code-review-pr 101 aboveproperty.umt`

## Generate md file

Automatically save findings to `.github/reviews/code-review-pr-<PR-number>-<YYYY-MM-DD>.md`. Report that the file was saved with the full path. At the top of the markdown file, include a `Review metadata` section with these fields in this order:

- `Date: YYYY-MM-DD`
- `branchName: <source branch name or n/a>`
- `commitHash: <PR head commit hash or n/a>`
- `stagedCommit: n/a`
- `prKey: <PR number/key>`
- `fileName: <reviewed changed file path(s) or n/a>`

Use `n/a` for any field that does not apply or cannot be determined. After the metadata section, include the findings and any optional sections using the format and guidelines above.
