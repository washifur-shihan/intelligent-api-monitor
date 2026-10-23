#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../');

async function main() {
  const filePathArg = process.argv[2] || 'data/sample_responses.json';
  const resolvedPath = path.isAbsolute(filePathArg) ? filePathArg : path.resolve(rootDir, filePathArg);

  console.log(`\n========================================================`);
  console.log(`📦 Intelligent API Monitor - File Ingestion Tool`);
  console.log(`📂 Target File: ${resolvedPath}`);
  console.log(`========================================================\n`);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Error: File not found at path: ${resolvedPath}`);
    process.exit(1);
  }

  let fileData;
  try {
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    fileData = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Error reading/parsing JSON file: ${err.message}`);
    process.exit(1);
  }

  const records = Array.isArray(fileData) ? fileData : [fileData];
  console.log(`🔎 Loaded ${records.length} record(s) from JSON file.`);

  // Attempt to POST to running server endpoint first (Section 5.2)
  const serverPort = process.env.PORT || 3000;
  const targetUrl = `http://localhost:${serverPort}/monitor`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(records),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`\n✅ Ingestion Succeeded via Server API (${targetUrl}):`);
      printSummary(result);
      process.exit(0);
    }
  } catch (netErr) {
    console.log(`ℹ️ Server not responding at ${targetUrl}. Running direct pipeline offline processing...`);
  }

  // Standalone offline execution
  try {
    const { initDatabase } = await import('../src/db/database.js');
    const { batchProcessor } = await import('../src/services/batchProcessor.js');

    initDatabase();
    const result = await batchProcessor.process(records);
    console.log(`\n✅ Offline Ingestion Succeeded:`);
    printSummary({
      summary: {
        totalProcessed: result.totalProcessed,
        anomaliesDetected: result.anomaliesDetected,
        normalCount: result.normalCount,
        errorCount: result.errors.length,
      },
      anomalies: result.anomalies,
      errors: result.errors,
    });
  } catch (procErr) {
    console.error(`❌ Failed processing batch: ${procErr.message}`);
    process.exit(1);
  }
}

function printSummary(result) {
  const { summary, anomalies = [] } = result;
  console.log(`--------------------------------------------------------`);
  console.log(`📊 Monitored Records:  ${summary.totalProcessed}`);
  console.log(`🚨 Anomalies Detected: ${summary.anomaliesDetected}`);
  console.log(`✅ Normal / Healthy:   ${summary.normalCount}`);
  if (summary.errorCount > 0) {
    console.log(`⚠️ Errors:              ${summary.errorCount}`);
  }
  console.log(`--------------------------------------------------------\n`);

  if (anomalies.length > 0) {
    console.log(`🚨 DETECTED ANOMALIES & AI ALERTS:\n`);
    anomalies.forEach((a, i) => {
      console.log(`[${i + 1}] API: ${a.api_name} | Severity: ${a.severity} | HTTP ${a.status_code} | Latency: ${a.response_time_ms}ms | Records: ${a.records_returned}`);
      console.log(`    🤖 AI Alert: ${a.ai_alert_summary}`);
      if (a.ai_root_cause) console.log(`    🔍 Root Cause: ${a.ai_root_cause}`);
      if (a.ai_recommendation) console.log(`    💡 Recommendation: ${a.ai_recommendation}`);
      console.log('');
    });
  } else {
    console.log(`🎉 All monitored API calls were within healthy operational thresholds!`);
  }
}

main();
