---
agent: agent
name: junit-generate-from-sonarQube
description: Generate JUnit 4 tests for Sonar PR new-code gaps in aboveproperty-java; single session must reach ≥90% Coverage on New Code (full-module JaCoCo + all Sonar-listed files), not partial runs.
---

# 🧠 Automated JUnit 4 Test Generation Guideline for Maven Module com.abvprp.core:aboveproperty-java

You are generating **JUnit 4** test cases for module `com.abvprp.core:aboveproperty-java` in a Maven multi-module Java project.
Follow these rules for correctness, maintainability, and reliable coverage tracking.

---

## 🎯 One-shot mandate (this user message only — reach ≥ 90% “Coverage on New Code”)

The Quality Gate measures **Coverage on New Code** only (not overall project coverage). A PR can sit at **~74%** with many tests already added if large new/changed regions remain red. **One invocation = one task:** you must keep working inside that task until the gate is green or you document an impossible blocker.

### Do this in order before writing the first test

1. **Authenticate Sonar** — `export SONAR_TOKEN=…` from the environment (never ask the user to paste secrets into chat). **Sanity-check auth on a protected endpoint**, not only anonymous ones: e.g. `system/status` may return **200 without a token** while `api/measures/component_tree?…` returns **401** with a bad token. Prefer:  
   `curl -s -o /dev/null -w '%{http_code}' -u "${SONAR_TOKEN}:" "${SONAR_URL}/api/measures/component_tree?component=${PROJECT_KEY}&pullRequest=${PR_KEY}&metricKeys=new_uncovered_lines&ps=1"`  
   You want **200** and a JSON body with `components` (or equivalent). If you get **401** or **0-byte body**, fix the token (user token from **Account → Security**, project access) or VPN **before** interpreting `sonar_pr_uncovered_lines.sh` output. **An empty TSV from the script is not proof of zero gaps** until this check passes. If auth is still broken, run `git diff <target-branch>...HEAD` on `aboveproperty.java` anyway — but label the gap checklist **unverified** until Sonar or a **full** JaCoCo line view confirms closure.
2. **Open the Sonar “Coverage on New Code” file list** for the PR (same data as the measures UI), e.g.  
   `…/component_measures?id=<PROJECT_KEY>&pullRequest=<PR_KEY>&metric=new_coverage&view=list`  
   Sort by **uncovered lines** / lowest file coverage. Treat every file in that list with material new code as **in scope**.
3. **Run** `scripts/sonar/sonar_pr_uncovered_lines.sh` once at the start (same `SONAR_URL`, `SONAR_TOKEN`, `PROJECT_KEY`, `PR_KEY`) to get **per-file** `new_uncovered_lines` / `new_uncovered_conditions` for **prioritization**. Counts are not enough to stop — they tell you **where the missing ~16+ points** (90 − 74) almost certainly live.
4. **Merge lists**: every file appearing in **either** the Sonar measures list **or** the script **or** `git diff --name-only` for `src/main/java` must appear on your working checklist. **No file gets dropped** because “it looked small.”
5. **Poll the gate before declaring done** (when token works):  
   `GET ${SONAR_URL}/api/qualitygates/project_status?projectKey=${PROJECT_KEY}&pullRequest=${PR_KEY}`  
   Do not claim success until `projectStatus.status` is **OK** *or* the user has confirmed a fresh analysis after your push and you re-polled.

### Gap-closure priority (how to climb from ~74% to ≥90% in one session)

- Sort candidates by **`new_uncovered_lines` descending**, then by **`new_uncovered_conditions` descending**.
- After each batch of tests, run **`mvn clean test -Psonar jacoco:report`** (full module, no `-Dtest=`) and re-open JaCoCo for **every** PR-touched file still in the Sonar list; **red** lines and **yellow** branches must shrink toward zero.
- **Builder / enqueue one-liners:** if production code only adds chained calls on an object passed to a mock, `verify(collaborator).foo(any())` often **does not** execute those lines. Use **`ArgumentCaptor`** on the real type (`QueueTask`, request DTO, etc.), `verify(...).foo(captor.capture())`, then **`assertEquals` / Hamcrest** on fields (`getAltBaseUriConfigKey()`, `getScope()`, URL fields, delay, etc.).
- **Condition coverage:** for every `if` / `switch` / `catch` Sonar marks partial, add the **complementary** test (false branch, other `case`, exception type) in the **same** session — partial class fixes rarely move **new-code** % enough alone.

