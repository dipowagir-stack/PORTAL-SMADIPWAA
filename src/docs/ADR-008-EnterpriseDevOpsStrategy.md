# ADR-008: Enterprise DevOps, CI/CD & Deployment Strategy

## 1. Executive Summary
This Architecture Decision Record (ADR) establishes the Enterprise DevOps, CI/CD, Infrastructure, and Observability strategy for the Education Operating System (EduOS). To support the Modular Monolith (ADR-002) and enable a seamless transition to future microservices, we adopt a **GitOps-driven Cloud-Native Platform** approach. This strategy utilizes **GitLab CI/CD** for continuous integration, **ArgoCD** for continuous deployment, **Terraform** for Infrastructure as Code (IaC), **Kubernetes (K8s)** as the container orchestration platform, and **OpenTelemetry** for unified observability. This automation-first strategy ensures immutable infrastructure, zero-downtime deployments, high availability, and operational simplicity over the 10+ year lifespan of the system.

## 2. Context
Enterprise Architecture v1 and previous ADRs (001-007) have defined a robust technology stack (.NET 8, React, PostgreSQL, Kafka), a strict Workspace-Based Monorepo, isolated domain databases, an API gateway, and a Zero Trust security posture. As implementation prepares to begin, a standardized delivery mechanism is required to build, test, secure, deploy, and monitor this complex ecosystem across multiple environments (Development, QA, Staging, Production) and varying deployment models (Cloud Native, Hybrid, On-Premise).

## 3. Problem Statement
Without a highly automated and standardized DevOps strategy, enterprise software deployments become bottlenecked by manual interventions, configuration drift, and "works on my machine" syndromes. Deploying a Modular Monolith—and eventually microservices—without GitOps, automated database migrations, and deep observability will lead to catastrophic deployment failures, extended maintenance windows, and an inability to meet aggressive Service Level Objectives (SLOs).

## 4. DevOps Principles
*   **Infrastructure as Code (IaC):** All infrastructure, environments, and networking are defined in version-controlled code. Manual UI clicks in cloud consoles are strictly prohibited.
*   **GitOps:** Git is the single source of truth for declarative infrastructure and applications. Agents (e.g., ArgoCD) continuously reconcile the desired state in Git with the live environment.
*   **Immutable Infrastructure:** Servers and containers are never modified after deployment. Patches or updates require deploying a new image.
*   **Automation First:** If a task is performed more than once, it must be automated.
*   **Observability First:** Logging, metrics, and tracing are integrated by default via OpenTelemetry. A feature is not "done" until it is observable.
*   **Security by Default:** DevSecOps practices (SAST, DAST, SCA, Container Scanning) are shifted left and act as mandatory quality gates in the CI pipeline.

## 5. CI/CD Strategy
*   **Source Control & Workflow:** Git utilizing Trunk-Based Development. All code resides in the centralized Workspace-Based Monorepo (ADR-003).
*   **Continuous Integration (CI) Pipeline:** Triggered on every Pull Request (PR) and push to `main`.
    *   *Build:* Compile code, resolve dependencies.
    *   *Test:* Run Unit and Integration tests.
    *   *Static Analysis:* SonarQube for code quality and bugs.
    *   *Security Scanning:* Trivy for container vulnerabilities, Snyk for dependency analysis (SCA), SAST for code security.
    *   *Artifact Creation:* Build Docker images and tag with Semantic Versioning (SemVer) and Git commit hash.
*   **Artifact Repository:** Push container images to a secure private registry (e.g., Harbor or cloud-native registry like ACR/ECR). Helm charts and Nuget/npm packages are stored in a centralized package registry.
*   **Continuous Deployment (CD) Pipeline:**
    *   Upon merging to `main` and successful CI, the pipeline updates the deployment manifests (Helm values) in a dedicated GitOps repository.
    *   ArgoCD detects the commit in the GitOps repo and pulls the changes into the target Kubernetes cluster automatically.

