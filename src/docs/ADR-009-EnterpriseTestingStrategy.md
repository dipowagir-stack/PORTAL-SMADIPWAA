# ADR-009: Enterprise Testing & Quality Assurance Strategy

## 1. Executive Summary
This Architecture Decision Record (ADR) defines the Enterprise Testing and Quality Assurance (QA) Strategy for the Education Operating System (EduOS). To ensure absolute reliability, data integrity, and compliance across the 10+ year lifecycle of the platform, we adopt a **Shift-Left, Automation-First** approach guided by the classic **Test Pyramid**. This strategy strictly mandates automated Unit, Integration, and Contract testing for all modules, isolating End-to-End (E2E) UI testing to critical user journeys. It establishes rigorous Quality Gates within the CI/CD pipeline, mandates synthetic Test Data Management, and prescribes specialized testing methodologies for AI components and sandboxed Plugins. This strategy ensures the Modular Monolith remains robust and gracefully supports future extraction into microservices.

## 2. Context
EduOS is a highly complex, mission-critical Modular Monolith (.NET 8, React, PostgreSQL, Kafka) supporting multiple domains (Academic, Finance, Student), an AI Platform, a Plugin SDK, and Zero Trust Security (ADRs 001-008). Educational ERPs process highly sensitive student data and financial transactions. As the system scales and the engineering organization grows, relying on manual testing, "ice-cream cone" test anti-patterns (heavy E2E, light unit testing), or siloed QA teams will result in brittle releases, long deployment cycles, and severe regressions.

## 3. Problem Statement
Without a cohesive, enterprise-wide testing strategy, individual teams will implement disjointed quality practices. This leads to flaky E2E tests that block CI/CD pipelines, "integration hell" when modules communicate via Kafka or APIs, and security/performance vulnerabilities slipping into production. We must define how code is validated from the developer's laptop to production, how AI non-determinism is tested, and what metrics determine release readiness.

## 4. Quality Principles
*   **Shift Left Testing:** Quality begins at the design phase. Testing and security scanning occur as early as the developer's local machine and the first PR commit.
*   **Quality by Design:** Architecture dictates testability (Clean Architecture makes unit testing trivial).
*   **Automation First:** Manual testing is strictly reserved for Exploratory Testing, UX validation, and User Acceptance Testing (UAT).
*   **Test Pyramid:** Maximize fast, deterministic unit tests; minimize slow, brittle UI/E2E tests.
*   **Continuous Testing:** Tests run continuously in the CI/CD pipeline (ADR-008) providing immediate feedback.
*   **Risk-Based Testing:** Test coverage and intensity are proportional to the business impact of a failure (e.g., Financial ledgers require higher scrutiny than UI cosmetic rendering).
*   **Observability over Prediction:** We cannot test every edge case. Strong observability (ADR-008) catches what tests miss.

## 5. Testing Strategy
We mandate the following testing methodologies across the enterprise:

*   **Unit Testing:** Tests individual classes/functions in absolute isolation (Domain & Application layers). Mocks external dependencies.
*   **Integration Testing:** Tests the integration of the Application layer with Infrastructure (e.g., EF Core against a PostgreSQL Testcontainer, or Kafka producers/consumers). 
*   **Contract Testing:** (Consumer-Driven Contract Testing). Validates API (REST/GraphQL) and Event (Kafka) schemas between modules to guarantee backward compatibility without requiring live E2E environments.
*   **Component & API Testing:** Validates bounded context API endpoints (Controllers/Resolvers) bypassing the frontend UI.
*   **End-to-End (E2E) & UI Testing:** Validates critical user journeys driving the browser (e.g., Playwright).
*   **Performance Testing:**
    *   *Load Testing:* Simulates expected peak concurrent users.
    *   *Stress Testing:* Pushes the system beyond limits to observe failure modes.
    *   *Spike & Soak Testing:* Tests sudden traffic bursts (e.g., registration day) and long-term memory leaks.
