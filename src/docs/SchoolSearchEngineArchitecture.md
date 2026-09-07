# School Search Engine Architecture

## 1. Analysis
The Search Engine is a foundational Platform Service in the Enterprise School Management Platform (School OS). It acts as the unified discovery layer across 20+ distinct business domains (from Student Records to Audit Logs and Financials). To perform at enterprise scale without overwhelming transactional databases, the Search Engine operates asynchronously. It builds and maintains its own optimized read-models (inverted indices, vector spaces) by listening to Domain Events. It must guarantee that users never see data they are not authorized to view, enforcing Row-Level Security (RLS) directly at the indexing and querying phases. Furthermore, it lays the groundwork for next-generation AI and Semantic Search without tightly coupling the core engine to any specific AI vendor.

## 2. Architecture Design
The Search Engine follows a strict CQRS (Command Query Responsibility Segregation) and Event-Driven architecture. 
*   **Write Path (Indexing):** The Index Manager listens to the Core Event Bus (e.g., `StudentCreated`, `InvoicePaid`), transforms the domain payloads, and updates the search indices incrementally in near real-time. 
*   **Read Path (Querying):** A user submits a query via the Search Manager. The Query Parser normalizes the string, the Permission Manager injects security constraints (filters), and the Filter/Ranking Managers apply scopes and relevance. The Search Executor runs this highly optimized query against the abstract index.
*   **Auxiliary Paths:** The AI Search Adapter enriches queries for semantic understanding, while Analytics and History Managers track user behavior to improve future ranking.

## 3. Folder Structure
```
src/
└── services/
    └── search/
        ├── core/            # Search Manager, Query Parser, Search Executor
        ├── indexing/        # Index Manager
        ├── optimization/    # Ranking Manager, Filter Manager
        ├── UX/              # Suggestion Manager, Auto Complete Manager
        ├── user/            # History Manager, Saved Search Manager
        ├── observability/   # Analytics Manager
        ├── governance/      # Permission Manager
        ├── ai/              # AI Search Adapter
        └── shared/          # Shared Components (Schemas, Enums)
```

## 4. Search Engine Components

---

### 4.1 Search Manager
**1. Purpose:** Act as the central orchestrator for all discovery and search requests across the platform.
**2. Responsibilities:** Coordinate the search lifecycle: receive queries, invoke parsing, apply security constraints, execute the search, apply ranking, and return standardized paginated results.
**3. Inputs:** Raw Search Query (String, Scope, Filters, Pagination, User Context).
**4. Outputs:** Standardized Search Result Set (Metadata, Hits, Facets).
**5. Dependencies:** Query Parser, Permission Manager, Filter Manager, Search Executor, Ranking Manager, Analytics Manager.
**6. Failure Handling:** Graceful degradation; if deep/complex search times out, falls back to a simpler keyword match or returns partial results with a warning.
**7. Security Considerations:** Ensures no query executes without a validated user context token.
**8. Future Extensibility:** Federated search orchestration, allowing the engine to query external partner databases (e.g., State Library Archives) alongside internal data.

---

### 4.2 Query Parser
**1. Purpose:** Transform raw user input into an optimized, machine-readable query structure.
**2. Responsibilities:** Handle typo tolerance (fuzziness), parse boolean operators (AND, OR, NOT), extract explicit filters (e.g., "grade:10"), and identify multi-language intent.
**3. Inputs:** Raw User String, Localization Context.
**4. Outputs:** Abstract Syntax Tree (AST) or Structured Query Object.
**5. Dependencies:** Shared Components (Language Dictionaries).
**6. Failure Handling:** Strips unparseable special characters and falls back to a standard broad match query.
**7. Security Considerations:** Sanitizes inputs to prevent NoSQL/Search injection attacks (e.g., Elasticsearch DSL injection).
**8. Future Extensibility:** Natural Language Processing (NLP) integration to automatically translate natural phrases ("students absent yesterday") into hard temporal filters.

---

### 4.3 Search Executor
**1. Purpose:** Interface with the underlying search datastore to retrieve matching documents.
**2. Responsibilities:** Translate the Structured Query Object into the specific dialect of the underlying search technology (e.g., Elasticsearch, Apache Solr, Meilisearch) and execute the read operation.
**3. Inputs:** Secured and parsed Structured Query Object.
**4. Outputs:** Raw matched documents and aggregation data (facets).
**5. Dependencies:** Abstract Search Datastore interface.
**6. Failure Handling:** Implements circuit breakers and query timeouts to prevent rogue queries from consuming all cluster memory.
**7. Security Considerations:** Relies entirely on the Permission Manager's injected constraints; never trusts the client's scope alone.
**8. Future Extensibility:** Multi-datastore execution (routing full-text queries to Elasticsearch and vector/semantic queries to Milvus/Pinecone simultaneously).

