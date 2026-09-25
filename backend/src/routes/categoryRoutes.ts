import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/CategoryController.js';
import { requiredAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', getCategories);
router.post('/', requiredAuth, requireRole('ADMIN', 'STAFF'), createCategory);
router.put('/:id', requiredAuth, requireRole('ADMIN', 'STAFF'), updateCategory);
router.delete('/:id', requiredAuth, requireRole('ADMIN', 'STAFF'), deleteCategory);

export default router;