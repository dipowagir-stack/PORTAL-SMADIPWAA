# School Organization Module Architecture

## 1. Analysis
The Organization Module is the foundational root business module of the Enterprise School Management Platform (School OS). It defines the overarching identity, physical topology, logical hierarchy, and governance structure of the educational institution. Every other business module (Academic, HR, Finance, Admissions) relies intrinsically on the Organization Module to establish context (e.g., "Which campus is this invoice for?", "Which department does this teacher report to?"). It manages the complex graphs of multi-trust, multi-school, and multi-campus environments, operating entirely independently of the database schema, UI, and external AI providers.

## 2. Core Business Entities
*   **Organization:** The highest-level legal or administrative entity (e.g., a School District, a Charter Management Organization, or a University Trust).
*   **School:** An individual educational institution operating under the Organization.
*   **Campus:** A distinct physical or virtual location where the School operates. A School may have multiple Campuses.
*   **Division:** A major academic or administrative grouping within a School (e.g., "Upper School", "Lower School", "Operations").
*   **Department:** A functional academic or administrative grouping (e.g., "Science Department", "Human Resources").
*   **Unit:** A smaller, specialized operational team or group within a Department (e.g., "Biology Unit", "Payroll Unit").
*   **Role:** A generic job description or function (e.g., "Senior Teacher", "IT Administrator").
*   **Position:** A specific, headcount-tracked seat within the organizational chart (e.g., "Head of Science - Post 1"), which a Role fulfills.
*   **Committee:** A cross-functional governance or advisory body composed of individuals from various departments (e.g., "Disciplinary Committee", "Curriculum Board").
*   **Accreditation:** Formal certification or licensing information granted by an external educational authority.
*   **Organization Policy:** High-level institutional rules that govern operations across the organization.
*   **Organization Calendar:** The master operational calendar defining academic years, fiscal years, and institutional holidays.
*   **Organization Contact:** Official public or internal communication details for the organization or its sub-entities.
*   **Organization Branding:** Logos, color palettes, and visual identity markers specific to the organization or school.

## 3. Business Workflows
*   **Register Organization:** The initial onboarding workflow to establish the root legal entity, tax ID, and primary contact.
*   **Create School:** Provisioning a new school under a parent organization, establishing its initial metadata and branding.
*   **Create Campus:** Defining a physical location, linking it to a school, and setting its capacity and contact details.
*   **Create Department:** Establishing a functional grouping and linking it to a parent Division or School.
*   **Assign Position:** Creating a specific headcount slot within a department and mapping it to a reporting line (parent position).
*   **Create Organization Structure:** Linking divisions, departments, and positions into a cohesive, valid, acyclic directed graph (Org Chart).
*   **Update Organization Profile:** Modifying the core metadata, branding, or legal information of an existing entity.
*   **Manage Accreditation:** Submitting, tracking, and renewing institutional licenses and accreditations.
*   **Manage Organization Calendar:** Defining the start/end dates of terms, fiscal years, and institutional closures.
*   **Archive Organization:** Safely suspending and archiving an organizational entity, triggering downstream cascades to freeze linked academic and financial operations.

## 4. Business Rules
*   **Organizational Hierarchy:** The structure must form a valid Directed Acyclic Graph (DAG). Circular reporting lines (e.g., A reports to B, B reports to A) are strictly prohibited.
*   **Parent-Child Relationships:** A Campus must belong to exactly one School. A School must belong to exactly one Organization.
*   **Organizational Status:** An entity cannot be marked "Active" if its parent is "Suspended" or "Archived".
*   **Active/Inactive Structures:** Deactivating a Department automatically flags all child Units and Positions as inactive or pending reassignment.
*   **Position Assignments:** A single Position can only have one direct line manager (Position), but can have multiple dotted-line matrix managers.
*   **Organization Lifecycle:** Archiving an organization requires a full compliance audit and verification that no active students or ongoing financial periods exist.
*   **Multi-Campus Governance:** Resources can be shared across campuses, but a primary home campus must be defined for compliance reporting.
*   **Multi-School Governance:** Schools within the same Organization can share branding and policies but must maintain distinct legal and accreditation profiles.