### Optional work — **defer** in one-shot mode if Sonar/JaCoCo gaps remain

- Inline GitHub PR review comments (`POST …/pulls/{id}/reviews`) — **only after** Coverage on New Code ≥ 90% (or no time left). They do not increase coverage.

---

## 🔒 Single-execution completion gate (non-negotiable)

**Quality Gate failure mode:** Runs have stopped at **~74–87%** “Coverage on New Code” while tests “looked sufficient.” **Do not treat that as success.** In **one** invocation of this prompt you must drive the PR to **≥ 90%** Sonar “Coverage on New Code” (or an explicit, documented exclusion).

### You are NOT done until ALL of the following are true in the same session

1. **Every** file that Sonar lists with `new_uncovered_lines > 0` or `new_uncovered_conditions > 0` has been addressed with tests (not only the largest file).
2. You have run a **full** module test pass with JaCoCo — see **Mandatory final verification** below — not only `mvn test -Dtest=...` on the classes you edited.
3. You have either:
   - **Re-checked Sonar** after your changes (user pushed + analysis finished) and confirmed **Coverage on New Code ≥ 90%**, or  
   - If Sonar cannot refresh inside the session: you have used **JaCoCo HTML/XML** from the **full** run and aimed for **≥ 92–93% line coverage on each PR-touched source file** in that report as a **buffer** (Sonar’s formula and CI test selection can differ slightly from a local `-Dtest=` run — see below).

### Mandatory final verification (full suite)

CI and Sonar typically ingest JaCoCo produced by the **entire** Surefire run for the module (subject to `pom` excludes). Scoped runs lie about total coverage.

Before declaring completion, from the **`aboveproperty.java`** module directory run:

```bash
mvn clean test -Psonar jacoco:report
```

**Do not** pass `-Dtest=...` on this final command unless you are actively debugging a single failure — and if you use `-Dtest=` for iteration, you must still run the **full** command above once before finishing.

Then:

1. Open `target/site/jacoco/index.html` and drill into **each** source file that Sonar still reported as having new uncovered lines/conditions.
2. For any file still below **~92%** line coverage (or with obvious red branches), add more tests **in the same session** — especially **catch blocks**, **else** branches, **switch** defaults, **async** paths (use same-thread executors or `Awaitility` if the project allows), **logging-guarded** branches (`if (LOGGER.isDebugEnabled())` may still need coverage if Sonar marks them), and **remote / exception** paths.
3. Repeat: full `mvn clean test -Psonar jacoco:report` → inspect JaCoCo → add tests, until the buffer target is met or only approved exclusions remain.

### Why “one prompt execution” still allows an inner loop

“One request” means **one user message / one agent task**: you may run many **local** compile/test/jacoco iterations inside that task. You must **not** stop after the first batch of tests or after the first passing `-Dtest=`-scoped run.

### If the full module test run fails

You still **cannot** treat scoped `-Dtest=` green builds as proof of the gate. Fix or isolate the failing legacy tests, skip only if the project’s documented exclusions apply, or document the **exact** failing test classes and stack traces in the session summary and state that **90% could not be verified** in this run. Do not claim the Quality Gate passed without a successful full-module `mvn clean test -Psonar` (or CI parity).

---

## 📘 AboveProperty.java unit test guidelines (mandatory)

Before writing or changing tests, **read and apply** the project reference:

**`UNIT_TEST_GUIDELINES.md`** at the root of the **`aboveproperty.java`** repository  
(e.g. `aboveproperty.java/UNIT_TEST_GUIDELINES.md` next to `pom.xml`; full example: `aboveproperty/aboveproperty.java/UNIT_TEST_GUIDELINES.md` when cloned beside sibling repos).

That document is authoritative for:

