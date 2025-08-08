/**
 * Assignment Progress Tracker
 * 
 * Intelligent system for tracking assignment status, progress, and providing
 * automated insights for better academic time management.
 */

import { assignmentsService, studySessionsService, subjectsService } from './supabaseService';
import type { 
  Assignment,
  EnhancedAssignment,
  AssignmentStatus,
  UrgencyLevel,
  CompletionStatus,
  StudySession,
  Priority,
  AssignmentRecommendation,
  TimeManagementInsights
} from '../types/assignments';

// Progress tracking configuration
export interface ProgressTrackingConfig {
  auto_status_updates: boolean;
  urgency_calculation_method: 'simple' | 'weighted' | 'ml_based';
  progress_estimation_source: 'manual' | 'time_based' | 'milestone_based' | 'hybrid';
  reminder_frequency: 'daily' | 'bi_daily' | 'weekly';
  productivity_tracking_enabled: boolean;
}

// Progress insight data types
export interface CompletionPredictionData {
  predicted_completion_date: Date;
  completion_probability: number;
  factors: string[];
}

export interface TimeWarningData {
  days_remaining: number;
  hours_required: number;
  risk_level: 'low' | 'medium' | 'high';
}

export interface ProductivityTrendData {
  trend_direction: 'up' | 'down' | 'stable';
  percentage_change: number;
  period_days: number;
}

export interface RecommendationData {
  recommended_actions: string[];
  estimated_impact: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export type ProgressInsightData = 
  | CompletionPredictionData 
  | TimeWarningData 
  | ProductivityTrendData 
  | RecommendationData;

// Progress insight types
export interface ProgressInsight {
  type: 'completion_prediction' | 'time_warning' | 'productivity_trend' | 'recommendation';
  assignment_id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data: ProgressInsightData;
  action_items: string[];
  confidence: number;
  expires_at?: Date;
}

// Assignment progress metrics
export interface AssignmentProgressMetrics {
  assignment_id: string;
  current_status: AssignmentStatus;
  progress_percentage: number;
  time_spent_minutes: number;
  time_remaining_estimate: number;
  urgency_score: number;
  completion_probability: number;
  productivity_score: number;
  last_activity: Date;
  milestones_completed: number;
  milestones_total: number;
  pace_rating: 'ahead' | 'on_track' | 'behind' | 'critical';
}

// Study pattern analysis
export interface StudyPattern {
  user_id: string;
  preferred_study_hours: number[];
  average_session_length: number;
  productivity_by_hour: Record<number, number>;
  break_frequency: number;
  focus_duration_trend: 'improving' | 'stable' | 'declining';
  subject_preferences: Array<{
    subject_id: string;
    efficiency_score: number;
    preferred_time_slots: number[];
  }>;
}

// Workload analysis
export interface WorkloadAnalysis {
  total_assignments: number;
  overdue_count: number;
  due_this_week: number;
  due_next_week: number;
  high_priority_count: number;
  estimated_weekly_hours: number;
  workload_level: 'light' | 'moderate' | 'heavy' | 'overwhelming';
  peak_days: Date[];
  recommendations: WorkloadRecommendation[];
}

export interface WorkloadRecommendation {
  type: 'redistribute' | 'extend_deadline' | 'seek_help' | 'prioritize' | 'break_down';
  message: string;
  affected_assignments: string[];
  estimated_benefit: string;
}

export class AssignmentProgressTracker {
  private config: ProgressTrackingConfig;
  private progressCache: Map<string, AssignmentProgressMetrics> = new Map();
  private insightCache: Map<string, ProgressInsight[]> = new Map();

  constructor(config?: Partial<ProgressTrackingConfig>) {
    this.config = {
      auto_status_updates: true,
      urgency_calculation_method: 'weighted',
      progress_estimation_source: 'hybrid',
      reminder_frequency: 'daily',
      productivity_tracking_enabled: true,
      ...config
    };
  }

