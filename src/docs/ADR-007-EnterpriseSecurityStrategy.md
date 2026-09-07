# ADR-007: Enterprise Security & Authentication Strategy

## 1. Executive Summary
This Architecture Decision Record (ADR) establishes the Enterprise Security & Authentication Strategy for the Education Operating System (EduOS). Recognizing the highly sensitive nature of educational, medical, and financial data (FERPA, HIPAA, COPPA compliance), this strategy mandates a strict **Zero Trust Architecture**. We adopt **Keycloak** for centralized Identity and Access Management (IAM), **OpenFGA** for Relationship-Based Access Control (ReBAC) and Attribute-Based Access Control (ABAC), and **HashiCorp Vault** for Secrets Management. This strategy guarantees confidentiality, integrity, availability, and non-repudiation across the Modular Monolith and positions the enterprise for a secure transition to a distributed microservices ecosystem.

## 2. Context
EduOS is built upon a Modular Monolith architecture (.NET 8, React, PostgreSQL, Kafka) as defined in previous ADRs (001-006). The system comprises diverse bounded contexts, an AI Platform, a Plugin SDK, and various frontends (Web, Mobile). Security cannot be an afterthought or a perimeter-only defense. With the introduction of external plugins, AI agents acting on behalf of users, and multi-campus/multi-tenant scaling, security must be deeply integrated into the Domain and Application layers of every module.

## 3. Problem Statement
Educational ERP systems are prime targets for cyberattacks (ransomware, data exfiltration) and insider threats. Traditional perimeter-based security (e.g., VPNs and firewalls) is insufficient. Hardcoded Role-Based Access Control (RBAC) breaks down when complex educational relationships are introduced (e.g., "A parent can view grades for their child, but only if custody rights are active"). Furthermore, integrating third-party plugins and AI capabilities introduces massive supply chain and prompt-injection risks. We need a comprehensive, decentralized enforcement but centralized management security strategy.

## 4. Security Principles
*   **Zero Trust:** Never trust, always verify. Every request, regardless of origin (internal or external), must be authenticated and authorized.
*   **Least Privilege:** Users, services, plugins, and AI agents are granted only the minimum permissions required to perform their tasks.
*   **Defense in Depth:** Layered security controls across Client, Network, Application, Database, and Infrastructure.
*   **Security & Privacy by Design:** Security is embedded in the SDLC, not audited at the end.
*   **Immutable Audit:** All security events and state changes are recorded in an append-only, tamper-evident ledger.
*   **Default Deny:** If an explicit allow rule is not found, access is denied.

## 5. Identity Strategy
We adopt **Keycloak** as the central Identity Provider (IdP).

**Identity Types & Requirements:**
*   **Students:** Authenticated via SSO (Google Workspace/Microsoft Entra). Minimal privileges.
*   **Teachers:** Authenticated via SSO + MFA. Elevated privileges tied to assigned classes.
*   **Parents/Guardians:** Authenticated via local accounts (Email/Password) or social login + Email verification.
*   **Staff/Administrators:** Strictly authenticated via Enterprise SSO + hardware MFA (FIDO2).
*   **Operators/Developers:** Privileged Access Management (PAM) with Just-In-Time (JIT) provisioning.
*   **External Partners:** Authenticated via B2B Federation (SAML 2.0 / OIDC).
*   **Plugins:** Machine identities (Service Accounts) with strictly scoped JWTs.
*   **AI Agents:** Workload identities bound to the user context initiating the AI request.
*   **System Services:** Authenticated via mTLS and OAuth2 Client Credentials.

## 6. Authentication Strategy
*   **Protocols:** OAuth 2.0 and OpenID Connect (OIDC).
*   **JWT Strategy:** Short-lived Access Tokens (e.g., 15 minutes). Refresh Tokens must be securely stored (HttpOnly, Secure, SameSite=Strict cookies) and rotated on every use.
*   **Multi-Factor Authentication (MFA):** Mandatory for all staff, teachers, and administrators. Adaptive MFA applied based on user risk score (e.g., impossible travel).
*   **Password Policy:** Minimum 14 characters, complexity rules, and checking against compromised password databases (HIBP integration). 
*   **Passwordless Authentication:** Supported and encouraged via WebAuthn / FIDO2 (Passkeys).
*   **Single Sign-On (SSO) & Federation:** EduOS acts as an OIDC/SAML Service Provider (SP) delegating authentication to existing district IdPs where required.
*   **Service Authentication:** Internal service-to-service communication uses mTLS combined with internal OAuth2 Client Credentials.