## 5. Events
*   **Events Produced:** `OrganizationRegisteredEvent`, `SchoolCreatedEvent`, `CampusStatusChangedEvent`, `DepartmentMovedEvent`, `PositionCreatedEvent`, `OrgStructureUpdatedEvent`, `AccreditationRenewedEvent`, `OrganizationArchivedEvent`.
*   **Events Consumed:** `TenantProvisionedEvent` (from Core Engine), `FinancialYearClosedEvent` (from Finance Module), `ComplianceAuditCompletedEvent` (from Audit Engine).
*   **Event Dependencies:** The Organization Module sits at the root of the event chain. Almost all other modules (Academic, HR, Finance) strictly depend on `*CreatedEvent` and `*StatusChangedEvent` from this module to build their own local contexts.

## 6. Organization Module Components

---

### 6.1 Organization Manager
**1. Purpose:** Manage the root institutional entity.
**2. Responsibilities:** Handle the registration, profile updates, and overall status of the highest-level legal entity (e.g., The School District).
**3. Business Features:** Profile Management, Multi-organization switching, Status Tracking.
**4. Inputs:** Organization Registration Payloads, Profile Updates.
**5. Outputs:** Organization Contexts, Status Confirmations.
**6. Dependencies:** Lifecycle Manager.
**7. Business Rules:** There must always be at least one active Organization per tenant.
**8. Events:** Publishes `OrganizationRegisteredEvent`, `OrganizationProfileUpdatedEvent`.
**9. Security Considerations:** Access is strictly limited to Super Administrators and Legal Compliance Officers.
**10. Future Extensibility:** Support for Mergers & Acquisitions (M&A) to merge two distinct Organizations into a single unified trust.

---

### 6.2 School Manager
**1. Purpose:** Manage individual educational institutions.
**2. Responsibilities:** Create, update, and manage the metadata and operational status of Schools under an Organization.
**3. Business Features:** School Profile, Principal Assignment, School Type Mapping (e.g., K-12, Higher Ed).
**4. Inputs:** School Metadata, Parent Organization IDs.
**5. Outputs:** School Entities.
**6. Dependencies:** Organization Manager.
**7. Business Rules:** A School inherits the global policies of its parent Organization unless explicitly overridden.
**8. Events:** Publishes `SchoolCreatedEvent`, `SchoolStatusChangedEvent`.
**9. Security Considerations:** Segregates data so that a Principal of School A cannot manage metadata for School B.
**10. Future Extensibility:** Virtual Schools management for purely online, non-geographically bound educational entities.

---

### 6.3 Campus Manager
**1. Purpose:** Manage the physical footprint of the institution.
**2. Responsibilities:** Track physical or virtual locations, addresses, geographic coordinates, and campus capacities.
**3. Business Features:** Location Tracking, Capacity Management, Campus Resource Allocation.
**4. Inputs:** Campus Details, Geo-coordinates, Capacity Limits.
**5. Outputs:** Campus Entities, Capacity Reports.
**6. Dependencies:** School Manager.
**7. Business Rules:** A Campus cannot have an active status if its parent School is inactive.
**8. Events:** Publishes `CampusCreatedEvent`, `CampusCapacityUpdatedEvent`.
**9. Security Considerations:** Protects sensitive campus infrastructure metadata from unauthorized exposure.
**10. Future Extensibility:** Integration with GIS (Geographic Information Systems) for real-time campus mapping and transportation routing.

---

### 6.4 Department Manager
**1. Purpose:** Group functional operational capabilities.
**2. Responsibilities:** Define and manage academic (e.g., Mathematics) and administrative (e.g., Finance) departments.
**3. Business Features:** Department Creation, Head of Department Designation, Cost Center Mapping.
**4. Inputs:** Department Profiles, Parent Entity IDs.
**5. Outputs:** Department Entities.
**6. Dependencies:** Organization Structure Manager.
**7. Business Rules:** Departments must be mapped to a valid cost center for financial tracking.
**8. Events:** Publishes `DepartmentCreatedEvent`, `DepartmentHeadChangedEvent`.
**9. Security Considerations:** Department-level data visibility boundaries for reporting.
**10. Future Extensibility:** Cross-school collaborative departments (e.g., a shared IT department servicing multiple schools).

---

