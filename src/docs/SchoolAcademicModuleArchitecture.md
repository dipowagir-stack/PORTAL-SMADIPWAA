# School Academic Module Architecture

## 1. Analysis
The Academic Module is the central business engine responsible for modeling the educational logic of the School OS. It defines the abstract structures of what is taught (Curricula, Subjects, Competencies), when it is taught (Academic Years, Semesters, Assessment Periods), and how the delivery is organized (Classes, Programs, Teaching Assignments). It is distinctly *not* a Learning Management System (LMS)—it does not handle the daily delivery of e-learning content or student homework submissions. Instead, it provides the rigid academic frameworks, graduation requirements, and overarching policies that downstream operational systems (like Timetabling, Grading, and LMS integrations) rely upon. It consumes data from the Organization Module to map these academic structures to physical campuses and administrative departments.

## 2. Core Business Entities
*   **Academic Year:** The primary temporal container representing a full cycle of instruction (e.g., "2026-2027"). All academic operations occur within this context.
*   **Semester:** A subdivision of the Academic Year (e.g., "Fall Semester", "Trimester 1") defining distinct grading and enrollment periods.
*   **Curriculum:** The overarching blueprint of educational content, detailing the structural requirements for a course of study.
*   **Curriculum Version:** A specific, immutable snapshot of a Curriculum for a given time period, allowing historical tracking of educational changes.
*   **Program:** A structured sequence of study leading to a specific qualification or outcome (e.g., "International Baccalaureate Diploma", "Associate of Arts").
*   **Major:** A specialized area of focus within a broader Program.
*   **Grade Level:** The standard chronological or developmental cohort placement for students (e.g., "Grade 10", "Sophomore").
*   **Class:** A specific instance of a Subject being taught to a group of students (e.g., "Biology 101 - Section A").
*   **Homeroom:** An administrative grouping of students for pastoral care, attendance, and general announcements, separate from subject-specific classes.
*   **Subject:** A distinct area of knowledge or discipline offered for study (e.g., "Advanced Calculus").
*   **Subject Group:** A logical categorization of Subjects (e.g., "Natural Sciences", "Electives") used for curriculum structuring.
*   **Teaching Assignment:** The linkage between a Teacher (from the Organization/HR module), a Class, and their specific instructional load/responsibilities.
*   **Academic Calendar:** The operational timeline defining instructional days, holidays, and crucial academic deadlines.
*   **Competency:** A specific, measurable skill or knowledge area a student is expected to master.
*   **Learning Outcome:** The defined behavioral or academic result expected at the end of a learning period, mapped to Competencies.
*   **Assessment Period:** A designated time frame during which formal evaluations (mid-terms, finals) are conducted and recorded.
*   **Graduation Requirement:** The definitive set of rules (credits, specific subjects, community service hours) a student must fulfill to complete a Program.
*   **Academic Policy:** The institutional rules governing academic integrity, grading scales, attendance thresholds, and promotion criteria.

## 3. Business Workflows
*   **Create Academic Year:** Defining the boundaries, name, and overarching structure of a new academic cycle before it begins.
*   **Open Academic Year:** The formal transition of an Academic Year into an "Active" state, enabling enrollment and grading operations.
*   **Close Academic Year:** The rigorous process of finalizing all grades, generating transcripts, and locking the year from further edits.
*   **Create Semester:** Defining sub-terms within the Academic Year, allocating instructional weeks and assessment periods.
*   **Configure Curriculum:** Assembling Subjects, Subject Groups, and Learning Outcomes into a cohesive structural blueprint.
*   **Publish Curriculum:** Locking a Curriculum Version and making it available for Class generation and student enrollment.
*   **Create Class:** Instantiating a Subject for a specific term, defining its capacity, and linking it to a physical campus.
*   **Assign Homeroom Teacher:** Linking a pastoral staff member to a specific student cohort for administrative oversight.
*   **Assign Teaching Load:** Distributing classes among available faculty, ensuring union/contractual compliance regarding instructional hours.
*   **Configure Assessment Period:** Setting the start/end dates and lockdown rules for formal grading windows.
*   **Publish Academic Calendar:** Finalizing the instructional days and holidays, broadcasting the timeline to all stakeholders.
*   **Archive Academic Data:** Transitioning historical academic structures into a read-only state for compliance and longitudinal reporting.