- **Stack**: Java 8, JUnit 4.12, Mockito 1.10.19, Hamcrest 1.3 + JUnit `Assert` (not Jupiter; do not assume AssertJ).
- **Mockito style**: use `mock()`, `when()`, `verify()` — **do not** use `@Mock` / `@InjectMocks` with `MockitoJUnitRunner` in this project (see guidelines §3–§5).
- **Test bases**: when to extend `BaseTestCaseMock` vs `AbstractControllerTest` / `AbstractOTATest` vs standalone tests; pre-loaded keys and `TEST-DATA/*.json`.
- **Forbidden patterns** that break compilation or CI: e.g. `new Key()`, non-existent APIs, wrong signatures, missing `throws Exception`, wrong `AbovePropertyObjectMapperFactory` usage, mock limitations (`createPrice()`, `priceId_Standard` + GURNIL, etc.).
- **Sonar-friendly patterns**: `@Parameterized` for 3+ similar cases, `assertEquals(0, x.compareTo(y))` instead of `assertTrue(x.compareTo(y) == 0)`, test naming `test<MethodName>_<scenario>`, pre-push checklist.
- **Tier 2** controller/workflow tests: setup in `@Before`, `getInjector().injectMembers(this)`, factories on `AbstractControllerTest`, inventory/calendar before availability/pricing assertions.

If anything in this prompt conflicts with **`UNIT_TEST_GUIDELINES.md`**, follow the markdown file.

---

## 🎯 Core Principles
1. The primary objective is **PR new-code coverage ≥ 90%** on Sonar’s Quality Gate (“Coverage on New Code”), not “most” lines or a single large class fixed.
2. Work **one Sonar-reported class at a time** in priority order (largest `new_uncovered_lines` / `new_uncovered_conditions` first), but **do not end the session until every listed file** with uncovered new code has been processed (see **Single-execution completion gate**).
3. Always clean before test/coverage runs.
4. Fix all test errors before coverage checks.
5. Fix compilation errors immediately (do not recreate files).
6. Check results after every cycle — prefer **full-module** JaCoCo for gate checks (see **Mandatory final verification**).
7. Start with happy-path, then edge/failure cases; **always** include at least one test per distinct **catch**, **switch default**, and **boolean condition** Sonar marks as partially covered.
8. Cover the exact Sonar-reported uncovered lines and conditions first; then add **buffer** tests on the same methods until JaCoCo on that file is **~92–93%** line coverage where feasible.
9. Class coverage target: **≥ 90%** for touched classes whenever feasible; treat **≥ 92%** on JaCoCo as the practical stop condition when Sonar cannot be re-read in-session.
10. Module coverage target: **≥ 90%** when the module is part of the scoped task and reachable from the changed files.
11. Only explicitly approved exclusions may skip testing.
12. **Never** declare success based only on `mvn test -Dtest=YourNewTest` + JaCoCo — that often **overstates** progress versus CI’s full suite.

---

## 🧩 Class Selection
Generate JUnit test cases that specifically target the files, line numbers, and uncovered conditions for the PR so that SonarQube **Coverage on New Code ≥ 90%**.

### Limitation of `sonar_pr_uncovered_lines.sh` (critical)

The script at `scripts/sonar/sonar_pr_uncovered_lines.sh` outputs **per-file counts** (`new_uncovered_lines`, `new_uncovered_conditions`) — **not** individual line numbers. **Counts alone are insufficient** to know when to stop; they caused premature stopping with **~74–87%** gate coverage while many files still had non-zero counts. **Also:** if `SONAR_TOKEN` is wrong, the script may print **nothing** (filtering yields no rows) while the API returned **401** — always perform the **authenticated** `curl` check in step 1 of the one-shot list before treating empty script output as “no uncovered lines.”

You must also obtain **line- or branch-level** targets using one or more of:

1. **Sonar “Coverage on New Code” file list** (mandatory for one-shot): same view as  
   `/component_measures?id=${PROJECT_KEY}&pullRequest=${PR_KEY}&metric=new_coverage&view=list` — sort by worst file coverage / most uncovered; click into each file for line detail.
