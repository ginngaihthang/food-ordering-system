import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { requiredAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requiredAuth, requireRole('ADMIN', 'STAFF'), getDashboard);

export default router;