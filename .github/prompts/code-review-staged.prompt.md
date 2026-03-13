---
name: code-review-staged
description: Review staged files in the current git repository for bugs, regressions, risky logic, and missing tests with findings-first output.
argument-hint: Optional review focus or intent, such as ticket context or behavior to scrutinize
agent: agent
---

# Code Review Staged

Review only the staged changes in the current git repository using a strict code-review mindset.

If no files are staged, say so explicitly and stop.

If a file has partially staged changes, review only the staged hunks and use the wider file context only when needed to assess impact.

If the user provides extra context, such as a JIRA ticket, expected behavior, or a risk area, use that context to guide the review.

## Review Goals

- Find real defects, behavioral regressions, risky assumptions, security issues, and meaningful test gaps.
- Prioritize correctness, data integrity, security, performance, and missing validation.
- Ignore purely stylistic nits unless they hide a real engineering risk.
- Do not review unstaged or untracked changes.

## Process

1. Identify the current repository root and list staged files.
2. Inspect the staged diff only.
3. Read surrounding file context only where needed to validate behavior or impact.
4. Cross-reference related callers, callees, or tests only when needed to confirm a finding.
5. Produce findings ordered by severity.

## Output Requirements

- Present findings first.
- For each finding, include severity, impact, and a concrete explanation.
- Reference the affected file and line(s) when available from the staged diff or surrounding context.
- Keep the summary brief and place it after the findings.
- If no findings are discovered, say so explicitly and mention any residual risks or testing gaps.

## Finding Format

Use this structure:

1. `[severity]` Short title  
   File: path/to/file (line N or lines N-M)  
   Why it matters: concise risk explanation  
   Evidence: specific staged behavior, code path, or diff detail

After the findings, optionally add:

- Open questions or assumptions
- Brief change summary
- Residual risks or testing gaps

## Severity Guide

- `high`: likely bug, regression, security issue, data loss, or broken behavior
- `medium`: important risk, fragile logic, missing validation, or notable test gap
- `low`: smaller issue that is real but unlikely to break core behavior

## Invocation Examples

- `/code-review-staged`
- `/code-review-staged HOSAPS-8580 promo setting change`
- `/code-review-staged focus on null-handling and backward compatibility`

## Generate md file

Save findings to `.github/reviews/code-review-staged-<YYYY-MM-DD>.md`. Ask the user before creating or overwriting the file. Use the format and guidelines above.
