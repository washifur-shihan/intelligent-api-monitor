import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

export const SYSTEM_PROMPT = `You are an elite Site Reliability Engineer (SRE) and AI System Observability specialist monitoring critical healthcare and enterprise external APIs (patient data, appointments, lab results, EHR sync, billing).

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
}`;

export class AiAlertService {
  constructor() {
    this.geminiClient = null;
    this.openAiClient = null;
    this.initClients();
  }

  initClients() {
    if (config.ai.geminiApiKey) {
      try {
        this.geminiClient = new GoogleGenerativeAI(config.ai.geminiApiKey);
        logger.info('Gemini AI Client initialized successfully');
      } catch (err) {
        logger.warn('Failed to initialize Gemini AI client', { error: err.message });
      }
    }

    if (config.ai.openAiApiKey) {
      try {
        this.openAiClient = new OpenAI({ apiKey: config.ai.openAiApiKey });
        logger.info('OpenAI Client initialized successfully');
      } catch (err) {
        logger.warn('Failed to initialize OpenAI client', { error: err.message });
      }
    }
  }

  /**
   * Build the user prompt for the LLM
   */
  buildUserPrompt(record, anomalyEvaluation) {
    return `Analyze this API anomaly and generate an alert:
- API Name: ${record.api_name}
- HTTP Status Code: ${record.status_code}
- Response Time: ${record.response_time_ms} ms
- Records Returned: ${record.records_returned}
- Detected Anomaly Types: ${anomalyEvaluation.anomalyTypes.join(', ')}
- Calculated Preliminary Severity: ${anomalyEvaluation.severity}
- Diagnostic Reasons: ${anomalyEvaluation.details.reasons.join('; ')}
- Timestamp: ${record.timestamp || new Date().toISOString()}

Generate the JSON alert now.`;
  }

  /**
   * Main entrypoint to generate human-readable alert using LLM or intelligent fallback
   */
  async generateAlert(record, anomalyEvaluation) {
    const userPrompt = this.buildUserPrompt(record, anomalyEvaluation);

    // Try Gemini if configured or requested
    if (this.geminiClient && (config.ai.provider === 'gemini' || !this.openAiClient)) {
      try {
        const result = await this.generateWithGemini(userPrompt);
        if (result) return { ...result, provider: 'gemini' };
      } catch (err) {
        logger.warn('Gemini alert generation failed, attempting fallback', { error: err.message });
      }
    }

    // Try OpenAI if configured
    if (this.openAiClient && (config.ai.provider === 'openai' || !this.geminiClient)) {
      try {
        const result = await this.generateWithOpenAI(userPrompt);
        if (result) return { ...result, provider: 'openai' };
      } catch (err) {
        logger.warn('OpenAI alert generation failed, attempting fallback', { error: err.message });
      }
    }

    // Intelligent heuristic fallback engine
    logger.info('Using Heuristic Alert Reasoning Engine for alert generation');
    const fallbackAlert = this.generateHeuristicAlert(record, anomalyEvaluation);
    return { ...fallbackAlert, provider: 'heuristic-fallback' };
  }

