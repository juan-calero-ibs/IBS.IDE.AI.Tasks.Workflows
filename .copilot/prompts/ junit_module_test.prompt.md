---
mode: agent
---
# 🧠 Automated JUnit 5 Test Generation Guideline for Maven Module <module-name>
You are generating **JUnit 5 test cases** for a module <module-name> in a **multi-module Maven Java project**.  
Follow these strict rules to ensure correctness, maintainability, and reliable coverage tracking.
---
## 🎯 Core Principles
1. **Work one class at a time.**  
2. **Always clean before tests or coverage.**  
3. **Fix all test errors before coverage.**  
4. **Fix compilation errors immediately — do not ignore or recreate files.**  
5. **Check results after every cycle.**  
6. **Happy-path tests first, then edge and failure cases.**  
7. **All public methods must have at least one test.**  
8. **Coverage ≥ 80 % per class is MANDATORY before proceeding to the next class.**  
9. **Coverage ≥ 80 % required for overall module.**  
10. **Only explicitly excluded classes may skip testing.**
---
## 🧩 Class Selection
✅ **Include:** concrete logic classes (`*Impl`, `*Service`, `*Component`, `*Dao`)  
❌ **Exclude:** only items in the **coverage exclusion list**, such as:
`VO`, `Entity`, `DTO`, constants, configuration, or boilerplate classes.
All other classes **must** have test cases.
Update the `jacoco-maven-plugin` in `pom.xml`:
```xml
<excludes>
  <exclude>**/vo/**</exclude>
  <exclude>**/entity/**</exclude>
  <exclude>**/dto/**</exclude>
  <exclude>**/config/**</exclude>
</excludes>
```
---
## 🧱 Tooling Versions
- Java 17+  
- Maven 3.3+  
- JUnit 5 (Jupiter = 5.9.2)  
- Mockito 5.2.0 with `mockito-inline` (for static mocking)  
- JaCoCo 0.8.10+ for coverage  
---
## 📦 Pre-Test Checklist
Before generating tests, verify:
- ✅ JUnit 5 (junit-jupiter-engine 5.9.2 & junit-jupiter-api - 5.9.2) in test dependencies
- ✅ Mockito 5.2.0 with `mockito-inline` (for static mocking) - mockito-core, mockito-inline, mockito-junit-jupiter - 5.2.0
- ✅ JaCoCo 0.8.10+ for coverage reporting
- ✅ Check if mockito-all is coming from any module using mvn dependency:tree and if present, exclude it from all modules
- ✅ `mvn clean compile test-compile` runs without errors
- ✅ Parent pom.xml exclusions include: `**/vo/**`, `**/entity/**`, `**/dto/**`, `**/config/**`
If any dependency is missing, **STOP** and add it to `pom.xml` before proceeding.
---
## ⚒️ Standard Workflow
```bash
1. mvn clean
2. mvn compile test-compile
3. mvn test -Dtest=ClassNameTest          # Expect "Failures: 0, Errors: 0"
4. mvn clean test jacoco:report -Dtest=ClassNameTest
5. Review target/site/jacoco/index.html
```
Multiple test classes:
```bash
mvn clean test jacoco:report "-Dtest=Class1Test,Class2Test"
```
After all class tests:
```bash
mvn clean test jacoco:report
# Verify overall module coverage ≥ 80 %
```
---
## 🧠 Test Generation Strategy
| Class size | Strategy |
|-------------|-----------|
| < 15 methods | Single test class (~15 tests) |
| 15–30 methods | Single file, monitor complexity |
| 30+ methods | **MUST split into multiple test classes** |
Start with **10–15 happy-path tests**, then add edge and failure scenarios.
---
### 🚨 Compilation Error Handling — CRITICAL
**NEVER ignore or tolerate compilation errors.** Always fix them immediately:
1. **Before generating tests**, carefully analyze the target class:
   - Review all imported types and dependencies.  
   - Understand all return types and method signatures.  
   - Verify all dependencies are available in test scope.  
