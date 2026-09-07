# School Scheduler Engine Architecture

## 1. Analysis
The Scheduler Engine is the central chronometer of the Enterprise School Management Platform (School OS). It is a highly scalable, distributed Platform Service designed solely to orchestrate time-bound operations across all 15+ business modules. Crucially, the Scheduler Engine contains zero business logic. It does not calculate tuition or generate attendance reports; instead, it guarantees that the "Calculate Tuition" or "Generate Reports" workflows are triggered at the exact correct moment, in the correct sequence, considering holidays, time zones, and transient failures. It acts as the heartbeat of the asynchronous, event-driven ecosystem.

## 2. Architecture Design
The Scheduler Engine is designed for distributed, highly available (HA) execution. It separates Job Definitions (what needs to run) from Triggers (when it should run) and Executions (the actual running instance). At its core, the engine evaluates Triggers against the Calendar and Time Zone managers. When a Trigger fires, the Job is placed in the Queue Manager, which respects priority and Dependencies (DAGs). The Execution Manager then consumes the queue and publishes an execution event to the Core Event Bus, which the target business module or Workflow Engine listens to. Failures are routed to the Retry Manager, while catastrophic node crashes are handled by the Recovery Manager via missed-fire algorithms.

## 3. Folder Structure
```text
src/
└── services/
    └── scheduler/
        ├── core/            # Schedule Manager, Job Manager, Version Manager
        ├── timing/          # Trigger Manager, Calendar Manager, Time Zone Manager
        ├── dispatch/        # Queue Manager, Execution Manager, Dependency Manager
        ├── resilience/      # Retry Manager, Recovery Manager
        ├── observability/   # Monitoring Manager, History Manager
        └── shared/          # Shared Components (Cron Parsers, Job Envelopes)
```

## 4. Scheduler Engine Components

---

### 4.1 Schedule Manager
**1. Purpose:** Act as the primary orchestrator and entry point for all scheduling operations.
**2. Responsibilities:** Coordinate the lifecycle of a schedule (Create, Pause, Resume, Delete), route scheduling requests to the appropriate sub-managers, and provide a unified interface for the rest of the platform to interact with time-based operations.
**3. Inputs:** Scheduling Requests (Job ID, Trigger Definition, Metadata).
**4. Outputs:** Schedule Registration Confirmations, Status Flags.
**5. Dependencies:** Job Manager, Trigger Manager, Queue Manager.
**6. Failure Handling:** Fails gracefully by rejecting invalid schedule requests and returning descriptive error structures without impacting active running schedules.
**7. Monitoring Strategy:** Tracks schedule creation/deletion rates; alerts on unusual spikes in paused or dropped schedules.
**8. Future Extensibility:** AI-optimized auto-scheduling (e.g., dynamically scheduling heavy background jobs during periods of historically low platform traffic).

---

### 4.2 Job Manager
**1. Purpose:** Maintain the definitions and parameters of the operations to be executed.
**2. Responsibilities:** Store the logical blueprint of a job (e.g., target workflow ID, required payload structure, priority, timeout limits) independent of *when* it runs.
**3. Inputs:** Job Blueprints, Parameter Definitions.
**4. Outputs:** Validated Job Instances ready for execution mapping.
**5. Dependencies:** Version Manager.
**6. Failure Handling:** Prevents execution of jobs if their required parameters are missing or malformed at the definition level.
**7. Monitoring Strategy:** Tracks total registered jobs by domain (e.g., 400 Finance Jobs, 1200 Academic Jobs) to identify module usage distribution.
**8. Future Extensibility:** Dynamic Job Parameter injection, allowing parameters to be fetched from the Knowledge Engine right before execution.

---