2. **SonarQube PR UI**: Coverage on New Code → expand each file → note **uncovered line ranges / branches** until the list is empty or excluded.
3. **Sonar Web API** (same auth as the script): try, as supported by the server version, endpoints such as:
   - `GET ${SONAR_URL}/api/sources/lines?key=<component_key>&pullRequest=${PR_KEY}` (line hits when available), or  
   - drill `api/measures/component_tree` with `metricKeys=new_uncovered_lines,new_uncovered_conditions` and then open each component in the UI.
4. **Local JaCoCo** (after **full** `mvn clean test -Psonar jacoco:report`): use `target/site/jacoco/*.html` (and optionally `jacoco.xml`) to find **red** lines and **partial** branches in each PR-touched file.

Build an explicit **checklist** (file → line ranges or method names → test method mapping). Check items off as you add tests. **Do not skip files** that still have `new_uncovered_lines > 0` in the script output.

### Definition of done (per source file — before leaving that file)

Do **not** mark a `src/main/java/...` file “addressed” until **all** of the following are satisfied for that file (one compact block in the session summary or PR notes is enough):

1. **Sonar anchor:** Paste the **uncovered line numbers** (or ranges) from Sonar **Coverage on New Code** for that file, **or** cite the **exact screenshot / export filename** the user provided if line numbers are not in chat.
2. **Test mapping:** One explicit line per gap cluster: `RelativePath.java:Lstart–Lend → FullyQualifiedTestClass#testMethodName` (add lines if multiple tests close disjoint ranges).
3. **JaCoCo proof after full module run:** Run **`mvn clean test -Psonar jacoco:report`** with **no** `-Dtest=`, open `target/site/jacoco/.../<File>.html`, and record evidence that the targeted lines/branches are **no longer red / partial** (paste the JaCoCo **line coverage table** snippet for that class, or list **former red line → covered** in bullets). Scoped `-Dtest=` JaCoCo alone **does not** satisfy this item.

Skipping (1)–(3) is what allows “tests added” without Sonar moving — the agent must **tie work to reported lines** and **prove** closure on the same artifact CI uses.

### Instructions to run script sonar_pr_uncovered_lines.sh

- **Run at the start** to **prioritize** files (sort by `new_uncovered_lines`, then conditions).
- **Re-run after** the user has pushed your commits and Sonar has re-analyzed, if you need an updated list in the same session — otherwise rely on the full JaCoCo pass + Sonar UI for the final gap check.

Environment:

1. Set `SONAR_URL` = `https://sonar.dev.abvprp.com` (unless the project uses another base URL).
2. Obtain from the user (or secure env):
   - `SONAR_TOKEN` — SonarQube user token (`…/account/security/`).
   - `PROJECT_KEY` — from the Sonar project URL or settings (`id=<project_key>`).
   - `PR_KEY` — from the Sonar PR URL (`pullRequest=<pr_key>`).

### Instructions for each file:
1. For each file, analyze the uncovered lines and uncovered conditions.
2. Map each uncovered line or condition to the exact execution path, branch, null check, conditional, exception path, or edge case needed to execute it.
3. Generate concrete JUnit test methods for each file.
4. Reuse the project’s testing style and libraries per **`UNIT_TEST_GUIDELINES.md`**:
   - JUnit 4, Hamcrest + JUnit `Assert`
   - Mockito 1.x with `mock()` / `when()` / `verify()` (not annotation-driven runner mocks unless an existing test class already uses that pattern consistently)
5. Prefer extending existing test classes if a matching test file likely already exists.
6. Do not change production code unless absolutely necessary for testability.
7. If a line looks unreachable without a small safe refactor, clearly call that out separately.
8. For each file, provide:
   - Why the lines are currently uncovered
   - The exact test scenarios needed
   - The JUnit test code
   - Any mock setup required
   - Any assumptions made
9. Focus on minimal, targeted tests that improve SonarQube **new-code coverage** rather than broad refactoring or unrelated legacy coverage.
10. If multiple uncovered lines belong to the same branch, combine them into one efficient test where possible.
11. Prefer tests that close both line coverage and condition coverage gaps in the same execution path.
12. After writing tests for a file, verify whether the Sonar-reported uncovered lines for that file are now covered before moving on.