---

### 4.4 Index Manager
**1. Purpose:** Maintain the accuracy, speed, and health of the searchable data.
**2. Responsibilities:** Subscribe to the Core Event Bus, perform incremental indexing (Upsert/Delete) on domain events, map domain entities to flattened search documents, and trigger full index rebuilds when schemas change.
**3. Inputs:** Domain Events (e.g., `TeacherUpdated`), Schema Definitions.
**4. Outputs:** Search Index write operations.
**5. Dependencies:** Core Event Bus.
**6. Failure Handling:** Uses a Dead Letter Queue (DLQ) for failed index updates and automatically retries with exponential backoff to ensure eventual consistency.
**7. Security Considerations:** Strips highly sensitive data (e.g., passwords, raw biometric hashes) before it ever enters the search index.
**8. Future Extensibility:** Zero-downtime index migration strategies (Blue/Green indexing) for major platform upgrades.

---

### 4.5 Ranking Manager
**1. Purpose:** Ensure the most relevant results appear at the top of the search output.
**2. Responsibilities:** Apply relevance scoring algorithms (e.g., TF-IDF, BM25), factor in business logic (e.g., active students rank higher than alumni), and apply custom boosting profiles.
**3. Inputs:** Raw matched documents, Query context.
**4. Outputs:** Sorted list of documents.
**5. Dependencies:** Analytics Manager (for behavioral feedback loops).
**6. Failure Handling:** Defaults to chronological sorting (newest first) if complex scoring algorithms fail or timeout.
**7. Security Considerations:** N/A (operates on already-secured datasets).
**8. Future Extensibility:** "Learning to Rank" (LTR) utilizing AI models trained on historical click-through rates to personalize results per user.

---

### 4.6 Filter Manager
**1. Purpose:** Refine search results based on structured, exact-match criteria.
**2. Responsibilities:** Apply hard boundaries to queries (e.g., Date ranges, specific Modules, Status enums) and generate dynamic aggregations/facets (e.g., showing counts of "Male" vs "Female" in the result set).
**3. Inputs:** Structured Query Object, User-selected facets.
**4. Outputs:** Filtered Query Constraints, Result Facet metadata.
**5. Dependencies:** None.
**6. Failure Handling:** Ignores malformed filters and executes the broader query, returning a warning in the metadata.
**7. Security Considerations:** Ensures users cannot brute-force discover data by applying exclusionary filters to hidden fields.
**8. Future Extensibility:** Dynamic taxonomy filtering based on Knowledge Engine ontologies (e.g., filtering by broader subject categories inferred from specific course names).

---

### 4.7 Suggestion Manager
**1. Purpose:** Guide users when they encounter zero results or make typographical errors.
**2. Responsibilities:** Generate "Did you mean?" corrections, offer alternative phrasing, and suggest broader categories.
**3. Inputs:** Raw User String, Zero-Hit Result Context.
**4. Outputs:** List of suggested queries.
**5. Dependencies:** Query Parser, Index Manager (Dictionary).
**6. Failure Handling:** Returns an empty suggestion list silently to avoid disrupting the UI.
**7. Security Considerations:** Ensures suggestions do not leak information (e.g., suggesting a highly confidential project name that the user lacks access to).
**8. Future Extensibility:** Context-aware suggestions derived from Large Language Models (LLMs).

---

### 4.8 Auto Complete Manager
**1. Purpose:** Provide instant, type-ahead feedback as the user types in the search bar.
**2. Responsibilities:** Execute ultra-low-latency prefix, edge-N-gram, or exact-match queries to suggest records (e.g., Student Names) or query completions before the user hits "Enter".
**3. Inputs:** Partial User String (e.g., "Smi...").
**4. Outputs:** Top 5-10 instant matches.
**5. Dependencies:** Search Executor (optimized edge-indices).
**6. Failure Handling:** Fails silently; if latency exceeds 50ms, the request is dropped to prevent UI stuttering.
**7. Security Considerations:** Applies the same rigorous RLS (Row-Level Security) as the main search to prevent data leakage in type-ahead dropdowns.
**8. Future Extensibility:** Personalized autocomplete heavily weighted by the user's recent interactions and role.

---