  /**
   * Calculate comprehensive progress metrics for an assignment
   */
  async calculateProgressMetrics(assignmentId: string): Promise<AssignmentProgressMetrics> {
    const assignment = await assignmentsService.getAssignmentById(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    // Get study sessions for time tracking
    const studySessions = await studySessionsService.getStudySessionsByAssignment(assignmentId);
    const totalTimeSpent = studySessions.reduce((sum, session) => 
      sum + (session.actual_duration || session.planned_duration || 0), 0
    );

    // Calculate urgency score
    const urgencyScore = this.calculateUrgencyScore(assignment);
    
    // Estimate remaining time
    const timeRemainingEstimate = this.estimateRemainingTime(assignment, totalTimeSpent);
    
    // Calculate completion probability
    const completionProbability = this.calculateCompletionProbability(assignment, totalTimeSpent);
    
    // Calculate productivity score
    const productivityScore = await this.calculateProductivityScore(assignmentId, studySessions);
    
    // Determine pace rating
    const paceRating = this.calculatePaceRating(assignment, totalTimeSpent, timeRemainingEstimate);

    const metrics: AssignmentProgressMetrics = {
      assignment_id: assignmentId,
      current_status: assignment.status as AssignmentStatus,
      progress_percentage: assignment.progress_percentage || 0,
      time_spent_minutes: totalTimeSpent,
      time_remaining_estimate: timeRemainingEstimate,
      urgency_score: urgencyScore,
      completion_probability: completionProbability,
      productivity_score: productivityScore,
      last_activity: studySessions.length > 0 
        ? new Date(Math.max(...studySessions.map(s => new Date(s.created_at || '').getTime())))
        : new Date(assignment.created_at),
      milestones_completed: this.countCompletedMilestones(assignment),
      milestones_total: this.countTotalMilestones(assignment),
      pace_rating: paceRating
    };

    // Cache the metrics
    this.progressCache.set(assignmentId, metrics);

    return metrics;
  }

  /**
   * Automatically update assignment status based on progress and activity
   */
  async updateAssignmentStatus(assignmentId: string): Promise<AssignmentStatus> {
    if (!this.config.auto_status_updates) {
      const assignment = await assignmentsService.getAssignmentById(assignmentId);
      return assignment?.status as AssignmentStatus || 'Not Started';
    }

    const metrics = await this.calculateProgressMetrics(assignmentId);
    const assignment = await assignmentsService.getAssignmentById(assignmentId);
    
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    let newStatus: AssignmentStatus = assignment.status as AssignmentStatus;
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const isOverdue = now > dueDate;

    // Status determination logic
    if (metrics.progress_percentage === 100) {
      newStatus = 'Completed';
    } else if (isOverdue && metrics.progress_percentage < 100) {
      newStatus = 'Overdue';
    } else if (metrics.progress_percentage > 0 && metrics.progress_percentage < 100) {
      if (metrics.pace_rating === 'on_track' || metrics.pace_rating === 'ahead') {
        newStatus = 'On Track';
      } else {
        newStatus = 'In Progress';
      }
    } else if (metrics.time_spent_minutes > 0) {
      newStatus = 'In Progress';
    } else if (metrics.urgency_score > 0.8) {
      newStatus = 'To Do';
    }

    // Update status if changed
    if (newStatus !== assignment.status) {
      await assignmentsService.updateAssignment(assignmentId, {
        status: newStatus,
        updated_at: new Date().toISOString()
      }, assignment.user_id);
    }

    return newStatus;
  }

  /**
   * Generate insights and recommendations for an assignment
   */
  async generateProgressInsights(assignmentId: string): Promise<ProgressInsight[]> {
    const metrics = await this.calculateProgressMetrics(assignmentId);
    const assignment = await assignmentsService.getAssignmentById(assignmentId);
    
    if (!assignment) {
      return [];
    }

    const insights: ProgressInsight[] = [];
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Time warning insights
    if (hoursUntilDue <= 24 && metrics.progress_percentage < 80) {
      insights.push({
        type: 'time_warning',
        assignment_id: assignmentId,
        severity: 'critical',
        message: 'Assignment due within 24 hours with less than 80% completion',
        data: { hours_remaining: hoursUntilDue, progress: metrics.progress_percentage },
        action_items: [
          'Focus exclusively on this assignment',
          'Consider requesting an extension',
          'Break down remaining work into 2-hour chunks'
        ],
        confidence: 0.95
      });
    }

    // Productivity trend insights
    if (metrics.productivity_score < 0.6) {
      insights.push({
        type: 'productivity_trend',
        assignment_id: assignmentId,
        severity: 'warning',
        message: 'Low productivity detected on this assignment',
        data: { productivity_score: metrics.productivity_score },
        action_items: [
          'Consider changing study environment',
          'Take more frequent breaks',
          'Try different study techniques',
          'Identify and eliminate distractions'
        ],
        confidence: 0.8
      });
    }

    // Completion prediction insights
    if (metrics.completion_probability < 0.7 && hoursUntilDue > 0) {
      insights.push({
        type: 'completion_prediction',
        assignment_id: assignmentId,
        severity: 'warning',
        message: 'Low probability of on-time completion',
        data: { 
          completion_probability: metrics.completion_probability,
          estimated_time_needed: metrics.time_remaining_estimate,
          time_available: hoursUntilDue * 60
        },
        action_items: [
          'Increase daily study time allocation',
          'Simplify assignment scope if possible',
          'Seek help from instructor or peers',
          'Consider submitting partial work on time'
        ],
        confidence: 0.75
      });
    }

    // Pace insights
    if (metrics.pace_rating === 'ahead') {
      insights.push({
        type: 'recommendation',
        assignment_id: assignmentId,
        severity: 'info',
        message: 'Great progress! You\'re ahead of schedule',
        data: { pace: metrics.pace_rating },
        action_items: [
          'Maintain current study habits',
          'Consider helping peers with similar assignments',
          'Use extra time to enhance quality'
        ],
        confidence: 0.9
      });
    }

    // Cache insights
    this.insightCache.set(assignmentId, insights);

    return insights;
  }

  /**
   * Analyze study patterns for a user
   */
  async analyzeStudyPatterns(userId: string): Promise<StudyPattern> {
    const studySessions = await studySessionsService.getUserStudySessions(userId);
    
    if (studySessions.length === 0) {
      return this.getDefaultStudyPattern(userId);
    }

    // Analyze preferred study hours
    const hourCounts = new Array(24).fill(0);
    const productivityByHour: Record<number, number> = {};
    let totalSessionLength = 0;
    let totalSessions = 0;

    studySessions.forEach(session => {
      const startHour = new Date(session.start_time).getHours();
      hourCounts[startHour]++;
      
      const duration = session.actual_duration || session.planned_duration || 0;
      totalSessionLength += duration;
      totalSessions++;

      // Track productivity by hour
      if (session.productivity_rating) {
        if (!productivityByHour[startHour]) {
          productivityByHour[startHour] = 0;
        }
        productivityByHour[startHour] += session.productivity_rating;
      }
    });

    // Find preferred hours (top 3 most frequent)
    const preferredHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);

    // Calculate average productivity by hour
    Object.keys(productivityByHour).forEach(hour => {
      const hourNum = parseInt(hour);
      const sessionsThisHour = hourCounts[hourNum];
      if (sessionsThisHour > 0) {
        productivityByHour[hourNum] /= sessionsThisHour;
      }
    });

    // Analyze focus duration trend
    const recentSessions = studySessions
      .slice(-10)
      .map(s => s.actual_duration || s.planned_duration || 0);
    
    const focusTrend = this.calculateTrend(recentSessions);

    return {
      user_id: userId,
      preferred_study_hours: preferredHours,
      average_session_length: totalSessions > 0 ? totalSessionLength / totalSessions : 60,
      productivity_by_hour: productivityByHour,
      break_frequency: this.calculateBreakFrequency(studySessions),
      focus_duration_trend: focusTrend,
      subject_preferences: await this.analyzeSubjectPreferences(userId, studySessions)
    };
  }

