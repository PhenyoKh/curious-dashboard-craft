/**
 * Academic Calendar Importer
 * 
 * Service for importing academic schedules, semester dates, and institutional
 * calendar events from various sources (university systems, registrar exports, etc.).
 */

import { assignmentsService, semestersService, subjectsService } from './supabaseService';
import { assignmentDetectionEngine } from './assignmentDetectionEngine';
import { syllabusParserService } from './syllabusParser';
import { logger } from '@/utils/logger';
import type { 
  Semester,
  SemesterInsert,
  Assignment,
  AssignmentInsert,
  Subject,
  TermType,
  AssignmentType
} from '../types/assignments';

// Supported import formats
export type ImportFormat = 'ics' | 'csv' | 'json' | 'xml' | 'xlsx' | 'registrar_export';

// Academic calendar event types
export type AcademicEventType = 
  | 'semester_start'
  | 'semester_end'
  | 'registration_start'
  | 'registration_end'
  | 'add_drop_deadline'
  | 'midterm_period'
  | 'final_exams'
  | 'break'
  | 'holiday'
  | 'graduation'
  | 'orientation'
  | 'class_cancelled'
  | 'special_event';

// Metadata for academic events
export interface AcademicEventMetadata {
  institution_id?: string;
  department?: string;
  course_code?: string;
  instructor?: string;
  credits?: number;
  capacity?: number;
  enrollment_status?: string;
  prerequisites?: string[];
  building?: string;
  room?: string;
  import_source?: string;
  external_id?: string;
  last_updated?: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

// Raw academic event from import
export interface RawAcademicEvent {
  title: string;
  description?: string;
  start_date: Date;
  end_date?: Date;
  event_type?: AcademicEventType;
  location?: string;
  recurring?: boolean;
  recurrence_pattern?: string;
  metadata?: AcademicEventMetadata;
}

// Action data for different action types
export type SuggestedActionData = 
  | { action: 'create_semester'; data: Partial<SemesterInsert> }
  | { action: 'create_assignment'; data: Partial<AssignmentInsert> }
  | { action: 'create_reminder'; data: { title: string; date: Date; description?: string } }
  | { action: 'ignore'; data?: undefined };

// Processed academic event
export interface ProcessedAcademicEvent extends RawAcademicEvent {
  confidence_score: number;
  suggested_actions: Array<{
    action: 'create_semester' | 'create_assignment' | 'create_reminder' | 'ignore';
    reason: string;
    data?: SuggestedActionData['data'];
  }>;
  classification_reasons: string[];
}

// Institution-specific configuration
export interface InstitutionConfig {
  name: string;
  timezone: string;
  semester_system: 'semester' | 'quarter' | 'trimester';
  academic_year_start_month: number; // 1-12
  grade_scale: 'letter' | 'percentage' | 'gpa';
  standard_semester_names: string[];
  break_periods: Array<{
    name: string;
    typical_start: string; // MM-DD format
    typical_end: string;
  }>;
  exam_period_duration: number; // days
  add_drop_period: number; // days after semester start
}

// Raw JSON event structure from various academic systems
export interface RawJSONEvent {
  title?: string;
  summary?: string;
  name?: string;
  event?: string;
  description?: string;
  start_date?: string;
  date?: string;
  start?: string;
  startDate?: string;
  end_date?: string;
  end?: string;
  endDate?: string;
  event_type?: string;
  type?: string;
  location?: string;
  recurring?: boolean;
  metadata?: Record<string, unknown>;
}

// Registrar data structure (varies by institution)
export interface RegistrarData {
  institution?: {
    name: string;
    code: string;
    timezone: string;
  };
  academic_year?: string;
  semesters?: Array<{
    name: string;
    term_type: string;
    start_date: string;
    end_date: string;
    academic_year: string;
  }>;
  courses?: Array<{
    code: string;
    name: string;
    credits: number;
    instructor: string;
    schedule: string;
    location: string;
  }>;
  events?: RawJSONEvent[];
  metadata?: Record<string, unknown>;
}

// Import configuration for processing
export interface ImportProcessingConfig {
  merge_duplicates?: boolean;
  auto_classify?: boolean;
  confidence_threshold?: number;
  create_assignments?: boolean;
  create_semesters?: boolean;
  timezone_override?: string;
}

// Import result summary
export interface ImportResult {
  success: boolean;
  total_events: number;
  processed_events: number;
  created_semesters: number;
  created_assignments: number;
  created_subjects: number;
  ignored_events: number;
  errors: string[];
  warnings: string[];
  suggested_reviews: Array<{
    event: ProcessedAcademicEvent;
    needs_user_input: boolean;
    priority: 'low' | 'medium' | 'high';
  }>;
}

// Semester detection result
interface SemesterDetectionResult {
  detected: boolean;
  term_type: TermType;
  academic_year: string;
  start_date: Date;
  end_date: Date;
  name: string;
  confidence: number;
}

export class AcademicCalendarImporter {
  private institutionConfig?: InstitutionConfig;
  private eventClassifiers: Map<string, (event: RawAcademicEvent) => number> = new Map();

