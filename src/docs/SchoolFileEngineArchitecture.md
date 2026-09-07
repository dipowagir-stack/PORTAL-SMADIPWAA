# School File Engine Architecture

## 1. Analysis
The File Engine is a foundational Platform Service in the Enterprise School Management Platform (School OS). It serves as the centralized Enterprise Content Management (ECM) system, abstracting the complexities of physical file storage, security, and lifecycle management away from the core business modules. Whether the Finance module is storing invoices, the Academic module is storing student submissions, or the HR module is storing employee contracts, they all consume the File Engine via standardized events and interfaces. The File Engine contains no business logic; it acts solely to validate, secure, store, version, and retrieve digital assets efficiently across multiple abstract storage providers.

## 2. Architecture Design
The File Engine operates on a strict Separation of Concerns, isolating binary data streaming from metadata management. When a file upload is initiated, the Validation Manager checks integrity and limits, while the Security Manager handles encryption. The Upload Manager streams the binary payload to the Storage Manager (which abstracts S3, GCS, Firebase, or local disk), while the Metadata Manager persists the logical file properties (name, size, tags) to the platform database. Access is strictly gated by the Permission Manager. Lifecycle operations (archiving, purging) are asynchronously orchestrated by the Retention and Archive managers based on predefined organizational rules.

## 3. Folder Structure
```text
src/
└── services/
    └── file/
        ├── core/            # File Manager, Folder Manager, Version Manager
        ├── transport/       # Upload Manager, Download Manager
        ├── data/            # Metadata Manager, Classification Manager
        ├── access/          # Sharing Manager, Permission Manager
        ├── processing/      # Preview Manager, Validation Manager
        ├── persistence/     # Storage Manager, Archive Manager, Restore Manager
        ├── governance/      # Security Manager, Retention Manager
        └── shared/          # Shared Components (MIME types, Interfaces)
```

## 4. File Engine Components

---

### 4.1 File Manager
**1. Purpose:** Orchestrate the complete lifecycle of a file operation.
**2. Responsibilities:** Act as the primary entry point for the rest of the platform. Route upload, download, and modification requests through validation, security, and storage managers.
**3. Inputs:** File Operation Requests (Upload, Delete, Move, Copy).
**4. Outputs:** Operation Acknowledgements, File Identifiers (UUIDs).
**5. Dependencies:** All internal File Engine sub-managers.
**6. Failure Handling:** Implements compensating transactions (e.g., if metadata fails to save after the binary is uploaded, it triggers a deletion of the orphaned binary).
**7. Security Considerations:** Ensures no operation begins without passing the Permission Manager's authorization checks.
**8. Storage Strategy:** Does not directly store data; manages the pointers between the logical file and its physical storage location.
**9. Future Extensibility:** Integration with distributed workflow engines to trigger complex document approval chains upon file creation.

---

### 4.2 Upload Manager
**1. Purpose:** Handle the reliable ingestion of binary data into the platform.
**2. Responsibilities:** Manage multipart uploads, resumable streams, chunking, and direct-to-cloud upload signatures (to prevent routing massive files through the application server).
**3. Inputs:** Binary Streams, File Metadata, Upload Tokens.
**4. Outputs:** Upload Completion Status, Physical Storage URIs.
**5. Dependencies:** Validation Manager, Security Manager, Storage Manager.
**6. Failure Handling:** Supports resumable uploads for broken connections; automatically cleans up incomplete multipart chunks after a timeout.
**7. Security Considerations:** Generates short-lived, pre-signed upload URLs to allow clients to upload directly to secure cloud buckets without exposing permanent credentials.
**8. Storage Strategy:** Buffers chunks in memory or temporary local storage only if direct-to-cloud upload is not feasible.
**9. Future Extensibility:** Edge-accelerated uploads utilizing Content Delivery Network (CDN) edge nodes.

---

