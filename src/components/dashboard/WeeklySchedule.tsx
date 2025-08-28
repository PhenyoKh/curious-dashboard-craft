
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2, Edit2, Trash2, Repeat, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getThisWeeksScheduleEvents, checkEventConflicts, scheduleService } from '../../services/supabaseService';
import { CalendarService, type CalendarItem } from '../../services/calendarService';
import { RecurrenceService } from '../../services/recurrenceService';
import { TimezoneService } from '../../services/timezoneService';
import { UserPreferencesService } from '../../services/userPreferencesService';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '../../integrations/supabase/types';
import { logger } from '@/utils/logger';
import { getDisplaySubjectCode } from '@/utils/subjectCodeUtils';

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
  
  // Week navigation state
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, +1 = next week
  const [currentWeekRange, setCurrentWeekRange] = useState<{start: Date, end: Date, displayText: string} | null>(null);
  
  // Auto-refresh state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [weekTransitionMessage, setWeekTransitionMessage] = useState<string | null>(null);

  // Helper function to calculate week range based on offset
  const calculateWeekRange = (offset: number) => {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (offset * 7)); // Move by weeks
    
    // Calculate start of week (Sunday)
    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Calculate end of week (Saturday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Create display text
    const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short' });
    const startDay = startOfWeek.getDate();
    const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' });
    const endDay = endOfWeek.getDate();
    const year = endOfWeek.getFullYear();
    
    let displayText;
    if (startMonth === endMonth) {
      displayText = `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      displayText = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
    
    // Add context for current week
    if (offset === 0) {
      displayText = `This Week: ${displayText}`;
    } else if (offset === -1) {
      displayText = `Last Week: ${displayText}`;
    } else if (offset === 1) {
      displayText = `Next Week: ${displayText}`;
    }
    
    return {
      start: startOfWeek,
      end: endOfWeek,
      displayText
    };
  };

  const fetchCalendarItems = useCallback(async (isAutoRefresh = false) => {
    try {
      if (isAutoRefresh) {
        setIsAutoRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Calculate week range based on current offset
      const weekRange = calculateWeekRange(weekOffset);
      setCurrentWeekRange(weekRange);
      
      // Fetch calendar items for the calculated week range
      const data = await CalendarService.getCalendarItems(weekRange.start, weekRange.end);
      // Filter to show only events (not assignments or exams)
      const eventsOnly = (data || []).filter(item => item.type === 'event');
      setCalendarItems(eventsOnly);
      
      // Check for conflicts among events (only for actual schedule events)
      const scheduleEvents = eventsOnly
        .map(item => item.originalData as Database['public']['Tables']['schedule_events']['Row']);
      await checkForConflicts(scheduleEvents);
      
      // Update last refresh time
      setLastRefreshTime(new Date());
    } catch (error) {
      logger.error('Error fetching calendar items:', error);
      setError('Failed to load schedule items');
    } finally {
      setLoading(false);
      setIsAutoRefreshing(false);
    }
  }, [weekOffset]);

  // Load user timezone preferences  
  const loadUserPreferences = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const preferences = await UserPreferencesService.getUserPreferences(user.id);
      setUserTimezone(preferences.user_timezone);
      setTimeFormat(preferences.time_format);
    } catch (error) {
      logger.warn('Error loading user preferences:', error);
      setUserTimezone(TimezoneService.getUserTimezone());
    }
  }, [user?.id]);

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
      logger.error('Error checking conflicts:', error);
    }
  };

  useEffect(() => {
    fetchCalendarItems();
    loadUserPreferences();
  }, [weekOffset, fetchCalendarItems, loadUserPreferences]); // Re-fetch when week offset changes

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle keys when not typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePreviousWeek();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNextWeek();
          break;
        case 'Home':
        case 't':
        case 'T':
          event.preventDefault();
          handleToday();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Auto-refresh timer (every 5 minutes)
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const autoRefreshInterval = setInterval(() => {
      // Only refresh if the document is visible and user isn't actively interacting
      if (document.visibilityState === 'visible' && !loading && !isAutoRefreshing) {
        // Only auto-refresh if it's been more than 4.5 minutes since last refresh
        const timeSinceLastRefresh = Date.now() - lastRefreshTime.getTime();
        if (timeSinceLastRefresh >= 4.5 * 60 * 1000) { // 4.5 minutes
          fetchCalendarItems(true);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(autoRefreshInterval);
  }, [autoRefreshEnabled, loading, isAutoRefreshing, lastRefreshTime, fetchCalendarItems]);

  // Week transition detection (check every minute)
  useEffect(() => {
    const checkWeekTransition = () => {
      if (weekOffset === 0 && currentWeekRange) {
        const now = new Date();
        const currentWeekStart = currentWeekRange.start;
        const currentWeekEnd = currentWeekRange.end;
        
        // Check if current time is outside the displayed week range
        if (now < currentWeekStart || now > currentWeekEnd) {
          // We've crossed into a new week, update to show current week
          setWeekTransitionMessage('New week started, updating schedule...');
          fetchCalendarItems(true);
          
          // Clear the message after 3 seconds
          setTimeout(() => {
            setWeekTransitionMessage(null);
          }, 3000);
        }
      }
    };

    // Check immediately, then every minute
    checkWeekTransition();
    const weekTransitionTimer = setInterval(checkWeekTransition, 60 * 1000); // Check every minute

    return () => {
      if (weekTransitionTimer) {
        clearInterval(weekTransitionTimer);
      }
    };
  }, [weekOffset, currentWeekRange, fetchCalendarItems]);

  // Load user timezone preferences
  // Refresh when refreshKey changes
  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      fetchCalendarItems();
    }
  }, [refreshKey, fetchCalendarItems]);

  // Function to refresh events (can be called after creating new events)
  const refreshEvents = () => {
    fetchCalendarItems();
  };

  // Helper function to get type indicator colors based on item type and subtype
  const getTypeIndicatorColor = (item: CalendarItem) => {
    if (item.type === 'exam') {
      return 'bg-red-200 text-red-800';
    }
    if (item.type === 'assignment') {
      return 'bg-orange-200 text-orange-800';
    }
    
    // For events, use subType to determine color (matching database values)
    switch (item.subType?.toLowerCase()) {
      case 'class':
        return 'bg-blue-200 text-blue-800';
      case 'study':
        return 'bg-green-200 text-green-800';
      case 'exam':
        return 'bg-red-200 text-red-800';
      case 'assignment':
        return 'bg-orange-200 text-orange-800';
      case 'break':
        return 'bg-yellow-200 text-yellow-800';
      case 'other':
        return 'bg-purple-200 text-purple-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  // Helper function to get display label for type indicator
  const getTypeDisplayLabel = (item: CalendarItem) => {
    if (item.type === 'exam' || item.type === 'assignment') {
      return item.type.toUpperCase();
    }
    
    // For events, show user-friendly labels based on subType
    switch (item.subType?.toLowerCase()) {
      case 'class':
        return 'CLASS';
      case 'study':
        return 'STUDY';
      case 'exam':
        return 'EXAM';
      case 'assignment':
        return 'WORK';
      case 'break':
        return 'BREAK';
      case 'other':
        return 'OTHER';
      default:
        return (item.subType || item.type).toUpperCase();
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
        logger.warn('Failed to parse recurrence pattern:', error);
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

  // Week navigation handlers
  const handlePreviousWeek = () => {
    setWeekOffset(prev => prev - 1);
  };

  const handleNextWeek = () => {
    setWeekOffset(prev => prev + 1);
  };

  const handleToday = () => {
    setWeekOffset(0);
  };

  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchCalendarItems(false);
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
      
      {/* Week Navigation Bar */}
      <div className="flex items-center justify-center mb-4 gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousWeek}
          className="p-2 hover:bg-gray-100"
          title="Previous Week"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <div className="text-center min-w-[200px]">
          <span className="text-sm font-medium text-gray-700">
            {currentWeekRange?.displayText || 'Loading...'}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextWeek}
          className="p-2 hover:bg-gray-100"
          title="Next Week"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        
        {weekOffset !== 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="ml-2 text-xs px-3 py-1"
          >
            Today
          </Button>
        )}
      </div>
      
      {/* Week Transition Message */}
      {weekTransitionMessage && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">{weekTransitionMessage}</span>
          </div>
        </div>
      )}
      
      {/* Refresh Status and Controls */}
      <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          {isAutoRefreshing && (
            <div className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
          {!isAutoRefreshing && lastRefreshTime && (
            <span>
              Updated {Math.floor((Date.now() - lastRefreshTime.getTime()) / (1000 * 60))} minutes ago
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualRefresh}
          disabled={loading || isAutoRefreshing}
          className="h-6 px-2 text-xs hover:bg-gray-100"
          title="Refresh now"
        >
          {loading || isAutoRefreshing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </Button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your schedule...</p>
          </div>
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
      ) : (
        <div className={`transition-opacity duration-300 ${
          isAutoRefreshing ? 'opacity-75' : 'opacity-100'
        }`}>
          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-2 pb-2 mb-3 border-b border-gray-200">
            <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
              Event
            </div>
            <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
              Subject
            </div>
            <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wide">
              Type
            </div>
            <div className="col-span-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
              Date & Time
            </div>
          </div>
          
          {/* Events List - Fixed height with internal scrolling */}
          <div className="h-60 overflow-y-auto scroll-smooth border border-gray-100 rounded-lg bg-gray-50/30 p-2">
            <div className="space-y-2">
              {calendarItems.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <p className="text-muted-foreground mb-2">No events scheduled this week.</p>
                    <Button
                      variant="outline"
                      onClick={onAddEvent}
                      className="text-sm"
                    >
                      Add your first event
                    </Button>
                  </div>
                </div>
              ) : (
                calendarItems
                  .sort((a, b) => a.start.getTime() - b.start.getTime())
                  .map((item) => {
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
                
                // Format date and time display - optimized for better space utilization
                const dateDisplay = item.start.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                });
                
                let timeDisplay = '';
                let fullDateTime = '';
                let dateTimeTooltip = '';
                
                if (item.isAllDay) {
                  timeDisplay = 'All Day';
                  fullDateTime = `${dateDisplay} • ${timeDisplay}`;
                  dateTimeTooltip = `${item.start.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} - All Day`;
                } else {
                  const startTime = item.start.toLocaleTimeString([], { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  });
                  const endTime = item.end?.toLocaleTimeString([], { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  });
                  
                  // Use compact format with bullet separator
                  timeDisplay = endTime ? `${startTime}-${endTime}` : startTime;
                  fullDateTime = `${dateDisplay} • ${timeDisplay}`;
                  
                  // Full tooltip with complete date and time info
                  dateTimeTooltip = endTime 
                    ? `${item.start.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })} from ${startTime} to ${endTime}`
                    : `${item.start.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })} at ${startTime}`;
                }
                
                return (
                  <div key={item.id} className={`group relative grid grid-cols-12 gap-2 items-center p-3 ${colors.bg} ${conflictClass} ${isOverdue ? 'animate-pulse' : ''} rounded-lg hover:shadow-sm transition-shadow`}>
                    {/* Event Column */}
                    <div className="col-span-3 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium truncate">{item.title}</span>
                        {/* Indicators */}
                        <div className="flex items-center space-x-1">
                          {recurrenceInfo.isRecurring && (
                            <span 
                              className="text-xs text-blue-600 font-medium" 
                              title={`Recurring event: ${recurrenceInfo.recurrenceDescription}`}
                            >
                              <Repeat className="w-3 h-3 inline" />
                            </span>
                          )}
                          {hasConflict && (
                            <span className="text-xs text-red-600 font-medium" title="This event has time conflicts">
                              !
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-xs text-red-600 font-medium" title="Overdue">
                              !
                            </span>
                          )}
                        </div>
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-500 truncate mt-1">
                          {item.description}
                        </div>
                      )}
                    </div>
                    
                    {/* Subject Column */}
                    <div className="col-span-3 min-w-0">
                      <span className="text-sm text-gray-700 truncate">{getDisplaySubjectCode(item.subject)}</span>
                    </div>
                    
                    {/* Type Column */}
                    <div className="col-span-2 min-w-0">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${getTypeIndicatorColor(item)}`}>
                        {getTypeDisplayLabel(item)}
                      </span>
                    </div>
                    
                    {/* Date & Time Column */}
                    <div className="col-span-4 flex items-center min-w-0">
                      <span 
                        className="text-sm text-gray-600 truncate flex-1 mr-2" 
                        title={dateTimeTooltip}
                      >
                        {fullDateTime}
                      </span>
                      
                      {/* Action buttons - show on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 flex-shrink-0">
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
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
