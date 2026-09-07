# ADR-006: Enterprise Development Standards & Coding Convention

## 1. Executive Summary
This Architecture Decision Record (ADR) establishes the definitive Enterprise Development Standards, Coding Conventions, and Software Engineering practices for the Education Operating System (EduOS). To ensure the 10+ year longevity of the platform, maintain consistency across distributed teams, and enforce the architectural constraints defined in previous ADRs, these standards mandate strict adherence to Clean Architecture, SOLID principles, and a Secure Software Development Lifecycle (SSDLC). By establishing rigorous quality gates, testing standards, and Git workflows, we ensure high maintainability, security, and developer productivity across the enterprise.

## 2. Context
EduOS is being built as a Modular Monolith (.NET 8, React, PostgreSQL, Kafka) designed for future extraction into microservices (ADR-001 through ADR-005). With multiple autonomous teams working concurrently in a Workspace-Based Monorepo, the absence of stringent, unified coding standards will result in technical debt, inconsistent implementations, architecture violations, and security vulnerabilities. 

## 3. Problem Statement
Without enforced engineering standards, a large-scale enterprise system rapidly deteriorates. Variations in naming conventions, error handling, layer responsibilities, and testing methodologies create friction for developers switching contexts. Furthermore, failure to standardize security practices and code quality thresholds leads to unstable releases and compliance breaches in a highly regulated educational environment.

