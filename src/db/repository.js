import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './database.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

function readJsonFile() {
  try {
    if (!fs.existsSync(config.storage.jsonBackupPath)) {
      return { anomalies: [], metrics: [] };
    }
    const data = fs.readFileSync(config.storage.jsonBackupPath, 'utf8');
    return JSON.parse(data || '{"anomalies":[],"metrics":[]}');
  } catch (err) {
    logger.error('Failed to read JSON storage file', { error: err.message });
    return { anomalies: [], metrics: [] };
  }
}

function writeJsonFile(data) {
  try {
    fs.writeFileSync(config.storage.jsonBackupPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    logger.error('Failed to write JSON storage file', { error: err.message });
  }
}

export const repository = {
  saveAnomaly(anomaly) {
    const { dbInstance, useJsonFallback } = getDb();
    const id = anomaly.id || uuidv4();
    const now = new Date().toISOString();
    const anomalyTypesStr = JSON.stringify(anomaly.anomaly_types || []);
    const rawPayloadStr = JSON.stringify(anomaly.raw_payload || {});

    const record = {
      id,
      timestamp: anomaly.timestamp || now,
      api_name: anomaly.api_name,
      response_time_ms: Number(anomaly.response_time_ms),
      status_code: Number(anomaly.status_code),
      records_returned: Number(anomaly.records_returned),
      anomaly_types: anomalyTypesStr,
      severity: anomaly.severity || 'HIGH',
      ai_alert_summary: anomaly.ai_alert_summary,
      ai_root_cause: anomaly.ai_root_cause || '',
      ai_recommendation: anomaly.ai_recommendation || '',
      ai_provider: anomaly.ai_provider || 'heuristic',
      status: anomaly.status || 'ACTIVE',
      raw_payload: rawPayloadStr,
      created_at: anomaly.created_at || now,
      resolved_at: anomaly.resolved_at || null,
      resolution_note: anomaly.resolution_note || null,
    };

    if (dbInstance && !useJsonFallback) {
      try {
        const stmt = dbInstance.prepare(`
          INSERT INTO anomalies (
            id, timestamp, api_name, response_time_ms, status_code, records_returned,
            anomaly_types, severity, ai_alert_summary, ai_root_cause, ai_recommendation,
            ai_provider, status, raw_payload, created_at, resolved_at, resolution_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          record.id,
          record.timestamp,
          record.api_name,
          record.response_time_ms,
          record.status_code,
          record.records_returned,
          record.anomaly_types,
          record.severity,
          record.ai_alert_summary,
          record.ai_root_cause,
          record.ai_recommendation,
          record.ai_provider,
          record.status,
          record.raw_payload,
          record.created_at,
          record.resolved_at,
          record.resolution_note
        );

        return { ...record, anomaly_types: anomaly.anomaly_types, raw_payload: anomaly.raw_payload };
      } catch (err) {
        logger.error('SQLite insert anomaly failed, writing to JSON fallback', { error: err.message });
      }
    }

    // Fallback store
    const store = readJsonFile();
    store.anomalies.unshift(record);
    writeJsonFile(store);
    return { ...record, anomaly_types: anomaly.anomaly_types, raw_payload: anomaly.raw_payload };
  },

  saveMetric(metric) {
    const { dbInstance, useJsonFallback } = getDb();
    const id = uuidv4();
    const timestamp = metric.timestamp || new Date().toISOString();

    if (dbInstance && !useJsonFallback) {
      try {
        const stmt = dbInstance.prepare(`
          INSERT INTO api_metrics (id, api_name, response_time_ms, status_code, records_returned, is_anomaly, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          id,
          metric.api_name,
          metric.response_time_ms,
          metric.status_code,
          metric.records_returned,
          metric.is_anomaly ? 1 : 0,
          timestamp
        );
        return;
      } catch (err) {
        logger.error('SQLite insert metric failed', { error: err.message });
      }
    }

    const store = readJsonFile();
    store.metrics = store.metrics || [];
    store.metrics.unshift({
      id,
      api_name: metric.api_name,
      response_time_ms: metric.response_time_ms,
      status_code: metric.status_code,
      records_returned: metric.records_returned,
      is_anomaly: metric.is_anomaly ? 1 : 0,
      timestamp,
    });
    // Keep last 1000 metrics in memory/file
    if (store.metrics.length > 1000) store.metrics.length = 1000;
    writeJsonFile(store);
  },

  getAnomalies({ status, severity, api_name, search, limit = 50, offset = 0 } = {}) {
    const { dbInstance, useJsonFallback } = getDb();

    if (dbInstance && !useJsonFallback) {
      try {
        let query = 'SELECT * FROM anomalies WHERE 1=1';
        const params = [];

        if (status && status !== 'ALL') {
          query += ' AND status = ?';
          params.push(status.toUpperCase());
        }
        if (severity && severity !== 'ALL') {
          query += ' AND severity = ?';
          params.push(severity.toUpperCase());
        }
        if (api_name) {
          query += ' AND api_name = ?';
          params.push(api_name);
        }
        if (search) {
          query += ' AND (api_name LIKE ? OR ai_alert_summary LIKE ? OR ai_root_cause LIKE ?)';
          const term = `%${search}%`;
          params.push(term, term, term);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const stmt = dbInstance.prepare(query);
        const rows = stmt.all(...params);

        return rows.map((r) => ({
          ...r,
          anomaly_types: parseJsonSafe(r.anomaly_types, []),
          raw_payload: parseJsonSafe(r.raw_payload, {}),
        }));
      } catch (err) {
        logger.error('SQLite query anomalies failed', { error: err.message });
      }
    }

    // JSON fallback
    const store = readJsonFile();
    let list = store.anomalies || [];

    if (status && status !== 'ALL') {
      list = list.filter((a) => a.status === status.toUpperCase());
    }
    if (severity && severity !== 'ALL') {
      list = list.filter((a) => a.severity === severity.toUpperCase());
    }
    if (api_name) {
      list = list.filter((a) => a.api_name === api_name);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.api_name.toLowerCase().includes(s) ||
          (a.ai_alert_summary && a.ai_alert_summary.toLowerCase().includes(s)) ||
          (a.ai_root_cause && a.ai_root_cause.toLowerCase().includes(s))
      );
    }

    return list.slice(offset, offset + limit).map((r) => ({
      ...r,
      anomaly_types: parseJsonSafe(r.anomaly_types, []),
      raw_payload: parseJsonSafe(r.raw_payload, {}),
    }));
  },

  getAnomalyById(id) {
    const { dbInstance, useJsonFallback } = getDb();
    if (dbInstance && !useJsonFallback) {
      try {
        const stmt = dbInstance.prepare('SELECT * FROM anomalies WHERE id = ?');
        const row = stmt.get(id);
        if (!row) return null;
        return {
          ...row,
          anomaly_types: parseJsonSafe(row.anomaly_types, []),
          raw_payload: parseJsonSafe(row.raw_payload, {}),
        };
      } catch (err) {
        logger.error('SQLite getAnomalyById failed', { error: err.message });
      }
    }

    const store = readJsonFile();
    const item = (store.anomalies || []).find((a) => a.id === id);
    if (!item) return null;
    return {
      ...item,
      anomaly_types: parseJsonSafe(item.anomaly_types, []),
      raw_payload: parseJsonSafe(item.raw_payload, {}),
    };
  },

  resolveAnomaly(id, resolutionNote = 'Manually resolved by operator') {
    const { dbInstance, useJsonFallback } = getDb();
    const resolvedAt = new Date().toISOString();

    if (dbInstance && !useJsonFallback) {
      try {
        const stmt = dbInstance.prepare(`
          UPDATE anomalies 
          SET status = 'RESOLVED', resolved_at = ?, resolution_note = ?
          WHERE id = ?
        `);
        stmt.run(resolvedAt, resolutionNote, id);
        return this.getAnomalyById(id);
      } catch (err) {
        logger.error('SQLite resolveAnomaly failed', { error: err.message });
      }
    }

    const store = readJsonFile();
    const item = (store.anomalies || []).find((a) => a.id === id);
    if (item) {
      item.status = 'RESOLVED';
      item.resolved_at = resolvedAt;
      item.resolution_note = resolutionNote;
      writeJsonFile(store);
      return {
        ...item,
        anomaly_types: parseJsonSafe(item.anomaly_types, []),
        raw_payload: parseJsonSafe(item.raw_payload, {}),
      };
    }
    return null;
  },

  getStats() {
    const { dbInstance, useJsonFallback } = getDb();

    if (dbInstance && !useJsonFallback) {
      try {
        const totalMetrics = dbInstance.prepare('SELECT COUNT(*) as count, AVG(response_time_ms) as avg_latency FROM api_metrics').get();
        const totalAnomalies = dbInstance.prepare('SELECT COUNT(*) as count FROM anomalies').get();
        const activeAnomalies = dbInstance.prepare("SELECT COUNT(*) as count FROM anomalies WHERE status = 'ACTIVE'").get();
        const resolvedAnomalies = dbInstance.prepare("SELECT COUNT(*) as count FROM anomalies WHERE status = 'RESOLVED'").get();

        const bySeverityRows = dbInstance.prepare('SELECT severity, COUNT(*) as count FROM anomalies GROUP BY severity').all();
        const byApiRows = dbInstance.prepare('SELECT api_name, COUNT(*) as count FROM anomalies GROUP BY api_name ORDER BY count DESC LIMIT 5').all();

        const bySeverity = {};
        for (const row of bySeverityRows) bySeverity[row.severity] = row.count;

        const byApi = {};
        for (const row of byApiRows) byApi[row.api_name] = row.count;

        const totalMonitored = totalMetrics?.count || 0;
        const anomalyCount = totalAnomalies?.count || 0;
        const anomalyRate = totalMonitored > 0 ? ((anomalyCount / totalMonitored) * 100).toFixed(1) : 0;

        return {
          totalMonitored,
          totalAnomalies: anomalyCount,
          activeAnomalies: activeAnomalies?.count || 0,
          resolvedAnomalies: resolvedAnomalies?.count || 0,
          avgLatencyMs: Math.round(totalMetrics?.avg_latency || 0),
          anomalyRatePercent: Number(anomalyRate),
          bySeverity,
          byApi,
        };
      } catch (err) {
        logger.error('SQLite getStats failed', { error: err.message });
      }
    }

    // JSON fallback stats
    const store = readJsonFile();
    const anomalies = store.anomalies || [];
    const metrics = store.metrics || [];

    const totalMonitored = metrics.length;
    const anomalyCount = anomalies.length;
    const activeCount = anomalies.filter((a) => a.status === 'ACTIVE').length;
    const resolvedCount = anomalies.filter((a) => a.status === 'RESOLVED').length;
    const avgLatency = metrics.length ? Math.round(metrics.reduce((acc, m) => acc + (m.response_time_ms || 0), 0) / metrics.length) : 0;
    const anomalyRate = totalMonitored > 0 ? ((anomalyCount / totalMonitored) * 100).toFixed(1) : 0;

    const bySeverity = {};
    for (const a of anomalies) {
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    }

    const byApi = {};
    for (const a of anomalies) {
      byApi[a.api_name] = (byApi[a.api_name] || 0) + 1;
    }

    return {
      totalMonitored,
      totalAnomalies: anomalyCount,
      activeAnomalies: activeCount,
      resolvedAnomalies: resolvedCount,
      avgLatencyMs: avgLatency,
      anomalyRatePercent: Number(anomalyRate),
      bySeverity,
      byApi,
    };
  },

  clearAll() {
    const { dbInstance, useJsonFallback } = getDb();
    if (dbInstance && !useJsonFallback) {
      try {
        dbInstance.exec('DELETE FROM anomalies; DELETE FROM api_metrics;');
      } catch (e) {}
    }
    writeJsonFile({ anomalies: [], metrics: [] });
  },
};

function parseJsonSafe(val, defaultVal) {
  if (typeof val !== 'string') return val || defaultVal;
  try {
    return JSON.parse(val);
  } catch {
    return defaultVal;
  }
}
