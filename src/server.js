import { createApp } from './app.js';
import { initDatabase } from './db/database.js';
import { startFileWatcher, stopFileWatcher } from './services/fileWatcherService.js';
import { config } from './config/index.js';
import { logger } from './config/logger.js';

async function bootstrap() {
  try {
    logger.info('Initializing Intelligent API Monitoring & Alert System...');

    // 1. Initialize Database Storage
    initDatabase();

    // 2. Initialize File Watcher (Input Method 1)
    startFileWatcher();

    // 3. Create & Start Express Server
    const app = createApp();
    const server = app.listen(config.port, () => {
      logger.info(`================================================================`);
      logger.info(`🚀 Intelligent API Monitor running on http://localhost:${config.port}`);
      logger.info(`📊 Dashboard UI:         http://localhost:${config.port}/`);
      logger.info(`📡 Ingestion Endpoint:   POST http://localhost:${config.port}/monitor`);
      logger.info(`🚨 Alerts Endpoint:      GET http://localhost:${config.port}/alerts`);
      logger.info(`🤖 AI Provider:          ${config.ai.provider.toUpperCase()} (Model: ${config.ai.model})`);
      logger.info(`📧 Email Alerts:         ${config.email.enabled ? 'ENABLED' : 'DISABLED (Preview on demand)'}`);
      logger.info(`📁 File Watcher:         ${config.fileWatcher.enabled ? `Watching ${config.fileWatcher.watchPath}` : 'DISABLED'}`);
      logger.info(`================================================================`);
    });

    // Graceful Shutdown
    const shutdown = () => {
      logger.info('Shutting down gracefully...');
      stopFileWatcher();
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    logger.error('Fatal bootstrap error', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

bootstrap();
