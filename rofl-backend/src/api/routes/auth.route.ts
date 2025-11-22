import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../../services/auth.service';
import { jwtAuth } from '../middlewares/jwtAuth';

const router = Router();

const authService = new AuthService();
const authController = new AuthController(authService);

router.get('/message', (req, res, next) => authController.getMessage(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.get('/me', jwtAuth, (req, res, next) => authController.getMe(req, res, next));

export default router;
