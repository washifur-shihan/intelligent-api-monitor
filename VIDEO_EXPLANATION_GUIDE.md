# Video Explanation Guide & Walkthrough Script (5–10 Mins)

**Candidate:** Washifur Rahman  
**Role:** AI Engineer  
**Project:** Intelligent API Monitoring & Alert System (PulseGuard AI)  
**Submission Requirement:** In compliance with Section 11.3 & Section 12 of the Technical Interview Task (*"Video Explanation (5–10 mins): Explain architecture, Show system workflow, Highlight key decisions"*).

---

## ⏱️ Video Presentation Timeline (Recommended 6–8 Minutes)

| Timestamp | Phase | Topic / Screen to Display |
| :--- | :--- | :--- |
| **00:00 – 01:00** | Introduction & Objectives | Introduce yourself, state the problem scenario (external healthcare APIs failing intermittently, abnormal response times, empty data payloads). |
| **01:00 – 02:45** | System Architecture & Design | Show the architecture diagram from `README.md` and explain the modular Express backend, Anomaly Engine, LLM Integration, Database layer, and Email dispatcher. |
| **02:45 – 04:30** | Live System Workflow & Demo | Open dashboard at `http://localhost:3000`, show real-time KPI cards, click "PDF Spec Run Prompt Sample", show the AI alert generated for AppointmentAPI, and resolve an alert. |
| **04:30 – 05:45** | Input Methods & CLI Demonstration | Demonstrate Input Method 1 (running `npm run ingest` on `data/sample_responses.json`) and Input Method 2 (sending custom POST requests to `/monitor`). |
| **05:45 – 07:15** | Key Technical Decisions & AI Resilience | Explain prompt engineering, schema enforcement (JSON mode), temperature 0.2, and the intelligent heuristic fallback engine for zero-downtime reliability. |
| **07:15 – 08:00** | Summary & Conclusion | Recap evaluation criteria: clean code, modular architecture, out-of-the-box readiness, and thank the evaluation team. |

---

## 🎙️ Step-by-Step Spoken Script

### 1. Introduction (00:00 – 01:00)
> *"Hello everyone! My name is Washifur Rahman, and this is my submission for the AI Engineer technical assignment: the Intelligent API Monitoring & Alert System, which I have named **PulseGuard AI**.*
>
> *In production healthcare ecosystems, modern applications rely on multiple external microservices: Patient Data APIs, Appointment scheduling, Lab Results, and EHR sync systems. These APIs often fail intermittently, return unexpected empty records, or experience latency spikes that silently degrade patient care.*
>
> *To solve this, I designed and implemented an intelligent monitoring system that continuously evaluates API responses, detects multidimensional anomalies, and leverages generative AI to generate human-readable, actionable incident alerts."*

---

### 2. Architecture & Design Decisions (01:00 – 02:45)
*(Show the Architecture Diagram from `README.md` on screen)*

> *"Let’s look at the architectural design:*
>
> 1. **Modular Ingestion Layer:** The system supports both static JSON file processing (via automated file watching and CLI scripts) and real-time streaming POST requests to `/monitor` or `/api/monitor`.
> 2. **Rule & Heuristic Anomaly Engine:** It evaluates three core dimensions:
>    - **Latency:** Checks response time against SLA baselines (warning at 3,000ms, critical at 5,000ms).
>    - **HTTP Status Codes:** Differentiates healthy 2xx responses from client 4xx auth issues and 5xx server outages.
>    - **Payload Integrity:** Flags unexpected zero-record returns where active clinical data was expected.
> 3. **AI Alert Generation Service:** Built with support for Google Gemini and OpenAI. It injects dynamic telemetry into a Site Reliability Engineer system prompt, producing structured JSON containing concise alert summaries, root-cause hypotheses, and suggested remediation steps.
> 4. **Persistence Layer:** Uses native SQLite for high performance and zero external setup hurdles, with an automated JSON file fallback.
> 5. **Notification Dispatcher:** Implemented with Nodemailer for automated email alerts, with support for instant Ethereal web preview links."*

---

### 3. Live Demonstration: Dashboard & Workflow (02:45 – 04:30)
*(Open browser to `http://localhost:3000`)*

> *"Now let's see the application in action:*
>
> *Here on the dashboard, we have top-level KPI metrics: Monitored Calls, Active Anomalies, Anomaly Rate, and Average Latency.*
>
> *I built an interactive **Scenario Simulator** right into the UI. Let’s click **'PDF Spec Run Prompt Sample'**, which injects the exact test cases from Section 5 of the interview PDF:*
> - *PatientDataAPI (1,200ms, status 200, 50 records) -> Normal*
> - *AppointmentAPI (5,500ms, status 500, 0 records) -> Critical Anomaly*
>
> *Notice what happens immediately: An alert card appears with a glowing red Critical badge. The AI summary statement reads verbatim:*
> > **'AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue.'**
>
> *Below it, the system provides an AI-synthesized root-cause analysis pointing to internal microservice exceptions and actionable steps for the on-call engineer.*
>
> *When the on-call team resolves the issue, they can click **'Resolve Alert'**, which updates the status to RESOLVED via a PATCH request and refreshes our active anomaly metrics in real time."*

---

### 4. Input Methods: Static File & CLI (04:30 – 05:45)
*(Switch to terminal)*

> *"Section 5 specified two primary input methods:*
>
> 1. *First, direct HTTP POST requests to `/monitor`.*
> 2. *Second, static JSON file ingestion. I built a dedicated CLI tool:*
>    ```bash
>    npm run ingest -- data/sample_responses.json
>    ```
> *When we execute this, the tool parses the JSON file and passes it through the monitoring pipeline. In addition, the system includes a background **File Watcher Service** that automatically ingests any changes saved to `data/incoming_responses.json`."*

---

### 5. Key Decisions & AI Resilience (05:45 – 07:15)
> *"Let me highlight three key engineering decisions:*
>
> 1. **Structured Outputs & Low Temperature (0.2):** LLMs can be prone to hallucination. By enforcing JSON Mode and low temperature, we guarantee reliable parsing without breaking frontend consumers.
> 2. **Zero-Downtime Fallback Engine:** In production SRE setups, an external LLM may be rate-limited or API keys might not be configured during an initial code evaluation. To ensure 100% out-of-the-box testability, I engineered an intelligent heuristic fallback engine that reproduces high-fidelity alerts even without an API key.
> 3. **Developer Experience & Turnkey Setup:** The entire system runs with a simple `npm install && npm start`. There are no external database daemons required to begin testing."*

---

### 6. Conclusion (07:15 – 08:00)
> *"In summary, this solution addresses every requirement of the technical interview task: automated API monitoring, multi-factor anomaly detection, AI-powered human-readable alerts, clean SQLite persistence, a REST API with `/alerts`, and a modern, responsive frontend dashboard.*
>
> *All prompts used are documented in `AI_Prompts.docx` and `AI_Prompts.md`, and the full codebase is available on GitHub in the `main` branch.*
>
> *Thank you very much for your time and consideration, and I look forward to the next steps!"*