  async generateWithGemini(userPrompt) {
    const model = this.geminiClient.getGenerativeModel({
      model: config.ai.model.includes('gemini') ? config.ai.model : 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    const response = await model.generateContent(userPrompt);
    const text = response.response.text();
    return this.parseJsonResponse(text);
  }

  async generateWithOpenAI(userPrompt) {
    const response = await this.openAiClient.chat.completions.create({
      model: config.ai.model.includes('gpt') ? config.ai.model : 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const text = response.choices[0]?.message?.content;
    return this.parseJsonResponse(text);
  }

  parseJsonResponse(text) {
    try {
      const parsed = JSON.parse(text);
      return {
        alert_summary: parsed.alert_summary || 'API Anomaly Detected',
        root_cause_analysis: parsed.root_cause_analysis || 'Unspecified anomaly in service execution.',
        recommended_actions: parsed.recommended_actions || 'Inspect application server logs and downstream dependencies.',
        business_impact: parsed.business_impact || 'Operational degradation may affect end-user services.',
        severity: parsed.severity || 'HIGH',
      };
    } catch (err) {
      logger.error('Failed to parse LLM JSON response', { text, error: err.message });
      return null;
    }
  }

  /**
   * Intelligent Rule & Heuristic Engine
   * Matches the exact format specified in the technical interview prompt:
   * "AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue."
   */
  generateHeuristicAlert(record, anomalyEvaluation) {
    const { api_name, status_code, response_time_ms, records_returned } = record;
    const { details } = anomalyEvaluation;

    let alertSummary = '';
    let rootCause = '';
    let recommendedActions = '';
    let businessImpact = '';
    let severity = anomalyEvaluation.severity || 'HIGH';

    if (status_code === 500) {
      alertSummary = `${api_name} failed with status 500 and returned ${records_returned} records. Possible outage or data issue.`;
      rootCause = `Internal server error in ${api_name} microservice or unhandled exception during query processing.`;
      recommendedActions = `Check ${api_name} application logs for stack traces, inspect database connectivity, and restart crashing instances if necessary.`;
      businessImpact = `Clinical and administrative workflows relying on ${api_name} are blocked or unable to fetch records.`;
      severity = 'CRITICAL';
    } else if (status_code === 503 || status_code === 502) {
      alertSummary = `${api_name} is unavailable with HTTP ${status_code} (Service Unavailable / Gateway Error). Service is down or experiencing heavy load.`;
      rootCause = `Gateway or proxy timed out attempting to communicate with the upstream ${api_name} service. Likely node restart or network partition.`;
      recommendedActions = `Check load balancer health checks, upstream container status, and pod autoscaling metrics.`;
      businessImpact = `Total unavailability of ${api_name}. Direct user-facing timeouts will occur.`;
      severity = 'CRITICAL';
    } else if (status_code === 401 || status_code === 403) {
      alertSummary = `${api_name} rejected request with HTTP ${status_code} (${status_code === 401 ? 'Unauthorized' : 'Forbidden'}). Authentication or token issue.`;
      rootCause = `API key, bearer token, or mutual TLS certificate expired or lacks sufficient permission for this endpoint.`;
      recommendedActions = `Verify API credentials, rotate expired service tokens, and validate IAM policies.`;
      businessImpact = `Automated syncing and queries are blocked due to rejected authentication.`;
      severity = 'HIGH';
    } else if (details.isHighLatency) {
      const isCritical = details.isCriticalLatency;
      alertSummary = `${api_name} responded with high latency of ${response_time_ms}ms (threshold: ${config.thresholds.maxResponseTimeMs}ms). Potential performance bottleneck.`;
      rootCause = `Slow database queries, table lock contention, or third-party downstream network congestion affecting ${api_name}.`;
      recommendedActions = `Inspect APM trace telemetry, check slow database query logs, and review recent index migrations.`;
      businessImpact = `Slow page loads and clinical workflow latency; risk of cascading request timeouts.`;
      severity = isCritical ? 'CRITICAL' : 'HIGH';
    } else if (status_code === 200 && records_returned === 0) {
      alertSummary = `${api_name} returned status 200 but 0 records were received. Potential silent data loss or partition issue.`;
      rootCause = `Query returned empty dataset. Potential misconfigured filter parameters, database replication lag, or data ingestion pipeline failure.`;
      recommendedActions = `Validate database table row counts, check data ingestion pipeline status, and verify search query parameters.`;
      businessImpact = `Users and downstream analytics see empty datasets; potential missed appointments or missing patient records.`;
      severity = 'MEDIUM';
    } else {
      alertSummary = `${api_name} exhibited irregular behavior (Status ${status_code}, ${response_time_ms}ms, ${records_returned} records).`;
      rootCause = `Anomalous metric combination detected outside normal operational baseline.`;
      recommendedActions = `Review service metrics and inspect recent traffic patterns for ${api_name}.`;
      businessImpact = `Minor operational degradation.`;
      severity = 'LOW';
    }

    return {
      alert_summary: alertSummary,
      root_cause_analysis: rootCause,
      recommended_actions: recommendedActions,
      business_impact: businessImpact,
      severity,
    };
  }
}

export const aiAlertService = new AiAlertService();
