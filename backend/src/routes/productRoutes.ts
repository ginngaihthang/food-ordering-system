import { Router } from 'express';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleAvailability,
} from '../controllers/ProductController.js';
import { requiredAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', getProducts);
router.post('/', requiredAuth, requireRole('ADMIN', 'STAFF'), createProduct);
router.put('/:id', requiredAuth, requireRole('ADMIN'), updateProduct);
router.patch('/:id/availability', requiredAuth, requireRole('ADMIN', 'STAFF'), toggleAvailability);
router.delete('/:id', requiredAuth, requireRole('ADMIN'), deleteProduct);

export default router;