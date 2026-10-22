import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { requiredAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Every user route is admin-only
router.use(requiredAuth, requireRole('ADMIN'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;