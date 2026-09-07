# ADR-002: Solution Architecture Strategy

## 1. Executive Summary
This Architecture Decision Record (ADR) defines the Solution Architecture Strategy for the implementation of the Enterprise Education Operating System (EduOS). The selected approach is a **Hybrid Modular Architecture**, which deploys as a **Modular Monolith** while internally enforcing **Clean Architecture** and **CQRS (Command Query Responsibility Segregation)** within each bounded context. Inter-module communication will be strictly governed by an **Event-Driven Architecture (EDA)**. 

This strategy prevents the "Big Ball of Mud" anti-pattern, drastically reduces initial operational complexity compared to day-one microservices, and guarantees a seamless, risk-free migration path to microservices when organizational scale or independent performance demands require it.

## 2. Context
The Enterprise Architecture v1 has been finalized, detailing a comprehensive ecosystem of Business Modules, Platform Services, a Plugin SDK, an AI Platform, and complex workflows. ADR-001 established the technology stack (.NET 8, React, PostgreSQL, Kafka). Implementation is ready to begin. The development teams require strict structural guidelines on how to organize code, how modules interact, and how dependencies flow to ensure long-term maintainability (10+ years) across a multi-tenant, multi-campus environment.

## 3. Problem Statement
The core challenge is selecting an implementation architecture that:
*   Supports rapid initial development without the staggering DevOps overhead of managing 50+ microservices on Day 1.
*   Enforces strict Domain-Driven Design (DDD) boundaries so that modules (e.g., Finance, Academic, Student) do not become tightly coupled.
*   Natively supports the integration of AI, Workflow Engines, and third-party Plugins.
*   Allows independent module evolution and an eventual, painless extraction into a distributed microservices architecture as the platform scales globally.

## 4. Candidate Architectures
1.  **Layered Architecture:** Traditional UI -> BLL -> DAL. *Rejected* (Prone to database-driven design and high coupling).
2.  **Clean / Hexagonal / Onion Architecture:** Focuses on separating the domain from infrastructure via dependency inversion. *Considered (as an internal module pattern).*
3.  **Modular Monolith:** A single deployment unit with strictly isolated internal modules (bounded contexts). *Considered.*
4.  **Microservices:** Independently deployable services per bounded context. *Rejected for Day 1* (Too high operational overhead for initial rollout).
5.  **Service-Oriented Architecture (SOA):** Enterprise service bus model. *Rejected* (Outdated, prone to monolithic integration layers).
6.  **Event-Driven Architecture (EDA):** State changes communicated via events. *Considered (as a communication strategy).*
7.  **Hybrid Modular Architecture:** Combines Modular Monolith deployment, Clean Architecture internals, and EDA inter-module communication. *Proposed.*
8.  **Microkernel (Plugin Architecture):** Core system with extensible plugins. *Considered (specifically for the Plugin SDK).*
9.  **CQRS & Event Sourcing:** Separating read and write models. *Considered (CQRS for core modules, Event Sourcing for Finance/Audit).*

## 5. Evaluation Matrix

| Architecture Style | Enterprise Readiness | Maintainability | Complexity | Scalability | Performance | Future Readiness | Weighted Score (Max 70) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Weight** | 10 | 10 | 10 (Lower = Better) | 10 | 10 | 10 | 60 (excluding developer productivity) |
| Layered | 6 | 4 | 8 | 5 | 7 | 3 | 33 |
| Pure Microservices | 10 | 7 | 2 | 10 | 8 | 10 | 47 |
| Modular Monolith | 9 | 8 | 7 | 8 | 9 | 9 | 50 |
| **Hybrid Modular (Selected)** | **10** | **10** | **6** | **9** | **9** | **10** | **54** |

*Rationale:* Hybrid Modular provides the best balance. It offers the strict boundary enforcement of Microservices without the immediate network latency, distributed transaction nightmares, and DevOps taxation. 

## 6. Final Decision
The EduOS will be implemented using a **Hybrid Modular Architecture**. 
*   **Deployment:** Modular Monolith.
*   **Internal Structure:** Clean Architecture.
*   **Data Access:** CQRS (Command Query Responsibility Segregation).
*   **Inter-Module Communication:** Event-Driven Architecture (EDA) via an in-memory event bus (migrating to Kafka for microservices).
*   **Extensibility:** Microkernel Architecture for the Plugin SDK.

## 7. Architecture Overview (Required Decisions)

