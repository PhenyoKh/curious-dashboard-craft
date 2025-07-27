/**
 * Calendar Monitoring Dashboard
 * Admin component for monitoring calendar integration health and performance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RefreshCwIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  UsersIcon,
  CalendarIcon,
  BarChart3Icon
} from 'lucide-react';
import {
  performCalendarHealthCheck,
  getCalendarStats,
  generateCalendarReport,
  type HealthCheckResult
} from '@/utils/monitoring';

interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, HealthCheckResult>;
  lastChecked: Date;
}

interface IntegrationStats {
  totalIntegrations: number;
  activeIntegrations: number;
  syncErrors: number;
  lastSyncTime?: Date;
  syncSuccessRate: number;
  averageSyncDuration: number;
}

interface PerformanceReport {
  timeRange: string;
  totalOperations: number;
  successRate: number;
  averageResponseTime: number;
  errorBreakdown: Record<string, number>;
  performanceTrends: Array<{ timestamp: Date; successRate: number; avgDuration: number }>;
}

export const CalendarMonitoringDashboard: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week'>('day');

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      
      const [healthResults, statsResults, reportResults] = await Promise.allSettled([
        performCalendarHealthCheck(),
        getCalendarStats(),
        generateCalendarReport(timeRange)
      ]);

      // Process health check results
      if (healthResults.status === 'fulfilled') {
        const services = healthResults.value;
        const healthyServices = Object.values(services).filter(s => s.status === 'healthy').length;
        const totalServices = Object.values(services).length;
        
        let overall: HealthStatus['overall'] = 'healthy';
        if (healthyServices === 0) {
          overall = 'unhealthy';
        } else if (healthyServices < totalServices) {
          overall = 'degraded';
        }

        setHealthStatus({
          overall,
          services,
          lastChecked: new Date()
        });
      }

      // Process stats results
      if (statsResults.status === 'fulfilled') {
        setStats(statsResults.value);
      }

      // Process report results
      if (reportResults.status === 'fulfilled') {
        setReport(reportResults.value);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <RefreshCwIcon className="h-4 w-4 animate-spin" />
              <span>Loading monitoring dashboard...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar Monitoring</h2>
          <p className="text-gray-600">Monitor calendar integration health and performance</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <RefreshCwIcon className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCwIcon className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Overall Health Status */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                {getStatusIcon(healthStatus.overall)}
                <span>System Health</span>
              </CardTitle>
              <Badge className={getStatusColor(healthStatus.overall)}>
                {healthStatus.overall.toUpperCase()}
              </Badge>
            </div>
            <CardDescription>
              Last checked: {formatTimeAgo(healthStatus.lastChecked)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(healthStatus.services).map(([serviceName, service]) => (
                <div key={serviceName} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">
                      {serviceName.replace('_', ' ')}
                    </span>
                    {getStatusIcon(service.status)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Response: {formatDuration(service.responseTime)}
                  </div>
                  {service.error && (
                    <div className="text-xs text-red-500 mt-1 truncate" title={service.error}>
                      {service.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalIntegrations}</div>
                  <div className="text-sm text-gray-600">Total Integrations</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <UsersIcon className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.activeIntegrations}</div>
                  <div className="text-sm text-gray-600">Active Syncs</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUpIcon className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.syncSuccessRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{formatDuration(stats.averageSyncDuration)}</div>
                  <div className="text-sm text-gray-600">Avg Sync Time</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics */}
      <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as 'hour' | 'day' | 'week')}>
        <TabsList>
          <TabsTrigger value="hour">Last Hour</TabsTrigger>
          <TabsTrigger value="day">Last 24 Hours</TabsTrigger>
          <TabsTrigger value="week">Last Week</TabsTrigger>
        </TabsList>

        <TabsContent value={timeRange} className="space-y-4">
          {report && (
            <>
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Operations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{report.totalOperations}</div>
                    <div className="text-sm text-gray-600">Total operations in {timeRange}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{report.successRate.toFixed(1)}%</div>
                    <Progress value={report.successRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Response Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatDuration(report.averageResponseTime)}</div>
                    <div className="text-sm text-gray-600">Average response time</div>
                  </CardContent>
                </Card>
              </div>

              {/* Error Breakdown */}
              {Object.keys(report.errorBreakdown).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Error Breakdown</CardTitle>
                    <CardDescription>Most common error types in the selected time range</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(report.errorBreakdown)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([errorType, count]) => (
                          <div key={errorType} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{errorType}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">{count} occurrences</span>
                              <Badge variant="destructive">{count}</Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <BarChart3Icon className="h-5 w-5" />
                    <span>Performance Trends</span>
                  </CardTitle>
                  <CardDescription>Success rate and response time trends over {timeRange}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.performanceTrends.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {report.performanceTrends.slice(-12).map((trend, index) => (
                          <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                            <span className="text-sm font-medium">
                              {trend.timestamp.toLocaleTimeString()}
                            </span>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <span className="text-sm">Success:</span>
                                <span className={`text-sm font-medium ${
                                  trend.successRate >= 95 ? 'text-green-600' : 
                                  trend.successRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {trend.successRate.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-sm">Avg:</span>
                                <span className="text-sm font-medium text-blue-600">
                                  {formatDuration(trend.avgDuration)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No performance data available for the selected time range
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Alerts and Warnings */}
      {stats && stats.syncErrors > 0 && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            {stats.syncErrors} calendar integration{stats.syncErrors > 1 ? 's have' : ' has'} sync errors that require attention.
          </AlertDescription>
        </Alert>
      )}

      {report && report.successRate < 80 && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            Calendar sync success rate ({report.successRate.toFixed(1)}%) is below the recommended threshold of 80%.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};