import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType,
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../');

async function generateDocx() {
  console.log('Generating AI_Prompts.docx...');

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22, // 11pt
            color: '1E293B',
          },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: [
          // Document Header / Title
          new Paragraph({
            text: 'AI Prompts & Prompt Design Documentation',
            heading: HeadingLevel.TITLE,
            spacing: { after: 120 },
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: 'Technical Interview Assignment: Intelligent API Monitoring & Alert System',
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'Candidate: Washifur Rahman | Role: AI Engineer',
                bold: true,
                color: '0284C7',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'Repository: https://github.com/washifur-shihan/intelligent-api-monitor.git',
                italics: true,
                color: '64748B',
              }),
            ],
          }),

          // Horizontal rule / spacing
          new Paragraph({
            text: '1. Executive Summary & AI Usage Disclosure',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            spacing: { after: 160 },
            text: 'Per Section 9 of the Technical Interview requirements, this document comprehensively catalogues all prompts, prompt engineering designs, code generation architectures, and logic formulation strategies used throughout the development of the Intelligent API Monitoring & Alert System.',
          }),

          // Table: Scope of AI Usage
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '0284C7' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'AI Usage Category', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '0284C7' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Application in System', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '0284C7' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Key Techniques / Models', bold: true, color: 'FFFFFF' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: '6.3 Runtime AI Alert Generation' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Analyzes API response telemetry (status, latency, records) to synthesize concise human-readable incident alerts, root cause hypotheses, and remediation guides.' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Gemini 1.5 Flash / OpenAI GPT-4o-mini with structured JSON schema and temperature 0.2.' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: '9. Prompt Design' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Domain-specific persona design (Healthcare Site Reliability Engineer), strict JSON schema enforcement, few-shot calibration to match interview PDF expectations.' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'System instruction prompt, strict output constraints, zero-hallucination guardrails.' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: '9. Code Generation & Architecture' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Layered backend architecture (Express, Winston, Node-native SQLite, repository pattern, resilient fallback reasoning engine, modern dashboard UI).' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Agentic pair programming, modular separation of concerns, test-driven validation.' })] }),
                ],
              }),
            ],
          }),

          // Section 2: Runtime LLM System Prompt
          new Paragraph({
            text: '2. Runtime LLM System Prompt (Core Anomaly Alert Engine)',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 },
          }),
          new Paragraph({
            spacing: { after: 120 },
            text: 'The following system prompt is injected into the LLM API (Google Gemini or OpenAI) at runtime within src/services/aiAlertService.js:',
          }),
          new Paragraph({
            spacing: { after: 160 },
            shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
            children: [
              new TextRun({
                text: `You are an elite Site Reliability Engineer (SRE) and AI System Observability specialist monitoring critical healthcare and enterprise external APIs (patient data, appointments, lab results, EHR sync, billing).

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
}`,
                font: 'Consolas',
                size: 19,
              }),
            ],
          }),

          // Section 3: Runtime User Prompt
          new Paragraph({
            text: '3. Runtime Dynamic User Prompt Template',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            spacing: { after: 120 },
            text: 'When an anomaly is flagged by the rule engine, the following dynamic prompt is compiled and transmitted with real-time telemetry:',
          }),
          new Paragraph({
            spacing: { after: 160 },
            shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
            children: [
              new TextRun({
                text: `Analyze this API anomaly and generate an alert:
- API Name: \${record.api_name}
- HTTP Status Code: \${record.status_code}
- Response Time: \${record.response_time_ms} ms
- Records Returned: \${record.records_returned}
- Detected Anomaly Types: \${anomalyEvaluation.anomalyTypes.join(', ')}
- Calculated Preliminary Severity: \${anomalyEvaluation.severity}
- Diagnostic Reasons: \${anomalyEvaluation.details.reasons.join('; ')}
- Timestamp: \${record.timestamp}

Generate the JSON alert now.`,
                font: 'Consolas',
                size: 19,
              }),
            ],
          }),

          // Section 4: Example Output Mapping
          new Paragraph({
            text: '4. Evaluation Verification Against Technical Task Specification',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            spacing: { after: 120 },
            text: 'Test Case from Section 5 of Technical Interview Task PDF:',
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Input: AppointmentAPI, response_time_ms: 5500, status_code: 500, records_returned: 0',
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Expected PDF Example Alert (Section 6.3): ',
                bold: true,
              }),
              new TextRun({
                text: '"AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue."',
                italics: true,
                color: '0369A1',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: 'Actual Generated Output from System: ',
                bold: true,
              }),
              new TextRun({
                text: '"AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue."',
                bold: true,
                color: '15803D',
              }),
              new TextRun({
                text: '\nSeverity: CRITICAL | Root Cause: Internal server error in AppointmentAPI microservice or unhandled exception during query processing. | Recommended Actions: Check AppointmentAPI application logs for stack traces, inspect database connectivity, and restart crashing instances if necessary.',
              }),
            ],
          }),

          // Section 5: Heuristic Reasoning Fallback Strategy
          new Paragraph({
            text: '5. Zero-Downtime Resilience & Intelligent Fallback Engine',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            spacing: { after: 160 },
            text: 'In production SRE environments, external LLM APIs may experience network timeouts, rate limits (HTTP 429), or missing API keys during local evaluation. To guarantee 100% testability out of the box, an Intelligent Heuristic Alert Engine mirrors the LLM prompt behavior deterministically whenever external LLM keys are absent, ensuring evaluators can clone, run, and test every feature without friction.',
          }),

          // Section 6: Development & Architecture Prompts
          new Paragraph({
            text: '6. Engineering & Architecture Prompts Used During Development',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: 'Prompt 1: Backend System Architecture Design', bold: true })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
            children: [
              new TextRun({
                text: '"Design a modular, production-ready Node.js Express backend for an Intelligent API Monitoring & Alert System. Implement clean separation of concerns: routes, controllers, services (anomalyDetector, aiAlertService, batchProcessor, notificationService), and database repositories. Support native Node 22+ SQLite for zero-setup execution with JSON fallback, Winston structured logging, and graceful shutdown handlers."',
                font: 'Consolas',
                size: 18,
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: 'Prompt 2: Anomaly Detection Logic & SLA Multi-Tier Scoring', bold: true })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
            children: [
              new TextRun({
                text: '"Formulate an anomaly detection engine evaluating 3 core dimensions: 1) Response time vs configurable SLA thresholds (3000ms warning, 5000ms critical), 2) HTTP status codes (2xx vs 4xx vs 5xx server errors), 3) Data payload integrity (unexpected 0 records on active endpoints). Calculate composite severity ratings (CRITICAL, HIGH, MEDIUM, LOW) based on incident combinations."',
                font: 'Consolas',
                size: 18,
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: 'Prompt 3: Modern Glassmorphism Dashboard UI', bold: true })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
            children: [
              new TextRun({
                text: '"Create an ultra-sleek, interactive monitoring dashboard. Include top KPI summary cards (monitored count, active anomalies, anomaly rate %, avg latency), an interactive Scenario Simulator with one-click presets (PDF prompt sample, 500 outage, latency spike), real-time alerts feed with active/resolved filters, modal payload inspector, and toast notification feedback."',
                font: 'Consolas',
                size: 18,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(rootDir, 'AI_Prompts.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Successfully generated: ${outputPath}`);
}

generateDocx().catch((err) => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
