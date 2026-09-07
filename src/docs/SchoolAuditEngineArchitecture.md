# School Audit Engine Architecture

## 1. Analysis
The Audit Engine is a foundational Platform Service in the Enterprise School Management Platform (School OS) designed strictly for governance, compliance, and forensics. It operates as the immutable memory of the platform, distinct from standard system logging. While logs capture application errors or debug traces, the Audit Engine answers critical business questions: *Who did what, when, why, and what was the exact state change?* Driven by Event-Driven Architecture, it passively consumes events from all business modules, core engines (Workflow, Decision, AI), and external integrations, recording them into an immutable, tamper-resistant ledger suitable for legal and compliance requirements.

## 2. Architecture Design
The Audit Engine is fundamentally an asynchronous write-heavy subsystem that prioritizes immutability. As domain events, state changes, or security events occur across the platform, they are published to the Core Event Bus. Specialized Trackers and Managers within the Audit Engine subscribe to these events, format them into a universal audit envelope (capturing Actor, Action, Resource, Timestamp, and Context), and commit them to an append-only datastore. The Retention Manager enforces lifecycle policies, while the Search Manager provides secured, read-only access for forensic investigations. 

## 3. Folder Structure
```text
src/
└── services/
    └── audit/
        ├── core/            # Audit Manager, Activity Tracker, Entity Change Tracker
        ├── engines/         # Workflow Audit Manager, Decision Audit Manager, AI Audit Manager
        ├── security/        # Security Audit Manager, Authentication Audit Manager
        ├── boundary/        # Integration Audit Manager, File Audit Manager, Configuration Audit Manager
        ├── governance/      # Compliance Manager, Retention Manager
        ├── retrieval/       # Search Manager, Analytics Adapter
        └── shared/          # Shared Components (Audit Envelopes, Schemas)
```

## 4. Audit Engine Components

---

### 4.1 Audit Manager
**1. Purpose:** Act as the central ingestion point and orchestrator for all audit trails.
**2. Responsibilities:** Receive raw audit events from various trackers, normalize them into the standard Audit Envelope format, cryptographically sign them to ensure non-repudiation, and commit them to the immutable ledger.
**3. Inputs:** Raw Audit Payloads from subsystems.
**4. Outputs:** Cryptographically signed, normalized Audit Records.
**5. Dependencies:** Cryptography Service (Shared Platform), Core Storage Engine (Append-Only).
**6. Failure Handling:** Employs persistent local queues (write-ahead logging) if the primary audit datastore is unreachable, ensuring zero audit data loss.
**7. Security Considerations:** The Manager itself runs with write-only privileges to the datastore; it cannot modify or delete past records under any circumstance.
**8. Data Retention Strategy:** Perpetual retention during active system life; archives are dictated by the Retention Manager.
**9. Future Extensibility:** Blockchain or Distributed Ledger Technology (DLT) integration to provide mathematically verifiable proofs of audit integrity to external accreditation boards.

---

### 4.2 Activity Tracker
**1. Purpose:** Record high-level user and system actions.
**2. Responsibilities:** Track standard business operations (e.g., "Teacher submitted grades", "Principal approved budget") that represent intent and completion of tasks rather than granular data mutations.
**3. Inputs:** Domain Events (e.g., `GradesSubmittedEvent`).
**4. Outputs:** Activity Audit Records.
**5. Dependencies:** Core Event Bus.
**6. Failure Handling:** Non-blocking async processing; drops duplicate events if re-delivered by the event bus.
**7. Security Considerations:** Redacts transient PII from the activity description, relying on secure references instead.
**8. Data Retention Strategy:** Standard activity logs retained for 3-5 years based on standard educational compliance rules.
**9. Future Extensibility:** Real-time stream processing to detect "impossible travel" or concurrent impossible activities across the platform.

---

