/**
 * Assignment Detection Engine
 * 
 * This service automatically detects academic assignments from calendar events
 * using keyword analysis, pattern matching, and contextual clues.
 */

import { assignmentCategoriesService } from './supabaseService';
import type { 
  AssignmentType, 
  SubmissionType, 
  Priority, 
  AssignmentDetectionResult,
  AcademicMetadata,
  AssignmentFormData
} from '../types/assignments';

// Calendar event interface (generic to work with Google/Microsoft)
export interface CalendarEventData {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
  organizer?: string;
  calendar_source?: string;
  calendar_name?: string;
}

// Detection confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4,
  MINIMUM: 0.3
} as const;

// Academic keyword patterns with weights
const ACADEMIC_KEYWORDS = {
  // Assignment types with high confidence
  ASSIGNMENT_STRONG: {
    keywords: ['assignment', 'homework', 'hw', 'essay', 'paper', 'report', 'project', 'lab report'],
    weight: 1.0,
    type: 'assignment' as AssignmentType
  },
  
  EXAM_STRONG: {
    keywords: ['exam', 'test', 'quiz', 'midterm', 'final', 'examination'],
    weight: 1.0,
    type: 'exam' as AssignmentType
  },
  
  PROJECT_STRONG: {
    keywords: ['project', 'presentation', 'thesis', 'capstone', 'research'],
    weight: 0.9,
    type: 'project' as AssignmentType
  },
  
  LAB_STRONG: {
    keywords: ['lab', 'laboratory', 'experiment', 'practical'],
    weight: 0.9,
    type: 'lab' as AssignmentType
  },
  
  // Context clues with medium confidence
  DUE_INDICATORS: {
    keywords: ['due', 'deadline', 'submit', 'submission', 'turn in', 'hand in'],
    weight: 0.7,
    type: null
  },
  
  ACADEMIC_CONTEXT: {
    keywords: ['class', 'course', 'lecture', 'seminar', 'workshop', 'tutorial'],
    weight: 0.5,
    type: null
  },
  
  // Subject patterns
  SUBJECT_CODES: {
    keywords: [], // Will be populated with regex patterns
    weight: 0.8,
    type: null
  }
} as const;

// Subject code patterns (CS101, MATH-201, etc.)
const SUBJECT_CODE_PATTERNS = [
  /\b[A-Z]{2,4}\s*[-]?\s*\d{2,4}\b/g,           // CS101, MATH-201, PHYS 201
  /\b[A-Z]{2,4}\d{2,4}[A-Z]?\b/g,               // CS101A, MATH201
  /\b[A-Z]+\s+\d{2,4}[A-Z]?\b/g,                // COMPUTER SCIENCE 101
];

// Priority indicators
const PRIORITY_INDICATORS = {
  HIGH: ['final', 'midterm', 'major project', 'thesis', 'important', 'critical'],
  MEDIUM: ['assignment', 'homework', 'quiz', 'lab'],
  LOW: ['discussion', 'reading', 'optional', 'extra credit']
};

// Submission type indicators
const SUBMISSION_INDICATORS = {
  online: ['online', 'canvas', 'blackboard', 'moodle', 'submit online', 'upload'],
  paper: ['paper', 'hard copy', 'physical', 'print', 'in person'],
  presentation: ['present', 'presentation', 'demo', 'show'],
  email: ['email', 'send to', 'mail to']
};

export class AssignmentDetectionEngine {
  private categories: any[] = [];

  constructor() {
    this.loadCategories();
  }

  private async loadCategories() {
    try {
      // Temporarily disable category loading since the table might not exist yet
      // this.categories = await assignmentCategoriesService.getAssignmentCategories();
      this.categories = []; // Use empty array for now
    } catch (error) {
      console.error('Failed to load assignment categories:', error);
      this.categories = [];
    }
  }