### 4.3 Download Manager
**1. Purpose:** Handle the secure and efficient egress of binary data.
**2. Responsibilities:** Support byte-range requests (for video streaming), generate short-lived download links, and serve files to authorized consumers.
**3. Inputs:** File ID, User Context, Range Headers.
**4. Outputs:** Binary Streams, Pre-signed Download URLs.
**5. Dependencies:** Permission Manager, Storage Manager.
**6. Failure Handling:** Gracefully handles missing files by returning standardized "Not Found" envelopes rather than crashing.
**7. Security Considerations:** Never serves files via public URLs. All downloads require a dynamic, time-expiring, cryptographically signed token.
**8. Storage Strategy:** Utilizes streaming architectures to ensure massive files (e.g., 5GB lecture videos) do not consume application memory during egress.
**9. Future Extensibility:** Global CDN integration for low-latency downloads across international branch campuses.

---

### 4.4 Version Manager
**1. Purpose:** Prevent data loss and support collaborative document iteration.
**2. Responsibilities:** Maintain historical revisions of files, manage Check-in/Check-out locking mechanisms to prevent concurrent overwrite collisions, and track the delta of changes.
**3. Inputs:** New File Iterations, Lock/Unlock Requests.
**4. Outputs:** Version Histories, File Lock Statuses.
**5. Dependencies:** File Manager, Metadata Manager.
**6. Failure Handling:** Rejects check-in requests if the file is locked by another user, returning a clear concurrency conflict error.
**7. Security Considerations:** Accessing a previous version of a file requires the same (or higher) permission level as accessing the current version.
**8. Storage Strategy:** Stores each version as an immutable, distinct physical binary, while updating the logical pointer in the Metadata Manager to the latest version.
**9. Future Extensibility:** Automated delta-compression for text-based files to save storage costs across hundreds of revisions.

---

### 4.5 Metadata Manager
**1. Purpose:** Manage the logical properties and context of digital assets.
**2. Responsibilities:** Store and retrieve non-binary information (File Name, Size, MIME Type, Owner, Upload Timestamp, Custom Tags) linked to the physical binary.
**3. Inputs:** File Properties, Tag Updates.
**4. Outputs:** Queryable Metadata Records.
**5. Dependencies:** Platform Database (Abstracted).
**6. Failure Handling:** Utilizes strict database transactions to ensure metadata is never out of sync with the physical storage reality.
**7. Security Considerations:** Prevents metadata injection attacks by strictly sanitizing file names and custom tags.
**8. Storage Strategy:** Metadata is stored in the platform's high-speed transactional database (SQL/NoSQL) to enable lightning-fast search and filtering.
**9. Future Extensibility:** GraphQL API exposure for advanced, multi-dimensional querying of file metadata by external analytics tools.

---

### 4.6 Folder Manager
**1. Purpose:** Provide a familiar, hierarchical structure for file organization.
**2. Responsibilities:** Manage logical directories, path resolution (e.g., `/academic/2026/syllabi/`), and bulk operations on folder trees (Move, Copy, Delete).
**3. Inputs:** Folder Creation Requests, Path Updates.
**4. Outputs:** Logical Directory Trees, Resolved File Lists.
**5. Dependencies:** Metadata Manager.
**6. Failure Handling:** Prevents circular references (moving a folder into its own child) and deep nesting limit breaches.
**7. Security Considerations:** Permissions applied to a folder automatically cascade to all files and sub-folders within it (Hierarchical Inheritance).
**8. Storage Strategy:** Folders are purely logical entities stored in the Metadata database; the Storage Manager treats all physical files as flat objects.
**9. Future Extensibility:** Smart Folders (Virtual directories populated dynamically based on saved search queries or metadata tags).

---

