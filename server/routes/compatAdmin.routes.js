/* This code fixed By Tg:@ImxCodex */
import { Router } from 'express';
import { authenticateCompat, requireAdminCompat } from '../middleware/compatAuth.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { stateStoreService } from '../services/stateStore.service.js';
import { telegramSessionService } from '../services/telegramSession.service.js';

const router = Router();

router.use(authenticateCompat);
router.use(requireAdminCompat);

router.get('/me', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
    },
  });
}));

router.get('/stats', asyncHandler(async (req, res) => {
  const accounts = await stateStoreService.listAccounts();
  const groups = await stateStoreService.listGroups();

  res.json({
    success: true,
    data: {
      accounts: accounts.length,
      activeAccounts: accounts.filter(account => !!account.is_active).length,
      groups: groups.length,
      selectedGroups: groups.filter(group => !!group.is_selected).length,
    },
  });
}));

router.put('/password', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { success: true } });
}));

// User Management
router.get('/users', asyncHandler(async (req, res) => {
  const admins = await stateStoreService.listAdmins();
  const users = admins.map((admin) => {
    const user = { ...admin };
    delete user.password;
    return user;
  });
  res.json({ success: true, data: users });
}));

router.post('/users', asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;
  const user = await stateStoreService.createAdmin({ username, email, password, role });
  const { password: _, ...safeUser } = user;
  res.json({ success: true, data: safeUser });
}));

router.put('/users/:id/permissions', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;
  if (!permissions || typeof permissions !== 'object') {
    throw AppError.badRequest('Permissions object is required', 'INVALID_PERMISSIONS');
  }
  const updated = await stateStoreService.updatePermissions(id, permissions);
  const { password: _, ...safeUser } = updated;
  res.json({ success: true, data: safeUser });
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) {
    throw AppError.badRequest('Cannot delete yourself', 'SELF_DELETE_BLOCKED');
  }
  
  const accounts = await stateStoreService.listAccounts(id);
  for (const account of accounts) {
    const sessionString = account.session_string || account.sessionString;
    if (!sessionString) continue;

    try {
      await telegramSessionService.logout(sessionString);
    } catch (error) {
      logger.warn('Telegram logout failed while deleting user; continuing database cleanup', {
        accountId: account.id,
        userId: id,
        error: error.message,
      });
    }
  }

  const result = await stateStoreService.deleteAdmin(id);
  res.json({ success: true, data: { success: true, ...result } });
}));

export default router;
