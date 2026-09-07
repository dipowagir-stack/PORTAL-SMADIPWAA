# School Reporting Engine Architecture

## 1. Analysis
The Reporting Engine is a critical Platform Service in the Enterprise School Management Platform (School OS). It serves as the centralized brain for extracting, processing, formatting, and distributing insights across all 15 operational categories (from Academic to Executive Dashboards). Crucially, it operates agnostically: it does not query databases directly but rather relies on abstract data providers or CQRS read models. It does not render UI elements; it generates structured artifacts (PDF, Excel, JSON). By decoupling data aggregation from presentation and distribution, the Reporting Engine ensures high performance, strict security, and extreme reusability at an enterprise scale.

## 2. Architecture Design
The Reporting Engine follows an asynchronous, pipeline-driven architecture. A report execution request flows through the Parameter Manager to resolve dynamic inputs, passes to the Security Manager for access validation, and instructs the Data Aggregator to fetch raw information. The Generation Manager then merges this raw data with layouts from the Template Manager. The Export Manager compiles the final artifact (PDF, CSV, etc.), which the Cache Manager optionally stores. Finally, the Distribution Manager utilizes the Notification Engine to deliver the report, while the History Manager logs the entire lifecycle. Heavy reports operate via the Event Bus to prevent system blocking.

## 3. Folder Structure
```
src/
└── services/
    └── reporting/
        ├── core/            # Report Manager, Report Builder, Version Manager
        ├── data/            # Parameter Manager, Data Aggregator, Cache Manager
        ├── rendering/       # Template Manager, Generation Manager, Export Manager
        ├── delivery/        # Scheduler, Distribution Manager
        ├── governance/      # Security Manager, History Manager
        └── shared/          # Shared Components (Enums, Formats, Interfaces)
```

## 4. Reporting Engine Components

---

### 4.1 Report Manager
**1. Purpose:** Act as the central orchestrator and entry point for all reporting requests.
**2. Responsibilities:** Coordinate the entire reporting pipeline, manage report execution lifecycles (synchronous preview vs. asynchronous heavy generation), and route requests to appropriate sub-components.
**3. Inputs:** Report Execution Request (Report ID, Parameters, User Context, Export Format).
**4. Outputs:** Report Execution Status, Generated Artifact Reference (URL/Stream).
**5. Dependencies:** Parameter Manager, Security Manager, Data Aggregator, Generation Manager, History Manager.
**6. Failure Handling:** Emits execution failure events, updates History Manager with error states, and returns standardized error envelopes.
**7. Security Considerations:** Ensures no report execution begins without a valid security context and authentication token.
**8. Future Extensibility:** AI-driven request orchestration (e.g., automatically determining if a report requires asynchronous background processing based on predicted data size).

---

### 4.2 Report Builder
**1. Purpose:** Define and construct the logical blueprints of customized reports.
**2. Responsibilities:** Allow dynamic composition of data sources, metrics, groupings, and visual layouts without hardcoding; translate user-defined report schemas into executable Engine blueprints.
**3. Inputs:** Raw schema definitions (JSON/YAML), Data Source maps.
**4. Outputs:** Validated Executable Report Blueprint.
**5. Dependencies:** Template Manager, Data Aggregator.
**6. Failure Handling:** Rejects malformed schemas with detailed syntax validation errors.
**7. Security Considerations:** Prevents injection attacks by strictly validating blueprint schemas against allowed data access boundaries.
**8. Future Extensibility:** Integration with the AI Engine to support natural language report generation (e.g., "Build a report showing declining attendance vs grades").

---

### 4.3 Template Manager
**1. Purpose:** Manage the visual presentation and structural layout of reports.
**2. Responsibilities:** Store, retrieve, and apply visual templates (headers, footers, charts, tables) to raw data; handle branding localization.
**3. Inputs:** Template ID, Raw Aggregated Data, Localization Context.
**4. Outputs:** Render-ready Document Object Model (DOM) or structured visualization mapping.
**5. Dependencies:** Shared Knowledge (Branding, Localization).
**6. Failure Handling:** Falls back to a standard, unbranded fallback template if the requested custom layout is missing or corrupted.
**7. Security Considerations:** Sanitizes template inputs to prevent Cross-Site Scripting (XSS) in HTML-based reports.
**8. Future Extensibility:** Interactive, dynamic templates (e.g., embedded React components for live dashboard widgets).

---