1.  **Overall Solution Architecture:** Hybrid Modular Monolith.
2.  **Internal Module Architecture:** Clean Architecture (Domain at the center, Infrastructure at the edges).
3.  **Communication Between Modules:** Strictly via Integration Events (Asynchronous) or specialized internal API contracts (Synchronous, but highly restricted). No direct database sharing.
4.  **Communication With External Systems:** Via the Integration Engine (Anti-Corruption Layers/Adapters) to protect internal domains.
5.  **Domain Isolation Strategy:** Each module resides in its own distinct codebase namespace/project and has its own dedicated database schema.
6.  **Shared Kernel Strategy:** Limited strictly to enterprise-wide primitives (e.g., `TenantId`, `Money` value object, base Event interfaces). Business logic is NEVER placed in the Shared Kernel.
7.  **Event Communication Strategy:** Modules publish Domain Events internally to trigger side-effects, and Integration Events externally (to the Event Bus) for other modules.
8.  **Transaction Strategy:** Transactions do not span modules. Eventual consistency is embraced across module boundaries using the Outbox Pattern to guarantee event delivery.
9.  **Dependency Direction:** Inward toward the Domain Layer. The Domain depends on nothing. Infrastructure depends on Application. Application depends on Domain.
10. **Dependency Rules:** Modules may NOT reference other modules' Infrastructure or Data layers.
11. **Shared Components Strategy:** UI components and foundational libraries are versioned and distributed via internal package managers to prevent monolith coupling.
12. **Common Services Strategy:** Cross-cutting concerns (Auth, Logging, AI Gateway) are injected via interfaces at the Infrastructure layer.
13. **Plugin Integration Strategy:** Executed via isolated Sandboxes (WebAssembly/AppDomains) using a strict Microkernel interface.
14. **AI Integration Strategy:** AI is treated as a Platform Service. Modules request AI capabilities via the AI Gateway interface; modules do not directly invoke LLM APIs.
15. **Workflow Integration Strategy:** Modules emit events that the central Workflow Engine listens to, advancing BPMN state machines, which in turn issue Commands back to modules.
16. **Rule Engine Integration Strategy:** Complex policies (e.g., grading logic) are externalized to the Rule Engine, queried by the Domain layer during Command execution.
17. **Reporting Strategy:** Read-models are constructed specifically for UI/Reporting via CQRS, flattening normalized domain data into performant views.
18. **Search Strategy:** All domain entities emit state-change events. A central Search Indexer consumes these to update Elasticsearch, keeping search out of the core transactional DB.
19. **File Storage Strategy:** All files route through the Document Module to abstract S3/Blob storage, returning only `DocumentId`s to other domains.
20. **Migration Path toward Microservices:** Outlined in Section 11.

## 8. Layer Responsibilities
Within each bounded context (module), the Clean Architecture layer structure is enforced:

*   **Presentation Layer (API / UI):** Responsible for HTTP routing, GraphQL resolvers, and WebSockets. Translates external requests into Commands/Queries.
    *   *↓ depends on ↓*
*   **Application Layer (Use Cases):** Orchestrates business use cases. Contains Command/Query Handlers, orchestrates fetching entities from repositories, and executes logic. Contains NO business rules.
    *   *↓ depends on ↓*
*   **Domain Layer (Core):** The heart of the software. Contains Entities, Value Objects, Aggregate Roots, and Domain Events. Completely framework-agnostic.
*   **Infrastructure Layer (Adapters):** Implements the interfaces defined in the Application/Domain layers. Contains EF Core DB Contexts, API clients, and Kafka producers. (Depends on Application/Domain).
*   **Platform Services (Cross-Cutting):** Centralized identity, AI Gateway, Audit Engine. Consumed by Infrastructure.
*   **Foundation:** The underlying technology SDKs (.NET 8, React).

## 9. Module Organization
Modules are strictly segregated by business capability and aligned with the Domain Relationship Map:
*   **Core Modules:** `Academic`, `Student`, `Finance`, `Curriculum`. These are heavily protected by Anti-Corruption Layers.
*   **Supporting Modules:** `Library`, `Inventory`, `Facility`, `Health`, `Counseling`.
*   **Generic Modules:** `Communication`, `Document`, `Identity`, `Organization`.
*   **Platform Modules:** `AI Platform`, `Plugin SDK`, `Workflow Engine`, `Reporting`.

**Boundary Enforcement:** A developer working in the `Finance` module cannot compile their code if they attempt to import an Entity directly from the `Student` module. They must rely on `StudentId` (a Value Object) and query a localized read-model.