  /**
   * Analyze current workload and provide recommendations
   */
  async analyzeWorkload(userId: string): Promise<WorkloadAnalysis> {
    const assignments = await assignmentsService.getUserAssignments(userId);
    const now = new Date();
    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Categorize assignments
    const overdue = assignments.filter(a => new Date(a.due_date) < now && a.status !== 'Completed');
    const dueThisWeek = assignments.filter(a => {
      const due = new Date(a.due_date);
      return due >= now && due <= oneWeek && a.status !== 'Completed';
    });
    const dueNextWeek = assignments.filter(a => {
      const due = new Date(a.due_date);
      return due > oneWeek && due <= twoWeeks && a.status !== 'Completed';
    });
    const highPriority = assignments.filter(a => a.priority === 'High' && a.status !== 'Completed');

    // Estimate weekly hours
    const estimatedHours = assignments
      .filter(a => a.status !== 'Completed')
      .reduce((sum, assignment) => {
        const timeEstimate = assignment.study_time_estimate || 120; // default 2 hours
        const progress = assignment.progress_percentage || 0;
        const remaining = timeEstimate * ((100 - progress) / 100);
        return sum + remaining;
      }, 0) / 60; // convert to hours

    // Determine workload level
    let workloadLevel: 'light' | 'moderate' | 'heavy' | 'overwhelming';
    if (estimatedHours <= 10) workloadLevel = 'light';
    else if (estimatedHours <= 25) workloadLevel = 'moderate';
    else if (estimatedHours <= 40) workloadLevel = 'heavy';
    else workloadLevel = 'overwhelming';

    // Find peak days (days with multiple assignments due)
    const dueDates = assignments
      .filter(a => a.status !== 'Completed')
      .map(a => new Date(a.due_date).toDateString());
    
    const dateCount: Record<string, number> = {};
    dueDates.forEach(date => {
      dateCount[date] = (dateCount[date] || 0) + 1;
    });

    const peakDays = Object.entries(dateCount)
      .filter(([_, count]) => count >= 2)
      .map(([date, _]) => new Date(date));

    // Generate recommendations
    const recommendations = await this.generateWorkloadRecommendations({
      overdue: overdue.length,
      dueThisWeek: dueThisWeek.length,
      workloadLevel,
      peakDays: peakDays.length
    });

    return {
      total_assignments: assignments.filter(a => a.status !== 'Completed').length,
      overdue_count: overdue.length,
      due_this_week: dueThisWeek.length,
      due_next_week: dueNextWeek.length,
      high_priority_count: highPriority.length,
      estimated_weekly_hours: estimatedHours,
      workload_level: workloadLevel,
      peak_days: peakDays,
      recommendations
    };
  }