## 4. Business Rules
*   **Academic Year Lifecycle:** Only one Academic Year can be "Active" at a time for a given School, though multiple can be in "Planning" or "Archived" states.
*   **Semester Lifecycle:** Semesters must fit entirely within the start and end dates of their parent Academic Year without overlapping.
*   **Curriculum Version Control:** Once a Curriculum Version is "Published" and active enrollments exist, it becomes strictly immutable; changes require a new Version.
*   **Class Creation:** A Class cannot be created for a Subject that is not part of the active Curriculum for that Academic Year.
*   **Subject Assignment:** Subjects must belong to at least one Subject Group and must be mapped to specific Grade Levels or Programs.
*   **Teacher Assignment:** A Teaching Assignment cannot exceed the maximum instructional FTE (Full-Time Equivalent) defined in the Organization module without explicit override approval.
*   **Graduation Requirement:** Requirements must be mathematically resolvable (e.g., "Student must achieve 120 credits across these 4 Subject Groups").
*   **Academic Calendar Conflicts:** Instructional days cannot be scheduled on dates marked as institutional holidays by the Organization Module.
*   **Academic Status:** Classes, Subjects, and Programs inherit the active/inactive status of their parent Academic Year.
*   **Academic Archive:** Archived academic data can never be deleted; it must be preserved indefinitely for transcript generation and audits.

## 5. Events
*   **Events Produced:** `AcademicYearCreatedEvent`, `AcademicYearOpenedEvent`, `AcademicYearClosedEvent`, `CurriculumPublishedEvent`, `ClassCreatedEvent`, `TeachingAssignmentCreatedEvent`, `AssessmentPeriodStartedEvent`, `GraduationRequirementUpdatedEvent`.
*   **Events Consumed:** `SchoolCreatedEvent` (from Organization Module), `TeacherHiredEvent` (from HR Module), `HolidayDeclaredEvent` (from Organization Module).
*   **Dependencies:** Heavily dependent on the Organization Module for spatial/administrative context (Schools, Departments, Positions) and the HR Module for personnel records. The Student Information System (SIS) and LMS are entirely dependent on events produced by this module.

## 6. Academic Module Components

---

### 6.1 Academic Year Manager
**1. Purpose:** Govern the primary temporal boundaries of education.
**2. Responsibilities:** Create, manage, and transition the states (Planning, Active, Closed, Archived) of Academic Years.
**3. Business Features:** Year Definition, State Machine Orchestration, Year-over-Year Rollover cloning.
**4. Inputs:** Date ranges, Naming conventions.
**5. Outputs:** Academic Year Contexts.
**6. Dependencies:** Organization Module (for School mapping).
**7. Business Rules:** Closing an Academic Year strictly prohibits any further retroactive grade alterations without a super-admin audit override.
**8. Events:** `AcademicYearCreatedEvent`, `AcademicYearStatusChangedEvent`.
**9. Security Considerations:** Closing a year is a destructive-equivalent action requiring multi-factor authentication and high-level approval.
**10. Future Extensibility:** Support for continuous, rolling academic years for self-paced or competency-based educational models.

---

### 6.2 Semester Manager
**1. Purpose:** Manage subdivisions of the Academic Year.
**2. Responsibilities:** Define Terms, Quarters, or Semesters, ensuring they align logically within the parent Academic Year.
**3. Business Features:** Term creation, Weighting (e.g., Semester 1 is 40% of Final Grade), Holiday exclusion calculation.
**4. Inputs:** Start/End dates, Term Types.
**5. Outputs:** Term/Semester boundaries.
**6. Dependencies:** Academic Year Manager.
**7. Business Rules:** Gaps between semesters are permitted, but overlapping semesters within the same programmatic track are invalid.
**8. Events:** `SemesterCreatedEvent`, `SemesterStatusChangedEvent`.
**9. Security Considerations:** Prevents unauthorized alteration of term dates which could artificially extend assessment periods.
**10. Future Extensibility:** Dynamic micro-mesters or intensive J-terms that can be spun up on demand.

