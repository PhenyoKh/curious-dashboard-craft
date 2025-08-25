/**
 * Google OAuth Service - Browser-compatible Google Calendar OAuth2 authentication and token management
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { encryptToken, decryptToken } from '@/utils/encryption';

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret?: string; // Optional - not needed for client-side OAuth2
  redirectUri: string;
  scopes: string[];
}

// Token update data for database
export interface TokenUpdateData {
  access_token_encrypted: string;
  token_expires_at: string;
  updated_at: string;
  refresh_token_encrypted?: string;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export interface GoogleAuthState {
  isAuthenticated: boolean;
  accountId?: string;
  email?: string;
  name?: string;
  tokens?: GoogleTokens;
  expiresAt?: Date;
}

export interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: 'google';
  provider_account_id: string;
  provider_calendar_id?: string;
  calendar_name?: string;
  sync_enabled: boolean;
  sync_direction: 'import_only' | 'export_only' | 'bidirectional';
  last_sync_at?: string;
  sync_status: 'pending' | 'syncing' | 'success' | 'error' | 'disabled';
}

export class GoogleAuthService {
  private static instance: GoogleAuthService;
  
  private constructor(private config: GoogleAuthConfig) {
    // Browser-compatible implementation - no OAuth2Client needed
  }
  
  /**
   * Initialize the Google Auth Service (singleton)
   */
  static initialize(config: GoogleAuthConfig): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService(config);
    }
    return GoogleAuthService.instance;
  }
  
  /**
   * Get the singleton instance
   */
  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      throw new Error('GoogleAuthService not initialized. Call initialize() first.');
    }
    return GoogleAuthService.instance;
  }
  
  /**
   * Generate OAuth2 authorization URL
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent' // Force consent screen to get refresh token
    });

    if (state) {
      params.set('state', state);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<GoogleTokens> {
    try {
      const tokenData = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret || '',
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri
      });

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenData.toString()
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('Token exchange failed:', errorData);
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const tokens = await response.json();
      
      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }
      
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        expires_in: tokens.expires_in || undefined,
        scope: tokens.scope,
        token_type: tokens.token_type || 'Bearer'
      };
    } catch (error) {
      logger.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }
  
  /**
   * Get user info from Google
   */
  async getUserInfo(accessToken: string): Promise<{ id: string; email: string; name: string }> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }
      
      const userInfo = await response.json();
      
      return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name || userInfo.email
      };
    } catch (error) {
      logger.error('Error fetching user info:', error);
      throw new Error('Failed to fetch user information');
    }
  }
  
  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    try {
      const tokenData = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenData.toString()
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('Token refresh failed:', errorData);
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const tokens = await response.json();
      
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || refreshToken, // Keep existing refresh token if not provided
        expires_in: tokens.expires_in || undefined,
        scope: tokens.scope,
        token_type: tokens.token_type || 'Bearer'
      };
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }
  
  /**
   * Store calendar integration in database
   */
  async storeIntegration(
    userId: string,
    userInfo: { id: string; email: string; name: string },
    tokens: GoogleTokens,
    calendarId?: string
  ): Promise<CalendarIntegration> {
    try {
      // Simple token "encryption" - in production, use proper encryption
      const encryptedAccessToken = encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;
      
      const expiresAt = tokens.expires_in ? 
        new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null;
      
      const { data, error } = await supabase
        .from('calendar_integrations')
        .upsert({
          user_id: userId,
          provider: 'google',
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
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,provider,provider_calendar_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      logger.error('Error storing calendar integration:', error);
      throw new Error('Failed to store calendar integration');
    }
  }
  
  /**
   * Get user's calendar integrations
   */
  async getUserIntegrations(userId: string): Promise<CalendarIntegration[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      logger.error('Error fetching calendar integrations:', error);
      throw new Error('Failed to fetch calendar integrations');
    }
  }
  
  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(integration: CalendarIntegration): Promise<string> {
    try {
      // Simple token "decryption" - in production, use proper decryption
      const accessToken = decryptToken(integration.access_token_encrypted);
      
      // Check if token is expired
      if (integration.token_expires_at) {
        const expiresAt = new Date(integration.token_expires_at);
        const now = new Date();
        const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
        
        if (expiresAt.getTime() - bufferTime <= now.getTime()) {
          // Token is expired or will expire soon, refresh it
          if (!integration.refresh_token_encrypted) {
            throw new Error('No refresh token available');
          }
          
          const refreshToken = decryptToken(integration.refresh_token_encrypted);
          const newTokens = await this.refreshAccessToken(refreshToken);
          
          // Update stored tokens
          await this.updateStoredTokens(integration.id, newTokens);
          
          return newTokens.access_token;
        }
      }
      
      return accessToken;
    } catch (error) {
      logger.error('Error getting valid access token:', error);
      throw new Error('Failed to get valid access token');
    }
  }
  
  /**
   * Update stored tokens after refresh
   */
  private async updateStoredTokens(integrationId: string, tokens: GoogleTokens): Promise<void> {
    try {
      const encryptedAccessToken = encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined;
      const expiresAt = tokens.expires_in ? 
        new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null;
      
      const updateData: TokenUpdateData = {
        access_token_encrypted: encryptedAccessToken,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      };
      
      if (encryptedRefreshToken) {
        updateData.refresh_token_encrypted = encryptedRefreshToken;
      }
      
      const { error } = await supabase
        .from('calendar_integrations')
        .update(updateData)
        .eq('id', integrationId);
      
      if (error) throw error;
    } catch (error) {
      logger.error('Error updating stored tokens:', error);
      throw new Error('Failed to update stored tokens');
    }
  }
  
  /**
   * Revoke access and remove integration
   */
  async revokeAccess(integrationId: string): Promise<void> {
    try {
      // Get integration to revoke access
      const { data: integration, error: fetchError } = await supabase
        .from('calendar_integrations')
        .select('access_token_encrypted')
        .eq('id', integrationId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Revoke access token with Google
      const accessToken = decryptToken(integration.access_token_encrypted);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // Remove from database
      const { error: deleteError } = await supabase
        .from('calendar_integrations')
        .delete()
        .eq('id', integrationId);
      
      if (deleteError) throw deleteError;
    } catch (error) {
      logger.error('Error revoking access:', error);
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
      logger.error('Error updating sync preferences:', error);
      throw new Error('Failed to update sync preferences');
    }
  }
  
  /**
   * Check if user has active Google Calendar integration
   */
  async hasActiveIntegration(userId: string): Promise<boolean> {
    try {
      const integrations = await this.getUserIntegrations(userId);
      return integrations.some(integration => 
        integration.sync_enabled && integration.sync_status !== 'error'
      );
    } catch (error) {
      logger.error('Error checking active integration:', error);
      return false;
    }
  }
}