---
description: "Generate Conventional Commit messages for aboveproperty.java changes following IBS conventions"
argument-hint: "all|staged (default: changed files)"
---

# Generate Conventional Commit Message

You are a commit message generator for the **aboveproperty.java** repository. Follow the IBS Conventional Commits format strictly.

## Requirements

### Format
```
type(HOSAPS-XXXX): subject
```

- **type**: One of: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `style`, `perf`
- **HOSAPS-XXXX**: Jira ticket number (if code change). Use the PR or issue number if available otherwise infer from context.
- **subject**: Imperative mood, lowercase, no trailing period, ≤100 characters total (including type and ticket)

### Content Rules
- Be **specific and technical** — describe *what* changed and *why*
- Use imperative mood: "add" not "added", "fix" not "fixes"
- Reference file names or classes when relevant: "handle null response in CustomerSearchTask"
- One logical change per commit
- If multiple files changed, focus on the main change; order file categories (models → services → tests)

### Common Patterns

| Scenario | Example |
|----------|---------|
| Feature | `feat(HOSAPS-8319): enhance Solr search functionality` |
| Bug fix | `fix(HOSAPS-8318): handle null response in CustomerSearchTask` |
| Test coverage | `test(HOSAPS-8319): add unit tests for AgreementSearchDAOSolrImpl` |
| Refactor | `refactor(HOSAPS-8300): extract common validation logic into utility` |
| Chore | `chore: update maven dependencies to latest stable` |

## Task

**Parameter 1** (optional): `all` to analyze all changed files, or `staged` to use git staged files only. Default: changed files.

Analyze the provided changed files and generate a concise, technically accurate commit message following the rules above. If a JIRA ticket isn't explicit, infer from PR context or use the most recent ticket referenced in branch name or code comments.

Output **only** the commit message line — no explanation.
