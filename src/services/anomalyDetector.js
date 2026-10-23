import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

export const AnomalyType = {
  HIGH_LATENCY: 'HIGH_LATENCY',
  SERVER_ERROR: 'SERVER_ERROR',
  CLIENT_ERROR: 'CLIENT_ERROR',
  ZERO_RECORDS: 'ZERO_RECORDS',
  MISSING_DATA: 'MISSING_DATA',
  SCHEMA_INVALID: 'SCHEMA_INVALID',
  UNHEALTHY_COMBINATION: 'UNHEALTHY_COMBINATION',
};

export const SeverityLevel = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

export class AnomalyDetector {
  constructor(thresholds = config.thresholds) {
    this.thresholds = thresholds;
  }

  /**
   * Validate schema of incoming API record
   */
  validateInput(input) {
    const errors = [];
    if (!input || typeof input !== 'object') {
      return { isValid: false, errors: ['Input must be a valid JSON object'] };
    }
    if (!input.api_name || typeof input.api_name !== 'string' || input.api_name.trim() === '') {
      errors.push('Missing or invalid api_name (string required)');
    }
    if (typeof input.response_time_ms !== 'number' || input.response_time_ms < 0) {
      errors.push('Missing or invalid response_time_ms (non-negative number required)');
    }
    if (typeof input.status_code !== 'number' || input.status_code < 100 || input.status_code > 599) {
      errors.push('Missing or invalid status_code (HTTP status 100-599 required)');
    }
    if (typeof input.records_returned !== 'number' || input.records_returned < 0) {
      errors.push('Missing or invalid records_returned (non-negative integer required)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Analyzes an API response record and evaluates anomalies
   * @param {Object} record - { api_name, response_time_ms, status_code, records_returned, ... }
   * @returns {Object} { isAnomaly: boolean, anomalyTypes: string[], severity: string, details: Object }
   */
  detect(record) {
    const validation = this.validateInput(record);
    if (!validation.isValid) {
      return {
        isAnomaly: true,
        anomalyTypes: [AnomalyType.SCHEMA_INVALID],
        severity: SeverityLevel.HIGH,
        details: {
          validationErrors: validation.errors,
          reason: 'Input payload schema is invalid or contains malformed data types.',
        },
      };
    }

    const { api_name, response_time_ms, status_code, records_returned } = record;
    const detectedAnomalies = [];
    const reasons = [];

    // 1. Evaluate Response Time (Section 6.1 & 6.2)
    const isCriticalLatency = response_time_ms >= this.thresholds.criticalResponseTimeMs;
    const isHighLatency = response_time_ms >= this.thresholds.maxResponseTimeMs;

    if (isHighLatency) {
      detectedAnomalies.push(AnomalyType.HIGH_LATENCY);
      reasons.push(
        `High response time of ${response_time_ms}ms exceeds threshold of ${this.thresholds.maxResponseTimeMs}ms` +
          (isCriticalLatency ? ` (CRITICAL: exceeds ${this.thresholds.criticalResponseTimeMs}ms)` : '')
      );
    }

    // 2. Check HTTP Status Codes (Section 6.1 & 6.2)
    const is5xx = status_code >= 500 && status_code <= 599;
    const is4xx = status_code >= 400 && status_code <= 499;

    if (is5xx) {
      detectedAnomalies.push(AnomalyType.SERVER_ERROR);
      reasons.push(`Server failure with HTTP ${status_code} status`);
    } else if (is4xx) {
      detectedAnomalies.push(AnomalyType.CLIENT_ERROR);
      reasons.push(`Client / downstream authentication error with HTTP ${status_code} status`);
    }

    // 3. Validate Returned Data (Section 6.1 & 6.2)
    // For healthcare patient/appointment datasets, returning 0 records unexpectedly or failing with 0 records
    const isZeroRecords = records_returned === 0;
    if (this.thresholds.flagZeroRecords && isZeroRecords) {
      detectedAnomalies.push(AnomalyType.ZERO_RECORDS);
      if (status_code === 200) {
        reasons.push(`Unexpected empty dataset: 0 records returned for active healthcare endpoint`);
      } else {
        reasons.push(`Zero records returned in conjunction with error status ${status_code}`);
      }
    }

    // Combined Anomaly flag
    if (detectedAnomalies.length > 1) {
      detectedAnomalies.push(AnomalyType.UNHEALTHY_COMBINATION);
    }

    const isAnomaly = detectedAnomalies.length > 0;
    const severity = this.calculateSeverity({
      is5xx,
      is4xx,
      isCriticalLatency,
      isHighLatency,
      isZeroRecords,
      status_code,
      anomalyCount: detectedAnomalies.length,
    });

    return {
      isAnomaly,
      anomalyTypes: detectedAnomalies,
      severity: isAnomaly ? severity : null,
      details: {
        reasons,
        isHighLatency,
        isCriticalLatency,
        is5xx,
        is4xx,
        isZeroRecords,
      },
    };
  }

  /**
   * Calculate severity level based on combinations
   */
  calculateSeverity({ is5xx, is4xx, isCriticalLatency, isHighLatency, isZeroRecords, status_code, anomalyCount }) {
    // CRITICAL conditions:
    // - HTTP 500 or 503 outage
    // - Critical latency (>= 5000ms) with failure or zero records
    // - Multiple concurrent critical anomalies
    if (is5xx && (isZeroRecords || isHighLatency)) {
      return SeverityLevel.CRITICAL;
    }
    if (status_code === 500 || status_code === 503) {
      return SeverityLevel.CRITICAL;
    }
    if (isCriticalLatency) {
      return SeverityLevel.CRITICAL;
    }

    // HIGH conditions:
    // - Any 5xx error
    // - Response time >= 3000ms
    // - 4xx errors (e.g. 401 Unauthorized or 429 Rate Limited)
    if (is5xx || isHighLatency || is4xx) {
      return SeverityLevel.HIGH;
    }

    // MEDIUM conditions:
    // - 200 OK but 0 records returned for an expected dataset
    if (isZeroRecords) {
      return SeverityLevel.MEDIUM;
    }

    // LOW conditions:
    return SeverityLevel.LOW;
  }
}

export const anomalyDetector = new AnomalyDetector();