## 6. Deployment Strategy
*   **Rolling Updates:** The default deployment strategy for the Modular Monolith host and API Gateway. Ensures zero downtime by sequentially replacing old pods with new ones while monitoring health checks.
*   **Feature Flags:** Managed via LaunchDarkly (or an internal equivalent). Decouples code deployment from feature release, allowing code to be deployed to production darkly and turned on progressively.
*   **Blue/Green Deployment:** Used for major architectural shifts or massive infrastructure upgrades where rolling updates are too risky. Traffic is flipped at the API Gateway/Load Balancer layer.
*   **Canary Deployment:** Used for high-risk core modules (e.g., Finance, Identity). Argo Rollouts will route a small percentage of traffic (e.g., 5%) to the new version, analyze OpenTelemetry metrics, and automatically promote or rollback.
*   **Database Migration Strategy:** Automated via tools like DbUp or EF Core Migrations, executed as Kubernetes Init Containers or dedicated pre-sync ArgoCD jobs *before* the application pods start. Migrations must be strictly backward-compatible.
*   **Rollback Strategy:** GitOps makes rollbacks trivial; revert the commit in the GitOps repository, and ArgoCD instantly restores the previous state.

## 7. Environment Strategy
| Environment | Purpose | Ownership | Deployment Policy |
| :--- | :--- | :--- | :--- |
| **Local** | Developer testing | Developer | Docker Compose / Minikube. Ad-hoc. |
| **Shared Dev** | Integrating cross-team PRs | Engineering | Auto-deployed from feature branches. |
| **QA** | QA Testing, E2E Automation | QA Team | Auto-deployed on merge to `main`. |
| **Staging** | Production mirror, UAT, Load Testing | DevOps / Product | Triggered via release tag or promotion. |
| **Production** | Live tenant traffic | SRE / Ops | Gated. Requires approval + release window. |
| **Sandbox** | Partner/Plugin Integration | DevRel | Mirrored from Staging. Sanitized data. |
| **Disaster Recovery** | Passive standby | SRE | Continuous replication from Production. |

## 8. Infrastructure Strategy
*   **Infrastructure as Code:** Terraform is used to provision base cloud infrastructure (VPCs, Managed Kubernetes clusters, Managed PostgreSQL, Managed Kafka).
*   **Configuration Management:** Helm is used to template Kubernetes manifests.
*   **Containerization:** Docker (containerd runtime in K8s). All applications (Frontend, Backend, Background Workers) are containerized.
*   **Secret Management:** HashiCorp Vault is integrated with Kubernetes via the Vault Secrets Operator to inject secrets directly into pods at runtime. Secrets are never stored in Git.
*   **Scaling:**
    *   *Horizontal Pod Autoscaling (HPA):* Scales application pods based on CPU/Memory and custom metrics (e.g., Kafka lag).
    *   *Cluster Autoscaler:* Scales underlying Kubernetes nodes.
*   **High Availability & Disaster Recovery:** Deployments span multiple Availability Zones (AZs). Databases use synchronous replication. Regular DR drills execute cross-region failovers.
*   **SSL/TLS & Certificates:** cert-manager automates the provisioning and renewal of Let's Encrypt or Enterprise CA certificates.

## 9. Observability Strategy
Based on the **OpenTelemetry (OTel)** standard to avoid vendor lock-in.
*   **Application & Infrastructure Logs:** Structured JSON logs collected by Fluent Bit, forwarded to Elasticsearch/OpenSearch (or Loki).
*   **Metrics:** Prometheus scrapes metrics from applications, API Gateway, Kafka, and PostgreSQL. Grafana provides enterprise dashboards.
*   **Distributed Tracing:** Jaeger or Tempo. Every request receives a W3C Trace Context correlation ID at the API Gateway, which propagates through the Monolith, Kafka events, and background workers.
*   **Alerting:** Prometheus Alertmanager integrates with PagerDuty/Slack based on clearly defined Service Level Indicators (SLIs).
*   **SLOs and Error Budgets:** Strict Service Level Objectives (e.g., 99.9% API uptime, <200ms latency). If the Error Budget is depleted, feature deployments freeze, and engineering focuses solely on reliability.

