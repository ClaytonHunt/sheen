/**
 * Authentication Storage Manager
 * 
 * Manages credentials in ~/.sheen/auth.json
 * Supports:
 * - OAuth tokens (GitHub Copilot)
 * - API keys (Anthropic, OpenAI, Google)
 * - Token refresh and expiration
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';

/**
 * Auth storage location
 */
const SHEEN_DIR = join(homedir(), '.sheen');
const AUTH_FILE = join(SHEEN_DIR, 'auth.json');

/**
 * Supported provider types
 */
export type ProviderType = 'github' | 'anthropic' | 'openai' | 'google';

/**
 * Auth credential types
 */
export interface OAuthCredential {
  type: 'oauth';
  access: string;
  refresh?: string;
  expires?: number; // Unix timestamp, 0 = never expires
}

export interface ApiKeyCredential {
  type: 'apikey';
  key: string;
}

export type Credential = OAuthCredential | ApiKeyCredential;

/**
 * Auth storage structure
 */
export interface AuthStorage {
  [provider: string]: Credential;
}

/**
 * AuthManager - Manages authentication credentials
 */
export class AuthManager {
  private storage: AuthStorage = {};
  private loaded: boolean = false;

  /**
   * Initialize auth manager
   */
  async init(): Promise<void> {
    await this.ensureDir();
    await this.load();
  }

  /**
   * Ensure ~/.sheen directory exists
   */
  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(SHEEN_DIR, { recursive: true });
    } catch (error: any) {
      logger.error('Failed to create .sheen directory', error);
      throw error;
    }
  }

  /**
   * Load credentials from disk
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(AUTH_FILE, 'utf-8');
      this.storage = JSON.parse(data);
      this.loaded = true;
      logger.debug('Loaded auth storage', { providers: Object.keys(this.storage) });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, start with empty storage
        this.storage = {};
        this.loaded = true;
        logger.debug('Auth storage file not found, starting fresh');
      } else {
        logger.error('Failed to load auth storage', error);
        throw error;
      }
    }
  }

  /**
   * Save credentials to disk
   */
  async save(): Promise<void> {
    try {
      await fs.writeFile(AUTH_FILE, JSON.stringify(this.storage, null, 2), 'utf-8');
      logger.debug('Saved auth storage', { providers: Object.keys(this.storage) });
    } catch (error: any) {
      logger.error('Failed to save auth storage', error);
      throw error;
    }
  }

  /**
   * Store OAuth credential
   */
  async setOAuth(provider: ProviderType, access: string, refresh?: string, expires?: number): Promise<void> {
    if (!this.loaded) await this.load();

    this.storage[provider] = {
      type: 'oauth',
      access,
      refresh,
      expires: expires || 0,
    };

    await this.save();
    logger.info(`Stored OAuth credentials for ${provider}`);
  }

  /**
   * Store API key credential
   */
  async setApiKey(provider: ProviderType, key: string): Promise<void> {
    if (!this.loaded) await this.load();

    this.storage[provider] = {
      type: 'apikey',
      key,
    };

    await this.save();
    logger.info(`Stored API key for ${provider}`);
  }

  /**
   * Get credential for provider
   */
  async get(provider: ProviderType): Promise<Credential | undefined> {
    if (!this.loaded) await this.load();
    return this.storage[provider];
  }

  /**
   * Get access token/API key for provider
   */
  async getToken(provider: ProviderType): Promise<string | undefined> {
    const credential = await this.get(provider);
    if (!credential) return undefined;

    if (credential.type === 'oauth') {
      // Check if token is expired
      if (credential.expires && credential.expires > 0) {
        const now = Math.floor(Date.now() / 1000);
        if (now >= credential.expires) {
          logger.warn(`OAuth token for ${provider} has expired`);
          // TODO: Implement token refresh
          return undefined;
        }
      }
      return credential.access;
    } else {
      return credential.key;
    }
  }

  /**
   * Remove credential for provider
   */
  async remove(provider: ProviderType): Promise<void> {
    if (!this.loaded) await this.load();

    if (this.storage[provider]) {
      delete this.storage[provider];
      await this.save();
      logger.info(`Removed credentials for ${provider}`);
    }
  }

  /**
   * List all authenticated providers
   */
  async list(): Promise<Array<{ provider: ProviderType; type: string }>> {
    if (!this.loaded) await this.load();

    return Object.entries(this.storage).map(([provider, credential]) => ({
      provider: provider as ProviderType,
      type: credential.type,
    }));
  }

  /**
   * Check if provider is authenticated
   */
  async isAuthenticated(provider: ProviderType): Promise<boolean> {
    const token = await this.getToken(provider);
    return !!token;
  }

  /**
   * Clear all credentials
   */
  async clear(): Promise<void> {
    this.storage = {};
    await this.save();
    logger.info('Cleared all credentials');
  }
}

/**
 * Singleton auth manager instance
 */
let authManager: AuthManager | undefined;

/**
 * Get global auth manager instance
 */
export async function getAuthManager(): Promise<AuthManager> {
  if (!authManager) {
    authManager = new AuthManager();
    await authManager.init();
  }
  return authManager;
}
