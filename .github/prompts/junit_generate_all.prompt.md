---
agent: agent
name: junit_generate_all
description: Generate JUnit 4 test cases for modified Java classes for a given commit or branch in the module com.abvprp.core:aboveproperty-java, prioritizing classes with recent changes.

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

✅ Ask user for a commit hash or a branch name, identify exactly which files were changed and which line ranges were added or modified and use that information to prioritize test generation for affected classes in that particular line of code.

Use the commit diffs as the source of truth.

### For each commit or branch:
1. List every changed file.
2. For each file, extract the affected line numbers from the diff hunk headers.
3. Separate:
   - Added lines
   - Modified lines
4. Ignore deleted-only lines unless they are part of a modification.
5. Use the NEW file line numbers from the diff (`+++` side / `@@ -old,+new @@` hunk headers).
6. Return the result in a clean structured format.

### Rules to determine line numbers:
- Treat pure insertions as “Added”.
- Treat changed existing code as “Modified”.
- Combine consecutive lines into ranges when possible.
- Be precise and do not guess lines that are not explicitly supported by the diff.
- If a file appears in multiple hunks, merge the ranges for that file.
- If line numbers cannot be determined from the provided diff, say “line numbers not available”.

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
