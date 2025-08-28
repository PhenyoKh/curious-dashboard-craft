import { createContext } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];

export interface RecoveryTokens {
  accessToken: string;
  refreshToken: string;
  type: string;
}

export interface AuthContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  settings: UserSettings | null;
  loading: boolean;
  isEmailVerified: boolean;
  
  // Recovery mode state
  isRecoveryMode: boolean;
  recoveryTokens: RecoveryTokens | null;
  isInvalidResetAttempt: boolean;
  
  // Auth methods
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  resendVerificationEmail: () => Promise<{ error: AuthError | null }>;
  
  // Password management methods
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  handlePasswordRecovery: (accessToken: string, refreshToken: string) => Promise<{ error: AuthError | null }>;
  
  // Recovery mode methods
  completePasswordRecovery: (newPassword: string) => Promise<{ error: AuthError | null }>;
  exitRecoveryMode: () => void;
  
  // Profile methods
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<{ error: Error | null }>;
  
  // Utility methods
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);