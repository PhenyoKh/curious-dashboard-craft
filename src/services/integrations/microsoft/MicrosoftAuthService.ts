/**
 * Microsoft OAuth Service - Handles Microsoft Graph authentication using MSAL
 */

import { PublicClientApplication, Configuration, AuthenticationResult, SilentRequest, RedirectRequest, PopupRequest, AccountInfo } from '@azure/msal-browser';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { encryptToken, decryptToken } from '@/utils/encryption';

// Microsoft Graph API Types
export interface MicrosoftMailboxSettings {
  '@odata.context'?: string;
  automaticRepliesSetting?: {
    status: 'disabled' | 'alwaysEnabled' | 'scheduled';
    externalAudience: 'none' | 'contactsOnly' | 'all';
    internalReplyMessage?: string;
    externalReplyMessage?: string;
    scheduledStartDateTime?: {
      dateTime: string;
      timeZone: string;
    };
    scheduledEndDateTime?: {
      dateTime: string;
      timeZone: string;
    };
  };
  archiveFolder?: string;
  timeZone?: string;
  delegateMeetingMessageDeliveryOptions?: 'sendToDelegateAndInformationToPrincipal' | 'sendToDelegateAndPrincipal' | 'sendToDelegateOnly';
  locale?: {
    locale: string;
    displayName: string;
  };
  workingHours?: {
    daysOfWeek: string[];
    startTime: string;
    endTime: string;
    timeZone: {
      name: string;
      bias?: number;
    };
  };
}

export interface MicrosoftTimeZoneInfo {
  alias: string;
  displayName: string;
  bias?: number;
  standardBias?: number;
  daylightBias?: number;
}

export interface MicrosoftUpdateData {
  updated_at: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  scope?: string;
  mailbox_settings?: MicrosoftMailboxSettings;
  time_zone_info?: MicrosoftTimeZoneInfo;
}

export interface MicrosoftAuthConfig {
  clientId: string;
  tenantId?: string; // Optional - defaults to 'common' for multi-tenant
  redirectUri: string;
  scopes: string[];
}

export interface MicrosoftTokens {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export interface MicrosoftAuthState {
  isAuthenticated: boolean;
  accountId?: string;
  email?: string;
  name?: string;
  tenantId?: string;
  tokens?: MicrosoftTokens;
  expiresAt?: Date;
}

export interface MicrosoftCalendarIntegration {
  id: string;
  user_id: string;
  provider: 'outlook';
  provider_account_id: string;
  provider_calendar_id?: string;
  calendar_name?: string;
  sync_enabled: boolean;
  sync_direction: 'import_only' | 'export_only' | 'bidirectional';
  last_sync_at?: string;
  sync_status: 'pending' | 'syncing' | 'success' | 'error' | 'disabled';
  tenant_id?: string;
  microsoft_user_id?: string;
  mailbox_settings?: MicrosoftMailboxSettings;
  time_zone_info?: MicrosoftTimeZoneInfo;
}

export class MicrosoftAuthService {
  private msalInstance: PublicClientApplication;
  private static instance: MicrosoftAuthService;
  private config: MicrosoftAuthConfig;

