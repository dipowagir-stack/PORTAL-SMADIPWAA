# ADR-004: Enterprise Database Strategy

## 1. Executive Summary
This Architecture Decision Record (ADR) defines the Enterprise Database Strategy for the Enterprise Education Operating System (EduOS). Building upon the Modular Monolith structure (ADR-002) and PostgreSQL selection (ADR-001), this strategy enforces **Logical Database per Domain (Schema Isolation)**. Each bounded context will strictly own its data within a dedicated database schema. Cross-domain data access is explicitly forbidden via database queries; all inter-domain communication must utilize APIs or Event-Driven Architecture (EDA) via the **Outbox Pattern**. This approach ensures maximum data integrity and prevents the "Big Ball of Mud" anti-pattern, perfectly positioning EduOS for a seamless future migration to distributed microservices.

## 2. Context
Enterprise Architecture v1, along with ADRs 001, 002, and 003, establish a Modular Monolith built with .NET 8, PostgreSQL, and Kafka. The repository is organized by domain. To maintain true domain independence within a monolith, the data layer must reflect the application's boundaries. The database strategy must dictate how domains store, access, share, and protect data while supporting advanced capabilities like AI vector search, CQRS, multi-tenancy, and distributed workflows.

## 3. Problem Statement
In traditional monoliths, domains frequently share database tables or execute cross-domain SQL `JOIN`s. This tight data coupling prevents independent domain evolution, complicates caching, creates massive bottlenecks, and makes extracting a domain into a microservice practically impossible. EduOS requires a data architecture that provides the performance and operational simplicity of a single database cluster on Day 1, but with the strict isolation guarantees of a microservices architecture.

## 4. Architecture Principles
*   **Database per Domain (Logical):** Domains control their own data schemas exclusively.
*   **Single Source of Truth:** Data is owned by one and only one domain.
*   **Event-Driven Integration:** State changes are broadcasted via immutable events, not shared tables.
*   **No Cross-Domain Database Access:** `JOIN`s across domain schemas are strictly prohibited.
*   **Reference by Identifier:** Domains reference external entities via unique IDs (e.g., `StudentId`), never by foreign key constraints.
*   **Zero Trust Data Security:** Encryption and Row-Level Security (RLS) applied by default.

## 5. Database Strategy
We will employ a **Hybrid Database Strategy (Logical Database per Domain)**. 

**Storage Technologies Mapping:**
*   **Relational Database (PostgreSQL):** Core transactional data (Finance, Academic, Student).
*   **Vector Database (pgvector):** AI embeddings, semantic search vectors.
*   **Key-Value Store (Redis):** Caching, rate limiting, session management, temporary workflow states.
*   **Document Database (PostgreSQL JSONB):** Dynamic configurations, Plugin SDK unstructured storage, unstructured forms.
*   **Search Engine (Elasticsearch):** Enterprise-wide full-text search and catalog indexing.
*   **Object Storage (MinIO/S3):** Documents, media, assets.

## 6. Domain Ownership Matrix
Every data entity is owned by exactly one domain. Other domains must maintain their own read-models if they require this data.

| Domain | Core Entities Owned |
| :--- | :--- |
| **Identity** | Users, Credentials, Roles, Tenant Profiles, MFA Tokens |
| **Organization** | Campuses, Departments, Facilities, Terms, Academic Years |
| **Student** | Student Profiles, Enrollment Status, Guardian Links, Demographics |
| **Teacher** | Teacher Profiles, Certifications, Availability, Contracts |
| **Academic** | Courses, Classes, Curriculum, Syllabi, Assignments |
| **Assessment** | Grades, Rubrics, Exams, Transcripts, Standardized Scores |
| **Attendance** | Attendance Records, Leave Requests, Tardiness Logs |
| **Finance** | Invoices, Payments, Ledgers, Budgets, Payroll Summaries |
| **Library** | Books, Digital Assets, Checkouts, Holds |
| **Inventory** | Assets, Devices, Vendors, Purchase Orders |
| **Health** | Medical Records, Incident Reports, Immunizations |
| **Counseling** | Therapy Logs, Intervention Plans, Disciplinary Records |
| **Communication** | Messages, Email Logs, SMS Logs, Announcements |
| **Workflow** | State Machine Instances, User Tasks, Approvals |
| **Notification** | Notification Preferences, Push Tokens, Delivery Status |
| **AI** | Embeddings, Prompts, Conversation History, RAG Indices |
| **Plugin** | Plugin Manifests, Sandboxed Plugin Data (JSONB) |
| **Reporting** | Materialized Views, Dashboard Configurations, Generated Reports |
| **Analytics** | Telemetry, Adoption Metrics, Aggregated Data |
| **Search** | Search Indices, Synonyms, Search History |
| **Document** | Document Metadata, Blob References, e-Signatures |

## 7. Data Isolation Strategy
*   **Schema Isolation:** A single physical PostgreSQL cluster will be used initially. Each domain gets a dedicated logical schema (e.g., `academic.courses`, `finance.invoices`).
*   **Constraint Isolation:** No foreign keys are allowed to cross schemas.
*   **Access Isolation:** Database users/roles are configured so the `Finance` application module only has database credentials to read/write the `finance` schema.

## 8. Transaction Strategy
*   **ACID:** Guaranteed strictly *within* a single domain's schema.
*   **Distributed Transactions (2PC):** Strictly forbidden.
*   **Outbox Pattern:** Used to publish Domain/Integration Events. Database updates and the creation of an event record in an `outbox` table occur within a single ACID transaction. A background relay pushes these to Kafka.
*   **Inbox Pattern:** Used to consume Integration Events idempotently. 
*   **Sagas & Compensation:** Multi-domain business processes (e.g., Student Registration spanning Student, Academic, and Finance) are orchestrated via the Workflow Engine using the Saga pattern with compensating actions for failures.

