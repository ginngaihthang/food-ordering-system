import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  toggleCategoryActive,
  deleteCategory,
} from '../controllers/CategoryController.js';
import { requiredAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', getCategories);
router.post('/', requiredAuth, requireRole('ADMIN'), createCategory);
router.put('/:id', requiredAuth, requireRole('ADMIN'), updateCategory);
router.patch('/:id/active', requiredAuth, requireRole('ADMIN', 'STAFF'), toggleCategoryActive);
router.delete('/:id', requiredAuth, requireRole('ADMIN'), deleteCategory);

export default router;