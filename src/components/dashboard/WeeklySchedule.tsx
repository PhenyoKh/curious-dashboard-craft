
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2, Edit2, Trash2, Repeat } from 'lucide-react';
import { getThisWeeksScheduleEvents, checkEventConflicts, scheduleService } from '../../services/supabaseService';
import { CalendarService, type CalendarItem } from '../../services/calendarService';
import { RecurrenceService } from '../../services/recurrenceService';
import { TimezoneService } from '../../services/timezoneService';
import { UserPreferencesService } from '../../services/userPreferencesService';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../integrations/supabase/types';

interface WeeklyScheduleProps {
  onAddEvent: () => void;
  onEditEvent?: (event: Database['public']['Tables']['schedule_events']['Row']) => void;
  onDeleteEvent?: (eventId: string) => void;
  refreshKey?: number;
}

export const WeeklySchedule = ({ onAddEvent, onEditEvent, onDeleteEvent, refreshKey }: WeeklyScheduleProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictingEventIds, setConflictingEventIds] = useState<Set<string>>(new Set());
  const [userTimezone, setUserTimezone] = useState<string>('UTC');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('24h');

  const fetchCalendarItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CalendarService.getCurrentWeekItems();
      setCalendarItems(data || []);
      
      // Check for conflicts among events (only for actual schedule events)
      const scheduleEvents = data.filter(item => item.type === 'event')
        .map(item => item.originalData as Database['public']['Tables']['schedule_events']['Row']);
      await checkForConflicts(scheduleEvents);
    } catch (error) {
      console.error('Error fetching calendar items:', error);
      setError('Failed to load schedule items');
    } finally {
      setLoading(false);
    }
  };

  // Check for conflicts among all events
  const checkForConflicts = async (events: Database['public']['Tables']['schedule_events']['Row'][]) => {
    try {
      const conflictIds = new Set<string>();
      
      for (const event of events) {
        const conflicts = await checkEventConflicts(
          event.start_time,
          event.end_time,
          event.id
        );
        
        if (conflicts.length > 0) {
          conflictIds.add(event.id);
          conflicts.forEach(conflict => conflictIds.add(conflict.id));
        }
      }
      
      setConflictingEventIds(conflictIds);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  useEffect(() => {
    fetchCalendarItems();
    loadUserPreferences();
  }, []);

  // Load user timezone preferences
  const loadUserPreferences = async () => {
    if (!user?.id) return;
    
    try {
      const preferences = await UserPreferencesService.getUserPreferences(user.id);
      setUserTimezone(preferences.user_timezone);
      setTimeFormat(preferences.time_format);
    } catch (error) {
      console.warn('Error loading user preferences:', error);
      setUserTimezone(TimezoneService.getUserTimezone());
    }
  };

  // Refresh when refreshKey changes
  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      fetchCalendarItems();
    }
  }, [refreshKey]);

  // Function to refresh events (can be called after creating new events)
  const refreshEvents = () => {
    fetchCalendarItems();
  };

  const getEventColors = (eventType: string) => {
    switch (eventType?.toLowerCase()) {
      case 'lecture':
        return 'bg-blue-50';
      case 'lab':
      case 'lab session':
        return 'bg-green-50';
      case 'office hours':
        return 'bg-purple-50';
      case 'exam':
        return 'bg-red-50';
      case 'study group':
        return 'bg-yellow-50';
      default:
        return 'bg-gray-50';
    }
  };

  // Helper to get recurrence information for an event
  const getRecurrenceInfo = (event: Database['public']['Tables']['schedule_events']['Row']) => {
    const isRecurring = event.is_recurring;
    const patternStr = scheduleService.extractRecurrencePattern(event.description);
    const cleanDescription = scheduleService.extractOriginalDescription(event.description);
    
    let recurrenceDescription = '';
    if (isRecurring && patternStr) {
      try {
        const pattern = JSON.parse(patternStr);
        recurrenceDescription = RecurrenceService.getRecurrenceDescription(pattern);
      } catch (error) {
        console.warn('Failed to parse recurrence pattern:', error);
      }
    }
    
    return {
      isRecurring,
      description: cleanDescription,
      recurrenceDescription
    };
  };

  const groupItemsByDay = () => {
    const groupedItems: { [key: string]: CalendarItem[] } = {};
    
    calendarItems.forEach(item => {
      const date = item.start;
      const dayKey = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (!groupedItems[dayKey]) {
        groupedItems[dayKey] = [];
      }
      groupedItems[dayKey].push(item);
    });

    // Sort items within each day by start time, with all-day items first
    Object.keys(groupedItems).forEach(day => {
      groupedItems[day].sort((a, b) => {
        // All-day items (assignments/exams) come first
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        
        // Then sort by time
        return a.start.getTime() - b.start.getTime();
      });
    });

    return groupedItems;
  };

  const handleViewAllSchedule = () => {
    navigate('/schedule');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-800">This Week's Schedule</h2>
          <Button
            variant="ghost"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium p-1"
            onClick={handleViewAllSchedule}
          >
            View All
          </Button>
        </div>
        <Button
          variant="ghost"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          onClick={onAddEvent}
        >
          + Add Event
        </Button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading schedule...</span>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : calendarItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-2">No events or assignments scheduled this week.</p>
          <Button
            variant="outline"
            onClick={onAddEvent}
            className="text-sm"
          >
            Add your first event
          </Button>
        </div>
      ) : (
        <div className="space-y-4 max-h-60 overflow-y-auto">
          {Object.entries(groupItemsByDay()).map(([day, items]) => (
            <div key={day}>
              <h3 className="font-medium text-gray-800 mb-2">{day}</h3>
              <div className="space-y-2 ml-4">
                {items.map((item) => {
                  const colors = CalendarService.getItemColor(item);
                  const isOverdue = CalendarService.isOverdue(item);
                  
                  // For events, check if there are conflicts
                  const hasConflict = item.type === 'event' && 
                    conflictingEventIds.has((item.originalData as Database['public']['Tables']['schedule_events']['Row']).id);
                  const conflictClass = hasConflict ? 'ring-2 ring-red-400 ring-opacity-60' : '';
                  
                  // Get recurrence info for events
                  const recurrenceInfo = item.type === 'event' ? 
                    getRecurrenceInfo(item.originalData as Database['public']['Tables']['schedule_events']['Row']) :
                    { isRecurring: false, description: '', recurrenceDescription: '' };
                  
                  // Format time display
                  let timeDisplay = '';
                  if (item.isAllDay) {
                    timeDisplay = item.type === 'assignment' ? 'DUE' : 
                                 item.type === 'exam' ? 'EXAM' : 'All Day';
                  } else {
                    const startTime = item.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const endTime = item.end?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime;
                  }
                  
                  return (
                    <div key={item.id} className={`group relative grid grid-cols-3 gap-4 items-center p-2 ${colors.bg} ${conflictClass} ${isOverdue ? 'animate-pulse' : ''} rounded-lg hover:shadow-sm transition-shadow`}>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{item.title}</span>
                        
                        {/* Type indicator */}
                        <span className={`text-xs px-1 py-0.5 rounded font-medium ${
                          item.type === 'exam' ? 'bg-red-200 text-red-800' :
                          item.type === 'assignment' ? 'bg-orange-200 text-orange-800' : 
                          'bg-blue-200 text-blue-800'
                        }`}>
                          {item.type.toUpperCase()}
                        </span>
                        
                        {/* Priority indicator for assignments */}
                        {item.priority && item.type === 'assignment' && (
                          <span className={`text-xs font-bold ${
                            item.priority === 'high' ? 'text-red-600' :
                            item.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {item.priority.charAt(0).toUpperCase()}
                          </span>
                        )}
                        
                        {/* Recurrence indicator */}
                        {recurrenceInfo.isRecurring && (
                          <span 
                            className="text-xs text-blue-600 font-medium" 
                            title={`Recurring event: ${recurrenceInfo.recurrenceDescription}`}
                          >
                            <Repeat className="w-3 h-3 inline" />
                          </span>
                        )}
                        
                        {/* Conflict indicator */}
                        {hasConflict && (
                          <span className="text-xs text-red-600 font-medium" title="This event has time conflicts">
                            ⚠️
                          </span>
                        )}
                        
                        {/* Overdue indicator */}
                        {isOverdue && (
                          <span className="text-xs text-red-600 font-medium" title="Overdue">
                            🔥
                          </span>
                        )}
                      </div>
                      
                      <span className="text-sm text-gray-600 text-center">{item.subject || 'No subject'}</span>
                      
                      <div className="flex items-center justify-end">
                        <span className="text-sm text-gray-500">{timeDisplay}</span>
                        
                        {/* Action buttons - show on hover */}
                        <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                          {onEditEvent && item.type === 'event' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditEvent(item.originalData as Database['public']['Tables']['schedule_events']['Row']);
                              }}
                              className="p-1 hover:bg-blue-100 rounded text-blue-600 hover:text-blue-700"
                              title="Edit event"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          {onDeleteEvent && item.type === 'event' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
                                  onDeleteEvent((item.originalData as Database['public']['Tables']['schedule_events']['Row']).id);
                                }
                              }}
                              className="p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-700"
                              title="Delete event"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
