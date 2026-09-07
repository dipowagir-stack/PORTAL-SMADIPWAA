# School Notification Engine Architecture

## 1. Analysis
The Notification Engine is a critical Platform Service in the Enterprise School Management Platform (School OS). It acts as the centralized communications hub, abstracting away the complexity of message formatting, user preferences, and multi-channel delivery (Email, SMS, WhatsApp, Push, In-App). By decoupling the business modules from external delivery providers, the architecture ensures that a workflow (e.g., "Student Admitted") simply emits an event, and the Notification Engine independently handles the routing, rendering, translation, and resilient delivery of that message based on enterprise rules and individual user preferences.

## 2. Architecture Design
The Notification Engine utilizes an Event-Driven, asynchronous pipeline. When a notification request is received, the engine filters it through the Preference Manager (to respect user opt-outs and channel preferences). It then uses the Template Manager to render the localized content, schedules it if necessary, and places it into a prioritized Message Queue. The Delivery Manager consumes this queue, dispatching messages through the Channel Manager via provider-agnostic adapters. Delivery states and read receipts are monitored via the Tracking Manager and logged by the History Manager.

## 3. Folder Structure
```
src/
└── services/
    └── notification/
        ├── core/            # Notification Manager
        ├── content/         # Template Manager
        ├── routing/         # Preference Manager, Channel Manager
        ├── transport/       # Queue Manager, Scheduler, Delivery Manager
        ├── resilience/      # Retry Manager
        ├── observability/   # Tracking Manager, History Manager
        └── shared/          # Shared Components (Payloads, Enums)
```

## 4. Notification Engine Components

---

### 4.1 Notification Manager
**1. Purpose:** Act as the primary entry point and orchestrator for all internal notification requests.
**2. Responsibilities:** Receive raw notification requests, coordinate with the Preference and Template managers to build the final payload, and route the finalized message to the Queue Manager or Scheduler.
**3. Inputs:** Raw Notification Payload (Event Type, Target Audience, Context Data, Priority).
**4. Outputs:** Enqueued Notification Job.
**5. Dependencies:** Preference Manager, Template Manager, Queue Manager, Scheduler.
**6. Failure Handling:** Emits a "Failed to Enqueue" metric; logs invalid payloads to a Dead Letter Queue (DLQ) without crashing the calling workflow.
**7. Future Extensibility:** AI-driven urgency classification to automatically elevate or downgrade notification priority based on context.

---

### 4.2 Template Manager
**1. Purpose:** Separate message content and presentation from the business logic.
**2. Responsibilities:** Fetch notification templates, inject dynamic context variables (e.g., `{{student_name}}`), apply localization (translations), and format content for specific channels (e.g., rich HTML for email, plain text for SMS).
**3. Inputs:** Template ID, Context Data, Target Language, Target Channel.
**4. Outputs:** Rendered, channel-specific message payload.
**5. Dependencies:** Platform Knowledge Engine (for localization mappings/dictionaries).
**6. Failure Handling:** Falls back to default system language (e.g., English) if the requested localized template is missing; falls back to generic raw text if a template compilation fails.
**7. Future Extensibility:** Dynamic AI-generated template drafting for bespoke communication, and A/B testing on template variations.

---

### 4.3 Channel Manager
**1. Purpose:** Abstract external delivery providers behind standardized interfaces.
**2. Responsibilities:** Manage provider credentials, enforce channel-specific constraints (e.g., 160 character limits for SMS), and route messages to the correct provider adapters (e.g., SendGrid for Email, Twilio for SMS/WhatsApp, FCM for Push).
**3. Inputs:** Rendered Payload, Target Channel, Recipient Credentials (Phone, Email, Device Token).
**4. Outputs:** Standardized Dispatch Request to the provider adapter.
**5. Dependencies:** External Provider APIs (Abstracted).
**6. Failure Handling:** Circuit breaking per channel if a provider (e.g., WhatsApp API) goes down, preventing cascading system slowdowns.
**7. Future Extensibility:** Hot-swapping providers (e.g., switching from Mailgun to Amazon SES) without changing a single line of core business logic.

---

### 4.4 Queue Manager
**1. Purpose:** Buffer and prioritize high volumes of outgoing messages.
**2. Responsibilities:** Organize outgoing notifications by priority (Emergency vs. Daily Digest), enforce rate limits to avoid provider throttling, and manage bulk notification batching.
**3. Inputs:** Finalized Notification Jobs.
**4. Outputs:** Ordered Stream of messages ready for delivery.
**5. Dependencies:** Message Broker (e.g., Redis, RabbitMQ - abstracted).
**6. Failure Handling:** Persistent queueing to ensure no messages are lost during unexpected engine restarts.
**7. Future Extensibility:** Dynamic, backpressure-aware queue scaling for extreme burst events (e.g., campus-wide emergency broadcasts).

---

### 4.5 Scheduler
**1. Purpose:** Hold and release notifications based on temporal constraints.
**2. Responsibilities:** Manage delayed deliveries (e.g., "Send reminder 24 hours before exam") and respect quiet hours (e.g., "Do not send non-emergency SMS between 10 PM and 6 AM").
**3. Inputs:** Notification Job, Dispatch Timestamp, Timezone.
**4. Outputs:** Release trigger to the Queue Manager.
**5. Dependencies:** Queue Manager.
**6. Failure Handling:** Automatic adjustment of dispatch times if the engine was down during the originally scheduled window (catch-up logic).
**7. Future Extensibility:** Machine Learning optimized delivery windows based on when individual users are most likely to open messages.

---

