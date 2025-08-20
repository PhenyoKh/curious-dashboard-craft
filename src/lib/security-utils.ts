import { logger } from '@/utils/logger';

export interface SecurityThreat {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface SecurityNotificationDetails {
  fileName?: string;
  fileSize?: number;
  threats?: SecurityThreat[];
  scanDuration?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface SecurityNotification {
  id: string;
  type: 'threat_detected' | 'file_quarantined' | 'scan_completed' | 'settings_changed' | 'system_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details?: SecurityNotificationDetails;
  timestamp: Date;
  isRead: boolean;
  isArchived: boolean;
  source: string; // e.g., 'editor', 'background_scan', 'system'
  actionable?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'default' | 'destructive' | 'outline';
  }>;
}

export interface SecurityLog {
  id: string;
  timestamp: Date;
  eventType: 'threat_detection' | 'scan_completed' | 'file_quarantined' | 'system_alert' | 'user_action';
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  details?: SecurityNotificationDetails;
}

export interface SecurityScan {
  id: string;
  timestamp: Date;
  fileId?: string;
  fileName?: string;
  duration: number; // in milliseconds
  threatsFound: number;
  status: 'completed' | 'failed' | 'cancelled';
  result?: 'clean' | 'infected' | 'suspicious';
}

// Extend window interface for security notifications
declare global {
  interface Window {
    addSecurityNotification?: (notification: Omit<SecurityNotification, 'id' | 'timestamp' | 'isRead' | 'isArchived'>) => string | null;
  }
}

// Helper function to add security notifications from anywhere in the app
export const addSecurityNotification = (notification: Omit<SecurityNotification, 'id' | 'timestamp' | 'isRead' | 'isArchived'>) => {
  if (window.addSecurityNotification) {
    return window.addSecurityNotification(notification);
  }
  logger.warn('Security notification center not initialized');
  return null;
};