import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, BookOpen, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarService, CalendarItem } from '@/services/calendarService';
import { EnhancedAssignmentModal } from './EnhancedAssignmentModal';
import { Assignment } from '@/types/assignment';

interface AssignmentCalendarViewProps {
  className?: string;
}

export const AssignmentCalendarView: React.FC<AssignmentCalendarViewProps> = () => {
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await CalendarService.getCalendarMonth(currentDate);
      setCalendarData(data);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
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
    setSelectedDate(date);
    setSelectedAssignment(null);
    setShowModal(true);
  };

  const handleAssignmentClick = (item: CalendarItem) => {
    if (item.type === 'assignment' || item.type === 'exam') {
      // Convert CalendarItem back to Assignment for editing
      const assignment: Assignment = {
        id: item.id,
        title: item.title,
        description: item.description || '',
        subject: item.subject || '',
        type: item.type === 'exam' ? 'exam' : 'assignment',
        due_date: item.start.toISOString(),
        priority: 'medium',
        status: 'pending',
        user_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setSelectedAssignment(assignment);
      setShowModal(true);
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <BookOpen className="w-3 h-3" />;
      case 'exam':
        return <GraduationCap className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'assignment':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'exam':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedDate(null);
    setSelectedAssignment(null);
    fetchCalendarData(); // Refresh calendar data
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

              {/* Assignment/Exam Items */}
              <div className="space-y-1">
                {day.items
                  .filter(item => item.type === 'assignment' || item.type === 'exam')
                  .slice(0, 3)
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm transition-shadow ${getItemTypeColor(item.type)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssignmentClick(item);
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {getItemTypeIcon(item.type)}
                        <span className="truncate flex-1">{item.title}</span>
                      </div>
                      {item.subject && (
                        <div className="text-xs opacity-75 mt-0.5">
                          {item.subject}
                        </div>
                      )}
                    </div>
                  ))}
                
                {day.items.filter(item => item.type === 'assignment' || item.type === 'exam').length > 3 && (
                  <div className="text-xs text-gray-500 p-1">
                    +{day.items.filter(item => item.type === 'assignment' || item.type === 'exam').length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <EnhancedAssignmentModal
          onClose={handleModalClose}
          onSave={handleModalClose}
          editingAssignment={selectedAssignment}
          initialDueDate={selectedDate}
        />
      )}
    </div>
  );
};