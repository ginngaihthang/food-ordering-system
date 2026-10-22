import { Router } from 'express';
import {
  getTables,
  createTable,
  updateTable,
  deleteTable,
  regenerateQrToken,
  getTableByToken,
  payTableSession,
  getSessionReceipt,
} from '../controllers/tableController.js';
import { requiredAuth, requireRole } from '../middleware/auth.js';
import { getTableSession, closeTableSession } from '../controllers/tableController.js';

const router = Router();

router.get('/', requiredAuth, requireRole('ADMIN', 'STAFF'), getTables);
router.post('/', requiredAuth, requireRole('ADMIN', 'STAFF'), createTable);
router.put('/:id', requiredAuth, requireRole('ADMIN', ), updateTable);
router.delete('/:id', requiredAuth, requireRole('ADMIN'), deleteTable);
router.patch('/:id/regenerate-qr', requiredAuth, requireRole('ADMIN', 'STAFF'), regenerateQrToken);
router.get('/by-token/:token', getTableByToken); 
router.get('/:id/session', requiredAuth, requireRole('ADMIN', 'STAFF'), getTableSession);
router.post('/:id/close-session', requiredAuth, requireRole('ADMIN', 'STAFF'), closeTableSession);
router.post('/:id/pay', requiredAuth, requireRole('ADMIN', 'STAFF'), payTableSession)
router.get('/:id/receipt', requiredAuth, requireRole('ADMIN', 'STAFF'), getSessionReceipt)

export default router;