### 4.3 Trigger Manager
**1. Purpose:** Determine the exact moment a Job should be executed.
**2. Responsibilities:** Parse Cron expressions, evaluate one-time delays, calculate next-fire times, and emit signals when the current system time aligns with a defined trigger.
**3. Inputs:** Trigger Definitions (Cron, Timestamp, Interval), System Clock Ticks.
**4. Outputs:** "Fire" Events containing Job References.
**5. Dependencies:** Calendar Manager, Time Zone Manager.
**6. Failure Handling:** Implements drift compensation algorithms to ensure that slight system clock lags do not compound over time for recurring jobs.
**7. Monitoring Strategy:** Continuously monitors trigger evaluation latency; alerts if calculating the next fire time exceeds execution thresholds.
**8. Future Extensibility:** Event-augmented time triggers (e.g., "Run this 24 hours *after* Event X occurs").

---

### 4.4 Queue Manager
**1. Purpose:** Buffer and prioritize jobs that are ready to run.
**2. Responsibilities:** Accept fired triggers, order them by priority (e.g., System Maintenance vs. Library Reminder), and manage rate limits to prevent overwhelming the downstream Execution Manager or external systems.
**3. Inputs:** Fired Job Events, Priority Designations.
**4. Outputs:** Ordered stream of ready-to-execute Jobs.
**5. Dependencies:** Dependency Manager.
**6. Failure Handling:** Uses persistent, disk-backed queues to ensure no triggered jobs are lost if the Scheduler Engine restarts mid-cycle.
**7. Monitoring Strategy:** Tracks queue depth, age of oldest item, and enqueue/dequeue rates to alert on potential bottlenecks or worker starvation.
**8. Future Extensibility:** Dynamic queue sharding across multiple distributed clusters for multi-tenant, extreme-scale deployments.

---

### 4.5 Execution Manager
**1. Purpose:** Dispatch the queued jobs to the broader platform.
**2. Responsibilities:** Consume jobs from the Queue Manager, wrap them in standardized execution envelopes, publish them to the Core Event Bus (or invoke Webhooks), and track timeouts.
**3. Inputs:** Ready-to-execute Jobs.
**4. Outputs:** Dispatched Execution Events, Workflow Triggers.
**5. Dependencies:** Queue Manager, History Manager.
**6. Failure Handling:** If dispatch fails (e.g., Event Bus is down), pushes the job back to the Queue Manager with an incremental backoff penalty.
**7. Monitoring Strategy:** Measures dispatch latency and tracks the success/failure acknowledgement rate from the downstream consuming modules.
**8. Future Extensibility:** Support for Serverless function (FaaS) invocation, allowing the Scheduler to spin up AWS Lambda or Google Cloud Functions for isolated job execution.

---

### 4.6 Retry Manager
**1. Purpose:** Guarantee execution resilience for transiently failing jobs.
**2. Responsibilities:** Catch execution failure acknowledgements, evaluate the job's defined retry policy (e.g., Exponential Backoff, Fixed Interval, Max Attempts), and re-queue the job if appropriate.
**3. Inputs:** Failed Execution Events, Retry Policies.
**4. Outputs:** Re-queued Jobs or Terminal Failure Events.
**5. Dependencies:** Queue Manager.
**6. Failure Handling:** Halts retries and moves the job to a Dead Letter Queue (DLQ) if the maximum retry count is breached, preventing infinite failure loops.
**7. Monitoring Strategy:** Alerts on high retry rates per Job Type, identifying consistently unstable downstream business modules.
**8. Future Extensibility:** Circuit-breaker integrated retries (e.g., pausing all retries for the "Finance" module if the Finance database is detected as down).

---

### 4.7 Recovery Manager
**1. Purpose:** Handle catastrophic failures, node crashes, and missed executions (Misfires).
**2. Responsibilities:** Scan for triggers that *should* have fired while the engine was down or overloaded, apply Misfire Instructions (e.g., "Fire Now", "Skip", "Fire Once for all missed"), and recover orphaned jobs stuck in a "Running" state.
**3. Inputs:** System Boot Events, Misfire Configuration Policies, Stale Job Records.
**4. Outputs:** Recovered Job Events, Misfire Resolutions.
**5. Dependencies:** History Manager, Trigger Manager.
**6. Failure Handling:** Prevents "Thundering Herd" scenarios by staggering the re-queueing of recovered jobs after a prolonged system outage.
**7. Monitoring Strategy:** Tracks the volume of jobs categorized as "Misfired" to detect silent infrastructure stalling.
**8. Future Extensibility:** Distributed consensus (Raft/Paxos) for leader election, ensuring that only one Recovery Manager instance runs at a time in a multi-node cluster.

