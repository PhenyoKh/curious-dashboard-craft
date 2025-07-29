import { 
  RecurrencePattern, 
  RecurrenceType, 
  WeekDay, 
  MonthlyRecurrenceBy,
  WeekOfMonth,
  RecurringEventInstance,
  RecurrenceGenerationOptions,
  SeriesPreview
} from '../types/recurrence';

/**
 * Recurrence Service - Handles recurring event generation and management
 */
export class RecurrenceService {
  
  /**
   * Generate recurring event instances based on a pattern
   */
  static generateInstances(
    pattern: RecurrencePattern,
    baseEvent: {
      title: string;
      start_time: string;
      end_time: string;
      subject_id?: string;
      event_type?: string;
      description?: string;
    },
    options: RecurrenceGenerationOptions
  ): RecurringEventInstance[] {
    const instances: RecurringEventInstance[] = [];
    const startDate = new Date(options.startDate);
    const endDate = new Date(options.endDate);
    const baseStartTime = new Date(baseEvent.start_time);
    const baseEndTime = new Date(baseEvent.end_time);
    
    // Calculate duration in milliseconds
    const durationMs = baseEndTime.getTime() - baseStartTime.getTime();
    
    let currentDate = new Date(startDate);
    let occurrenceCount = 0;
    const maxOccurrences = options.maxOccurrences || pattern.occurrences || 365;
    
    while (
      currentDate <= endDate && 
      occurrenceCount < maxOccurrences &&
      (!pattern.endDate || currentDate <= new Date(pattern.endDate))
    ) {
      if (this.shouldIncludeDate(currentDate, pattern, baseStartTime)) {
        const instanceStartTime = new Date(currentDate);
        instanceStartTime.setHours(baseStartTime.getHours(), baseStartTime.getMinutes(), 0, 0);
        
        const instanceEndTime = new Date(instanceStartTime.getTime() + durationMs);
        
        instances.push({
          date: currentDate.toISOString().split('T')[0],
          startTime: instanceStartTime.toTimeString().substring(0, 5),
          endTime: instanceEndTime.toTimeString().substring(0, 5),
          isModified: false,
          isSkipped: false
        });
        
        occurrenceCount++;
      }
      
      currentDate = this.getNextDate(currentDate, pattern);
    }
    
    return instances;
  }
  
  /**
   * Check if a specific date should be included in the recurrence
   */
  private static shouldIncludeDate(
    date: Date, 
    pattern: RecurrencePattern, 
    baseDate: Date
  ): boolean {
    const dayOfWeek = date.getDay() as WeekDay;
    
    switch (pattern.type) {
      case RecurrenceType.DAILY:
        // Skip weekends if workdaysOnly is true
        if (pattern.workdaysOnly && (dayOfWeek === WeekDay.SATURDAY || dayOfWeek === WeekDay.SUNDAY)) {
          return false;
        }
        return true;
        
      case RecurrenceType.WEEKLY:
        // Only include if this day of the week is selected
        return pattern.daysOfWeek ? pattern.daysOfWeek.includes(dayOfWeek) : dayOfWeek === baseDate.getDay();
        
      case RecurrenceType.MONTHLY:
        return this.shouldIncludeMonthlyDate(date, pattern, baseDate);
        
      case RecurrenceType.YEARLY:
        return this.shouldIncludeYearlyDate(date, pattern, baseDate);
        
      default:
        return false;
    }
  }

  /**
   * Check if a date should be included for monthly recurrence
   */
  private static shouldIncludeMonthlyDate(
    date: Date, 
    pattern: RecurrencePattern, 
    baseDate: Date
  ): boolean {
    const monthlyBy = pattern.monthlyBy || MonthlyRecurrenceBy.DAY_OF_MONTH;
    
    if (monthlyBy === MonthlyRecurrenceBy.DAY_OF_MONTH) {
      // Use specified day of month, or default to base date's day
      const targetDay = pattern.dayOfMonth || baseDate.getDate();
      return date.getDate() === targetDay;
    } else {
      // DAY_OF_WEEK: e.g., 2nd Tuesday of every month
      const targetWeekDay = pattern.weekDay ?? baseDate.getDay();
      const targetWeekOfMonth = pattern.weekOfMonth ?? this.getWeekOfMonth(baseDate);
      
      if (date.getDay() !== targetWeekDay) return false;
      
      const weekOfMonth = this.getWeekOfMonth(date);
      
      if (targetWeekOfMonth === WeekOfMonth.LAST) {
        return this.isLastWeekOfMonth(date);
      } else {
        return weekOfMonth === targetWeekOfMonth;
      }
    }
  }

