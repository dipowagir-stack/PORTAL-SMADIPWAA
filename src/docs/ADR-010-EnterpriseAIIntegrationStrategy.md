# ADR-010: Enterprise AI Integration Strategy

## 1. Executive Summary
This Architecture Decision Record (ADR) defines the Enterprise AI Integration Strategy for the Education Operating System (EduOS). To prevent vendor lock-in, ensure FERPA/HIPAA compliance, and maintain strict Domain-Driven Design (DDD) boundaries, we establish a centralized **Enterprise AI Platform** utilizing an **AI Gateway** pattern and **Microsoft Semantic Kernel** as the core abstraction layer. This strategy mandates a **Multi-LLM approach**, prioritizing **Retrieval-Augmented Generation (RAG)** using `pgvector` and Hybrid Search. It establishes a governed transition from foundational AI assistants to autonomous AI agents, ensuring security, observability, and Human-in-the-Loop (HITL) oversight across the 10+ year platform lifecycle.

## 2. Context
The Enterprise Architecture v1 and ADRs 001-009 define a robust Modular Monolith (.NET 8, React, PostgreSQL, Kafka) governed by Clean Architecture, Zero Trust Security, and GitOps. EduOS requires the infusion of AI capabilities across all bounded contexts (Academic, Finance, Student, HR) to power virtual assistants, automate workflows, and provide decision support. However, integrating AI directly into individual modules creates technical debt, duplicates RAG pipelines, and exposes the enterprise to uncontrolled costs, prompt drift, and security vulnerabilities.

## 3. Problem Statement
Point-to-point integration of AI models (e.g., developers directly calling the OpenAI API from the Finance module) leads to severe architectural degradation. It creates rigid vendor lock-in, makes cost tracking impossible, bypasses enterprise authorization (OpenFGA), and scatters prompts throughout the codebase. Furthermore, uncoordinated AI memory and knowledge ingestion leads to data silos and hallucination risks. We require a centralized, domain-agnostic AI Platform that provides reusable AI capabilities, strict governance, and secure knowledge retrieval to all enterprise modules.

## 4. AI Principles
*   **Provider Independence (Model Agnostic):** The architecture must abstract the underlying LLM. Code relies on interfaces, not specific vendor APIs.
*   **Retrieval First (RAG):** LLMs must rely on enterprise knowledge injected via prompt context, rather than pre-trained parametric memory, to eliminate hallucinations.
*   **Human in the Loop (HITL):** High-stakes AI decisions (e.g., automated grading, disciplinary actions) require explicit human review and approval.
*   **AI Security & Privacy by Design:** Prompts must be sanitized, PII masked, and retrieval pipelines strictly governed by OpenFGA authorization policies.
*   **Prompt Governance:** Prompts are enterprise assets, requiring versioning, automated evaluation, and CI/CD deployment distinct from application code.
*   **Event-Driven AI:** AI capabilities should seamlessly integrate with the Enterprise Event Bus (Kafka) and Workflow Engine (Camunda).

## 5. Enterprise AI Platform
The Enterprise AI Platform operates as a foundational Platform Service, accessed by all business modules.

*   **AI Gateway:** A centralized ingress point (e.g., Kong AI Gateway or Azure API Management) for all outbound LLM requests. It handles authentication, authorization, rate limiting, and request routing.
*   **AI SDK (Semantic Kernel):** The standard integration library for all .NET 8 modules. Semantic Kernel provides standardized abstractions for Prompts, Planners, and Memory, allowing seamless swapping of underlying models.
*   **Multi-LLM Strategy:**
    *   *Primary Cloud Model:* Azure OpenAI (GPT-4o) for complex reasoning with enterprise compliance guarantees.
    *   *Alternative Cloud Models:* Anthropic Claude 3 / Google Gemini accessed via Gateway for specific modality strengths or vendor failover.
    *   *On-Premise / Local Models:* vLLM serving open-weights models (e.g., Llama 3) for highly sensitive data (PHI/PII) that cannot legally leave the enterprise boundary.
