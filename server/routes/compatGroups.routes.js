/* This code fixed By Tg:@ImxCodex */
import { Router } from 'express';
import { asyncHandler } from '../utils/errors.js';
import { authenticateCompat, requireAdminCompat } from '../middleware/compatAuth.js';
import { stateStoreService } from '../services/stateStore.service.js';
import { telegramSessionService } from '../services/telegramSession.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authenticateCompat);

router.get('/', asyncHandler(async (req, res) => {
  const { accountId, selected } = req.query;
  // Get all groups to bypass owner_id mismatch (default is admin-default)
  let groups = await stateStoreService.listGroups();

  if (accountId) {
    groups = groups.filter(group => String(group.account_id) === String(accountId));
  }

  if (selected === 'true') {
    groups = groups.filter(group => !!group.is_selected);
  } else if (selected === 'false') {
    groups = groups.filter(group => !group.is_selected);
  }

  res.json({
    success: true,
    data: {
      groups,
    },
  });
}));

router.post('/sync', asyncHandler(async (req, res) => {
  const { accountId } = req.body;
  logger.info('Group sync requested', { userId: req.user.id, accountId: accountId || 'all' });
  // Use listAccounts() without arguments so it gets all accounts (bypassing owner_id mismatch)
  const allAccounts = await stateStoreService.listAccounts();
  const accounts = allAccounts.filter(account => {
    if (accountId) {
      return String(account.id) === String(accountId);
    }
    // Default is_active to true if undefined (Supabase may not have this column)
    return account.is_active !== false;
  });

  let count = 0;
  for (const account of accounts) {
    const dialogs = await telegramSessionService.getDialogs(account.session_string || account.sessionString, 500);
    const allGroups = await stateStoreService.listGroups(); // Get all to bypass owner_id mismatch
    const existing = allGroups.filter(group => String(group.account_id) === String(account.id));
    const selectedMap = new Map(existing.map(group => [String(group.telegram_id), !!group.is_selected]));

    const groups = dialogs.map(dialog => ({
      id: `${account.id}:${dialog.id}`,
      account_id: account.id,
      telegram_id: dialog.id,
      title: dialog.title || 'Unknown',
      username: dialog.username || null,
      access_hash: dialog.accessHash || null,
      type: dialog.type,
      member_count: 0,
      is_selected: selectedMap.get(String(dialog.id)) ? 1 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    await stateStoreService.replaceGroupsForAccount(account.id, groups, account.owner_id || 'admin-default');
    logger.info('Group sync completed for account', {
      userId: req.user.id,
      accountId: account.id,
      groups: groups.length,
    });
    count += groups.length;
  }

  res.json({ success: true, data: { success: true, count } });
}));

router.put('/:id/select', asyncHandler(async (req, res) => {
  const { isSelected } = req.body;
  const group = await stateStoreService.updateGroup(req.params.id, item => ({
    ...item,
    is_selected: isSelected ? 1 : 0,
    updated_at: new Date().toISOString(),
  }));

  res.json({ success: true, data: group });
}));

router.post('/select', asyncHandler(async (req, res) => {
  const { ids, isSelected = true } = req.body;
  await stateStoreService.updateGroups(ids || [], {
    is_selected: isSelected ? 1 : 0,
    updated_at: new Date().toISOString(),
  });

  res.json({ success: true, data: { success: true, count: (ids || []).length } });
}));

router.delete('/:id', requireAdminCompat, asyncHandler(async (req, res) => {
  await stateStoreService.deleteGroup(req.params.id);
  res.json({ success: true, data: { success: true } });
}));

export default router;
