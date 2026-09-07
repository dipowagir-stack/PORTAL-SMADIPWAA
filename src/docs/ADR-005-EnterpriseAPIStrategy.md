# ADR-005: Enterprise API & Integration Strategy

## 1. Executive Summary
This Architecture Decision Record (ADR) defines the Enterprise API & Integration Strategy for the Enterprise Education Operating System (EduOS). To support our Hybrid Modular Architecture (ADR-002) and strict Domain-Driven Design (DDD) boundaries, this strategy mandates a multi-protocol approach: **GraphQL** for frontend/mobile data fetching, **REST (OpenAPI)** for system-to-system and public integrations, **Kafka** for asynchronous inter-module eventing, and **gRPC** for future high-performance microservice-to-microservice communication. Kong will serve as the API Gateway. This strategy ensures loose coupling, enterprise-grade security (Zero Trust), and robust backward compatibility required for a 10+ year lifespan.

## 2. Context
The Enterprise Architecture v1 outlines a complex ecosystem of Business Modules, AI Platforms, Plugin SDKs, and Workflow Engines. Prior ADRs established a .NET 8 / React Modular Monolith backed by PostgreSQL and Kafka (ADR-001, ADR-002, ADR-003, ADR-004). As development begins, teams need strict rules on how modules communicate internally, how the frontend consumes data, and how EduOS integrates with external entities (e.g., legacy government systems, LMS vendors, and AI providers) without compromising domain isolation.

## 3. Problem Statement
Without a unified API and Integration strategy, large-scale systems devolve into a chaotic web of point-to-point connections. Inconsistent error handling, breaking API changes, lack of idempotency, and protocol fragmentation create an unmaintainable system. EduOS requires a standardized, API-first approach that dictates exactly how communication occurs across all boundaries, ensuring security, scalability, and seamless future migration to distributed microservices.

## 4. Architecture Principles
*   **API First & Event First:** All capabilities must be exposed via well-defined API contracts or published event schemas before implementation begins.
*   **Published Language:** APIs and Events act as the official Published Language (DDD) of a bounded context.
*   **Loose Coupling:** Modules must not share databases or internal states; integration is strictly via APIs or Events.
*   **Backward Compatibility:** APIs and Events are immutable contracts; breaking changes require explicit versioning.
*   **Security by Design:** Zero Trust architecture; all endpoints require authentication and authorization regardless of network position.
*   **Asynchronous First:** If a process does not require an immediate synchronous response, it must be event-driven.

## 5. API Strategy
We adopt a polyglot protocol strategy tailored to consumer needs:

*   **REST API (OpenAPI 3.0):** The default for Public, Partner, Administrative, and External integrations. Provides standard CRUD operations and webhooks.
*   **GraphQL:** The default for Presentation (Frontend/Mobile) queries. Eliminates over-fetching/under-fetching for complex educational data graphs (e.g., retrieving a student, their grades, and their teachers in one request).
*   **gRPC:** Reserved for high-performance, synchronous internal communication between distributed services (post-microservice extraction) and AI Service integration.
*   **WebSocket / Server-Sent Events (SSE):** Used for real-time notifications, chat, and live UI updates (e.g., workflow state changes).

**API Classification & Governance:**
*   **Public API:** Open to the internet, strictly rate-limited, requires API keys/OAuth. (Governed by Integration Architect)
*   **Internal API:** Used strictly within the EduOS boundary (e.g., Gateway to Monolith).
*   **Partner API:** Dedicated endpoints for certified vendors (e.g., EdTech partners).
*   **Administrative API:** High-privilege APIs for system configuration and tenant management.
*   **Plugin API:** Sandboxed APIs exposed locally to the Plugin SDK.
*   **AI API:** Abstraction layer over external LLMs and vector databases.
*   **Reporting API:** Read-optimized endpoints for BI tools.
*   **Workflow / Integration API:** Endpoints for webhooks, camunda workers, and legacy syncs.

