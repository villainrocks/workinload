/* This code fixed By Tg:@ImxCodex */
import { Router } from 'express';
import { Api } from 'telegram';
import { asyncHandler, AppError } from '../utils/errors.js';
import { authenticateCompat } from '../middleware/compatAuth.js';
import { telegramSessionService } from '../services/telegramSession.service.js';
import { stateStoreService } from '../services/stateStore.service.js';
import { mediaStoreService } from '../services/mediaStore.service.js';
import { dbService } from '../services/db.service.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Connection rate limit - disabled for development
const connectionRateLimit = (req, res, next) => next();

// Broadcast rate limit - disabled for development
const broadcastRateLimit = (req, res, next) => next();

router.use(authenticateCompat);

const computeGroupsCount = async (accountId, userId) => {
  const groups = await stateStoreService.listGroups(userId);
  return groups.filter(group => String(group.account_id) === String(accountId)).length;
};

const toFiniteNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const toDelaySeconds = (value) => {
  const number = toFiniteNumber(value);
  if (number === null) return 0;
  return Math.max(0, Math.ceil(number));
};

const toBaseTimestampMs = (value) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const toTelegramScheduleDate = (baseMs, delaySeconds) => {
  const delay = toDelaySeconds(delaySeconds);
  if (delay <= 0) return null;
  return Math.floor((baseMs + delay * 1000) / 1000);
};

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

const normalizeUsername = (value) => String(value || '').trim().replace(/^@/, '').toLowerCase();

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const toBigIntOrNull = (value) => {
  if (!hasValue(value)) return null;
  try {
    return BigInt(String(value).trim());
  } catch {
    return null;
  }
};

const toBareTelegramId = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (/^-100\d+$/.test(raw)) {
    return raw.slice(4);
  }

  if (/^-\d+$/.test(raw)) {
    return raw.slice(1);
  }

  return raw;
};

const toPeerBigIntOrNull = (value) => toBigIntOrNull(toBareTelegramId(value));

const isSameAccount = (group, accountId) => String(group?.account_id) === String(accountId);

const getGroupLabel = (group, fallback) => (
  group?.title ||
  (group?.username ? `@${String(group.username).replace(/^@/, '')}` : '') ||
  String(group?.telegram_id || fallback || 'target')
);

const buildResolvedTarget = (group, fallback, entity) => {
  if (!group) {
    return {
      entity,
      label: String(fallback),
    };
  }

  const username = String(group.username || '').trim().replace(/^@/, '');

  return {
    entity,
    label: getGroupLabel(group, fallback),
    id: group.id,
    telegramId: group.telegram_id ? String(group.telegram_id) : '',
    accessHash: group.access_hash ? String(group.access_hash) : '',
    username: username ? `@${username}` : '',
    title: group.title || '',
    type: String(group.type || '').toLowerCase(),
  };
};

const findEquivalentGroupForAccount = (accountGroups, sourceGroup) => {
  if (!sourceGroup) return null;

  const telegramId = String(sourceGroup.telegram_id || '');
  if (telegramId) {
    const byTelegramId = accountGroups.find(group => String(group.telegram_id || '') === telegramId);
    if (byTelegramId) return byTelegramId;
  }

  const username = normalizeUsername(sourceGroup.username);
  if (username) {
    const byUsername = accountGroups.find(group => normalizeUsername(group.username) === username);
    if (byUsername) return byUsername;
  }

  const title = normalizeText(sourceGroup.title);
  if (title) {
    const byTitle = accountGroups.find(group => normalizeText(group.title) === title);
    if (byTitle) return byTitle;
  }

  return null;
};

const findGroupForTarget = (groups, accountId, groupId) => {
  const rawTarget = String(groupId || '').trim();
  const accountGroups = groups.filter(group => isSameAccount(group, accountId));
  const direct = groups.find(group => String(group.id) === rawTarget);

  if (direct) {
    if (isSameAccount(direct, accountId)) {
      return { group: direct };
    }

    const equivalent = findEquivalentGroupForAccount(accountGroups, direct);
    if (equivalent) {
      return { group: equivalent, remappedFrom: direct };
    }

    return {
      error: `Target "${getGroupLabel(direct, rawTarget)}" is not synced for account ${accountId}. Sync this account and select its matching target.`,
      label: getGroupLabel(direct, rawTarget),
    };
  }

  const bareTarget = toBareTelegramId(rawTarget);
  const usernameTarget = normalizeUsername(rawTarget);
  const titleTarget = normalizeText(rawTarget);

  const matched = accountGroups.find(group => (
    String(group.telegram_id || '') === rawTarget ||
    toBareTelegramId(group.telegram_id) === bareTarget ||
    (usernameTarget && normalizeUsername(group.username) === usernameTarget) ||
    (titleTarget && normalizeText(group.title) === titleTarget)
  ));

  return matched ? { group: matched } : { group: null };
};

