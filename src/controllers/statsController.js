import { repository } from '../db/repository.js';
import { config } from '../config/index.js';

export const statsController = {
  /**
   * GET /api/stats
   * Summary metrics for dashboard
   */
  async getStats(req, res, next) {
    try {
      const stats = repository.getStats();

      return res.status(200).json({
        success: true,
        stats,
        system: {
          aiProvider: config.ai.provider,
          model: config.ai.model,
          isGeminiConfigured: Boolean(config.ai.geminiApiKey),
          isOpenAiConfigured: Boolean(config.ai.openAiApiKey),
          emailAlertsEnabled: config.email.enabled,
          fileWatcherEnabled: config.fileWatcher.enabled,
          thresholds: config.thresholds,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
