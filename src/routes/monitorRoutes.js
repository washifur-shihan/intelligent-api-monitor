import express from 'express';
import multer from 'multer';
import { monitorController } from '../controllers/monitorController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Section 5: POST /monitor (and /api/monitor)
router.post('/', monitorController.postMonitor);
router.post('/upload', upload.single('file'), monitorController.uploadFile);

export default router;