const groupToResolvedTarget = (group, fallback) => {
  if (!group) {
    return buildResolvedTarget(null, fallback, fallback);
  }

  const type = String(group.type || '').toLowerCase();
  const username = String(group.username || '').trim().replace(/^@/, '');

  if (type === 'private') {
    if (username) {
      return buildResolvedTarget(group, fallback, `@${username}`);
    }

    const userId = toPeerBigIntOrNull(group.telegram_id);
    const accessHash = toBigIntOrNull(group.access_hash);
    if (userId !== null && accessHash !== null) {
      return buildResolvedTarget(
        group,
        fallback,
        new Api.InputPeerUser({
          userId,
          accessHash,
        })
      );
    }
  }

  if ((type === 'group' || type === 'channel') && hasValue(group.access_hash)) {
    const channelId = toPeerBigIntOrNull(group.telegram_id);
    const accessHash = toBigIntOrNull(group.access_hash);
    if (channelId !== null && accessHash !== null) {
      return buildResolvedTarget(
        group,
        fallback,
        new Api.InputPeerChannel({
          channelId,
          accessHash,
        })
      );
    }
  }

  if (type === 'group' && hasValue(group.telegram_id)) {
    const chatId = toPeerBigIntOrNull(group.telegram_id);
    if (chatId !== null) {
      return buildResolvedTarget(group, fallback, new Api.InputPeerChat({ chatId }));
    }
  }

  if (username) {
    return buildResolvedTarget(group, fallback, `@${username}`);
  }

  return buildResolvedTarget(group, fallback, group.telegram_id || fallback);
};

router.post('/connect', connectionRateLimit, asyncHandler(async (req, res) => {
  const { phone } = req.body;
  logger.info('Telegram connect requested', { userId: req.user.id, phone });

  // Enforce account limits
  const currentAccounts = await stateStoreService.listAccounts(req.user.id);
  const limit = req.user.role === 'admin' 
    ? config.limits.maxAccountsPerAdmin 
    : config.limits.maxAccountsPerUser;

  if (currentAccounts.length >= limit) {
    throw AppError.badRequest(`Account limit reached. Your role allows a maximum of ${limit} accounts.`);
  }

  await telegramSessionService.connect(phone);
  logger.info('Telegram OTP sent', { userId: req.user.id, phone });
  res.json({
    success: true,
    data: {
      session_id: phone,
      message: 'OTP sent',
    },
  });
}));

router.post('/resend', connectionRateLimit, asyncHandler(async (req, res) => {
  const { phone } = req.body;
  await telegramSessionService.connect(phone);
  logger.info('Telegram OTP resent', { userId: req.user.id, phone });
  res.json({
    success: true,
    data: {
      session_id: phone,
      message: 'OTP resent',
    },
  });
}));