## 6. Integration Strategy
*   **Event Bus (Kafka) & Message Broker:** The backbone for inter-module asynchronous communication. Uses Publish/Subscribe for Domain and Integration Events.
*   **Outbox/Inbox Pattern:** Mandatory for all modules publishing/consuming events to guarantee at-least-once delivery without distributed transactions.
*   **Saga Pattern:** Orchestrated by the Workflow Engine (Camunda) for distributed, long-running business processes requiring compensating transactions.
*   **Webhooks:** Used for real-time push notifications to External Systems and Plugins.
*   **Polling & File Exchange (SFTP):** Strictly isolated to the Integration Engine (Anti-Corruption Layer) for legacy government/banking systems that do not support modern APIs.
*   **Change Data Capture (CDC):** Used to stream data from operational databases to the Data Warehouse/Search Engine without impacting transactional performance.

**Resilience Patterns:**
*   **Retry & Circuit Breaker:** Implemented at the API Gateway and HTTP Client level (e.g., Polly in .NET) to prevent cascading failures.
*   **Long-Running Operations:** Return `202 Accepted` with a `Location` header pointing to a status endpoint.
*   **Async Processing:** Heavy computations (e.g., report generation) are queued and processed by background workers.

## 7. Communication Matrix

| Source ↔ Destination | Primary Mechanism | Rationale |
| :--- | :--- | :--- |
| **Presentation ↔ Backend** | GraphQL (Reads) / REST (Commands) | Optimizes UI rendering; commands map cleanly to DDD. |
| **Backend ↔ Domain** | In-Process (MediatR) | Synchronous execution within the same monolith process. |
| **Module ↔ Module** | Kafka (Integration Events) | Async, decoupled communication. (No direct DB access). |
| **Module ↔ AI** | REST / gRPC (via Semantic Kernel) | Standardized abstraction over Azure OpenAI/Local models. |
| **Module ↔ Workflow** | Kafka Events ↔ gRPC Commands | Event triggers workflow; workflow sends commands to modules. |
| **Module ↔ Plugin** | In-Memory (Sandbox) / gRPC | Secure, fast execution within the Plugin host. |
| **Module ↔ External System**| REST / Webhooks / File Exchange | Handled entirely by the Integration Engine / ACL. |
| **Module ↔ Search/Reporting**| CDC (Debezium) / Kafka | Keeps read-heavy ETL out of the operational request path. |

## 8. API Standards
*   **URI Design:** Resource-oriented, lowercase, kebab-case (e.g., `/api/v1/academic-terms`).
*   **HTTP Methods:** Strict adherence to standard semantics (GET, POST, PUT, PATCH, DELETE).
*   **Status Codes:** Standardized HTTP codes (200, 201, 202, 400, 401, 403, 404, 409, 429, 500).
*   **Error Format:** RFC 7807 Problem Details for HTTP APIs.
*   **Pagination:** Cursor-based pagination for high-performance lists; offset-based for simple UI grids.
*   **Filtering, Sorting, Search:** Standardized query parameters (e.g., `?sort=-createdAt&status=active`).
*   **Idempotency:** All POST/PATCH/PUT requests must support an `Idempotency-Key` header to safely retry network failures.
*   **Batch API:** Supported via specific `/batch` endpoints for high-volume data ingestion.
*   **Versioning:** URI versioning for REST (e.g., `/v1/`), schema evolution for GraphQL and Kafka (Avro/Protobuf). Deprecation requires a 6-month notice via `Deprecation` headers.
*   **Headers:** Standardized correlation IDs (`X-Correlation-ID`) across all requests for distributed tracing.

## 9. Security Strategy
*   **Authentication:** OAuth2 and OpenID Connect (OIDC) via Keycloak. Stateless JWTs used for all API authorization.
*   **Authorization:** Scopes and Claims validated at the API Gateway; Fine-Grained Authorization (ABAC/RBAC) evaluated by OpenFGA at the Application layer.
*   **API Gateway & Reverse Proxy:** Kong acts as the edge, handling SSL termination, CORS, and initial token validation.
*   **mTLS (Mutual TLS):** Enforced for all server-to-server and module-to-module (when distributed) network traffic.
*   **API Keys & HMAC:** Used exclusively for server-to-server Partner integrations where OAuth2 is infeasible.
*   **Rate Limiting & Throttling:** Enforced at the API Gateway by IP, Tenant, or API Key to prevent DDoS and noisy-neighbor issues.
*   **Replay Protection:** Enforced via short-lived JWTs and Idempotency keys.

