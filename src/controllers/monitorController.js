import { batchProcessor } from '../services/batchProcessor.js';
import { logger } from '../config/logger.js';

export const monitorController = {
  /**
   * POST /monitor or POST /api/monitor
   * Ingest single or batch of API response metrics
   */
  async postMonitor(req, res, next) {
    try {
      const payload = req.body;

      if (!payload || (Array.isArray(payload) && payload.length === 0)) {
        return res.status(400).json({
          success: false,
          error: 'Request body must contain at least one API response record (object or array of objects)',
        });
      }

      logger.info('Received API monitoring request', {
        itemCount: Array.isArray(payload) ? payload.length : 1,
        sourceIp: req.ip,
      });

      const sendEmail = req.query.sendEmail === 'true';
      const result = await batchProcessor.process(payload, { sendEmail });

      return res.status(200).json({
        success: true,
        message: `Processed ${result.totalProcessed} API response(s). Detected ${result.anomaliesDetected} anomaly(ies).`,
        summary: {
          totalProcessed: result.totalProcessed,
          anomaliesDetected: result.anomaliesDetected,
          normalCount: result.normalCount,
          errorCount: result.errors.length,
        },
        anomalies: result.anomalies,
        errors: result.errors,
      });
    } catch (err) {
      logger.error('Error in monitorController.postMonitor', { error: err.message, stack: err.stack });
      next(err);
    }
  },

  /**
   * POST /api/upload
   * Ingest static JSON file uploaded via HTTP multipart
   */
  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No JSON file uploaded' });
      }

      const fileContent = req.file.buffer.toString('utf8');
      let parsed;
      try {
        parsed = JSON.parse(fileContent);
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Uploaded file is not valid JSON' });
      }

      const result = await batchProcessor.process(parsed);

      return res.status(200).json({
        success: true,
        filename: req.file.originalname,
        message: `Uploaded file processed. Detected ${result.anomaliesDetected} anomaly(ies) across ${result.totalProcessed} records.`,
        summary: {
          totalProcessed: result.totalProcessed,
          anomaliesDetected: result.anomaliesDetected,
          normalCount: result.normalCount,
          errorCount: result.errors.length,
        },
        anomalies: result.anomalies,
      });
    } catch (err) {
      next(err);
    }
  },
};
