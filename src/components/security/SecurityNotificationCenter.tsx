/**
 * Security Notification Center
 * Centralized notification system for security events and alerts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Shield, AlertTriangle, CheckCircle, X, Eye, Archive, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSecuritySettings } from '@/hooks/useSecuritySettings';

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

interface SecurityNotificationCenterProps {
  className?: string;
}

const SecurityNotificationCenter: React.FC<SecurityNotificationCenterProps> = ({
  className = ''
}) => {
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<SecurityNotification | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'threats' | 'system'>('all');
  const { settings } = useSecuritySettings();

  // Load notifications from localStorage on component mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('security_notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(parsed);
      } catch (error) {
        console.error('Failed to parse saved notifications:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('security_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Add new notification
  const addNotification = useCallback((notification: Omit<SecurityNotification, 'id' | 'timestamp' | 'isRead' | 'isArchived'>) => {
    const newNotification: SecurityNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      isRead: false,
      isArchived: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show browser notification if enabled
    if (settings?.notifications_enabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`StudyFlow Security: ${notification.title}`, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: newNotification.id
      });
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

  // Clear all archived notifications
  const clearArchived = useCallback(() => {
    setNotifications(prev => prev.filter(n => !n.isArchived));
  }, []);

  // Get filtered notifications
  const getFilteredNotifications = useCallback(() => {
    let filtered = notifications.filter(n => !n.isArchived);

    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.isRead);
        break;
      case 'threats':
        filtered = filtered.filter(n => n.type === 'threat_detected' || n.type === 'file_quarantined');
        break;
      case 'system':
        filtered = filtered.filter(n => n.type === 'system_alert' || n.type === 'settings_changed');
        break;
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [notifications, filter]);

  // Get notification counts
  const getNotificationCounts = useCallback(() => {
    const active = notifications.filter(n => !n.isArchived);
    return {
      total: active.length,
      unread: active.filter(n => !n.isRead).length,
      threats: active.filter(n => n.type === 'threat_detected' || n.type === 'file_quarantined').length,
      critical: active.filter(n => n.severity === 'critical').length
    };
  }, [notifications]);

  const counts = getNotificationCounts();
  const filteredNotifications = getFilteredNotifications();

  // Get severity styling
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'threat_detected': return AlertTriangle;
      case 'file_quarantined': return Shield;
      case 'scan_completed': return CheckCircle;
      case 'settings_changed': return Shield;
      case 'system_alert': return Bell;
      default: return Bell;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return timestamp.toLocaleDateString();
  };

  // Expose addNotification function globally for other components
  useEffect(() => {
    (window as any).addSecurityNotification = addNotification;
    return () => {
      delete (window as any).addSecurityNotification;
    };
  }, [addNotification]);

  return (
    <>
      {/* Notification Bell Icon */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={cn("relative", className)}>
            <Bell className="w-5 h-5" />
            {counts.unread > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white"
              >
                {counts.unread > 99 ? '99+' : counts.unread}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Security Notifications</span>
            {counts.unread > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          {/* Filter Tabs */}
          <div className="p-2 border-b">
            <div className="flex space-x-1">
              {[
                { key: 'all', label: 'All', count: counts.total },
                { key: 'unread', label: 'Unread', count: counts.unread },
                { key: 'threats', label: 'Threats', count: counts.threats }
              ].map(({ key, label, count }) => (
                <Button
                  key={key}
                  variant={filter === key ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setFilter(key as any)}
                >
                  {label} {count > 0 && `(${count})`}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="h-96">
            {filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              filteredNotifications.slice(0, 10).map((notification) => {
                const Icon = getTypeIcon(notification.type);
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className="p-3 cursor-pointer"
                    onClick={() => {
                      markAsRead(notification.id);
                      setSelectedNotification(notification);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex space-x-3 w-full">
                      <Icon className={cn(
                        "w-4 h-4 mt-1 flex-shrink-0",
                        notification.severity === 'critical' ? 'text-red-500' :
                        notification.severity === 'high' ? 'text-orange-500' :
                        notification.severity === 'medium' ? 'text-yellow-500' :
                        'text-blue-500'
                      )} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            !notification.isRead && "text-gray-900",
                            notification.isRead && "text-gray-600"
                          )}>
                            {notification.title}
                          </p>
                          
                          <div className="flex items-center space-x-1">
                            <Badge className={getSeverityColor(notification.severity)} variant="outline">
                              {notification.severity.toUpperCase()}
                            </Badge>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-gray-400">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })
            )}
          </ScrollArea>

          {filteredNotifications.length > 10 && (
            <DropdownMenuSeparator />
          )}
          
          <DropdownMenuItem
            className="p-3 justify-center"
            onClick={() => {
              setIsOpen(false);
              // TODO: Navigate to full notifications page
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            View all notifications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notification Detail Dialog */}
      {selectedNotification && (
        <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center space-x-3">
                {React.createElement(getTypeIcon(selectedNotification.type), {
                  className: cn(
                    "w-6 h-6",
                    selectedNotification.severity === 'critical' ? 'text-red-500' :
                    selectedNotification.severity === 'high' ? 'text-orange-500' :
                    selectedNotification.severity === 'medium' ? 'text-yellow-500' :
                    'text-blue-500'
                  )
                })}
                <div className="flex-1">
                  <DialogTitle className="text-lg">{selectedNotification.title}</DialogTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={getSeverityColor(selectedNotification.severity)} variant="outline">
                      {selectedNotification.severity.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatTimestamp(selectedNotification.timestamp)}
                    </span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">{selectedNotification.source}</span>
                  </div>
                </div>
              </div>
            </DialogHeader>
            
            <DialogDescription className="text-base">
              {selectedNotification.message}
            </DialogDescription>

            {selectedNotification.details && Object.keys(selectedNotification.details).length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Details:</h4>
                <div className="bg-gray-50 rounded-lg p-3 text-sm font-mono">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(selectedNotification.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <DialogFooter className="flex justify-between">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    archiveNotification(selectedNotification.id);
                    setSelectedNotification(null);
                  }}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    deleteNotification(selectedNotification.id);
                    setSelectedNotification(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>

              {selectedNotification.actions && (
                <div className="flex space-x-2">
                  {selectedNotification.actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant || 'default'}
                      size="sm"
                      onClick={() => {
                        action.action();
                        setSelectedNotification(null);
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

// Helper function to add security notifications from anywhere in the app
export const addSecurityNotification = (notification: Omit<SecurityNotification, 'id' | 'timestamp' | 'isRead' | 'isArchived'>) => {
  if ((window as any).addSecurityNotification) {
    return (window as any).addSecurityNotification(notification);
  }
  console.warn('Security notification center not initialized');
  return null;
};

export default SecurityNotificationCenter;