  /**
   * Get time management insights for a user
   */
  async getTimeManagementInsights(userId: string): Promise<TimeManagementInsights> {
    const studyPattern = await this.analyzeStudyPatterns(userId);
    const studySessions = await studySessionsService.getUserStudySessions(userId);
    const subjects = await subjectsService.getUserSubjects(userId);

    // Calculate total study time
    const totalStudyTime = studySessions.reduce((sum, session) => 
      sum + (session.actual_duration || session.planned_duration || 0), 0
    );

    // Calculate average daily study time (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSessions = studySessions.filter(s => new Date(s.start_time) >= thirtyDaysAgo);
    const avgDailyTime = recentSessions.length > 0 ? totalStudyTime / 30 : 0;

    // Calculate efficiency by subject
    const efficiencyBySubject = await Promise.all(subjects.map(async subject => {
      const subjectSessions = studySessions.filter(s => s.subject_id === subject.id);
      const subjectAssignments = await assignmentsService.getAssignmentsBySubject(subject.id);
      
      const totalTime = subjectSessions.reduce((sum, s) => 
        sum + (s.actual_duration || s.planned_duration || 0), 0
      );
      const completedAssignments = subjectAssignments.filter(a => a.status === 'Completed').length;
      const avgProductivity = subjectSessions.length > 0
        ? subjectSessions.reduce((sum, s) => sum + (s.productivity_rating || 3), 0) / subjectSessions.length
        : 3;

      return {
        subject_id: subject.id,
        subject_name: subject.name,
        minutes_per_assignment: completedAssignments > 0 ? totalTime / completedAssignments : 0,
        productivity_score: avgProductivity / 5 // normalize to 0-1
      };
    }));

    // Analyze procrastination patterns
    const assignments = await assignmentsService.getUserAssignments(userId);
    const procrastinationData = this.analyzeProcrastinationPatterns(assignments, studySessions);

    return {
      total_study_time: totalStudyTime,
      average_daily_study_time: avgDailyTime,
      most_productive_hours: studyPattern.preferred_study_hours,
      efficiency_by_subject: efficiencyBySubject,
      procrastination_patterns: procrastinationData
    };
  }