  /**
   * Check if a date should be included for yearly recurrence
   */
  private static shouldIncludeYearlyDate(
    date: Date, 
    pattern: RecurrencePattern, 
    baseDate: Date
  ): boolean {
    const targetMonth = pattern.month ?? baseDate.getMonth();
    if (date.getMonth() !== targetMonth) return false;
    
    const yearlyBy = pattern.yearlyBy || MonthlyRecurrenceBy.DAY_OF_MONTH;
    
    if (yearlyBy === MonthlyRecurrenceBy.DAY_OF_MONTH) {
      const targetDay = pattern.dayOfMonth || baseDate.getDate();
      return date.getDate() === targetDay;
    } else {
      // DAY_OF_WEEK: e.g., 3rd Thursday in November
      const targetWeekDay = pattern.weekDay ?? baseDate.getDay();
      const targetWeekOfMonth = pattern.weekOfMonth ?? this.getWeekOfMonth(baseDate);
      
      if (date.getDay() !== targetWeekDay) return false;
      
      const weekOfMonth = this.getWeekOfMonth(date);
      
      if (targetWeekOfMonth === WeekOfMonth.LAST) {
        return this.isLastWeekOfMonth(date);
      } else {
        return weekOfMonth === targetWeekOfMonth;
      }
    }
  }

  /**
   * Get which week of the month a date falls in (1-4)
   */
  private static getWeekOfMonth(date: Date): number {
    const dayOfMonth = date.getDate();
    return Math.ceil(dayOfMonth / 7);
  }

  /**
   * Check if a date is in the last week of its month
   */
  private static isLastWeekOfMonth(date: Date): boolean {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const weekOfMonth = this.getWeekOfMonth(date);
    const maxPossibleWeek = Math.ceil(daysInMonth / 7);
    
    // Last week if it's the highest possible week OR if adding 7 days goes to next month
    return weekOfMonth === maxPossibleWeek || 
           (date.getDate() + 7 > daysInMonth);
  }
  
  /**
   * Get the next date based on recurrence pattern
   */
  private static getNextDate(currentDate: Date, pattern: RecurrencePattern): Date {
    const nextDate = new Date(currentDate);
    
    switch (pattern.type) {
      case RecurrenceType.DAILY:
        nextDate.setDate(nextDate.getDate() + pattern.interval);
        break;
        
      case RecurrenceType.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 1); // Move to next day, filtering will handle week logic
        break;
        
      case RecurrenceType.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + pattern.interval);
        break;
        
