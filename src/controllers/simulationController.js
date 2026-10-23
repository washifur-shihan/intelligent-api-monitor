import { batchProcessor } from '../services/batchProcessor.js';
import { logger } from '../config/logger.js';

export const simulationController = {
  /**
   * POST /api/simulate
   * Injects predefined real-world scenarios for instant testing and demonstration
   */
  async simulate(req, res, next) {
    try {
      const scenario = req.body.scenario || 'pdf-sample';
      logger.info(`Running simulation scenario: ${scenario}`);

      let testBatch = [];

      switch (scenario) {
        case 'pdf-sample':
          // The exact sample from Section 5 of the Technical Interview PDF
          testBatch = [
            {
              api_name: 'PatientDataAPI',
              response_time_ms: 1200,
              status_code: 200,
              records_returned: 50,
            },
            {
              api_name: 'AppointmentAPI',
              response_time_ms: 5500,
              status_code: 500,
              records_returned: 0,
            },
          ];
          break;

        case 'outage-500':
          testBatch = [
            {
              api_name: 'AppointmentAPI',
              response_time_ms: 5500,
              status_code: 500,
              records_returned: 0,
            },
            {
              api_name: 'BillingAPI',
              response_time_ms: 3400,
              status_code: 503,
              records_returned: 0,
            },
            {
              api_name: 'PatientDataAPI',
              response_time_ms: 450,
              status_code: 200,
              records_returned: 85,
            },
          ];
          break;

        case 'latency-spike':
          testBatch = [
            {
              api_name: 'LabResultsAPI',
              response_time_ms: 8450,
              status_code: 200,
              records_returned: 14,
            },
            {
              api_name: 'EHRSyncAPI',
              response_time_ms: 6200,
              status_code: 200,
              records_returned: 3,
            },
            {
              api_name: 'RadiologyPACSAPI',
              response_time_ms: 280,
              status_code: 200,
              records_returned: 20,
            },
          ];
          break;

        case 'zero-records':
          testBatch = [
            {
              api_name: 'PatientDataAPI',
              response_time_ms: 350,
              status_code: 200,
              records_returned: 0,
            },
            {
              api_name: 'PrescriptionAPI',
              response_time_ms: 410,
              status_code: 200,
              records_returned: 0,
            },
          ];
          break;

        case 'healthy-batch':
          testBatch = [
            { api_name: 'PatientDataAPI', response_time_ms: 320, status_code: 200, records_returned: 45 },
            { api_name: 'AppointmentAPI', response_time_ms: 210, status_code: 200, records_returned: 28 },
            { api_name: 'LabResultsAPI', response_time_ms: 640, status_code: 200, records_returned: 12 },
            { api_name: 'PharmacyDispenseAPI', response_time_ms: 180, status_code: 200, records_returned: 95 },
            { api_name: 'InsuranceEligibilityAPI', response_time_ms: 550, status_code: 200, records_returned: 1 },
          ];
          break;

        case 'chaotic-traffic':
          testBatch = [
            { api_name: 'AppointmentAPI', response_time_ms: 5500, status_code: 500, records_returned: 0 },
            { api_name: 'LabResultsAPI', response_time_ms: 8100, status_code: 200, records_returned: 15 },
            { api_name: 'BillingAPI', response_time_ms: 3200, status_code: 503, records_returned: 0 },
            { api_name: 'PatientDataAPI', response_time_ms: 450, status_code: 200, records_returned: 50 },
            { api_name: 'EHRSyncAPI', response_time_ms: 720, status_code: 200, records_returned: 0 },
            { api_name: 'PharmacyDispenseAPI', response_time_ms: 190, status_code: 200, records_returned: 110 },
          ];
          break;

        default:
          return res.status(400).json({
            success: false,
            error: `Unknown scenario '${scenario}'. Valid options: pdf-sample, outage-500, latency-spike, zero-records, healthy-batch, chaotic-traffic`,
          });
      }

      const result = await batchProcessor.process(testBatch);

      return res.status(200).json({
        success: true,
        scenario,
        message: `Executed simulation scenario '${scenario}' with ${testBatch.length} requests.`,
        summary: {
          totalProcessed: result.totalProcessed,
          anomaliesDetected: result.anomaliesDetected,
          normalCount: result.normalCount,
        },
        anomalies: result.anomalies,
      });
    } catch (err) {
      next(err);
    }
  },
};