---

### 6.3 Curriculum Manager
**1. Purpose:** Define the overarching educational blueprint.
**2. Responsibilities:** Group Subjects, set prerequisites, define credit values, and establish the structural map of what the school offers.
**3. Business Features:** Prerequisite Mapping, Credit Allocation, Subject Group linking.
**4. Inputs:** Curriculum Structures, Subject mappings.
**5. Outputs:** Curriculum Blueprints.
**6. Dependencies:** Subject Manager, Subject Group Manager.
**7. Business Rules:** A Curriculum must define a valid pathway; circular prerequisites (Subject A requires Subject B, which requires Subject A) are rejected.
**8. Events:** `CurriculumCreatedEvent`, `CurriculumUpdatedEvent`.
**9. Security Considerations:** Curriculum definitions represent the core intellectual property of the institution.
**10. Future Extensibility:** Integration with national/state curriculum standard APIs to automatically import mandated structural changes.

---

### 6.4 Curriculum Version Manager
**1. Purpose:** Maintain historical integrity of curricula.
**2. Responsibilities:** Snapshot curricula to ensure that a student who started in 2022 graduates based on the 2022 rules, even if the 2026 curriculum changes.
**3. Business Features:** Snapshotting, Version Diffing, Active Version toggling.
**4. Inputs:** Publish requests, Draft updates.
**5. Outputs:** Immutable Curriculum Versions.
**6. Dependencies:** Curriculum Manager.
**7. Business Rules:** A "Published" version cannot be edited. It can only be duplicated into a "Draft", modified, and published as a new version.
**8. Events:** `CurriculumVersionPublishedEvent`.
**9. Security Considerations:** Protects against retroactive alteration of graduation pathways.
**10. Future Extensibility:** AI-driven curriculum version comparisons to highlight skill gaps when transitioning students between versions.

---

### 6.5 Program Manager
**1. Purpose:** Manage structured sequences leading to qualifications.
**2. Responsibilities:** Define degree tracks, diploma programs, or certification pathways (e.g., "BSc Computer Science").
**3. Business Features:** Program Definition, Minimum/Maximum duration limits, Credential awarding rules.
**4. Inputs:** Program details, Curriculum mappings.
**5. Outputs:** Program Entities.
**6. Dependencies:** Curriculum Version Manager.
**7. Business Rules:** A Program must be attached to a specific published Curriculum Version to be offered to students.
**8. Events:** `ProgramCreatedEvent`, `ProgramStatusChangedEvent`.
**9. Security Considerations:** Programs must be tied to officially accredited offerings verified by the Organization Module.
**10. Future Extensibility:** Stackable micro-credentials that automatically roll up into larger Program completions.

---

### 6.6 Major Manager
**1. Purpose:** Manage specializations within Programs.
**2. Responsibilities:** Define concentrations, minors, or majors that dictate specific subset requirements within a broader Program.
**3. Business Features:** Major Declarations, Concentration pathways.
**4. Inputs:** Major definitions, Subject inclusions.
**5. Outputs:** Major Entities.
**6. Dependencies:** Program Manager.
**7. Business Rules:** A Major cannot require more credits than its parent Program's total allowable elective space.
**8. Events:** `MajorCreatedEvent`.
**9. Security Considerations:** Read-only access for students; write access restricted to Academic Deans.
**10. Future Extensibility:** Interdisciplinary majors that dynamically bridge requirements across two distinct Programs.

---