2. **During generation**, generate test code that is **syntactically correct on first attempt**:
   - Match method signatures exactly.  
   - Use correct mock types and return values.  
   - Import all required classes.  
   - Ensure mock initialization matches constructor parameters.  
3. **If compilation errors occur**:
   - **Do not delete and recreate** the entire file.  
   - **Analyze the error** immediately and identify the root cause.  
   - **Fix the issue** with precision (e.g., add missing imports, correct type mismatches, fix mock declarations).  
   - **Re-compile and verify** before proceeding.  
   - **Update the coverage index** (see tracking below).  
4. **Common compilation error roots**:
   - Missing import statements → Add imports.  
   - Incorrect mock types → Review class dependencies and correct mock declarations.  
   - Incorrect return types in mocks → Match stub return values to method signatures.  
   - Missing @Mock or @InjectMocks → Ensure all fields are properly annotated.  
   - Type mismatches in assertions → Use correct assertion methods and types.  
---
### 🧩 Splitting Complex Classes — Multiple Test Classes (MANDATORY for 30+ methods)
When a target class has **30+ public methods or complex branching**, splitting into multiple focused test classes is **the right approach**. Do NOT attempt to fit all tests into a single file.
#### Splitting Strategy:
- **Split by functional area or operation type** (examples):  
  - `ClassNameCrudTest` — core create/read/update/delete flows.  
  - `ClassNameSearchTest` — search/query related methods.  
  - `ClassNameExcelTest` — import/export and file-handling.  
  - `ClassNameValidationTest` — validation and input-checking logic.  
  - `ClassNameEdgeCaseTest` — deep edge cases and error scenarios.  
  - `ClassNameTransformTest` — data transformation and conversion logic.  
- **Naming conventions:** `[ClassName][Feature]Test` (e.g., `MyServiceImplExcelTest`). Keep names descriptive and consistent.
- **Shared test infrastructure:** create a `TestDataFactory` or `BaseTest` class for common mock data, builders, and utility helpers:
```java
public class TestDataFactory {
    public static MyVO createMockVO() { /* ... */ }
    public static UserInfoVO createMockUser() { /* ... */ }
    public static List<ContractVO> createMockContractList() { /* at least 3 items */ }
}
```
- **Per-file focus:** aim for **8–15 tests per file**, each file < 500 lines of code.
- **Mocking consistency:** each test class declares its own `@Mock` fields and `@InjectMocks`, but **reuse factory helpers** for consistent test data.
- **Coverage runs:** always run all related test classes **together** for cumulative coverage measurement:
```bash
mvn clean test jacoco:report "-Dtest=ClassNameCrudTest,ClassNameSearchTest,ClassNameExcelTest"
```
- **When NOT to split:** keep a single test file **only if** the class has < 15 public methods and methods are tightly related.
This splitting strategy improves **readability, parallel execution, and clearer coverage attribution** across functional areas.
---
## 🧪 Test Authoring Rules
1. **Generate syntactically correct test code on the first attempt.**  
   - Analyze the target class thoroughly before generating.  
   - Understand all dependencies, return types, and method signatures.  
   - Generate imports and mock declarations that will compile immediately.  
2. **Detect and mock all static method usages dynamically.**  
   - Whenever *any* static method is used, wrap it in  
     `try (MockedStatic<...> mock = mockStatic(...))`.  
   - Infer static usages automatically — do not rely on fixed examples.  
   - Always close mocks with try-with-resources.  
