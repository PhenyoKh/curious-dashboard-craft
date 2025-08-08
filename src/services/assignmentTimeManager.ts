/**
 * Assignment Time Manager
 * 
 * Advanced time management and planning system for academic assignments.
 * Provides intelligent scheduling, deadline optimization, and productivity insights.
 */

import { assignmentsService, studySessionsService, semestersService } from './supabaseService';
import { assignmentProgressTracker } from './assignmentProgressTracker';
import type { 
  Assignment,
  EnhancedAssignment,
  StudySession,
  AssignmentRecommendation,
  TimeManagementInsights,
  Priority,
  AssignmentStatus
} from '../types/assignments';

// User study pattern interface
export interface StudyPattern {
  preferred_study_hours: number[];
  average_session_length: number;
  productivity_by_hour: Record<number, number>;
  break_preferences: {
    frequency: number; // minutes between breaks
    duration: number;  // break duration in minutes
  };
  study_days: number[]; // days of week (0=Sunday)
  focus_duration: number;
  distraction_level: number;
}

// Time block for scheduling
export interface TimeBlock {
  id: string;
  start_time: Date;
  end_time: Date;
  duration_minutes: number;
  assignment_id?: string;
  subject_id?: string;
  block_type: 'study' | 'break' | 'buffer' | 'deadline' | 'exam_prep';
  priority_score: number;
  flexibility_score: number; // 0-1, how easily this can be moved
  productivity_estimate: number; // expected productivity during this block
  location_preference?: string;
  prerequisites?: string[]; // other blocks that must come before this
}

// Study schedule configuration
export interface StudyScheduleConfig {
  daily_study_hours: number;
  preferred_time_slots: Array<{
    start_hour: number;
    end_hour: number;
    days: number[]; // 0=Sunday, 1=Monday, etc.
    productivity_multiplier: number;
  }>;
  break_frequency: number; // minutes between breaks
  break_duration: number; // minutes per break
  buffer_time: number; // extra time to add to estimates
  max_session_length: number; // maximum study session length in minutes
  min_advance_planning: number; // minimum days to plan ahead
}

// Smart scheduling recommendation
export interface SchedulingRecommendation {
  type: 'optimal_start_time' | 'session_breakdown' | 'deadline_adjustment' | 'workload_redistribution';
  assignment_id: string;
  title: string;
  recommendation: string;
  reasoning: string;
  impact_score: number; // 0-1, expected positive impact
  effort_required: 'low' | 'medium' | 'high';
  suggested_actions: Array<{
    action: string;
    timeframe: string;
    expected_outcome: string;
  }>;
}

// Academic deadline analysis
export interface DeadlineAnalysis {
  assignment_id: string;
  original_due_date: Date;
  optimal_completion_date: Date;
  buffer_days: number;
  risk_factors: Array<{
    factor: 'workload_conflict' | 'exam_proximity' | 'complexity_underestimate' | 'low_productivity_period';
    severity: 'low' | 'medium' | 'high';
    description: string;
    mitigation: string;
  }>;
  confidence_score: number;
}

// Productivity optimization suggestion
export interface ProductivityOptimization {
  area: 'scheduling' | 'environment' | 'technique' | 'workload' | 'breaks';
  current_score: number;
  potential_score: number;
  improvement_potential: number;
  suggestions: Array<{
    suggestion: string;
    difficulty: 'easy' | 'moderate' | 'challenging';
    expected_benefit: string;
    implementation_time: string;
  }>;
}

export class AssignmentTimeManager {
  private scheduleConfig: StudyScheduleConfig;
  private timeBlocks: Map<string, TimeBlock[]> = new Map(); // userId -> blocks

