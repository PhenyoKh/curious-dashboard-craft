/**
 * Advanced Assignments Dashboard
 * 
 * Comprehensive dashboard integrating all assignment management features:
 * - Progress tracking and analytics
 * - Calendar integration and sync
 * - Time management and scheduling
 * - Productivity insights
 * - Smart filtering and views
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, List, BarChart3, Clock, Target, Brain, 
  Filter, Search, Plus, Settings, RefreshCw, 
  AlertTriangle, CheckCircle, Circle, ArrowUp, ArrowDown,
  TrendingUp, BookOpen, FileText, Users, Zap, Edit, Trash2, MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Import the Enhanced Assignment Modal
import { SimpleAssignmentModal } from './SimpleAssignmentModal';

// Import our advanced services
import { assignmentsService, getAssignmentsWithDetails, deleteAssignment, updateAssignment } from '@/services/supabaseService';

import type { 
  EnhancedAssignment,
  AssignmentViewMode,
  AssignmentFilters,
  AssignmentSortConfig,
  AssignmentProgressMetrics,
  ProgressInsight,
  SchedulingRecommendation,
  WorkloadAnalysis,
  TimeManagementInsights
} from '@/types/assignments';

interface DashboardStats {
  total_assignments: number;
  completed_count: number;
  overdue_count: number;
  in_progress_count: number;
  completion_rate: number;
  avg_progress: number;
  upcoming_deadlines: number;
  productivity_score: number;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
  variant?: 'default' | 'destructive' | 'secondary';
}

export const AdvancedAssignmentsDashboard: React.FC = () => {
  // State management
  const [assignments, setAssignments] = useState<EnhancedAssignment[]>([]);
  const [viewMode, setViewMode] = useState<AssignmentViewMode>('list');
  const [filters, setFilters] = useState<AssignmentFilters>({});
  const [sortConfig, setSortConfig] = useState<AssignmentSortConfig>({
    field: 'due_date',
    direction: 'asc'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<EnhancedAssignment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Analytics and insights state
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [progressMetrics, setProgressMetrics] = useState<Map<string, AssignmentProgressMetrics>>(new Map());
  const [insights, setInsights] = useState<ProgressInsight[]>([]);
  const [recommendations, setRecommendations] = useState<SchedulingRecommendation[]>([]);
  const [workloadAnalysis, setWorkloadAnalysis] = useState<WorkloadAnalysis | null>(null);
  const [timeInsights, setTimeInsights] = useState<TimeManagementInsights | null>(null);

  // Load all dashboard data - defined before useEffect
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load assignments using the available function
      const assignmentsData = await getAssignmentsWithDetails();
      setAssignments(assignmentsData as EnhancedAssignment[]);

      // Load basic stats from the assignments data
      await loadDashboardStats(assignmentsData as EnhancedAssignment[]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Filter and sort assignments
  const filteredAndSortedAssignments = useMemo(() => {
    let filtered = assignments;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(assignment =>
        assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.subject_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply other filters
    if (filters.status?.length) {
      filtered = filtered.filter(a => filters.status!.includes(a.status));
    }
    if (filters.type?.length) {
      filtered = filtered.filter(a => filters.type!.includes(a.assignment_type));
    }
    if (filters.priority?.length) {
      filtered = filtered.filter(a => filters.priority!.includes(a.priority));
    }
    if (filters.urgency_level?.length) {
      filtered = filtered.filter(a => filters.urgency_level!.includes(a.urgency_level));
    }
    if (filters.subject_id?.length) {
      filtered = filtered.filter(a => filters.subject_id!.includes(a.subject_id));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date = a[sortConfig.field as keyof EnhancedAssignment] as string | number | Date;
      let bValue: string | number | Date = b[sortConfig.field as keyof EnhancedAssignment] as string | number | Date;

      if (sortConfig.field === 'due_date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [assignments, searchQuery, filters, sortConfig]);

  const loadDashboardStats = async (assignmentsData: EnhancedAssignment[]) => {
    const total = assignmentsData.length;
    const completed = assignmentsData.filter(a => a.status === 'Completed').length;
    const overdue = assignmentsData.filter(a => 
      new Date(a.due_date) < new Date() && a.status !== 'Completed'
    ).length;
    const inProgress = assignmentsData.filter(a => 
      a.status === 'In Progress' || a.status === 'On Track'
    ).length;
    
    const avgProgress = assignmentsData.reduce((sum, a) => 
      sum + (a.progress_percentage || 0), 0
    ) / total;

    const upcomingDeadlines = assignmentsData.filter(a => {
      const dueDate = new Date(a.due_date);
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      return dueDate <= threeDaysFromNow && a.status !== 'Completed';
    }).length;

    setDashboardStats({
      total_assignments: total,
      completed_count: completed,
      overdue_count: overdue,
      in_progress_count: inProgress,
      completion_rate: total > 0 ? completed / total : 0,
      avg_progress: avgProgress,
      upcoming_deadlines: upcomingDeadlines,
      productivity_score: 0.75 // This would be calculated from actual data
    });
  };

  // Temporarily disabled advanced analytics functions
  const loadInsights = async (userId: string) => {
    // const allInsights: ProgressInsight[] = [];
    // setInsights(allInsights);
  };

  const loadRecommendations = async (userId: string) => {
    // const recs = [];
    // setRecommendations(recs);
  };

  const loadWorkloadAnalysis = async (userId: string) => {
    // const analysis = null;
    // setWorkloadAnalysis(analysis);
  };

  const loadTimeInsights = async (userId: string) => {
    // const insights = null;
    // setTimeInsights(insights);
  };

  // Assignment action handlers
  const handleEditAssignment = (assignment: EnhancedAssignment) => {
    setEditingAssignment(assignment);
    setShowEditModal(true);
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      try {
        await deleteAssignment(assignmentId);
        // Refresh the data
        await loadDashboardData();
      } catch (error) {
        console.error('Error deleting assignment:', error);
        alert('Failed to delete assignment. Please try again.');
      }
    }
  };

  const handleStatusChange = async (assignmentId: string, newStatus: string) => {
    try {
      await updateAssignment(assignmentId, { status: newStatus });
      // Refresh the data
      await loadDashboardData();
    } catch (error) {
      console.error('Error updating assignment status:', error);
      alert('Failed to update assignment status. Please try again.');
    }
  };

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'add-assignment',
      label: 'Add Assignment',
      icon: <Plus className="w-4 h-4" />,
      action: () => setShowAddModal(true)
    },
    {
      id: 'refresh-data',
      label: 'Refresh Data',
      icon: <RefreshCw className="w-4 h-4" />,
      action: async () => {
        loadDashboardData();
      }
    }
  ];

  // Render priority badge
  const renderPriorityBadge = (priority: string) => {
    const colors = {
      'High': 'bg-red-100 text-red-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-green-100 text-green-800'
    };
    return (
      <Badge className={`${colors[priority as keyof typeof colors]} text-xs`}>
        {priority}
      </Badge>
    );
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    const colors = {
      'Completed': 'bg-green-100 text-green-800',
      'On Track': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Overdue': 'bg-red-100 text-red-800',
      'Not Started': 'bg-gray-100 text-gray-800'
    };
    return (
      <Badge className={`${colors[status as keyof typeof colors]} text-xs`}>
        {status}
      </Badge>
    );
  };

  // Render urgency indicator
  const renderUrgencyIndicator = (assignment: EnhancedAssignment) => {
    // Simplified urgency indicator based on due date
    const dueDate = new Date(assignment.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0 && assignment.status !== 'Completed') {
      return <AlertTriangle className="w-4 h-4 text-red-500" title="Overdue" />;
    } else if (daysUntilDue <= 3 && assignment.status !== 'Completed') {
      return <AlertTriangle className="w-4 h-4 text-orange-500" title="Due soon" />;
    }
    return null;
  };

  // Render assignment card
  const renderAssignmentCard = (assignment: EnhancedAssignment) => {
    const metrics = progressMetrics.get(assignment.id);
    const daysUntilDue = assignment.days_until_due || 0;
    
    return (
      <Card 
        key={assignment.id} 
        className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-blue-500"
        onClick={() => setSelectedAssignment(assignment.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-foreground line-clamp-2 mb-2">
                {assignment.title}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="w-4 h-4" />
                <span>{assignment.subject_name || 'No Subject'}</span>
                {assignment.assignment_type && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{assignment.assignment_type}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {renderUrgencyIndicator(assignment)}
              {renderPriorityBadge(assignment.priority)}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Progress bar */}
            {metrics && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{metrics.progress_percentage}%</span>
                </div>
                <Progress value={metrics.progress_percentage} className="h-2" />
              </div>
            )}

            {/* Status and due date */}
            <div className="flex items-center justify-between">
              {renderStatusBadge(assignment.status)}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">
                  {new Date(assignment.due_date).toLocaleDateString()}
                </p>
                <p className={`text-xs ${
                  daysUntilDue < 0 ? 'text-red-600' : 
                  daysUntilDue <= 3 ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {daysUntilDue < 0 
                    ? `${Math.abs(daysUntilDue)} days overdue`
                    : daysUntilDue === 0 
                    ? 'Due today'
                    : `${daysUntilDue} days left`
                  }
                </p>
              </div>
            </div>

            {/* Metrics */}
            {metrics && (
              <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Time Spent</p>
                  <p className="text-sm font-medium">
                    {Math.round(metrics.time_spent_minutes / 60)}h
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Completion</p>
                  <p className="text-sm font-medium">
                    {Math.round(metrics.completion_probability * 100)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Pace</p>
                  <p className={`text-sm font-medium ${
                    metrics.pace_rating === 'ahead' ? 'text-green-600' :
                    metrics.pace_rating === 'on_track' ? 'text-blue-600' :
                    metrics.pace_rating === 'behind' ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {metrics.pace_rating.replace('_', ' ')}
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                {/* Status Dropdown */}
                <Select
                  value={assignment.status}
                  onValueChange={(newStatus) => handleStatusChange(assignment.id, newStatus)}
                >
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="On Track">On Track</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Edit Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditAssignment(assignment);
                  }}
                  title="Edit assignment"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                
                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAssignment(assignment.id);
                  }}
                  title="Delete assignment"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render dashboard stats cards
  const renderStatsCards = () => {
    if (!dashboardStats) return null;

    const stats = [
      {
        title: 'Total Assignments',
        value: dashboardStats.total_assignments,
        icon: <FileText className="w-5 h-5" />,
        color: 'text-blue-600'
      },
      {
        title: 'Completion Rate',
        value: `${Math.round(dashboardStats.completion_rate * 100)}%`,
        icon: <CheckCircle className="w-5 h-5" />,
        color: 'text-green-600'
      },
      {
        title: 'Overdue',
        value: dashboardStats.overdue_count,
        icon: <AlertTriangle className="w-5 h-5" />,
        color: 'text-red-600'
      },
      {
        title: 'Upcoming Deadlines',
        value: dashboardStats.upcoming_deadlines,
        icon: <Clock className="w-5 h-5" />,
        color: 'text-orange-600'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Assignments Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Manage your assignments with intelligent insights and tracking
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant || 'outline'}
                  onClick={action.action}
                  className="relative"
                >
                  {action.icon}
                  <span className="ml-2 hidden sm:inline">{action.label}</span>
                  {action.badge && (
                    <Badge 
                      className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full"
                    >
                      {action.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          {renderStatsCards()}

          {/* Filters and Search */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search assignments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Analytics View Button */}
              <div className="flex items-center gap-4">
                <Button
                  variant={viewMode === 'analytics' ? 'default' : 'outline'}
                  onClick={() => setViewMode('analytics')}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </Button>

                {/* Filter Button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {/* Filter options would go here */}
                    <DropdownMenuItem>All Statuses</DropdownMenuItem>
                    <DropdownMenuItem>In Progress</DropdownMenuItem>
                    <DropdownMenuItem>Overdue</DropdownMenuItem>
                    <DropdownMenuItem>Completed</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as AssignmentViewMode)}>
          <TabsContent value="list" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedAssignments.map(renderAssignmentCard)}
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-gray-600">Calendar view coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Insights Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Smart Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.slice(0, 5).map((insight, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className={`p-1 rounded-full ${
                            insight.severity === 'critical' ? 'bg-red-100' :
                            insight.severity === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                          }`}>
                            {insight.severity === 'critical' ? (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            ) : insight.severity === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            ) : (
                              <TrendingUp className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{insight.message}</p>
                            <div className="mt-2 space-y-1">
                              {insight.action_items.slice(0, 2).map((action, idx) => (
                                <p key={idx} className="text-xs text-gray-600">• {action}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recommendations.slice(0, 5).map((rec, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium">{rec.recommendation}</h4>
                          <Badge variant={rec.impact_score > 0.7 ? 'default' : 'secondary'} className="text-xs">
                            {Math.round(rec.impact_score * 100)}% impact
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{rec.reasoning}</p>
                        <div className="space-y-1">
                          {rec.suggested_actions.slice(0, 2).map((action, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-medium">{action.action}:</span>
                              <span className="text-gray-600 ml-1">{action.expected_outcome}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Empty State */}
        {filteredAndSortedAssignments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No assignments found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'No assignments match the selected filters'}
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Assignment
            </Button>
          </div>
        )}
      </div>

      {/* Add Assignment Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
          </DialogHeader>
          <SimpleAssignmentModal 
            onClose={() => setShowAddModal(false)}
            onSave={() => {
              setShowAddModal(false);
              // Refresh the dashboard data
              loadDashboardData();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          <SimpleAssignmentModal 
            mode="edit"
            editingAssignment={editingAssignment}
            onClose={() => {
              setShowEditModal(false);
              setEditingAssignment(null);
            }}
            onSave={() => {
              setShowEditModal(false);
              setEditingAssignment(null);
              // Refresh the dashboard data
              loadDashboardData();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};