router.post('/verify', connectionRateLimit, asyncHandler(async (req, res) => {
  const { phone, code, password } = req.body;
  const verified = await telegramSessionService.verify(phone, code, password);

  if (verified.passwordRequired) {
    return res.json({
      success: true,
      data: verified,
    });
  }

  const account = {
    id: verified.account.id,
    owner_id: req.user.id,
    username: verified.account.username || null,
    first_name: verified.account.firstName || '',
    last_name: verified.account.lastName || '',
    phone: verified.account.phone,
    sessionString: verified.sessionString,
    status: 'online',
    is_active: 1,
    created_at: new Date().toISOString(),
  };

  await stateStoreService.saveAccount(account);
  logger.info('Telegram account verified', {
    userId: req.user.id,
    accountId: account.id,
    phone: account.phone,
  });

  // Auto-sync groups after connection
  try {
    const dialogs = await telegramSessionService.getDialogs(account.sessionString, 500);
    const groups = dialogs.map(dialog => ({
      id: `${account.id}:${dialog.id}`,
      account_id: account.id,
      telegram_id: dialog.id,
      title: dialog.title || 'Unknown',
      username: dialog.username || null,
      access_hash: dialog.accessHash || null,
      type: dialog.type,
      member_count: 0,
      is_selected: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    await stateStoreService.replaceGroupsForAccount(account.id, groups, req.user.id);
  } catch (syncError) {
    logger.warn('Initial group sync failed during verification', { accountId: account.id, error: syncError.message });
  }

  res.json({
    success: true,
    data: {
      account: {
        ...account,
        groups_count: await computeGroupsCount(account.id, req.user.id),
        posts_today: 0,
      },
    },
  });
}));

router.get('/accounts', asyncHandler(async (req, res) => {
  const rawAccounts = await stateStoreService.listAccounts(req.user.id);
  const accounts = await Promise.all(rawAccounts.map(async account => ({
    ...account,
    groups_count: await computeGroupsCount(account.id, req.user.id),
    posts_today: 0,
  })));

  res.json({
    success: true,
    data: {
      accounts,
    },
  });
}));

router.patch('/accounts/:id/toggle', asyncHandler(async (req, res) => {
  const account = await stateStoreService.updateAccount(req.params.id, item => ({
    ...item,
    is_active: item.is_active ? 0 : 1,
  }));

  if (!account) {
    throw AppError.notFound('Account not found');
  }

  res.json({ success: true, data: { success: true } });
}));

router.put('/accounts/:id', asyncHandler(async (req, res) => {
  const { bank_account_number, drop_targets } = req.body;
  const account = await stateStoreService.updateAccount(req.params.id, item => ({
    ...item,
    ...(bank_account_number !== undefined && { bank_account_number }),
    ...(drop_targets !== undefined && { drop_targets }),
  }));

  if (!account) {
    throw AppError.notFound('Account not found');
  }

  // When a bank account number is saved via Number Drop config,
  // auto-sync it as the fromAccount default in account_configs
  if (bank_account_number !== undefined) {
    try {
      const existing = await dbService.getAccountConfig(req.user.id, req.params.id);
      const existingTargets = existing?.targets || [];
      const existingDefaults = existing?.defaults || {};
      await dbService.saveAccountConfig(
        req.user.id,
        req.params.id,
        existingTargets,
        { ...existingDefaults, fromAccount: bank_account_number }
      );
    } catch (err) {
      logger.warn('Could not sync fromAccount to account_configs', { error: err.message });
    }
  }

  res.json({ success: true, data: account });
}));

router.delete('/accounts/:id', asyncHandler(async (req, res) => {
  // Fetch account to get session string
  const accounts = await stateStoreService.listAccounts(req.user.id);
  const account = accounts.find(a => String(a.id) === String(req.params.id));
  
  if (account && account.session_string) {
    await telegramSessionService.logout(account.session_string);
  }

  await stateStoreService.deleteAccount(req.params.id);
  logger.info('Telegram account deleted', { userId: req.user.id, accountId: req.params.id });
  res.json({ success: true, data: { success: true } });
}));

router.post('/broadcast', broadcastRateLimit, asyncHandler(async (req, res) => {
  const {
    targets,
    mediaPath,
    caption,
    text,
    scheduleAt,
    scheduleDelaySeconds,
    receiptDelaySeconds,
    followUpText,
    followUpDelaySeconds,
    bookingDelaySeconds,
    receiptDeliveryDate,
    receiptDeliveryTime,
    sendClickedAt,
  } = req.body;
  
  if (!Array.isArray(targets) || (!mediaPath && !text)) {
    throw AppError.badRequest('targets and either mediaPath or text are required');
  }

  const requestedReceiptDelaySeconds = toDelaySeconds(receiptDelaySeconds ?? scheduleDelaySeconds);
  const requestedBookingDelaySeconds = toDelaySeconds(bookingDelaySeconds ?? followUpDelaySeconds);
  const sendClickedAtMs = toBaseTimestampMs(sendClickedAt);
  const receiptScheduleDate = toTelegramScheduleDate(sendClickedAtMs, requestedReceiptDelaySeconds);
  const followUpScheduleDate = followUpText
    ? toTelegramScheduleDate(sendClickedAtMs, requestedBookingDelaySeconds)
    : null;
  const accounts = await stateStoreService.listAccounts();
  const groups = await stateStoreService.listGroups();
  const results = [];

  const appendResults = (target, response, phase) => {
    for (const item of response.results) {
      const delaySeconds = phase === 'follow_up'
        ? requestedBookingDelaySeconds
        : requestedReceiptDelaySeconds;

      if (item.status === 'failed') {
        logger.error(`Broadcast failed for target ${item.target}`, {
          accountId: target.accountId,
          error: item.error,
          phase,
          delaySeconds,
        });
      } else {
        logger.info(`Broadcast ${phase} ${item.scheduled ? 'scheduled' : 'sent'}`, {
          accountId: target.accountId,
          target: item.target,
          messageId: item.messageId,
          delaySeconds,
          receiptDeliveryDate,
          receiptDeliveryTime,
          scheduledAt: item.scheduledAt,
        });
      }
      results.push({
        accountId: target.accountId,
        groupId: item.target,
        phase,
        status: item.status,
        error: item.error,
        messageId: item.messageId,
        scheduled: item.scheduled,
        scheduledAt: item.scheduledAt,
        delaySeconds,
        receiptDeliveryDate,
        receiptDeliveryTime,
      });
    }
  };

  logger.info('Broadcast requested with Telegram schedule', {
    userId: req.user.id,
    accountFlows: targets.length,
    hasReceipt: !!mediaPath,
    hasText: !!text,
    hasBookingMessage: !!followUpText,
    receiptDelaySeconds: requestedReceiptDelaySeconds,
    bookingDelaySeconds: requestedBookingDelaySeconds,
    receiptDeliveryDate,
    receiptDeliveryTime,
    sendClickedAt,
    scheduleMode: 'independent_from_send_click',
    receiptScheduledAt: receiptScheduleDate ? new Date(receiptScheduleDate * 1000).toISOString() : null,
    followUpScheduledAt: followUpScheduleDate ? new Date(followUpScheduleDate * 1000).toISOString() : null,
    ignoredLegacyScheduleFields: !!(scheduleAt || scheduleDelaySeconds || followUpDelaySeconds),
  });

  for (const target of targets) {
    const account = accounts.find(item => String(item.id) === String(target.accountId));
    // Default is_active to true if it's undefined (which it is in the Supabase schema)
    const isActive = account?.is_active !== false; 
    
    if (!account?.session_string || !isActive) {
      for (const groupId of target.groupIds || []) {
        logger.error(`Broadcast failed for target ${groupId}: Account is missing or inactive`, { accountId: target.accountId });
        results.push({ accountId: target.accountId, groupId, status: 'failed', error: 'Account is missing or inactive' });
      }
      continue;
    }

    const unresolvedTargets = [];
    const resolvedTargets = [];

    for (const groupId of target.groupIds || []) {
      const { group, error, label, remappedFrom } = findGroupForTarget(groups, target.accountId, groupId);

      if (error) {
        unresolvedTargets.push({
          label: label || String(groupId),
          error,
        });
        continue;
      }

      if (remappedFrom) {
        logger.info('Remapped copied target to sender account group', {
          accountId: target.accountId,
          requestedGroupId: groupId,
          requestedGroup: getGroupLabel(remappedFrom, groupId),
          resolvedGroupId: group.id,
          resolvedGroup: getGroupLabel(group, groupId),
        });
      }

      resolvedTargets.push(groupToResolvedTarget(group, groupId));
    }

    const pushUnresolvedResults = (phase) => {
      for (const item of unresolvedTargets) {
        logger.error(`Broadcast failed for target ${item.label}: ${item.error}`, {
          accountId: target.accountId,
          phase,
        });
        results.push({
          accountId: target.accountId,
          groupId: item.label,
          phase,
          status: 'failed',
          error: item.error,
        });
      }
    };

    if (resolvedTargets.length === 0) {
      pushUnresolvedResults(mediaPath ? 'receipt' : 'message');
      if (followUpText) {
        pushUnresolvedResults('follow_up');
      }
      continue;
    }

    let response;
    if (mediaPath) {
      const mediaId = mediaStoreService.resolveMediaPath(mediaPath);
      const mediaItem = mediaId ? mediaStoreService.get(mediaId) : null;

      if (!mediaItem) {
        throw AppError.badRequest('Generated receipt buffer not found. Generate again.');
      }

      response = await telegramSessionService.sendReceipt(
        account.session_string,
        resolvedTargets,
        mediaItem.buffer,
        caption || '',
        receiptScheduleDate
      );
      appendResults(target, response, 'receipt');
      pushUnresolvedResults('receipt');
    } else {
      response = await telegramSessionService.sendMessage(
        account.session_string,
        resolvedTargets,
        text,
        receiptScheduleDate
      );
      appendResults(target, response, 'message');
      pushUnresolvedResults('message');
    }

    if (followUpText) {
      const followUpResponse = await telegramSessionService.sendMessage(
        account.session_string,
        resolvedTargets,
        followUpText,
        followUpScheduleDate
      );
      appendResults(target, followUpResponse, 'follow_up');
      pushUnresolvedResults('follow_up');
    }
  }

  const summary = {
    total: results.length,
    success: results.filter(item => item.status === 'success').length,
    scheduled: results.filter(item => item.status === 'success' && item.scheduled).length,
    failed: results.filter(item => item.status === 'failed').length,
  };

  logger.info(`Broadcast complete. Summary:`, summary);
  if (summary.failed > 0) {
    logger.error(`Broadcast failures:`, results.filter(item => item.status === 'failed'));
  }

  res.json({
    success: true,
    data: {
      data: results,
      summary,
    },
  });
}));

export default router;
