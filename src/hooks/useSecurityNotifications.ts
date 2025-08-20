/**
 * Security Notifications Hook
 * Provides centralized security notification management
 */

import { useCallback, useEffect, useState } from 'react';
import type { SecurityNotification } from '@/components/security/SecurityNotificationCenter';
import { useSecuritySettings } from './useSecuritySettings';
import type { SecuritySettingValue } from '@/lib/security/SecurityLogger';
import { logger } from '@/utils/logger';

interface SecurityNotificationContext {
  notifications: SecurityNotification[];
  addNotification: (notification: Omit<SecurityNotification, 'id' | 'timestamp' | 'isRead' | 'isArchived'>) => string;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  archiveNotification: (id: string) => void;
  deleteNotification: (id: string) => void;
  getUnreadCount: () => number;
  getThreatCount: () => number;
  requestNotificationPermission: () => Promise<boolean>;
  isNotificationSupported: boolean;
}

export function useSecurityNotifications(): SecurityNotificationContext {
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const { settings } = useSecuritySettings();

  // Load notifications from localStorage on hook initialization
  useEffect(() => {
    const loadNotifications = () => {
      try {
        const saved = localStorage.getItem('security_notifications');
        if (saved) {
          const parsed = JSON.parse(saved).map((n: SecurityNotification & { timestamp: string }) => ({
            ...n,
            timestamp: new Date(n.timestamp)
          }));
          setNotifications(parsed);
        }
      } catch (error) {
        logger.error('Failed to load security notifications:', error);
      }
    };

    loadNotifications();
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('security_notifications', JSON.stringify(notifications));
    } catch (error) {
      logger.error('Failed to save security notifications:', error);
    }
  }, [notifications]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      logger.warn('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      logger.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

  // Add new notification
  const addNotification = useCallback((
    notification: Omit<SecurityNotification, 'id' | 'timestamp' | 'isRead' | 'isArchived'>
  ): string => {
    const newNotification: SecurityNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      isRead: false,
      isArchived: false
    };

    setNotifications(prev => {
      // Limit to 1000 notifications to prevent memory issues
      const updated = [newNotification, ...prev].slice(0, 1000);
      return updated;
    });

    // Show browser notification if enabled and permission granted
    if (
      settings?.notifications_enabled &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        const browserNotification = new Notification(`StudyFlow Security: ${notification.title}`, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: newNotification.id,
          badge: '/favicon.ico',
          timestamp: newNotification.timestamp.getTime(),
          requireInteraction: notification.severity === 'critical',
          silent: notification.severity === 'low'
        });

        // Auto-close notification after 5 seconds for non-critical alerts
        if (notification.severity !== 'critical') {
          setTimeout(() => {
            browserNotification.close();
          }, 5000);
        }

        // Handle notification clicks
        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();
          // Could navigate to specific page or open detail dialog
        };
      } catch (error) {
        logger.error('Failed to show browser notification:', error);
      }
    }

    return newNotification.id;
  }, [settings?.notifications_enabled]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  // Archive notification
  const archiveNotification = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isArchived: true } : n)
    );
  }, []);

  // Delete notification
  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Get unread count
  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.isRead && !n.isArchived).length;
  }, [notifications]);

  // Get threat count
  const getThreatCount = useCallback(() => {
    return notifications.filter(n => 
      !n.isArchived && 
      (n.type === 'threat_detected' || n.type === 'file_quarantined') &&
      (n.severity === 'high' || n.severity === 'critical')
    ).length;
  }, [notifications]);

  // Check if notification is supported
  const isNotificationSupported = 'Notification' in window;

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    getUnreadCount,
    getThreatCount,
    requestNotificationPermission,
    isNotificationSupported
  };
}

// Notification utility functions for specific security events
export const createThreatDetectedNotification = (
  fileName: string,
  threatCount: number,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details?: Record<string, SecuritySettingValue>
): Omit<SecurityNotification, 'id' | 'timestamp' | 'isRead' | 'isArchived'> => ({
  type: 'threat_detected',
  severity,
  title: `${threatCount} Security Threat${threatCount > 1 ? 's' : ''} Detected`,
  message: `File "${fileName}" contains ${threatCount} potential security threat${threatCount > 1 ? 's' : ''}`,
  details,
  source: 'security_scanner',
  actionable: true
});

export const createFileQuarantinedNotification = (
  fileName: string,
  reason: string,
  details?: Record<string, SecuritySettingValue>
): Omit<SecurityNotification, 'id' | 'timestamp' | 'isRead' | 'isArchived'> => ({
  type: 'file_quarantined',
  severity: 'medium',
  title: 'File Quarantined',
  message: `"${fileName}" has been quarantined: ${reason}`,
  details,
  source: 'quarantine_system',
  actionable: true
});

export const createScanCompletedNotification = (
  fileCount: number,
  threatsFound: number,
  duration: number
): Omit<SecurityNotification, 'id' | 'timestamp' | 'isRead' | 'isArchived'> => ({
  type: 'scan_completed',
  severity: threatsFound > 0 ? 'medium' : 'low',
  title: 'Security Scan Completed',
  message: `Scanned ${fileCount} file${fileCount > 1 ? 's' : ''}, found ${threatsFound} threat${threatsFound > 1 ? 's' : ''}`,
  details: { fileCount, threatsFound, duration },
  source: 'background_scanner',
  actionable: false
});

export const createSettingsChangedNotification = (
  setting: string,
  oldValue: SecuritySettingValue,
  newValue: SecuritySettingValue
): Omit<SecurityNotification, 'id' | 'timestamp' | 'isRead' | 'isArchived'> => ({
  type: 'settings_changed',
  severity: 'low',
  title: 'Security Settings Updated',
  message: `Security setting "${setting}" has been changed`,
  details: { setting, oldValue, newValue },
  source: 'settings_manager',
  actionable: false
});

export const createSystemAlertNotification = (
  title: string,
  message: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details?: Record<string, SecuritySettingValue>
): Omit<SecurityNotification, 'id' | 'timestamp' | 'isRead' | 'isArchived'> => ({
  type: 'system_alert',
  severity,
  title,
  message,
  details,
  source: 'system',
  actionable: false
});