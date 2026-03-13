---
name: code-review-branch
description: Review a git branch or revision range for bugs, regressions, risky changes, and missing tests with findings-first output.
argument-hint: Branch or revision range to review, optionally with base branch
agent: agent
---

# Code Review Branch

Review the requested branch or revision range using a strict code-review mindset.

If the user provides only a branch name and no base branch, ask: "No base branch specified — compare against `develop`, `main`, or another branch?"

If the user provides a revision range such as `develop..feature` or `origin/develop...HEAD`, use that exact range.

## Review Goals

- Find real defects, behavioral regressions, risky assumptions, and maintainability problems.
- Prioritize correctness, data integrity, security, performance, and missing test coverage.
- Ignore purely stylistic nits unless they hide a real engineering risk.
- Use the diff as the primary source of truth, then inspect surrounding code only where needed.

## Process

1. Identify the review range and list the changed files.
2. Inspect the diff and relevant surrounding code.
3. Verify whether tests cover the changed behavior or whether coverage gaps create risk.
4. Produce findings ordered by severity.

## Output Requirements

- Present findings first.
- For each finding, include severity, impact, and a concrete explanation.
- Reference the affected files and lines when available.
- Keep the summary brief and place it after the findings.
- If no findings are discovered, say so explicitly and mention any residual risks or testing gaps.

## Finding Format

Use this structure:

1. `[severity]` Short title  
   File: [path/to/file](./path/to/file)  
   Why it matters: concise risk explanation  
   Evidence: specific behavior, code path, or diff detail

After the findings, optionally add:

- Open questions or assumptions
- Brief change summary
- Residual risks or testing gaps

## Severity Guide

- `high`: likely bug, regression, security issue, data loss, or broken behavior
- `medium`: important risk, fragile logic, missing validation, or notable test gap
- `low`: smaller issue worth fixing but unlikely to break core behavior

## Invocation Examples

- `/code-review-branch feature/HOSAPS-8318`
- `/code-review-branch main...feature/HOSAPS-8318`
- `/code-review-branch origin/main..HEAD`

## Generate md file

Save findings to `.github/reviews/code-review-branch-<YYYY-MM-DD>.md`. Ask the user before creating or overwriting the file. Use the format and guidelines above.
