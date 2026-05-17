/* This code fixed By Tg:@ImxCodex */
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { CustomFile } from 'telegram/client/uploads.js';
import { computeCheck } from 'telegram/Password.js';
import { config } from '../config.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const isTelegramError = (error, code) => (
  error?.errorMessage === code ||
  error?.message?.includes(code)
);

const formatScheduledAt = (scheduleDate) => (
  scheduleDate ? new Date(scheduleDate * 1000).toISOString() : null
);

const DIALOG_REFRESH_LIMIT = 500;

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const normalizeUsername = (value) => String(value || '').trim().replace(/^@/, '').toLowerCase();

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

const getErrorText = (error) => (
  [
    error?.errorMessage,
    error?.message,
    error?.toString?.(),
  ].filter(Boolean).join(' ')
);

const isPeerResolutionError = (error) => {
  const message = getErrorText(error);
  return (
    message.includes('CHANNEL_INVALID') ||
    message.includes('PEER_ID_INVALID') ||
    message.includes('CHAT_ID_INVALID') ||
    message.includes('USER_ID_INVALID') ||
    message.includes('USERNAME_INVALID') ||
    message.includes('USERNAME_NOT_OCCUPIED') ||
    message.includes('No cached entity') ||
    message.includes('Could not find the input entity') ||
    message.includes('Cannot cast')
  );
};

const getMessageIdFromUpdates = (updates) => {
  if (!updates) return null;

  if (updates instanceof Api.UpdateShortSentMessage) {
    return updates.id?.toString?.() || String(updates.id);
  }

  const updateItems = updates.updates || (updates.update ? [updates.update] : []);
  for (const update of updateItems) {
    if (
      update instanceof Api.UpdateNewScheduledMessage ||
      update instanceof Api.UpdateNewMessage ||
      update instanceof Api.UpdateNewChannelMessage
    ) {
      return update.message?.id?.toString?.() || String(update.message?.id || '');
    }

    if (update instanceof Api.UpdateMessageID) {
      return update.id?.toString?.() || String(update.id);
    }
  }

  return null;
};

const createTargetDescriptor = (rawTarget) => {
  const descriptor = {
    rawTarget,
    entityLike: rawTarget,
    label: '',
    telegramId: '',
    username: '',
    title: '',
  };

  if (typeof rawTarget === 'string' || typeof rawTarget === 'number') {
    const value = String(rawTarget).trim();
    descriptor.entityLike = value;
    descriptor.label = value;
    if (/^-?\d+$/.test(value)) {
      descriptor.telegramId = value;
    } else if (value.startsWith('@')) {
      descriptor.username = value;
    } else {
      descriptor.title = value;
    }
    return descriptor;
  }

  if (rawTarget && typeof rawTarget === 'object') {
    descriptor.entityLike = rawTarget.entity ?? rawTarget;
    descriptor.label = String(
      rawTarget.label ||
      rawTarget.username ||
      rawTarget.title ||
      rawTarget.telegramId ||
      rawTarget.telegram_id ||
      rawTarget.id ||
      'target'
    ).trim();
    descriptor.telegramId = String(rawTarget.telegramId || rawTarget.telegram_id || '').trim();
    descriptor.username = String(rawTarget.username || '').trim();
    descriptor.title = String(rawTarget.title || '').trim();
  }

  return descriptor;
};

const getCandidateKey = (candidate) => {
  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return `value:${String(candidate).trim().toLowerCase()}`;
  }

  if (candidate && typeof candidate === 'object') {
    const id = candidate.userId || candidate.chatId || candidate.channelId || candidate.id || '';
    const hash = candidate.accessHash || '';
    return `object:${candidate.className || candidate.constructor?.name || 'entity'}:${id}:${hash}`;
  }

  return '';
};

