import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

let dbInstance = null;
let useJsonFallback = false;

// Ensure data directory exists
if (!fs.existsSync(path.dirname(config.storage.dbPath))) {
  fs.mkdirSync(path.dirname(config.storage.dbPath), { recursive: true });
}

// Try native node:sqlite import
let DatabaseSyncClass = null;
try {
  const sqlite = await import('node:sqlite');
  DatabaseSyncClass = sqlite.DatabaseSync;
} catch (e) {
  logger.warn('Native node:sqlite not available on this platform/node version');
}

export function initDatabase() {
  if (DatabaseSyncClass) {
    try {
      dbInstance = new DatabaseSyncClass(config.storage.dbPath);

      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS anomalies (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          api_name TEXT NOT NULL,
          response_time_ms INTEGER NOT NULL,
          status_code INTEGER NOT NULL,
          records_returned INTEGER NOT NULL,
          anomaly_types TEXT NOT NULL,
          severity TEXT NOT NULL,
          ai_alert_summary TEXT NOT NULL,
          ai_root_cause TEXT,
          ai_recommendation TEXT,
          ai_provider TEXT,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          raw_payload TEXT,
          created_at TEXT NOT NULL,
          resolved_at TEXT,
          resolution_note TEXT
        );

        CREATE TABLE IF NOT EXISTS api_metrics (
          id TEXT PRIMARY KEY,
          api_name TEXT NOT NULL,
          response_time_ms INTEGER NOT NULL,
          status_code INTEGER NOT NULL,
          records_returned INTEGER NOT NULL,
          is_anomaly INTEGER NOT NULL DEFAULT 0,
          timestamp TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
        CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity);
        CREATE INDEX IF NOT EXISTS idx_anomalies_api ON anomalies(api_name);
        CREATE INDEX IF NOT EXISTS idx_metrics_api ON api_metrics(api_name);
      `);

      logger.info('Database initialized using native node:sqlite', { path: config.storage.dbPath });
      return { type: 'sqlite', db: dbInstance };
    } catch (err) {
      logger.warn('SQLite init failed, activating JSON file storage fallback', { error: err.message });
    }
  }

  useJsonFallback = true;
  if (!fs.existsSync(config.storage.jsonBackupPath)) {
    fs.writeFileSync(config.storage.jsonBackupPath, JSON.stringify({ anomalies: [], metrics: [] }, null, 2));
  }
  logger.info('Database initialized using JSON file store fallback', { path: config.storage.jsonBackupPath });
  return { type: 'json' };
}

export function getDb() {
  return { dbInstance, useJsonFallback };
}
