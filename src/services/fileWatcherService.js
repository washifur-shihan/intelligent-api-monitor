import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { batchProcessor } from './batchProcessor.js';
import { logger } from '../config/logger.js';

let watcher = null;
let debounceTimeout = null;

export function startFileWatcher() {
  if (!config.fileWatcher.enabled) {
    logger.info('File watcher is disabled in configuration');
    return;
  }

  const targetPath = config.fileWatcher.watchPath;
  const dirPath = path.dirname(targetPath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Create empty file if not existing
  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, '[]', 'utf8');
  }

  logger.info(`Starting File Watcher on: ${targetPath}`);

  try {
    watcher = fs.watch(targetPath, (eventType) => {
      if (eventType === 'change') {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(async () => {
          try {
            logger.info(`Detected file change in ${targetPath}, processing incoming batch...`);
            const content = fs.readFileSync(targetPath, 'utf8').trim();
            if (!content) return;

            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) ? parsed.length > 0 : parsed) {
              const result = await batchProcessor.process(parsed);
              logger.info(`File watcher processed incoming data: ${result.anomaliesDetected} anomaly(ies) found`);
            }
          } catch (err) {
            logger.error('Failed to read or parse watched JSON file', { error: err.message });
          }
        }, 500);
      }
    });
  } catch (err) {
    logger.error('Error initializing file watcher', { error: err.message });
  }
}

export function stopFileWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
    logger.info('File watcher stopped');
  }
}
