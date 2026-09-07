# School Analytics Engine Architecture

## 1. Analysis
The Analytics Engine is a core Platform Service in the Enterprise School Management Platform (School OS). While the Reporting Engine is optimized for generating static, point-in-time documents (answering "What happened?"), the Analytics Engine operates as a continuous, dynamic Business Intelligence (BI) layer. It is designed to answer "Why did it happen?", identify trends, and provide predictive insights across 20+ operational domains (Academic, Finance, Usage, etc.). Operating on a CQRS and Event-Driven architecture, it continuously ingests domain events, builds time-series read models, calculates complex metrics, and serves high-performance, drill-down capable data to executive dashboards.

## 2. Architecture Design
The Analytics Engine utilizes a pipeline optimized for OLAP (Online Analytical Processing) workloads, entirely abstracted from the transactional databases. As Domain Events occur, the Aggregation Manager updates in-memory or columnar read models. When insights are requested, the Analytics Manager coordinates the Metrics and KPI Managers to fetch current states. For deeper analysis, the Trend, Comparison, and Forecast Managers process these metrics across time dimensions. The AI Analytics Adapter enriches these mathematical models with semantic reasoning. Finally, the Dashboard Data Manager formats the output for UI consumption, strictly filtered by the requesting user's authorization context.

## 3. Folder Structure
```
src/
└── services/
    └── analytics/
        ├── core/            # Analytics Manager, Aggregation Manager
        ├── definitions/     # KPI Manager, Metrics Manager
        ├── processing/      # Trend Analysis Manager, Comparison Manager, Forecast Manager
        ├── presentation/    # Dashboard Data Manager, Executive Analytics
        ├── intelligence/    # Insight Manager, AI Analytics Adapter
        ├── specialized/     # Usage Analytics, Performance Analytics
        ├── observability/   # History Manager
        └── shared/          # Shared Components (Schemas, Enums)
```

## 4. Analytics Engine Components

---

### 4.1 Analytics Manager
**1. Purpose:** Orchestrate the entire analytical data pipeline.
**2. Responsibilities:** Route incoming analytics requests, coordinate metric calculations across managers, manage caching of expensive analytical queries, and enforce macro-level data governance.
**3. Inputs:** Analytics Query Context (Scope, Timeframe, Filters, User Context).
**4. Outputs:** Comprehensive Analytical Result Set (Metrics, Trends, Insights).
**5. Dependencies:** Dashboard Data Manager, Aggregation Manager, Insight Manager, Core Security Engine.
**6. Failure Handling:** Employs circuit breakers for heavy queries; returns partial datasets with a "degraded performance" flag if underlying data stores timeout.
**7. Security Considerations:** Ensures no analytical query executes without validating the user's role and data access boundaries.
**8. Future Extensibility:** Automated query optimization and materialized view generation based on historical request frequency.

---

### 4.2 KPI Manager
**1. Purpose:** Define and track Key Performance Indicators across the enterprise.
**2. Responsibilities:** Manage the business logic that defines success criteria (e.g., "Healthy Attendance > 95%"), evaluate current metrics against targets, and calculate KPI health scores (Red/Yellow/Green).
**3. Inputs:** Target Definitions, Current Calculated Metrics.
**4. Outputs:** KPI Health Status, Variance from Target.
**5. Dependencies:** Metrics Manager, Shared Knowledge (Organizational Goals).
**6. Failure Handling:** If a KPI target is missing, defaults to an "Undefined" status rather than failing the entire dashboard.
**7. Security Considerations:** KPI definitions are immutable to unauthorized users to prevent moving goalposts for performance reviews.
**8. Future Extensibility:** Dynamic, AI-adjusted KPI targets based on macro-economic factors or historical seasonality.

---

