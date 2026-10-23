import { anomalyDetector } from './anomalyDetector.js';
import { aiAlertService } from './aiAlertService.js';
import { notificationService } from './notificationService.js';
import { repository } from '../db/repository.js';
import { logger } from '../config/logger.js';

export class BatchProcessor {
  /**
   * Process a single or batch of API response metrics
   * @param {Object|Array} input - Single record or array of API response records
   * @param {Object} options - { sendEmail: boolean }
   * @returns {Promise<Object>} Batch processing summary
   */
  async process(input, options = {}) {
    const records = Array.isArray(input) ? input : [input];
    logger.info(`Starting batch processing for ${records.length} API response record(s)`);

    const results = {
      totalProcessed: records.length,
      anomaliesDetected: 0,
      normalCount: 0,
      anomalies: [],
      errors: [],
    };

    for (let index = 0; index < records.length; index++) {
      const record = records[index];

      try {
        // Step 1: Detect anomalies
        const evaluation = anomalyDetector.detect(record);

        // Record metrics for baseline analytics
        if (record && typeof record === 'object' && record.api_name) {
          repository.saveMetric({
            api_name: record.api_name,
            response_time_ms: Number(record.response_time_ms) || 0,
            status_code: Number(record.status_code) || 0,
            records_returned: Number(record.records_returned) || 0,
            is_anomaly: evaluation.isAnomaly,
            timestamp: record.timestamp || new Date().toISOString(),
          });
        }

        // Step 2: Handle anomalies
        if (evaluation.isAnomaly) {
          logger.warn(`Anomaly detected for API '${record?.api_name}'`, {
            types: evaluation.anomalyTypes,
            severity: evaluation.severity,
          });

          // Step 3: Generate AI-powered human-readable alert
          const aiAlert = await aiAlertService.generateAlert(record, evaluation);

          // Step 4: Persist anomaly in database
          const savedAnomaly = repository.saveAnomaly({
            timestamp: record.timestamp || new Date().toISOString(),
            api_name: record.api_name || 'UnknownAPI',
            response_time_ms: record.response_time_ms ?? -1,
            status_code: record.status_code ?? 0,
            records_returned: record.records_returned ?? 0,
            anomaly_types: evaluation.anomalyTypes,
            severity: aiAlert.severity || evaluation.severity,
            ai_alert_summary: aiAlert.alert_summary,
            ai_root_cause: aiAlert.root_cause_analysis,
            ai_recommendation: aiAlert.recommended_actions,
            ai_provider: aiAlert.provider,
            status: 'ACTIVE',
            raw_payload: record,
          });

          // Step 5: Optional Email Notification
          if (options.sendEmail || savedAnomaly.severity === 'CRITICAL') {
            notificationService.sendAnomalyAlertEmail(savedAnomaly).catch((e) => {
              logger.error('Failed to send background email alert', { error: e.message });
            });
          }

          results.anomaliesDetected++;
          results.anomalies.push(savedAnomaly);
        } else {
          results.normalCount++;
          logger.debug(`API '${record.api_name}' response is healthy within normal thresholds`);
        }
      } catch (err) {
        logger.error(`Error processing record at index ${index}`, { record, error: err.message });
        results.errors.push({
          index,
          record,
          error: err.message,
        });
      }
    }

    logger.info(`Batch processing completed. Monitored: ${results.totalProcessed}, Anomalies: ${results.anomaliesDetected}`);
    return results;
  }
}

export const batchProcessor = new BatchProcessor();
