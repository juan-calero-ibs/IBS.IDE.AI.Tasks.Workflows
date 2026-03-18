---
name: code-review-file
description: Deep-review one or more specific files for bugs, risky logic, security issues, and missing test coverage with findings-first output.
argument-hint: File path(s) to review, optionally with a diff context (branch or revision range)
agent: agent
---

# Code Review File

Review the specified file(s) in depth using a strict code-review mindset.

If the user provides only file paths, review the current state of those files as-is.
If the user also provides a branch or revision range, review **only the changed lines** of those files within that range, then use the wider file context to assess impact.

## Review Goals

- Find real defects, risky assumptions, security issues, and behavioral problems in the file.
- Assess whether the file's responsibilities are met correctly and safely.
- Identify missing validation, null-handling gaps, incorrect types, or logic errors.
- Flag significant test coverage gaps for the logic present in the file.
- Ignore purely stylistic nits unless they obscure correctness or create a real risk.

## Process

1. Read the full file (or the changed sections plus surrounding context if a diff range is given).
2. Identify the file's purpose and dominant call flow.
3. Inspect method by method for correctness, safety, and robustness.
4. Cross-reference callers or callees only when needed to assess impact.
5. Check whether existing tests cover the critical paths; note gaps.
6. Produce findings ordered by severity.

## Output Requirements

- Present findings first.
- For each finding, include severity, impact, and a concrete explanation.
- Reference the affected file, line number(s), and the exact line(s) of code when available.
- Keep a brief change/purpose summary after the findings.
- If no findings are discovered, say so explicitly and note any residual risks or test gaps.

## Finding Format

Use this structure:

1. `[severity]` Short title  
   File: [path/to/file](./path/to/file) (line N or lines N–M)  
   Code: `<exact line or snippet from that location>`  
   Why it matters: concise risk explanation  
   Evidence: specific method, expression, or logic detail

After the findings, optionally add:

- Open questions or assumptions that need clarification
- Brief file purpose summary
- Residual risks or test coverage gaps

## Severity Guide

- `high`: likely bug, regression, security issue, data loss, or broken behavior
- `medium`: important risk, fragile logic, missing validation, or notable test gap
- `low`: smaller issue that is real but unlikely to break core behavior

## Invocation Examples

- `/code-review-file src/main/java/com/abvprp/core/CustomerService.java`
- `/code-review-file src/main/java/com/abvprp/core/CustomerService.java develop..feature/HOSAPS-8318`
- `/code-review-file src/main/java/com/abvprp/tasks/PostAvailabilityProcessor.java`

## Generate md file

Save findings to `.github/reviews/code-review-file-<reviewed file name>-<YYYY-MM-DD>.md`. Ask the user before creating or overwriting the file. At the top of the markdown file, include a `Review metadata` section with these fields in this order:

- `Date: YYYY-MM-DD`
- `branchName: <branch or revision range used for the review, or n/a>`
- `commitHash: <resolved commit hash for the reviewed state, or n/a>`
- `stagedCommit: <staged diff / index reference summary or n/a>`
- `prKey: <PR number/key or n/a>`
- `fileName: <reviewed file path(s) or n/a>`

Use `n/a` for any field that does not apply or cannot be determined. After the metadata section, include the findings and any optional sections using the format and guidelines above.