---

### 4.8 Dependency Manager
**1. Purpose:** Orchestrate complex Directed Acyclic Graphs (DAGs) of jobs.
**2. Responsibilities:** Prevent a job from executing until its parent jobs have successfully completed (e.g., "Do not run 'Generate Report' until 'Sync Attendance' finishes").
**3. Inputs:** Job Completion Events, DAG Definitions.
**4. Outputs:** Unblocked Job Events (sent to Queue Manager).
**5. Dependencies:** Queue Manager, History Manager.
**6. Failure Handling:** Automatically cascades cancellation to child jobs if a parent job suffers a terminal failure, preventing inconsistent data states.
**7. Monitoring Strategy:** Visualizes and tracks DAG execution paths; alerts on deadlocks or circular dependencies detected at runtime.
**8. Future Extensibility:** Cross-platform dependencies (e.g., waiting for an external third-party system webhook before unlocking a local scheduled job).

---

### 4.9 Calendar Manager
**1. Purpose:** Ensure schedules respect real-world business constraints.
**2. Responsibilities:** Maintain institutional calendars (semesters, weekends, public holidays, staff development days) and modify trigger behaviors (e.g., "Run on the last business day of the month, excluding holidays").
**3. Inputs:** Raw Trigger Times, Institutional Calendar Data.
**4. Outputs:** Adjusted/Validated Fire Times.
**5. Dependencies:** Core Knowledge Engine (for holiday rules).
**6. Failure Handling:** Defaults to strict mathematical execution (ignoring holidays) if the Calendar database becomes temporarily unreachable, appending a warning to the execution context.
**7. Monitoring Strategy:** Tracks calendar resolution latency; alerts if calendar rule drift occurs.
**8. Future Extensibility:** Integration with global, real-time national holiday APIs to automatically update institutional business days.

---

### 4.10 Time Zone Manager
**1. Purpose:** Guarantee accurate execution across global or multi-campus deployments.
**2. Responsibilities:** Normalize all triggers into UTC for the internal engine, while allowing users to schedule jobs in their local time zones (accounting for Daylight Saving Time shifts).
**3. Inputs:** Local Time Strings, Target Time Zones.
**4. Outputs:** UTC Normalized Timestamps.
**5. Dependencies:** Standard Time Zone Libraries (IANA tz database).
**6. Failure Handling:** Rejects schedule creation if an invalid or deprecated Time Zone ID is provided.
**7. Monitoring Strategy:** Alerts on execution anomalies detected during Daylight Saving Time cutover windows.
**8. Future Extensibility:** Dynamic time zone resolution based on a user's current GPS/IP location for personalized notification scheduling.

---

### 4.11 Monitoring Manager
**1. Purpose:** Provide real-time visibility into the health of the Scheduler Engine.
**2. Responsibilities:** Aggregate metrics on jobs running, queued, failed, and misfired; expose this telemetry to the platform's central dashboard.
**3. Inputs:** State transition events from all sub-managers.
**4. Outputs:** Real-time Telemetry Streams, Health Status Indicators.
**5. Dependencies:** Platform Reporting/Analytics Engine.
**6. Failure Handling:** Operates asynchronously; telemetry gathering failure never blocks actual job execution.
**7. Monitoring Strategy:** Core component for self-monitoring. Generates internal alerts for engine starvation or queue backpressure.
**8. Future Extensibility:** AI-driven capacity planning (predicting when the Scheduler Engine will need horizontal scaling based on upcoming end-of-term scheduled job spikes).