### 4.3 Entity Change Tracker
**1. Purpose:** Track granular state mutations across all domain entities.
**2. Responsibilities:** Record exactly what data changed, capturing the 'Before' state (snapshot) and the 'After' state (snapshot), along with the diff (e.g., "Student Address changed from X to Y").
**3. Inputs:** Entity Mutation Events, Delta Payloads.
**4. Outputs:** Entity Change Audit Records.
**5. Dependencies:** Domain Data Layer (Abstracted via Events).
**6. Failure Handling:** Fails gracefully by recording partial state changes if the full 'Before' state is unavailable, flagging the record for review.
**7. Security Considerations:** Masking of highly sensitive fields (e.g., SSN, Passwords) in the recorded diffs; encrypted at rest.
**8. Data Retention Strategy:** Long-term retention (7+ years) to comply with financial and student record legal requirements.
**9. Future Extensibility:** Automated visual timeline reconstruction of an entity's complete lifecycle over decades.

---

### 4.4 Workflow Audit Manager
**1. Purpose:** Provide traceability into automated business processes.
**2. Responsibilities:** Record the initiation, state transitions, manual interventions, and completion/failure of complex workflows (e.g., the exact path taken during a Student Expulsion workflow).
**3. Inputs:** Workflow Transition Events.
**4. Outputs:** Workflow Trace Audit Records.
**5. Dependencies:** Core Workflow Engine.
**6. Failure Handling:** Ensures that a missing intermediate transition event does not corrupt the entire workflow audit trail.
**7. Security Considerations:** Ensures that workflow traces do not leak unauthorized context payloads to users viewing the audit logs.
**8. Data Retention Strategy:** Tied to the retention policy of the primary entity involved in the workflow.
**9. Future Extensibility:** Integration with Process Mining tools to discover deviations between audited workflow paths and designed workflow paths.

---

### 4.5 Decision Audit Manager
**1. Purpose:** Create accountability for automated and human-in-the-loop decisions.
**2. Responsibilities:** Log the exact context, rules applied, policies checked, and rationale for every decision made by the Decision Engine.
**3. Inputs:** Decision Resolution Events, Rationale Traces.
**4. Outputs:** Decision Audit Records.
**5. Dependencies:** Platform Decision Engine.
**6. Failure Handling:** Asynchronous writing; decision making is never blocked by audit writing latency.
**7. Security Considerations:** Audit trails of decisions must be tamper-proof to prevent users from altering the recorded justification of a controversial decision.
**8. Data Retention Strategy:** Indefinite retention for critical compliance decisions (e.g., admissions, financial approvals).
**9. Future Extensibility:** Integration with legal discovery tools to automatically package decision audits for external audits or lawsuits.

---

### 4.6 Security Audit Manager
**1. Purpose:** Monitor and record changes to the platform's security posture.
**2. Responsibilities:** Track role creations, permission modifications, policy updates, and access control list (ACL) mutations.
**3. Inputs:** Security Policy Mutation Events.
**4. Outputs:** Security State Audit Records.
**5. Dependencies:** Core Security/Permission Engine.
**6. Failure Handling:** Triggers immediate high-priority alerts to administrators if a security audit event fails to write.
**7. Security Considerations:** Employs the highest level of cryptographic signing; alerts on any detected anomalies in security modifications.
**8. Data Retention Strategy:** Permanent retention; security changes are never purged.
**9. Future Extensibility:** Automated rollback triggers if unauthorized or massive sweeping permission changes are detected.

---

### 4.7 Authentication Audit Manager
**1. Purpose:** Track all access attempts into the platform.
**2. Responsibilities:** Record successful logins, failed login attempts, password resets, MFA challenges, session timeouts, and token revocations.
**3. Inputs:** Authentication Gateway Events (IP, User Agent, Timestamp, Status).
**4. Outputs:** Auth Audit Records.
**5. Dependencies:** Core Authentication Engine.
**6. Failure Handling:** Queues auth events locally on the gateway if the Audit Engine is temporarily unavailable to ensure no brute-force attempts are missed.
**7. Security Considerations:** Never logs passwords, tokens, or sensitive credential materials; only hashes and statuses.
**8. Data Retention Strategy:** Short to medium term (1-3 years) depending on compliance, as volume is extremely high.
**9. Future Extensibility:** Machine learning integration to establish baseline authentication patterns and flag anomalous logins automatically.

