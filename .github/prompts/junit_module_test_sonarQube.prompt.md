---
agent: agent
---

# 🧠 Automated JUnit 4 Test Generation Guideline for Maven Module com.abvprp.core:aboveproperty-java

You are generating **JUnit 4** test cases for module `com.abvprp.core:aboveproperty-java` in a Maven multi-module Java project.
Follow these rules for correctness, maintainability, and reliable coverage tracking.

---

## 🎯 Core Principles
1. Work one class at a time.
2. Always clean before test/coverage runs.
3. Fix all test errors before coverage checks.
4. Fix compilation errors immediately (do not recreate files).
5. Check results after every cycle.
6. Start with happy-path, then edge/failure cases.
7. Every public method should have at least one test.
8. Class coverage target: **≥ 90%** before moving to the next class.
9. Module coverage target: **≥ 90%**.
10. Only explicitly approved exclusions may skip testing.

---

## 🧩 Class Selection
✅ Include concrete logic classes (`*Impl`, `*Service`, `*Component`, `*Dao`).

✅ Generate JUnit test cases that specifically target the files, line numbers, and uncovered conditions listed below, so PR new-code coverage increases meaningfully.

### Instructions for each file:
1. For each file below, analyze the uncovered lines and uncovered conditions.
2. Propose the most likely execution paths, branches, null checks, conditionals, exception paths, and edge cases needed to cover those lines.
3. Generate concrete JUnit test methods for each file.
4. Reuse the project’s likely existing testing style and libraries:
   - JUnit 4 or JUnit 5 depending on existing file style
   - Mockito for mocks/spies/stubs
   - AssertJ or standard assertions if appropriate
5. Prefer extending existing test classes if a matching test file likely already exists.
6. Do not change production code unless absolutely necessary for testability.
7. If a line looks unreachable without a small safe refactor, clearly call that out separately.
8. For each file, provide:
   - Why the lines are currently uncovered
   - The exact test scenarios needed
   - The JUnit test code
   - Any mock setup required
   - Any assumptions made
9. Focus on minimal, targeted tests that improve SonarQube coverage rather than broad refactoring.
10. If multiple uncovered lines belong to the same branch, combine them into one efficient test where possible.

### Important:
- Be precise about line coverage vs condition coverage.
- If uncovered conditions exist, explicitly create tests for both true/false paths.
- If a method depends on DAO/provider/service calls, mock them.
- If a method returns HTTP responses, assert status codes and response bodies where relevant.
- If a method uses static helpers like Key.isNull(...), account for those branches.
- If existing test class names are obvious, use them. Otherwise suggest an appropriate test class name.

### File list:
SonarQube PR new-code coverage details
SONAR_URL   = https://sonar.dev.abvprp.com
PROJECT_KEY = aboveproperty_aboveproperty.java_AZh-ETkgTq6qrDHSx3LQ
PR_KEY      = 1419

Files found: 24

--------------------------------------------------------------------------------
File: src/main/java/com/abvprp/data/dao/solr/AgreementSearchDAOSolrImpl.java
New coverage: 83.3%
New uncovered lines: 1
New uncovered conditions: 0
Line numbers: 276

--------------------------------------------------------------------------------
File: src/main/java/com/abvprp/data/dao/solr/CustomerSearchDAOSolrImpl.java
New coverage: 60.5%
New uncovered lines: 9
New uncovered conditions: 8
Line numbers: 157,504,628,661,662,663,664,665,666,845,867,871

--------------------------------------------------------------------------------
File: src/main/java/com/abvprp/webservices/tasks/CustomerSearchTask.java
New coverage: 90.6%
New uncovered lines: 0
New uncovered conditions: 3
Line numbers: 131,137,240

--------------------------------------------------------------------------------
File: src/main/java/com/abvprp/data/dao/solr/ReservationProductSearchDAOSolrImpl.java
New coverage: 71.4%
New uncovered lines: 2
New uncovered conditions: 0
Line numbers: 254,257