  private constructor(config: MicrosoftAuthConfig) {
    this.config = config;
    
    const msalConfig: Configuration = {
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId || 'common'}`,
        redirectUri: config.redirectUri,
        postLogoutRedirectUri: config.redirectUri
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (containsPii) return;
            logger.debug(`MSAL [${level}]: ${message}`);
          },
          piiLoggingEnabled: false
        }
      }
    };

    this.msalInstance = new PublicClientApplication(msalConfig);
  }

  /**
   * Initialize the Microsoft Auth Service (singleton)
   */
  static async initialize(config: MicrosoftAuthConfig): Promise<MicrosoftAuthService> {
    if (!MicrosoftAuthService.instance) {
      MicrosoftAuthService.instance = new MicrosoftAuthService(config);
      await MicrosoftAuthService.instance.msalInstance.initialize();
    }
    return MicrosoftAuthService.instance;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): MicrosoftAuthService {
    if (!MicrosoftAuthService.instance) {
      throw new Error('MicrosoftAuthService not initialized. Call initialize() first.');
    }
    return MicrosoftAuthService.instance;
  }

  /**
   * Login with popup
   */
  async loginPopup(): Promise<AuthenticationResult> {
    const loginRequest: PopupRequest = {
      scopes: this.config.scopes,
      prompt: 'select_account'
    };

    try {
      const response = await this.msalInstance.loginPopup(loginRequest);
      return response;
    } catch (error) {
      logger.error('Microsoft popup login failed:', error?.message || 'Unknown error');
      throw new Error('Failed to authenticate with Microsoft');
    }
  }

  /**
   * Login with redirect
   */
  async loginRedirect(): Promise<void> {
    const loginRequest: RedirectRequest = {
      scopes: this.config.scopes,
      prompt: 'select_account'
    };

    try {
      await this.msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      logger.error('Microsoft redirect login failed:', error?.message || 'Unknown error');
      throw new Error('Failed to authenticate with Microsoft');
    }
  }

  /**
   * Handle redirect response (call this on app startup)
   */
  async handleRedirectResponse(): Promise<AuthenticationResult | null> {
    try {
      return await this.msalInstance.handleRedirectPromise();
    } catch (error) {
      logger.error('Error handling redirect response:', error?.message || 'Unknown error');
      return null;
    }
  }

  /**
   * Get access token silently
   */
  async getAccessTokenSilent(account?: AccountInfo): Promise<string> {
    const accounts = account ? [account] : this.msalInstance.getAllAccounts();
    
    if (accounts.length === 0) {
      throw new Error('No accounts found. Please login first.');
    }

    const silentRequest: SilentRequest = {
      scopes: this.config.scopes,
      account: accounts[0]
    };

    try {
      const response = await this.msalInstance.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch (error) {
      logger.error('Silent token acquisition failed:', error?.message || 'Unknown error');
      throw new Error('Failed to acquire access token');
    }
  }

  /**
   * Get access token with popup fallback
   */
  async getAccessToken(account?: AccountInfo): Promise<string> {
    try {
      return await this.getAccessTokenSilent(account);
    } catch (error) {
      // If silent acquisition fails, try popup
      const popupRequest: PopupRequest = {
        scopes: this.config.scopes,
        account: account || this.msalInstance.getAllAccounts()[0]
      };

      try {
        const response = await this.msalInstance.acquireTokenPopup(popupRequest);
        return response.accessToken;
      } catch (popupError) {
        logger.error('Popup token acquisition failed:', popupError?.message || 'Unknown error');
        throw new Error('Failed to acquire access token');
      }
    }
  }

  /**
   * Get current account information
   */
  getCurrentAccount(): AccountInfo | null {
    const accounts = this.msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }

  /**
   * Get all accounts
   */
  getAllAccounts(): AccountInfo[] {
    return this.msalInstance.getAllAccounts();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.msalInstance.getAllAccounts().length > 0;
  }

  /**
   * Logout
   */
  async logout(account?: AccountInfo): Promise<void> {
    const logoutAccount = account || this.getCurrentAccount();
    
    if (logoutAccount) {
      await this.msalInstance.logoutPopup({
        account: logoutAccount,
        postLogoutRedirectUri: this.config.redirectUri
      });
    }
  }

  /**
   * Get user information from Microsoft Graph
   */
  async getUserInfo(accessToken?: string): Promise<{ id: string; email: string; name: string; tenantId: string }> {
    try {
      const token = accessToken || await this.getAccessToken();
      
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info from Microsoft Graph');
      }

      const userInfo = await response.json();
      const account = this.getCurrentAccount();
      
      return {
        id: userInfo.id,
        email: userInfo.mail || userInfo.userPrincipalName,
        name: userInfo.displayName || userInfo.givenName + ' ' + userInfo.surname,
        tenantId: account?.tenantId || 'common'
      };
    } catch (error) {
      logger.error('Error fetching user info:', error?.message || 'Unknown error');
      throw new Error('Failed to fetch user information');
    }
  }

  /**
   * Get mailbox settings
   */
  async getMailboxSettings(accessToken?: string): Promise<MicrosoftMailboxSettings> {
    try {
      const token = accessToken || await this.getAccessToken();
      
      const response = await fetch('https://graph.microsoft.com/v1.0/me/mailboxSettings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch mailbox settings');
      }

      return await response.json();
    } catch (error) {
      logger.error('Error fetching mailbox settings:', error?.message || 'Unknown error');
      return null;
    }
  }

  /**
   * Store Microsoft calendar integration in database
   */
  async storeIntegration(
    userId: string,
    userInfo: { id: string; email: string; name: string; tenantId: string },
    tokens: MicrosoftTokens,
    calendarId?: string
  ): Promise<MicrosoftCalendarIntegration> {
    try {
      // Simple token "encryption" - in production, use proper encryption
      const encryptedAccessToken = encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;
      const encryptedIdToken = tokens.id_token ? encryptToken(tokens.id_token) : null;

      const expiresAt = tokens.expires_in ? 
        new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null;

      // Get mailbox settings
      const mailboxSettings = await this.getMailboxSettings();

      const { data, error } = await supabase
        .from('calendar_integrations')
        .upsert({
          user_id: userId,
          provider: 'outlook',
          provider_account_id: userInfo.id,
          provider_calendar_id: calendarId || null,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: expiresAt,
          scope: tokens.scope || this.config.scopes.join(' '),
          calendar_name: calendarId ? `${userInfo.name}'s Calendar` : 'Primary Calendar',
          sync_enabled: true,
          sync_direction: 'bidirectional',
          sync_status: 'pending',
          tenant_id: userInfo.tenantId,
          microsoft_user_id: userInfo.id,
          mailbox_settings: mailboxSettings,
          time_zone_info: mailboxSettings?.timeZone ? {
            name: mailboxSettings.timeZone,
            bias: mailboxSettings.timeZone
          } : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,provider,provider_calendar_id'
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Error storing Microsoft calendar integration:', error?.message || 'Unknown error');
      throw new Error('Failed to store calendar integration');
    }
  }