### 4.9 History Manager
**1. Purpose:** Remember what a user has searched for previously.
**2. Responsibilities:** Store recent search terms, allow users to quickly re-execute past searches, and clear history upon request.
**3. Inputs:** Executed Query Strings, User ID.
**4. Outputs:** List of recent searches.
**5. Dependencies:** Platform Storage.
**6. Failure Handling:** Asynchronous, non-blocking writes; failures to save history do not impact the search experience.
**7. Security Considerations:** History is strictly isolated per user.
**8. Future Extensibility:** Cross-device history synchronization.

---

### 4.10 Saved Search Manager
**1. Purpose:** Allow users to persist complex query parameters for repetitive use.
**2. Responsibilities:** Save, edit, and retrieve complex filter combinations and query strings (e.g., "All failing Grade 10 students with attendance < 80%").
**3. Inputs:** Complex Query Object, User ID, Custom Name.
**4. Outputs:** Saved Search Definitions.
**5. Dependencies:** Platform Storage.
**6. Failure Handling:** Standard CRUD error handling.
**7. Security Considerations:** Saved searches are validated at *execution time*, not just save time, ensuring that if a user's permissions are downgraded, their saved search no longer returns restricted data.
**8. Future Extensibility:** Ability to share Saved Searches with other roles/users, or bind them to Automated Reports or Notification Triggers.

---

### 4.11 Analytics Manager
**1. Purpose:** Measure the health, accuracy, and utilization of the search ecosystem.
**2. Responsibilities:** Track most popular queries, zero-result rates, click-through rates (CTR), average latency, and search abandonment.
**3. Inputs:** Search Execution Metadata, User Click Events.
**4. Outputs:** Search Analytics Dashboards/Metrics.
**5. Dependencies:** Shared Observability/Audit Engine.
**6. Failure Handling:** Fire-and-forget telemetry; analytics failures never block search execution.
**7. Security Considerations:** Analytics data is aggregated and anonymized, stripping PII from raw query logs before broad analysis.
**8. Future Extensibility:** Integration with the AI Engine to automatically suggest new Index schemas based on emerging, unfulfilled search patterns.

---

### 4.12 Permission Manager
**1. Purpose:** Enforce data access boundaries at the lowest possible search level.
**2. Responsibilities:** Intercept the Query Object and inject mandatory filter clauses based on the user's role, department, and contextual access (e.g., `AND department_id IN (User.AllowedDepartments)`).
**3. Inputs:** User Authentication Context, Target Search Scope.
**4. Outputs:** Mandatory Security Filter clauses.
**5. Dependencies:** Core Authentication/Permission Engine.
**6. Failure Handling:** Fail-closed; if permissions cannot be resolved, the search is blocked and returns an Access Denied error.
**7. Security Considerations:** This is the most critical security component. By applying filters *before* execution, it ensures pagination, aggregations, and counts are accurate and secure.
**8. Future Extensibility:** Dynamic Attribute-Based Access Control (ABAC), allowing security filters based on time of day, IP address, or device trust level.

---

### 4.13 AI Search Adapter
**1. Purpose:** Bridge traditional lexical search with next-generation semantic and vector search capabilities.
**2. Responsibilities:** Route queries to the AI Engine for query expansion, generate vector embeddings for incoming documents, and perform Approximate Nearest Neighbor (ANN) vector lookups.
**3. Inputs:** Raw queries requiring semantic understanding.
**4. Outputs:** Vector embeddings, Semantic search results.
**5. Dependencies:** Platform AI Engine.
**6. Failure Handling:** Gracefully degrades to standard keyword search if the AI Provider (embedding model) times out.
**7. Security Considerations:** Ensures that chunked data sent to external AI embedding models does not violate data residency or PII policies.
**8. Future Extensibility:** Fully hybrid search orchestration (Reciprocal Rank Fusion blending TF-IDF lexical scores with cosine similarity vector scores) and pre-processing retrieval for RAG (Retrieval-Augmented Generation) applications.

---

### 4.14 Shared Components
**1. Purpose:** Provide common definitions and contracts for the Search ecosystem.
**2. Responsibilities:** Define Search Interfaces, Mapping Schemas, Pagination DTOs, and Facet structures used by all managers.
**3. Inputs:** N/A (Library level).
**4. Outputs:** Reusable Enums, Types, Interfaces.
**5. Dependencies:** None.
**6. Failure Handling:** N/A.
**7. Security Considerations:** Contains strict validation utilities to prevent prototype pollution or JSON structure exploits.
**8. Future Extensibility:** Publishing the schema structures as standard enterprise packages for third-party Plugin developers to index their own custom data.
