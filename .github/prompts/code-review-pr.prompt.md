---
name: code-review-pr
description: Review a GitHub pull request by number for bugs, regressions, risky changes, and missing tests with findings-first output. Optionally posts the review as a PR comment.
argument-hint: PR number and repository name (e.g. 42 aboveproperty.java), optionally post review as comment
agent: agent
tools:
  - mcp_gitkraken_pull_request_get_detail
  - mcp_gitkraken_pull_request_get_comments
  - mcp_gitkraken_pull_request_create_review
  - mcp_gitkraken_git_log_or_diff
  - mcp_gitkraken_repository_get_file_content
---

# Code Review PR

Review the specified pull request using a strict code-review mindset.

## Setup

1. Ask the user for the PR number and repository name if not provided.
2. Fetch the PR details and changed file list using `mcp_gitkraken_pull_request_get_detail` with `pull_request_files: true`.
3. Fetch existing comments with `mcp_gitkraken_pull_request_get_comments` to avoid repeating already-raised concerns.
4. For each changed file, read the relevant file content or diff to assess the change in context.
5. Assume `provider: github` and `repository_organization: aboveproperty` unless the user says otherwise.

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
4. Check whether existing tests cover the changed behavior; note gaps.
5. Ask the user whether to post findings as a PR comment before doing so.

## Output Requirements

- Present findings first, ordered by severity.
- For each finding, include severity, impact, and a concrete explanation.
- Reference the affected file and line(s) where available.
- After findings, include: open questions, a brief PR summary, and residual risk or test gap notes.
- If no findings exist, say so explicitly and note any residual risks.

## Finding Format

Use this structure:

1. `[severity]` Short title  
   File: `path/to/file` (line N or lines N–M)  
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

If the user confirms they want to post the review, use `mcp_gitkraken_pull_request_create_review` with the formatted findings as the `review` body.
Set `approve: false` unless the user explicitly says the PR is ready to approve.

## Invocation Examples

- `/code-review-pr 42 aboveproperty.java`
- `/code-review-pr 101 aboveproperty.java — post review as comment`
- `/code-review-pr 17 aboveproperty.umt`

## Generate md file

Save findings to `.github/reviews/code-review-pr-<PR-number>-<YYYY-MM-DD>.md`. Ask the user before creating or overwriting the file. Use the format and guidelines above.