---

### 4.8 Integration Audit Manager
**1. Purpose:** Audit data flowing in and out of the School OS via external systems.
**2. Responsibilities:** Record payloads, synchronization statuses, API key usage, and data exchange events with external systems (e.g., State Reporting systems, Payment Gateways).
**3. Inputs:** Integration Engine Events, API Gateway Logs.
**4. Outputs:** External Integration Audit Records.
**5. Dependencies:** Platform Integration Engine.
**6. Failure Handling:** Truncates extremely large payloads to prevent storage bloat, logging the hash of the full payload instead.
**7. Security Considerations:** Sanitizes inbound/outbound payloads for PII before auditing to prevent the Audit datastore from becoming a vector for data leakage.
**8. Data Retention Strategy:** Maintained according to data-sharing agreements with external partners (typically 3-5 years).
**9. Future Extensibility:** Automated compliance checks against data residency laws (e.g., GDPR) for cross-border integrations.

---

### 4.9 AI Audit Manager
**1. Purpose:** Provide accountability and transparency for AI utilization.
**2. Responsibilities:** Log prompts sent to AI providers, AI generated responses, model versions used, and tokens consumed to audit the ethical and safe use of AI within the school.
**3. Inputs:** AI Gateway Telemetry, Prompt/Response Pairs.
**4. Outputs:** AI Interaction Audit Records.
**5. Dependencies:** Platform AI Engine.
**6. Failure Handling:** Relies on the AI Engine's internal retry mechanisms to forward missed telemetry.
**7. Security Considerations:** Audits must mask sensitive student information that may have been included in prompts.
**8. Data Retention Strategy:** Medium-term (1-3 years) for quality assurance and bias auditing.
**9. Future Extensibility:** Automated semantic scanning of historical AI audits to detect bias drift or hallucination trends over time.

---

