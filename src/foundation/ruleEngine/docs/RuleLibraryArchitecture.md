# Rule Library Architecture

## Overview
The Rule Library provides a modular, centralized repository of business logic, constraints, and validation policies for the Enterprise AI Platform. It leverages the Foundation Rule Engine to evaluate rules across different domains seamlessly.

---

## 1. Education Rules

### Purpose
Validates and enforces policies related to educational workflows, curriculum management, scheduling, and student/teacher interactions.

### Rule List
- `CurriculumPrerequisiteRule`: Ensures a student has completed required prerequisites before enrolling.
- `MaxCreditLoadRule`: Prevents a student from exceeding the maximum allowed credits per semester.
- `TeacherAvailabilityRule`: Validates that a teacher is available before assigning a class schedule.
- `GradingDeadlineRule`: Checks if grades are submitted within the required timeframe.

### Folder Structure
```
src/
└── rules/
    └── education/
        ├── CurriculumPrerequisiteRule.ts
        ├── MaxCreditLoadRule.ts
        ├── TeacherAvailabilityRule.ts
        └── GradingDeadlineRule.ts
```

### Dependency
Depends on **Shared Rules** (e.g., date validations) and **Security Rules** (e.g., role checks for grading).

### Reusability
Highly reusable across student enrollment workflows, scheduling workflows, and grading workflows.

---

## 2. Business Rules

### Purpose
Enforces financial, operational, and organizational constraints such as budgets, billing, reporting, and resource allocation.

### Rule List
- `BudgetApprovalRule`: Ensures an expense report is within the allocated budget.
- `InvoicePaymentRule`: Validates that an invoice is paid before unlocking premium content.
- `ResourceAllocationRule`: Prevents overallocation of physical or digital resources.
- `TaxCalculationRule`: Determines required tax brackets for specific transactions.

### Folder Structure
```
src/
└── rules/
    └── business/
        ├── BudgetApprovalRule.ts
        ├── InvoicePaymentRule.ts
        ├── ResourceAllocationRule.ts
        └── TaxCalculationRule.ts
```

### Dependency
Depends on **System Rules** for audit logging and **Shared Rules** for currency/math validations.

### Reusability
Can be reused across financial modules, procurement workflows, and subscription management.

---

## 3. AI Rules

### Purpose
Governs the usage, safety, limits, and cost-control mechanisms for AI Gateway interactions to ensure responsible and cost-effective AI usage.

### Rule List
- `TokenLimitRule`: Prevents AI generation if the prompt exceeds maximum allowed tokens.
- `CostControlRule`: Blocks AI requests if the daily or monthly budget for the user is exhausted.
- `PromptSafetyRule`: Scans prompts for malicious injections or policy violations.
- `ModelRoutingRule`: Determines the optimal model (e.g., Gemini vs Claude) based on task complexity.

### Folder Structure
```
src/
└── rules/
    └── ai/
        ├── TokenLimitRule.ts
        ├── CostControlRule.ts
        ├── PromptSafetyRule.ts
        └── ModelRoutingRule.ts
```

### Dependency
Depends on **Security Rules** (for user permissions) and **Business Rules** (for budget limits).

### Reusability
Reusable across any feature that invokes the AI Gateway, chat interfaces, and automated agent workflows.

---

## 4. Security Rules

### Purpose
Defines access control, data privacy, and compliance policies independent of standard RBAC, allowing for Attribute-Based Access Control (ABAC).

### Rule List
- `DataAnonymizationRule`: Ensures sensitive PII data is masked before logging or AI processing.
- `GeoFencingRule`: Restricts access to specific features based on the user's geographic location.
- `DeviceTrustRule`: Requires multi-factor authentication if a request comes from an unrecognized device.
- `ResourceOwnershipRule`: Validates that a user is the owner of the requested data entity.

### Folder Structure
```
src/
└── rules/
    └── security/
        ├── DataAnonymizationRule.ts
        ├── GeoFencingRule.ts
        ├── DeviceTrustRule.ts
        └── ResourceOwnershipRule.ts
```

### Dependency
Operates independently, though relies on context provided by the Permission Engine.

### Reusability
Universally applied across all incoming API requests, workflow executions, and data access layers.

---

## 5. System Rules

### Purpose
Manages infrastructure-level constraints, rate limiting, system health checks, and lifecycle requirements.

### Rule List
- `RateLimitRule`: Throttles requests from a single user to prevent API abuse.
- `MaintenanceWindowRule`: Blocks non-essential operations during scheduled system maintenance.
- `PayloadSizeRule`: Rejects requests with payloads exceeding the platform's limits.
- `AuditLogRequirementRule`: Ensures critical operations include necessary context for audit trails.

### Folder Structure
```
src/
└── rules/
    └── system/
        ├── RateLimitRule.ts
        ├── MaintenanceWindowRule.ts
        ├── PayloadSizeRule.ts
        └── AuditLogRequirementRule.ts
```

### Dependency
No dependencies. Operates at the lowest level of the application.

### Reusability
Applied globally as middleware or interceptors for overall platform stability.

---

## 6. Shared Rules

### Purpose
Provides generic, domain-agnostic validation logic that can be composed and utilized by domain-specific rules.

### Rule List
- `ValidDateRangeRule`: Checks if a given start and end date form a valid temporal range.
- `EmailFormatRule`: Validates standard email strings.
- `StringLengthRule`: Ensures text data is within character boundaries.
- `NumericRangeRule`: Validates that a number falls between a minimum and maximum value.

### Folder Structure
```
src/
└── rules/
    └── shared/
        ├── ValidDateRangeRule.ts
        ├── EmailFormatRule.ts
        ├── StringLengthRule.ts
        └── NumericRangeRule.ts
```

### Dependency
No external dependencies.

### Reusability
Highly reusable; designed to be composed within Education, Business, or AI rules as foundational checks.