3. Use `@Mock` for dependencies and `@InjectMocks` for the class under test.  
4. Provide valid mock data and collections (≥ 3 elements if indexed).  
5. Use `lenient().when(...)` for optional stubs.  
6. Match mock return types exactly with implementation.  
7. Write meaningful assertions verifying behavior.  
8. **Ensure every public method is tested.**
---
## 🧩 Example Templates
**Class with static usage**
```java
@ExtendWith(MockitoExtension.class)
class MyServiceTest {
  @Mock Dependency dep;
  @InjectMocks MyService service;
  @Test
  void testMethodWithStatic() {
    try (MockedStatic<StaticUtil> mock = mockStatic(StaticUtil.class)) {
      mock.when(() -> StaticUtil.compute(any())).thenReturn("mocked");
      when(dep.call()).thenReturn("ok");
      assertEquals("mocked", service.run());
    }
  }
}
```
**Class without static usage**
```java
@ExtendWith(MockitoExtension.class)
class MyServiceTest {
  @Mock Dependency dep;
  @InjectMocks MyService service;
  @Test
  void testHappyPath() {
    when(dep.getData()).thenReturn("val");
    String result = service.execute();
    assertNotNull(result);
    verify(dep).getData();
  }
}
```
---
## �️ DAO Testing Best Practices
### For `*DaoImpl` Classes
**Key Pattern: Mock Infrastructure, Verify Behavior**
```java
@ExtendWith(MockitoExtension.class)
class MyDaoImplTest {
  @Mock private EntityManager entityManager;
  @Mock private SqlMapperProvider sqlMapperProvider;
  @Mock private MyDataMapper myDataMapper;
  @InjectMocks
  private MyDaoImpl myDaoImpl;
  @BeforeEach
  void setUp() {
    // Use lenient() for optional infrastructure stubs
    lenient().when(myDaoImpl.getEntityManager()).thenReturn(entityManager);
    lenient().when(myDaoImpl.getSqlMapperProvider()).thenReturn(sqlMapperProvider);
  }
  @Test
  void testSave() {
    try (MockedStatic<ContextUtils> ctx = mockStatic(ContextUtils.class)) {
      ctx.when(ContextUtils::getActiveTenantId).thenReturn("TENANT1");
      when(entityManager.persist(any())).thenReturn(null);
      myDaoImpl.save(testVO);
      verify(entityManager).persist(any(Entity.class));
    }
  }
}
```
**Critical Rules:**
1. ✅ Use `@InjectMocks` (NOT `@Spy`) for the DAO class
2. ✅ Use `lenient().when()` for infrastructure method stubs to prevent UnnecessaryStubbingException
3. ✅ Mock `getEntityManager()`, `getSqlMapperProvider()` — return the mocked dependencies
4. ✅ Mock static utilities with `MockedStatic<>` and try-with-resources
5. ✅ Use `when().thenReturn()` syntax (NOT `doReturn().when()`)
6. ✅ Verify infrastructure calls, don't simulate what they do: `verify(entityManager).persist(...)`
7. ✅ Create helper methods for test data (VO objects) for consistency
8. ❌ Don't use `@Spy` or `ReflectionTestUtils` for DAO tests
9. ❌ Don't try to create real persistence context — mocked operations are sufficient
10. ❌ Don't mock unnecessary methods — only mock what the DAO calls
---
## �📋 Method Coverage Tracking Index
For **complex classes split into multiple test files**, maintain a **Coverage Index File** to track which methods have been tested. This prevents method duplication, improves organization, and reduces compilation errors.
### Index File Format
Create a file named `[ClassName]_COVERAGE_INDEX.md` in the same directory as the test files:
```markdown
# MyServiceImpl Coverage Index
## Target Class
- **Fully Qualified Name**: `com.example.service.MyServiceImpl`
- **Total Public Methods**: 47
- **Coverage Target**: 80% (≥ 38 methods)
## Test Classes Generated
1. `MyServiceImplCrudTest` — CRUD operations (13 methods)
2. `MyServiceImplSearchTest` — Query/search methods (12 methods)
3. `MyServiceImplValidationTest` — Validation logic (10 methods)
4. `MyServiceImplEdgeCaseTest` — Edge cases (8 methods)
## Tested Methods by Class
### MyServiceImplCrudTest ✅
| Method Name | Signature | Status | Notes |
|-------------|-----------|--------|-------|
| create | `create(MyVO): Long` | ✅ Tested | Happy path + edge cases |
| update | `update(MyVO): boolean` | ✅ Tested | Happy path + failure |
| delete | `delete(Long): boolean` | ✅ Tested | Null ID handling |
| getById | `getById(Long): MyVO` | ✅ Tested | ID not found case |
| saveBatch | `saveBatch(List<MyVO>): List<Long>` | ✅ Tested | Empty list handling |
| ... (continue for all 13 methods) |
## Coverage Summary
- **Methods Tested**: 43 / 47 (91.5%)  
- **Target Achieved**: ✅ Yes (≥80%)  
- **Last Updated**: 2025-11-07  
- **Compilation Status**: ✅ Success  
```
### Using the Index
1. **Before generating tests for a complex class:**  
   - Create the Coverage Index file with the class metadata and method list.  
   - Set target coverage (usually 80%).  