--------------------------------------------------------------------------------
File: src/main/java/com/abvprp/controllers/internal/ReservationSearchControllerInternalImpl.java
New coverage: 0.0%
New uncovered lines: 15
New uncovered conditions: 6
Line numbers: 89,90,104,105,106,109,110,111,113,116,119,121,122,124,127

--------------------------------------------------------------------------------
File: src/main/java/com/abvprp/data/dao/solr/ReservationSearchDAOSolrImpl.java
New coverage: 42.9%
New uncovered lines: 4
New uncovered conditions: 0
Line numbers: 289,312,333,406

--------------------------------------------------------------------------------
File: src/main/java/com/abvprp/guice/providers/SolrClientProvider.java
New coverage: 91.7%
New uncovered lines: 0
New uncovered conditions: 1
Line numbers: 78

--------------------------------------------------------------------------------
File: src/main/java/com/abvprp/webservices/tasks/WorkflowTaskContentSearchTask.java
New coverage: 95.0%
New uncovered lines: 0
New uncovered conditions: 1
Line numbers: 117

❌ Exclude only approved module-specific exclusions from current pom/profile configuration, for example:
- JaCoCo exclude: `**/com/abvprp/data/dao/cassandra/*`
- Surefire (sonar profile) excludes controllers/analytics from execution.

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
```bash
1. mvn clean
2. mvn compile test-compile
3. mvn test -Dtest=ClassNameTest
4. mvn clean test -Psonar jacoco:report -Dtest=ClassNameTest
5. Review target/site/jacoco/index.html
```

Multiple test classes:
```bash
mvn clean test -Psonar jacoco:report "-Dtest=Class1Test,Class2Test"
```

Module run:
```bash
mvn clean test -Psonar jacoco:report
```

---

## 🧠 Test Authoring Rules (JUnit 4 + Mockito 1.x)
1. Generate syntactically correct tests on first attempt.
2. Use JUnit 4 style (`@Test`, `@Before`, `@RunWith` as needed).
3. Use `@Mock` / `@InjectMocks` and `when(...).thenReturn(...)` patterns compatible with Mockito 1.x.
4. Provide valid mock data (lists with enough elements where indexing occurs).
5. Avoid unnecessary stubbing.
6. Match stub return types to actual method signatures.
7. Use meaningful assertions and verifications.
8. Ensure all public methods are covered.

### Static methods note
Mockito 1.10.19 does **not** support `mockStatic`.
Prefer refactoring static dependencies behind injectable collaborators.

---

## 🧩 JUnit 4 Example Template
```java
import static org.junit.Assert.*;
import static org.mockito.Mockito.*;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.runners.MockitoJUnitRunner;

@RunWith(MockitoJUnitRunner.class)
public class MyServiceTest {

  @Mock
  private Dependency dep;

  @InjectMocks
  private MyService service;

  @Test
  public void testHappyPath() {
    when(dep.getData()).thenReturn("val");

    String result = service.execute();

    assertNotNull(result);
    verify(dep).getData();
  }
}
```

---

## 📈 Coverage Verification
1. Confirm tests pass (`Failures: 0, Errors: 0`).
2. Run coverage with sonar profile:
   - `mvn clean test -Psonar jacoco:report`
3. Review `target/site/jacoco/index.html`.
4. Verify class and module coverage ≥ 90%.
5. If below target:
   - add targeted tests
   - rerun compile/tests/coverage
   - repeat until target is met

---

## 🚦 Validation Checkpoints
✅ Tests pass  
✅ Clean compile before coverage  
✅ Public methods covered  
✅ Class + module coverage ≥ 90%  
✅ Exclusions aligned to pom/profile  

---

## 💡 Golden Rules
- Clean → test success → clean → coverage
- Do not proceed to next class before current class reaches coverage target
- Fix compilation/test failures immediately
- Keep tests readable and maintainable