      case RecurrenceType.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + pattern.interval);
        break;
    }
    
    return nextDate;
  }
  
  /**
   * Get the next occurrence date for a given pattern
   */
  static getNextOccurrence(pattern: RecurrencePattern, fromDate: string): string | null {
    const startDate = new Date(fromDate);
    const nextDate = this.getNextDate(startDate, pattern);
    
    // Generate instances for a short period to find the next valid occurrence
    const instances = this.generateInstances(pattern, {
      title: 'temp',
      start_time: fromDate,
      end_time: fromDate
    }, {
      startDate: nextDate.toISOString(),
      endDate: new Date(nextDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ahead
      maxOccurrences: 1
    });
    
    return instances.length > 0 ? `${instances[0].date}T${instances[0].startTime}:00` : null;
  }
  
  /**
   * Validate a recurrence pattern
   */
  static isRecurrenceValid(pattern: RecurrencePattern): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate interval
    if (pattern.interval < 1) {
      errors.push('Interval must be at least 1');
    }
    
    // Validate weekly pattern
    if (pattern.type === RecurrenceType.WEEKLY) {
      if (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0) {
        errors.push('Weekly recurrence must specify at least one day of the week');
      }
    }
    
    // Validate end conditions
    if (pattern.endDate && pattern.occurrences) {
      errors.push('Cannot specify both end date and occurrence count');
    }
    
    if (pattern.endDate) {
      const endDate = new Date(pattern.endDate);
      if (isNaN(endDate.getTime())) {
        errors.push('Invalid end date');
      }
    }
    
    if (pattern.occurrences && pattern.occurrences < 1) {
      errors.push('Occurrence count must be at least 1');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Create expanded events from a recurring pattern for database storage
   */
  static async expandRecurringEvent(
    baseEvent: { title: string; start_time: string; end_time: string; [key: string]: unknown },
    pattern: RecurrencePattern,
    timeRange: { start: string; end: string }
  ): Promise<Array<{ title: string; start_time: string; end_time: string; [key: string]: unknown }>> {
    const instances = this.generateInstances(pattern, baseEvent, {
      startDate: timeRange.start,
      endDate: timeRange.end,
      maxOccurrences: 100 // Reasonable limit for expansion
    });
    
    return instances.map(instance => ({
      ...baseEvent,
      start_time: `${instance.date}T${instance.startTime}:00`,
      end_time: `${instance.date}T${instance.endTime}:00`,
      is_recurring: true,
      recurrence_pattern: JSON.stringify(pattern)
    }));
  }
  
  /**
   * Calculate human-readable recurrence description
   */
  static getRecurrenceDescription(pattern: RecurrencePattern): string {
    const { type, interval, daysOfWeek, endDate, occurrences, workdaysOnly } = pattern;
    
    let description = `Repeats ${interval > 1 ? `every ${interval} ` : ''}`;
    
    switch (type) {
      case RecurrenceType.DAILY:
        description += `day${interval > 1 ? 's' : ''}`;
        if (workdaysOnly) description += ' (weekdays only)';
        break;
        
      case RecurrenceType.WEEKLY:
        description += `week${interval > 1 ? 's' : ''}`;
        if (daysOfWeek && daysOfWeek.length > 0) {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          description += ` on ${daysOfWeek.map(d => dayNames[d]).join(', ')}`;
        }
        break;
        
      case RecurrenceType.MONTHLY:
        description += `month${interval > 1 ? 's' : ''}`;
        break;
        
      case RecurrenceType.YEARLY:
        description += `year${interval > 1 ? 's' : ''}`;
        break;
    }
    
    if (endDate) {
      description += ` until ${new Date(endDate).toLocaleDateString()}`;
    } else if (occurrences) {
      description += ` for ${occurrences} times`;
    }
    
    return description;
  }

  /**
   * Get a preview of upcoming recurring event instances
   */
  static getSeriesPreview(
    pattern: RecurrencePattern,
    baseEvent: {
      title: string;
      start_time: string;
      end_time: string;
    }
  ): SeriesPreview {
    const startDate = new Date(baseEvent.start_time);
    const previewEndDate = new Date(startDate);
    previewEndDate.setFullYear(previewEndDate.getFullYear() + 1); // Preview 1 year ahead
    
    const instances = this.generateInstances(pattern, baseEvent, {
      startDate: startDate.toISOString(),
      endDate: previewEndDate.toISOString(),
      maxOccurrences: 10 // Limit preview to 10 instances
    });

    // Calculate total count if we have end conditions
    let totalCount = instances.length;
    if (pattern.occurrences) {
      totalCount = pattern.occurrences;
    } else if (pattern.endDate) {
      const fullInstances = this.generateInstances(pattern, baseEvent, {
        startDate: startDate.toISOString(),
        endDate: pattern.endDate,
        maxOccurrences: 1000 // High limit to count all
      });
      totalCount = fullInstances.length;
    }

    return {
      nextOccurrences: instances,
      totalCount,
      endDate: pattern.endDate
    };
  }
}