*   **Model Router:** Dynamically routes requests based on capability requirements, cost constraints, and latency targets (e.g., routing simple text summarization to a fast, cheap local model and complex workflow planning to a frontier cloud model).
*   **Prompt Management:** Prompts are abstracted into standard templates (e.g., Handlebars/Jinja), versioned in Git, and loaded dynamically from a Prompt Registry database. Hardcoding prompts in C# is strictly prohibited.
*   **Enterprise AI Services:** Reusable, encapsulated capabilities deployed on the platform:
    *   *Domain Assistants:* Teacher Assistant, Student Assistant, Parent Assistant, Finance Assistant.
    *   *Functional Assistants:* Document Assistant, Workflow Assistant, Reporting Assistant.

## 6. AI Knowledge Strategy (RAG Architecture)
*   **Knowledge Ingestion:** The Document Module publishes an Integration Event (Kafka) upon file upload. The AI Platform consumes this, triggering the ingestion pipeline.
*   **Document Processing & OCR:** Azure AI Document Intelligence extracts text, tables, and structure from complex PDFs and handwritten exams.
*   **Embedding Pipeline:** Text is chunked semantically and passed through an embedding model (e.g., OpenAI `text-embedding-3-large`).
*   **Vector Database:** `pgvector` extension within the PostgreSQL AI domain schema stores the embeddings alongside metadata.
*   **Hybrid Search:** Semantic search (`pgvector` cosine similarity) is fused with lexical search (Elasticsearch BM25) using Reciprocal Rank Fusion (RRF) to maximize retrieval accuracy.
*   **Authorization-Aware Retrieval:** The RAG pipeline *must* intercept the user's JWT, query OpenFGA, and append access-control filters to the vector search query. An AI agent can only retrieve and synthesize documents the user is explicitly permitted to read.

## 7. AI Agent Strategy
We adopt an Agentic AI architecture where LLMs utilize the Plugin SDK and Enterprise APIs to execute complex goals.
*   **Task Agents:** Execute single-step, stateless tasks (e.g., "Draft an email to parents about the field trip").
*   **Workflow Agents:** Integrate with Camunda to drive multi-step processes. The agent observes workflow state and triggers API commands based on policies.
*   **Research/Knowledge Agents:** Navigate the RAG pipeline to synthesize comprehensive reports from disparate academic and financial records.
*   **Decision Support Agents:** Analyze analytical data (Data Warehouse) to provide predictive insights (e.g., identifying students at risk of failing).
*   **Agent Interaction Model:** Agents communicate via the Event Bus and expose their capabilities through standard OpenAPI specifications, allowing the Semantic Kernel Planner to dynamically discover and chain agent actions.

## 8. AI Governance
*   **Risk Classification:** Every AI use case is classified (Low, Medium, High). High-risk cases (e.g., Student mental health analysis) require mandatory HITL workflows and rigorous ethical review.
*   **Prompt & Model Approval:** Changes to production prompts or underlying LLM versions require automated benchmarking and approval by the AI Governance Board.
*   **Audit Trails:** Every interaction (User -> Prompt -> Retrieved Context -> LLM Response) is logged immutably for compliance and auditing.
*   **Explainability:** AI-generated decisions must cite the exact source documents (via RAG metadata) used to formulate the response.

## 9. AI Security
*   **Prompt Injection Protection:** Inputs are sanitized and passed through a secondary, smaller "Guardrail" LLM or heuristic scanner to detect malicious instructions before reaching the primary model.
*   **Data Leakage Prevention (DLP):** PII/PHI masking occurs *before* context is sent to external LLMs.
*   **Guardrails:** Output validation ensures the LLM does not generate toxic, biased, or out-of-domain content.
*   **AI Authentication & Authorization:** Agents operate using tightly scoped Service Accounts and JWTs, restricted by Zero Trust principles (ADR-007).