### Important:
- **Trace real data flow before claiming a branch is covered:** read the **production** method and list where each variable comes from (e.g. `CustomerMap` from `findCustomerMap(customerID, options)` vs a local you never attach to `ControllerOptions`). **Dead setup** (constructed maps, “broken” objects, spies) that are **never passed into the code under test** is a common reason Sonar stays red while JUnit is green. After writing the test, **grep the test body** for each setup variable and confirm it flows into the SUT call path.
- **Sonar “else covered / if red” on `A && B`:** both conjuncts need tests. For cached-query branches, confirm **keys and arguments** match what production builds (e.g. `InventoryQueryKey` fields, allotment ID, `Key.nullKey()` vs `Constants.NULL_KEY` where applicable); a preloaded `inventoryQueries` map that uses the wrong key exercises **nothing** inside the `if`.
- **Stubbing/spying methods invoked more than once per public API call:** one `findX()` or `dao.fetch()` may run from an inner `try` **and again later** in the same method after inner `catch`es complete. A stub that **always** throws can look like “catch coverage” while actually **failing the test** or skipping later lines. Prefer **call-counted** answers: first invocation throws (or special-case), later invocations **delegate to real** or return a cached result; **always `finally` restore** replaced fields on shared Guice singletons.
- **Captor over `any()` for new builder/chained fields:** when PR code builds a `QueueTask` (or similar) and passes it to `queueController.queueTask(...)`, `verify(queueController).queueTask(any())` often **does not** cover new chained setters. Capture the argument and assert **each** new field the PR introduced.
- Be precise about line coverage vs condition coverage.
- If uncovered conditions exist, explicitly create tests for both true/false paths.
- Treat SonarQube uncovered new lines as the source of truth. Do not assume a class is "done" just because overall class coverage looks high.
- If a method depends on DAO/provider/service calls, mock them.
- If a method returns HTTP responses, assert status codes and response bodies where relevant.
- If a method uses static helpers like Key.isNull(...), account for those branches.
- If existing test class names are obvious, use them. Otherwise suggest an appropriate test class name.
- Prioritize files with the largest number of uncovered new lines or critical uncovered conditions first.
- Avoid spending time on files outside the SonarQube uncovered list unless needed to support the targeted tests.

❌ Exclude only approved module-specific exclusions from current pom/profile configuration, for example:
- JaCoCo exclude: `**/com/abvprp/data/dao/cassandra/*`
- Surefire (sonar profile) excludes controllers/analytics from execution.

---

## 📝 Inline PR Review Comments (GitHub-style threads)

**One-shot / gate-first mode:** skip this entire section until **Coverage on New Code ≥ 90%** (or you have definitively blocked). Inline comments do not improve JaCoCo/Sonar metrics.

After running `sonar_pr_uncovered_lines.sh` and analyzing uncovered lines/conditions, you *may* post **inline review comments** directly on the specific file lines in the PR diff — not a single top-level PR comment. This creates threaded annotations that appear inline in the code review.

### When to post inline comments
1. **Before writing tests**: annotate each SonarQube-reported uncovered line with the test scenario needed.
2. **After tests pass**: optionally reply to each thread confirming the line is now covered.

### Setup: get the PR head commit SHA
```bash
COMMIT_SHA=$(gh pr view ${PR_KEY} --repo aboveproperty/aboveproperty.java --json headRefOid -q '.headRefOid')
```

### Post inline review comments via GitHub API

Each uncovered line maps to one inline comment. Build a JSON payload and post it as a single pull request review:

