---
name: code-review-pr
description: Review a GitHub pull request by number for bugs, regressions, risky changes, and missing tests with findings-first output. Optionally posts the review as a PR comment.
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
5. Assume `provider: github` and `repository_organization: aboveproperty` unless the user says otherwise.

## Review Goals

- Find real defects, behavioral regressions, risky assumptions, and maintainability problems.
- Prioritize correctness, data integrity, security, performance, and missing test coverage.
- Cross-reference business intent from the PR title, description, and any linked JIRA ticket (e.g. `HOSAPS-NNNN`).
- Ignore purely stylistic nits unless they obscure correctness or create a real risk.
- Flag test coverage gaps for any changed logic.

### aboveproperty.java — tests and test-related PRs

When the PR touches **`aboveproperty.java`** under `src/test/java` (or adds/changes tests for production code there), apply **`UNIT_TEST_GUIDELINES.md`** at the **`aboveproperty.java`** repo root: correct base classes (`BaseTestCaseMock`, `AbstractControllerTest`, `AbstractOTATest`), Mockito usage (`mock()` / `when()` / `verify()` vs annotation runner), forbidden compilation traps (`new Key()`, wrong APIs), Sonar-oriented assertions and parameterized tests, known mock limitations, and Tier 2 patterns. Flag violations as review findings when relevant.

## Process

1. Read PR title, description, and linked ticket to understand intent.
2. Walk each changed file, inspecting the diff and surrounding context.
3. Identify findings and classify by severity.
4. Check whether existing tests cover the changed behavior; note gaps.
5. Ask the user whether to post findings as a PR comment before doing so.

## Output Requirements

- Present **inline-style, line-anchored comments first** (see below), then any broader summary findings ordered by severity.
- For each finding, include severity, impact, and a concrete explanation when not already covered by an inline block.
- Reference the affected file, line number(s), and the exact line(s) of code where available.
- After findings, include: open questions, a brief PR summary, and residual risk or test gap notes.
- If no findings exist, say so explicitly and note any residual risks.

## Inline review comments (GitHub-style threads)

Mirror GitHub PR inline conversations: each item is tied to a **file path**, **line range in the PR head**, and a **short, substantive** question or suggestion about that code (for example clarifying whether validation already happens elsewhere, or proposing a simpler or safer approach). Avoid generic file-level-only bullets when a line anchor exists.

For every inline-style finding, use this block (repeat per thread):

**File:** `<path>`  
**Lines:** `<N>` or `<N–M>` (PR head / right side unless the remark targets removed lines)  
**Comment:**  
> `<review text>`

Optional **Code:** one truncated snippet from the diff for context.

If the user may post via the GitHub API, also append a valid JSON array (e.g. `inline_comments`) with objects: `path`, `body`, `line`, optional `start_line` for ranges, `side` (`RIGHT` for PR head lines, `LEFT` only for deletions). Lines must match the file at the PR head; if uncertain, say so in prose and omit bad JSON.

**Posting:** Top-level `gh pr comment` is an issue comment, not an inline thread. For real inline threads, use pull request review comments (API) with PR head `commit_id`, `path`, `body`, and `line` (+ `start_line` when needed). See GitHub REST: Pull request review comments.

## Finding Format

Use this structure for summary items **not** expressed as dedicated inline blocks above:

1. `[severity]` Short title  
   File: `path/to/file` (line N or lines N–M)  
   Code: `<exact line or snippet from that location>`  
   Why it matters: concise risk explanation  
   Evidence: specific method, expression, or condition

After all findings, add any of the following sections that apply:

**Open questions**: assumptions or areas that need clarification from the author  
**PR summary**: one-paragraph description of what the change does  
**Residual risks / test gaps**: things that are not bugs today but could become problems

## Severity Guide

- `high`: likely bug, regression, security issue, data loss, or broken behavior
- `medium`: important risk, fragile logic, missing validation, or notable test gap
- `low`: smaller issue that is real but unlikely to break core behavior

## Posting the Review

If the user confirms they want to post the review, use `gh pr comment <PR-number> --body "<findings>"` for a single overview comment, or post **inline review comments** via the GitHub API when they want threads on specific lines (not the same as `gh pr comment`).
Approval workflows should be handled via PR reviews using `gh pr review <PR-number> --approve` if the user explicitly approves the PR.

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

Use `n/a` for any field that does not apply or cannot be determined. After the metadata section, include an **Inline comments** section (anchored blocks and optional JSON), then summary findings and optional sections using the format and guidelines above.