### 6.5 Division Manager
**1. Purpose:** Manage macro-groupings within a school.
**2. Responsibilities:** Handle large logical partitions like "Elementary School", "Middle School", or "Faculty of Arts".
**3. Business Features:** Division Setup, Division Leadership Assignment, Age/Grade Range Mapping.
**4. Inputs:** Division Contexts, Grade Boundaries.
**5. Outputs:** Division Entities.
**6. Dependencies:** School Manager.
**7. Business Rules:** Divisions cannot logically overlap their grade ranges within the same school context.
**8. Events:** Publishes `DivisionCreatedEvent`.
**9. Security Considerations:** Division heads receive aggregated visibility across all child departments.
**10. Future Extensibility:** Dynamic division restructuring (e.g., splitting a Middle School into Junior High based on fluctuating enrollment).

---

### 6.6 Unit Manager
**1. Purpose:** Manage micro-groupings within a department.
**2. Responsibilities:** Track small, specialized teams (e.g., "Special Education Unit" within the "Academics Department").
**3. Business Features:** Unit Creation, Team Lead Assignment, Specialized Resource Allocation.
**4. Inputs:** Unit Definitions, Parent Department IDs.
**5. Outputs:** Unit Entities.
**6. Dependencies:** Department Manager.
**7. Business Rules:** A Unit must be wholly contained within a single Department.
**8. Events:** Publishes `UnitCreatedEvent`.
**9. Security Considerations:** Granular access controls for specialized units handling sensitive data (e.g., Counseling Unit).
**10. Future Extensibility:** Agile, pop-up task forces or temporary units that auto-dissolve after a project completes.

---

### 6.7 Position Manager
**1. Purpose:** Manage the discrete headcount slots within the institution.
**2. Responsibilities:** Create positions, define FTE (Full-Time Equivalent) values, and establish line-management relationships (who reports to whom).
**3. Business Features:** Position Control, Reporting Lines (Direct/Dotted), Vacancy Tracking.
**4. Inputs:** Position Definitions, FTE Values, Parent Position IDs.
**5. Outputs:** Position Graph Nodes, Vacancy Reports.
**6. Dependencies:** Organization Structure Manager.
**7. Business Rules:** Total active FTEs cannot exceed the approved budget mapping for the department.
**8. Events:** Publishes `PositionCreatedEvent`, `PositionVacancyStatusChangedEvent`.
**9. Security Considerations:** Access to view vacant position budgets is restricted to Finance and HR.
**10. Future Extensibility:** Dynamic position reallocation based on AI predictions of student enrollment shifts.

---

### 6.8 Role Manager
**1. Purpose:** Define standard job functions.
**2. Responsibilities:** Manage generic job descriptions, required competencies, and default system access templates for roles (e.g., "All 'Senior Teachers' require Gradebook access").
**3. Business Features:** Role Definition, Competency Mapping, Template Assignment.
**4. Inputs:** Role Contexts, Competency Requirements.
**5. Outputs:** Role Entities.
**6. Dependencies:** Platform Security Engine (for capability mapping).
**7. Business Rules:** A Role defines *what* the job is; a Position defines *where* it sits in the chart.
**8. Events:** Publishes `RoleCreatedEvent`, `RoleRequirementsUpdatedEvent`.
**9. Security Considerations:** Role definitions tie deeply into the platform's RBAC (Role-Based Access Control) matrix.
**10. Future Extensibility:** Integration with external HR competency frameworks (e.g., national teaching standards APIs).

---

### 6.9 Committee Manager
**1. Purpose:** Manage cross-functional governance structures.
**2. Responsibilities:** Define standing or ad-hoc committees, track membership across different departments, and manage committee leadership.
**3. Business Features:** Committee Formation, Member Nomination, Term Limits, Voting Rights Definitions.
**4. Inputs:** Committee Charters, Member IDs, Term Dates.
**5. Outputs:** Committee Entities, Roster Lists.
**6. Dependencies:** Shared Identity & Profile Capability (to fetch members).
**7. Business Rules:** Members can span multiple schools, but a committee must be owned by a specific Organization or School.
**8. Events:** Publishes `CommitteeFormedEvent`, `CommitteeMemberAddedEvent`.
**9. Security Considerations:** Committee rosters and charters may be restricted (e.g., a confidential ethics committee).
**10. Future Extensibility:** Automated tracking of committee quorum for official voting, integrated with the Platform Decision Engine.

