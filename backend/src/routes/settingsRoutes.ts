import { Router } from 'express';
import {
  getPublicSettings,
  updateSettings,
  getSystemStatus,
} from '../controllers/settingsController.js';
import { requiredAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', getPublicSettings);
router.put('/', requiredAuth, requireRole('ADMIN'), updateSettings);
router.get('/system', requiredAuth, requireRole('ADMIN'), getSystemStatus);

export default router;