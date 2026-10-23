import test from 'node:test';
import assert from 'node:assert/strict';
import { anomalyDetector, AnomalyType, SeverityLevel } from '../src/services/anomalyDetector.js';
import { aiAlertService } from '../src/services/aiAlertService.js';
import { batchProcessor } from '../src/services/batchProcessor.js';
import { repository } from '../src/db/repository.js';
import { initDatabase } from '../src/db/database.js';

// Initialize DB before tests
initDatabase();

test('AnomalyDetector: Correctly identifies healthy API response', () => {
  const healthyRecord = {
    api_name: 'PatientDataAPI',
    response_time_ms: 1200,
    status_code: 200,
    records_returned: 50,
  };

  const evaluation = anomalyDetector.detect(healthyRecord);
  assert.equal(evaluation.isAnomaly, false);
  assert.equal(evaluation.anomalyTypes.length, 0);
  assert.equal(evaluation.severity, null);
});

test('AnomalyDetector: Correctly detects 500 server error and 0 records (from PDF specification)', () => {
  const incidentRecord = {
    api_name: 'AppointmentAPI',
    response_time_ms: 5500,
    status_code: 500,
    records_returned: 0,
  };

  const evaluation = anomalyDetector.detect(incidentRecord);
  assert.equal(evaluation.isAnomaly, true);
  assert.ok(evaluation.anomalyTypes.includes(AnomalyType.SERVER_ERROR));
  assert.ok(evaluation.anomalyTypes.includes(AnomalyType.HIGH_LATENCY));
  assert.ok(evaluation.anomalyTypes.includes(AnomalyType.ZERO_RECORDS));
  assert.equal(evaluation.severity, SeverityLevel.CRITICAL);
});

test('AnomalyDetector: Detects high latency above threshold', () => {
  const slowRecord = {
    api_name: 'LabResultsAPI',
    response_time_ms: 4500,
    status_code: 200,
    records_returned: 25,
  };

  const evaluation = anomalyDetector.detect(slowRecord);
  assert.equal(evaluation.isAnomaly, true);
  assert.ok(evaluation.anomalyTypes.includes(AnomalyType.HIGH_LATENCY));
  assert.equal(evaluation.severity, SeverityLevel.HIGH);
});

test('AnomalyDetector: Detects unexpected zero records with 200 OK', () => {
  const emptyRecord = {
    api_name: 'EHRSyncAPI',
    response_time_ms: 300,
    status_code: 200,
    records_returned: 0,
  };

  const evaluation = anomalyDetector.detect(emptyRecord);
  assert.equal(evaluation.isAnomaly, true);
  assert.ok(evaluation.anomalyTypes.includes(AnomalyType.ZERO_RECORDS));
  assert.equal(evaluation.severity, SeverityLevel.MEDIUM);
});

test('AiAlertService: Generates human-readable alert for 500 failure', async () => {
  const incidentRecord = {
    api_name: 'AppointmentAPI',
    response_time_ms: 5500,
    status_code: 500,
    records_returned: 0,
  };
  const evaluation = anomalyDetector.detect(incidentRecord);
  const alert = await aiAlertService.generateAlert(incidentRecord, evaluation);

  assert.ok(alert.alert_summary.includes('AppointmentAPI'));
  assert.ok(alert.alert_summary.includes('500'));
  assert.ok(alert.alert_summary.includes('0 records'));
  assert.ok(alert.root_cause_analysis.length > 10);
  assert.ok(alert.recommended_actions.length > 10);
});

test('BatchProcessor: Ingests batch and persists anomalies to database', async () => {
  const batch = [
    {
      api_name: 'PatientDataAPI',
      response_time_ms: 950,
      status_code: 200,
      records_returned: 40,
    },
    {
      api_name: 'AppointmentAPI',
      response_time_ms: 5500,
      status_code: 500,
      records_returned: 0,
    },
  ];

  const result = await batchProcessor.process(batch);
  assert.equal(result.totalProcessed, 2);
  assert.equal(result.anomaliesDetected, 1);
  assert.equal(result.normalCount, 1);

  const activeAlerts = repository.getAnomalies({ status: 'ACTIVE' });
  assert.ok(activeAlerts.length >= 1);
  const found = activeAlerts.find((a) => a.api_name === 'AppointmentAPI');
  assert.ok(found);
  assert.equal(found.status_code, 500);
});