```bash
# Build comments JSON — one entry per uncovered line
COMMENTS_JSON=$(cat <<'ENDJSON'
[
  {
    "path": "src/main/java/com/abvprp/path/to/File.java",
    "line": 42,
    "side": "RIGHT",
    "body": "⚠️ **Uncovered (SonarQube):** add test for `null` branch — `if (x == null)` at line 42 is not exercised."
  },
  {
    "path": "src/main/java/com/abvprp/path/to/OtherFile.java",
    "line": 87,
    "side": "RIGHT",
    "body": "⚠️ **Uncovered (SonarQube):** add test for exception path — `catch (DataAccessException e)` block never reached."
  }
]
ENDJSON
)

# Post as a single pull request review with inline threads
PAYLOAD=$(jq -n \
  --arg commit_id "$COMMIT_SHA" \
  --argjson comments "$COMMENTS_JSON" \
  '{commit_id: $commit_id, event: "COMMENT", body: "⚠️ SonarQube uncovered lines — inline test coverage notes", comments: $comments}')

echo "$PAYLOAD" | gh api \
  repos/aboveproperty/aboveproperty.java/pulls/${PR_KEY}/reviews \
  -X POST \
  --input -
```

### Comment body format

Each inline comment body should follow this pattern:
```
⚠️ **Uncovered (SonarQube):** <short description of the branch/condition that is not covered>

**Test scenario needed:** <what the JUnit test must exercise to cover this line>
```

### Rules for inline comments
- `path` must be relative to the repository root (e.g. `src/main/java/com/abvprp/...`).
- `line` is the **PR head** (right side) line number as reported by SonarQube — must fall within the PR diff; if a line is outside the diff context, omit that comment to avoid API errors.
- `side` is always `"RIGHT"` for new/unchanged lines in the PR head; use `"LEFT"` only for deleted lines.
- Group all comments into **one** `POST /reviews` call to avoid spamming the PR with separate review submissions.
- If `gh` is not authenticated or `jq` is unavailable, fall back to `curl`:

```bash
curl -s -X POST \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/aboveproperty/aboveproperty.java/pulls/${PR_KEY}/reviews \
  -d "$PAYLOAD"
```

### Required environment variables (add to session)
| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | GitHub PAT with `repo` scope (or use `gh auth token`) |
| `PR_KEY` | Pull request number (same as used for SonarQube script) |
| `COMMIT_SHA` | PR head commit SHA (obtained via `gh pr view` above) |

> **Note:** `gh pr comment` posts an **issue-level** comment, NOT an inline thread. Always use the `/reviews` endpoint for line-anchored inline comments.

---

## 🧱 Tooling Baseline (current module)
- Java: **1.8** (`project.java.target`)
- Maven: project-managed
- JUnit: **4.12**
- Mockito: **1.10.19** (`mockito-core`)
- JaCoCo: profile-dependent
  - legacy property: `0.7.5.201505241946`
  - sonar profile plugin: `0.8.11`

---

## 📦 Pre-Test Checklist
Before generating tests, verify:
- ✅ `junit:junit:4.12` exists in test dependencies
- ✅ `org.mockito:mockito-core:1.10.19` exists in test dependencies
- ✅ No unsupported assumptions about `mockito-inline` / Jupiter artifacts
- ✅ `mvn clean compile test-compile` succeeds
- ✅ Coverage/test exclusions are aligned to current pom/profile config

If required dependencies are missing, stop and update `pom.xml` first.

---

## ⚒️ Standard Workflow

**Phase A — fast feedback (optional, while authoring)**  
Use scoped tests to fix compile errors quickly:

```bash
mvn clean compile test-compile
mvn test -Dtest=ClassNameTest
# or: mvn test "-Dtest=Class1Test,Class2Test"
```

**Phase B — mandatory gate (before declaring done)**  
Run the **full** module suite with JaCoCo (matches CI/Sonar expectations far better than Phase A alone):

```bash
mvn clean test -Psonar jacoco:report
```

Then open `target/site/jacoco/index.html` and clear **red** lines / partial branches in **every** PR-touched file Sonar still cares about (aim **~92–93%** line coverage per file as a buffer).

**Anti-pattern:** Ending the task after only Phase A is what produced **~87.4%** vs a **90%** Quality Gate — **Phase B is required** unless every test in the module is already included in your `-Dtest=` list (almost never true).

---

