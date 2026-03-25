---
name: coverate-staged-files
description: Report JaCoCo coverage for currently staged Java files in aboveproperty.java, including per-file coverage, missing coverage areas, and validation status.
argument-hint: Optional ticket, module, or focus area for the staged coverage report
agent: agent
---

# Coverage for Staged Files

Work only from the currently staged changes in the active git repository.

If no files are staged, say so explicitly and stop.

If the current repository is not `aboveproperty.java`, say so and ask the user to run the prompt from the correct repository.

If a file has partially staged changes, treat only the staged hunks as the source of truth and use wider file context only when needed.

If the user provides extra context such as a JIRA ticket, expected behavior, or a risk area, use it to guide interpretation of the staged coverage results.

## Goal

Determine the current JaCoCo coverage status for staged Java production-code files in module `com.abvprp.core:aboveproperty-java`, using the staged diff plus the latest generated coverage report or a freshly generated one when needed.

## Scope Rules

- Prioritize staged production files under `src/main/java`.
- Ignore staged deletions unless they affect a modified code path that still exists in the new file.
- Use staged test files only as supporting context when explaining the coverage picture.
- Respect approved exclusions from the current Maven profile and pom configuration.

## Tooling Baseline

- Java 8
- JUnit 4.12
- Mockito 1.10.19
- No `mockStatic`
- Preferred coverage flow: clean -> compile/test-compile -> clean test with sonar profile -> `jacoco:report`

When interpreting **test gaps** or suggesting follow-up test work for **`aboveproperty.java`**, align expectations with **`UNIT_TEST_GUIDELINES.md`** at the repo root (stack, base classes, forbidden patterns, Sonar smells, mock limitations). If the user asks for test changes next, follow that document.

## Workflow

1. Identify the repository root and list staged files.
2. Filter to staged Java production files under `src/main/java`.
3. Inspect the staged diff and identify which classes and changed methods are in scope.
4. Check whether a usable JaCoCo report already exists at `target/site/jacoco/jacoco.xml` or `target/site/jacoco/index.html`.
5. If coverage data is missing, stale, or clearly unrelated to the current staged code, generate a fresh report with the smallest reliable command set:
   - `mvn clean`
   - `mvn compile test-compile`
   - `mvn clean test -Psonar jacoco:report`
6. Map each staged production file to its JaCoCo package and class entry.
7. Report per-file coverage for line and branch coverage when available.
8. Highlight which staged methods or changed branches appear uncovered or only partially covered.
9. Stop after reporting the coverage status. Do not generate or modify tests unless the user explicitly asks for that next.

## Coverage Analysis Rules

- Prefer `jacoco.xml` as the source of truth when available.
- If only HTML is available, use it carefully and say that HTML was used.
- Report `n/a` when a metric is unavailable rather than guessing.
- Distinguish between whole-file coverage and the staged lines or staged branches that appear risky.
- If JaCoCo shows class-level coverage but does not isolate the exact staged lines, say that explicitly.
- If a staged file is excluded from coverage by project configuration, say so explicitly.
- If tests fail and prevent a fresh report, report the failure instead of inventing coverage numbers.

## Output Requirements

Present results in this order:

1. `Staged files considered`
2. `Coverage source`
3. `Per-file coverage`
4. `Staged risk areas`
5. `Blockers or residual risks`

For `Per-file coverage`, include for each staged file when possible:

- line coverage percent
- branch coverage percent
- whether the staged area appears covered, partially covered, or unclear

If no coverage report can be produced or found, say exactly why.

## Summary Format

Use this structure:

```text
Staged files considered:
- path/to/File.java: short note on changed behavior

Coverage source:
- existing jacoco.xml from target/site/jacoco
or
- fresh run: mvn clean test -Psonar jacoco:report

Per-file coverage:
- path/to/File.java: lines XX%, branches YY%, staged area covered|partially covered|unclear

Staged risk areas:
- path/to/File.java: changed branch, null-handling path, or method that appears weakly covered

Blockers or residual risks:
- short note
```

## Invocation Examples

- `/coverate-staged-files`
- `/coverate-staged-files HOSAPS-8318 null response regression`
- `/coverate-staged-files focus on changed branches in pricing services`