  constructor(institutionConfig?: InstitutionConfig) {
    this.institutionConfig = institutionConfig;
    this.initializeClassifiers();
  }

  /**
   * Import academic calendar from file
   */
  async importFromFile(
    fileContent: string,
    format: ImportFormat,
    userId: string,
    options?: {
      auto_create_semesters?: boolean;
      auto_create_assignments?: boolean;
      confidence_threshold?: number;
      institution_name?: string;
    }
  ): Promise<ImportResult> {
    const config = {
      auto_create_semesters: true,
      auto_create_assignments: false, // More conservative for academic calendars
      confidence_threshold: 0.7,
      ...options
    };

    try {
      // Parse events based on format
      const rawEvents = await this.parseCalendarFile(fileContent, format);
      
      // Process and classify events
      const processedEvents = await this.processEvents(rawEvents);
      
      // Apply filters and confidence thresholds
      const filteredEvents = processedEvents.filter(event => 
        event.confidence_score >= config.confidence_threshold
      );

      // Execute suggested actions
      const result = await this.executeImportActions(filteredEvents, userId, config);

      return {
        success: true,
        total_events: rawEvents.length,
        processed_events: processedEvents.length,
        ...result,
        errors: [],
        warnings: this.generateWarnings(processedEvents, filteredEvents)
      };

    } catch (error) {
      return {
        success: false,
        total_events: 0,
        processed_events: 0,
        created_semesters: 0,
        created_assignments: 0,
        created_subjects: 0,
        ignored_events: 0,
        errors: [error instanceof Error ? error.message : 'Unknown import error'],
        warnings: [],
        suggested_reviews: []
      };
    }
  }

  /**
   * Import from university registrar export
   */
  async importRegistrarData(
    registrarData: RegistrarData,
    userId: string,
    format: 'json' | 'xml' | 'csv' = 'json'
  ): Promise<ImportResult> {
    try {
      // Parse registrar-specific data structure
      const parsedData = this.parseRegistrarData(registrarData, format);
      
      // Extract semester information
      const semesters = this.extractSemesterInfo(parsedData);
      
      // Extract course enrollments
      const courses = this.extractCourseEnrollments(parsedData);
      
      // Create academic calendar events
      const events: RawAcademicEvent[] = [];
      
      // Add semester events
      semesters.forEach(semester => {
        events.push({
          title: `${semester.name} - Semester Start`,
          start_date: semester.start_date,
          event_type: 'semester_start'
        });
        
        events.push({
          title: `${semester.name} - Semester End`,
          start_date: semester.end_date,
          event_type: 'semester_end'
        });
      });

      // Add course-specific events
      courses.forEach(course => {
        if (course.exam_date) {
          events.push({
            title: `${course.code} - Final Exam`,
            start_date: course.exam_date,
            event_type: 'final_exams',
            metadata: { course_info: course }
          });
        }
      });

      // Process events through standard pipeline
      const processedEvents = await this.processEvents(events);
      
      // Auto-create with higher confidence for registrar data
      const result = await this.executeImportActions(processedEvents, userId, {
        auto_create_semesters: true,
        auto_create_assignments: true,
        confidence_threshold: 0.5 // Lower threshold for official data
      });

      return {
        success: true,
        total_events: events.length,
        processed_events: processedEvents.length,
        ...result,
        errors: [],
        warnings: []
      };

    } catch (error) {
      return {
        success: false,
        total_events: 0,
        processed_events: 0,
        created_semesters: 0,
        created_assignments: 0,
        created_subjects: 0,
        ignored_events: 0,
        errors: [error instanceof Error ? error.message : 'Registrar import error'],
        warnings: [],
        suggested_reviews: []
      };
    }
  }

