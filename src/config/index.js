import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  rootDir,
  
  // Anomaly Detection Thresholds (Configurable SLA & Baselines)
  thresholds: {
    maxResponseTimeMs: parseInt(process.env.MAX_RESPONSE_TIME_MS || '3000', 10),
    criticalResponseTimeMs: parseInt(process.env.CRITICAL_RESPONSE_TIME_MS || '5000', 10),
    flagZeroRecords: process.env.FLAG_ZERO_RECORDS !== 'false',
    failureStatusCodes: [400, 401, 403, 404, 408, 429, 500, 502, 503, 504],
    criticalStatusCodes: [500, 502, 503, 504],
  },

  // AI / LLM Configuration
  ai: {
    provider: (process.env.AI_PROVIDER || 'gemini').toLowerCase(),
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openAiApiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.LLM_MODEL || (process.env.AI_PROVIDER === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash'),
  },

  // Storage Configuration
  storage: {
    dbPath: process.env.DB_PATH || path.join(rootDir, 'data', 'monitor.db'),
    jsonBackupPath: path.join(rootDir, 'data', 'anomalies_store.json'),
  },

  // Email Alert Configuration (Section 7.4)
  email: {
    enabled: process.env.ENABLE_EMAIL_ALERTS === 'true',
    provider: process.env.EMAIL_PROVIDER || 'ethereal', // 'ethereal' (preview) or 'smtp'
    smtpHost: process.env.SMTP_HOST || 'smtp.ethereal.email',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    recipient: process.env.ALERT_RECIPIENT_EMAIL || 'sre-alerts@example.com',
  },

  // File Watcher Configuration (Section 5)
  fileWatcher: {
    enabled: process.env.ENABLE_FILE_WATCHER !== 'false',
    watchPath: path.resolve(rootDir, process.env.WATCH_FILE_PATH || './data/incoming_responses.json'),
  },
};
