import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2, Edit2, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarService, type CalendarItem } from '../../services/calendarService';
import { TimezoneService } from '../../services/timezoneService';
import { UserPreferencesService } from '../../services/userPreferencesService';
import { deleteAssignment, updateAssignment } from '../../services/supabaseService';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../integrations/supabase/types';

interface WeeklyAssignmentsProps {
  onAddAssignment: () => void;
  refreshKey?: number;
}

export const WeeklyAssignments = ({ onAddAssignment, refreshKey }: WeeklyAssignmentsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const fetchCalendarItems = async (isAutoRefresh = false) => {
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
      // Filter to show only assignments and exams (not events)
      const assignmentsAndExams = (data || []).filter(item => item.type === 'assignment' || item.type === 'exam');
      setCalendarItems(assignmentsAndExams);
      
      // Update last refresh time
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Error fetching assignments and exams:', error);
      setError('Failed to load assignments and exams');
    } finally {
      setLoading(false);
      setIsAutoRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCalendarItems();
    loadUserPreferences();
  }, [weekOffset]); // Re-fetch when week offset changes

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
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

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
  }, [autoRefreshEnabled, loading, isAutoRefreshing, lastRefreshTime]);

  // Week transition detection (check every minute)
  useEffect(() => {
    let weekTransitionTimer: NodeJS.Timeout;
  
    const checkWeekTransition = () => {
      if (weekOffset === 0 && currentWeekRange) {
        const now = new Date();
        const currentWeekStart = currentWeekRange.start;
        const currentWeekEnd = currentWeekRange.end;
        
        // Check if current time is outside the displayed week range
        if (now < currentWeekStart || now > currentWeekEnd) {
          // We've crossed into a new week, update to show current week
          setWeekTransitionMessage('New week started, updating assignments...');
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
    weekTransitionTimer = setInterval(checkWeekTransition, 60 * 1000); // Check every minute

    return () => {
      if (weekTransitionTimer) {
        clearInterval(weekTransitionTimer);
      }
    };
  }, [weekOffset, currentWeekRange]);

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

  // Function to refresh assignments (can be called after creating new assignments)
  const refreshAssignments = () => {
    fetchCalendarItems();
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

    // Sort items within each day by start time (due date), with all-day items first
    Object.keys(groupedItems).forEach(day => {
      groupedItems[day].sort((a, b) => {
        // All-day items (assignments/exams) come first
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        
        // Then sort by time/due date
        return a.start.getTime() - b.start.getTime();
      });
    });

    return groupedItems;
  };

  const handleViewAllAssignments = () => {
    navigate('/assignments');
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

  // Assignment action handlers
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      try {
        await deleteAssignment(assignmentId);
        // Refresh the data
        await fetchCalendarItems();
      } catch (error) {
        console.error('Error deleting assignment:', error);
        alert('Failed to delete assignment. Please try again.');
      }
    }
  };

  const handleStatusChange = async (assignmentId: string, newStatus: string) => {
    try {
      await updateAssignment(assignmentId, { status: newStatus });
      // Refresh the data
      await fetchCalendarItems();
    } catch (error) {
      console.error('Error updating assignment status:', error);
      alert('Failed to update assignment status. Please try again.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-800">Assignments & Exams</h2>
          <Button
            variant="ghost"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium p-1"
            onClick={handleViewAllAssignments}
          >
            View All
          </Button>
        </div>
        <Button
          variant="ghost"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          onClick={onAddAssignment}
        >
          + Add Assignment
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
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading assignments...</span>
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
            <div className="col-span-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
              Assignment Title
            </div>
            <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
              Subject
            </div>
            <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
              Due Date
            </div>
            <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wide">
              Status
            </div>
          </div>
          
          {/* Assignments List - Fixed height with internal scrolling */}
          <div className="h-60 overflow-y-auto scroll-smooth border border-gray-100 rounded-lg bg-gray-50/30 p-2">
            <div className="space-y-2">
              {calendarItems.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <p className="text-muted-foreground mb-2">No assignments or exams due this week.</p>
                    <Button
                      variant="outline"
                      onClick={onAddAssignment}
                      className="text-sm"
                    >
                      Add your first assignment
                    </Button>
                  </div>
                </div>
              ) : (
                calendarItems
                  .sort((a, b) => a.start.getTime() - b.start.getTime())
                  .map((item) => {
                    const colors = CalendarService.getItemColor(item);
                    const isOverdue = CalendarService.isOverdue(item);
                    
                    // Format due date display
                    const dueDateDisplay = item.start.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    });
                    
                    const dueDateTooltip = item.start.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                    
                    return (
                      <div key={item.id} className={`group relative grid grid-cols-12 gap-2 items-center p-3 ${colors.bg} ${isOverdue ? 'animate-pulse' : ''} rounded-lg hover:shadow-sm transition-shadow`}>
                        {/* Assignment Title Column */}
                        <div className="col-span-4 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium truncate">{item.title}</span>
                            {/* Overdue indicator */}
                            {isOverdue && (
                              <span className="text-xs text-red-600 font-medium" title="Overdue">
                                🔥
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div className="text-xs text-gray-500 truncate mt-1">
                              {item.description}
                            </div>
                          )}
                        </div>
                        
                        {/* Subject Column */}
                        <div className="col-span-3 min-w-0">
                          <span className="text-sm text-gray-700 truncate">{item.subject || 'No subject'}</span>
                        </div>
                        
                        {/* Due Date Column */}
                        <div className="col-span-3 min-w-0">
                          <span 
                            className="text-sm text-gray-600 truncate" 
                            title={dueDateTooltip}
                          >
                            {dueDateDisplay}
                          </span>
                        </div>
                        
                        {/* Status Column */}
                        <div className="col-span-2 flex items-center min-w-0">
                          <div className="flex items-center space-x-1 flex-1">
                            {/* Status indicator */}
                            <span className={`text-xs px-1 py-0.5 rounded font-medium truncate ${
                              item.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              item.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                              item.status === 'On Track' ? 'bg-blue-100 text-blue-800' :
                              item.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status || 'Not Started'}
                            </span>
                          </div>
                          
                          {/* Action buttons - show on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 flex-shrink-0 ml-2">
                            {/* Status Dropdown */}
                            <Select
                              value={item.status || 'Not Started'}
                              onValueChange={(newStatus) => {
                                const assignmentData = item.originalData as Database['public']['Tables']['assignments']['Row'];
                                handleStatusChange(assignmentData.id, newStatus);
                              }}
                            >
                              <SelectTrigger className="w-24 h-6 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Not Started">Not Started</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="On Track">On Track</SelectItem>
                                <SelectItem value="Overdue">Overdue</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                const assignmentData = item.originalData as Database['public']['Tables']['assignments']['Row'];
                                handleDeleteAssignment(assignmentData.id);
                              }}
                              title="Delete assignment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
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