  constructor(config?: Partial<StudyScheduleConfig>) {
    this.scheduleConfig = {
      daily_study_hours: 4,
      preferred_time_slots: [
        { start_hour: 9, end_hour: 12, days: [1, 2, 3, 4, 5], productivity_multiplier: 1.2 },
        { start_hour: 14, end_hour: 17, days: [1, 2, 3, 4, 5], productivity_multiplier: 1.0 },
        { start_hour: 19, end_hour: 22, days: [0, 1, 2, 3, 4, 5, 6], productivity_multiplier: 0.9 }
      ],
      break_frequency: 50, // Pomodoro-style
      break_duration: 10,
      buffer_time: 0.2, // 20% buffer
      max_session_length: 120, // 2 hours max
      min_advance_planning: 7, // 1 week ahead
      ...config
    };
  }

  /**
   * Generate optimal study schedule for a user's assignments
   */
  async generateOptimalSchedule(
    userId: string,
    planningDays: number = 14
  ): Promise<TimeBlock[]> {
    // Get user's assignments and current progress
    const assignments = await assignmentsService.getUserAssignments(userId);
    const activeAssignments = assignments.filter(a => 
      a.status !== 'Completed' && a.status !== 'Submitted' && a.status !== 'Graded'
    );

    // Analyze user's study patterns
    const studyPattern = await assignmentProgressTracker.analyzeStudyPatterns(userId);
    
    // Update schedule config based on user patterns
    this.updateConfigFromStudyPattern(studyPattern);

    // Generate time blocks for each assignment
    const allBlocks: TimeBlock[] = [];
    const endDate = new Date(Date.now() + planningDays * 24 * 60 * 60 * 1000);

    for (const assignment of activeAssignments) {
      const assignmentBlocks = await this.generateAssignmentTimeBlocks(
        assignment,
        userId,
        endDate
      );
      allBlocks.push(...assignmentBlocks);
    }

    // Optimize schedule to avoid conflicts and maximize productivity
    const optimizedBlocks = this.optimizeSchedule(allBlocks, userId);

    // Cache the schedule
    this.timeBlocks.set(userId, optimizedBlocks);

    return optimizedBlocks;
  }