## 7. Authorization Strategy
We adopt a unified **Policy-Based Access Control (PBAC)** engine using **OpenFGA** (implementing Google's Zanzibar model) to support complex ReBAC and ABAC.

*   **RBAC & ABAC Hybrid:** RBAC defines broad capabilities (e.g., "Is a Teacher"). ABAC and ReBAC define context (e.g., "Is a Teacher *of this specific student* in *this specific semester*").
*   **Resource Ownership & Record-Level Security:** OpenFGA relationship tuples dictate record-level access. The Application layer queries OpenFGA before fetching data. The Infrastructure layer applies EF Core Global Query Filters based on the resolved permissions.
*   **Field-Level Security:** Highly sensitive fields (e.g., SSN, medical notes) require explicit "read_sensitive" permission checks before the Application layer maps them to DTOs.
*   **Delegated Administration:** Principals can temporarily delegate permissions (e.g., Vice Principal covering for Principal) via time-bound OpenFGA relationships.
*   **Emergency Access (Break Glass):** Dedicated, heavily monitored emergency accounts with multi-party approval required for activation.
*   **Permission Auditing:** OpenFGA provides deterministic, auditable graphs to answer "Who has access to X and why?".

## 8. API Security
*   **API Gateway:** Kong Gateway serves as the Policy Enforcement Point (PEP), verifying JWT signatures, audience, and expiration before routing to the Monolith.
*   **Input Validation & Output Encoding:** Strict allow-list validation via FluentValidation. React natively encodes outputs to prevent Cross-Site Scripting (XSS).
*   **Protection Mechanisms:**
    *   **CSRF:** Thwarted by utilizing Bearer tokens and SameSite cookie attributes.
    *   **SQL Injection:** Prevented natively by EF Core (parameterized queries).
    *   **SSRF:** Outbound requests (e.g., webhooks) route through an egress proxy that blocks internal IP ranges.
*   **Rate Limiting & Throttling:** Enforced at the API Gateway to protect against DoS and brute-force attacks.
*   **Secure File Upload:** All uploads go directly to an isolated quarantined S3 bucket/MinIO, trigger an asynchronous malware scan via ClamAV/CrowdStrike, and are moved to the production bucket only upon passing.

## 9. Infrastructure Security
*   **Secret Management:** **HashiCorp Vault**. No secrets in code, environment variables, or CI/CD logs. Dynamic secret generation where possible (e.g., short-lived database credentials).
*   **Encryption at Rest:** AES-256 for all databases, message brokers, and object storage.
*   **Encryption in Transit:** TLS 1.3 required globally.
*   **Field-Level Encryption:** Application-level encryption (via Vault Transit Engine or .NET Data Protection) for PII/PHI (e.g., Social Security Numbers) *before* it hits the database.
*   **Key & Certificate Management:** Automated via cert-manager and Vault.

## 10. AI & Plugin Security
*   **AI Security:** 
    *   **Data Masking:** PII is scrubbed before prompts are sent to external LLMs.
    *   **RAG Authorization:** Vector databases are tagged with access control lists. The AI may only retrieve context the invoking user is explicitly authorized to view via OpenFGA.
    *   **Prompt Injection:** Input sanitization and strict system-prompt isolation.
*   **Plugin Security:**
    *   Plugins execute in isolated Sandboxes (WebAssembly or strictly configured AppDomains).
    *   Plugins have ZERO network or database access. They communicate solely via the heavily restricted Plugin SDK API.

## 11. Security Operations
*   **Audit Logging:** All mutations (Commands) emit audit logs detailing `Who, What, When, Where, Why`. Stored in an immutable, append-only Elasticsearch/Data Lake index.
*   **SIEM Integration:** Audit logs and security events stream to a central SIEM (e.g., Splunk, Microsoft Sentinel) for Threat Detection and Alerting.
*   **Vulnerability & Patch Management:** Automated scanning (Trivy, Snyk) in CI/CD. Software Bill of Materials (SBOM) generated for every build.
*   **Incident Response:** Defined playbooks for data breaches, ransomware, and unauthorized access, integrated with system isolation scripts.

## 12. Threat Modeling
Applied via the **STRIDE** methodology during the design phase of every feature:
*   **Spoofing:** Mitigated by strong OIDC identity, WebAuthn, and mTLS.
*   **Tampering:** Mitigated by TLS 1.3, JWT signatures, and immutable event logs.
*   **Repudiation:** Mitigated by centralized, tamper-evident audit logging and temporal database tables.
*   **Information Disclosure:** Mitigated by OpenFGA, Field-Level Encryption, and secure DTO mapping.
*   **Denial of Service:** Mitigated by Kong API Gateway rate limiting, WAF, and horizontal pod autoscaling.
*   **Elevation of Privilege:** Mitigated by centralized OpenFGA policies, Principle of Least Privilege, and strict separation of presentation and domain logic.

## 13. Decision Matrix

| Technology / Strategy | Security | Scalability | Maintainability | Compliance | Developer Productivity | Weighted Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Weight** | 10 | 9 | 9 | 10 | 8 | Max 460 |
| Keycloak (Identity) | 10 | 9 | 8 | 10 | 8 | 417 |
| OpenFGA (Authorization) | 10 | 10 | 9 | 10 | 7 | 427 |
| HashiCorp Vault (Secrets)| 10 | 10 | 8 | 10 | 7 | 418 |
| Zero Trust mTLS | 10 | 9 | 7 | 10 | 6 | 392 |

## 14. Risk Analysis
*   **Identity Risks (Account Takeover):** *Mitigation:* Mandate MFA for staff, enforce strict password policies, implement anomaly detection in Keycloak.
*   **Authorization Risks (BOLA/IDOR):** *Mitigation:* Shift authorization logic out of code and into OpenFGA. Enforce policy checks at the Application use-case level for *every* request.
*   **Supply Chain Risks (Compromised Dependencies):** *Mitigation:* Require SBOMs. Block CI/CD builds if critical vulnerabilities are found via Snyk/Dependabot.
*   **AI Risks (Data Exfiltration via LLM):** *Mitigation:* Enforce strict data classification. Use local/on-premise LLMs (vLLM) for highly sensitive data processing; restrict cloud LLMs to de-identified data.
*   **Compliance Risks (FERPA/HIPAA Violations):** *Mitigation:* Field-level encryption, strict audit logging, and automated data retention/deletion policies.

## 15. Consequences
*   **Positive:** A highly defensible, compliant, and modern security posture. Eliminates fragmented, ad-hoc security logic scattered across codebases.
*   **Negative:** High implementation overhead. Developers must learn the OpenFGA query language. Managing mTLS and Vault introduces significant operational complexity.

## 16. Implementation Notes
*   Deploy **Keycloak** and **HashiCorp Vault** as the first platform services.
*   Implement the **OpenFGA** service and define the core educational relationship tuples (e.g., Campus -> Department -> Course -> Class -> Student).
*   Enforce **SonarQube (SAST)** and **Trivy (Container Scanning)** as mandatory quality gates in the GitLab CI/CD pipeline (ADR-006) immediately.

## 17. Future Security Evolution
As the Modular Monolith scales into distributed Enterprise Microservices, we will implement a **Service Mesh (e.g., Istio or Linkerd)** to transparently manage mTLS, service-to-service authorization, and network telemetry without altering application code.

## 18. Final Recommendation
Adopt the Enterprise Security & Authentication Strategy as defined. The combination of Keycloak (Identity), OpenFGA (Authorization), and Vault (Secrets) provides the necessary foundation for a Zero Trust architecture capable of securing highly sensitive educational data across a 10+ year lifecycle.
