# ADR-003: Repository Structure & Project Organization

## 1. Executive Summary
This Architecture Decision Record (ADR) establishes the Repository Structure and Project Organization for the Enterprise Education Operating System (EduOS). To support the Hybrid Modular Architecture (Modular Monolith) defined in ADR-002, we select a **Workspace-Based Monorepo** strategy utilizing modern build tools (e.g., Nx or Turborepo for frontend, .NET sln/workspaces for backend). This structure strictly enforces Clean Architecture and Domain-Driven Design (DDD) boundaries by isolating modules into distinct directories. It ensures a single source of truth, streamlines CI/CD, and facilitates a seamless future migration to distributed microservices without massive codebase restructuring.

## 2. Context
The Enterprise Architecture v1 and Solution Architecture (ADR-002) prescribe a Modular Monolith built with .NET 8, React, PostgreSQL, and Kafka (ADR-001). We now require a repository layout that enables multiple independent teams (e.g., Finance, Academic, Student) to collaborate efficiently without stepping on each other's toes, while rigidly enforcing module boundaries and preventing "Big Ball of Mud" dependency entanglement.

## 3. Problem Statement
Without a well-defined repository structure, enterprise codebases naturally degrade into tangled monoliths. Circular dependencies, shared mutable state, and blurred domain boundaries increase technical debt, making deployments risky and future extraction to microservices impossible. We must decide whether to split the codebase (Polyrepo) or unify it (Monorepo), and strictly define where every application, module, library, and configuration resides.

## 4. Repository Strategy
We evaluated the following repository strategies:
*   **Polyrepo (Multiple Repositories):** One repo per module/application.
    *   *Advantages:* Total isolation, independent versioning.
    *   *Disadvantages:* Dependency hell (version mismatches), difficult cross-domain refactoring, complex CI/CD orchestration.
*   **Plain Git Monorepo:** All code in one repo without advanced tooling.
    *   *Advantages:* Single source of truth, easy cross-domain commits.
    *   *Disadvantages:* Extremely slow builds, no boundary enforcement.
*   **Workspace-Based Monorepo (Nx / Turborepo / .NET Workspaces):** Unifies code while using advanced tooling for dependency graph visualization, boundary enforcement, and incremental builds.
    *   *Advantages:* Shared configurations, atomic commits, fast incremental builds (caching), strict architectural constraints.
    *   *Disadvantages:* Steeper learning curve for build tooling.