### 4.7 Classification Manager
**1. Purpose:** Categorize files for governance and compliance.
**2. Responsibilities:** Assign data classification levels (e.g., Public, Internal, Confidential, Restricted) and enforce corresponding handling rules.
**3. Inputs:** Classification Tags, File Context.
**4. Outputs:** Classified Metadata, Triggered Governance Rules.
**5. Dependencies:** Metadata Manager, Security Manager.
**6. Failure Handling:** Defaults to the most restrictive classification level if automated classification algorithms fail.
**7. Security Considerations:** A file classified as "Restricted" automatically overrides user-level sharing permissions, preventing accidental external exposure.
**8. Storage Strategy:** Can dictate physical storage routing (e.g., Restricted files must be stored on local NAS, while Internal files can go to AWS S3).
**9. Future Extensibility:** AI-driven automated classification, utilizing Natural Language Processing (NLP) to read document contents and auto-tag them as "Confidential/Financial".

---

### 4.8 Sharing Manager
**1. Purpose:** Facilitate secure collaboration within and outside the platform.
**2. Responsibilities:** Generate shareable links, manage time-limited access, enforce password protection on shared links, and revoke access.
**3. Inputs:** Share Requests (Target Audience, Expiration, Access Level).
**4. Outputs:** Share Tokens, Secure URLs.
**5. Dependencies:** Permission Manager, Security Manager.
**6. Failure Handling:** Automatically invalidates sharing links if the underlying file is deleted or moved to a restricted classification.
**7. Security Considerations:** Share tokens are cryptographically secure and distinct from standard authentication tokens, enabling fine-grained audit tracking of external access.
**8. Storage Strategy:** N/A (Operates at the access logic layer).
**9. Future Extensibility:** Integration with external Identity Providers (IdP) to require external guests to authenticate via Google or Microsoft before viewing a shared file.

---