### 4.4 Parameter Manager
**1. Purpose:** Resolve, validate, and sanitize dynamic inputs for report execution.
**2. Responsibilities:** Process date ranges, user IDs, branch filters, and pagination parameters; ensure parameters match the report blueprint requirements.
**3. Inputs:** Raw User Parameters, Report Blueprint constraints.
**4. Outputs:** Sanitized, strongly-typed Parameter Object.
**5. Dependencies:** Shared Components.
**6. Failure Handling:** Halts execution and returns validation errors if required parameters are missing or out of bounds.
**7. Security Considerations:** Prevents SQL/NoSQL injection by enforcing strict type checking and boundary validation on all dynamic filters.
**8. Future Extensibility:** Dynamic parameter dependency resolution (e.g., selecting a "Branch" dynamically restricts the allowed values in the "Department" parameter).

---

### 4.5 Data Aggregator
**1. Purpose:** Collect and consolidate raw data required for the report.
**2. Responsibilities:** Issue abstract queries to CQRS Read Models or internal APIs, perform in-memory joins or aggregations (sums, averages), and structure the data for the Generation Manager.
**3. Inputs:** Sanitized Parameter Object, Data Source Blueprint.
**4. Outputs:** Structured, multi-dimensional JSON Data Set.
**5. Dependencies:** Platform Data Access Layer (Abstracted).
**6. Failure Handling:** Implements timeouts and partial data degradation (returning available data with warnings if one non-critical data source fails).
**7. Security Considerations:** Obeys the Security Manager’s row-level and column-level access constraints during data fetching.
**8. Future Extensibility:** Federated querying across external third-party APIs (e.g., blending state standardized test scores with internal school grades).

---

### 4.6 Generation Manager
**1. Purpose:** Merge raw data with visual templates to create the final logical document.
**2. Responsibilities:** Execute template binding, apply conditional formatting (e.g., highlighting failing grades in red), and assemble multi-page layouts.
**3. Inputs:** Structured Data Set, Render-ready Template.
**4. Outputs:** Compiled Document Representation (In-Memory).
**5. Dependencies:** Template Manager, Data Aggregator.
**6. Failure Handling:** Aborts generation if memory limits are approached, mitigating Out-Of-Memory (OOM) crashes.
**7. Security Considerations:** Enforces PII (Personally Identifiable Information) masking policies during the binding phase.
**8. Future Extensibility:** Distributed generation processing across multiple nodes for massive enterprise compliance reports.

---

### 4.7 Export Manager
**1. Purpose:** Translate the compiled in-memory document into physical file formats.
**2. Responsibilities:** Convert the generated document into the requested format (PDF, Excel, CSV, Word, HTML, JSON) using specific rendering libraries.
**3. Inputs:** Compiled Document Representation, Target Format Enum.
**4. Outputs:** Physical File Stream or Binary Blob.
**5. Dependencies:** Generation Manager.
**6. Failure Handling:** Returns a fallback format (e.g., CSV) if complex rendering (e.g., PDF charts) fails due to library limitations.
**7. Security Considerations:** Strips hidden metadata (EXIF-equivalents) and prevents macro injection in exported Excel/Word documents.
**8. Future Extensibility:** Support for emerging standardized data formats (e.g., XBRL for financial compliance reporting).

---

### 4.8 Distribution Manager
**1. Purpose:** Deliver the generated report artifacts to the intended recipients.
**2. Responsibilities:** Attach reports to emails, send secure download links via SMS/Push, or dispatch webhook payloads to external systems.
**3. Inputs:** File Stream/URL, Recipient List, Distribution Channels.
**4. Outputs:** Delivery Dispatch Status.
**5. Dependencies:** Notification Engine (Platform Service).
**6. Failure Handling:** Relies on the Notification Engine's retry mechanisms for transient delivery failures.
**7. Security Considerations:** Never sends sensitive reports as raw attachments; instead, distributes secure, time-expiring, authenticated download links.
**8. Future Extensibility:** Direct integrations with enterprise cloud storage (Google Drive, OneDrive, AWS S3) for automated archival delivery.

---

