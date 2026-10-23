import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

export class NotificationService {
  constructor() {
    this.transporter = null;
    this.testAccount = null;
  }

  async getTransporter() {
    if (this.transporter) return this.transporter;

    if (config.email.smtpUser && config.email.smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: config.email.smtpHost,
        port: config.email.smtpPort,
        secure: config.email.smtpPort === 465,
        auth: {
          user: config.email.smtpUser,
          pass: config.email.smtpPass,
        },
      });
      logger.info('Custom SMTP transporter initialized', { host: config.email.smtpHost });
    } else {
      // Create auto Ethereal test account for zero-config email testing
      try {
        this.testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: this.testAccount.user,
            pass: this.testAccount.pass,
          },
        });
        logger.info('Ethereal test mail transporter initialized', { testUser: this.testAccount.user });
      } catch (err) {
        logger.warn('Failed to create Ethereal test mail transporter', { error: err.message });
        return null;
      }
    }

    return this.transporter;
  }

  /**
   * Send an incident anomaly alert email
   */
  async sendAnomalyAlertEmail(anomaly) {
    if (!config.email.enabled) {
      logger.debug('Email alerts disabled in configuration (ENABLE_EMAIL_ALERTS=false)');
      return { sent: false, reason: 'EMAIL_ALERTS_DISABLED' };
    }

    try {
      const transporter = await this.getTransporter();
      if (!transporter) {
        return { sent: false, reason: 'NO_TRANSPORTER' };
      }

      const severityColor = {
        CRITICAL: '#e11d48',
        HIGH: '#ea580c',
        MEDIUM: '#d97706',
        LOW: '#2563eb',
      }[anomaly.severity] || '#e11d48';

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
          <div style="background: ${severityColor}; padding: 18px 24px; color: white;">
            <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.05em;">
              🚨 [${anomaly.severity}] API Anomaly Alert: ${anomaly.api_name}
            </h2>
            <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">Timestamp: ${anomaly.timestamp || new Date().toISOString()}</p>
          </div>
          
          <div style="padding: 24px;">
            <div style="background: #1e293b; border-left: 4px solid ${severityColor}; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 8px; color: #38bdf8; font-size: 16px;">AI Incident Summary</h3>
              <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #f1f5f9;">${anomaly.ai_alert_summary}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
              <tr style="border-bottom: 1px solid #334155;">
                <td style="padding: 10px; color: #94a3b8; font-weight: 600;">Monitored API</td>
                <td style="padding: 10px; font-weight: bold; color: #f8fafc;">${anomaly.api_name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #334155;">
                <td style="padding: 10px; color: #94a3b8; font-weight: 600;">HTTP Status</td>
                <td style="padding: 10px; color: ${anomaly.status_code >= 400 ? '#f43f5e' : '#10b981'}; font-weight: bold;">${anomaly.status_code}</td>
              </tr>
              <tr style="border-bottom: 1px solid #334155;">
                <td style="padding: 10px; color: #94a3b8; font-weight: 600;">Response Time</td>
                <td style="padding: 10px; font-weight: bold; color: ${anomaly.response_time_ms > 3000 ? '#f59e0b' : '#f8fafc'};">${anomaly.response_time_ms} ms</td>
              </tr>
              <tr style="border-bottom: 1px solid #334155;">
                <td style="padding: 10px; color: #94a3b8; font-weight: 600;">Records Returned</td>
                <td style="padding: 10px; font-weight: bold; color: #f8fafc;">${anomaly.records_returned}</td>
              </tr>
              <tr style="border-bottom: 1px solid #334155;">
                <td style="padding: 10px; color: #94a3b8; font-weight: 600;">AI Engine</td>
                <td style="padding: 10px; color: #38bdf8;">${anomaly.ai_provider || 'AI Engine'}</td>
              </tr>
            </table>

            ${anomaly.ai_root_cause ? `
              <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 6px; color: #cbd5e1; font-size: 14px;">Probable Root Cause:</h4>
                <p style="margin: 0; background: #1e293b; padding: 12px; border-radius: 6px; color: #94a3b8; font-size: 13px;">${anomaly.ai_root_cause}</p>
              </div>
            ` : ''}

            ${anomaly.ai_recommendation ? `
              <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 6px; color: #cbd5e1; font-size: 14px;">Recommended Engineering Action:</h4>
                <p style="margin: 0; background: #1e293b; padding: 12px; border-radius: 6px; color: #94a3b8; font-size: 13px;">${anomaly.ai_recommendation}</p>
              </div>
            ` : ''}

            <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #334155;">
              <p style="font-size: 12px; color: #64748b; margin: 0;">Intelligent API Monitoring & Alert System | Automated AI Incident Dispatcher</p>
            </div>
          </div>
        </div>
      `;

      const info = await transporter.sendMail({
        from: '"Intelligent API Monitor" <alerts@intelligent-monitor.internal>',
        to: config.email.recipient,
        subject: `🚨 [${anomaly.severity}] API Alert: ${anomaly.api_name} (Status ${anomaly.status_code})`,
        text: `${anomaly.ai_alert_summary}\nAPI: ${anomaly.api_name}\nStatus: ${anomaly.status_code}\nLatency: ${anomaly.response_time_ms}ms`,
        html: htmlContent,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`📧 Email sent! Ethereal preview available at: ${previewUrl}`);
      } else {
        logger.info('📧 Alert email dispatched to SMTP server', { messageId: info.messageId });
      }

      return {
        sent: true,
        messageId: info.messageId,
        previewUrl: previewUrl || null,
        recipient: config.email.recipient,
      };
    } catch (err) {
      logger.error('Failed to send anomaly alert email', { error: err.message });
      return { sent: false, error: err.message };
    }
  }
}

export const notificationService = new NotificationService();