### 4.6 Delivery Manager
**1. Purpose:** Execute the final dispatch of the notification.
**2. Responsibilities:** Consume items from the Queue Manager, invoke the Channel Manager, and handle immediate synchronous provider responses (Success, Rate Limited, Bad Request).
**3. Inputs:** Prioritized Notification Jobs.
**4. Outputs:** Dispatch Status (Success, Transient Failure, Hard Failure).
**5. Dependencies:** Channel Manager, Queue Manager, Retry Manager, Tracking Manager.
**6. Failure Handling:** Routes Transient Failures (e.g., 429 Too Many Requests) to the Retry Manager; logs Hard Failures (e.g., 400 Bad Number).
**7. Future Extensibility:** Multi-threaded parallel dispatching across distributed worker nodes for high-throughput bulk sending.

---

### 4.7 Preference Manager
**1. Purpose:** Enforce user-defined communication preferences and compliance.
**2. Responsibilities:** Check opt-in/opt-out statuses, resolve preferred channels (e.g., User A prefers WhatsApp, User B prefers Email), and respect "Do Not Disturb" settings.
**3. Inputs:** Target User ID, Notification Category.
**4. Outputs:** Allowed Channels list, Suppression flags.
**5. Dependencies:** Shared Components (User configuration abstractions).
**6. Failure Handling:** Fails safe by defaulting to non-intrusive channels (In-App only) or suppressing non-critical messages if preferences cannot be loaded.
**7. Future Extensibility:** Centralized GDPR/CCPA compliance engine integration for strict communication auditing.

---

### 4.8 Tracking Manager
**1. Purpose:** Monitor the lifecycle of a message after it leaves the platform.
**2. Responsibilities:** Process asynchronous provider webhooks (Delivered, Bounced, Opened, Clicked), and track In-App read receipts.
**3. Inputs:** Webhook payloads, API read signals.
**4. Outputs:** Standardized Delivery/Read Status Events.
**5. Dependencies:** External Provider Webhooks.
**6. Failure Handling:** Deduplication of incoming webhooks to handle provider retries; signature verification failures are dropped securely.
**7. Future Extensibility:** Universal deep-link tracking to measure conversion rates of notifications (e.g., % of parents who clicked the "Pay Tuition" link).

---

### 4.9 History Manager
**1. Purpose:** Maintain an immutable log of all communications for auditing and UI display.
**2. Responsibilities:** Store the exact payload sent, metadata (timestamp, channel), and aggregate statuses from the Tracking Manager for user-facing "Inbox" or "Sent Items" views.
**3. Inputs:** Dispatch Metadata, Tracking Updates.
**4. Outputs:** Queryable Notification History.
**5. Dependencies:** Platform Storage.
**6. Failure Handling:** Asynchronous write-behind caching to ensure database latency does not slow down the Delivery Manager.
**7. Future Extensibility:** Cold-storage archiving for legal compliance and e-discovery (e.g., retaining all disciplinary emails for 7 years).

---

### 4.10 Retry Manager
**1. Purpose:** Guarantee resilient delivery against network or provider instability.
**2. Responsibilities:** Implement exponential backoff and jitter algorithms for failed dispatches, re-queuing them until success or absolute timeout.
**3. Inputs:** Failed Notification Jobs, Error Codes.
**4. Outputs:** Re-queued Jobs or Terminal Failure flags.
**5. Dependencies:** Queue Manager.
**6. Failure Handling:** Halts retries if a failure is identified as permanent (e.g., Hard Bounce, Unsubscribed).
**7. Future Extensibility:** Smart channel fallback (e.g., if a Push Notification fails to deliver after 3 attempts, automatically fallback to sending an SMS).

---

### 4.11 Shared Components
**1. Purpose:** Standardize domain models within the Notification boundary.
**2. Responsibilities:** Define Enums (Channels, Priorities, Statuses), DTOs (Data Transfer Objects), and generic interfaces (e.g., `INotificationChannelAdapter`).
**3. Inputs:** N/A (Library level).
**4. Outputs:** Reusable data structures and contracts.
**5. Dependencies:** None.
**6. Failure Handling:** N/A.
**7. Future Extensibility:** Shared libraries can be extracted into standalone SDK packages if the platform transitions to a multi-repository microservice architecture.

---

## 5. Global Architecture Alignment

### 5.1 Responsibilities
The Notification Engine is strictly a *delivery and formatting* mechanism. It does not decide *why* a message is sent (that is the Workflow Engine's job). It ensures that once a system wants to communicate, the message is delivered securely, accurately, and politely according to user preferences.

### 5.2 Dependencies
Depends *inwardly* on the Core Engine for configuration and logging. Depends *horizontally* on the Knowledge Engine for localization templates. No core Domain Module depends on the Notification Engine directly; modules emit Domain Events, which the Automation Engine or Workflow Engine translates into Notification Requests.

### 5.3 Risks
*   **Notification Fatigue:** Flooding parents/students with too many alerts. *Mitigation:* The Preference Manager and Queue Manager (batching digests).
*   **Provider Throttling:** Getting blocked by WhatsApp or SendGrid for spamming. *Mitigation:* Queue Manager rate limiting and Prioritization.

### 5.4 Migration Strategy
Extract hardcoded `sendEmail()` or `sendSMS()` functions from legacy business modules. Replace them with standardized Event publications. Route those events to the Notification Manager, mapping legacy text strings to newly registered Templates.

### 5.5 Future Extensibility
The architecture supports the integration of a unified "Communication Center" for school administrators, where they can orchestrate multi-channel marketing campaigns (e.g., Admissions drives) using the exact same underlying robust infrastructure as transactional system alerts.