  /**
   * Main detection method - analyzes a calendar event for assignment indicators
   */
  async detectAssignmentFromCalendarEvent(event: CalendarEventData): Promise<AssignmentDetectionResult> {
    const detectionScores = this.analyzeEvent(event);
    const totalConfidence = this.calculateTotalConfidence(detectionScores);
    
    // Only consider as assignment if confidence is above minimum threshold
    if (totalConfidence < CONFIDENCE_THRESHOLDS.MINIMUM) {
      return {
        detected: false,
        confidence: totalConfidence,
        suggested_data: {},
        detection_reasons: ['Confidence too low - likely not an academic assignment'],
        requires_review: false
      };
    }

    const suggestedData = this.generateSuggestedData(event, detectionScores);
    const detectionReasons = this.generateDetectionReasons(detectionScores);
    const requiresReview = totalConfidence < CONFIDENCE_THRESHOLDS.HIGH;

    return {
      detected: true,
      confidence: totalConfidence,
      suggested_data: suggestedData,
      detection_reasons: detectionReasons,
      requires_review: requiresReview
    };
  }

  /**
   * Analyze event for various assignment indicators
   */
  private analyzeEvent(event: CalendarEventData) {
    const scores = {
      keyword_match: this.analyzeKeywords(event),
      title_pattern: this.analyzeTitlePatterns(event),
      calendar_source: this.analyzeCalendarSource(event),
      context_clues: this.analyzeContextClues(event),
      temporal_patterns: this.analyzeTemporalPatterns(event),
      subject_detection: this.analyzeSubjectCodes(event)
    };

    return scores;
  }

  /**
   * Analyze keywords in title and description
   */
  private analyzeKeywords(event: CalendarEventData): number {
    const text = `${event.title} ${event.description || ''}`.toLowerCase();
    let maxScore = 0;
    let detectedType: AssignmentType | null = null;

    // Check each keyword category
    Object.entries(ACADEMIC_KEYWORDS).forEach(([category, config]) => {
      const matches = config.keywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
      );
      
      if (matches.length > 0) {
        const score = (matches.length / config.keywords.length) * config.weight;
        if (score > maxScore) {
          maxScore = score;
          detectedType = config.type;
        }
      }
    });

