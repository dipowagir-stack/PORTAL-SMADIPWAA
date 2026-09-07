# AI Layer Architecture

## 1. Overview
The AI Layer serves as a unified service that provides Artificial Intelligence capabilities to the entire school system. Rather than tightly coupling AI logic into specific modules, the AI Engine acts as a standalone Service Layer that other modules (Academic, Finance, Student, Teacher, etc.) can call for specialized tasks.

## 2. Core Principles
- **AI as a Service (AIaaS)**: The AI engine exposes a simple API that other modules consume.
- **Role-Based Context**: The AI adapts its persona and system instructions based on the requested `role` (Teacher, Student, Administration, Curriculum, Finance, Analytics).
- **Decoupled Architecture**: Existing modules do not need to manage API keys or SDKs; they simply pass data and a query to the `AIService`.

## 3. Architecture Design
The architecture is split into Client-side wrappers and a Server-side API to securely handle the Gemini SDK.

### 3.1. Client-Side (`src/domains/ai/services.ts`)
A static utility class `AIService` acts as the SDK for the frontend.
- **Methods**: `askTeacher`, `askStudent`, `askAdministration`, `askCurriculum`, `askFinance`, `askAnalytics`.
- **Payload**: Accepts a `query` (string) and an optional `context` (JSON object).

### 3.2. Server-Side (`/api/ai/ask`)
The backend endpoint residing in `server.ts`.
- **Security**: Keeps the `GEMINI_API_KEY` hidden from the client.
- **Prompt Engineering**: Dynamically injects `systemInstruction` depending on the role. For example, `role: 'student'` configures the AI to act as a tutor (guiding instead of giving direct answers).
- **Execution**: Uses `@google/genai` to communicate with the `gemini-3.5-flash` model.

## 4. Usage Example
When a teacher wants to analyze a student's performance:
```typescript
const studentData = { name: "Budi", grades: [80, 65, 70] };
const response = await AIService.askTeacher(
  "Berikan saran perbaikan nilai untuk siswa ini.", 
  studentData
);
```

## 5. Extensibility
New roles can be added simply by extending the `AIRole` type in `types.ts` and adding a new `case` block in the backend switch statement to define the system instructions.
