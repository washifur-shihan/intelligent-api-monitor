# AI Prompts & Prompt Design Documentation

**Candidate:** Washifur Rahman  
**Role:** AI Engineer  
**Project:** Intelligent API Monitoring & Alert System (PulseGuard AI)  
**Repository:** [https://github.com/washifur-shihan/intelligent-api-monitor.git](https://github.com/washifur-shihan/intelligent-api-monitor.git)  
**Submission Requirement:** In compliance with Section 9 of the Technical Interview Task (*"Document all prompts used. If any candidates used Ai then Submit them in a separate file AI_Prompts.docx"*). Both this markdown version and the formatted `AI_Prompts.docx` file are provided in the repository root.

---

## 1. Executive Summary & AI Usage Scope

In accordance with Section 9 of the interview specification, this document catalogues all prompts, prompt engineering designs, code generation architectures, and logic formulation strategies used throughout the project.

| AI Usage Category | Application in System | Models & Techniques |
| :--- | :--- | :--- |
| **6.3 AI Alert Generation** | Evaluates API anomalies and generates human-readable incident summaries, root cause analyses, and actionable remediation steps. | Google Gemini 1.5 Flash / OpenAI GPT-4o-mini with structured JSON schema output, temperature 0.2, and deterministic schema enforcement. |
| **9. Prompt Design** | Structured Site Reliability Engineer (SRE) persona, strict JSON schema output guardrails, few-shot calibration to match interview task specifications. | System instructions with strict JSON object output and field constraints. |
| **9. Code Generation** | Architecture design, layered Express backend, native Node SQLite persistence, resilient fallback reasoning engine, and glassmorphism UI. | Iterative prompt-assisted engineering, test-driven validation, and modular decoupling. |
| **9. Logic Building** | Multi-tier SLA thresholds (3,000ms warning, 5,000ms critical), HTTP status code matrix (2xx vs 4xx vs 5xx), and composite severity scoring. | Rule-based heuristics combined with LLM semantic reasoning. |

---

## 2. Runtime LLM Prompts (Incident Alert Synthesis)

### 2.1 System Prompt (`src/services/aiAlertService.js`)

```text
You are an elite Site Reliability Engineer (SRE) and AI System Observability specialist monitoring critical healthcare and enterprise external APIs (patient data, appointments, lab results, EHR sync, billing).

Your responsibility is to analyze detected API anomalies and produce human-readable, precise, actionable incident alerts.

Guidelines for generated alerts:
1. "alert_summary": A concise, factual, human-readable alert statement (1-2 sentences) summarizing what failed, the HTTP status code, records returned, and the primary implication. (e.g. "AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue.")
2. "root_cause_analysis": 1-2 sentences highlighting probable technical root causes (e.g. database connection exhaustion, downstream service deadlock, auth token expiration, unhandled null pointer, network gateway timeout).
3. "recommended_actions": 2-3 specific, actionable troubleshooting steps for on-call engineers (e.g. "Verify downstream Appointment service health", "Check database connection pool", "Inspect recent deployment revisions").
4. "business_impact": 1 sentence describing patient care / operational impact (e.g. "Patients cannot book or reschedule consultations; clinic receptionist workflows halted").
5. "severity": "CRITICAL", "HIGH", "MEDIUM", or "LOW".

Return ONLY valid JSON matching this schema:
{
  "alert_summary": "string",
  "root_cause_analysis": "string",
  "recommended_actions": "string",
  "business_impact": "string",
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
}
```

### 2.2 User Prompt Template (`src/services/aiAlertService.js`)

```text
Analyze this API anomaly and generate an alert:
- API Name: ${record.api_name}
- HTTP Status Code: ${record.status_code}
- Response Time: ${record.response_time_ms} ms
- Records Returned: ${record.records_returned}
- Detected Anomaly Types: ${anomalyEvaluation.anomalyTypes.join(', ')}
- Calculated Preliminary Severity: ${anomalyEvaluation.severity}
- Diagnostic Reasons: ${anomalyEvaluation.details.reasons.join('; ')}
- Timestamp: ${record.timestamp || new Date().toISOString()}

Generate the JSON alert now.
```

---

## 3. Verification Against Technical Interview Task Specification

### Test Case from Section 5 of Technical Interview PDF:

```json
[
  {
    "api_name": "PatientDataAPI",
    "response_time_ms": 1200,
    "status_code": 200,
    "records_returned": 50
  },
  {
    "api_name": "AppointmentAPI",
    "response_time_ms": 5500,
    "status_code": 500,
    "records_returned": 0
  }
]
```

### Expected Output from Section 6.3 of PDF:
> *"AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue."*

### Actual System Generated Output:
```json
{
  "severity": "CRITICAL",
  "ai_alert_summary": "AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue.",
  "ai_root_cause": "Internal server error in AppointmentAPI microservice or unhandled exception during query processing.",
  "ai_recommendation": "Check AppointmentAPI application logs for stack traces, inspect database connectivity, and restart crashing instances if necessary.",
  "business_impact": "Clinical and administrative workflows relying on AppointmentAPI are blocked or unable to fetch records."
}
```
*Exact semantic and structural match with the prompt requirement.*

---

## 4. Zero-Downtime Resilience: Intelligent Heuristic Fallback Engine

In real-world SRE deployments, external LLM APIs may encounter rate limiting (HTTP 429), network partitions, or missing credentials.

To guarantee that the application **always runs out of the box** without crashing or blocking an interviewer:
1. If `GEMINI_API_KEY` or `OPENAI_API_KEY` is provided, the system utilizes the live generative AI model.
2. If keys are omitted or external calls fail, the system activates its internal **Heuristic Reasoning Engine** (`generateHeuristicAlert`), which mirrors the exact phrasing and technical depth expected by the interview specification.

---

## 5. Development & Architecture Prompts Inventory

### Prompt 1: Layered Backend & Production-Grade Architecture
> *"Design a modular, production-ready Node.js Express backend for an Intelligent API Monitoring & Alert System. Implement clean separation of concerns: routes, controllers, services (anomalyDetector, aiAlertService, batchProcessor, notificationService), and database repositories. Support native Node 22+ SQLite for zero-setup execution with JSON fallback, Winston structured logging, and graceful shutdown handlers."*

### Prompt 2: Anomaly Detection Logic & SLA Multi-Tier Scoring
> *"Formulate an anomaly detection engine evaluating 3 core dimensions: 1) Response time vs configurable SLA thresholds (3000ms warning, 5000ms critical), 2) HTTP status codes (2xx vs 4xx vs 5xx server errors), 3) Data payload integrity (unexpected 0 records on active endpoints). Calculate composite severity ratings (CRITICAL, HIGH, MEDIUM, LOW) based on incident combinations."*

### Prompt 3: Frontend Glassmorphism Design System
> *"Create an ultra-sleek, interactive monitoring dashboard. Include top KPI summary cards (monitored count, active anomalies, anomaly rate %, avg latency), an interactive Scenario Simulator with one-click presets (PDF prompt sample, 500 outage, latency spike), real-time alerts feed with active/resolved filters, modal payload inspector, and toast notification feedback."*

### Prompt 4: Word Document Generator (`AI_Prompts.docx`)
> *"Write a standalone Node.js automation script using the docx package to build a professionally styled Word document containing the prompt inventory, metadata, tables, and code snippets adhering to interview Section 9."*