### 4.9 Permission Manager
**1. Purpose:** Enforce access control boundaries for all file operations.
**2. Responsibilities:** Evaluate user roles, ownership, folder inheritance, and classification rules to grant or deny read/write/delete capabilities.
**3. Inputs:** User Context, File/Folder ID, Requested Action.
**4. Outputs:** Authorization Decision (Allow/Deny).
**5. Dependencies:** Core Authentication/Permission Engine.
**6. Failure Handling:** Fail-closed architecture; defaults to "Deny" if any part of the permission resolution chain times out or fails.
**7. Security Considerations:** The absolute gatekeeper of the File Engine. Prevents Broken Access Control vulnerabilities (e.g., User A iterating file IDs to view User B's files).
**8. Storage Strategy:** Permission rules are cached in-memory for high performance during bulk file listing operations.
**9. Future Extensibility:** Attribute-Based Access Control (ABAC) allowing rules like "Only teachers from the Science department can view this folder during school hours."

---

### 4.10 Preview Manager
**1. Purpose:** Provide immediate visual context without requiring full file downloads.
**2. Responsibilities:** Generate thumbnails for images, transcode videos into web-friendly streams, and convert complex documents (Word, Excel) into secure, viewable HTML or PDF renditions.
**3. Inputs:** Raw Binary Streams, MIME Types.
**4. Outputs:** Web-optimized Preview Artifacts (Thumbnails, PDFs).
**5. Dependencies:** Storage Manager.
**6. Failure Handling:** Returns a generic "Preview Unavailable" placeholder icon if format conversion fails, without impacting the integrity of the original file.
**7. Security Considerations:** Previews are generated in isolated, ephemeral sandboxes to prevent malicious files (e.g., macro-infected Word docs) from compromising the host server during conversion.
**8. Storage Strategy:** Preview artifacts are stored in a designated, highly ephemeral cache bucket and are not subject to the same rigorous backup requirements as the original files.
**9. Future Extensibility:** Interactive 3D model previews (e.g., for engineering or architecture classes) and streaming audio waveforms.

---

### 4.11 Validation Manager
**1. Purpose:** Ensure the integrity and safety of incoming files.
**2. Responsibilities:** Enforce maximum file size limits, detect true MIME types (ignoring user-provided file extensions), detect exact duplicates via cryptographic hashing (e.g., SHA-256), and provide integration points for external anti-virus scanning.
**3. Inputs:** Incoming Binary Streams, File Signatures.
**4. Outputs:** Validation Status (Pass/Fail), File Hash.
**5. Dependencies:** None.
**6. Failure Handling:** Rejects the upload if validation checks timeout, ensuring no unverified file enters the system.
**7. Security Considerations:** Defends against malicious payload uploads (e.g., an executable `.exe` disguised as a `.pdf`).
**8. Storage Strategy:** Deduplication strategy: if a hash matches an existing file, the Storage Manager can point to the existing physical binary, saving massive amounts of storage space.
**9. Future Extensibility:** Integration with ICAP (Internet Content Adaptation Protocol) to route all uploads through enterprise Data Loss Prevention (DLP) and Malware scanning appliances.

---

### 4.12 Archive Manager
**1. Purpose:** Manage the transition of active files to cold storage to optimize costs.
**2. Responsibilities:** Identify files eligible for archiving (based on Retention Manager policies), coordinate the move to cheaper storage tiers (e.g., AWS Glacier), and update metadata statuses.
**3. Inputs:** Archive Triggers, File References.
**4. Outputs:** Archived Storage URIs.
**5. Dependencies:** Storage Manager, Metadata Manager.
**6. Failure Handling:** Retains the file in active storage until the archive process is confirmed 100% successful.
**7. Security Considerations:** Ensures archival storage maintains the same (or stronger) encryption at rest as active storage.
**8. Storage Strategy:** Moves data from high-IOPS, expensive storage (Hot) to low-IOPS, cheap, long-retrieval-time storage (Cold).
**9. Future Extensibility:** Immutable WORM (Write Once, Read Many) archival compliance for legal hold mandates.

---

### 4.13 Storage Manager
**1. Purpose:** Abstract the physical persistence layer from the logical File Engine.
**2. Responsibilities:** Implement adapter patterns for various cloud and on-premise storage providers (S3, GCS, Azure, NAS), handling the specific SDK interactions, byte writing, and deleting.
**3. Inputs:** Binary Streams, Provider Configuration, Storage Keys.
**4. Outputs:** Physical Write/Read Confirmations.
**5. Dependencies:** Underlying Infrastructure SDKs.
**6. Failure Handling:** Implements exponential backoff and retries for transient cloud provider network errors.
**7. Security Considerations:** Injects server-side encryption keys into the cloud provider API calls to ensure data is encrypted at the storage layer.
**8. Storage Strategy:** Highly extensible. Allows the School OS to be deployed on any cloud or on-premise without rewriting a single line of core File Engine logic.
**9. Future Extensibility:** Policy-based storage routing (e.g., automatically storing video files on AWS S3 while storing highly sensitive financial PDFs on a local, on-premise NAS).

---

### 4.14 Security Manager
**1. Purpose:** Protect the confidentiality and authenticity of stored assets.
**2. Responsibilities:** Manage Encryption Keys (KMS integration), enforce Encryption at Rest and Encryption in Transit, and prepare payloads for digital signing (e.g., applying cryptographic signatures to official school transcripts).
**3. Inputs:** Raw Binaries, Cryptographic Keys.
**4. Outputs:** Encrypted Binaries, Digital Signatures.
**5. Dependencies:** Platform Cryptography Service.
**6. Failure Handling:** Halts upload/download immediately if encryption/decryption keys are unreachable.
**7. Security Considerations:** Ensures that even if the physical storage medium (e.g., an S3 bucket) is compromised, the files remain unreadable without the platform's KMS.
**8. Storage Strategy:** Operates as a stream transformer directly between the Upload/Download Managers and the Storage Manager.
**9. Future Extensibility:** Client-side encryption (End-to-End Encryption), where the platform server itself never possesses the keys to decrypt the files.

---

### 4.15 Retention Manager
**1. Purpose:** Automate data lifecycle and regulatory compliance.
**2. Responsibilities:** Enforce time-based rules (e.g., "Purge student disciplinary records 3 years after graduation", "Archive financial invoices after 1 year").
**3. Inputs:** Retention Policies, File Metadata.
**4. Outputs:** Archive/Purge Commands.
**5. Dependencies:** Platform Scheduler Engine, Archive Manager.
**6. Failure Handling:** Fails safe by *not* deleting data if rule evaluation encounters an error.
**7. Security Considerations:** Deletions triggered by the Retention Manager are executed as permanent, secure wipes (crypto-shredding) to meet legal compliance.
**8. Storage Strategy:** Continuously cleans up the storage mediums, drastically reducing overall enterprise storage costs.
**9. Future Extensibility:** "Legal Hold" functionality, allowing legal teams to temporarily freeze the retention policies of specific files during ongoing litigation.

---

### 4.16 Restore Manager
**1. Purpose:** Recover files from cold storage, archives, or temporary trash.
**2. Responsibilities:** Manage the re-hydration process of archived files (which may take hours depending on the cold storage provider) and handle undelete operations from the soft-delete "Trash" state.
**3. Inputs:** Restore Requests, File Identifiers.
**4. Outputs:** Restored File Availability Notifications.
**5. Dependencies:** Archive Manager, Storage Manager, Platform Notification Engine.
**6. Failure Handling:** Provides transparent user updates if a cloud provider's cold-storage retrieval fails or is delayed.
**7. Security Considerations:** Validates that the user requesting the restore has current authorization, which may have changed since the file was originally archived.
**8. Storage Strategy:** Moves physical binaries from Cold storage back to Hot active storage.
**9. Future Extensibility:** Automated disaster recovery orchestration, allowing the system to seamlessly failover to a backup region's Storage Manager.

---

### 4.17 Shared Components
**1. Purpose:** Provide standard definitions and utilities for file processing.
**2. Responsibilities:** House standard MIME type maps, extension dictionaries, chunking utilities, standard DTOs (Data Transfer Objects), and generic interfaces (e.g., `IStorageProvider`).
**3. Inputs:** N/A (Library level).
**4. Outputs:** Reusable Enums, Types, Interfaces.
**5. Dependencies:** None.
**6. Failure Handling:** N/A.
**7. Security Considerations:** Centralized dictionary ensures malicious file extensions are globally recognized and blocked.
**8. Storage Strategy:** N/A.
**9. Future Extensibility:** Publishing the storage interfaces as an SDK so that third-party vendors can write plugins for proprietary on-premise storage hardware.

---

## 5. Global Architecture Alignment

### 5.1 Responsibilities
The File Engine is the physical librarian of the platform. It knows *how* to store a file securely and *how* to retrieve it quickly. It relies entirely on the business modules to determine *why* a file exists and the Permission Engine to determine *who* can see it. 

### 5.2 Dependencies
Depends *inwardly* on the Core Security and Event Bus. Depends *horizontally* on the Notification Engine (for share alerts) and Scheduler Engine (for retention sweeps). Business modules depend on the File Engine, never the reverse.

### 5.3 Risks
*   **Storage Cost Explosion:** Unmanaged video uploads or infinitely duplicated files. *Mitigation:* The Validation Manager's deduplication hashing and the Retention Manager's aggressive lifecycle policies.
*   **Malware Distribution:** The File Engine being used to host viruses. *Mitigation:* The Validation Manager is architected to seamlessly pass all streams through enterprise Anti-Virus (ICAP) before persisting.

### 5.4 Migration Strategy
Legacy files stored in direct database BLOBS or unmanaged local drives will be migrated via background scripts. The scripts will upload the files through the File Engine's standard API, extracting metadata, generating hashes, and assigning logical folders, effectively normalizing the chaotic legacy data into the governed ECM structure.

### 5.5 Future Extensibility
The abstraction of the `Storage Manager` ensures that if the school outgrows local NAS and moves to Google Cloud Storage (or vice versa), the transition requires zero code changes in the Academic, Finance, or UI layers—only a configuration change in the File Engine.