### 6.7 Grade Level Manager
**1. Purpose:** Manage cohort progressions.
**2. Responsibilities:** Define the chronological stepping stones of the institution (e.g., K-12, Freshman-Senior) and handle promotion logic metadata.
**3. Business Features:** Grade definition, Promotion criteria mapping, Age-range validation.
**4. Inputs:** Grade identifiers, Sequence indexing.
**5. Outputs:** Grade Level Entities.
**6. Dependencies:** Organization Module (for School Division mapping).
**7. Business Rules:** Grade Levels must form a strict, unbroken sequence for automated end-of-year promotion calculations.
**8. Events:** `GradeLevelCreatedEvent`.
**9. Security Considerations:** Prevents malicious reordering of the grade sequence.
**10. Future Extensibility:** Ungraded, competency-based progression levels that ignore age/time constraints entirely.

---

### 6.8 Class Manager
**1. Purpose:** Instantiate actionable learning groups.
**2. Responsibilities:** Create the actual sections/classes that students will attend, based on the blueprint of a Subject.
**3. Business Features:** Class Generation, Capacity Management, Room constraints.
**4. Inputs:** Subject IDs, Term IDs, Capacity Limits.
**5. Outputs:** Class Entities (Sections).
**6. Dependencies:** Subject Manager, Semester Manager.
**7. Business Rules:** A Class capacity cannot exceed the physical capacity of the room it is eventually timetabled in (enforced via constraints).
**8. Events:** `ClassCreatedEvent`, `ClassCapacityUpdatedEvent`.
**9. Security Considerations:** Class rosters are the primary boundary for student data privacy; tightly integrated with RBAC.
**10. Future Extensibility:** Automated auto-scaling of Classes—if demand exceeds capacity, automatically draft a new section and request a teacher.

---

### 6.9 Homeroom Manager
**1. Purpose:** Manage pastoral and administrative student groupings.
**2. Responsibilities:** Create groupings for daily attendance, announcements, and primary pastoral care, distinct from academic subject classes.
**3. Business Features:** Homeroom Creation, Pastoral Teacher assignment, House/Team mapping.
**4. Inputs:** Homeroom Names, Capacity.
**5. Outputs:** Homeroom Entities.
**6. Dependencies:** Grade Level Manager.
**7. Business Rules:** A student can only be active in one Homeroom per Academic Year.
**8. Events:** `HomeroomCreatedEvent`.
**9. Security Considerations:** Homeroom teachers are granted elevated pastoral viewing rights for their specific cohort.
**10. Future Extensibility:** Vertical homerooms that mix students from different grade levels for peer mentoring.

---

### 6.10 Subject Manager
**1. Purpose:** Define the core units of knowledge.
**2. Responsibilities:** Manage the catalog of all courses/subjects offered, including their descriptions, internal codes, and credit values.
**3. Business Features:** Subject Catalog, Code Generation (e.g., MATH101), Syllabus attachments.
**4. Inputs:** Subject Metadata, Credit Weights.
**5. Outputs:** Subject Entities.
**6. Dependencies:** None.
**7. Business Rules:** Subject codes must be universally unique across the entire Organization to prevent transcript collisions.
**8. Events:** `SubjectCreatedEvent`, `SubjectDeprecatedEvent`.
**9. Security Considerations:** Syllabus documents attached to subjects are scanned for malicious content via the File Engine.
**10. Future Extensibility:** Dynamic subject tagging via AI to map subjects to emerging global job market skills.

---

### 6.11 Subject Group Manager
**1. Purpose:** Categorize subjects for structural logic.
**2. Responsibilities:** Group subjects (e.g., "Humanities", "Core Sciences") to simplify graduation requirements (e.g., "Must take 3 subjects from Humanities").
**3. Business Features:** Group creation, Subject clustering.
**4. Inputs:** Group Names, Subject IDs.
**5. Outputs:** Subject Group Entities.
**6. Dependencies:** Subject Manager.
**7. Business Rules:** A Subject can belong to multiple groups, but cannot belong to mutually exclusive groups.
**8. Events:** `SubjectGroupCreatedEvent`.
**9. Security Considerations:** Standard taxonomy protection; locked to curriculum administrators.
**10. Future Extensibility:** Dynamic subject grouping based on vector-similarity of syllabus content using the Search Engine.

