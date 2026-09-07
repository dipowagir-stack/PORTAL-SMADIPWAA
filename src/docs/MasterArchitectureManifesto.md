# Master Architecture Manifesto: School Operating System (School OS)

## 1. Analysis
The Enterprise School Management Platform is defined as a comprehensive School Operating System. The architectural mandate shifts the focus from isolated tooling (like teacher content generation) to a holistic, domain-driven ERP system. The platform must be strictly layered, highly cohesive, loosely coupled, and infinitely extensible via Plugins and Platform Services. AI is relegated to a supportive, provider-agnostic service layer rather than the core application driver.

## 2. Architecture Design
The system adheres strictly to the following unidirectional dependency flow (Clean Architecture & DDD):

1. **Platform**: The underlying infrastructure and deployment boundaries.
2. **Core Engine**: Bootstrapping, configuration, event bus, DI container, and base abstractions.
3. **Domain Model**: Pure business entities, value objects, and aggregate roots (Organization, Academic, Student, Finance, etc.). No external dependencies.
4. **Workflow Engine**: Orchestrator of business processes. Manages state, transitions, and event-driven reactions.
5. **Rule Engine**: Validates business constraints and policies independent of the workflows.
6. **Knowledge Engine**: Epistemological layer providing reusable business taxonomies, ontologies, and classifications.
7. **Integration Engine**: The Anti-Corruption Layer (ACL) for all external systems (SIS, State Databases).
8. **Platform Services**: Shared infrastructural capabilities (AI Engine, Notification, Search, Reporting).
9. **Business Modules**: Cohesive feature sets implementing specific domain use cases utilizing the layers below.
10. **Plugins**: Optional, installable, sandboxed extensions that consume workflows and services.
11. **User Interface**: Pure presentation layer. Absolutely no business logic.

## 3. Folder Structure
The physical codebase must reflect the logical architecture:

```
src/
├── core/                  # Core Engine (Events, Config, Auth)
├── domain/                # Domain Models (Entities, Value Objects by Domain)
├── workflows/             # Workflow Engine & Definitions
├── foundation/
│   ├── ruleEngine/        # Rule Engine & Global Rules
│   └── knowledgeEngine/   # Knowledge Engine & Ontologies
├── integration/           # Integration Engine & External Adapters
├── services/              # Platform Services (AI, Notification, Storage)
├── modules/               # Business Modules (Academic, Finance, Student)
├── plugins/               # Sandboxed Plugin Ecosystem
└── ui/                    # User Interface (Views, Components, State)
```

## 4. Responsibilities
*   **Domain**: Defines *what* the business is.
*   **Workflow**: Defines *how* the business operates.
*   **Rules**: Defines the *boundaries* of business operations.
*   **Knowledge**: Defines *what the system knows* about the business.
*   **Services**: Provides *tools* (like AI, Email) to execute operations.
*   **Plugins**: Provides *optional value* on top of the core business.
*   **UI**: Provides a *window* into the business state.

## 5. Dependencies
*   **The Dependency Rule**: Outer layers depend inward. Inner layers (Domain, Core) depend on nothing but language primitives.
*   **AI Independence**: The AI Engine depends on abstract provider interfaces, never concrete vendor SDKs within the core logic.
*   **Plugin Sandbox**: Plugins depend on Core abstractions and APIs; Core is completely unaware of specific Plugins.

## 6. Risks
*   **Layer Leakage**: The highest risk is UI components implementing workflow logic, or Prompts containing hardcoded business rules.
*   **Plugin Coupling**: Plugins attempting to bypass the Workflow or Integration engines to mutate Domain state directly.
*   **Provider Lock-in**: Tying the AI Engine too closely to a specific vendor's SDK structure.

## 7. Migration Strategy
*   **Strangler Fig Pattern**: Incrementally refactor existing monolithic features by extracting the Domain Model first, then wrapping existing logic in Workflows.
*   **Backward Compatibility**: Legacy UI endpoints will map to new Workflows without changing external API contracts.
*   **No Big Bang Rewrite**: Refactoring occurs iteratively as new features or modifications are requested within specific domains.

## 8. Future Extensibility
*   This architecture allows the platform to scale to a multi-tenant, global educational ERP.
*   New AI models can be hot-swapped via the Provider Manager without touching business workflows.
*   The Knowledge Engine paves the way for advanced, localized Semantic Search and RAG capabilities.
*   The Plugin architecture allows for a third-party App Marketplace without risking platform stability.