## 4. Engineering Principles
*   **Clean Architecture & SOLID:** Strict separation of concerns. High cohesion, low coupling.
*   **Dependency Inversion:** High-level modules must not depend on low-level modules; both must depend on abstractions.
*   **Domain-Driven Design (DDD):** The business domain model is the heart of the software. Code must reflect the ubiquitous language.
*   **KISS & YAGNI:** Keep it simple, stupid. You aren't gonna need it. Avoid premature optimization and over-engineering.
*   **DRY (Don't Repeat Yourself):** Abstract shared logic into common libraries, but do not share business logic across bounded contexts.
*   **Fail Fast:** Validate inputs and system states immediately. Throw exceptions early rather than propagating invalid data.
*   **Security by Design:** Default to least privilege. Validate all inputs, encode all outputs.
*   **Immutability:** Favor immutable state (e.g., C# Records) for DTOs, Value Objects, and Events to prevent unintended side effects.

## 5. Coding Standards
*   **Error Handling & Exceptions:**
    *   Do not use exceptions for control flow. Use the `Result Pattern` (e.g., `Result<T>`) for expected domain failures (e.g., "StudentNotFound").
    *   Use Exceptions ONLY for truly exceptional, unforeseen system errors (e.g., `DatabaseConnectionException`).
*   **Logging:**
    *   Use structured logging (JSON format, Serilog) with explicit semantic properties (e.g., `Log.Information("Student {StudentId} enrolled in Course {CourseId}", studentId, courseId)`).
    *   Never log PII, passwords, or secrets.
*   **Validation:** Enforce validation at the Application layer using FluentValidation. Domain entities must self-validate upon instantiation.
*   **Configuration & Secrets:** 
    *   Use strongly-typed `IOptions<T>` configurations.
    *   Never commit secrets to source control. Use Environment Variables and HashiCorp Vault.
    *   Use Feature Flags for trunk-based development and progressive rollouts.
*   **Constants & Enumerations:** Avoid magic strings/numbers. Use strongly-typed Enums (or Smart Enums) and global constant classes.
*   **Concurrency & Async:** Always use `async/await` for I/O operations. Append `Async` to method names. Never use `.Result` or `.Wait()` (prevents deadlocks).
*   **Mapping:** Use explicit mapping (or restricted AutoMapper configurations) strictly between Domain Entities and DTOs to prevent accidental data exposure.
*   **AI & Plugins:** AI integrations must use the central AI Gateway abstractions. Plugins must strictly adhere to the sandboxed SDK interfaces without accessing core infrastructure directly.

**Code Quality Thresholds:**
*   **Cyclomatic Complexity:** Maximum of 10 per method.
*   **Method Length:** Maximum of 50 lines.
*   **Class Size:** Maximum of 400 lines (excluding DTOs/POCOs).
*   **Nesting Depth:** Maximum of 3 levels.
*   **Magic Numbers/Strings:** 0 allowed.

## 6. Naming Conventions
*   **Projects:** `EduOS.Module.[Name].[Layer]` (e.g., `EduOS.Module.Finance.Domain`).
*   **Classes & Interfaces:** PascalCase (Classes). Interfaces prefixed with `I` (e.g., `IInvoiceRepository`).
*   **Methods & Properties:** PascalCase.
*   **Local Variables & Parameters:** camelCase.
*   **Constants:** PascalCase.
*   **Private Fields:** camelCase, prefixed with `_` (e.g., `_studentRepository`).
*   **Events:** `[Entity][Action]edEvent` (e.g., `StudentEnrolledEvent`).
*   **Commands & Queries:** `[Action][Entity]Command` (e.g., `EnrollStudentCommand`), `Get[Entity]Query` (e.g., `GetStudentQuery`).
*   **DTOs:** Suffix with `Dto`, `Request`, or `Response` (e.g., `StudentResponse`).

## 7. Layer Responsibilities
*   **Presentation (API):** Routing, Authentication parsing, mapping HTTP requests to Commands/Queries. No business logic.
*   **Application (Use Cases):** Orchestration of business logic. Invokes Repositories and Domain Services. Dispatches Integration Events. Defines DTOs and Interfaces.
*   **Domain:** Entities, Value Objects, Aggregate Roots, Domain Events, Domain Services. Pure business logic. Ignorant of databases, HTTP, or external frameworks.
*   **Infrastructure:** Implementation of Repositories, external API clients, DB Contexts, and Kafka producers. (Depends on Application/Domain).

## 8. Testing Standards
*   **Unit Testing:** (xUnit). Fast, isolated tests for Domain and Application logic. Mock all external dependencies (Moq/NSubstitute).
*   **Integration Testing:** Tests Infrastructure implementations against real databases (via Testcontainers) and Kafka brokers.
*   **Contract Testing:** (Pact). Validates API and Event schemas between consumer and provider modules.
*   **Test Naming:** `[MethodName]_[StateUnderTest]_[ExpectedBehavior]` (e.g., `EnrollStudent_WhenCourseIsFull_ReturnsFailure`).
*   **Coverage Target:** Minimum 85% line coverage; 100% on Domain models.
*   **Mocking:** Only mock interfaces you own. Use Testcontainers for infrastructure, not in-memory DB mocks.
*   **Test Data:** Use Bogus/AutoFixture for randomized, realistic test data generation.

## 9. Security Standards
*   **Input Validation:** Strictly validate all incoming data via FluentValidation at the boundary.
*   **Output Encoding:** Automatically handled by React/Next.js, but explicitly required for any raw HTML generation (e.g., PDFs).
*   **Authentication & Authorization:** Enforce Zero Trust. All endpoints require a valid JWT. Validate Fine-Grained Authorization (OpenFGA) within the Application layer use cases.
*   **OWASP Compliance:** Code must adhere to OWASP Top 10 mitigation strategies.
*   **Dependency Updates:** Automated via Dependabot/Renovate. High-severity CVEs must be patched within 48 hours.

## 10. Documentation Standards
*   **Architecture & ADRs:** Maintained centrally in `docs/`. Required for any structural change.
*   **Inline Code:** Use XML/JSDoc comments exclusively for public APIs, complex algorithmic logic, or non-obvious business rules. Code should otherwise be self-documenting.
*   **API Documentation:** Auto-generated via Swagger/OpenAPI.
*   **READMEs:** Every module and application must have a standard README detailing its purpose, local setup, and key commands.

## 11. Git Standards
*   **Git Flow Strategy:** Trunk-Based Development with short-lived feature branches.
*   **Branch Naming:** `[type]/[ticket-id]-[short-description]` (e.g., `feat/EDU-123-student-enrollment`, `fix/EDU-456-invoice-calc`).
*   **Commit Messages:** Conventional Commits (e.g., `feat(academic): add student enrollment logic`).
*   **Semantic Versioning:** Automated via Conventional Commits.
*   **Releases:** Automated tagging from the `main` branch.

## 12. Code Review Standards
*   **Pull Requests (PRs):** Mandatory for all merges to `main`.
*   **Approvals:** Minimum of 2 approving reviews from Code Owners.
*   **Definition of Ready (DoR):** Ticket has clear acceptance criteria, UX designs (if applicable), and technical approach defined.
*   **Definition of Done (DoD):** Code is written, tested (Unit/Integration), passes all CI gates, documented, reviewed, and deployed to Staging.

## 13. Quality Gates
Mandatory automated CI/CD checks before a PR can be merged:
1.  **Linting & Formatting:** Code must pass Prettier/ESLint (Frontend) and `dotnet format`/StyleCop (Backend).
2.  **Compilation:** Must build without warnings.
3.  **Tests:** 100% of Unit and Integration tests must pass.
4.  **Code Coverage:** Must not drop below the 85% threshold.
5.  **Architecture Validation:** ArchUnitNET tests must pass (enforcing Clean Architecture dependency rules).
6.  **Security Scans:** SAST (SonarQube) and Dependency Scanning (Trivy) must report zero high/critical vulnerabilities.

## 14. Decision Matrix

| Standard Category | Developer Productivity | Maintainability | Security | Testability | Enterprise Suitability | Weighted Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Weight** | 9 | 10 | 10 | 9 | 10 | Max 480 |
| Clean Arch / SOLID | 8 | 10 | 9 | 10 | 10 | 452 |
| Result Pattern (Error Handling) | 9 | 10 | 8 | 9 | 10 | 442 |
| Trunk-Based Git Flow | 10 | 9 | 8 | 9 | 10 | 441 |
| Automated Quality Gates | 7 | 10 | 10 | 10 | 10 | 453 |

## 15. Risk Analysis
*   **Technical Debt Risks:** Developers bypass standards for speed.
    *   *Mitigation:* Automate enforcement completely via CI/CD Quality Gates and ArchUnit. If the build fails, it cannot be merged.
*   **Developer Experience Risks:** Strict rules frustrate developers or slow them down.
    *   *Mitigation:* Provide comprehensive CLI templates (e.g., `dotnet new`) and IDE linting integrations to catch issues *before* the commit.
*   **Knowledge Sharing Risks:** New hires struggle with the complex architecture.
    *   *Mitigation:* Maintain excellent, up-to-date documentation and "Example" modules showcasing the gold standard implementation.

## 16. Consequences
*   **Positive:** Highly uniform, predictable, and secure codebase. Drastically reduces onboarding time for new engineers. Refactoring is safe and deterministic. Microservice extraction is trivialized.
*   **Negative:** High initial learning curve. Slower initial feature delivery as teams adapt to the strict DDD and CQRS boilerplate requirements.

## 17. Implementation Notes
*   Configure `.editorconfig` at the root of the repository to standardize formatting across all IDEs.
*   Implement SonarQube in the GitLab CI/CD pipeline immediately.
*   Write an `EduOS.Architecture.Tests` project utilizing ArchUnitNET to programmatically enforce that `Domain` has no dependencies on `Infrastructure`.

## 18. Final Recommendation
Adopt and strictly enforce the Enterprise Development Standards and Coding Conventions detailed in this ADR. The automated Quality Gates must be established in the CI/CD pipeline immediately, prior to any feature development, to ensure architectural integrity and enterprise security from Day 1.