  /**
   * Get user's Microsoft calendar integrations
   */
  async getUserIntegrations(userId: string): Promise<MicrosoftCalendarIntegration[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'outlook')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Error fetching Microsoft calendar integrations:', error?.message || 'Unknown error');
      throw new Error('Failed to fetch calendar integrations');
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(integration: MicrosoftCalendarIntegration): Promise<string> {
    try {
      // Check if token is expired
      if (integration.token_expires_at) {
        const expiresAt = new Date(integration.token_expires_at);
        const now = new Date();
        const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

        if (expiresAt.getTime() - bufferTime <= now.getTime()) {
          // Token is expired or will expire soon, get new token
          const account = this.getAllAccounts().find(acc => 
            acc.localAccountId === integration.microsoft_user_id ||
            acc.homeAccountId.includes(integration.microsoft_user_id!)
          );

          if (account) {
            const newToken = await this.getAccessToken(account);
            
            // Update stored token
            await this.updateStoredTokens(integration.id, {
              access_token: newToken,
              expires_in: 3600 // Assume 1 hour expiry
            });

            return newToken;
          } else {
            throw new Error('Microsoft account not found - please re-authenticate');
          }
        }
      }

      // Token is still valid, decrypt and return
      const accessToken = decryptToken(integration.access_token_encrypted);
      return accessToken;
    } catch (error) {
      logger.error('Error getting valid access token:', error?.message || 'Unknown error');
      throw new Error('Failed to get valid access token');
    }
  }

  /**
   * Update stored tokens after refresh
   */
  private async updateStoredTokens(integrationId: string, tokens: Partial<MicrosoftTokens>): Promise<void> {
    try {
      const updateData: MicrosoftUpdateData = {
        updated_at: new Date().toISOString()
      };

      if (tokens.access_token) {
        updateData.access_token_encrypted = encryptToken(tokens.access_token);
      }

      if (tokens.expires_in) {
        updateData.token_expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      }

      const { error } = await supabase
        .from('calendar_integrations')
        .update(updateData)
        .eq('id', integrationId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error updating stored tokens:', error?.message || 'Unknown error');
      throw new Error('Failed to update stored tokens');
    }
  }

  /**
   * Revoke access and remove integration
   */
  async revokeAccess(integrationId: string): Promise<void> {
    try {
      // Find the associated account and log out
      const { data: integration } = await supabase
        .from('calendar_integrations')
        .select('microsoft_user_id')
        .eq('id', integrationId)
        .single();

      if (integration?.microsoft_user_id) {
        const account = this.getAllAccounts().find(acc => 
          acc.localAccountId === integration.microsoft_user_id ||
          acc.homeAccountId.includes(integration.microsoft_user_id)
        );

        if (account) {
          await this.logout(account);
        }
      }

      // Remove from database
      const { error: deleteError } = await supabase
        .from('calendar_integrations')
        .delete()
        .eq('id', integrationId);

      if (deleteError) throw deleteError;
    } catch (error) {
      logger.error('Error revoking access:', error?.message || 'Unknown error');
      throw new Error('Failed to revoke calendar access');
    }
  }

  /**
   * Update integration sync preferences
   */
  async updateSyncPreferences(
    integrationId: string,
    preferences: {
      sync_enabled?: boolean;
      sync_direction?: 'import_only' | 'export_only' | 'bidirectional';
      sync_frequency_minutes?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .update({
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error updating sync preferences:', error?.message || 'Unknown error');
      throw new Error('Failed to update sync preferences');
    }
  }

  /**
   * Check if user has active Microsoft Calendar integration
   */
  async hasActiveIntegration(userId: string): Promise<boolean> {
    try {
      const integrations = await this.getUserIntegrations(userId);
      return integrations.some(integration => 
        integration.sync_enabled && integration.sync_status !== 'error'
      );
    } catch (error) {
      logger.error('Error checking active integration:', error?.message || 'Unknown error');
      return false;
    }
  }

  /**
   * Get Microsoft Graph API scopes
   */
  static getDefaultScopes(): string[] {
    return [
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/MailboxSettings.Read',
      'https://graph.microsoft.com/OnlineMeetings.ReadWrite'
    ];
  }

  /**
   * Get recommended MSAL configuration
   */
  static getRecommendedConfig(clientId: string, tenantId?: string): MicrosoftAuthConfig {
    return {
      clientId,
      tenantId: tenantId || 'common',
      redirectUri: `${window.location.origin}/auth/microsoft/callback`,
      scopes: this.getDefaultScopes()
    };
  }
}