---

### 6.12 Teaching Assignment Manager
**1. Purpose:** Map instructional staff to Classes.
**2. Responsibilities:** Assign teachers to specific class sections, track primary vs. co-teachers, and calculate instructional load (FTE).
**3. Business Features:** Load Balancing, Co-teaching setup, Substitute assignment.
**4. Inputs:** Class IDs, Teacher/Position IDs.
**5. Outputs:** Assignment Records.
**6. Dependencies:** Class Manager, Organization Module (Position mapping).
**7. Business Rules:** A teacher's total assigned instructional hours across all classes cannot exceed their contracted maximum load.
**8. Events:** `TeachingAssignmentCreatedEvent`, `TeachingLoadExceededAlertEvent`.
**9. Security Considerations:** Teaching assignments act as the trigger to grant teachers access to student gradebooks.
**10. Future Extensibility:** AI-driven optimization to suggest the best teacher for a class based on historical student performance data.

---

### 6.13 Academic Calendar Manager
**1. Purpose:** Provide the operational heartbeat of the school.
**2. Responsibilities:** Define exact instructional days, term breaks, professional development days, and exam weeks.
**3. Business Features:** Day Type Definition (Instructional, Holiday, Exam), Calendar Publishing, Day-cycle mapping (e.g., A/B Days).
**4. Inputs:** Dates, Day Types.
**5. Outputs:** Operational Calendar.
**6. Dependencies:** Academic Year Manager, Organization Module (Global Calendar).
**7. Business Rules:** The total number of instructional days must meet or exceed the state-mandated minimum defined in Academic Policies.
**8. Events:** `AcademicCalendarPublishedEvent`.
**9. Security Considerations:** Prevents arbitrary deletion of instructional days which would violate compliance.
**10. Future Extensibility:** Integration with smart-campus IoT to adjust heating/cooling schedules based on the Academic Calendar.

---

### 6.14 Competency Manager
**1. Purpose:** Define granular skills and abilities.
**2. Responsibilities:** Manage the overarching framework of skills (e.g., "Critical Thinking", "Algebraic Manipulation") that transcend specific subjects.
**3. Business Features:** Competency Frameworks, Hierarchical skills, Rubric linking.
**4. Inputs:** Skill definitions, Framework structures.
**5. Outputs:** Competency Entities.
**6. Dependencies:** None.
**7. Business Rules:** Competencies must be versioned similarly to curricula to ensure historical grading integrity.
**8. Events:** `CompetencyCreatedEvent`.
**9. Security Considerations:** N/A.
**10. Future Extensibility:** Cross-mapping local competencies to global frameworks (e.g., OECD 21st Century Skills) via AI analysis.

---

### 6.15 Learning Outcome Manager
**1. Purpose:** Map macro-competencies to specific subjects.
**2. Responsibilities:** Define exactly what a student should be able to do upon completing a specific Subject or Program, mapped back to the Competency Framework.
**3. Business Features:** Outcome definitions, Competency mapping, Assessment weighting.
**4. Inputs:** Outcome Text, Subject ID, Competency IDs.
**5. Outputs:** Learning Outcome Entities.
**6. Dependencies:** Subject Manager, Competency Manager.
**7. Business Rules:** An outcome must map to at least one measurable assessment strategy.
**8. Events:** `LearningOutcomeDefinedEvent`.
**9. Security Considerations:** N/A.
**10. Future Extensibility:** Automated generation of formative assessment questions based on the text of the Learning Outcome.

---

### 6.16 Assessment Period Manager
**1. Purpose:** Govern formal grading windows.
**2. Responsibilities:** Define when teachers can enter grades (e.g., "Mid-Term Window"), when grades are locked, and when reports are generated.
**3. Business Features:** Window configuration, Lock/Unlock triggers, Grade visibility dates (when students can see them).
**4. Inputs:** Date/Time windows, Target Semesters.
**5. Outputs:** Assessment Period Contexts.
**6. Dependencies:** Semester Manager.
**7. Business Rules:** Grades cannot be entered or altered outside of an active Assessment Period without an audited override workflow.
**8. Events:** `AssessmentPeriodOpenedEvent`, `AssessmentPeriodLockedEvent`.
**9. Security Considerations:** Grade tampering prevention; strict audit logging on all actions outside the active window.
**10. Future Extensibility:** Rolling assessment periods for continuous evaluation models.