2. **While generating tests:**  
   - Mark each method as tested in the index.  
   - Note test file name and any special handling.  
3. **When creating multiple test files:**  
   - Update the index with each new test class.  
   - Track which methods are covered by each test file.  
   - Prevent duplicate method testing across files.  
4. **Before running coverage:**  
   - Verify all intended methods are marked as tested in the index.  
   - Cross-check with the actual test files to ensure consistency.  
5. **After coverage results:**  
   - Update the index with final coverage percentages.  
   - Mark the class as complete or flag gaps requiring more tests.  
   - Use this for final reporting.
### Benefits
- ✅ **Prevents method duplication** across multiple test files.  
- ✅ **Reduces compilation errors** by maintaining clear mapping.  
- ✅ **Improves tracking** of what has been tested.  
- ✅ **Facilitates team collaboration** with clear documentation.  
- ✅ **Enables quick verification** before coverage runs.  
---
## 📈 Coverage Verification
1. Confirm all tests pass (`Failures: 0, Errors: 0`).  
2. Run `mvn clean test jacoco:report`.  
3. Review `target/site/jacoco/index.html`.  
4. Verify:
   - **Each tested class ≥ 80 % coverage** (MANDATORY — do NOT proceed to next class until achieved)  
   - **Overall module ≥ 80 % coverage**  
5. **If class coverage < 80%:**  
   - Identify uncovered lines and branches in the JaCoCo report.  
   - Add targeted tests for missing coverage.  
   - Update the Coverage Index with new tests.  
   - Re-run `mvn clean test jacoco:report` until ≥ 80%.  
   - **Only then proceed to the next class.**  