  /**
   * Generate specific time blocks for an assignment
   */
  private async generateAssignmentTimeBlocks(
    assignment: Assignment,
    userId: string,
    planningEndDate: Date
  ): Promise<TimeBlock[]> {
    const blocks: TimeBlock[] = [];
    const dueDate = new Date(assignment.due_date);
    const now = new Date();

    // Calculate remaining work
    const progress = assignment.progress_percentage || 0;
    const estimatedTotal = assignment.study_time_estimate || 120;
    const remainingTime = Math.ceil(estimatedTotal * (1 - progress / 100) * (1 + this.scheduleConfig.buffer_time));

    // Calculate priority score
    const priorityScore = this.calculatePriorityScore(assignment, dueDate);

    // Break down remaining time into sessions
    const sessionLength = Math.min(
      this.scheduleConfig.max_session_length,
      Math.max(30, remainingTime / 4) // aim for 4 sessions minimum
    );

    const sessionsNeeded = Math.ceil(remainingTime / sessionLength);
    const daysAvailable = Math.max(1, (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Distribute sessions across available days
    const optimalSpacing = Math.max(1, Math.floor(daysAvailable / sessionsNeeded));

    for (let i = 0; i < sessionsNeeded; i++) {
      const sessionDate = new Date(now.getTime() + i * optimalSpacing * 24 * 60 * 60 * 1000);
      
      if (sessionDate > dueDate || sessionDate > planningEndDate) {
        break;
      }

      // Find optimal time slot for this session
      const optimalSlot = this.findOptimalTimeSlot(sessionDate, sessionLength, userId);

      blocks.push({
        id: `${assignment.id}_session_${i}`,
        start_time: optimalSlot.start,
        end_time: optimalSlot.end,
        duration_minutes: sessionLength,
        assignment_id: assignment.id,
        subject_id: assignment.subject_id || undefined,
        block_type: 'study',
        priority_score: priorityScore - (i * 0.1), // slight decrease for later sessions
        flexibility_score: this.calculateFlexibilityScore(assignment, sessionDate, dueDate),
        productivity_estimate: this.estimateProductivity(optimalSlot.start, userId),
        prerequisites: i > 0 ? [`${assignment.id}_session_${i-1}`] : undefined
      });

      // Add break after session (except for last session)
      if (i < sessionsNeeded - 1) {
        blocks.push({
          id: `${assignment.id}_break_${i}`,
          start_time: optimalSlot.end,
          end_time: new Date(optimalSlot.end.getTime() + this.scheduleConfig.break_duration * 60000),
          duration_minutes: this.scheduleConfig.break_duration,
          assignment_id: assignment.id,
          block_type: 'break',
          priority_score: priorityScore * 0.5,
          flexibility_score: 0.8,
          productivity_estimate: 0
        });
      }
    }

    // Add exam prep blocks for exams
    if (assignment.assignment_type === 'exam') {
      const prepBlocks = this.generateExamPrepBlocks(assignment, dueDate, userId);
      blocks.push(...prepBlocks);
    }

    return blocks;
  }

  /**
   * Optimize schedule to avoid conflicts and maximize productivity
   */
  private optimizeSchedule(blocks: TimeBlock[], userId: string): TimeBlock[] {
    // Sort blocks by priority and deadline proximity
    const sortedBlocks = blocks.sort((a, b) => {
      const aPriority = a.priority_score;
      const bPriority = b.priority_score;
      
      if (Math.abs(aPriority - bPriority) > 0.1) {
        return bPriority - aPriority; // Higher priority first
      }
      
      // If priority is similar, sort by deadline
      return a.start_time.getTime() - b.start_time.getTime();
    });

    const optimizedBlocks: TimeBlock[] = [];
    const occupiedSlots = new Map<string, TimeBlock>(); // dateKey -> block

    for (const block of sortedBlocks) {
      const dateKey = this.getDateKey(block.start_time);
      const conflictingBlock = occupiedSlots.get(dateKey);

      if (!conflictingBlock) {
        // No conflict, add the block
        optimizedBlocks.push(block);
        occupiedSlots.set(dateKey, block);
      } else {
        // Handle conflict
        const resolvedBlocks = this.resolveScheduleConflict(block, conflictingBlock);
        
        // Update the schedule
        const conflictIndex = optimizedBlocks.findIndex(b => b.id === conflictingBlock.id);
        if (conflictIndex !== -1) {
          optimizedBlocks.splice(conflictIndex, 1, ...resolvedBlocks);
        }
        
        // Update occupied slots
        resolvedBlocks.forEach(b => {
          occupiedSlots.set(this.getDateKey(b.start_time), b);
        });
      }
    }

    return optimizedBlocks;
  }

  /**
   * Analyze deadlines and provide optimization recommendations
   */
  async analyzeDeadlines(userId: string): Promise<DeadlineAnalysis[]> {
    const assignments = await assignmentsService.getUserAssignments(userId);
    const activeAssignments = assignments.filter(a => 
      a.status !== 'Completed' && a.status !== 'Submitted'
    );

    const analyses: DeadlineAnalysis[] = [];

    for (const assignment of activeAssignments) {
      const analysis = await this.analyzeAssignmentDeadline(assignment, userId);
      analyses.push(analysis);
    }

    return analyses.sort((a, b) => a.confidence_score - b.confidence_score); // least confident first
  }

  /**
   * Generate scheduling recommendations
   */
  async generateSchedulingRecommendations(userId: string): Promise<SchedulingRecommendation[]> {
    const assignments = await assignmentsService.getUserAssignments(userId);
    const workloadAnalysis = await assignmentProgressTracker.analyzeWorkload(userId);
    const timeInsights = await assignmentProgressTracker.getTimeManagementInsights(userId);
    
    const recommendations: SchedulingRecommendation[] = [];

    // Analyze each assignment for scheduling opportunities
    for (const assignment of assignments) {
      if (assignment.status === 'Completed') continue;

      const metrics = await assignmentProgressTracker.calculateProgressMetrics(assignment.id);
      
      // Recommend optimal start times
      if (metrics.pace_rating === 'behind' || metrics.pace_rating === 'critical') {
        recommendations.push({
          type: 'optimal_start_time',
          assignment_id: assignment.id,
          title: assignment.title,
          recommendation: 'Start working on this assignment immediately',
          reasoning: `Assignment is ${metrics.pace_rating} schedule with ${metrics.completion_probability * 100}% completion probability`,
          impact_score: 0.8,
          effort_required: 'high',
          suggested_actions: [
            {
              action: 'Schedule 2-hour focused session today',
              timeframe: 'Today',
              expected_outcome: 'Improve completion probability by 20-30%'
            },
            {
              action: 'Break down remaining work into smaller tasks',
              timeframe: 'This week',
              expected_outcome: 'Better progress tracking and momentum'
            }
          ]
        });
      }

      // Recommend session breakdown for large assignments
      if ((assignment.study_time_estimate || 0) > 240) { // > 4 hours
        recommendations.push({
          type: 'session_breakdown',
          assignment_id: assignment.id,
          title: assignment.title,
          recommendation: 'Break this assignment into smaller study sessions',
          reasoning: 'Large assignments benefit from distributed practice and prevent burnout',
          impact_score: 0.6,
          effort_required: 'low',
          suggested_actions: [
            {
              action: 'Create 4-6 study sessions of 45-60 minutes each',
              timeframe: 'Next week',
              expected_outcome: 'Better retention and less procrastination'
            }
          ]
        });
      }
    }

    // Workload-based recommendations
    if (workloadAnalysis.workload_level === 'overwhelming') {
      const highWorkloadAssignments = assignments
        .filter(a => a.priority === 'High' || a.assignment_type === 'exam')
        .slice(0, 3);

      recommendations.push({
        type: 'workload_redistribution',
        assignment_id: highWorkloadAssignments[0]?.id || '',
        title: 'Workload Management',
        recommendation: 'Redistribute your workload to prevent burnout',
        reasoning: `You have ${workloadAnalysis.estimated_weekly_hours} hours of work this week`,
        impact_score: 0.9,
        effort_required: 'medium',
        suggested_actions: [
          {
            action: 'Negotiate deadline extensions for 2-3 assignments',
            timeframe: 'This week',
            expected_outcome: 'Reduce weekly workload by 30-40%'
          },
          {
            action: 'Focus on highest priority assignments first',
            timeframe: 'Ongoing',
            expected_outcome: 'Better grade outcomes on important work'
          }
        ]
      });
    }

    return recommendations.sort((a, b) => b.impact_score - a.impact_score);
  }

  /**
   * Generate productivity optimization suggestions
   */
  async generateProductivtyOptimizations(userId: string): Promise<ProductivityOptimization[]> {
    const studyPattern = await assignmentProgressTracker.analyzeStudyPatterns(userId);
    const timeInsights = await assignmentProgressTracker.getTimeManagementInsights(userId);
    
    const optimizations: ProductivityOptimization[] = [];

    // Scheduling optimization
    const schedulingScore = this.calculateSchedulingScore(studyPattern);
    if (schedulingScore < 0.8) {
      optimizations.push({
        area: 'scheduling',
        current_score: schedulingScore,
        potential_score: 0.9,
        improvement_potential: 0.9 - schedulingScore,
        suggestions: [
          {
            suggestion: 'Schedule study sessions during your most productive hours',
            difficulty: 'easy',
            expected_benefit: 'Increase productivity by 15-25%',
            implementation_time: '1 week'
          },
          {
            suggestion: 'Use time-blocking for better focus',
            difficulty: 'moderate',
            expected_benefit: 'Reduce context switching and improve concentration',
            implementation_time: '2 weeks'
          }
        ]
      });
    }

    // Break optimization
    if (studyPattern.break_frequency > 0.3 || studyPattern.break_frequency < 0.1) {
      optimizations.push({
        area: 'breaks',
        current_score: 1 - Math.abs(studyPattern.break_frequency - 0.2),
        potential_score: 0.9,
        improvement_potential: 0.9 - (1 - Math.abs(studyPattern.break_frequency - 0.2)),
        suggestions: [
          {
            suggestion: 'Implement the Pomodoro Technique (25min work, 5min break)',
            difficulty: 'easy',
            expected_benefit: 'Maintain focus while preventing fatigue',
            implementation_time: '1 week'
          },
          {
            suggestion: 'Take active breaks (walk, stretch) instead of passive ones',
            difficulty: 'easy',
            expected_benefit: 'Better energy restoration and focus return',
            implementation_time: 'Immediate'
          }
        ]
      });
    }

    // Environment optimization
    optimizations.push({
      area: 'environment',
      current_score: 0.6, // Assumed baseline
      potential_score: 0.9,
      improvement_potential: 0.3,
      suggestions: [
        {
          suggestion: 'Create a dedicated study space free from distractions',
          difficulty: 'moderate',
          expected_benefit: 'Improve focus and create study mindset',
          implementation_time: '1-2 days'
        },
        {
          suggestion: 'Use noise-canceling headphones or background music',
          difficulty: 'easy',
          expected_benefit: 'Better concentration in noisy environments',
          implementation_time: 'Immediate'
        }
      ]
    });

    return optimizations.sort((a, b) => b.improvement_potential - a.improvement_potential);
  }

  /**
   * Track and analyze study session effectiveness
   */
  async analyzeSessionEffectiveness(userId: string): Promise<{
    overall_effectiveness: number;
    by_time_of_day: Record<number, number>;
    by_subject: Record<string, number>;
    by_duration: Record<string, number>;
    improvement_suggestions: string[];
  }> {
    const sessions = await studySessionsService.getUserStudySessions(userId);
    
    if (sessions.length === 0) {
      return {
        overall_effectiveness: 0.5,
        by_time_of_day: {},
        by_subject: {},
        by_duration: {},
        improvement_suggestions: ['Start tracking study sessions to get personalized insights']
      };
    }

    // Calculate effectiveness metrics
    let totalEffectiveness = 0;
    const byTimeOfDay: Record<number, { total: number; count: number }> = {};
    const bySubject: Record<string, { total: number; count: number }> = {};
    const byDuration: Record<string, { total: number; count: number }> = {};

    sessions.forEach(session => {
      const effectiveness = (session.productivity_rating || 3) / 5;
      totalEffectiveness += effectiveness;

      // By time of day
      const hour = new Date(session.start_time).getHours();
      if (!byTimeOfDay[hour]) byTimeOfDay[hour] = { total: 0, count: 0 };
      byTimeOfDay[hour].total += effectiveness;
      byTimeOfDay[hour].count++;

      // By subject
      const subjectId = session.subject_id || 'unknown';
      if (!bySubject[subjectId]) bySubject[subjectId] = { total: 0, count: 0 };
      bySubject[subjectId].total += effectiveness;
      bySubject[subjectId].count++;

      // By duration
      const duration = session.actual_duration || session.planned_duration || 0;
      const durationBucket = this.getDurationBucket(duration);
      if (!byDuration[durationBucket]) byDuration[durationBucket] = { total: 0, count: 0 };
      byDuration[durationBucket].total += effectiveness;
      byDuration[durationBucket].count++;
    });

    // Calculate averages
    const overallEffectiveness = totalEffectiveness / sessions.length;
    const timeOfDayAvgs: Record<number, number> = {};
    const subjectAvgs: Record<string, number> = {};
    const durationAvgs: Record<string, number> = {};

    Object.entries(byTimeOfDay).forEach(([hour, data]) => {
      timeOfDayAvgs[parseInt(hour)] = data.total / data.count;
    });

    Object.entries(bySubject).forEach(([subject, data]) => {
      subjectAvgs[subject] = data.total / data.count;
    });

    Object.entries(byDuration).forEach(([duration, data]) => {
      durationAvgs[duration] = data.total / data.count;
    });

    // Generate improvement suggestions
    const suggestions = this.generateEffectivenessImprovements(
      overallEffectiveness,
      timeOfDayAvgs,
      durationAvgs
    );

    return {
      overall_effectiveness: overallEffectiveness,
      by_time_of_day: timeOfDayAvgs,
      by_subject: subjectAvgs,
      by_duration: durationAvgs,
      improvement_suggestions: suggestions
    };
  }

  /**
   * Helper methods
   */
  private updateConfigFromStudyPattern(pattern: StudyPattern): void {
    // Update preferred time slots based on user patterns
    if (pattern.preferred_study_hours.length > 0) {
      this.scheduleConfig.preferred_time_slots = pattern.preferred_study_hours.map((hour: number) => ({
        start_hour: hour,
        end_hour: hour + 2,
        days: [1, 2, 3, 4, 5], // weekdays
        productivity_multiplier: pattern.productivity_by_hour[hour] || 1.0
      }));
    }

    // Update session length based on user's average
    if (pattern.average_session_length > 0) {
      this.scheduleConfig.max_session_length = Math.min(180, Math.max(30, pattern.average_session_length * 1.2));
    }
  }

  private calculatePriorityScore(assignment: Assignment, dueDate: Date): number {
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    let score = 0.5; // Base score

    // Priority factor
    switch (assignment.priority) {
      case 'High': score += 0.3; break;
      case 'Medium': score += 0.15; break;
      case 'Low': score += 0.05; break;
    }

    // Urgency factor
    if (hoursUntilDue <= 24) score += 0.4;
    else if (hoursUntilDue <= 48) score += 0.3;
    else if (hoursUntilDue <= 72) score += 0.2;
    else if (hoursUntilDue <= 168) score += 0.1;

    // Assignment type factor
    if (assignment.assignment_type === 'exam') score += 0.2;
    else if (assignment.assignment_type === 'project') score += 0.15;

    return Math.min(1.0, score);
  }

  private calculateFlexibilityScore(assignment: Assignment, sessionDate: Date, dueDate: Date): number {
    const daysUntilDue = (dueDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // More flexible if there's more time
    if (daysUntilDue > 7) return 0.8;
    if (daysUntilDue > 3) return 0.6;
    if (daysUntilDue > 1) return 0.3;
    return 0.1;
  }

  private findOptimalTimeSlot(date: Date, durationMinutes: number, userId: string): { start: Date; end: Date } {
    // Find the best time slot based on user's preferred hours and productivity
    const dayOfWeek = date.getDay();
    const bestSlots = this.scheduleConfig.preferred_time_slots
      .filter(slot => slot.days.includes(dayOfWeek))
      .sort((a, b) => b.productivity_multiplier - a.productivity_multiplier);

    if (bestSlots.length > 0) {
      const bestSlot = bestSlots[0];
      const start = new Date(date);
      start.setHours(bestSlot.start_hour, 0, 0, 0);
      
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + durationMinutes);

      return { start, end };
    }

    // Fallback to default time
    const start = new Date(date);
    start.setHours(14, 0, 0, 0); // 2 PM default
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMinutes);

    return { start, end };
  }

  private estimateProductivity(startTime: Date, userId: string): number {
    const hour = startTime.getHours();
    
    // Default productivity estimates by hour
    const productivityByHour: Record<number, number> = {
      8: 0.9, 9: 1.0, 10: 1.0, 11: 0.9,
      12: 0.7, 13: 0.6, 14: 0.8, 15: 0.9,
      16: 0.8, 17: 0.7, 18: 0.6, 19: 0.8,
      20: 0.7, 21: 0.6, 22: 0.5
    };

    return productivityByHour[hour] || 0.5;
  }

  private generateExamPrepBlocks(assignment: Assignment, examDate: Date, userId: string): TimeBlock[] {
    const blocks: TimeBlock[] = [];
    const now = new Date();
    const daysUntilExam = (examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilExam > 7) {
      // Add intensive review sessions in the week before exam
      const reviewStart = new Date(examDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < 7; i++) {
        const reviewDate = new Date(reviewStart.getTime() + i * 24 * 60 * 60 * 1000);
        const timeSlot = this.findOptimalTimeSlot(reviewDate, 90, userId);

        blocks.push({
          id: `${assignment.id}_exam_prep_${i}`,
          start_time: timeSlot.start,
          end_time: timeSlot.end,
          duration_minutes: 90,
          assignment_id: assignment.id,
          block_type: 'exam_prep',
          priority_score: 0.9 + (i * 0.01), // increasing priority as exam approaches
          flexibility_score: 0.2, // low flexibility for exam prep
          productivity_estimate: 0.9
        });
      }
    }

    return blocks;
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private resolveScheduleConflict(newBlock: TimeBlock, existingBlock: TimeBlock): TimeBlock[] {
    // Simple conflict resolution - keep higher priority block
    if (newBlock.priority_score > existingBlock.priority_score) {
      return [newBlock];
    } else {
      return [existingBlock];
    }
  }

  private async analyzeAssignmentDeadline(assignment: Assignment, userId: string): Promise<DeadlineAnalysis> {
    const dueDate = new Date(assignment.due_date);
    const now = new Date();
    const metrics = await assignmentProgressTracker.calculateProgressMetrics(assignment.id);

    // Calculate optimal completion date (with buffer)
    const bufferDays = Math.max(1, Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) * 0.1));
    const optimalDate = new Date(dueDate.getTime() - bufferDays * 24 * 60 * 60 * 1000);

    // Identify risk factors
    const riskFactors: DeadlineAnalysis['risk_factors'] = [];

    if (metrics.completion_probability < 0.7) {
      riskFactors.push({
        factor: 'complexity_underestimate',
        severity: 'high',
        description: 'Low completion probability suggests underestimated complexity',
        mitigation: 'Break down assignment into smaller tasks and reassess time estimates'
      });
    }

    if (metrics.pace_rating === 'behind' || metrics.pace_rating === 'critical') {
      riskFactors.push({
        factor: 'workload_conflict',
        severity: 'high',
        description: 'Assignment is behind schedule',
        mitigation: 'Increase daily study time allocation or request deadline extension'
      });
    }

    return {
      assignment_id: assignment.id,
      original_due_date: dueDate,
      optimal_completion_date: optimalDate,
      buffer_days: bufferDays,
      risk_factors: riskFactors,
      confidence_score: metrics.completion_probability
    };
  }