    return Math.min(maxScore, 1.0);
  }

  /**
   * Analyze title patterns for academic assignments
   */
  private analyzeTitlePatterns(event: CalendarEventData): number {
    const title = event.title.toLowerCase();
    let score = 0;

    // Common academic title patterns
    const patterns = [
      /\b(assignment|hw|homework)\s*\d+/i,           // Assignment 1, HW 2
      /\b(quiz|test|exam)\s*\d+/i,                   // Quiz 1, Test 2
      /\b(lab|laboratory)\s*\d+/i,                   // Lab 1
      /\b(project|paper)\s*\d+/i,                    // Project 1
      /\b(midterm|final)\b/i,                        // Midterm, Final
      /\b(chapter|unit)\s*\d+/i,                     // Chapter 1 assignment
      /\bdue\b/i,                                    // "Due" indicator
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,              // Date patterns
    ];

    patterns.forEach(pattern => {
      if (pattern.test(title)) {
        score += 0.2;
      }
    });

    return Math.min(score, 1.0);
  }

  /**
   * Analyze calendar source for academic context
   */
  private analyzeCalendarSource(event: CalendarEventData): number {
    const source = event.calendar_source?.toLowerCase() || '';
    const calendarName = event.calendar_name?.toLowerCase() || '';
    
    // University/academic domain indicators
    const academicIndicators = [
      '.edu',
      'university',
      'college',
      'school',
      'academic',
      'class',
      'course',
      'student'
    ];

    let score = 0;
    academicIndicators.forEach(indicator => {
      if (source.includes(indicator) || calendarName.includes(indicator)) {
        score += 0.3;
      }
    });

    return Math.min(score, 1.0);
  }

  /**
   * Analyze contextual clues in description and metadata
   */
  private analyzeContextClues(event: CalendarEventData): number {
    const description = event.description?.toLowerCase() || '';
    let score = 0;

    // Look for submission instructions
    if (description.includes('submit') || description.includes('turn in') || description.includes('due')) {
      score += 0.3;
    }

    // Look for academic platforms
    const platforms = ['canvas', 'blackboard', 'moodle', 'gradescope', 'turnitin'];
    platforms.forEach(platform => {
      if (description.includes(platform)) {
        score += 0.2;
      }
    });

    // Look for grading information
    if (description.includes('points') || description.includes('grade') || description.includes('%')) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Analyze temporal patterns (typical assignment timing)
   */
  private analyzeTemporalPatterns(event: CalendarEventData): number {
    let score = 0;
    const eventTime = event.start.getHours();
    
    // Assignments often due at midnight or end of day
    if (eventTime === 23 || eventTime === 0) {
      score += 0.3;
    }

    // Common due times (11:59 PM, 5:00 PM, etc.)
    if (eventTime === 17 || event.start.getMinutes() === 59) {
      score += 0.2;
    }

    // Weekday vs weekend patterns
    const dayOfWeek = event.start.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday-Friday
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Analyze for subject codes in title/description
   */
  private analyzeSubjectCodes(event: CalendarEventData): number {
    const text = `${event.title} ${event.description || ''}`;
    let score = 0;

    SUBJECT_CODE_PATTERNS.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        score += 0.4;
      }
    });

    return Math.min(score, 1.0);
  }

  /**
   * Calculate overall confidence score
   */
  private calculateTotalConfidence(scores: Record<string, number>): number {
    // Weighted average of different detection methods
    const weights = {
      keyword_match: 0.35,
      title_pattern: 0.25,
      calendar_source: 0.15,
      context_clues: 0.15,
      temporal_patterns: 0.05,
      subject_detection: 0.05
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([key, weight]) => {
      if (scores[key] !== undefined) {
        totalScore += scores[key] * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Generate suggested assignment data based on detection
   */
  private generateSuggestedData(event: CalendarEventData, scores: Record<string, any>): Partial<AssignmentFormData> {
    const suggested: Partial<AssignmentFormData> = {
      title: this.cleanTitle(event.title),
      description: event.description || undefined,
      due_date: event.start,
      assignment_type: this.detectAssignmentType(event),
      priority: this.detectPriority(event),
      submission_type: this.detectSubmissionType(event),
      study_time_estimate: this.estimateStudyTime(event),
      tags: this.generateTags(event)
    };

    return suggested;
  }

  /**
   * Clean and standardize assignment title
   */
  private cleanTitle(title: string): string {
    // Remove common prefixes that aren't needed
    const cleaned = title
      .replace(/^(assignment|hw|homework)\s*[\-:]?\s*/i, '')
      .replace(/^(due|deadline)\s*[\-:]?\s*/i, '')
      .trim();

    return cleaned || title; // Return original if cleaning resulted in empty string
  }

  /**
   * Detect assignment type from event content
   */
  private detectAssignmentType(event: CalendarEventData): AssignmentType {
    const text = `${event.title} ${event.description || ''}`.toLowerCase();

    // Check for specific type indicators in order of specificity
    if (text.match(/\b(final|midterm)\b/)) return 'exam';
    if (text.match(/\b(quiz|test)\b/)) return 'quiz';
    if (text.match(/\b(lab|laboratory|experiment)\b/)) return 'lab';
    if (text.match(/\b(project|research|thesis)\b/)) return 'project';
    if (text.match(/\b(presentation|present|demo)\b/)) return 'presentation';
    if (text.match(/\b(paper|essay|report)\b/)) return 'paper';
    if (text.match(/\b(discussion|forum|post)\b/)) return 'discussion';
    
    // Default to assignment
    return 'assignment';
  }

  /**
   * Detect priority level
   */
  private detectPriority(event: CalendarEventData): Priority {
    const text = `${event.title} ${event.description || ''}`.toLowerCase();

    // Check priority indicators
    for (const indicator of PRIORITY_INDICATORS.HIGH) {
      if (text.includes(indicator)) return 'High';
    }
    
    for (const indicator of PRIORITY_INDICATORS.LOW) {
      if (text.includes(indicator)) return 'Low';
    }

    return 'Medium'; // Default
  }

  /**
   * Detect submission type
   */
  private detectSubmissionType(event: CalendarEventData): SubmissionType {
    const text = `${event.title} ${event.description || ''}`.toLowerCase();

    // Check submission type indicators
    for (const [type, indicators] of Object.entries(SUBMISSION_INDICATORS)) {
      for (const indicator of indicators) {
        if (text.includes(indicator)) {
          return type as SubmissionType;
        }
      }
    }

    return 'online'; // Default
  }

  /**
   * Estimate study time based on assignment type and context
   */
  private estimateStudyTime(event: CalendarEventData): number {
    const type = this.detectAssignmentType(event);
    const text = `${event.title} ${event.description || ''}`.toLowerCase();

    // Base estimates in minutes
    const baseEstimates = {
      'assignment': 120,
      'exam': 240,
      'project': 480,
      'quiz': 60,
      'presentation': 180,
      'lab': 150,
      'homework': 90,
      'paper': 300,
      'discussion': 30
    };

    let estimate = baseEstimates[type] || 120;

    // Adjust based on context clues
    if (text.includes('major') || text.includes('final')) {
      estimate *= 2;
    }
    if (text.includes('minor') || text.includes('quick')) {
      estimate *= 0.5;
    }

    return Math.round(estimate);
  }

  /**
   * Generate relevant tags
   */
  private generateTags(event: CalendarEventData): string[] {
    const tags: string[] = [];
    const text = `${event.title} ${event.description || ''}`.toLowerCase();

    // Extract subject codes as tags
    SUBJECT_CODE_PATTERNS.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => tags.push(match.trim().toUpperCase()));
      }
    });

    // Add type-based tags
    const type = this.detectAssignmentType(event);
    tags.push(type);

    // Add context tags
    if (text.includes('group')) tags.push('group-work');
    if (text.includes('online')) tags.push('online');
    if (text.includes('reading')) tags.push('reading');

    // Remove duplicates and limit
    return [...new Set(tags)].slice(0, 5);
  }

  /**
   * Generate human-readable detection reasons
   */
  private generateDetectionReasons(scores: Record<string, number>): string[] {
    const reasons: string[] = [];

    if (scores.keyword_match > 0.5) {
      reasons.push('Contains academic keywords');
    }
    if (scores.title_pattern > 0.5) {
      reasons.push('Title follows assignment naming patterns');
    }
    if (scores.calendar_source > 0.5) {
      reasons.push('Comes from academic calendar source');
    }
    if (scores.context_clues > 0.5) {
      reasons.push('Contains assignment-related context clues');
    }
    if (scores.subject_detection > 0.5) {
      reasons.push('Contains subject code patterns');
    }

    return reasons.length > 0 ? reasons : ['General academic event patterns detected'];
  }

  /**
   * Batch process multiple calendar events
   */
  async batchDetectAssignments(events: CalendarEventData[]): Promise<AssignmentDetectionResult[]> {
    const results = await Promise.all(
      events.map(event => this.detectAssignmentFromCalendarEvent(event))
    );

    return results;
  }

  /**
   * Get detection statistics for analysis
   */
  getDetectionStats(results: AssignmentDetectionResult[]) {
    const total = results.length;
    const detected = results.filter(r => r.detected).length;
    const highConfidence = results.filter(r => r.confidence >= CONFIDENCE_THRESHOLDS.HIGH).length;
    const needsReview = results.filter(r => r.requires_review).length;

    return {
      total_events: total,
      assignments_detected: detected,
      detection_rate: total > 0 ? detected / total : 0,
      high_confidence_count: highConfidence,
      needs_review_count: needsReview,
      average_confidence: total > 0 
        ? results.reduce((sum, r) => sum + r.confidence, 0) / total 
        : 0
    };
  }
}

// Export singleton instance
export const assignmentDetectionEngine = new AssignmentDetectionEngine();