const getTargetCandidates = (descriptor, preferFresh = false) => {
  const candidates = [];
  const seen = new Set();
  const pushCandidate = (candidate) => {
    if (!hasValue(candidate)) return;
    const key = getCandidateKey(candidate);
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    candidates.push(candidate);
  };

  const username = normalizeUsername(descriptor.username);
  const usernameCandidate = username ? `@${username}` : null;
  const ordered = preferFresh
    ? [usernameCandidate, descriptor.telegramId, descriptor.entityLike, descriptor.title, descriptor.label]
    : [descriptor.entityLike, usernameCandidate, descriptor.telegramId, descriptor.title, descriptor.label];

  for (const candidate of ordered) {
    pushCandidate(candidate);
  }

  return candidates;
};

class TelegramSessionService {
  constructor() {
    this.pendingLogins = new Map();
    this.clients = new Map();
    this.pendingTtlMs = 10 * 60 * 1000;
  }

  ensureConfig() {
    if (!config.telegram.apiId || !config.telegram.apiHash) {
      throw AppError.internal('Telegram API ID and Hash are not configured');
    }
  }

  async getClient(sessionString, _retryCount = 0) {
    this.ensureConfig();

    if (!sessionString) {
      throw AppError.badRequest('sessionString is required');
    }

    // If there's already a healthy cached client, reuse it
    if (this.clients.has(sessionString)) {
      const client = this.clients.get(sessionString);
      if (client.connected) {
        return client;
      }
      // Client exists but is disconnected — evict it cleanly
      logger.info('Evicting stale Telegram client and reconnecting...');
      try {
        await client.disconnect();
      } catch (error) {
        logger.warn('Failed to disconnect stale Telegram client', { error: error.message });
      }
      this.clients.delete(sessionString);
    }

    // Create a fresh client
    const client = new TelegramClient(
      new StringSession(sessionString),
      config.telegram.apiId,
      config.telegram.apiHash,
      {
        connectionRetries: 3,
        retryDelay: 1000,
        useWSS: false,
      }
    );

    try {
      // Use start() instead of connect() — start() properly negotiates auth keys
      // which prevents AUTH_KEY_DUPLICATED errors on reconnect after restarts.
      await client.start({
        phoneNumber: async () => { throw new Error('Session already exists'); },
        password:    async () => { throw new Error('Session already exists'); },
        phoneCode:   async () => { throw new Error('Session already exists'); },
        onError: (err) => {
          // If start() itself hits AUTH_KEY_DUPLICATED, surface it so we can retry
          throw err;
        },
      });
    } catch (err) {
      // AUTH_KEY_DUPLICATED: session still locked on Telegram's side.
      // Wait 15s and retry once with a fresh client.
      if (err.message && err.message.includes('AUTH_KEY_DUPLICATED') && _retryCount < 1) {
        logger.info(`AUTH_KEY_DUPLICATED — waiting 15s for Telegram to release old session (attempt ${_retryCount + 1})...`);
        try {
          await client.disconnect();
        } catch (error) {
          logger.warn('Failed to disconnect duplicated Telegram client', { error: error.message });
        }
        this.clients.delete(sessionString);
        await new Promise(r => setTimeout(r, 15000));
        return this.getClient(sessionString, _retryCount + 1);
      }
      try {
        await client.disconnect();
      } catch (error) {
        logger.warn('Failed to disconnect Telegram client after start failure', { error: error.message });
      }
      throw err;
    }

    this.clients.set(sessionString, client);
    return client;
  }

  // Disconnect every cached client — called on graceful shutdown so Telegram
  // releases the auth key before the next process start.
  async disconnectAll() {
    const promises = [];
    for (const [key, client] of this.clients.entries()) {
      promises.push(
        client.disconnect().catch(() => {}).finally(() => this.clients.delete(key))
      );
    }
    await Promise.allSettled(promises);
  }

  async logout(sessionString) {
    if (!sessionString) return;
    
    try {
      const client = await this.getClient(sessionString);
      try {
        await client.invoke(new Api.auth.LogOut());
      } catch (err) {
        logger.warn('Failed to send LogOut to Telegram', { error: err.message });
      }
      try {
        await client.disconnect();
      } catch (error) {
        logger.warn('Failed to disconnect Telegram client during logout', { error: error.message });
      }
    } catch (error) {
      logger.warn('Failed to fetch client during logout', { error: error.message });
    } finally {
      this.clients.delete(sessionString);
    }
  }

