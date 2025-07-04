import { Router } from 'express';
import { register, login, me } from '@/controllers/authController';
import { validateRequest, schemas } from '@/middleware/validation';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

router.post('/register', validateRequest({ body: schemas.register }), register);
router.post('/login', validateRequest({ body: schemas.login }), login);
router.get('/me', authenticateToken, me);

export default router;