6. Validate `pom.xml` exclusions before final report.
---
## ⚠️ Common Issues and Fixes
| Problem | Cause | Fix |
|----------|--------|-----|
| Compilation error | Incorrect mock types or missing imports | **Analyze root cause and fix immediately** — do NOT recreate file. Add imports, correct types, fix declarations. |
| Coverage not at 80% | Insufficient test coverage | Add more tests for remaining branches/methods. Do NOT proceed to next class until ≥80% is achieved. |
| Coverage low after running tests | Didn't run `mvn clean` | Always run `mvn clean` before coverage runs |
| NullPointerException | Missing mock data | Provide valid inputs |
| IndexOutOfBounds | Too few list elements | Provide ≥ 3 items |
| UnnecessaryStubbing | Mocked unused methods | Use `lenient()` |
| Static mock fails | Mock not used | Only mock invoked statics |
| Missing coverage | Public method untested | Add test for that method |
| Method duplication across files | Lost track of tested methods | **Use Coverage Index file** to track tested methods by test class |
| Unsure what to test next | No clear tracking | **Create/update Coverage Index file** to see what's covered and what remains |
| Test files scattered | Multiple test classes without organization | Use Coverage Index and consistent naming convention ([ClassName][Feature]Test) |
---
## 🚦 Validation Checkpoints
✅ All tests pass  
✅ Clean build before coverage  
✅ Every public method tested  
✅ Class + module coverage ≥ 80 %  
✅ Exclusions limited to approved list  
❌ Never skip cleaning or tolerate failures  
---
## 🧰 Summary Workflow
```bash
1. Check if SESSION_PROGRESS.md exists
   - If yes: Read it to resume from the last saved state
   - If no: Create it with initial status and list all eligible classes
2. Identify eligible classes (exclude VO, Entity, DTO, Config).
3. For each class (do NOT skip):
   a. Analyze the class thoroughly
      - Identify all public methods
      - Understand dependencies and return types
      - Determine if single or multiple test files needed
   b. If complex (30+ methods):
      - Create [ClassName]_COVERAGE_INDEX.md
      - Split into multiple test files by feature
      - Use factory helpers for common test data
   c. Generate tests (syntactically correct on first attempt)
      - Generate tests covering all public methods
      - Use mockStatic for static method calls
      - Use Coverage Index to prevent duplication
   d. Compile and run
      - mvn clean compile test-compile (verify no compilation errors)
      - If errors: fix immediately, analyze root cause, do not recreate files
      - mvn test -Dtest=ClassNameTest (expect Failures: 0, Errors: 0)
   e. Check coverage (MANDATORY ≥80%)
      - mvn clean test jacoco:report -Dtest=ClassNameTest
      - Review target/site/jacoco/index.html
      - If coverage < 80%: add more tests and go to step (d)
      - If coverage ≥ 80%: proceed to next class
   f. Update Coverage Index with final results
4. After all eligible classes are tested:
   - Run full-module coverage: mvn clean test jacoco:report
   - Verify module coverage ≥ 80%
   - If module coverage < 80%: review and add tests as needed
5. Validate pom.xml exclusions are correct
6. Generate final summary report - SESSION_PROGRESS.md
```
---
## 💡 Golden Rules
- **CLEAN → TEST SUCCESS → CLEAN → COVERAGE ≥ 80% BEFORE NEXT CLASS**  
- Every **public method must have a test.**  
- Exclude **only approved classes** (VO, Entity, DTO, Config).  
- Maintain **≥ 80 % coverage** per class **before proceeding** (MANDATORY).  
- Maintain **≥ 80 % coverage** for overall module.  
- **Fix compilation errors immediately** — analyze root cause and correct, do not recreate files.  
- **For complex classes (30+ methods), splitting into multiple test files is MANDATORY.**  
- **Create and maintain a Coverage Index file** for complex classes to prevent method duplication.  
- Verify JaCoCo exclusions before reporting.  
- Detect and mock **all static methods dynamically.**  
- Always validate results before proceeding.  
- **Never proceed to the next class until current class coverage ≥ 80%.**
---
## ⚙️ Autonomous Execution Directive (Optimized)
The model must execute these steps **continuously and autonomously** until the full Maven module meets the target coverage.
### Session Initialization
**BEFORE starting any work:**
- Check if `SESSION_PROGRESS.md` exists in the module root
  - ✅ **If YES:** Read the file to understand what classes have been tested and their coverage status
    - **For COMPLETE classes (≥80% coverage):** Skip and do NOT re-test
    - **For INCOMPLETE classes (< 80% coverage):** 
      - Read the `[ClassName]_COVERAGE_INDEX.md` file
      - Identify which methods are marked as untested or have gaps
      - Resume Code Generation Phase for those remaining methods
      - Create additional test files for uncovered methods/branches
      - Re-run coverage until ≥ 80%
    - **For untested classes:** Begin testing from the next eligible class
  - ✅ **If NO:** Start fresh
    - Identify all eligible classes (exclude VO, Entity, DTO, Config)
    - Begin testing from the first eligible class