*   **Security Testing:**
    *   *SAST:* Static analysis of source code for vulnerabilities on every PR.
    *   *DAST:* Dynamic testing against running Staging environments.
    *   *SCA:* Software Composition Analysis for dependency vulnerabilities.
*   **AI Feature Testing:** Specialized testing for prompt injection, context relevance (RAG evaluation frameworks), and semantic similarity of embeddings.
*   **Plugin Testing:** Automated verification that plugins cannot escape the WebAssembly/AppDomain sandbox.
*   **Event & Workflow Testing:** Validates Camunda Saga compensations and Kafka message idempotency.
*   **Test Data Management:** No Production Data in lower environments. All test data is synthetically generated (e.g., via Bogus/AutoFixture) with deterministic seeds for repeatability.

## 6. Test Pyramid
The enterprise testing portfolio will adhere to the following composition:

1.  **Unit Tests (~70%):** Foundation of the pyramid. Blazing fast, highly deterministic. Targets Domain Entities, Value Objects, and Application Use Cases.
2.  **Component, Integration & Contract Tests (~20%):** Validates Database queries, Event publishing, and cross-module API contracts. Slower than unit tests, but highly reliable.
3.  **End-to-End (E2E) & API Tests (~10%):** Tests the fully deployed system. Covers only the most critical "Golden Paths" (e.g., Student Registration, Invoice Payment).
4.  **Manual / Exploratory (<1%):** Unscripted testing focused on usability, accessibility edge cases, and UAT.

*Rationale:* Inverting the pyramid (heavy E2E) creates an unmaintainable, slow CI pipeline. A heavy base of unit and contract tests provides fast developer feedback and ensures isolated modules can be extracted to microservices safely.

## 7. Quality Gates
Mandatory automated checks executed in the CI/CD pipeline. A PR cannot be merged, and a release cannot be deployed, if any gate fails.

**Pre-Merge (PR) Gates:**
*   **Code Formatting & Linting:** 100% compliance.
*   **Unit & Integration Test Success:** 100% pass rate.
*   **Code Coverage Threshold:** Minimum 85% line coverage (100% on Domain models).
*   **Architecture Validation:** ArchUnitNET tests pass (verifies DDD layering).
*   **Static Security (SAST) & Dependency Scan (SCA):** 0 High/Critical vulnerabilities.

**Release Gates (Deployment to Staging/Prod):**
*   **Contract Test Success:** No broken consumer contracts.
*   **E2E Smoke Test Success:** Core journeys functional on deployed artifact.
*   **Performance Baseline:** Latency and throughput match or exceed the previous release.
*   **Dynamic Security (DAST):** Passed against the Staging environment.

## 8. Test Environment Strategy
Environments are ephemeral and provisioned via Infrastructure as Code (ADR-008).
*   **Developer (Local):** Docker Compose / Testcontainers for rapid isolated testing.
*   **Integration (Ephemeral):** Spun up dynamically in the CI pipeline per PR for integration/contract tests.
*   **QA (Shared):** Deployed from the `main` branch. Used for automated E2E suites.
*   **Staging (Pre-Prod):** Production clone (data sanitized). Used for DAST, Performance baselines, and UAT.
*   **Performance / Chaos Lab:** Isolated environment for aggressive Load/Stress/Spike testing and Chaos Engineering (simulating node/database failures).
*   **AI Evaluation Environment:** Specialized environment to run LLM benchmarks, embedding drift analysis, and prompt regression testing.

## 9. Quality Metrics
To ensure continuous improvement, the Platform Engineering team tracks the following KPIs:
*   **Code Coverage:** % of code executed by automated tests (Target: >85%).
*   **Test Pass Rate / Flakiness:** % of tests that pass consistently (Target: >99%).
*   **Mean Time To Detect (MTTD):** Time to detect a defect in production.
*   **Mean Time To Recovery (MTTR):** Time to roll back or hotfix a production defect.
*   **Escaped Defects:** Number of bugs found in Production vs. QA.
*   **Defect Density:** Bugs per 1k lines of code.
*   **Technical Debt Index:** Tracked via SonarQube (Code smells, duplication).