## 10. AI Operations
*   **AI Cost Management:** The AI Gateway tags every request with a Tenant ID and Module ID, enabling chargebacks, cost-per-user tracking, and hard budget caps.
*   **AI Usage Monitoring & Observability:** OpenTelemetry traces span the entire AI request lifecycle, tracking token usage, latency, vector search speed, and external API calls.
*   **AI Evaluation & Benchmarking:** Continuous evaluation using "LLM-as-a-Judge" frameworks against a golden dataset of prompts/responses in the CI/CD pipeline.
*   **Feedback Loop:** Thumbs up/down and text feedback on AI responses are captured and routed to the Analytics data lake for continuous prompt tuning.

## 11. Decision Matrix

| Strategy / Technology | Accuracy / Quality | Security | Provider Independence | Maintainability | Operational Cost | Weighted Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Weight** | 10 | 10 | 9 | 9 | 8 | Max 460 |
| Direct API (Vendor Lock-in) | 9 | 6 | 1 | 4 | 5 | 235 |
| LangChain (Python focus) | 8 | 8 | 8 | 6 | 7 | 342 |
| **Semantic Kernel + Gateway** | **10** | **9** | **10** | **9** | **9** | **433** |
| Single LLM Strategy | 9 | 7 | 2 | 8 | 5 | 290 |
| **Multi-LLM / Hybrid Strategy**| **9** | **10** | **10** | **7** | **9** | **415** |

## 12. Risk Analysis
*   **Hallucination Risks:** The LLM invents facts regarding student records. *Mitigation:* Strict RAG implementation with low temperature settings. Require mandatory citation of source documents.
*   **Security & Prompt Injection Risks:** Malicious student prompt bypasses system constraints to alter grades. *Mitigation:* Strict Guardrails. AI agents operate with read-only permissions by default; write actions require explicit HITL approval workflows.
*   **Privacy Risks:** Sensitive medical data is sent to a public cloud LLM. *Mitigation:* DLP masking and dynamic routing of highly classified requests to local/on-premise open-weights models (vLLM).
*   **Cost Risks:** Runaway token consumption. *Mitigation:* Token quotas, caching of frequent semantic queries, and routing simple tasks to smaller, cheaper models (e.g., GPT-4o-mini).

## 13. Consequences
*   **Positive:** EduOS is completely insulated from the volatile AI vendor landscape. Security and authorization are guaranteed. AI capabilities can be developed once and reused across all modules.
*   **Negative:** High architectural complexity. Requires specialized AI engineering talent to maintain the Gateway, Semantic Kernel abstractions, and RAG pipelines.

## 14. Implementation Notes
*   Integrate **Microsoft Semantic Kernel** into the .NET 8 Foundation architecture.
*   Deploy an enterprise **AI Gateway** (e.g., Kong, Azure API Management, or LiteLLM) to proxy all external API calls.
*   Establish the `ai` schema in PostgreSQL to host `pgvector` tables.
*   Implement the **OpenFGA** interceptor in the RAG retrieval pipeline to guarantee authorized search.

## 15. Future Evolution
The AI platform will evolve through distinct maturity phases:
1.  **Single LLM (Initial):** Foundational integration with Azure OpenAI.
2.  **Multi-LLM (Platform):** Introduction of the AI Gateway, local models, and Provider Independence.
3.  **AI Agents:** Transition from reactive RAG chatbots to proactive Task and Workflow Agents.
4.  **Agentic Enterprise:** Autonomous swarms of specialized agents collaborating across domain boundaries to optimize enterprise operations, overseen by human administrators.

## 16. Final Recommendation
Adopt the **Enterprise AI Integration Strategy** utilizing an AI Gateway, Multi-LLM architecture, Semantic Kernel SDK, and an Authorization-Aware RAG pipeline. This abstraction-first approach is mandatory to ensure EduOS remains secure, cost-effective, and technologically agile as the AI landscape evolves over the next decade.