### Per-Class Workflow (STRICT ENFORCEMENT)
1. **Iterate automatically** through all testable classes one-by-one.
2. **For EACH class (do not skip any step):**
   a. **Pre-Analysis Phase:**
      - Thoroughly analyze the target class.
      - Identify all public methods and their signatures.
      - Determine if single or multiple test files are needed (30+ methods → multiple files).
      - If multiple files, create a `[ClassName]_COVERAGE_INDEX.md` to track coverage.
   b. **Code Generation Phase:**
      - Generate test code with **ZERO compilation errors on first attempt**.
      - For complex classes, create multiple test files by feature.
      - Use mock factories for reusable test data.
      - Include all static method mocking with try-with-resources.
   c. **Compilation & Execution Phase:**
      - Run `mvn clean compile test-compile` to verify compilation.
      - **If compilation errors:**
        - **STOP immediately.**
        - Analyze the root cause (missing imports, incorrect types, wrong mock declarations, etc.).
        - **Fix the error directly** in the test file(s) — do NOT delete and recreate.
        - Re-run `mvn clean compile test-compile` until success.
        - **Document the fix** in the Coverage Index or test file comments.
      - Run `mvn clean test -Dtest=ClassNameTest` (or multiple test classes).
      - Expect output: `Failures: 0, Errors: 0`.
      - **If test failures or errors:**
        - Fix the failing test(s) immediately.
        - Re-run until all tests pass.
   d. **Coverage Verification Phase (MANDATORY):**
      - Run `mvn clean test jacoco:report -Dtest=ClassNameTest` (for single) or include all related test classes.
      - Open `target/site/jacoco/index.html`.
      - Check the coverage % for the target class.
      - **Check if coverage ≥ 80%:**
        - ✅ **If ≥ 80%:** proceed to step (e).
        - ❌ **If < 80%:** go to step (e-fail).
   e. **Post-Coverage Phase:**
      - Update the Coverage Index file with:
        - Final coverage %.
        - All tested methods.
        - Test class names.
        - Date and status (COMPLETE or NEEDS MORE TESTS).
      - **Mark the class as READY for the next module.**
   e-fail. **Coverage Shortfall Handling (MANDATORY LOOP):**
      - Analyze the JaCoCo report to identify uncovered lines/branches.
      - Identify which public methods or code paths are not tested.
      - Generate additional tests targeting the gaps.
      - **Do NOT proceed to the next class.**
      - Re-run from step (c) — Compilation & Execution Phase.
      - **Loop until coverage ≥ 80%.**
3. **Post-All-Classes Phase:**
   - After all eligible classes have ≥ 80% coverage individually:
   - Run full module coverage: `mvn clean test jacoco:report`
   - Verify overall module coverage ≥ 80%.
   - **If module coverage < 80%:**
     - Identify classes with low contribution.
     - Review and enhance tests as needed.
     - Re-run coverage until module ≥ 80%.
4. **Validation & Reporting:**
   - Confirm pom.xml exclusions match approved list.
   - Generate SESSION_PROGRESS.md with: each class, per-class coverage %, overall module coverage %.
   - This report serves as documentation for the next session.
### CRITICAL ENFORCEMENT RULES
- ✅ **DO:** Fix compilation errors immediately by analyzing and correcting.  
- ✅ **DO:** Loop coverage checks until ≥ 80% per class is achieved.  
- ✅ **DO:** Create Coverage Index files for complex (30+) classes.  
- ✅ **DO:** Use multiple test files for complex classes.  
- ✅ **DO:** Validate test compilation before running coverage.  
- ❌ **DO NOT:** Proceed to the next class if coverage < 80%.  
- ❌ **DO NOT:** Ignore compilation errors or recreate files to bypass them.  
- ❌ **DO NOT:** Skip classes or stop before all are tested.  
- ❌ **DO NOT:** Wait for user input — execute autonomously until complete.
**End of Prompt**