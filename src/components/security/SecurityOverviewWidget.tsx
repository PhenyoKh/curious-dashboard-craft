/**
 * Security Overview Widget
 * Compact security status widget for main dashboard
 */

import React, { useState, useEffect } from 'react';
import type { SecurityLog, SecurityScan } from '@/lib/security-utils';
import { Shield, AlertTriangle, CheckCircle, TrendingUp, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useQuarantine } from '@/hooks/useQuarantine';
import { useSecurityNotifications } from '@/hooks/useSecurityNotifications';
import { logger } from '@/utils/logger';

interface SecurityOverviewWidgetProps {
  className?: string;
  onViewDetails?: () => void;
}

interface SecuritySummary {
  securityScore: number;
  threatsToday: number;
  scansToday: number;
  quarantinedFiles: number;
  lastScanTime: Date | null;
  trend: 'improving' | 'stable' | 'declining';
}

const SecurityOverviewWidget: React.FC<SecurityOverviewWidgetProps> = ({
  className = '',
  onViewDetails
}) => {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { quarantinedFiles } = useQuarantine();
  const { notifications, getThreatCount } = useSecurityNotifications();

  useEffect(() => {
    const calculateSummary = () => {
      try {
        setIsLoading(true);
        
        // Get today's date for filtering
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Get stored security data
        const securityLogs = JSON.parse(localStorage.getItem('security_logs') || '[]');
        const scanHistory = JSON.parse(localStorage.getItem('scan_history') || '[]');
        
        // Filter today's data
        const todayLogs = securityLogs.filter((log: SecurityLog) => 
          log.timestamp.startsWith(today)
        );
        const todayScans = scanHistory.filter((scan: SecurityScan) => 
          scan.timestamp.startsWith(today)
        );
        const yesterdayThreats = securityLogs.filter((log: SecurityLog) => 
          log.timestamp.startsWith(yesterday) && log.eventType === 'threat_detection'
        ).length;
        
        // Calculate metrics
        const threatsToday = todayLogs.filter((log: SecurityLog) => 
          log.eventType === 'threat_detection'
        ).length;
        const scansToday = todayScans.length;
        const activeQuarantineCount = quarantinedFiles.filter(file => !file.restored).length;
        
        // Get last scan time
        const lastScan = scanHistory.length > 0 ? 
          new Date(Math.max(...scanHistory.map((s: SecurityScan) => new Date(s.timestamp).getTime()))) : 
          null;
        
        // Calculate security score
        const totalScans = scanHistory.length;
        const totalThreats = securityLogs.filter((log: SecurityLog) => 
          log.eventType === 'threat_detection'
        ).length;
        
        let securityScore = 100;
        if (totalScans > 0) {
          const threatRate = (totalThreats / totalScans) * 100;
          securityScore = Math.max(0, Math.round(100 - threatRate * 2));
        }
        
        // Determine trend
        let trend: 'improving' | 'stable' | 'declining' = 'stable';
        if (threatsToday > yesterdayThreats) {
          trend = 'declining';
        } else if (threatsToday < yesterdayThreats && yesterdayThreats > 0) {
          trend = 'improving';
        }
        
        setSummary({
          securityScore,
          threatsToday,
          scansToday,
          quarantinedFiles: activeQuarantineCount,
          lastScanTime: lastScan,
          trend
        });
      } catch (error) {
        logger.error('Failed to calculate security summary:', error);
        setSummary({
          securityScore: 100,
          threatsToday: 0,
          scansToday: 0,
          quarantinedFiles: 0,
          lastScanTime: null,
          trend: 'stable'
        });
      } finally {
        setIsLoading(false);
      }
    };

    calculateSummary();
    
    // Update every minute
    const interval = setInterval(calculateSummary, 60000);
    return () => clearInterval(interval);
  }, [quarantinedFiles]);

  const formatLastScanTime = (time: Date | null) => {
    if (!time) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - time.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return time.toLocaleDateString();
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (trend === 'declining') return <AlertTriangle className="w-3 h-3 text-red-600" />;
    return <CheckCircle className="w-3 h-3 text-blue-600" />;
  };

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="pb-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-2 bg-gray-200 rounded w-full"></div>
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Security Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center">Unable to load security data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span>Security Status</span>
          </div>
          {getTrendIcon(summary.trend)}
        </CardTitle>
        <CardDescription>
          System security overview and recent activity
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Security Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Security Score</span>
            <Badge className={getSecurityScoreColor(summary.securityScore)}>
              {summary.securityScore}/100
            </Badge>
          </div>
          <Progress value={summary.securityScore} className="h-2" />
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1">
            <div className="text-lg font-bold text-blue-600">{summary.scansToday}</div>
            <div className="text-xs text-gray-500">Scans Today</div>
          </div>
          
          <div className="space-y-1">
            <div className={cn(
              "text-lg font-bold",
              summary.threatsToday > 0 ? "text-orange-600" : "text-gray-600"
            )}>
              {summary.threatsToday}
            </div>
            <div className="text-xs text-gray-500">Threats Today</div>
          </div>
          
          <div className="space-y-1">
            <div className={cn(
              "text-lg font-bold",
              summary.quarantinedFiles > 0 ? "text-red-600" : "text-gray-600"
            )}>
              {summary.quarantinedFiles}
            </div>
            <div className="text-xs text-gray-500">Quarantined</div>
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Last Scan:</span>
            <span className="text-gray-700">{formatLastScanTime(summary.lastScanTime)}</span>
          </div>
          
          {summary.threatsToday > 0 && (
            <div className="flex items-center space-x-1 text-orange-600 bg-orange-50 px-2 py-1 rounded">
              <AlertTriangle className="w-3 h-3" />
              <span>{summary.threatsToday} threat{summary.threatsToday > 1 ? 's' : ''} detected today</span>
            </div>
          )}
          
          {summary.quarantinedFiles > 0 && (
            <div className="flex items-center space-x-1 text-red-600 bg-red-50 px-2 py-1 rounded">
              <Shield className="w-3 h-3" />
              <span>{summary.quarantinedFiles} file{summary.quarantinedFiles > 1 ? 's' : ''} in quarantine</span>
            </div>
          )}
          
          {summary.threatsToday === 0 && summary.quarantinedFiles === 0 && (
            <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded">
              <CheckCircle className="w-3 h-3" />
              <span>All systems secure</span>
            </div>
          )}
        </div>

        {/* View Details Button */}
        {onViewDetails && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={onViewDetails}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Security Dashboard
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityOverviewWidget;