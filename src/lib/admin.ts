/**
 * Admin User Management Utilities
 * Functions for managing admin user access and permissions
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface AdminUser {
  id: string;
  user_id: string | null;
  email: string;
  is_active: boolean;
  admin_level: 'full' | 'readonly';
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Check if current user is admin
 * Uses the database function for secure server-side validation
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_user_admin');
    
    if (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }
    
    return data || false;
  } catch (err) {
    logger.error('Exception checking admin status:', err);
    return false;
  }
}

/**
 * Check if specific email is admin
 * Uses the database function with email parameter
 */
export async function isEmailAdmin(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_user_admin', { user_email: email });
    
    if (error) {
      logger.error('Error checking admin status for email:', error);
      return false;
    }
    
    return data || false;
  } catch (err) {
    logger.error('Exception checking admin status for email:', err);
    return false;
  }
}

/**
 * Get all admin users (only callable by admins)
 * Protected by RLS policy
 */
export async function getAllAdminUsers(): Promise<AdminUser[]> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      logger.error('Error fetching admin users:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    logger.error('Exception fetching admin users:', err);
    return [];
  }
}

/**
 * Add admin user (only callable by existing admins)
 * Uses secure database function
 */
export async function addAdminUser(
  email: string, 
  adminLevel: 'full' | 'readonly' = 'full'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('manage_admin_user', {
      user_email: email,
      action: 'add',
      admin_level: adminLevel
    });
    
    if (error) {
      logger.error('Error adding admin user:', error);
      return { success: false, error: error.message };
    }
    
    logger.log('✅ Admin user added:', email);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception adding admin user:', err);
    return { success: false, error: errorMessage };
  }
}

/**
 * Remove admin user (only callable by existing admins)
 * Uses secure database function
 */
export async function removeAdminUser(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('manage_admin_user', {
      user_email: email,
      action: 'remove'
    });
    
    if (error) {
      logger.error('Error removing admin user:', error);
      return { success: false, error: error.message };
    }
    
    logger.log('✅ Admin user removed:', email);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception removing admin user:', err);
    return { success: false, error: errorMessage };
  }
}

/**
 * Validate admin access for sensitive operations
 * Should be called before performing admin-only actions
 */
export async function validateAdminAccess(): Promise<{ isValid: boolean; error?: string }> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    
    if (!isAdmin) {
      return { isValid: false, error: 'Admin access required' };
    }
    
    return { isValid: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception validating admin access:', err);
    return { isValid: false, error: errorMessage };
  }
}

/**
 * Admin access levels and permissions
 */
export const ADMIN_PERMISSIONS = {
  FULL: 'full',
  READONLY: 'readonly'
} as const;

/**
 * List of features that require admin access
 */
export const ADMIN_FEATURES = [
  'user_management',
  'subscription_override',
  'system_settings',
  'analytics_access',
  'support_tools'
] as const;

/**
 * Check if admin has permission for specific feature
 * Currently all admins have full access, but this allows future granular permissions
 */
export function hasAdminPermission(
  adminLevel: string, 
  feature: typeof ADMIN_FEATURES[number]
): boolean {
  // For now, all admin levels have access to all features
  // This can be expanded later for more granular permissions
  return adminLevel === ADMIN_PERMISSIONS.FULL || adminLevel === ADMIN_PERMISSIONS.READONLY;
}