## 10. Operational Governance
*   **Release Calendar:** Weekly scheduled deployments for standard features. CI/CD allows out-of-band hotfixes at any time.
*   **Maintenance Windows:** Defined for disruptive database maintenance (e.g., major PostgreSQL version upgrades).
*   **Incident Management:** Tiered on-call rotation. Blameless Post-Mortems are mandatory for any Sev-1/Sev-2 incident.
*   **Capacity Planning:** Quarterly reviews of Prometheus historical metrics to forecast compute and storage requirements.
*   **Operational Runbooks:** Maintained as Markdown in the `docs/` repository, detailing troubleshooting steps for common alerts.

## 11. Migration Strategy (Evolution of Platform)
To support varying customer sizes (from single schools to national deployments), the infrastructure platform will evolve:
1.  **Containerized Deployment (Day 1):** Docker Compose for local and small on-premise single-server installations.
2.  **Cloud Native Platform (Phase 2):** Managed Kubernetes (EKS/AKS/GKE) for the primary SaaS offering, utilizing the full GitOps CI/CD pipeline.
3.  **Enterprise Multi-Cluster (Future):** Kubernetes Cluster API and ArgoCD ApplicationSets used to manage dozens of globally distributed clusters for data residency and massive scale.

## 12. Decision Matrix

| Strategy / Tool | Automation | Reliability | Scalability | Security | Operational Simplicity | Weighted Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Weight** | 10 | 10 | 9 | 10 | 8 | Max 470 |
| Traditional CI/CD (Push to Prod) | 6 | 5 | 7 | 6 | 9 | 305 |
| **GitOps (ArgoCD Pull Model)** | **10** | **9** | **10** | **10** | **7** | **436** |
| Mutable Infrastructure (VMs) | 4 | 5 | 4 | 5 | 6 | 224 |
| **Kubernetes + Terraform** | **10** | **10** | **10** | **9** | **6** | **428** |

## 13. Risk Analysis
*   **Deployment Risks (Bad Migrations):** Breaking database changes cause downtime. *Mitigation:* Mandate the "Expand and Contract" pattern for database migrations. Code must support both old and new schemas simultaneously.
*   **Infrastructure Risks (State Drift):** Manual changes are made in the cloud console. *Mitigation:* GitOps strictly overwrites manual changes. IAM policies deny manual write access to production environments.
*   **Cloud Risks (Vendor Lock-in):** *Mitigation:* Use Kubernetes, Terraform, and OpenTelemetry to maintain cloud portability.
*   **Operational Risks (Alert Fatigue):** Too many false positive alerts. *Mitigation:* Tune alerts to trigger only on SLO/Error Budget violations, not on individual transient errors.

## 14. Consequences
*   **Positive:** Highly predictable, repeatable, and secure deployments. Rapid disaster recovery (re-deploy the entire cluster from Git). Unified visibility across the entire enterprise stack.
*   **Negative:** High cognitive load and steep learning curve for developers adopting Kubernetes, Terraform, and GitOps paradigms. Requires a dedicated Platform Engineering team to build and maintain the internal developer platform.

## 15. Implementation Notes
*   Establish the GitOps repository distinct from the application Monorepo (ADR-003).
*   Install ArgoCD and configure it to poll the GitOps repository.
*   Implement the CI pipeline in GitLab CI/CD, integrating SonarQube, Trivy, and Snyk immediately.
*   Instrument the .NET 8 Modular Monolith with the OpenTelemetry SDK before deploying to Staging.

## 16. Final Recommendation
Adopt the **GitOps-driven Cloud-Native Platform** strategy. Standardize on Terraform for IaC, Kubernetes for compute, ArgoCD for deployment, and OpenTelemetry for observability. This approach aligns perfectly with the overarching Clean Architecture and Domain-Driven Design goals, providing a highly resilient, automated, and secure foundation for EduOS.