### 4.10 File Audit Manager
**1. Purpose:** Track the lifecycle of critical documents and media.
**2. Responsibilities:** Record file uploads, downloads, views, modifications, and deletions (e.g., Who viewed a student's medical record document and when?).
**3. Inputs:** File Engine Access Events.
**4. Outputs:** File Access Audit Records.
**5. Dependencies:** Platform File/Media Engine.
**6. Failure Handling:** Ignores redundant "View" events within a short timeframe (debouncing) to reduce noise if the system is under load.
**7. Security Considerations:** Links file hashes to audit records to prove a downloaded file was not altered.
**8. Data Retention Strategy:** Tied to the classification level of the document (e.g., medical records require longer retention than general announcements).
**9. Future Extensibility:** Digital Rights Management (DRM) integration tracking file usage even after it has left the platform ecosystem.

---

### 4.11 Configuration Audit Manager
**1. Purpose:** Audit changes to the fundamental operation of the School OS.
**2. Responsibilities:** Record modifications to system settings, feature flags, global parameters, and module activations/deactivations.
**3. Inputs:** Core Configuration Engine Events.
**4. Outputs:** System Configuration Audit Records.
**5. Dependencies:** Core Engine (Registry/Config).
**6. Failure Handling:** Halts the configuration change if the audit record cannot be generated synchronously (Strict Consistency).
**7. Security Considerations:** Ensures only Super Admins can generate configuration audit events.
**8. Data Retention Strategy:** Permanent retention to allow full system state reconstruction for any point in history.
**9. Future Extensibility:** "Configuration Time Travel" allowing admins to revert the entire platform to a previous configuration state based on audit diffs.

---

### 4.12 Compliance Manager
**1. Purpose:** Ensure the Audit Engine meets external regulatory requirements.
**2. Responsibilities:** Map raw audit records to specific compliance frameworks (FERPA, GDPR, HIPAA, SOX), ensuring that the required data is being captured and appropriately formatted for audits.
**3. Inputs:** Audit Records, Compliance Framework Definitions.
**4. Outputs:** Compliance mapping tags, Audit gaps alerts.
**5. Dependencies:** Platform Knowledge Engine (for Framework definitions).
**6. Failure Handling:** Fails safe; records are still audited even if the compliance tagging fails.
**7. Security Considerations:** Protects the definitions of compliance rules from unauthorized modification.
**8. Data Retention Strategy:** N/A (Meta-management layer).
**9. Future Extensibility:** Automated generation of Compliance Certificates and Regulatory Submission documents.

---

### 4.13 Retention Manager
**1. Purpose:** Manage the lifecycle and storage costs of audit data.
**2. Responsibilities:** Enforce data retention policies, execute automated data archiving (moving hot data to cold storage), and perform cryptographically secure, permanent data destruction (purging) when legal retention periods expire.
**3. Inputs:** Retention Policies, Time Triggers.
**4. Outputs:** Archival Commands, Purge Certificates.
**5. Dependencies:** Core Storage Engine.
**6. Failure Handling:** Pauses purging operations if there is any doubt about the policy or the target data, requiring manual admin review.
**7. Security Considerations:** Ensures purged data is unrecoverable (crypto-shredding) and issues a permanent "Certificate of Destruction" for compliance.
**8. Data Retention Strategy:** Enforces all strategies defined by other managers.
**9. Future Extensibility:** Multi-cloud cold storage distribution to prevent data loss against single-vendor cloud failures.

---

### 4.14 Search Manager
**1. Purpose:** Provide access to the audit logs for investigation.
**2. Responsibilities:** Expose a highly secure, filtered search interface for authorized personnel (e.g., Compliance Officers, Auditors) to query the immutable ledger.
**3. Inputs:** Forensic Search Queries, Auditor Context.
**4. Outputs:** Filtered Audit Records.
**5. Dependencies:** Platform Search Engine.
**6. Failure Handling:** Times out gracefully on massive queries, requesting the user to refine search parameters.
**7. Security Considerations:** Strict Row-Level Security (RLS). An auditor can only see records for campuses or departments they are authorized to investigate. Every forensic search is itself audited.
**8. Data Retention Strategy:** N/A (Read-only interface).
**9. Future Extensibility:** Natural Language forensic queries (e.g., "Show me all grade changes made by Mr. Smith outside of school hours").

---

### 4.15 Analytics Adapter
**1. Purpose:** Bridge the Audit Engine with the Analytics Engine.
**2. Responsibilities:** Export aggregated, anonymized audit metadata to the Analytics Engine to identify macro-trends (e.g., a spike in failed logins across the district, or high volume of policy overrides).
**3. Inputs:** Aggregated Audit Metadata.
**4. Outputs:** Analytical Streams.
**5. Dependencies:** Platform Analytics Engine.
**6. Failure Handling:** Non-critical; async export drops packets if Analytics Engine is down.
**7. Security Considerations:** Strips all PII and sensitive payload data before transmission; exports only counts, timestamps, and categorical metadata.
**8. Data Retention Strategy:** Summarized analytical data is retained independently by the Analytics Engine.
**9. Future Extensibility:** Real-time anomaly detection streaming directly into a Security Information and Event Management (SIEM) system.

---

### 4.16 Shared Components
**1. Purpose:** Provide the standardized DNA of the Audit Engine.
**2. Responsibilities:** Define the universal Audit Envelope structure (Actor, Action, Resource, Timestamp, TraceID), abstract hashing interfaces, and common Enums (ActionTypes, SeverityLevels).
**3. Inputs:** N/A.
**4. Outputs:** Reusable schemas, interfaces, and cryptography utilities.
**5. Dependencies:** None.
**6. Failure Handling:** N/A.
**7. Security Considerations:** Houses the core cryptographic hashing algorithms used to ensure ledger immutability.
**8. Data Retention Strategy:** N/A.
**9. Future Extensibility:** Open-sourcing the Audit Envelope schema to allow external partner systems to push standard audit events into the School OS ledger.