## 🧠 Test Authoring Rules (JUnit 4 + Mockito 1.x)
1. Generate syntactically correct tests on first attempt; **verify every called API against source** (see forbidden / hallucination patterns in **`UNIT_TEST_GUIDELINES.md`** §4).
2. Use JUnit 4 style (`@Test`, `@Before`, `@RunWith` as needed — e.g. `Parameterized`, `Enclosed`).
3. Prefer **`mock()`, `when()`, `verify()`** per project guidelines; extend **`BaseTestCaseMock`** (or `AbstractControllerTest` / `AbstractOTATest` when building domain from scratch) instead of inventing parallel Guice/DAO setup.
4. Provide valid mock data (lists with enough elements where indexing occurs).
5. Avoid unnecessary stubbing.
6. Match stub return types to actual method signatures.
7. Use Hamcrest / JUnit assertions meaningfully; prefer **`assertEquals(0, x.compareTo(y))`** over `assertTrue(x.compareTo(y) == 0)` for Sonar.
8. Ensure the specific changed methods and changed branches reported by SonarQube are covered first.
9. If overall public-method coverage and Sonar new-code coverage conflict in priority, optimize for Sonar new-code coverage first.
10. Declare **`throws Exception`** on tests and helpers that invoke methods throwing checked exceptions.

### Static methods note
Mockito 1.10.19 does **not** support `mockStatic`.
Prefer refactoring static dependencies behind injectable collaborators.

### Guice / singleton controllers (nested `catch` + DAO paths only)
When **real** fixtures cannot trigger a **nested** `catch` (e.g. `findInventoryTypes` → `inventoryTypeDAO.fetch` wrapped in `InventoryControllerException`), prefer (1) data-driven failure if the stack allows it; else (2) **`spy` the real injected DAO** on the **same instance** the controller uses (often via package-private `Field` access on the impl), stub **only** the narrow method + argument, use a **call counter** when that method is invoked **again later** in the same public method, and **`finally` restore** the original field so other tests are not poisoned. Prefer **`UNIT_TEST_GUIDELINES.md`** patterns where possible; document any reflection/spy in the session summary as a deliberate exception.

---

## 🧩 JUnit 4 Example Templates (align with UNIT_TEST_GUIDELINES.md)

**Manual mocks (preferred for simple collaborators):**
```java
import static org.junit.Assert.*;
import static org.mockito.Mockito.*;

import org.junit.Test;

public class MyServiceTest {

  @Test
  public void testExecute_happyPath() {
    Dependency dep = mock(Dependency.class);
    when(dep.getData()).thenReturn("val");
    MyService service = new MyService(dep);

    String result = service.execute();

    assertNotNull(result);
    verify(dep).getData();
  }
}
```

**Controller / Guice + preloaded data:** extend `BaseTestCaseMock` and follow **`UNIT_TEST_GUIDELINES.md`** §5 (known-working GURNIL + `priceId_Price_Product_Assembly` + `productId_Room_One`, etc.).

**Tier 2 domain setup:** extend `AbstractControllerTest` and use the `@Before` + factory pattern in **`UNIT_TEST_GUIDELINES.md`** §13.

---

## 📈 Coverage Verification

1. Confirm tests pass (`Failures: 0, Errors: 0`).
2. Run **`mvn clean test -Psonar jacoco:report`** with **no** `-Dtest=` for the final verification pass (see **Mandatory final verification**).
3. Review `target/site/jacoco/index.html` (and `jacoco.xml` if useful) for **each** file from the Sonar PR list — not only the file you edited most.
4. Cross-check with Sonar PR **Coverage on New Code** (UI or API) when available; the shell script’s per-file **counts** are not enough to prove the gate passed.
5. If Sonar still shows **Coverage on New Code** below **90%** (or JaCoCo still shows material red lines in PR files):
   - identify remaining branches (remote dispatch, encoding exceptions, nested `try`/`catch`, `finally`, lambdas on shared executors, etc.)
   - add tests **in the same session**
   - return to step 2  
6. Only close the task when **≥ 90%** is met on Sonar **or** JaCoCo per-file buffer (**~92–93%**) is met on all listed files and the session summary documents any residual risk if Sonar was not refreshed.