  /**
   * Calculate urgency score (0-1) based on due date and other factors
   */
  private calculateUrgencyScore(assignment: Assignment): number {
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDue <= 0) return 1.0; // Overdue

    let urgencyScore = 0;

    // Time-based urgency
    if (hoursUntilDue <= 24) urgencyScore += 0.4;
    else if (hoursUntilDue <= 48) urgencyScore += 0.3;
    else if (hoursUntilDue <= 72) urgencyScore += 0.2;
    else if (hoursUntilDue <= 168) urgencyScore += 0.1; // 1 week

    // Priority-based urgency
    switch (assignment.priority) {
      case 'High': urgencyScore += 0.3; break;
      case 'Medium': urgencyScore += 0.15; break;
      case 'Low': urgencyScore += 0.05; break;
    }

    // Progress-based urgency (less progress = more urgent)
    const progress = assignment.progress_percentage || 0;
    urgencyScore += (100 - progress) / 100 * 0.3;

    return Math.min(1.0, urgencyScore);
  }

  /**
   * Estimate remaining time needed for assignment completion
   */
  private estimateRemainingTime(assignment: Assignment, timeSpent: number): number {
    const estimatedTotal = assignment.study_time_estimate || 120; // default 2 hours
    const progress = assignment.progress_percentage || 0;
    
    if (progress === 0 && timeSpent === 0) {
      return estimatedTotal;
    }

    if (progress > 0) {
      // Use progress percentage to estimate remaining time
      const totalEstimated = timeSpent / (progress / 100);
      return Math.max(0, totalEstimated - timeSpent);
    }

    // If we have time spent but no progress recorded, use default estimation
    return Math.max(0, estimatedTotal - timeSpent);
  }

  /**
   * Calculate probability of completing assignment on time
   */
  private calculateCompletionProbability(assignment: Assignment, timeSpent: number): number {
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDue <= 0) return 0; // Already overdue

    const remainingTime = this.estimateRemainingTime(assignment, timeSpent);
    const remainingHours = remainingTime / 60;

    if (remainingHours <= 0) return 1.0; // Already completed

    let probability = Math.min(1.0, hoursUntilDue / remainingHours);

    // Adjust based on assignment type (some types typically take longer)
    const typeMultipliers = {
      'project': 0.8,
      'paper': 0.85,
      'exam': 0.9,
      'assignment': 0.95,
      'quiz': 1.0,
      'homework': 1.0
    };

    const multiplier = typeMultipliers[assignment.assignment_type as keyof typeof typeMultipliers] || 0.9;
    probability *= multiplier;