  /**
   * Import semester schedule template
   */
  async importSemesterTemplate(
    templateData: {
      semester_info: {
        name: string;
        term_type: TermType;
        academic_year: string;
        start_date: Date;
        end_date: Date;
      };
      important_dates: Array<{
        date: Date;
        event: string;
        type: AcademicEventType;
      }>;
      courses?: Array<{
        code: string;
        name: string;
        credits: number;
        instructor?: string;
        schedule?: string;
      }>;
    },
    userId: string
  ): Promise<ImportResult> {
    let created_semesters = 0;
    let created_subjects = 0;
    const errors: string[] = [];

    try {
      // Create semester
      const semesterData: SemesterInsert = {
        user_id: userId,
        name: templateData.semester_info.name,
        term_type: templateData.semester_info.term_type,
        academic_year: templateData.semester_info.academic_year,
        start_date: templateData.semester_info.start_date.toISOString(),
        end_date: templateData.semester_info.end_date.toISOString()
      };

      const semester = await semestersService.createSemester(semesterData);
      created_semesters = 1;

      // Create subjects for courses
      if (templateData.courses) {
        for (const course of templateData.courses) {
          try {
            await subjectsService.createSubject({
              name: course.name,
              code: course.code,
              description: course.instructor ? `Instructor: ${course.instructor}` : undefined,
              user_id: userId,
              semester_id: semester.id
            });
            created_subjects++;
          } catch (error) {
            errors.push(`Failed to create subject ${course.code}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Create calendar events for important dates
      const calendarEvents: RawAcademicEvent[] = templateData.important_dates.map(date => ({
        title: date.event,
        start_date: date.date,
        event_type: date.type
      }));

      return {
        success: true,
        total_events: calendarEvents.length,
        processed_events: calendarEvents.length,
        created_semesters,
        created_assignments: 0,
        created_subjects,
        ignored_events: 0,
        errors,
        warnings: [],
        suggested_reviews: []
      };

    } catch (error) {
      return {
        success: false,
        total_events: 0,
        processed_events: 0,
        created_semesters: 0,
        created_assignments: 0,
        created_subjects: 0,
        ignored_events: 0,
        errors: [error instanceof Error ? error.message : 'Template import error'],
        warnings: [],
        suggested_reviews: []
      };
    }
  }

  /**
   * Auto-detect and import from common university calendar formats
   */
  async autoDetectAndImport(
    data: string | object,
    userId: string
  ): Promise<ImportResult> {
    // Try to detect format automatically
    const detectedFormat = this.detectFormat(data);
    
    if (!detectedFormat) {
      return {
        success: false,
        total_events: 0,
        processed_events: 0,
        created_semesters: 0,
        created_assignments: 0,
        created_subjects: 0,
        ignored_events: 0,
        errors: ['Could not detect calendar format'],
        warnings: [],
        suggested_reviews: []
      };
    }

    // Import using detected format
    return this.importFromFile(
      typeof data === 'string' ? data : JSON.stringify(data),
      detectedFormat,
      userId
    );
  }

  /**
   * Private methods for parsing and processing
   */
  private async parseCalendarFile(content: string, format: ImportFormat): Promise<RawAcademicEvent[]> {
    switch (format) {
      case 'ics':
        return this.parseICS(content);
      case 'csv':
        return this.parseCSV(content);
      case 'json':
        return this.parseJSON(content);
      case 'xml':
        return this.parseXML(content);
      case 'xlsx':
        return this.parseExcel(content);
      case 'registrar_export':
        return this.parseRegistrarExport(content);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private parseICS(content: string): RawAcademicEvent[] {
    const events: RawAcademicEvent[] = [];
    const lines = content.split('\n');
    let currentEvent: Partial<RawAcademicEvent> = {};
    let inEvent = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = {};
      } else if (trimmed === 'END:VEVENT') {
        if (currentEvent.title && currentEvent.start_date) {
          events.push(currentEvent as RawAcademicEvent);
        }
        inEvent = false;
      } else if (inEvent) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':');
        
        switch (key) {
          case 'SUMMARY':
            currentEvent.title = value;
            break;
          case 'DESCRIPTION':
            currentEvent.description = value;
            break;
          case 'DTSTART':
            currentEvent.start_date = this.parseICSDate(value);
            break;
          case 'DTEND':
            currentEvent.end_date = this.parseICSDate(value);
            break;
          case 'LOCATION':
            currentEvent.location = value;
            break;
        }
      }
    }

    return events;
  }

  private parseCSV(content: string): RawAcademicEvent[] {
    const events: RawAcademicEvent[] = [];
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= headers.length) {
        const event: Partial<RawAcademicEvent> = {};
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim();
          if (value) {
            switch (header) {
              case 'title':
              case 'summary':
              case 'event':
                event.title = value;
                break;
              case 'description':
                event.description = value;
                break;
              case 'start_date':
              case 'date':
                event.start_date = new Date(value);
                break;
              case 'end_date':
                event.end_date = new Date(value);
                break;
              case 'location':
                event.location = value;
                break;
              case 'type':
                event.event_type = value as AcademicEventType;
                break;
            }
          }
        });

        if (event.title && event.start_date && !isNaN(event.start_date.getTime())) {
          events.push(event as RawAcademicEvent);
        }
      }
    }

    return events;
  }

  private parseJSON(content: string): RawAcademicEvent[] {
    try {
      const data = JSON.parse(content);
      
      if (Array.isArray(data)) {
        return data.map(item => this.normalizeJSONEvent(item)).filter(Boolean) as RawAcademicEvent[];
      } else if (data.events && Array.isArray(data.events)) {
        return data.events.map(item => this.normalizeJSONEvent(item)).filter(Boolean) as RawAcademicEvent[];
      } else {
        throw new Error('Invalid JSON structure');
      }
    } catch (error) {
      throw new Error(`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseXML(content: string): RawAcademicEvent[] {
    // This would require a proper XML parser
    // For now, return empty array
    logger.warn('XML parsing not yet implemented');
    return [];
  }

  private parseExcel(content: string): RawAcademicEvent[] {
    // This would require an Excel parsing library
    // For now, return empty array
    logger.warn('Excel parsing not yet implemented');
    return [];
  }

  private parseRegistrarExport(content: string): RawAcademicEvent[] {
    // This would handle institution-specific registrar formats
    // For now, try JSON parsing as fallback
    try {
      return this.parseJSON(content);
    } catch {
      return [];
    }
  }

  private async processEvents(events: RawAcademicEvent[]): Promise<ProcessedAcademicEvent[]> {
    const processed: ProcessedAcademicEvent[] = [];

    for (const event of events) {
      const processedEvent = await this.processEvent(event);
      processed.push(processedEvent);
    }

    return processed;
  }

  private async processEvent(event: RawAcademicEvent): Promise<ProcessedAcademicEvent> {
    // Calculate confidence score
    const confidenceScore = this.calculateEventConfidence(event);
    
    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(event, confidenceScore);
    
    // Generate classification reasons
    const classificationReasons = this.generateClassificationReasons(event);

    return {
      ...event,
      confidence_score: confidenceScore,
      suggested_actions: suggestedActions,
      classification_reasons: classificationReasons
    };
  }

  private calculateEventConfidence(event: RawAcademicEvent): number {
    let confidence = 0.5; // Base confidence

    // Title-based confidence
    if (event.title) {
      const titleLower = event.title.toLowerCase();
      
      // Academic keywords
      const academicKeywords = [
        'semester', 'quarter', 'term', 'registration', 'exam', 'final',
        'midterm', 'break', 'holiday', 'graduation', 'orientation',
        'add/drop', 'deadline', 'class', 'course'
      ];

      const keywordMatches = academicKeywords.filter(keyword => 
        titleLower.includes(keyword)
      ).length;

      confidence += Math.min(0.3, keywordMatches * 0.1);
    }

    // Event type confidence
    if (event.event_type) {
      confidence += 0.2;
    }

    // Date validity
    if (event.start_date && !isNaN(event.start_date.getTime())) {
      confidence += 0.1;
      
      // Future dates are more likely to be valid
      if (event.start_date > new Date()) {
        confidence += 0.1;
      }
    }

    // Description adds context
    if (event.description && event.description.length > 10) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  private generateSuggestedActions(event: RawAcademicEvent, confidence: number): ProcessedAcademicEvent['suggested_actions'] {
    const actions: ProcessedAcademicEvent['suggested_actions'] = [];
    const titleLower = event.title?.toLowerCase() || '';

    // Semester-related events
    if (titleLower.includes('semester') || titleLower.includes('quarter') || titleLower.includes('term')) {
      if (titleLower.includes('start') || titleLower.includes('begin')) {
        actions.push({
          action: 'create_semester',
          reason: 'Event appears to mark the start of an academic term',
          data: { type: 'start' }
        });
      } else if (titleLower.includes('end') || titleLower.includes('finish')) {
        actions.push({
          action: 'create_semester',
          reason: 'Event appears to mark the end of an academic term',
          data: { type: 'end' }
        });
      }
    }

    // Exam-related events
    if (titleLower.includes('exam') || titleLower.includes('final') || titleLower.includes('midterm')) {
      actions.push({
        action: 'create_assignment',
        reason: 'Event appears to be an exam or test',
        data: { assignment_type: 'exam' }
      });
    }

    // Registration and deadlines
    if (titleLower.includes('registration') || titleLower.includes('deadline') || titleLower.includes('add/drop')) {
      actions.push({
        action: 'create_reminder',
        reason: 'Important academic deadline that requires attention'
      });
    }

    // Low confidence events
    if (confidence < 0.6) {
      actions.push({
        action: 'ignore',
        reason: 'Low confidence - event may not be academically relevant'
      });
    }

    return actions;
  }

  private generateClassificationReasons(event: RawAcademicEvent): string[] {
    const reasons: string[] = [];
    const titleLower = event.title?.toLowerCase() || '';

    if (event.event_type) {
      reasons.push(`Classified as ${event.event_type} based on event type field`);
    }

    const academicKeywords = ['semester', 'exam', 'registration', 'class', 'course'];
    const foundKeywords = academicKeywords.filter(keyword => titleLower.includes(keyword));
    if (foundKeywords.length > 0) {
      reasons.push(`Contains academic keywords: ${foundKeywords.join(', ')}`);
    }

    if (event.location) {
      reasons.push('Has location information');
    }

    if (event.description && event.description.length > 50) {
      reasons.push('Has detailed description');
    }

    return reasons;
  }

  private async executeImportActions(
    events: ProcessedAcademicEvent[],
    userId: string,
    config: ImportProcessingConfig
  ): Promise<Omit<ImportResult, 'success' | 'total_events' | 'processed_events' | 'errors' | 'warnings'>> {
    let created_semesters = 0;
    let created_assignments = 0;
    const created_subjects = 0;
    let ignored_events = 0;
    const suggested_reviews: ImportResult['suggested_reviews'] = [];

    for (const event of events) {
      for (const action of event.suggested_actions) {
        try {
          switch (action.action) {
            case 'create_semester':
              if (config.auto_create_semesters) {
                await this.createSemesterFromEvent(event, userId);
                created_semesters++;
              } else {
                suggested_reviews.push({
                  event,
                  needs_user_input: true,
                  priority: 'high'
                });
              }
              break;

            case 'create_assignment':
              if (config.auto_create_assignments) {
                await this.createAssignmentFromEvent(event, userId);
                created_assignments++;
              } else {
                suggested_reviews.push({
                  event,
                  needs_user_input: true,
                  priority: 'medium'
                });
              }
              break;

            case 'create_reminder':
              // Reminders would be handled by notification system
              suggested_reviews.push({
                event,
                needs_user_input: false,
                priority: 'low'
              });
              break;

            case 'ignore':
              ignored_events++;
              break;
          }
        } catch (error) {
          logger.error(`Error executing action ${action.action}:`, error);
          suggested_reviews.push({
            event,
            needs_user_input: true,
            priority: 'medium'
          });
        }
      }
    }

    return {
      created_semesters,
      created_assignments,
      created_subjects,
      ignored_events,
      suggested_reviews
    };
  }

  /**
   * Helper methods
   */
  private initializeClassifiers(): void {
    // Initialize event type classifiers
    this.eventClassifiers.set('semester_start', (event) => {
      const title = event.title.toLowerCase();
      return (title.includes('semester') && title.includes('start')) ? 0.9 : 0;
    });

    this.eventClassifiers.set('exam', (event) => {
      const title = event.title.toLowerCase();
      return (title.includes('exam') || title.includes('final') || title.includes('midterm')) ? 0.8 : 0;
    });

    // Add more classifiers as needed
  }

  private detectFormat(data: string | object): ImportFormat | null {
    if (typeof data === 'object') {
      return 'json';
    }

    const content = data.toLowerCase();
    
    if (content.includes('begin:vcalendar')) return 'ics';
    if (content.includes('<?xml')) return 'xml';
    if (content.includes('title,date') || content.includes('event,start')) return 'csv';
    
    // Try to parse as JSON
    try {
      JSON.parse(data);
      return 'json';
    } catch {
      // Not JSON
    }

    return null;
  }

  private parseICSDate(dateStr: string): Date {
    // Parse ICS date format (YYYYMMDDTHHMMSSZ)
    if (dateStr.length >= 8) {
      const year = parseInt(dateStr.substr(0, 4));
      const month = parseInt(dateStr.substr(4, 2)) - 1; // JS months are 0-indexed
      const day = parseInt(dateStr.substr(6, 2));
      
      if (dateStr.length >= 15) {
        const hour = parseInt(dateStr.substr(9, 2));
        const minute = parseInt(dateStr.substr(11, 2));
        const second = parseInt(dateStr.substr(13, 2));
        return new Date(year, month, day, hour, minute, second);
      }
      
      return new Date(year, month, day);
    }
    
    return new Date(dateStr);
  }

  private normalizeJSONEvent(item: RawJSONEvent): RawAcademicEvent | null {
    if (!item || typeof item !== 'object') return null;

    const title = item.title || item.summary || item.name || item.event;
    const start_date = item.start_date || item.date || item.start || item.startDate;

    if (!title || !start_date) return null;

    return {
      title,
      description: item.description,
      start_date: new Date(start_date),
      end_date: item.end_date ? new Date(item.end_date) : undefined,
      event_type: item.event_type || item.type,
      location: item.location,
      recurring: item.recurring,
      metadata: item.metadata
    };
  }

  private parseRegistrarData(data: RegistrarData, format: string): RegistrarData {
    // This would parse institution-specific registrar data
    return data;
  }

  private extractSemesterInfo(data: RegistrarData): Array<{
    name: string;
    term_type: TermType;
    academic_year: string;
    start_date: Date;
    end_date: Date;
  }> {
    // Extract semester information from registrar data
    return [];
  }

  private extractCourseEnrollments(data: RegistrarData): Array<{
    code: string;
    name: string;
    credits: number;
    instructor?: string;
    exam_date?: Date;
  }> {
    // Extract course enrollments from registrar data
    return [];
  }

  private async createSemesterFromEvent(event: ProcessedAcademicEvent, userId: string): Promise<void> {
    // Extract semester info from event
    const semesterData: SemesterInsert = {
      user_id: userId,
      name: event.title,
      term_type: this.inferTermType(event.title),
      academic_year: this.inferAcademicYear(event.start_date),
      start_date: event.start_date.toISOString(),
      end_date: (event.end_date || event.start_date).toISOString()
    };

    await semestersService.createSemester(semesterData);
  }

  private async createAssignmentFromEvent(event: ProcessedAcademicEvent, userId: string): Promise<void> {
    const assignmentData: AssignmentInsert = {
      user_id: userId,
      title: event.title,
      description: event.description,
      due_date: event.start_date.toISOString(),
      assignment_type: this.inferAssignmentType(event.title),
      priority: 'Medium',
      status: 'Not Started',
      academic_metadata: {
        source_calendar: 'academic_calendar_import',
        detection_reasons: event.classification_reasons
      }
    };

    await assignmentsService.createAssignment(assignmentData);
  }

  private inferTermType(title: string): TermType {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('fall')) return 'fall';
    if (titleLower.includes('spring')) return 'spring';
    if (titleLower.includes('summer')) return 'summer';
    if (titleLower.includes('winter')) return 'winter';
    
    return 'semester1'; // default
  }

  private inferAcademicYear(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Academic year typically starts in August/September
    if (month >= 7) { // August or later
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  private inferAssignmentType(title: string): AssignmentType {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('exam') || titleLower.includes('final') || titleLower.includes('midterm')) {
      return 'exam';
    }
    if (titleLower.includes('quiz')) return 'quiz';
    if (titleLower.includes('project')) return 'project';
    if (titleLower.includes('paper') || titleLower.includes('essay')) return 'paper';
    if (titleLower.includes('presentation')) return 'presentation';
    if (titleLower.includes('lab')) return 'lab';
    
    return 'assignment'; // default
  }

  private generateWarnings(processed: ProcessedAcademicEvent[], filtered: ProcessedAcademicEvent[]): string[] {
    const warnings: string[] = [];
    
    if (processed.length > filtered.length) {
      warnings.push(`${processed.length - filtered.length} events were filtered out due to low confidence scores`);
    }
    
    const lowConfidenceEvents = processed.filter(e => e.confidence_score < 0.6).length;
    if (lowConfidenceEvents > 0) {
      warnings.push(`${lowConfidenceEvents} events have low confidence scores and may need manual review`);
    }
    
    return warnings;
  }
}

// Export singleton instance
export const academicCalendarImporter = new AcademicCalendarImporter();