**Recommendation:** **Workspace-Based Monorepo** (using Nx for TS/JS and .NET Solutions/Workspaces for C#). This provides the operational simplicity of a Monorepo with the strict isolation of a Polyrepo.

## 5. Repository Layout
The repository will follow a feature-first, domain-centric directory structure:

```text
eduos-enterprise/
├── apps/                 # Deployable applications (Web, Mobile, API Gateway, Workers)
├── modules/              # Bounded contexts (Academic, Finance, Student, etc.)
│   ├── Academic/         # Each module contains its own Clean Architecture layers
│   └── Finance/
├── platform/             # Core platform services (AI Gateway, Integration Engine)
├── foundation/           # Low-level cross-cutting concerns (.NET setup, React setup)
├── shared/               # Shared kernel and enterprise-wide UI components
├── plugins/              # Plugin SDK host and bundled internal plugins
├── integrations/         # Anti-Corruption Layers and third-party vendor adapters
├── infrastructure/       # Terraform, Kubernetes manifests, Dockerfiles
├── configs/              # Global environment configurations and tenant settings
├── docs/                 # Architecture, ADRs, Runbooks, APIs
├── scripts/              # Migration scripts, dev environment setup, CI/CD utilities
├── deploy/               # Helm charts, ArgoCD manifests
├── tests/                # E2E tests, Contract tests spanning multiple modules
├── packages/             # Internal versioned libraries (SDKs, Design System)
├── examples/             # Code templates and developer onboarding examples
├── sdk/                  # Plugin SDK definitions and CLI tools
├── templates/            # Scaffolding templates (Plop, Yeoman, or .NET new)
├── tools/                # Custom internal developer tools
└── assets/               # Global static assets (logos, fonts, enterprise branding)
```
*Purpose & Ownership:* Teams own specific directories in `modules/` and `apps/`. Cross-functional platform teams own `platform/`, `infrastructure/`, and `foundation/`.

## 6. Project Organization
Applications (`apps/`) represent the *deployment* boundaries. They compose modules into runnable processes:
*   **AdminPortal (Web):** SPA for administrators, staff, and teachers.
*   **StudentPortal (Web):** SPA tailored to student experience.
*   **ParentPortal (Web):** SPA for guardians.
*   **MobileApp (React Native):** Cross-platform app for students and parents.
*   **ApiGateway (Kong/Ocelot):** Central entry point routing traffic to internal modules.
*   **MonolithHost (API):** The single ASP.NET Core process hosting all business modules for Day 1.
*   **WorkerServices (Background):** Hosts Hangfire/Quartz jobs (e.g., nightly attendance syncs).
*   **AiServices:** Dedicated process for interacting with semantic kernels and embeddings.
*   **WorkflowService:** Camunda Zeebe client workers.
*   **ReportingService:** Dedicated read-heavy process for generating PDFs and dashboards.

## 7. Module Organization
Modules (`modules/`) represent the *business* boundaries. Each module is fully encapsulated:
*   `Academic`, `Student`, `Teacher`, `Assessment`, `Attendance`, `Finance`, `Library`, `Inventory`, `Health`, `Counseling`, `Communication`, `Identity`, `Organization`, `Workflow`, `Notification`, `Reporting`, `Analytics`, `AI`, `Plugin`, `Search`.

**Internal Module Structure (Clean Architecture):**
```text
modules/Finance/
├── Presentation/    # Controllers, GraphQL Resolvers, SignalR Hubs
├── Application/     # Use Cases, Command/Query Handlers, DTOs
├── Domain/          # Entities, Value Objects, Domain Events (Zero dependencies)
└── Infrastructure/  # EF Core DbContext, Repositories, External API clients
```
*Independence:* Modules MUST NOT reference another module's `Infrastructure` or `Presentation` layers. 

## 8. Library Organization
Shared code resides in `packages/` or `shared/` to prevent monolith entanglement:
*   **Core:** Enterprise primitives (e.g., `Result<T>`, `Entity<T>`).
*   **Common:** Helper extensions (DateTime, Strings).
*   **Utilities:** Generic cross-domain logic.
*   **Contracts:** Interfaces defining Integration Events (Kafka schemas).
*   **Shared Kernel:** Base entities and value objects (e.g., `TenantId`, `Money`). Must be kept extremely small.
*   **Domain Contracts:** Interfaces for module-to-module synchronous communication.
*   **Infrastructure Libraries:** Reusable setup for Kafka, PostgreSQL, Redis.
*   **SDK:** Internal SDK for building plugins.
*   **Client Libraries:** Generated API clients for external usage.
*   **Validation:** Enterprise validation rules (FluentValidation).
*   **Security:** AuthZ policies, OpenFGA clients.

*Ownership:* Platform/Foundation teams own these libraries. Business teams consume them.

## 9. Dependency Rules
Strict rules enforced via CI/CD static analysis (e.g., ArchUnitNET, Nx boundaries):
1.  **Application → Domain:** Application layer depends on Domain.
2.  **Infrastructure → Application & Domain:** Infrastructure implements Application interfaces.
3.  **Presentation → Application:** API controllers only invoke Application use cases (MediatR).
4.  **No Cross-Module Infrastructure Access:** Module A cannot inject Module B's `DbContext` or Repository.
5.  **No Cross-Domain Database Access:** Queries cannot `JOIN` tables across schemas (e.g., `finance.invoices` cannot join `student.profiles`).
6.  **No Cyclic Dependencies:** A → B and B → A is strictly forbidden.
7.  **No Shared Mutable State:** Caches and singletons must be isolated per tenant and module.

## 10. Naming Conventions
*   **Projects:** `EduOS.Module.[ModuleName].[Layer]` (e.g., `EduOS.Module.Finance.Domain`).
*   **Modules:** PascalCase (e.g., `Academic`, `Finance`).
*   **Packages:** `@eduos/[package-name]` (for TS) or `EduOS.[PackageName]` (for C#).
*   **Namespaces:** Match the folder structure exactly.
*   **Folders:** PascalCase for C# (e.g., `UseCases`), kebab-case for TS (e.g., `user-profile`).
*   **Files:** Match class names.
*   **Events:** `[Entity][Action]edEvent` (e.g., `StudentEnrolledEvent`).
*   **Commands:** `[Action][Entity]Command` (e.g., `EnrollStudentCommand`).
*   **Queries:** `Get[Entity]Query` (e.g., `GetStudentDetailsQuery`).
*   **DTOs:** `[Entity]Dto` or `[Entity]Response`.
*   **Entities:** Noun, PascalCase (e.g., `Student`).
*   **Repositories:** `I[Entity]Repository` (e.g., `IStudentRepository`).
*   **Services:** `I[Business]Service` (Avoid generic `Service` suffixes where a specific capability like `Calculator` or `Generator` fits).
*   **Interfaces:** Prefixed with `I` in C#.
*   **Configuration:** `[Feature]Options` (e.g., `JwtOptions`).
*   **Tests:** `[ClassUnderTest]Tests`.

## 11. Documentation Strategy
Stored centrally in the `docs/` directory using Markdown and Docusaurus/Backstage:
*   **Architecture:** C4 models, Enterprise Architecture diagrams.
*   **ADRs:** Sequential, immutable records (e.g., `ADR-003-RepositoryStructure.md`).
*   **API:** Swagger/OpenAPI generated files.
*   **Domain:** Ubiquitous language glossaries per module.
*   **Deployment:** Infrastructure diagrams, Helm values documentation.
*   **Operations:** Runbooks for on-call engineers.
*   **Developer Guides:** Onboarding, setup, troubleshooting.
*   **Coding Standards:** Linting rules, PR templates.
*   **Plugin Guides:** SDK documentation for third-party developers.
*   **AI Documentation:** Prompt engineering guidelines, embedding model specs.

## 12. Configuration Strategy
Configurations (`configs/`) are externalized following the 12-Factor App methodology:
*   **Environment Variables:** Runtime bindings, strictly documented in `.env.example`.
*   **Application Config:** `appsettings.json` for non-sensitive defaults.
*   **Secrets:** Managed via HashiCorp Vault. NEVER committed to source control.
*   **Feature Flags:** Managed via LaunchDarkly or internal flag service for trunk-based development.
*   **Tenant Configurations:** Stored in the database, cached in Redis (e.g., school-specific grading scales).
*   **Plugin / AI Configurations:** Sandboxed JSON files or Database-backed options.
*   **Deployment Configurations:** Kustomize overlays or Helm `values.yaml` for Dev, Staging, Prod.

## 13. Testing Organization
*   **Unit Tests:** Reside alongside the code they test (e.g., inside `modules/Finance/Domain.Tests`). Fast, zero I/O.
*   **Integration Tests:** Inside `modules/Finance/Infrastructure.Tests`. Verifies DB/Kafka bindings using Testcontainers.
*   **Contract Tests:** Inside `tests/Contracts/`. PACT tests ensuring Module A's events match Module B's expectations.
*   **Performance Tests:** Inside `tests/Performance/` (k6 or JMeter scripts).
*   **Security Tests:** Automated SAST/DAST scanning pipelines.
*   **End-to-End Tests:** Inside `tests/E2E/` (Playwright). Tests the full `apps/` UI against deployed backend.
*   **Test Data / Fixtures:** Centralized Bogus/AutoFixture factories in `tests/Shared/`.

## 14. Build Strategy
*   **Build Tools:** .NET SDK (`dotnet build`), Vite/Webpack.
*   **Package Managers:** NuGet (C#), pnpm (TypeScript).
*   **Workspace Strategy:** Nx for TS monorepo management; .NET Solution (`.sln`) with Solution Folders mapping to the directory structure.
*   **Incremental Build:** Nx caching and MSBuild caching to skip unchanged modules.
*   **Versioning:** Semantic Versioning (SemVer) driven by Conventional Commits.
*   **Release Management:** Automated via GitLab CI/CD tagging.
*   **Artifact Organization:** Docker images pushed to private container registry; internal NuGet/npm packages pushed to GitHub Packages / GitLab Registry.

## 15. Migration Strategy
The repository layout guarantees a seamless path to Microservices:
1.  **Modular Monolith:** All `modules/` are referenced by a single `apps/MonolithHost`.
2.  **Distributed Modular System:** Spin up multiple `apps/Host` instances with different modules enabled via feature flags/DI configuration.
3.  **Selective Microservices:** Move `modules/Finance` into a dedicated `apps/FinanceService` without rewriting internal module code.
4.  **Enterprise Microservices:** Each `modules/*` gets its own `apps/*` host, deployed independently. Repository structure remains unchanged.

## 16. Decision Matrix

| Strategy | Maintainability | Productivity | Scalability | Operational Simplicity | Learning Curve | Enterprise Suitability | Weighted Score (Max 60) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Weight** | 10 | 10 | 10 | 8 | 7 (Lower=Better) | 10 | |
| Polyrepo | 7 | 6 | 9 | 4 | 5 | 7 | 38 |
| Plain Monorepo | 4 | 8 | 3 | 9 | 9 | 5 | 38 |
| **Workspace Monorepo** | **10** | **9** | **9** | **8** | **6** | **10** | **52** |

## 17. Risk Analysis

| Risk | Mitigation |
| :--- | :--- |
| **Merge Conflicts:** Heavy traffic in a single repo. | Require strict Code Owners per module. Use trunk-based development with frequent small PRs. |
| **Build Times:** Monorepo becomes too slow. | Implement aggressive remote caching (Nx Cloud / build caches). Only build/test affected projects. |
| **Dependency Bleed:** Teams import illegal layers. | Enforce CI/CD boundary checks (ArchUnit). PR fails if boundaries are breached. |
| **Scaling Risks:** Git clone becomes too massive. | Use Git sparse-checkout and shallow clones in CI. |
| **Developer Experience:** IDEs struggle to load everything. | Create module-specific `.sln` files or workspace files so developers only load the context they are working on. |

## 18. Consequences
*   **Positive:** Unifies the enterprise. Single PRs can safely span multiple modules with atomic commits. Code sharing is trivial. Refactoring is safe because all consumers are updated simultaneously.
*   **Negative:** Requires dedicated "Platform Engineering" to maintain the CI/CD pipeline and build tools.

## 19. Implementation Notes
*   Initialize the repository using `pnpm workspace` and Nx.
*   Set up a root `EduOS.sln` and module-specific `EduOS.[Module].sln` files.
*   Configure `.editorconfig`, `eslint`, and `StyleCop` at the root to enforce the Naming Conventions globally on Day 1.
*   Implement Git hooks (Husky) to enforce Conventional Commits.

## 20. Final Recommendation
Adopt the **Workspace-Based Monorepo** strategy. Implement the defined directory layout immediately. Establish automated architectural tests in the CI pipeline before the first business module is coded to ensure strict adherence to Clean Architecture dependency rules.