---

### 4.12 History Manager
**1. Purpose:** Maintain an immutable record of what the Scheduler Engine executed.
**2. Responsibilities:** Log the exact timestamp a job fired, how long it took, the result state, and any retry attempts, serving as the source of truth for the Recovery and Dependency managers.
**3. Inputs:** Execution Lifecycle Events.
**4. Outputs:** Queryable Job History Records.
**5. Dependencies:** Platform Audit Engine.
**6. Failure Handling:** Uses write-behind caching to ensure high-speed job execution is not bottlenecked by database write speeds.
**7. Monitoring Strategy:** Tracks log storage volume and purges old records based on defined retention policies to prevent disk exhaustion.
**8. Future Extensibility:** Deep analytics on job execution durations to identify slowly degrading database queries in downstream modules.

---

### 4.13 Version Manager
**1. Purpose:** Manage changes to job definitions and schedules without breaking running instances.
**2. Responsibilities:** Track iterations of Job Blueprints, ensuring that if a job's required parameters change in v2, active schedules utilizing v1 continue to function until explicitly migrated.
**3. Inputs:** Job Definition Updates.
**4. Outputs:** Versioned Job Blueprints (e.g., Job_A_v1, Job_A_v2).
**5. Dependencies:** Job Manager.
**6. Failure Handling:** Prevents deletion of a job version if active schedules are still mapped to it.
**7. Monitoring Strategy:** Tracks the deprecation curve of old job versions to alert administrators of pending forced upgrades.
**8. Future Extensibility:** Automated dry-run testing of new job versions in a shadowed state before routing live traffic to them.

---

### 4.14 Shared Components
**1. Purpose:** Provide the common structural DNA for scheduling operations.
**2. Responsibilities:** Define Cron Parsing utilities, Job Context Envelopes, priority Enums, and interface contracts (`ISchedule`, `ITrigger`, `IJob`).
**3. Inputs:** N/A (Library level).
**4. Outputs:** Reusable Utilities and Data Structures.
**5. Dependencies:** None.
**6. Failure Handling:** Extensive unit-testing of utility functions to prevent logic failures (e.g., flawed Cron parsing).
**7. Monitoring Strategy:** N/A.
**8. Future Extensibility:** Publishing the scheduling contracts as standard enterprise packages for third-party Plugin developers.

---

## 5. Global Architecture Alignment

### 5.1 Responsibilities
The Scheduler Engine is strictly responsible for *Time and Orchestration*. It does not evaluate business rules, nor does it manipulate database records directly. It merely wakes up at the right time, packages a context payload, and shouts to the rest of the platform: "It is time to execute Task X!"

### 5.2 Dependencies
The engine relies heavily on the **Core Event Bus** to communicate with isolated business modules. It also leverages the **Platform Knowledge Engine** for global holiday contexts, and exports its logs to the **Platform Audit Engine**.

### 5.3 Risks
*   **Time Zone/DST Bugs:** Executing reports twice or missing a day during daylight saving transitions. *Mitigation:* The Time Zone manager strictly normalizes all internal operations to UTC, translating to local time only at the presentation layer.
*   **Thundering Herd:** Thousands of daily jobs waking up at exactly 00:00:00. *Mitigation:* The Queue Manager applies jitter (randomized micro-delays) and strict rate-limiting for batch jobs.

### 5.4 Migration Strategy
Legacy procedural cron jobs running on raw OS instances (e.g., Linux crontab) will be incrementally converted into Scheduler Engine Job Blueprints. This moves the scheduling out of the infrastructure layer and into the governed application layer, providing immediate visibility, retry capabilities, and auditability.

### 5.5 Future Extensibility
The architecture paves the way for a fully distributed, cloud-native orchestration framework (akin to Kubernetes CronJobs or Temporal.io). It allows the School OS to scale across multiple data centers, utilizing distributed locking to ensure high availability without the risk of duplicate job executions.