  private calculateSchedulingScore(pattern: StudyPattern): number {
    let score = 0.5;

    // Check if user has consistent study hours
    if (pattern.preferred_study_hours.length >= 2) {
      score += 0.2;
    }

    // Check if user studies during productive hours
    const productiveHours = [9, 10, 11, 14, 15, 16];
    const studyDuringProductive = pattern.preferred_study_hours.some((hour: number) => 
      productiveHours.includes(hour)
    );
    if (studyDuringProductive) {
      score += 0.2;
    }

    // Check session length optimization
    if (pattern.average_session_length >= 45 && pattern.average_session_length <= 90) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  private getDurationBucket(minutes: number): string {
    if (minutes <= 30) return '0-30min';
    if (minutes <= 60) return '30-60min';
    if (minutes <= 90) return '60-90min';
    if (minutes <= 120) return '90-120min';
    return '120+min';
  }

  private generateEffectivenessImprovements(
    overall: number,
    byTime: Record<number, number>,
    byDuration: Record<string, number>
  ): string[] {
    const suggestions: string[] = [];

    if (overall < 0.6) {
      suggestions.push('Consider changing your study environment or eliminating distractions');
    }

    // Find best time of day
    const bestHour = Object.entries(byTime).reduce((best, [hour, score]) => 
      score > best.score ? { hour: parseInt(hour), score } : best,
      { hour: 14, score: 0 }
    );

    if (bestHour.score > overall + 0.1) {
      suggestions.push(`You're most productive at ${bestHour.hour}:00. Try scheduling more sessions at this time.`);
    }

    // Find best duration
    const bestDuration = Object.entries(byDuration).reduce((best, [duration, score]) => 
      score > best.score ? { duration, score } : best,
      { duration: '60-90min', score: 0 }
    );

    if (bestDuration.score > overall + 0.1) {
      suggestions.push(`${bestDuration.duration} sessions work best for you. Try to stick to this duration.`);
    }

    return suggestions;
  }
}

// Export singleton instance
export const assignmentTimeManager = new AssignmentTimeManager();