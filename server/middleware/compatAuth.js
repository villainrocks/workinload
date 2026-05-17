/* This code fixed By Tg:@ImxCodex */
import { tokenService } from '../services/token.service.js';
import { stateStoreService } from '../services/stateStore.service.js';
import { AppError } from '../utils/errors.js';

const isInactive = (user) => user?.is_active === false || user?.is_active === 0;

export const authenticateCompat = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const decoded = tokenService.verifyToken(token);
    const currentUser = await stateStoreService.getAdminById(decoded.id);

    if (!currentUser) {
      throw new AppError('User no longer exists', 401, 'USER_DELETED');
    }

    if (isInactive(currentUser)) {
      throw new AppError('User account is inactive', 403, 'USER_INACTIVE');
    }

    const role = currentUser.role || decoded.role || 'user';
    const defaultPerms = role === 'admin'
      ? { can_generate: true, can_broadcast: true, can_manage_accounts: true, can_view_logs: true }
      : { can_generate: true, can_broadcast: true, can_manage_accounts: true, can_view_logs: false };

    req.user = {
      id: currentUser.id,
      username: currentUser.username,
      email: currentUser.email,
      role,
      permissions: { ...defaultPerms, ...(currentUser.permissions || {}) },
    };
    req.token = token;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError(error.message || 'Invalid token', 401, 'UNAUTHORIZED'));
  }
};

export const requireAdminCompat = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403, 'ACCESS_DENIED'));
  }
  next();
};

export const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }
  if (req.user.role === 'admin') return next();
  if (!req.user.permissions?.[permission]) {
    return next(new AppError('You do not have permission to perform this action', 403, 'PERMISSION_DENIED'));
  }
  next();
};