  async connect(phone) {
    this.ensureConfig();

    if (!phone) {
      throw AppError.badRequest('Phone is required');
    }

    const client = new TelegramClient(
      new StringSession(''),
      config.telegram.apiId,
      config.telegram.apiHash,
      { connectionRetries: 5 }
    );

    await client.connect();

    try {
      const { phoneCodeHash } = await client.sendCode(
        {
          apiId: config.telegram.apiId,
          apiHash: config.telegram.apiHash,
        },
        phone
      );

      this.pendingLogins.set(phone, {
        client,
        phoneCodeHash,
        expiresAt: Date.now() + this.pendingTtlMs,
      });

      logger.info('OTP sent', { phone });
      return { phone, expiresInSeconds: this.pendingTtlMs / 1000 };
    } catch (error) {
      try {
        await client.disconnect();
      } catch {
        // ignore
      }

      throw AppError.badRequest(`Failed to send OTP: ${error.message}`);
    }
  }

  async getPasswordHint(pending) {
    try {
      const passwordInfo = await pending.client.invoke(new Api.account.GetPassword());
      return passwordInfo?.hint || '';
    } catch (error) {
      logger.warn('Failed to fetch Telegram password hint', { error: error.message });
      return '';
    }
  }

  async checkTwoStepPassword(pending, password) {
    if (!password) {
      throw AppError.badRequest(
        'Telegram two-step password is required.',
        'TELEGRAM_PASSWORD_REQUIRED'
      );
    }

    try {
      const passwordInfo = await pending.client.invoke(new Api.account.GetPassword());
      const passwordCheck = await computeCheck(passwordInfo, password);
      await pending.client.invoke(new Api.auth.CheckPassword({ password: passwordCheck }));
    } catch (error) {
      if (isTelegramError(error, 'PASSWORD_HASH_INVALID')) {
        throw AppError.badRequest(
          'Invalid Telegram two-step password. Please try again.',
          'TELEGRAM_PASSWORD_INVALID'
        );
      }

      throw error;
    }
  }

  async finalizeLogin(phone, pending) {
    const me = await pending.client.getMe();
    const sessionString = pending.client.session.save();

    this.pendingLogins.delete(phone);

    logger.info('Telegram login verified', { phone, username: me.username || null });

    return {
      sessionString,
      account: {
        id: me.id?.toString?.() || String(me.id),
        username: me.username || null,
        firstName: me.firstName || '',
        lastName: me.lastName || '',
        phone,
      },
    };
  }

