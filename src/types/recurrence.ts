/**
 * Recurrence Pattern Types for Schedule Events
 * Supports daily, weekly, monthly, and yearly patterns
 */

export enum RecurrenceType {
  DAILY = 'daily',
  WEEKLY = 'weekly', 
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum WeekDay {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6
}

export enum MonthlyRecurrenceBy {
  DAY_OF_MONTH = 'day_of_month',    // e.g., 15th of every month
  DAY_OF_WEEK = 'day_of_week'       // e.g., 2nd Tuesday of every month
}

export enum WeekOfMonth {
  FIRST = 1,
  SECOND = 2,
  THIRD = 3,
  FOURTH = 4,
  LAST = -1
}

export interface RecurrencePattern {
  type: RecurrenceType;
  interval: number; // Every N days/weeks/months/years
  
  // For weekly recurrence - which days of the week
  daysOfWeek?: WeekDay[];
  
  // For monthly recurrence
  monthlyBy?: MonthlyRecurrenceBy;
  dayOfMonth?: number; // 1-31, for DAY_OF_MONTH
  weekOfMonth?: WeekOfMonth; // for DAY_OF_WEEK
  weekDay?: WeekDay; // for DAY_OF_WEEK (which day of the week)
  
  // For yearly recurrence
  yearlyBy?: MonthlyRecurrenceBy; // reuse monthly logic
  month?: number; // 1-12, which month of the year
  
  // End conditions (one of these should be set)
  endDate?: string; // ISO date string
  occurrences?: number; // Number of occurrences
  
  // Advanced options
  workdaysOnly?: boolean; // Skip weekends for daily
  skipHolidays?: boolean; // Skip holidays (future feature)
}

export interface RecurrenceInfo {
  isRecurring: boolean;
  pattern?: RecurrencePattern;
  parentEventId?: string; // For instances, reference to master event
  isException?: boolean; // If this instance was modified
  originalDate?: string; // Original date before modification
}

export interface RecurringEventInstance {
  date: string; // ISO date string for this instance
  startTime: string; // Time portion
  endTime: string; // Time portion
  isModified: boolean; // Whether this instance differs from pattern
  isSkipped: boolean; // Whether this instance is skipped
}

// Utility type for recurrence generation
export interface RecurrenceGenerationOptions {
  startDate: string;
  endDate: string;
  maxOccurrences?: number;
  includeExceptions?: boolean;
}

// Series management types
export interface RecurringSeries {
  seriesId: string;
  masterEventId: string;
  pattern: RecurrencePattern;
  instances: RecurringEventInstance[];
  exceptions: string[]; // Event IDs that were modified or deleted
}

export interface SeriesEditOptions {
  editType: 'this_only' | 'this_and_following' | 'all_events';
  fromDate?: string; // For 'this_and_following'
}

export interface SeriesPreview {
  nextOccurrences: RecurringEventInstance[];
  totalCount: number;
  endDate?: string;
}

// Helper functions type
export interface RecurrenceUtils {
  generateInstances(pattern: RecurrencePattern, baseEvent: any, options: RecurrenceGenerationOptions): RecurringEventInstance[];
  getNextOccurrence(pattern: RecurrencePattern, fromDate: string): string | null;
  isRecurrenceValid(pattern: RecurrencePattern): { valid: boolean; errors: string[] };
  getSeriesPreview(pattern: RecurrencePattern, baseEvent: any): SeriesPreview;
}