## 10. SDK Strategy
*   **Frontend/Mobile SDK:** Auto-generated TypeScript clients via GraphQL Code Generator and OpenAPI Generator.
*   **Plugin SDK:** Provided as a strongly-typed .NET NuGet package or TypeScript npm package, abstracting the internal API complexity.
*   **External Developers:** Published OpenAPI specs and Postman collections via the Developer Portal.
*   **Internal Teams:** Shared Contracts (Nuget packages) containing Event Schemas (Avro/C# Records) and DTOs.

## 11. Migration Strategy
The strategy supports the migration from Modular Monolith to Microservices:
1.  **Internal APIs (Day 1):** Modules communicate via in-memory MediatR (Commands/Queries) and outbox-published Kafka events.
2.  **Domain APIs (Phase 2):** As modules grow, internal MediatR handlers are exposed as gRPC endpoints.
3.  **Gateway Routing (Phase 3):** When a module is extracted to a physical microservice, the API Gateway configuration is updated to route its specific endpoints to the new container. Consumers (Frontend/External) experience zero downtime or URL changes.
4.  **Enterprise Service Mesh (Future):** Istio or Linkerd implemented to manage distributed gRPC traffic, mTLS, and observability across dozens of microservices.

## 12. Decision Matrix

| Technology | Performance | Scalability | Maintainability | Interoperability | Developer Experience | Weighted Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Weight** | 9 | 10 | 10 | 8 | 9 | Max 460 |
| REST (OpenAPI) | 7 | 9 | 9 | 10 | 9 | 404 |
| GraphQL | 8 | 8 | 8 | 7 | 10 | 378 |
| gRPC | 10 | 10 | 8 | 6 | 6 | 372 |
| Kafka (Events) | 10 | 10 | 9 | 9 | 7 | 415 |

*Rationale:* A polyglot approach maximizes the strengths of each technology. REST is undefeated for interoperability; GraphQL for UI developer experience; Kafka for decoupled scalability; gRPC for raw backend performance.

## 13. Risk Analysis
*   **API Risks (Breaking Changes):** Tightly coupled consumers break on updates. *Mitigation:* Strict versioning, contract testing (Pact), and automated OpenAPI breaking-change detectors in CI/CD.
*   **Integration Risks (External Downtime):** External systems fail, blocking workflows. *Mitigation:* Circuit Breakers, Retry policies, and Saga compensations.
*   **Performance Risks (GraphQL N+1):** Complex GraphQL queries cause database spikes. *Mitigation:* DataLoader pattern mandatory for all resolvers.
*   **Security Risks:** Broken Object Level Authorization (BOLA). *Mitigation:* OpenFGA enforced on every single data-access request; zero-trust internally.
*   **Operational Complexity:** Managing multiple protocols. *Mitigation:* Centralized API Gateway (Kong) to unify monitoring, logging, and routing.

## 14. Consequences
*   **Positive:** Highly resilient, secure, and developer-friendly integration ecosystem. Clear separation of concerns enables safe, rapid scaling. External partners have a modern, standardized integration path.
*   **Negative:** High initial engineering overhead to establish GraphQL, Kong, Kafka, and the Outbox pattern infrastructure. Contract testing requires discipline.

## 15. Implementation Notes
*   Implement **Kong API Gateway** as the single external ingress point.
*   Use **HotChocolate** (.NET) for the GraphQL server.
*   Use **Swashbuckle/NSwag** to auto-generate OpenAPI 3.0 docs from C# controllers.
*   Establish a **Schema Registry** (Confluent) to manage Kafka event versioning and Avro/Protobuf schemas.
*   CI/CD pipelines must include **Contract Testing** to verify API compatibility before merging PRs.

## 16. Final Recommendation
Adopt the **Polyglot API & Integration Strategy** leveraging REST, GraphQL, gRPC, and Kafka, orchestrated behind a central API Gateway. Enforce rigorous API-first design, standardized error handling, idempotency, and asynchronous event-driven integration as the default communication mechanisms for the Enterprise Education Operating System.