---

### 6.10 Organization Structure Manager
**1. Purpose:** Maintain the integrity of the organizational graph.
**2. Responsibilities:** Validate all relationships (School -> Division -> Department -> Unit -> Position), detect circular dependencies, and generate the final Org Chart.
**3. Business Features:** Graph Validation, Cycle Detection, Hierarchy Visualization Data, Re-org Sandboxing.
**4. Inputs:** Relationship Edges, Node Movements.
**5. Outputs:** Validated Acyclic Graphs, Org Chart Payloads.
**6. Dependencies:** All Entity Managers.
**7. Business Rules:** Moving a parent node moves all child nodes; cyclical reporting is rejected.
**8. Events:** Publishes `OrganizationStructureValidatedEvent`, `MassReorganizationExecutedEvent`.
**9. Security Considerations:** Prevents unauthorized users from altering reporting lines to bypass approval workflows.
**10. Future Extensibility:** "What-If" organizational restructuring capabilities with visual drag-and-drop prior to committing changes.

---

### 6.11 Policy Manager
**1. Purpose:** Centralize institutional governance documents.
**2. Responsibilities:** Store, version, and distribute overarching school policies (e.g., "Code of Conduct", "Data Retention Policy") to the Business Policy Registry.
**3. Business Features:** Policy Versioning, Applicability Scoping (e.g., "Applies to High School only"), Ratification Tracking.
**4. Inputs:** Policy Documents, Scope Parameters.
**5. Outputs:** Active Policies.
**6. Dependencies:** Platform Knowledge Engine, Shared Document Management.
**7. Business Rules:** A policy must be formally ratified before it can be enforced by the Decision Engine.
**8. Events:** Publishes `OrganizationPolicyRatifiedEvent`.
**9. Security Considerations:** Immutable history of policy changes to prove compliance during legal disputes.
**10. Future Extensibility:** AI-driven policy conflict detection (e.g., flagging if a new campus policy contradicts a district-level policy).

---

### 6.12 Branding Manager
**1. Purpose:** Govern the visual identity of the institution.
**2. Responsibilities:** Manage logos, mottos, school colors, and mascots, providing these assets to the Shared Branding Management capability for UI rendering.
**3. Business Features:** Brand Asset Management, Sub-branding (e.g., Athletics Logo vs Academic Logo).
**4. Inputs:** Brand Assets, HEX Colors, Typography Selections.
**5. Outputs:** Brand Configuration Packages.
**6. Dependencies:** Platform Media Engine.
**7. Business Rules:** Schools can have distinct branding from their parent Organization, but must fall within approved identity guidelines.
**8. Events:** Publishes `BrandingUpdatedEvent`.
**9. Security Considerations:** Prevents unauthorized alteration of public-facing institutional imagery.
**10. Future Extensibility:** Dynamic brand swapping based on institutional events (e.g., automatically applying a "Centennial Anniversary" brand package).

---

### 6.13 Contact Manager
**1. Purpose:** Maintain authoritative communication channels.
**2. Responsibilities:** Manage the official phone numbers, addresses, support emails, and emergency contacts for the Organization, Schools, and Campuses.
**3. Business Features:** Official Directory, Emergency Contact Lists, Social Media Links.
**4. Inputs:** Contact Details, Communication Preferences.
**5. Outputs:** Validated Contact Records.
**6. Dependencies:** Platform Data Validation Service.
**7. Business Rules:** Every Campus must have at least one verified emergency contact number.
**8. Events:** Publishes `OrganizationContactUpdatedEvent`.
**9. Security Considerations:** Distinguishes between public directory info and internal emergency-only contacts.
**10. Future Extensibility:** Integration with national emergency broadcast systems for automated data synchronization.

---