### 4.9 Scheduler
**1. Purpose:** Manage time-based, automated execution of recurring reports.
**2. Responsibilities:** Track recurring schedules (e.g., "End of Term Financials", "Daily Attendance Digest") and trigger the Report Manager automatically.
**3. Inputs:** Cron Expressions, Report Blueprint IDs, Recipient Lists.
**4. Outputs:** Scheduled Execution Triggers.
**5. Dependencies:** Core Platform Scheduler Engine.
**6. Failure Handling:** Retries missed schedules within an acceptable drift window; alerts administrators upon repeated failures.
**7. Security Considerations:** Evaluates the authorization context of the *creator* of the schedule at execution time to ensure permissions haven't been revoked.
**8. Future Extensibility:** AI-optimized scheduling to run heavy reports during periods of lowest platform usage.

---

### 4.10 Version Manager
**1. Purpose:** Maintain the lifecycle and iteration history of Report Blueprints.
**2. Responsibilities:** Track changes to report definitions, support rollback to previous layouts/queries, and ensure backward compatibility for scheduled reports.
**3. Inputs:** Report Blueprint updates.
**4. Outputs:** Versioned Blueprint Artifacts (e.g., v1.0.0, v1.1.0).
**5. Dependencies:** Platform Storage.
**6. Failure Handling:** Prevents deletion of active versions currently mapped to automated schedules.
**7. Security Considerations:** Audits *who* changed a report definition and *what* data fields were added or removed.
**8. Future Extensibility:** Automated regression testing that compares data outputs between versions before allowing a new version to be published.

---

### 4.11 History Manager
**1. Purpose:** Provide an immutable audit trail of report executions.
**2. Responsibilities:** Log when a report was run, by whom, with what parameters, and store references to the final generated artifact.
**3. Inputs:** Execution Metadata, Artifact URLs.
**4. Outputs:** Queryable Report Execution Logs.
**5. Dependencies:** Platform Storage, Audit Engine.
**6. Failure Handling:** Uses write-behind caching to ensure slow database inserts don't block the Reporting Engine's main thread.
**7. Security Considerations:** Enforces strict retention policies (e.g., automatically purging cached financial reports after 30 days).
**8. Future Extensibility:** Integration with the AI Analytics engine to determine which reports are most frequently used vs. abandoned.

---

### 4.12 Security Manager
**1. Purpose:** Enforce strict access controls, data privacy, and compliance boundaries throughout the reporting lifecycle.
**2. Responsibilities:** Evaluate user roles against report definitions, enforce Row-Level Security (RLS), Column-Level Security (CLS), and apply dynamic data masking (e.g., obscuring Social Security Numbers).
**3. Inputs:** User Context, Target Blueprint, Raw Data Streams.
**4. Outputs:** Authorization Decisions, Masked Data Sets.
**5. Dependencies:** Core Authentication/Permission Engine.
**6. Failure Handling:** Defaults to "Deny All" if the permission context cannot be resolved.
**7. Security Considerations:** Implements the principle of least privilege at the query formulation stage, ensuring unauthorized data is never even fetched into memory.
**8. Future Extensibility:** Advanced contextual access (e.g., denying access to sensitive financial reports if the user is logging in from a new, untrusted geolocation).

---

### 4.13 Cache Manager
**1. Purpose:** Optimize platform performance by storing and serving frequently requested, non-volatile report data.
**2. Responsibilities:** Cache aggregated data queries, store fully rendered report artifacts for identical parameter requests, and handle cache invalidation based on domain events.
**3. Inputs:** Parameter Hashes, Execution Results.
**4. Outputs:** Cached Data Sets or Cached Artifact URLs.
**5. Dependencies:** In-Memory Datastore (e.g., Redis).
**6. Failure Handling:** Graceful degradation; if the cache fails, the engine seamlessly falls back to full query execution.
**7. Security Considerations:** All cached artifacts are encrypted at rest and partitioned strictly by tenant and authorization context.
**8. Future Extensibility:** Predictive caching (pre-generating the Monday Morning Executive Dashboard at 3:00 AM before the Principal logs in).

---

### 4.14 Shared Components
**1. Purpose:** Provide universal contracts, types, and foundational logic for the Reporting Engine ecosystem.
**2. Responsibilities:** Define Enums (Export Formats, Report Categories), standardized DTOs, and abstract interfaces used across all internal managers.
**3. Inputs:** N/A (Library level).
**4. Outputs:** Reusable Types, Constants, Interfaces.
**5. Dependencies:** None.
**6. Failure Handling:** N/A.
**7. Security Considerations:** Houses generic validation patterns and sanitization utility functions.
**8. Future Extensibility:** Extraction into standalone npm/nuget packages for enterprise microservice decomposition.
