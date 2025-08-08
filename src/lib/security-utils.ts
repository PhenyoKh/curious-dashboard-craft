export interface SecurityNotification {
  id: string;
  type: 'threat_detected' | 'file_quarantined' | 'scan_completed' | 'settings_changed' | 'system_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details?: Record<string, any>;
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

// Helper function to add security notifications from anywhere in the app
export const addSecurityNotification = (notification: Omit<SecurityNotification, 'id' | 'timestamp' | 'isRead' | 'isArchived'>) => {
  if ((window as any).addSecurityNotification) {
    return (window as any).addSecurityNotification(notification);
  }
  console.warn('Security notification center not initialized');
  return null;
};