## 9. Multi-Tenant Strategy
*   **Primary Strategy: Shared Database, Shared Schema (Discriminator Column).** Every table contains a `TenantId`. PostgreSQL Row-Level Security (RLS) enforces tenant isolation at the database engine level, preventing accidental cross-tenant data leaks.
*   **Future Migration / Premium Tier:** Highly regulated tenants (e.g., specific government school districts) can be upgraded to **Separate Database** isolation transparently via connection string routing in the Application layer, without altering the domain logic.

## 10. AI Data Strategy
*   **Vector Store:** `pgvector` resides within the **AI Domain** schema.
*   **Knowledge Base / RAG:** When documents are uploaded, the Document domain emits an event. The AI domain consumes this, chunks the text, calls the Embedding Model, and stores the vectors.
*   **Conversation Storage:** Chat histories and prompt contexts are stored as JSONB for rapid retrieval and context window reconstruction.

## 11. Search Strategy
*   **Search Index Synchronization:** The core databases are optimized for writes (OLTP). The **Search Domain** consumes Integration Events (via Kafka / CDC) from all other domains to update Elasticsearch (OLAP/Search). 
*   **Hybrid Search:** Elasticsearch handles lexical (BM25) queries, while pgvector handles semantic similarity.

## 12. Reporting Strategy
*   **Operational Reporting:** Utilizes CQRS. Dedicated Read Models are updated via Domain Events to provide flattened, highly performant views for UI dashboards. Read replicas can be used to offload query load.
*   **Analytical Reporting (Data Warehouse):** Change Data Capture (CDC) via Debezium extracts data from PostgreSQL transaction logs, streaming it into a central Data Warehouse/Data Lake for BI tools, entirely isolating analytics from operational workloads.

## 13. Backup & Recovery Strategy
*   **Point-in-Time Recovery (PITR):** Continuous Write-Ahead Log (WAL) archiving (e.g., via Barman or pgBackRest) allowing restoration to any exact second in the last 30 days.
*   **Incremental Backups:** Daily incremental and weekly full backups.
*   **Disaster Recovery:** Geo-replication to a secondary cloud region with automated failover mechanisms. 

## 14. Security Strategy
*   **Encryption at Rest:** Transparent Data Encryption (TDE) at the volume level.
*   **Encryption in Transit:** Strict TLS 1.3 enforcement for all database connections.
*   **Field-Level Encryption:** Highly sensitive PII (e.g., SSN, health records) are encrypted at the application level before being written to the database.
*   **Audit Strategy:** Temporal tables (system-versioned tables) for critical financial and academic entities to maintain a strict, immutable history of all row changes. Soft deletes used universally (no physical `DELETE` statements).

## 15. Migration Strategy (Toward Microservices)
1.  **Logical Domain Separation (Day 1):** Shared PostgreSQL, distinct schemas (`academic`, `finance`). Outbox tables in each schema.
2.  **Database Separation (Phase 2):** When a domain (e.g., Finance) is extracted to a microservice, its schema is physically migrated (via `pg_dump`/`pg_restore`) to a dedicated PostgreSQL instance. Connection strings are updated. Zero application code changes required due to prior adherence to strict isolation rules.

## 16. Decision Matrix

| Strategy | Consistency | Scalability | Operational Complexity | Migration Readiness | Security | Weighted Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Weight** | 10 | 9 | 8 (Lower=Better) | 10 | 10 | Max 47 |
| Shared DB / Shared Schema | 10 | 4 | 9 | 1 | 5 | 27 |
| Database per Service (Day 1) | 6 (Eventual) | 10 | 2 | 10 | 10 | 38 |
| **Logical Schema per Domain** | **9** | **8** | **7** | **10** | **9** | **44** |

## 17. Risk Analysis
*   **Data Risks:** Developers bypass the API/Event rules and write cross-schema SQL queries.
    *   *Mitigation:* Restrict database user permissions per module (Module A's DB user simply cannot `SELECT` from Module B's schema).
*   **Consistency Risks:** Eventual consistency leads to UI glitches (e.g., Payment made, but invoice still shows unpaid).
    *   *Mitigation:* Use SignalR/WebSockets to push CQRS read-model update notifications to the client UI.
*   **Performance Risks:** The Outbox pattern background worker becomes a bottleneck.
    *   *Mitigation:* Partition the outbox tables and run multiple parallel relay workers. Transition to Debezium (CDC) if polling becomes too slow.

## 18. Consequences
*   **Positive:** Unparalleled data integrity. Clear ownership accelerates development and incident resolution. Easy path to microservices.
*   **Negative:** Increased initial boilerplate. Developers must learn Eventual Consistency and Saga patterns rather than relying on simple SQL transactions.

## 19. Implementation Notes
*   **Entity Framework Core:** Configure DbContexts with distinct default schemas (e.g., `modelBuilder.HasDefaultSchema("academic")`).
*   **TenantId:** Implement EF Core Global Query Filters (`modelBuilder.Entity<Course>().HasQueryFilter(c => c.TenantId == _currentTenantId)`) to enforce RLS at the application level in tandem with database RLS.
*   **Migrations:** Database migrations must be isolated per domain module.

## 20. Final Recommendation
Adopt the **Logical Database per Domain (Schema Isolation)** strategy utilizing PostgreSQL, supplemented by the **Outbox/Inbox Patterns** for event-driven integration. This enforces the exact data boundaries required by Domain-Driven Design and guarantees the system remains scalable, secure, and ready for future microservices extraction without crippling Day 1 operational velocity.