    return Math.max(0, Math.min(1.0, probability));
  }

  /**
   * Calculate productivity score based on study sessions
   */
  private async calculateProductivityScore(assignmentId: string, studySessions: StudySession[]): Promise<number> {
    if (studySessions.length === 0) return 0.5; // neutral score

    const avgProductivity = studySessions.reduce((sum, session) => 
      sum + (session.productivity_rating || 3), 0
    ) / studySessions.length;

    // Normalize to 0-1 scale (assuming 1-5 rating scale)
    return Math.max(0, Math.min(1.0, (avgProductivity - 1) / 4));
  }

  /**
   * Calculate assignment pace rating
   */
  private calculatePaceRating(
    assignment: Assignment, 
    timeSpent: number, 
    timeRemaining: number
  ): 'ahead' | 'on_track' | 'behind' | 'critical' {
    const progress = assignment.progress_percentage || 0;
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const createdDate = new Date(assignment.created_at);
    
    const totalTimeAvailable = (dueDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    const timeElapsed = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    const timeProgress = timeElapsed / totalTimeAvailable;

    if (progress >= 100) return 'ahead';
    
    const progressRatio = progress / 100;
    
    if (progressRatio >= timeProgress + 0.2) return 'ahead';
    if (progressRatio >= timeProgress - 0.1) return 'on_track';
    if (progressRatio >= timeProgress - 0.3) return 'behind';
    return 'critical';
  }

  /**
   * Helper methods
   */
  private countCompletedMilestones(assignment: Assignment): number {
    // This would analyze assignment description or metadata for milestones
    // For now, return a simple calculation based on progress
    const progress = assignment.progress_percentage || 0;
    return Math.floor(progress / 25); // 4 milestones at 25%, 50%, 75%, 100%
  }

  private countTotalMilestones(assignment: Assignment): number {
    // Simple milestone system - could be enhanced with actual milestone tracking
    return 4;
  }

  private getDefaultStudyPattern(userId: string): StudyPattern {
    return {
      user_id: userId,
      preferred_study_hours: [14, 15, 19], // 2pm, 3pm, 7pm
      average_session_length: 60,
      productivity_by_hour: {},
      break_frequency: 0.2,
      focus_duration_trend: 'stable',
      subject_preferences: []
    };
  }

  private calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 3) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  private calculateBreakFrequency(sessions: StudySession[]): number {
    // This would analyze session patterns to determine break frequency
    // For now, return a default value
    return 0.15; // 15% of session time spent on breaks
  }

  private async analyzeSubjectPreferences(userId: string, sessions: StudySession[]): Promise<StudyPattern['subject_preferences']> {
    const subjects = await subjectsService.getUserSubjects(userId);
    
    return subjects.map(subject => {
      const subjectSessions = sessions.filter(s => s.subject_id === subject.id);
      const avgProductivity = subjectSessions.length > 0
        ? subjectSessions.reduce((sum, s) => sum + (s.productivity_rating || 3), 0) / subjectSessions.length
        : 3;
      
      const preferredHours = subjectSessions
        .map(s => new Date(s.start_time).getHours())
        .filter((hour, index, arr) => arr.indexOf(hour) === index)
        .slice(0, 3);

      return {
        subject_id: subject.id,
        efficiency_score: avgProductivity / 5,
        preferred_time_slots: preferredHours
      };
    });
  }

  private async generateWorkloadRecommendations(data: {
    overdue: number;
    dueThisWeek: number;
    workloadLevel: string;
    peakDays: number;
  }): Promise<WorkloadRecommendation[]> {
    const recommendations: WorkloadRecommendation[] = [];

    if (data.overdue > 0) {
      recommendations.push({
        type: 'prioritize',
        message: `You have ${data.overdue} overdue assignments. Focus on these first.`,
        affected_assignments: [], // would be populated with actual IDs
        estimated_benefit: 'Prevent further grade penalties'
      });
    }

    if (data.workloadLevel === 'overwhelming') {
      recommendations.push({
        type: 'redistribute',
        message: 'Your workload is overwhelming. Consider redistributing some tasks.',
        affected_assignments: [],
        estimated_benefit: 'Reduce stress and improve quality'
      });
    }

    if (data.peakDays > 2) {
      recommendations.push({
        type: 'redistribute',
        message: 'You have multiple peak days with several assignments due. Consider starting earlier.',
        affected_assignments: [],
        estimated_benefit: 'Better time management and less last-minute stress'
      });
    }

    return recommendations;
  }

  private analyzeProcrastinationPatterns(assignments: Assignment[], sessions: StudySession[]): TimeManagementInsights['procrastination_patterns'] {
    const completedAssignments = assignments.filter(a => a.status === 'Completed');
    
    if (completedAssignments.length === 0) {
      return {
        avg_start_delay: 0,
        last_minute_completion_rate: 0,
        optimal_start_time: 7 // suggest starting 7 days before due date
      };
    }

    let totalStartDelay = 0;
    let lastMinuteCount = 0;

    completedAssignments.forEach(assignment => {
      const createdDate = new Date(assignment.created_at);
      const dueDate = new Date(assignment.due_date);
      const assignmentSessions = sessions.filter(s => s.assignment_id === assignment.id);
      
      if (assignmentSessions.length > 0) {
        const firstSession = new Date(Math.min(...assignmentSessions.map(s => new Date(s.start_time).getTime())));
        const startDelay = (firstSession.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        totalStartDelay += startDelay;
        
        // Check if completed in last 24 hours before due date
        const totalDuration = (dueDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        if (startDelay > totalDuration - 1) {
          lastMinuteCount++;
        }
      }
    });

    return {
      avg_start_delay: totalStartDelay / completedAssignments.length,
      last_minute_completion_rate: lastMinuteCount / completedAssignments.length,
      optimal_start_time: Math.max(1, 7 - (totalStartDelay / completedAssignments.length))
    };
  }
}

// Export singleton instance
export const assignmentProgressTracker = new AssignmentProgressTracker();