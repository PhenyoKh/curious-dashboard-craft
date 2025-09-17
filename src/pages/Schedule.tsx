
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Calendar, List, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScheduleModal } from '@/components/dashboard/ScheduleModal';
import { UnifiedCalendarIntegrations } from '@/components/calendar/UnifiedCalendarIntegrations';
import { getScheduleEvents, deleteScheduleEvent } from '@/services/supabaseService';
import { CalendarService, type CalendarItem, type CalendarMonth } from '@/services/calendarService';
import type { Database } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

type ScheduleEvent = Database['public']['Tables']['schedule_events']['Row'];

interface DaySchedule {
  day: string;
  date: string;
  fullDate: Date;
  events: ScheduleEvent[];
}


const Schedule: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarMonth | null>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarIntegrationsOpen, setIsCalendarIntegrationsOpen] = useState(false);

  // Extract complex expressions for cleaner dependencies
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Fetch schedule events and calendar data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Always load both calendar data and schedule events
        const [calendarMonth, events] = await Promise.all([
          CalendarService.getCalendarMonth(currentYear, currentMonth),
          getScheduleEvents()
        ]);
        
        setCalendarData(calendarMonth);
        setScheduleEvents(events || []);
      } catch (error) {
        logger.error('Error fetching data:', error);
        setError('Failed to load schedule data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshKey, viewMode, currentDate, currentYear, currentMonth]);

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const refreshEvents = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleModalClose = (shouldRefresh = false) => {
    setIsModalOpen(false);
    setEditingEvent(null);
    if (shouldRefresh) {
      refreshEvents();
    }
  };

  const handleEditEvent = (event: ScheduleEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      await deleteScheduleEvent(eventId);
      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted.",
      });
      refreshEvents();
    } catch (error) {
      logger.error('Error deleting event:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the event. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDateClickForFilter = (date: Date) => {
    setSelectedDate(date);
    setViewMode('list');
  };

  const handleClearFilter = () => {
    setSelectedDate(null);
  };

  // Get all calendar items for a specific date from calendarData
  const getCalendarItemsForDate = (date: Date): CalendarItem[] => {
    if (!calendarData) return [];
    
    const selectedDateString = date.toDateString();
    const allItems: CalendarItem[] = [];
    
    calendarData.weeks.forEach(week => {
      week.days.forEach(day => {
        if (day.date.toDateString() === selectedDateString) {
          allItems.push(...day.items);
        }
      });
    });
    
    return allItems;
  };

  // Calendar navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date: Date, items: CalendarItem[]) => {
    // Filter events for the clicked date and switch to list view
    handleDateClickForFilter(date);
  };

  const handleCalendarItemEdit = (item: CalendarItem) => {
    if (item.type === 'event') {
      setEditingEvent(item.originalData as ScheduleEvent);
      setIsModalOpen(true);
    }
    // TODO: Handle assignment editing
  };

  const handleCalendarItemDelete = async (item: CalendarItem) => {
    if (item.type === 'event') {
      const eventId = (item.originalData as ScheduleEvent).id;
      await handleDeleteEvent(eventId);
    }
    // TODO: Handle assignment deletion
  };

  const getEventColors = (eventType: string) => {
    switch (eventType?.toLowerCase()) {
      case 'lecture':
        return { bgColor: 'bg-blue-50', borderColor: 'border-l-blue-500' };
      case 'lab':
      case 'lab session':
        return { bgColor: 'bg-green-50', borderColor: 'border-l-green-500' };
      case 'office hours':
        return { bgColor: 'bg-purple-50', borderColor: 'border-l-purple-500' };
      case 'exam':
        return { bgColor: 'bg-red-50', borderColor: 'border-l-red-500' };
      case 'study group':
        return { bgColor: 'bg-yellow-50', borderColor: 'border-l-yellow-500' };
      case 'review session':
        return { bgColor: 'bg-pink-50', borderColor: 'border-l-pink-500' };
      case 'meeting':
        return { bgColor: 'bg-orange-50', borderColor: 'border-l-orange-500' };
      default:
        return { bgColor: 'bg-gray-50', borderColor: 'border-l-gray-500' };
    }
  };

  const getTimeGap = (currentTime: string, nextTime: string | null) => {
    if (!nextTime) return null;
    
    const current = new Date(`2024-01-01 ${currentTime}`);
    const next = new Date(`2024-01-01 ${nextTime}`);
    const diffHours = (next.getTime() - current.getTime()) / (1000 * 60 * 60);
    
    if (diffHours > 1) {
      return `${Math.floor(diffHours)} hour gap`;
    }
    return null;
  };

  const getAbbreviatedEvent = (event: ScheduleEvent) => {
    const typeAbbr: { [key: string]: string } = {
      'study group': 'StudyG',
      'lecture': 'Lect',
      'lab': 'Lab',
      'lab session': 'Lab',
      'office hours': 'Office',
      'review session': 'Review',
      'exam': 'Exam',
      'meeting': 'Meet'
    };
    const time = new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${typeAbbr[event.event_type?.toLowerCase() || ''] || 'Event'} ${time}`;
  };

  const groupEventsByDay = (): DaySchedule[] => {
    const grouped: { [key: string]: ScheduleEvent[] } = {};
    
    // Filter events by selected date if one is set
    let eventsToGroup = scheduleEvents;
    if (selectedDate) {
      // Get all calendar items for the selected date (including assignments and exams)
      const calendarItems = getCalendarItemsForDate(selectedDate);
      
      // Convert calendar items to ScheduleEvent-compatible format for display
      eventsToGroup = calendarItems.map(item => {
        if (item.type === 'event' && item.originalData) {
          // Return the original ScheduleEvent data
          return item.originalData as ScheduleEvent;
        } else {
          // Convert assignments/exams to ScheduleEvent-compatible format for display
          return {
            id: item.id,
            title: item.title,
            description: item.description || null,
            start_time: item.start.toISOString(),
            end_time: item.end?.toISOString() || item.start.toISOString(),
            event_type: item.type === 'assignment' ? 'Assignment' : item.type === 'exam' ? 'Exam' : item.subType || 'Event',
            location: item.location || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: '', // Will be filled by auth context
            all_day: item.isAllDay,
            recurrence_rule: null,
            recurrence_end: null
          } as ScheduleEvent;
        }
      });
    }
    
    eventsToGroup.forEach(event => {
      if (event.start_time) {
        const date = new Date(event.start_time);
        const dateKey = date.toDateString();
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
      }
    });

    // Convert to DaySchedule array and sort
    const result: DaySchedule[] = Object.entries(grouped).map(([dateKey, events]) => {
      const date = new Date(dateKey);
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'long' }),
        date: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
        fullDate: date,
        events: events.sort((a, b) => {
          if (!a.start_time || !b.start_time) return 0;
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        })
      };
    });

    return result.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
  };

  const generateCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayEvents = scheduleEvents.filter(event => {
        if (!event.start_time) return false;
        const eventDate = new Date(event.start_time);
        return eventDate.toDateString() === currentDate.toDateString();
      });

      days.push({
        date: currentDate,
        events: dayEvents,
        isCurrentMonth: currentDate.getMonth() === month
      });
    }
    return days;
  };


  const renderCalendarView = () => {
    if (!calendarData) {
      return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="text-center py-8">Loading calendar...</div>
        </div>
      );
    }

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="p-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="px-3 py-1 text-sm"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="p-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2">
          {calendarData.weeks.map((week) => (
            <div key={week.weekNumber} className="grid grid-cols-7 gap-2">
              {week.days.map((day, dayIndex) => {
                const dayClasses = `
                  min-h-[120px] border rounded-lg p-2 cursor-pointer transition-all duration-200
                  ${day.isCurrentMonth ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'}
                  ${day.isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                  ${day.isWeekend ? 'bg-gray-25' : ''}
                `;

                return (
                  <div
                    key={dayIndex}
                    className={dayClasses}
                    onClick={() => handleDayClick(day.date, day.items)}
                  >
                    {/* Date Number */}
                    <div className={`text-sm font-medium mb-2 ${
                      day.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
                    } ${day.isToday ? 'text-blue-600 font-bold' : ''}`}>
                      {day.date.getDate()}
                    </div>

                    {/* Calendar Items */}
                    <div className="space-y-1">
                      {day.items.slice(0, 3).map((item) => {
                        const colors = CalendarService.getItemColor(item);
                        const isOverdue = CalendarService.isOverdue(item);
                        
                        return (
                          <div
                            key={item.id}
                            className={`text-xs p-1 rounded border-l-2 cursor-pointer hover:opacity-80 transition-opacity ${
                              colors.bg
                            } ${colors.border} ${colors.text} ${
                              isOverdue ? 'animate-pulse' : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDateClickForFilter(item.start);
                            }}
                            title={`${item.title} ${item.subject ? `(${item.subject})` : ''}`}
                          >
                            <div className="truncate font-medium">
                              {item.type === 'assignment' || item.type === 'exam' ? 
                                `${item.type.toUpperCase()}: ${item.title}` : 
                                item.title
                              }
                            </div>
                            {!item.isAllDay && (
                              <div className="text-xs opacity-75">
                                {item.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                            {item.priority && item.type === 'assignment' && (
                              <div className={`text-xs font-bold ${
                                item.priority === 'high' ? 'text-red-600' :
                                item.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {item.priority.toUpperCase()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Show overflow count */}
                      {day.items.length > 3 && (
                        <div className="text-xs text-gray-500 font-medium">
                          +{day.items.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Calendar Legend */}
        <div className="mt-6 pt-4 border-t">
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Color Key:</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {/* Events */}
              <div className="space-y-1">
                <div className="font-medium text-gray-600">Events:</div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-100 border-l-2 border-blue-500 rounded"></div>
                  <span className="text-gray-600">Lectures</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-100 border-l-2 border-green-500 rounded"></div>
                  <span className="text-gray-600">Lab Sessions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-100 border-l-2 border-purple-500 rounded"></div>
                  <span className="text-gray-600">Office Hours</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-100 border-l-2 border-yellow-500 rounded"></div>
                  <span className="text-gray-600">Study Groups</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-100 border-l-2 border-orange-500 rounded"></div>
                  <span className="text-gray-600">Meetings</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-indigo-100 border-l-2 border-indigo-500 rounded"></div>
                  <span className="text-gray-600">Break</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-cyan-100 border-l-2 border-cyan-500 rounded"></div>
                  <span className="text-gray-600">Assignment Work</span>
                </div>
              </div>
              
              {/* Assignments */}
              <div className="space-y-1">
                <div className="font-medium text-gray-600">Assignments:</div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-100 border-l-2 border-orange-500 rounded"></div>
                  <span className="text-gray-600">High Priority</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-100 border-l-2 border-blue-500 rounded"></div>
                  <span className="text-gray-600">Medium Priority</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-100 border-l-2 border-green-500 rounded"></div>
                  <span className="text-gray-600">Completed</span>
                </div>
              </div>
              
              {/* Exams */}
              <div className="space-y-1">
                <div className="font-medium text-gray-600">Exams:</div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-100 border-l-2 border-red-500 rounded"></div>
                  <span className="text-gray-600">Scheduled</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-100 border-l-2 border-yellow-500 rounded"></div>
                  <span className="text-gray-600">In Progress</span>
                </div>
              </div>
              
              {/* Status */}
              <div className="space-y-1">
                <div className="font-medium text-gray-600">Status:</div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-100 border-l-2 border-red-500 rounded animate-pulse"></div>
                  <span className="text-gray-600">Overdue</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-100 border-l-2 border-gray-500 rounded"></div>
                  <span className="text-gray-600">Other</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToDashboard}
              className="hover:bg-gray-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">This Week's Schedule</h1>
            
            {/* View Toggle */}
            <div className="ml-auto flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <List className="w-4 h-4 mr-2" />
                List View
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-sm ${
                  viewMode === 'calendar' 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Calendar View
              </Button>
            </div>
          </div>
          
          {/* Navigation Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center justify-between">
              {/* Left: Navigation */}
              <div className="flex items-center gap-2">
                {viewMode === 'calendar' ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous Month
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToToday}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Today
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Next Month
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToToday}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Today
                  </Button>
                )}
              </div>
              
              {/* Center: Date Range */}
              <div className="text-lg font-semibold text-gray-800">
                {viewMode === 'calendar' 
                  ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  : 'All Events'
                }
              </div>
              
              {/* Right: Add Event and Calendar Settings */}
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-800"
                  title="Calendar Integration Settings"
                  onClick={() => setIsCalendarIntegrationsOpen(true)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    setEditingEvent(null);
                    setIsModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Date Banner */}
        {selectedDate && viewMode === 'list' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900">
                    Viewing items for {selectedDate.toLocaleDateString()}
                  </h3>
                  <p className="text-sm text-blue-700">
                    Showing {selectedDate ? getCalendarItemsForDate(selectedDate).length : 0} item(s) for this date
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilter}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear Filter
              </Button>
            </div>
          </div>
        )}

        {/* Schedule Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading schedule...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => setRefreshKey(prev => prev + 1)}>
              Try again
            </Button>
          </div>
        ) : viewMode === 'calendar' ? (
          renderCalendarView()
        ) : (
          <div className="space-y-6">
            {(() => {
              const groupedDays = groupEventsByDay();
              
              // Check if we have no events at all vs filtered empty state
              if (scheduleEvents.length === 0) {
                return (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No events scheduled</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingEvent(null);
                        setIsModalOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add your first event
                    </Button>
                  </div>
                );
              }
              
              // Check if filtering returned empty results
              if (groupedDays.length === 0 && selectedDate) {
                return (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No items found</h3>
                    <p className="text-gray-500 mb-4">
                      No events, assignments, or exams found for the selected date
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingEvent(null);
                        setIsModalOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Event
                    </Button>
                  </div>
                );
              }
              
              // Render the grouped days
              return groupedDays.map((dayData) => (
                <div
                  key={`${dayData.day}-${dayData.date}`}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    {dayData.day}, {dayData.date}
                  </h3>
                  
                  <div className="space-y-3">
                    {dayData.events.map((event, index) => {
                      const colors = getEventColors(event.event_type || '');
                      const startTime = new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const endTime = new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const timeRange = `${startTime} - ${endTime}`;
                      
                      return (
                        <div key={event.id}>
                          <div
                            className={`group flex items-center justify-between p-3 ${colors.bgColor} rounded-lg transition-colors border-l-4 ${colors.borderColor} ${
                              event.event_type && !['Assignment', 'Exam'].includes(event.event_type)
                                ? 'cursor-pointer hover:bg-gray-100'
                                : 'cursor-default'
                            }`}
                            onClick={() => {
                              // Only allow editing of actual schedule events, not assignments/exams
                              if (event.event_type && !['Assignment', 'Exam'].includes(event.event_type)) {
                                handleEditEvent(event);
                              }
                            }}
                          >
                            <div className="flex items-center flex-1">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-800">{event.title}</p>
                                  {event.event_type && ['Assignment', 'Exam'].includes(event.event_type) && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                      Read-only
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{event.event_type || 'Event'}</p>
                                {event.description && (
                                  <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-700">{timeRange}</span>
                              {/* Only show delete button for actual schedule events, not assignments/exams */}
                              {event.event_type && !['Assignment', 'Exam'].includes(event.event_type) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEvent(event.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-700"
                                  title="Delete event"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Schedule Event'}</DialogTitle>
          </DialogHeader>
          <ScheduleModal 
            onClose={handleModalClose}
            editingEvent={editingEvent}
          />
        </DialogContent>
      </Dialog>

      {/* Calendar Integrations Modal */}
      <Dialog open={isCalendarIntegrationsOpen} onOpenChange={setIsCalendarIntegrationsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Calendar Integrations</DialogTitle>
          </DialogHeader>
          <UnifiedCalendarIntegrations />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Schedule;
