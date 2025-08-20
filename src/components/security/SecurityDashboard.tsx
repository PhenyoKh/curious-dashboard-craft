/**
 * Security Dashboard Analytics
 * Comprehensive overview of security metrics and system health
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { SecurityLog, SecurityScan } from '@/lib/security-utils';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  FileX, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Activity,
  Database,
  Scan,
  Eye,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { useSecuritySettings } from '@/hooks/useSecuritySettings';
import { useQuarantine } from '@/hooks/useQuarantine';
import { useSecurityNotifications } from '@/hooks/useSecurityNotifications';
import { logger } from '@/utils/logger';

interface SecurityMetrics {
  totalScans: number;
  threatsDetected: number;
  filesQuarantined: number;
  cleanFiles: number;
  scanDuration: number;
  lastScanTime: Date | null;
  threatsByType: Record<string, number>;
  threatsBySeverity: Record<string, number>;
  dailyActivity: Array<{
    date: string;
    scans: number;
    threats: number;
    quarantined: number;
  }>;
  systemHealth: {
    workerStatus: 'healthy' | 'degraded' | 'offline';
    memoryUsage: number;
    scannerUptime: number;
    errorRate: number;
  };
}

interface SecurityDashboardProps {
  className?: string;
}

const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  className = ''
}) => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [isLoading, setIsLoading] = useState(true);
  
  const { settings } = useSecuritySettings();
  const { quarantinedFiles } = useQuarantine();
  const { notifications } = useSecurityNotifications();

  // Load security metrics from localStorage and calculate analytics
  useEffect(() => {
    const loadMetrics = () => {
      try {
        setIsLoading(true);
        
        // Get stored security logs
        const securityLogs = JSON.parse(localStorage.getItem('security_logs') || '[]');
        const scanHistory = JSON.parse(localStorage.getItem('scan_history') || '[]');
        
        // Calculate metrics based on time range
        const now = new Date();
        const timeRangeMs = {
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000
        }[timeRange];
        
        const cutoffDate = new Date(now.getTime() - timeRangeMs);
        
        // Filter data by time range
        const recentLogs = securityLogs.filter((log: SecurityLog) => 
          new Date(log.timestamp) >= cutoffDate
        );
        const recentScans = scanHistory.filter((scan: SecurityScan) => 
          new Date(scan.timestamp) >= cutoffDate
        );
        
        // Calculate metrics
        const totalScans = recentScans.length;
        const threatsDetected = recentLogs.filter((log: SecurityLog) => 
          log.eventType === 'threat_detection'
        ).length;
        const filesQuarantined = quarantinedFiles.filter(file => 
          new Date(file.quarantined_at) >= cutoffDate
        ).length;
        const cleanFiles = totalScans - threatsDetected;
        
        // Calculate average scan duration
        const scanDurations = recentScans
          .map((scan: SecurityScan) => scan.duration)
          .filter((duration: number) => duration > 0);
        const avgScanDuration = scanDurations.length > 0 
          ? scanDurations.reduce((a: number, b: number) => a + b, 0) / scanDurations.length 
          : 0;

        // Get last scan time
        const lastScan = recentScans.length > 0 ? 
          new Date(Math.max(...recentScans.map((s: SecurityScan) => new Date(s.timestamp).getTime()))) : 
          null;

        // Threat analysis
        const threatsByType: Record<string, number> = {};
        const threatsBySeverity: Record<string, number> = {};
        
        recentLogs
          .filter((log: SecurityLog) => log.eventType === 'threat_detection')
          .forEach((log: SecurityLog) => {
            const details = log.details || {};
            if (details.threatType) {
              threatsByType[details.threatType] = (threatsByType[details.threatType] || 0) + 1;
            }
            if (details.severity) {
              threatsBySeverity[details.severity] = (threatsBySeverity[details.severity] || 0) + 1;
            }
          });

        // Daily activity data
        const dailyActivity = [];
        const daysToShow = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
        
        for (let i = daysToShow - 1; i >= 0; i--) {
          const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
          const dateStr = date.toISOString().split('T')[0];
          
          const dayScans = recentScans.filter((scan: SecurityScan) => 
            scan.timestamp.startsWith(dateStr)
          ).length;
          
          const dayThreats = recentLogs.filter((log: SecurityLog) => 
            log.timestamp.startsWith(dateStr) && log.eventType === 'threat_detection'
          ).length;
          
          const dayQuarantined = quarantinedFiles.filter(file => 
            file.quarantined_at.startsWith(dateStr)
          ).length;
          
          dailyActivity.push({
            date: dateStr,
            scans: dayScans,
            threats: dayThreats,
            quarantined: dayQuarantined
          });
        }

        // System health simulation (in real app, this would come from actual monitoring)
        const errorLogs = recentLogs.filter((log: SecurityLog) => log.level === 'error');
        const errorRate = totalScans > 0 ? (errorLogs.length / totalScans) * 100 : 0;
        
        const calculatedMetrics: SecurityMetrics = {
          totalScans,
          threatsDetected,
          filesQuarantined,
          cleanFiles,
          scanDuration: avgScanDuration,
          lastScanTime: lastScan,
          threatsByType,
          threatsBySeverity,
          dailyActivity,
          systemHealth: {
            workerStatus: errorRate > 10 ? 'degraded' : errorRate > 25 ? 'offline' : 'healthy',
            memoryUsage: Math.min(95, 30 + (totalScans / 100) * 10), // Simulated
            scannerUptime: Math.max(85, 100 - errorRate),
            errorRate
          }
        };
        
        setMetrics(calculatedMetrics);
      } catch (error) {
        logger.error('Failed to load security metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, [timeRange, quarantinedFiles]);

  // Calculate security score
  const securityScore = useMemo(() => {
    if (!metrics) return 0;
    
    const totalFiles = metrics.totalScans;
    if (totalFiles === 0) return 100;
    
    const threatRate = (metrics.threatsDetected / totalFiles) * 100;
    const baseScore = Math.max(0, 100 - threatRate * 2);
    
    // Adjust based on system health
    const healthMultiplier = metrics.systemHealth.workerStatus === 'healthy' ? 1 : 
                           metrics.systemHealth.workerStatus === 'degraded' ? 0.9 : 0.7;
    
    return Math.round(baseScore * healthMultiplier);
  }, [metrics]);

  // Color schemes for charts
  const threatSeverityColors = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6'
  };

  const pieChartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (isLoading) {
    return (
      <div className={cn("p-6", className)}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={cn("p-6 text-center", className)}>
        <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Security Data Available</h3>
        <p className="text-gray-500">Start using the security system to see analytics here.</p>
      </div>
    );
  }

  return (
    <div className={cn("p-6 space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Security Dashboard</h2>
          <p className="text-gray-500">System security overview and analytics</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                  timeRange === range 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
          
          {/* Security Score */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Security Score:</span>
            <Badge 
              className={cn(
                "font-bold",
                securityScore >= 90 ? "bg-green-100 text-green-800" :
                securityScore >= 70 ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              )}
            >
              {securityScore}/100
            </Badge>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <Scan className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalScans.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {metrics.scanDuration.toFixed(0)}ms per scan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threats Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.threatsDetected}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalScans > 0 ? ((metrics.threatsDetected / metrics.totalScans) * 100).toFixed(1) : 0}% threat rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files Quarantined</CardTitle>
            <FileX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.filesQuarantined}</div>
            <p className="text-xs text-muted-foreground">
              {quarantinedFiles.length} total in quarantine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clean Files</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.cleanFiles}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalScans > 0 ? ((metrics.cleanFiles / metrics.totalScans) * 100).toFixed(1) : 100}% clean rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>System Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Scanner Status</span>
                <Badge 
                  className={cn(
                    metrics.systemHealth.workerStatus === 'healthy' ? 'bg-green-100 text-green-800' :
                    metrics.systemHealth.workerStatus === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  )}
                >
                  {metrics.systemHealth.workerStatus.toUpperCase()}
                </Badge>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Memory Usage</span>
                <span className="text-sm text-gray-600">{metrics.systemHealth.memoryUsage.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.systemHealth.memoryUsage} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Uptime</span>
                <span className="text-sm text-gray-600">{metrics.systemHealth.scannerUptime.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.systemHealth.scannerUptime} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Error Rate</span>
                <span className="text-sm text-gray-600">{metrics.systemHealth.errorRate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.systemHealth.errorRate} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
          <TabsTrigger value="threats">Threat Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Activity Over Time</CardTitle>
              <CardDescription>Daily scans, threats detected, and files quarantined</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="scans" stroke="#3b82f6" name="Scans" strokeWidth={2} />
                    <Line type="monotone" dataKey="threats" stroke="#f97316" name="Threats" strokeWidth={2} />
                    <Line type="monotone" dataKey="quarantined" stroke="#ef4444" name="Quarantined" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Threats by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(metrics.threatsBySeverity).map(([severity, count]) => ({
                          name: severity,
                          value: count,
                          fill: threatSeverityColors[severity as keyof typeof threatSeverityColors] || '#6b7280'
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Threats by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(metrics.threatsByType).map(([type, count]) => ({
                      type,
                      count
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Trends</CardTitle>
              <CardDescription>Cumulative security metrics over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.dailyActivity.map((day, index) => ({
                    ...day,
                    cumulativeScans: metrics.dailyActivity.slice(0, index + 1).reduce((sum, d) => sum + d.scans, 0),
                    cumulativeThreats: metrics.dailyActivity.slice(0, index + 1).reduce((sum, d) => sum + d.threats, 0)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="cumulativeScans" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Total Scans" />
                    <Area type="monotone" dataKey="cumulativeThreats" stackId="2" stroke="#f97316" fill="#f97316" fillOpacity={0.6} name="Total Threats" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View Security Logs
            </Button>
            <Button variant="outline" size="sm">
              <Database className="w-4 h-4 mr-2" />
              Manage Quarantine
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" size="sm">
              <Shield className="w-4 h-4 mr-2" />
              Security Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;