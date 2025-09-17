/**
 * Unified Calendar Service - Combines schedule events and assignments for calendar display
 */

import { getScheduleEvents, getAssignmentsWithDetails } from './supabaseService';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';

type ScheduleEvent = Database['public']['Tables']['schedule_events']['Row'] & { subject_name?: string };
type Assignment = Database['public']['Tables']['assignments']['Row'];

// Unified calendar item type
export interface CalendarItem {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  type: 'event' | 'assignment' | 'exam';
  subType?: string; // event_type for events, assignment_type for assignments
  status?: string;
  priority?: string;
  description?: string;
  location?: string;
  subject?: string;
  subjectColor?: string;
  isAllDay: boolean;
  isRecurring?: boolean;
  originalData: ScheduleEvent | Assignment; // Keep reference to original data
}

export interface CalendarDay {
  date: Date;
  items: CalendarItem[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export interface CalendarWeek {
  days: CalendarDay[];
  weekNumber: number;
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-based
  weeks: CalendarWeek[];
  totalItems: number;
}

export class CalendarService {
  
  /**
   * Convert schedule event to calendar item
   */
  private static scheduleEventToCalendarItem(event: ScheduleEvent): CalendarItem {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    
    return {
      id: `event_${event.id}`,
      title: event.title,
      start,
      end,
      type: 'event',
      subType: event.event_type || 'event',
      description: event.description || undefined,
      location: event.location || undefined,
      subject: event.subject_name || undefined, // Use subject_name instead of subject_id
      isAllDay: false,
      isRecurring: event.is_recurring || false,
      originalData: event
    };
  }

  /**
   * Convert assignment to calendar item
   */
  private static assignmentToCalendarItem(assignment: Assignment & { subject_name?: string; subject_color?: string }): CalendarItem {
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : new Date();
    
    // Determine if it's an exam or regular assignment
    const isExam = assignment.assignment_type?.toLowerCase().includes('exam') || 
                   assignment.assignment_type?.toLowerCase().includes('test') ||
                   assignment.assignment_type?.toLowerCase().includes('quiz');
    
    return {
      id: `assignment_${assignment.id}`,
      title: assignment.title,
      start: dueDate,
      type: isExam ? 'exam' : 'assignment',
      subType: assignment.assignment_type || 'assignment',
      status: assignment.status || 'pending',
      priority: assignment.priority || 'medium',
      description: assignment.description || undefined,
      subject: assignment.subject_name || undefined,
      subjectColor: assignment.subject_color || undefined,
      isAllDay: true, // Assignments are typically all-day items
      originalData: assignment
    };
  }

  /**
   * Get all calendar items for a date range
   */
  static async getCalendarItems(startDate: Date, endDate: Date): Promise<CalendarItem[]> {
    try {
      // Fetch both events and assignments in parallel
      const [events, assignments] = await Promise.all([
        getScheduleEvents(),
        getAssignmentsWithDetails()
      ]);

      const calendarItems: CalendarItem[] = [];

      // Convert schedule events
      events.forEach(event => {
        const eventStart = new Date(event.start_time);
        if (eventStart >= startDate && eventStart <= endDate) {
          calendarItems.push(this.scheduleEventToCalendarItem(event));
        }
      });

      // Convert assignments
      assignments.forEach(assignment => {
        if (assignment.due_date) {
          const dueDate = new Date(assignment.due_date);
          if (dueDate >= startDate && dueDate <= endDate) {
            calendarItems.push(this.assignmentToCalendarItem(assignment));
          }
        }
      });

      // Sort by start time
      calendarItems.sort((a, b) => a.start.getTime() - b.start.getTime());

      return calendarItems;
    } catch (error) {
      logger.error('Error fetching calendar items:', error);
      throw error;
    }
  }

  /**
   * Get calendar items for a specific month
   */
  static async getCalendarMonth(year: number, month: number): Promise<CalendarMonth> {
    // Get start and end of month view (including leading/trailing days)
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Extend to full weeks
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay()); // Go to Sunday
    
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay())); // Go to Saturday
    
    const items = await this.getCalendarItems(startDate, endDate);
    
    // Group items by day
    const itemsByDay = new Map<string, CalendarItem[]>();
    items.forEach(item => {
      const dateKey = item.start.toDateString();
      if (!itemsByDay.has(dateKey)) {
        itemsByDay.set(dateKey, []);
      }
      itemsByDay.get(dateKey)!.push(item);
    });

