import { repository } from '../db/repository.js';
import { notificationService } from '../services/notificationService.js';
import { logger } from '../config/logger.js';

export const alertController = {
  /**
   * GET /alerts or GET /api/alerts
   * Section 7.2: Fetch all active anomalies (with flexible filter & pagination)
   */
  async getAlerts(req, res, next) {
    try {
      const {
        status = 'ACTIVE',
        severity,
        api_name,
        search,
        limit = 50,
        offset = 0,
      } = req.query;

      const alerts = repository.getAnomalies({
        status,
        severity,
        api_name,
        search,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });

      return res.status(200).json({
        success: true,
        count: alerts.length,
        filter: {
          status: status || 'ALL',
          severity: severity || 'ALL',
          api_name: api_name || 'ALL',
        },
        alerts,
      });
    } catch (err) {
      logger.error('Error fetching alerts', { error: err.message });
      next(err);
    }
  },

  /**
   * GET /alerts/:id or GET /api/alerts/:id
   */
  async getAlertById(req, res, next) {
    try {
      const { id } = req.params;
      const alert = repository.getAnomalyById(id);

      if (!alert) {
        return res.status(404).json({ success: false, error: 'Alert not found' });
      }

      return res.status(200).json({ success: true, alert });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /alerts/:id/resolve or PATCH /api/alerts/:id/resolve
   */
  async resolveAlert(req, res, next) {
    try {
      const { id } = req.params;
      const { note = 'Resolved by operator' } = req.body || {};

      const existing = repository.getAnomalyById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Alert not found' });
      }

      const updated = repository.resolveAnomaly(id, note);
      logger.info(`Alert ${id} resolved successfully`, { note });

      return res.status(200).json({
        success: true,
        message: `Alert ${id} resolved successfully`,
        alert: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /alerts/:id/email-test
   * Trigger test email for this specific alert
   */
  async sendEmailForAlert(req, res, next) {
    try {
      const { id } = req.params;
      const alert = repository.getAnomalyById(id);
      if (!alert) {
        return res.status(404).json({ success: false, error: 'Alert not found' });
      }

      const emailResult = await notificationService.sendAnomalyAlertEmail(alert);
      return res.status(200).json({
        success: true,
        emailResult,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/alerts/clear
   * Reset store (useful for clean demo/evaluation testing)
   */
  async clearAll(req, res, next) {
    try {
      repository.clearAll();
      logger.info('Database cleared by user request');
      return res.status(200).json({ success: true, message: 'All anomaly alerts and metrics cleared' });
    } catch (err) {
      next(err);
    }
  },
};