  async verify(phone, code, password) {
    this.ensureConfig();

    const pending = this.pendingLogins.get(phone);
    if (!pending) {
      throw AppError.badRequest('No pending login for this phone');
    }

    if (pending.expiresAt < Date.now()) {
      this.pendingLogins.delete(phone);
      try {
        await pending.client.disconnect();
      } catch {
        // ignore
      }
      throw AppError.badRequest('OTP request expired. Please connect again.');
    }

    try {
      if (pending.requiresPassword) {
        if (!password) {
          return {
            passwordRequired: true,
            phone,
            hint: pending.passwordHint || '',
            message: 'Telegram two-step password is required.',
          };
        }

        await this.checkTwoStepPassword(pending, password);
        return this.finalizeLogin(phone, pending);
      }

      if (!code) {
        throw AppError.badRequest('OTP code is required', 'TELEGRAM_OTP_REQUIRED');
      }

      await pending.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash: pending.phoneCodeHash,
          phoneCode: String(code),
        })
      );

      return this.finalizeLogin(phone, pending);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (isTelegramError(error, 'SESSION_PASSWORD_NEEDED')) {
        pending.requiresPassword = true;
        pending.passwordHint = await this.getPasswordHint(pending);

        if (password) {
          await this.checkTwoStepPassword(pending, password);
          return this.finalizeLogin(phone, pending);
        }

        return {
          passwordRequired: true,
          phone,
          hint: pending.passwordHint,
          message: 'Telegram two-step password is required.',
        };
      }

      if (isTelegramError(error, 'PHONE_CODE_INVALID')) {
        throw AppError.badRequest('Invalid OTP. Please try again.', 'TELEGRAM_OTP_INVALID');
      }

      if (isTelegramError(error, 'PHONE_CODE_EXPIRED')) {
        this.pendingLogins.delete(phone);
        try {
          await pending.client.disconnect();
        } catch {
          // ignore
        }
        throw AppError.badRequest(
          'OTP expired. Please request a new code.',
          'TELEGRAM_OTP_EXPIRED'
        );
      }

      throw AppError.badRequest(`Verification failed: ${error.message}`);
    }
  }

  async withClient(sessionString, callback) {
    const client = await this.getClient(sessionString);
    return callback(client);
  }

  async findDialogInputEntity(client, descriptor) {
    const dialogs = await client.getDialogs({ limit: DIALOG_REFRESH_LIMIT });
    const targetTelegramId = String(descriptor.telegramId || '').trim();
    const targetBareId = toBareTelegramId(targetTelegramId);
    const targetUsername = normalizeUsername(descriptor.username);
    const targetTitle = normalizeText(descriptor.title || descriptor.label);
    const canMatchByTitle = !targetTelegramId && !targetUsername;

    const dialog = dialogs.find(item => {
      const dialogId = String(item.id?.toString?.() || item.id || '').trim();
      const entityId = String(item.entity?.id?.toString?.() || item.entity?.id || '').trim();
      const dialogUsername = normalizeUsername(item.entity?.username);
      const dialogTitle = normalizeText(
        item.title ||
        [
          item.entity?.firstName || '',
          item.entity?.lastName || '',
        ].join(' ').trim()
      );

      if (targetTelegramId) {
        const ids = [dialogId, entityId].filter(Boolean);
        if (ids.some(id => id === targetTelegramId || toBareTelegramId(id) === targetBareId)) {
          return true;
        }
      }

      if (targetUsername && dialogUsername === targetUsername) {
        return true;
      }

      return canMatchByTitle && targetTitle && dialogTitle === targetTitle;
    });

    if (!dialog) return null;
    if (dialog.inputEntity) return dialog.inputEntity;
    if (dialog.entity) return client.getInputEntity(dialog.entity);
    if (dialog.id) return client.getInputEntity(String(dialog.id));
    return null;
  }

  async resolveTargetEntity(client, descriptor, { refreshDialogs = false, preferFresh = false } = {}) {
    if (refreshDialogs) {
      const refreshedEntity = await this.findDialogInputEntity(client, descriptor);
      if (refreshedEntity) {
        return refreshedEntity;
      }
    }

    let lastError = null;
    for (const candidate of getTargetCandidates(descriptor, preferFresh)) {
      try {
        return await client.getInputEntity(candidate);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(`Could not resolve Telegram target ${descriptor.label || 'target'}`);
  }

  async sendWithResolvedTarget(client, descriptor, sendOnce) {
    try {
      const entity = await this.resolveTargetEntity(client, descriptor);
      return await sendOnce(entity);
    } catch (error) {
      if (!isPeerResolutionError(error)) {
        throw error;
      }

      logger.warn('Refreshing Telegram dialogs after peer resolution failed', {
        target: descriptor.label,
        telegramId: descriptor.telegramId || undefined,
        error: error.message,
      });

      const entity = await this.resolveTargetEntity(client, descriptor, {
        refreshDialogs: true,
        preferFresh: true,
      });
      return await sendOnce(entity);
    }
  }

  async getDialogs(sessionString, limit = 200) {
    return this.withClient(sessionString, async client => {
      const dialogs = await client.getDialogs({ limit });

      return dialogs
        .filter(dialog => dialog.isGroup || dialog.isChannel || dialog.isUser)
        .map(dialog => {
          let type = 'private';
          if (dialog.isChannel) {
            type = dialog.entity?.broadcast ? 'channel' : 'group';
          } else if (dialog.isGroup) {
            type = 'group';
          }

        return {
          id: dialog.id.toString(),
          title: dialog.title || [
            dialog.entity?.firstName || '',
            dialog.entity?.lastName || '',
          ].join(' ').trim() || 'Unknown',
          username: dialog.entity?.username || null,
          accessHash: dialog.entity?.accessHash ? dialog.entity.accessHash.toString() : null,
          isUser: !!dialog.isUser,
          isChannel: !!dialog.isChannel,
          isGroup: !!dialog.isGroup,
          type,
        };
      });
    });
  }

  async sendMessage(sessionString, targets, text, scheduleDate = null) {
    if (!Array.isArray(targets) || targets.length === 0) {
      throw AppError.badRequest('targets must be a non-empty array');
    }

    if (!text) {
      throw AppError.badRequest('Message text is required');
    }

    return this.withClient(sessionString, async client => {
      const results = [];

      for (const rawTarget of targets) {
        const target = createTargetDescriptor(rawTarget);

        if (!target.entityLike || !target.label) {
          continue;
        }

        try {
          const updates = await this.sendWithResolvedTarget(client, target, async entity => {
            const request = new Api.messages.SendMessage({
              peer: entity,
              message: String(text),
              noWebpage: true,
              ...(scheduleDate && { scheduleDate }),
            });

            return client.invoke(request);
          });

          results.push({
            target: target.label,
            status: 'success',
            messageId: getMessageIdFromUpdates(updates),
            scheduled: !!scheduleDate,
            scheduledAt: formatScheduledAt(scheduleDate),
          });
        } catch (error) {
          results.push({
            target: target.label,
            status: 'failed',
            error: error.message,
          });
        }
      }

      return {
        total: results.length,
        success: results.filter(item => item.status === 'success').length,
        scheduled: results.filter(item => item.status === 'success' && item.scheduled).length,
        failed: results.filter(item => item.status === 'failed').length,
        results,
      };
    });
  }

  async sendReceipt(sessionString, targets, pngBuffer, caption = '', scheduleDate = null) {
    if (!Array.isArray(targets) || targets.length === 0) {
      throw AppError.badRequest('targets must be a non-empty array');
    }

    if (!Buffer.isBuffer(pngBuffer) || pngBuffer.length === 0) {
      throw AppError.badRequest('Generated receipt buffer is empty');
    }

    return this.withClient(sessionString, async client => {
      const results = [];

      for (const rawTarget of targets) {
        const target = createTargetDescriptor(rawTarget);

        if (!target.entityLike || !target.label) {
          continue;
        }

        try {
          const message = await this.sendWithResolvedTarget(client, target, async entity => {
            const file = new CustomFile('receipt.png', pngBuffer.length, '', pngBuffer);
            const fileOptions = {
              file,
              caption,
              workers: 1,
            };

            if (scheduleDate) {
              fileOptions.scheduleDate = scheduleDate;
            }

            return client.sendFile(entity, fileOptions);
          });

          results.push({
            target: target.label,
            status: 'success',
            messageId: message.id?.toString?.() || String(message.id),
            scheduled: !!scheduleDate,
            scheduledAt: formatScheduledAt(scheduleDate),
          });
        } catch (error) {
          results.push({
            target: target.label,
            status: 'failed',
            error: error.message,
          });
        }
      }

      return {
        total: results.length,
        success: results.filter(item => item.status === 'success').length,
        scheduled: results.filter(item => item.status === 'success' && item.scheduled).length,
        failed: results.filter(item => item.status === 'failed').length,
        results,
      };
    });
  }

  async cleanupPending() {
    const now = Date.now();

    for (const [phone, pending] of this.pendingLogins.entries()) {
      if (pending.expiresAt < now) {
        this.pendingLogins.delete(phone);
        try {
          await pending.client.disconnect();
        } catch {
          // ignore
        }
      }
    }
  }
}

export const telegramSessionService = new TelegramSessionService();
