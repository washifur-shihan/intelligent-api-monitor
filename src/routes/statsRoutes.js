import express from 'express';
import { statsController } from '../controllers/statsController.js';

const router = express.Router();

router.get('/', statsController.getStats);

export default router;
