import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, BookOpen, GraduationCap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarService, CalendarItem } from '@/services/calendarService';
import { logger } from '@/utils/logger';

interface AssignmentCalendarViewProps {
  className?: string;
  onDateClick?: (date: Date) => void;
  onAddAssignment?: () => void;
}

export const AssignmentCalendarView: React.FC<AssignmentCalendarViewProps> = ({ onDateClick, onAddAssignment }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<{
    weeks: Array<Array<{
      date: Date;
      items: CalendarItem[];
      isCurrentMonth: boolean;
      isToday: boolean;
    }>>;
    monthName: string;
    year: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await CalendarService.getCalendarMonthView(currentDate);
      setCalendarData(data);
    } catch (error) {
      logger.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleDateClick = (date: Date) => {
    onDateClick?.(date);
  };

  const handleAssignmentClick = (item: CalendarItem) => {
    // Navigate to the date when an assignment is clicked
    onDateClick?.(item.start);
  };

  const getItemTypeIcon = (item: CalendarItem) => {
    switch (item.type) {
      case 'assignment':
        return <BookOpen className="w-3 h-3" />;
      case 'exam':
        return <GraduationCap className="w-3 h-3" />;
      case 'event':
        return <Clock className="w-3 h-3" />;
      default:
        return <Calendar className="w-3 h-3" />;
    }
  };

  const getItemTypeColor = (item: CalendarItem) => {
    const colors = CalendarService.getItemColor(item);
    return `${colors.bg} ${colors.text} ${colors.border}`;
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            {calendarData?.monthName} {calendarData?.year}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateMonth('prev')}
            className="hover:bg-gray-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateMonth('next')}
            className="hover:bg-gray-100"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setCurrentDate(new Date())}
            variant="outline"
            size="sm"
            className="ml-2"
          >
            Today
          </Button>
          {onAddAssignment && (
            <Button
              onClick={onAddAssignment}
              variant="default"
              size="sm"
              className="ml-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Assignment
            </Button>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarData?.weeks.flat().map((day, index) => (
            <div
              key={index}
              className={`min-h-[120px] p-2 border rounded-lg cursor-pointer transition-colors ${
                day.isCurrentMonth
                  ? 'border-gray-200 hover:bg-gray-50'
                  : 'border-gray-100 bg-gray-50'
              } ${day.isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
              onClick={() => handleDateClick(day.date)}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium ${
                    day.isCurrentMonth
                      ? day.isToday
                        ? 'text-blue-600'
                        : 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {day.date.getDate()}
                </span>
                {day.isCurrentMonth && (
                  <Plus className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>

              {/* Calendar Items */}
              <div className="space-y-1">
                {day.items
                  .slice(0, 3)
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm transition-shadow ${getItemTypeColor(item)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.type === 'assignment' || item.type === 'exam') {
                          handleAssignmentClick(item);
                        } else {
                          // For events, just navigate to the date to show list view
                          onDateClick?.(item.start);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {getItemTypeIcon(item)}
                        <span className="truncate flex-1">{item.title}</span>
                      </div>
                      {item.subject && (
                        <div className="text-xs opacity-75 mt-0.5">
                          {item.subject}
                        </div>
                      )}
                    </div>
                  ))}
                
                {day.items.length > 3 && (
                  <div className="text-xs text-gray-500 p-1">
                    +{day.items.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};