/**
 * Progress Tracking Components
 * 
 * Comprehensive set of components for tracking assignment progress:
 * - Real-time progress visualization
 * - Time tracking and analytics
 * - Productivity insights
 * - Status management
 * - Study session tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  PlayCircle, PauseCircle, StopCircle, Clock, Target, 
  TrendingUp, TrendingDown, BarChart3, PieChart, Calendar,
  CheckCircle2, Circle, AlertCircle, Timer, Zap,
  Brain, Trophy, Star, Flame, Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Import services
import { assignmentProgressTracker } from '@/services/assignmentProgressTracker';
import { studySessionsService } from '@/services/supabaseService';

import type { 
  EnhancedAssignment,
  AssignmentProgressMetrics,
  StudySession,
  StudySessionType,
  ProductivityRating,
  ProgressInsight
} from '@/types/assignments';

// Progress Card Component
export const AssignmentProgressCard: React.FC<{
  assignment: EnhancedAssignment;
  metrics?: AssignmentProgressMetrics;
  onProgressUpdate?: (progress: number) => void;
  onStatusChange?: (status: string) => void;
}> = ({ assignment, metrics, onProgressUpdate, onStatusChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localProgress, setLocalProgress] = useState(assignment.progress_percentage || 0);

  const handleProgressChange = (value: number[]) => {
    setLocalProgress(value[0]);
    onProgressUpdate?.(value[0]);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Completed': 'bg-green-100 text-green-800 border-green-200',
      'On Track': 'bg-blue-100 text-blue-800 border-blue-200',
      'In Progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Overdue': 'bg-red-100 text-red-800 border-red-200',
      'Not Started': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status as keyof typeof colors] || colors['Not Started'];
  };

  const getPaceIcon = (paceRating?: string) => {
    switch (paceRating) {
      case 'ahead': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'on_track': return <Target className="w-4 h-4 text-blue-600" />;
      case 'behind': return <TrendingDown className="w-4 h-4 text-orange-600" />;
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold line-clamp-2 mb-2">
              {assignment.title}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Due {new Date(assignment.due_date).toLocaleDateString()}</span>
              {assignment.days_until_due !== undefined && (
                <Badge variant="outline" className="text-xs">
                  {assignment.days_until_due < 0 
                    ? `${Math.abs(assignment.days_until_due)} days overdue`
                    : assignment.days_until_due === 0 
                    ? 'Due today'
                    : `${assignment.days_until_due} days left`
                  }
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {metrics && getPaceIcon(metrics.pace_rating)}
            <Badge className={getStatusColor(assignment.status)}>
              {assignment.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{localProgress}%</span>
            </div>
            <Progress value={localProgress} className="h-3" />
            <Slider
              value={[localProgress]}
              onValueChange={handleProgressChange}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Metrics Overview */}
          {metrics && (
            <div className="grid grid-cols-3 gap-4 pt-3 border-t">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center cursor-pointer">
                      <div className="flex items-center justify-center mb-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                      </div>
                      <p className="text-sm font-medium">
                        {Math.round(metrics.time_spent_minutes / 60)}h
                      </p>
                      <p className="text-xs text-gray-500">Spent</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{metrics.time_spent_minutes} minutes total</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center cursor-pointer">
                      <div className="flex items-center justify-center mb-1">
                        <Target className="w-4 h-4 text-gray-500" />
                      </div>
                      <p className="text-sm font-medium">
                        {Math.round(metrics.completion_probability * 100)}%
                      </p>
                      <p className="text-xs text-gray-500">Completion</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Probability of on-time completion</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center cursor-pointer">
                      <div className="flex items-center justify-center mb-1">
                        <Zap className="w-4 h-4 text-gray-500" />
                      </div>
                      <p className="text-sm font-medium">
                        {Math.round(metrics.productivity_score * 100)}%
                      </p>
                      <p className="text-xs text-gray-500">Productivity</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Average productivity score</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Expand/Collapse */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-xs"
          >
            {isExpanded ? 'Show Less' : 'Show More Details'}
          </Button>

          {/* Expanded Details */}
          {isExpanded && metrics && (
            <div className="space-y-3 pt-3 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Urgency Score</p>
                  <div className="flex items-center gap-2">
                    <Progress value={metrics.urgency_score * 100} className="flex-1 h-2" />
                    <span className="text-xs font-medium">
                      {Math.round(metrics.urgency_score * 100)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600">Time Remaining</p>
                  <p className="font-medium">
                    {Math.round(metrics.time_remaining_estimate / 60)}h
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Milestones</p>
                  <p className="font-medium">
                    {metrics.milestones_completed}/{metrics.milestones_total}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Last Activity</p>
                  <p className="font-medium text-xs">
                    {metrics.last_activity.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Study Session Timer Component
export const StudySessionTimer: React.FC<{
  assignmentId: string;
  onSessionComplete?: (session: StudySession) => void;
}> = ({ assignmentId, onSessionComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [sessionType, setSessionType] = useState<StudySessionType>('study');
  const [notes, setNotes] = useState('');
  const [productivityRating, setProductivityRating] = useState<ProductivityRating>(3);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    } else if (!isActive) {
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused]);

  const startTimer = () => {
    setIsActive(true);
    setIsPaused(false);
    setSessionStartTime(new Date());
  };

  const pauseTimer = () => {
    setIsPaused(!isPaused);
  };

  const stopTimer = async () => {
    setIsActive(false);
    setIsPaused(false);

    if (sessionStartTime && time > 60) { // Only save sessions longer than 1 minute
      try {
        const session = await studySessionsService.createStudySession({
          assignment_id: assignmentId,
          session_type: sessionType,
          start_time: sessionStartTime.toISOString(),
          end_time: new Date().toISOString(),
          actual_duration: time / 60, // Convert to minutes
          productivity_rating: productivityRating,
          notes: notes || undefined,
          user_id: 'current-user-id'
        });
        
        onSessionComplete?.(session);
      } catch (error) {
        console.error('Error saving study session:', error);
      }
    }

    // Reset timer
    setTime(0);
    setNotes('');
    setProductivityRating(3);
    setSessionStartTime(null);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProductivityColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="w-5 h-5" />
          Study Session Timer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timer Display */}
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-foreground mb-2">
              {formatTime(time)}
            </div>
            <div className="flex justify-center gap-2">
              {!isActive ? (
                <Button onClick={startTimer} className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4" />
                  Start Session
                </Button>
              ) : (
                <>
                  <Button onClick={pauseTimer} variant="outline" className="flex items-center gap-2">
                    <PauseCircle className="w-4 h-4" />
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button onClick={stopTimer} variant="destructive" className="flex items-center gap-2">
                    <StopCircle className="w-4 h-4" />
                    Stop & Save
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Session Configuration */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Session Type</label>
              <Select value={sessionType} onValueChange={(value) => setSessionType(value as StudySessionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="study">Study</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="writing">Writing</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="group_study">Group Study</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isActive && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Productivity Rating: {productivityRating}/5
                </label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[productivityRating]}
                    onValueChange={(value) => setProductivityRating(value[0] as ProductivityRating)}
                    max={5}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <span className={`text-sm font-medium ${getProductivityColor(productivityRating)}`}>
                    {productivityRating === 5 ? 'Excellent' :
                     productivityRating === 4 ? 'Good' :
                     productivityRating === 3 ? 'Average' :
                     productivityRating === 2 ? 'Below Average' : 'Poor'}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Session Notes</label>
              <Textarea
                placeholder="What did you work on? Any challenges or insights?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!isActive}
                className="min-h-[80px]"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Progress Analytics Component
export const ProgressAnalytics: React.FC<{
  assignmentId: string;
  studySessions?: StudySession[];
}> = ({ assignmentId, studySessions = [] }) => {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      // This would load analytics data from our services
      // For now, we'll generate mock data
      const data = {
        totalStudyTime: studySessions.reduce((sum, session) => 
          sum + ((session.actual_duration || session.planned_duration) || 0), 0
        ),
        averageProductivity: studySessions.length > 0 
          ? studySessions.reduce((sum, session) => sum + (session.productivity_rating || 3), 0) / studySessions.length
          : 0,
        sessionsCount: studySessions.length,
        bestProductivityHour: 14, // 2 PM
        productivityTrend: 'improving',
        focusStreak: 5
      };
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [studySessions]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsData) return null;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Target className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Progress Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Study Time */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-900">
              {Math.round(analyticsData.totalStudyTime / 60)}h
            </p>
            <p className="text-sm text-blue-700">Total Time</p>
          </div>

          {/* Average Productivity */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Zap className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-900">
              {analyticsData.averageProductivity.toFixed(1)}
            </p>
            <p className="text-sm text-green-700">Avg Productivity</p>
          </div>

          {/* Sessions Count */}
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Calendar className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-900">
              {analyticsData.sessionsCount}
            </p>
            <p className="text-sm text-purple-700">Study Sessions</p>
          </div>

          {/* Focus Streak */}
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <Flame className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-900">
              {analyticsData.focusStreak}
            </p>
            <p className="text-sm text-orange-700">Day Streak</p>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Insights
          </h4>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {getTrendIcon(analyticsData.productivityTrend)}
              <div className="flex-1">
                <p className="text-sm font-medium">Productivity is {analyticsData.productivityTrend}</p>
                <p className="text-xs text-gray-600">
                  Your focus has been getting better over recent sessions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Best productivity at {analyticsData.bestProductivityHour}:00
                </p>
                <p className="text-xs text-gray-600">
                  Consider scheduling more sessions during this time
                </p>
              </div>
            </div>

            {analyticsData.totalStudyTime > 300 && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Trophy className="w-4 h-4 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Great progress!</p>
                  <p className="text-xs text-green-700">
                    You've invested significant time in this assignment
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Progress Insights Panel
export const ProgressInsightsPanel: React.FC<{
  insights: ProgressInsight[];
  onInsightDismiss?: (insightId: string) => void;
}> = ({ insights, onInsightDismiss }) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default: return <TrendingUp className="w-4 h-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  if (insights.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No insights available yet</p>
          <p className="text-sm text-gray-500">
            Complete more study sessions to get personalized insights
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Smart Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-1">
                  {getSeverityIcon(insight.severity)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">{insight.message}</p>
                  <div className="space-y-1">
                    {insight.action_items.slice(0, 3).map((action, idx) => (
                      <p key={idx} className="text-xs text-gray-600">
                        • {action}
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(insight.confidence * 100)}% confidence
                      </Badge>
                      <span className="text-xs text-gray-500 capitalize">
                        {insight.type.replace('_', ' ')}
                      </span>
                    </div>
                    {onInsightDismiss && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onInsightDismiss(insight.assignment_id)}
                        className="text-xs p-1 h-6"
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};