**Optional — poll Quality Gate status via API** (when the instance exposes it):

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_URL}/api/qualitygates/project_status?projectKey=${PROJECT_KEY}&pullRequest=${PR_KEY}"
```
Interpret `projectStatus.status` / conditions (e.g. new_coverage) before claiming the gate is green.

---

## 🚦 Validation Checkpoints
✅ Tests pass on **`mvn clean test -Psonar`** (full module scope, not only new test classes)  
✅ Clean compile before coverage  
✅ **Every** file with `new_uncovered_lines` / `new_uncovered_conditions` from the script (or Sonar UI) addressed — not only the top file  
✅ **Per-file definition of done** (see **Class Selection**): Sonar line anchor + `File:Lx–y → Test#method` mapping + JaCoCo HTML snippet from the **full** `jacoco:report` run, for each processed source file  
✅ Final JaCoCo review shows **~92–93%** line coverage buffer on those files **or** Sonar shows **Coverage on New Code ≥ 90%**  
✅ Quality Gate API or dashboard checked when possible  
✅ Exclusions aligned to pom/profile  

---

## 💡 Golden Rules
- **One user message = one task:** keep iterating (tests → full `mvn clean test -Psonar jacoco:report` → Sonar/JaCoCo review) until **Coverage on New Code ≥ 90%** or a documented blocker — not “good enough” at ~74–87%.
- Clean → test success → clean → **full-module** coverage (`jacoco:report` without `-Dtest=`)
- Do not proceed to the next class before the current class’s Sonar-reported new-code gaps are addressed **and** JaCoCo shows no obvious remaining red in that file
- Do not end the session until **all** Sonar-listed files are processed (or explicitly excluded)
- Fix compilation/test failures immediately
- Keep tests readable and maintainable
- Prefer tests that close **both** line and **condition** gaps; prefer the smallest set that still clears the **90%** gate (buffer to **~92–93%** locally when Sonar is stale)

---

## 📝 Post-Session Summary

After completing test generation for all targeted files:

1. **Generate a short session summary** covering:
   - PR number and SonarQube project key used.
   - **Sonar Quality Gate**: paste or summarize `api/qualitygates/project_status` for the PR (`status`, and the **`new_coverage`** / “Coverage on New Code” condition if present) — **required** when Sonar was reachable; if unreachable, state that and point to JaCoCo buffer results instead.
   - **Per-file table** using the **Files Processed** columns below (Sonar line anchor or screenshot name, `→ Test#method` mapping, JaCoCo proof from **full** module run — not scoped `-Dtest=` alone).
   - Test classes created or modified.
   - Coverage improvement per class (before → after), with emphasis on new-code coverage impact.
   - Any production code changes made for testability.
   - Any lines flagged as unreachable or excluded.
   - Remaining gaps preventing PR new-code coverage from exceeding 90%, if any.

2. **Save the summary as a Markdown file** at:
   ```
   .github/docs/junit-generation-from-sonarqube-pr<PR_KEY>.md
   ```
   Replace `<PR_KEY>` with the actual pull request number (e.g., `junit-generation-from-sonarqube-pr1436.md`).

3. **Summary file structure:**
   ```markdown
   # JUnit Generation from SonarQube — PR <PR_KEY>

   ## Session Info
   - Date: <date>
   - PR: <PR_KEY>
   - Project Key: <PROJECT_KEY>
   - Quality Gate (Sonar): <e.g. OK / FAILED — Coverage on New Code 90.1% / not re-checked>
   - Full module test: <passed | failed — note scope>

   ## Files Processed
   | File | Sonar lines / evidence | Test mapping (`File:Lx–y → Test#method`) | JaCoCo proof (full `mvn test -Psonar`) | Uncovered (before) | Uncovered (after) |
   |------|------------------------|--------------------------------------------|----------------------------------------|----------------------|-------------------|
   | `src/main/java/.../Foo.java` | e.g. Sonar L2342–2391 or `screenshot-foo.png` | `Foo.java:L2342–2357 → BarTest#testCachedPath` | paste line table snippet or “L2398 catch: was red → green” | 7 lines, 6 cond. | 0 / re-check Sonar |

   ## Changes Made
   - ...

   ## Remaining Gaps / Flagged Lines
   - ...
   ```

4. Keep the written summary concise and decision-oriented. Prefer a compact table plus short bullets over long narrative text.