### 4.3 Metrics Manager
**1. Purpose:** Standardize the calculation of primitive business data points.
**2. Responsibilities:** Define the exact mathematical formulas for atomic metrics (e.g., "Daily Active Users", "Average GPA", "Current Cash Flow") to ensure absolute consistency across all dashboards and reports.
**3. Inputs:** Aggregated Raw Data, Metric Calculation Formula.
**4. Outputs:** Single Numeric Value or Array of Values.
**5. Dependencies:** Aggregation Manager.
**6. Failure Handling:** Returns Null or 0 with a computation error flag if the underlying dataset is corrupted or contains division-by-zero scenarios.
**7. Security Considerations:** Sanitizes underlying data vectors before calculation to ensure no single data point (e.g., an individual student's grade) can be reverse-engineered from the aggregate.
**8. Future Extensibility:** Formula composition, allowing administrators to visually drag-and-drop primitive metrics to create custom composite metrics.

---

### 4.4 Aggregation Manager
**1. Purpose:** Maintain fast, summarized views of transactional data.
**2. Responsibilities:** Consume domain events (via CQRS), perform time-bucketing (hourly, daily, monthly rollups), and maintain multi-dimensional OLAP cubes or materialized read-models.
**3. Inputs:** Raw Domain Events, Time-Series Data Streams.
**4. Outputs:** Summarized Data Cubes, Pre-calculated Rollups.
**5. Dependencies:** Core Event Bus.
**6. Failure Handling:** Self-healing reconciliation loops that detect missed events and trigger background re-aggregation from the source of truth.
**7. Security Considerations:** Aggregations are strictly partitioned by tenant, campus, and department to prevent cross-contamination.
**8. Future Extensibility:** Real-time stream processing integrations (e.g., Apache Flink or Spark) for live campus telemetry aggregation.

---

### 4.5 Trend Analysis Manager
**1. Purpose:** Measure the velocity and direction of business metrics over time.
**2. Responsibilities:** Apply statistical models (Moving Averages, Exponential Smoothing) to historical metrics, identifying upward, downward, or cyclical patterns (e.g., "Disciplinary actions are trending up by 15% this semester").
**3. Inputs:** Time-Series Metric Data, Analysis Timeframe.
**4. Outputs:** Trend Slopes, Seasonality Indicators, Volatility Scores.
**5. Dependencies:** Metrics Manager, History Manager.
**6. Failure Handling:** Gracefully handles gaps in historical data by applying interpolation or returning a "Low Confidence" warning.
**7. Security Considerations:** Trend lines automatically truncate if the user attempts to drill down into a time period where they lack authorization.
**8. Future Extensibility:** Advanced anomaly detection using unsupervised machine learning to flag statistically significant deviations from historical baselines.

---

### 4.6 Comparison Manager
**1. Purpose:** Contextualize metrics by contrasting them against peer groups or historical baselines.
**2. Responsibilities:** Execute Cohort Analysis (e.g., "Class of 2026 vs Class of 2025"), Period-over-Period (PoP), and Year-over-Year (YoY) comparisons, as well as Cross-Department benchmarking.
**3. Inputs:** Primary Metric Data, Baseline Metric Data, Comparison Dimensions.
**4. Outputs:** Delta Values, Percentage Changes, Comparative Ranks.
**5. Dependencies:** Aggregation Manager, Metrics Manager.
**6. Failure Handling:** Flags incomparable datasets (e.g., mismatched granularities) instead of calculating inaccurate deltas.
**7. Security Considerations:** Strict enforcement of lateral access controls (e.g., a teacher can compare their class against the school average, but not directly against another specific teacher's class unless authorized).
**8. Future Extensibility:** Global benchmarking, allowing the school to anonymously compare its KPIs against regional or national averages (Opt-in).

---

### 4.7 Forecast Manager
**1. Purpose:** Project future states based on historical patterns and current velocity.
**2. Responsibilities:** Apply predictive statistical models (ARIMA, Linear Regression) to estimate future outcomes (e.g., projecting end-of-year budget deficits, or predicting final enrollment numbers based on current admission velocity).
**3. Inputs:** Historical Trend Data, Current Metrics, Seasonal Modifiers.
**4. Outputs:** Projected Values, Confidence Intervals (Upper/Lower bounds).
**5. Dependencies:** Trend Analysis Manager.
**6. Failure Handling:** Widens the confidence interval significantly if the historical dataset is too small to build a reliable forecast.
**7. Security Considerations:** Forecasts involving sensitive financial or HR data are restricted to executive roles.
**8. Future Extensibility:** Deep integration with AI neural networks for complex, multi-variate predictive modeling (e.g., predicting student dropout risk based on 50+ diverse factors).

---

### 4.8 Dashboard Data Manager
**1. Purpose:** Prepare and format analytical data for visualization in the User Interface.
**2. Responsibilities:** Translate raw metrics, trends, and forecasts into UI-friendly structures (e.g., formatting for Bar Charts, Line Graphs, Heatmaps), supporting complex drill-down hierarchy paths.
**3. Inputs:** Raw Analytical Result Sets, Requested Visualization Type.
**4. Outputs:** Formatted Chart Data Objects (JSON).
**5. Dependencies:** Analytics Manager.
**6. Failure Handling:** Returns empty chart states with user-friendly error messages if data formatting fails.
**7. Security Considerations:** Strips all underlying raw data points that aren't strictly required for rendering the specific chart visual.
**8. Future Extensibility:** GraphQL API layer allowing custom UI components to dynamically query the exact shape of analytical data they require.

---

### 4.9 Insight Manager
**1. Purpose:** Automatically extract actionable meaning from raw numbers.
**2. Responsibilities:** Evaluate trends, anomalies, and KPI breaches using a rule-based engine to generate human-readable insights (e.g., "Science grades dropped 10% this month, primarily driven by Grade 9").
**3. Inputs:** Metric Deltas, Anomaly Flags, Context Data.
**4. Outputs:** Prioritized, natural language insight statements.
**5. Dependencies:** Trend Analysis Manager, Comparison Manager.
**6. Failure Handling:** Suppresses insights if confidence scores are low to prevent alarm fatigue.
**7. Security Considerations:** Ensures insights do not name individuals (e.g., students or teachers) unless the requesting user has granular HR/Academic authorization.
**8. Future Extensibility:** Prescriptive analytics (recommending specific workflows or actions to correct negative insights).

---

### 4.10 AI Analytics Adapter
**1. Purpose:** Augment deterministic analytics with Generative and Semantic AI.
**2. Responsibilities:** Interface with the Platform AI Engine to perform deep textual analysis, sentiment analysis, or generate executive summaries of complex multi-dimensional datasets.
**3. Inputs:** Formatted Data Cubes, Natural Language Queries.
**4. Outputs:** AI-Generated Narrative Summaries, Semantic Trends.
**5. Dependencies:** Platform AI Engine.
**6. Failure Handling:** Bypasses AI enrichment if the provider times out, returning only the deterministic insights generated by the Insight Manager.
**7. Security Considerations:** Strictly enforces data anonymization and PII redaction before transmitting any dataset to external AI models.
**8. Future Extensibility:** Autonomous AI data agents that continuously crawl the Aggregation Manager overnight to discover non-obvious correlations across unlinked modules.

---

### 4.11 Executive Analytics
**1. Purpose:** Provide high-level, cross-domain macro views for school leadership (Principal, Board).
**2. Responsibilities:** Aggregate KPIs from Academic, Finance, HR, and Operations into unified "School Health" scores. Strip away noise and focus strictly on high-impact strategic metrics.
**3. Inputs:** Domain-specific KPIs, Strategic Objectives.
**4. Outputs:** Executive Summaries, Balanced Scorecards.
**5. Dependencies:** All Analytics Managers.
**6. Failure Handling:** Retains the last known good state of executive dashboards if live data aggregation is temporarily offline.
**7. Security Considerations:** Highly restricted access; utilizes cryptographic signing to ensure the data presented to the board has not been tampered with.
**8. Future Extensibility:** Automated generation of formal monthly Board of Directors presentation decks based on live executive metrics.

---

### 4.12 Usage Analytics
**1. Purpose:** Monitor platform adoption and user engagement.
**2. Responsibilities:** Track metrics such as Daily Active Users (DAU), Feature Adoption Rates, Session Lengths, and Plugin Utilization to determine ROI of platform features.
**3. Inputs:** Platform Telemetry Events, Login Records.
**4. Outputs:** Adoption Trends, Feature Popularity Scores.
**5. Dependencies:** Core Engine (Telemetry).
**6. Failure Handling:** Fire-and-forget ingestion; telemetry drops do not impact user experience or core business analytics.
**7. Security Considerations:** Analytics are anonymized to protect user privacy, focusing on aggregate behavioral patterns rather than individual surveillance.
**8. Future Extensibility:** Predictive churn modeling to identify schools, campuses, or parent cohorts that are abandoning the platform.

---

### 4.13 Performance Analytics
**1. Purpose:** Measure the operational efficiency of the school's processes and the platform itself.
**2. Responsibilities:** Analyze Workflow execution times, Decision Engine bottlenecks, Rule Engine efficiency, and SLA compliance (e.g., "Average time to approve a purchase order is 4.2 days").
**3. Inputs:** Workflow Events, Decision Engine Traces, System Logs.
**4. Outputs:** Operational Bottleneck Reports, Efficiency Metrics.
**5. Dependencies:** Workflow Engine, Decision Engine, Rule Engine.
**6. Failure Handling:** Degrades gracefully under extreme system load to prioritize core platform stability over telemetry processing.
**7. Security Considerations:** Ensures performance data cannot be used to maliciously map the underlying platform infrastructure.
**8. Future Extensibility:** Automated process mining to visually reconstruct actual workflow paths vs designed workflow paths.

---

### 4.14 History Manager
**1. Purpose:** Maintain point-in-time snapshots of historical analytics for immutable look-backs.
**2. Responsibilities:** Capture and store end-of-day/end-of-month KPI states, allowing users to "rewind" dashboards to see exactly what the data looked like on a specific past date.
**3. Inputs:** Finalized Daily/Monthly KPIs and Metrics.
**4. Outputs:** Immutable Analytical Snapshots.
**5. Dependencies:** Platform Storage, Audit Engine.
**6. Failure Handling:** Re-attempts snapshot generation utilizing event-sourcing rebuilds if a scheduled snapshot fails.
**7. Security Considerations:** Historical snapshots respect the access control lists (ACLs) that were active at the time the snapshot was taken.
**8. Future Extensibility:** Blockchain integration to provide cryptographically verifiable proofs of historical school performance for accreditation bodies.

---

### 4.15 Shared Components
**1. Purpose:** Provide foundational tools, constants, and contracts for the analytical ecosystem.
**2. Responsibilities:** Define Time-Series Interfaces, Metric DTOs, Aggregation Enums (SUM, AVG, P99), and standard visualization contracts.
**3. Inputs:** N/A (Library level).
**4. Outputs:** Reusable Data Structures, Abstract Classes.
**5. Dependencies:** None.
**6. Failure Handling:** N/A.
**7. Security Considerations:** Houses the generic validation logic to sanitize all analytical queries against injection attacks.
**8. Future Extensibility:** Extraction into standard libraries that external BI tools (e.g., Tableau, PowerBI) can import to natively understand the School OS data structures.