## 10. Release Readiness Criteria
*   **Definition of Ready (DoR):** User story is clear, acceptance criteria are defined, technical design is approved, and testability is verified.
*   **Definition of Done (DoD):** Code is written, peer-reviewed, meets all Quality Gates, is documented, and successfully deployed to Staging.
*   **Release Checklist:** Automated via the CD pipeline. Verifies artifacts, signatures, database migration scripts, and feature flag configurations.
*   **Rollback Criteria:** If post-deployment synthetic monitoring fails, or error rates spike >2% above baseline within 15 minutes of deployment, an automated rollback is triggered (via ArgoCD).

## 11. Decision Matrix

| Strategy | Reliability | Automation | Scalability | Maint. Cost | Developer Prod. | Weighted Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Weight** | 10 | 10 | 9 | 8 (Lower=Better) | 9 | Max 460 |
| Heavy E2E / UI Focus | 6 | 7 | 4 | 2 | 4 | 252 |
| Manual QA Heavy | 8 | 1 | 2 | 3 | 5 | 229 |
| **Test Pyramid + Contract**| **10** | **10** | **10** | **8** | **9** | **447** |

## 12. Risk Analysis
*   **Automation Risks (Flaky Tests):** UI tests fail due to timing issues. *Mitigation:* Isolate E2E tests to critical paths only. Utilize auto-waiting frameworks (Playwright). Delete or rewrite consistently flaky tests.
*   **Coverage Risks (False Positives):** High coverage %, but tests lack meaningful assertions. *Mitigation:* Implement **Mutation Testing** (e.g., Stryker) periodically to ensure tests actually catch altered business logic.
*   **AI Risks (Non-Determinism):** LLM responses vary, failing exact-match assertions. *Mitigation:* Use LLM-as-a-Judge frameworks and semantic similarity scoring rather than exact string matching for AI features.
*   **Data Risks (State Pollution):** Shared QA databases cause tests to interfere with each other. *Mitigation:* Tests must be idempotent. Use unique identifiers for test records and tear down state after test execution.

## 13. Consequences
*   **Positive:** Massive reduction in production incidents. High developer confidence when refactoring. Seamless CI/CD automation allows for multiple deployments per day.
*   **Negative:** High initial engineering overhead to establish the frameworks (Contract Testing, Testcontainers, UI Automation). Developers must spend significant time writing comprehensive tests.

## 14. Implementation Notes
*   **Unit/Integration:** `xUnit` with `Moq` and `FluentAssertions` for backend. `Vitest` / `React Testing Library` for frontend.
*   **Infrastructure Mocks:** `Testcontainers` for dynamic PostgreSQL, Redis, and Kafka instances during integration tests.
*   **Contract Testing:** Implement `Pact` for API contracts and Schema Registry integration for Kafka event validation.
*   **E2E Testing:** `Playwright` for cross-browser automated UI testing.
*   **Performance:** `k6` for developer-driven load testing as code.
*   **Security:** `SonarQube` (SAST), `Trivy` (SCA/Containers), `OWASP ZAP` (DAST).

## 15. Future Evolution
The strategy natively supports the migration roadmap:
1.  **Modular Monolith:** Contract testing acts as a guardrail preventing modules from tightly coupling their APIs and Events.
2.  **Distributed Modules:** Modules deploy independently; Contract Tests ensure they don't break each other without requiring a full integrated environment.
3.  **Selective Microservices:** The heavy reliance on Unit, Integration, and Contract tests over E2E tests makes extracting a module to a microservice a purely operational exercise with zero reduction in test confidence.

## 16. Final Recommendation
Adopt the **Shift-Left, Automation-First Testing Strategy** heavily indexing on the Test Pyramid and Consumer-Driven Contract Testing. Implement strict CI/CD Quality Gates immediately. This strategy is non-negotiable for a system of this scale and sensitivity, ensuring EduOS remains a highly resilient, secure, and maintainable platform for the next decade.