### 6.14 Accreditation Manager
**1. Purpose:** Safeguard the institution's license to operate.
**2. Responsibilities:** Track accreditation bodies, license numbers, audit dates, and renewal deadlines for the Organization and specific Schools.
**3. Business Features:** License Tracking, Renewal Reminders, Accreditation Body Mapping.
**4. Inputs:** Accreditation Certificates, Validity Dates.
**5. Outputs:** Compliance Statuses, Expiry Alerts.
**6. Dependencies:** Platform Scheduler Engine (for reminders), File Engine (for certificates).
**7. Business Rules:** If a mandatory accreditation expires, the School's status is automatically flagged as "Non-Compliant".
**8. Events:** Publishes `AccreditationExpiringWarningEvent`, `AccreditationRenewedEvent`.
**9. Security Considerations:** Accreditation records are immutable and heavily audited.
**10. Future Extensibility:** Direct API integration with State/National Department of Education portals for automated license verification.

---

### 6.15 Legal Information Manager
**1. Purpose:** Manage the legal and financial foundational data.
**2. Responsibilities:** Store Tax IDs, Incorporation Dates, Board of Directors information, and Legal Entity structures.
**3. Business Features:** Tax ID Management, Entity Type Classification (e.g., Non-Profit, For-Profit), Legal Address Tracking.
**4. Inputs:** Legal Documents, Registration Numbers.
**5. Outputs:** Legal Entity Contexts.
**6. Dependencies:** File Engine.
**7. Business Rules:** Legal information changes require maximum-level approval workflows and audit trails.
**8. Events:** Publishes `LegalInformationUpdatedEvent`.
**9. Security Considerations:** Highly restricted access; data is encrypted at rest.
**10. Future Extensibility:** Smart contract integration for automated, legally binding inter-trust agreements.

---

### 6.16 Organization Calendar Manager
**1. Purpose:** Define the macro-level temporal structure of the institution.
**2. Responsibilities:** Establish the Master Academic Year (e.g., 2026-2027), Fiscal Year boundaries, and Global Institution Holidays.
**3. Business Features:** Academic Year Generation, Term/Semester Boundaries, Master Holiday Overrides.
**4. Inputs:** Date Ranges, Holiday Schedules.
**5. Outputs:** Master Calendar Contexts.
**6. Dependencies:** Shared Calendar Management Capability.
**7. Business Rules:** Academic terms cannot overlap; financial transactions must map to an active Fiscal Year.
**8. Events:** Publishes `AcademicYearStartedEvent`, `InstitutionalHolidayDeclaredEvent`.
**9. Security Considerations:** Calendar manipulation can impact payroll and grading; restricted to top-level administration.
**10. Future Extensibility:** Automated generation of the academic calendar based on mandated state instructional minute requirements via the AI Engine.

---

### 6.17 Lifecycle Manager
**1. Purpose:** Govern the state transitions of organizational entities.
**2. Responsibilities:** Safely orchestrate the Activation, Suspension, or Archiving of Schools, Campuses, or the entire Organization, ensuring all dependencies are handled.
**3. Business Features:** State Machine Orchestration, Dependency Checking, Archive Dry-Runs.
**4. Inputs:** Lifecycle Transition Requests.
**5. Outputs:** State Transition Confirmations.
**6. Dependencies:** All Entity Managers, Platform Workflow Engine.
**7. Business Rules:** An entity cannot be archived if it contains active child entities or active financial ledgers.
**8. Events:** Publishes `OrganizationSuspendedEvent`, `SchoolArchivedEvent`.
**9. Security Considerations:** Highest risk operations in the module; requires cryptographic signature confirmation.
**10. Future Extensibility:** Automated "Mothballing" of inactive campuses, seamlessly triggering physical facility shutdown workflows in external IoT systems.

---

### 6.18 Shared Components
**1. Purpose:** Standardize internal module DNA.
**2. Responsibilities:** Provide the base Enums (e.g., `OrgStatus`, `AccreditationType`), DTOs, and value objects used across the Organization managers.
**3. Business Features:** Common Utilities, Address Standardization, ID Generation.
**4. Inputs:** N/A.
**5. Outputs:** Reusable Code Structures.
**6. Dependencies:** None.
**7. Business Rules:** Enforces strict domain validation on basic types (e.g., standardizing international phone number formats).
**8. Events:** N/A.
**9. Security Considerations:** Centralized sanitization of all module inputs.
**10. Future Extensibility:** Extraction into an open-source library for educational institutions to define standard organizational topologies globally.
