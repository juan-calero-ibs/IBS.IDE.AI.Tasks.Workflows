# Copilot Instructions

This repo is a centralized AI-assisted workflows and tooling companion for the **IBS AboveProperty** platform. It contains reusable prompts, VS Code tasks, Cline rules, SonarQube scripts, and Postman visualizers. It is **not** the application source — the Java application lives in `~/src/github.com/aboveproperty/aboveproperty.java`.

---

## Target Project: `aboveproperty.java`

**Module:** `com.abvprp.core:aboveproperty-java` — Maven multi-module, Java 8, JUnit 4.

### Build & test commands

```bash
mvn clean
mvn compile test-compile
mvn test -Dtest=ClassNameTest              # single test class
mvn clean test -Psonar jacoco:report -Dtest=ClassNameTest  # single test + coverage
mvn clean test -Psonar jacoco:report "-Dtest=Class1Test,Class2Test"  # multiple
mvn clean test -Psonar jacoco:report       # full module
```

Coverage report: `target/site/jacoco/index.html`

### Tooling baseline

| Tool     | Version             |
|----------|---------------------|
| Java     | 1.8                 |
| JUnit    | 4.12                |
| Mockito  | 1.10.19 (no `mockStatic`) |
| JaCoCo   | 0.7.5 (legacy) / 0.8.11 (sonar profile) |

### JaCoCo / Surefire exclusions (sonar profile)

- JaCoCo excludes: `**/com/abvprp/data/dao/cassandra/*`
- Surefire excludes controllers and analytics from execution under the sonar profile.

---

## JUnit Test Generation

Use `.copilot/prompts/junit_module_test.prompt.md` for general test generation (by commit diff) or `.copilot/prompts/junit_module_test_sonarQube.prompt.md` for targeted SonarQube PR coverage gaps.

**Workflow: clean → compile → test → clean → coverage**

1. Work one class at a time.
2. Start with happy-path, then edge/failure cases.
3. Fix compilation errors immediately — do not recreate files.
4. Coverage target: **≥ 90%** per class before moving on; **≥ 90%** module overall.
5. Only approved exclusions (pom/profile) may skip testing.

### JUnit 4 + Mockito 1.x pattern

```java
@RunWith(MockitoJUnitRunner.class)
public class MyServiceTest {
  @Mock private Dependency dep;
  @InjectMocks private MyService service;

  @Test
  public void testHappyPath() {
    when(dep.getData()).thenReturn("val");
    String result = service.execute();
    assertNotNull(result);
    verify(dep).getData();
  }
}
```

- Use `@Mock` / `@InjectMocks` + `when(...).thenReturn(...)` (Mockito 1.x style).
- **No `mockStatic`** — refactor static dependencies behind injectable collaborators instead.
- Tests go in `src/test/java` under the matching package path.
- Target concrete logic classes: `*Impl`, `*Service`, `*Component`, `*Dao`.

---

## SonarQube PR Coverage Script

```bash
SONAR_URL="https://sonar.dev.abvprp.com" \
SONAR_TOKEN="<token>" \
PROJECT_KEY="<key>" \
PR_KEY="<pr_number>" \
./.github/scripts/sonar/sonar_pr_uncovered_lines.sh
```

Optional: `PAGE_SIZE=500 SHOW_CODE=true DEBUG=true`

Requires: `curl`, `jq`, `python3`

---

## Commit Message Convention

```
type(JIRA-ticket): short description
```

Allowed types: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `style`, `perf`  
Example: `fix(HOSAPS-8318): handle null response in CustomerSearchTask`  
Body wraps at 100 characters.

---

## Cline Workflows (`/@ibs/`)

Workflows live in `.clinerules/workflows/`. When a command starts with `/@ibs/`, resolve it from that directory (e.g., `/@ibs/ibs-workflow.md`).

Key workflows:
- `ibs-workflow.md` — general IBS dev workflow (JIRA ticket management)
- `setup-autoprovision.md` — connect AP Core ↔ UMT for auto-provisioning a property
- `get-trx-logs.md` — pull Babelfish transaction logs from GCS into local Splunk
- `zero-markup-CP.md` — set `ALLOW_NON_MARKUP_AVAILABILITY` via REST API
- `download-UMT-certificate-install-local-JREs.md` — cert install across jenv JDKs

---

## VS Code Tasks (`.vscode/tasks.json`)

Grouped task sets available via the VS Code task runner:

| Group      | Key tasks |
|------------|-----------|
| `[TOMCAT]` | Start/Stop/Kill Tomcat, build & deploy WAR, view logs |
| `🟩 SPLUNK` | Start/Stop/Restart, delete logs, download from GCS, full workflow |
| `🐡 UMT/APS` | Build UMT (Java 17), Build APS (Java 11), Build OTA/External API (Java 17), install Babelfish cert |
| `🔥 Ember`   | Clone Nucleus/PCC repos, `yarn install`, start Ember servers |
| `🩹/🛢️`    | Run Patch / RollForward migration scripts |

---

## Postman Visualizers (`js for Postman/`)

Each `.js` file corresponds to an API endpoint. File names map from URL path by replacing `/` with `.`:

```
/rest/v1/reservations/conf  →  rest.v1.reservations.conf.js
```

Paste the file content into the Postman **Tests/Scripts** tab, send the request, then open the **Visualize** tab. No external libraries — native JS/HTML only.

---

## File Editing Conventions

- **YAML / JSON / `.conf`**: 2-space indentation, preserve comments, preserve key order.
- **Shell scripts**: always include `echo` status lines per step; never use `rm -rf` without explicit approval.
- **Workflow files** (`.clinerules/workflows/*.md`): start the title with an emoji + short descriptor (≤ 4 words), e.g., `🚀 Start Dev Env`.
- After executing workflows, summarize outcome with ✅ or ❌ and list key actions taken.
