import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import monitorRoutes from './routes/monitorRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import simulationRoutes from './routes/simulationRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import { logger } from './config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../');

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path.startsWith('/api') || req.path === '/monitor' || req.path === '/alerts') {
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
      }
    });
    next();
  });

  // Serve Frontend UI Static Assets
  app.use(express.static(path.join(rootDir, 'public')));

  // Direct endpoints matching PDF specification exactly:
  // Section 5.2: POST /monitor
  // Section 7.2: GET /alerts
  app.use('/monitor', monitorRoutes);
  app.use('/alerts', alertRoutes);

  // Namespaced API endpoints
  app.use('/api/monitor', monitorRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/simulate', simulationRoutes);
  app.use('/api/stats', statsRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      service: 'intelligent-api-monitor',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  // 404 Handler for API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: `Endpoint ${req.method} ${req.originalUrl} not found` });
  });

  // Global Error Handler
  app.use((err, req, res, next) => {
    logger.error('Unhandled server error', {
      error: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    });

    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });

  return app;
}