    // Generate calendar structure
    const weeks: CalendarWeek[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentDate = new Date(startDate);
    let weekNumber = 1;

    while (currentDate <= endDate) {
      const week: CalendarWeek = { days: [], weekNumber };
      
      for (let i = 0; i < 7; i++) {
        const dayItems = itemsByDay.get(currentDate.toDateString()) || [];
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        
        week.days.push({
          date: new Date(currentDate),
          items: dayItems,
          isCurrentMonth: currentDate.getMonth() === month,
          isToday: currentDate.toDateString() === today.toDateString(),
          isWeekend
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      weeks.push(week);
      weekNumber++;
    }

    return {
      year,
      month,
      weeks,
      totalItems: items.length
    };
  }

  /**
   * Get calendar items for current week
   */
  static async getCurrentWeekItems(): Promise<CalendarItem[]> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return this.getCalendarItems(startOfWeek, endOfWeek);
  }

  /**
   * Get calendar items for a specific day
   */
  static async getDayItems(date: Date): Promise<CalendarItem[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.getCalendarItems(startOfDay, endOfDay);
  }

  /**
   * Get color for calendar item based on type and status
   */
  static getItemColor(item: CalendarItem): { bg: string; border: string; text: string } {
    switch (item.type) {
      case 'event':
        switch (item.subType?.toLowerCase()) {
          case 'lecture':
            return { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' };
          case 'lab':
          case 'lab session':
            return { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800' };
          case 'office hours':
            return { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800' };
          case 'study group':
            return { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800' };
          case 'meeting':
            return { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-800' };
          case 'break':
            return { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-800' };
          case 'assignment':
            return { bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-800' };
          default:
            return { bg: 'bg-gray-100', border: 'border-gray-500', text: 'text-gray-800' };
        }
        
      case 'exam':
        switch (item.status) {
          case 'completed':
            return { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800' };
          case 'in_progress':
            return { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800' };
          default:
            return { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800' };
        }
        
      case 'assignment':
        switch (item.status) {
          case 'completed':
            return { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800' };
          case 'in_progress':
            return { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' };
          case 'overdue':
            return { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800' };
          default:
            switch (item.priority) {
              case 'high':
                return { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-800' };
              case 'medium':
                return { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' };
              case 'low':
                return { bg: 'bg-gray-100', border: 'border-gray-500', text: 'text-gray-800' };
              default:
                return { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' };
            }
        }
        
      default:
        return { bg: 'bg-gray-100', border: 'border-gray-500', text: 'text-gray-800' };
    }
  }

  /**
   * Get abbreviated text for calendar display
   */
  static getAbbreviatedText(item: CalendarItem): string {
    const typePrefix = item.type === 'exam' ? 'EXAM' : 
                       item.type === 'assignment' ? 'DUE' : 
                       item.subType?.toUpperCase() || 'EVENT';
    
    // For all-day items, just show the prefix
    if (item.isAllDay) {
      return `${typePrefix}: ${item.title.length > 20 ? item.title.substring(0, 20) + '...' : item.title}`;
    }
    
    // For timed events, include time
    const time = item.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${time} ${typePrefix}`;
  }

  /**
   * Check if an item is overdue
   */
  static isOverdue(item: CalendarItem): boolean {
    if (item.type === 'event') return false;
    if (item.status === 'completed') return false;
    
    const now = new Date();
    return item.start < now;
  }

  /**
   * Get upcoming items (next 7 days)
   */
  static async getUpcomingItems(limit = 10): Promise<CalendarItem[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekFromNow = new Date(today);
    weekFromNow.setDate(today.getDate() + 7);
    weekFromNow.setHours(23, 59, 59, 999);
    
    const items = await this.getCalendarItems(today, weekFromNow);
    
    return items
      .filter(item => item.start >= today)
      .slice(0, limit);
  }

  /**
   * Get calendar month data in the format expected by AssignmentCalendarView
   */
  static async getCalendarMonthView(date: Date): Promise<{
    weeks: Array<Array<{
      date: Date;
      items: CalendarItem[];
      isCurrentMonth: boolean;
      isToday: boolean;
    }>>;
    monthName: string;
    year: number;
  }> {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const calendarMonth = await this.getCalendarMonth(year, month);
    
    // Convert CalendarWeek[] to the expected format
    const weeks = calendarMonth.weeks.map(week => 
      week.days.map(day => ({
        date: day.date,
        items: day.items,
        isCurrentMonth: day.isCurrentMonth,
        isToday: day.isToday
      }))
    );
    
    // Get month name
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return {
      weeks,
      monthName: monthNames[month],
      year
    };
  }
}