/* This code fixed By Tg:@ImxCodex */
import { Router } from 'express';
import { asyncHandler, AppError } from '../utils/errors.js';
import { stateStoreService } from '../services/stateStore.service.js';
import { tokenService } from '../services/token.service.js';
import { authenticateCompat } from '../middleware/compatAuth.js';
import { logger } from '../utils/logger.js';

const router = Router();

const DEFAULT_PERMS = (role) => role === 'admin'
  ? { can_generate: true, can_broadcast: true, can_manage_accounts: true, can_view_logs: true }
  : { can_generate: true, can_broadcast: true, can_manage_accounts: true, can_view_logs: false };

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await stateStoreService.verifyAdminCredentials(email, password);

  if (!admin) {
    logger.warn('Login failed', { login: email });
    throw AppError.badRequest('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const accessToken = tokenService.createToken(admin);
  logger.info('Login succeeded', { userId: admin.id, username: admin.username, role: admin.role });

  res.json({
    success: true,
    data: {
      accessToken,
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      permissions: { ...DEFAULT_PERMS(admin.role), ...(admin.permissions || {}) },
    },
  });
}));

router.post('/logout', asyncHandler(async (req, res) => {
  logger.info('Logout requested');
  res.json({ success: true, data: { success: true } });
}));

router.get('/me', authenticateCompat, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions,
    },
  });
}));

router.post('/refresh', authenticateCompat, asyncHandler(async (req, res) => {
  const admins = await stateStoreService.listAdmins();
  const admin = admins.find(item => item.id === req.user.id);
  const accessToken = tokenService.createToken(admin || req.user);
  res.json({ success: true, data: { accessToken } });
}));

export default router;
