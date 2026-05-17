/* This code fixed By Tg:@ImxCodex */
import { supabaseService } from './supabase.service.js';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { hashPassword, isHashedPassword, verifyPassword } from '../utils/password.js';

const createBootstrapAdmin = () => {
  if (!process.env.DEFAULT_ADMIN_PASSWORD) {
    return null;
  }

  return {
    id: 'admin-default',
    username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
    password: hashPassword(process.env.DEFAULT_ADMIN_PASSWORD),
    role: 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
  };
};

const DEFAULT_ADMIN = createBootstrapAdmin();

const isInactiveAdmin = (admin) => admin?.is_active === false || admin?.is_active === 0;

class StateStoreService {
  async listAdmins() {
    try {
      const admins = await supabaseService.get('admins');
      if (admins.length === 0) {
        if (DEFAULT_ADMIN) {
          await supabaseService.upsert('admins', DEFAULT_ADMIN);
          return [DEFAULT_ADMIN];
        }
        return [];
      }

      if (!DEFAULT_ADMIN) {
        return admins;
      }

      const hasDefault = admins.some(a => a.id === DEFAULT_ADMIN.id);
      return hasDefault ? admins : [DEFAULT_ADMIN, ...admins];
    } catch (error) {
      logger.warn('Failed to fetch admins from Supabase, falling back to default admin', { error: error.message });
      return DEFAULT_ADMIN ? [DEFAULT_ADMIN] : [];
    }
  }

  async createAdmin({ username, email, password, role = 'user' }) {
    if (!username || !email || !password) {
      throw AppError.badRequest('Username, email, and password are required');
    }

    const normalizedUsername = String(username).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const existingByUsername = await this.findAdminByLogin(normalizedUsername);
    const existingByEmail = await this.findAdminByLogin(normalizedEmail);

    if (existingByUsername || existingByEmail) {
      throw AppError.badRequest('A user with that username or email already exists', 'USER_EXISTS');
    }

    const admin = {
      id: randomUUID(),
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashPassword(password),
      role: role === 'admin' ? 'admin' : 'user',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    await supabaseService.upsert('admins', admin);
    return admin;
  }

  async deleteAdmin(id) {
    if (DEFAULT_ADMIN && id === DEFAULT_ADMIN.id) {
      throw AppError.badRequest('The bootstrap admin cannot be deleted', 'BOOTSTRAP_ADMIN_PROTECTED');
    }

    const admin = await this.getAdminById(id);
    if (!admin) {
      throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }

    const accounts = await this.listAccounts(id);

    for (const account of accounts) {
      await this.deleteAccount(account.id);
    }

    await supabaseService.delete('account_configs', { user_id: id });
    await supabaseService.delete('admins', { id });

    return { deletedAccounts: accounts.length };
  }

  async findAdminByLogin(login) {
    const normalized = String(login || '').trim().toLowerCase();
    
    // Always check the hardcoded default first — prevents lockout
    if (DEFAULT_ADMIN && (
      DEFAULT_ADMIN.username.toLowerCase() === normalized ||
      DEFAULT_ADMIN.email.toLowerCase() === normalized
    )) {
      return DEFAULT_ADMIN;
    }

    // Then check Supabase
    try {
      const admins = await supabaseService.get('admins');
      return admins.find(admin =>
        admin.username?.toLowerCase() === normalized ||
        admin.email?.toLowerCase() === normalized
      );
    } catch {
      return undefined;
    }
  }

  async getAdminById(id) {
    const admins = await this.listAdmins();
    return admins.find(admin => String(admin.id) === String(id));
  }

  async verifyAdminCredentials(login, password) {
    const admin = await this.findAdminByLogin(login);
    if (isInactiveAdmin(admin)) {
      return null;
    }

    if (!admin || !verifyPassword(password, admin.password)) {
      return null;
    }

    if ((!DEFAULT_ADMIN || admin.id !== DEFAULT_ADMIN.id) && !isHashedPassword(admin.password)) {
      const migrated = { ...admin, password: hashPassword(password) };
      await supabaseService.upsert('admins', migrated);
      return migrated;
    }

    return admin;
  }

  async listAccounts(ownerId) {
    const query = ownerId ? { owner_id: ownerId } : {};
    return await supabaseService.get('accounts', query);
  }

  async saveAccount(account) {
    // Transform account object to match DB schema if needed
    const dbAccount = {
      id: account.id,
      owner_id: account.owner_id || 'admin-default',
      phone: account.phone,
      username: account.username,
      first_name: account.firstName || account.first_name,
      last_name: account.lastName || account.last_name,
      session_string: account.sessionString || account.session_string,
      updated_at: new Date().toISOString()
    };
    await supabaseService.upsert('accounts', dbAccount);
    return dbAccount;
  }

  async updateAccount(id, updater) {
    const existing = (await supabaseService.get('accounts', { id }))[0];
    if (!existing) return null;

    const updated = typeof updater === 'function' ? updater(existing) : { ...existing, ...updater };
    await supabaseService.upsert('accounts', updated);
    return updated;
  }

  async deleteAccount(id) {
    await supabaseService.delete('groups', { account_id: id });
    await supabaseService.delete('account_configs', { account_id: id });
    await supabaseService.delete('accounts', { id });
  }

  async listGroups(ownerId) {
    const query = ownerId ? { owner_id: ownerId } : {};
    return await supabaseService.get('groups', query);
  }

  async replaceGroupsForAccount(accountId, groups, ownerId) {
    // Delete existing groups for this account
    await supabaseService.delete('groups', { account_id: accountId });
    
    // Insert new groups
    const taggedGroups = groups.map(g => ({
      id: g.id,
      telegram_id: String(g.telegram_id || g.telegramId || ''),
      access_hash: String(g.access_hash || g.accessHash || ''),
      account_id: accountId,
      owner_id: ownerId,
      title: g.title,
      username: g.username,
      type: g.type,
      is_user: !!g.isUser,
      is_channel: !!g.isChannel,
      is_group: !!g.isGroup,
      updated_at: new Date().toISOString()
    }));

    if (taggedGroups.length > 0) {
      await supabaseService.upsert('groups', taggedGroups);
    }
    
    return taggedGroups;
  }

  async updateGroup(id, updater) {
    const existing = (await supabaseService.get('groups', { id }))[0];
    if (!existing) return null;

    const updated = typeof updater === 'function' ? updater(existing) : { ...existing, ...updater };
    await supabaseService.upsert('groups', updated);
    return updated;
  }

  async updateGroups(ids, updater) {
    // This is less efficient but keeps logic simple for now
    const results = [];
    for (const id of ids) {
      const res = await this.updateGroup(id, updater);
      if (res) results.push(res);
    }
    return results;
  }

  async deleteGroup(id) {
    await supabaseService.delete('groups', { id });
  }
}

export const stateStoreService = new StateStoreService();
