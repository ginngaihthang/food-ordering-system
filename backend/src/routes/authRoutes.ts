import { Router } from 'express';
import { changePassword, login } from '../controllers/authController.js';
import { requiredAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/change-password', requiredAuth, changePassword);

export default router;