import express from 'express';
import { alertController } from '../controllers/alertController.js';

const router = express.Router();

// Section 7.2: REST endpoint /alerts (Fetch all active anomalies)
router.get('/', alertController.getAlerts);
router.get('/:id', alertController.getAlertById);
router.patch('/:id/resolve', alertController.resolveAlert);
router.post('/:id/email-test', alertController.sendEmailForAlert);
router.delete('/clear', alertController.clearAll);

export default router;