## 10. Communication Strategy
*   **Commands:** Used to mutate state. Dispatched from Presentation to Application layer. Exactly one handler per Command. Synchronous (returns success/failure).
*   **Queries:** Used to read state. Dispatched to Application layer. Bypasses the Domain layer to directly query the database (via Dapper/raw SQL) for performance.
*   **Domain Events:** Published by an Aggregate Root when its internal state changes. Consumed synchronously *within the same module and same database transaction* to trigger local side effects.
*   **Integration Events:** Published by the Application layer (usually via the Outbox Pattern) to the Enterprise Event Bus (Kafka). Consumed asynchronously by *other* modules.
*   **Direct Calls (Anti-Corruption Layer):** Only permitted when absolute real-time validation is required (e.g., `Finance` asking `Student` if a student is actively enrolled before billing). Handled via strictly versioned internal interfaces, not direct DB reads.

## 11. Migration Strategy (To Microservices)
The architecture supports a zero-rewrite transition to microservices based on specific triggers:

1.  **Phase 1: Modular Monolith (Day 1).** All modules run in one OS process. Communication is via in-memory MediatR. Databases are isolated by schema in one PostgreSQL instance.
2.  **Phase 2: Modular Distributed.** Databases are split into separate physical PostgreSQL instances to distribute I/O load. Code remains one monolithic deployment.
3.  **Phase 3: Selective Microservices.** A specific module (e.g., `Finance` or `Reporting`) requires independent scaling or has a dedicated dev team. Its namespace is extracted into a standalone container. In-memory events are swapped to Kafka.
4.  **Phase 4: Enterprise Microservices.** If required by global scale, all bounded contexts become independent services.

**Migration Indicators:** Extract a module ONLY when: 
a) Team size exceeds 12 developers. 
b) Module deployment lifecycle differs wildly from the core. 
c) Hardware scaling requirements diverge (e.g., AI module needs GPUs, Finance needs high CPU).

## 12. Risk Analysis

| Risk | Description | Mitigation Strategy |
| :--- | :--- | :--- |
| **Architecture** | Developers bypass boundaries and couple modules (Big Ball of Mud). | Implement strict static code analysis (e.g., ArchUnitNET) in CI/CD to break the build if layer rules are violated. |
| **Operational** | Eventual consistency confuses users (e.g., UI doesn't reflect update immediately). | Implement SignalR/WebSockets to push real-time event confirmations to the frontend. |
| **Performance** | CQRS synchronization lag between write and read databases. | Use in-memory identical transaction updates for read-models, falling back to background workers for complex projections. |
| **Migration** | Distributed transactions fail when migrating to microservices. | Ban two-phase commits (2PC) from Day 1. Mandate the Saga Pattern and Compensating Transactions for cross-module workflows. |
| **Security** | Internal APIs are exploited if the monolith is breached. | Enforce Zero Trust internally; every internal module-to-module request must pass the Authorization Policy Engine. |

## 13. Consequences
*   **Positive:** Massive reduction in DevOps and infrastructure costs during the first 3 years. High developer productivity as everything runs locally in one IDE solution. Perfect domain isolation guarantees future scalability.
*   **Negative:** Requires high architectural discipline. Junior developers may struggle with the boilerplate required by CQRS, Clean Architecture, and Eventual Consistency.

## 14. Implementation Notes
*   **Folder Structure:** The root repository MUST be organized by Module first, then by Layer (e.g., `/src/Modules/Academic/Core`, `/src/Modules/Academic/Infrastructure`).
*   **Database:** A single PostgreSQL cluster will be used, but each module gets its own strict Schema (e.g., `academic.courses`, `finance.invoices`). Foreign keys across schemas are strictly prohibited.
*   **Outbox Pattern:** Essential for the Event-Driven Architecture. Changes to the database and the publishing of an Integration Event must be saved in the same ACID transaction to a local `Outbox` table. A background worker reads this table and guarantees at-least-once delivery to Kafka.

## 15. Future Evolution
As the EduOS evolves, the AI Platform and Workflow Engines will likely be extracted into microservices first, given their unique compute and state requirements. The Plugin SDK will evolve toward WebAssembly (WASM) execution on the Edge (CDNs) to push extensibility closer to the end-user.

## 16. Final Recommendation
The **Hybrid Modular Architecture** (Modular Monolith with Clean Architecture and CQRS internals) is officially approved. It provides the only pragmatic path to balancing initial time-to-market and operational simplicity with the strict DDD and boundary enforcement required to build a 10-year, enterprise-grade, cloud-native Education Operating System. Teams must strictly adhere to the defined dependency rules and event-driven communication protocols.