---

### 6.17 Graduation Requirement Manager
**1. Purpose:** Define and calculate completion criteria.
**2. Responsibilities:** Maintain the complex rules engines that determine if a student has met all obligations to receive a diploma or certificate.
**3. Business Features:** Credit counting, Specific subject mandates, Non-academic requirements (e.g., Community Service), Progress tracking logic.
**4. Inputs:** Rule definitions (e.g., "Minimum 40 credits in Sciences").
**5. Outputs:** Requirement Blueprints, Evaluation Logic.
**6. Dependencies:** Program Manager, Subject Group Manager.
**7. Business Rules:** Requirements must account for transfer credits and waived courses seamlessly.
**8. Events:** `GraduationRequirementUpdatedEvent`.
**9. Security Considerations:** Prevents unauthorized lowering of graduation standards.
**10. Future Extensibility:** Predictive modeling using the Analytics Engine to forecast graduation rates and alert counselors to at-risk cohorts years in advance.

---

### 6.18 Academic Policy Manager
**1. Purpose:** Centralize academic governance rules.
**2. Responsibilities:** Store rules regarding academic probation thresholds, honor roll calculations, attendance minimums, and grading scales (e.g., A = 90-100%).
**3. Business Features:** Grading Scale definitions, GPA calculation formulas, Academic Standing rules.
**4. Inputs:** Formulas, Thresholds.
**5. Outputs:** Executable Policy Configurations.
**6. Dependencies:** Platform Rule Engine.
**7. Business Rules:** Changing a GPA formula cannot retroactively alter closed Academic Years; it only applies to the effective date forward.
**8. Events:** `AcademicPolicyUpdatedEvent`.
**9. Security Considerations:** Changes to grading scales require ultimate executive approval.
**10. Future Extensibility:** Multi-tenant policy inheritance, allowing a district to push a new grading scale to all 50 of its schools simultaneously.

---

### 6.19 Academic Archive Manager
**1. Purpose:** Preserve historical academic integrity.
**2. Responsibilities:** Handle the deep-freezing of Academic Years, Curricula, and Classes, optimizing them for read-only query performance (e.g., for alumni transcript generation).
**3. Business Features:** Data Freezing, Read-Only Optimization, Compliance retention.
**4. Inputs:** Close Academic Year Events.
**5. Outputs:** Archived Datasets.
**6. Dependencies:** Academic Year Manager.
**7. Business Rules:** Archived data is strictly immutable. If a legal challenge requires a grade change 5 years later, it is appended as an audited correction, not an overwrite.
**8. Events:** `AcademicDataArchivedEvent`.
**9. Security Considerations:** Ensures long-term storage complies with FERPA/GDPR data retention policies.
**10. Future Extensibility:** Integration with blockchain for issuing cryptographically verifiable historical transcripts.

---

### 6.20 Shared Components
**1. Purpose:** Standardize academic module DNA.
**2. Responsibilities:** Provide base Enums (e.g., `TermType`, `GradeScaleType`), generic DTOs, and common validation utilities used across the module.
**3. Business Features:** Credit Math Utilities, Standard API Envelopes.
**4. Inputs:** N/A.
**5. Outputs:** Reusable Code Structures.
**6. Dependencies:** None.
**7. Business Rules:** Enforces strict domain validation on academic concepts (e.g., ensuring credit weights cannot be negative).
**8. Events:** N/A.
**9. Security Considerations:** Centralized sanitization for all academic inputs.
**10. Future Extensibility:** Extraction into standard libraries for use by external SIS or LMS vendors building plugins for the School OS.
