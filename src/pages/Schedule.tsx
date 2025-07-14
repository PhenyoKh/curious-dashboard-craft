
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Calendar, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScheduleModal } from '@/components/dashboard/ScheduleModal';

interface Event {
  id: string;
  title: string;
  subject: string;
  time: string;
  borderColor: string;
  bgColor: string;
  eventType: 'study-group' | 'lecture' | 'lab' | 'office-hours' | 'review';
}

interface DaySchedule {
  day: string;
  date: string;
  fullDate: Date;
  events: Event[];
}

// Extended test data covering the full month
const scheduleData: DaySchedule[] = [
  // Week 1
  {
    day: 'Monday',
    date: 'July 1',
    fullDate: new Date(2024, 6, 1),
    events: [
      { id: '1', title: 'Study Group Meeting', subject: 'Biology 101', time: '9:00 AM', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-50', eventType: 'study-group' },
      { id: '2', title: 'Lecture', subject: 'Computer Science 301', time: '11:00 AM', borderColor: 'border-l-green-500', bgColor: 'bg-green-50', eventType: 'lecture' },
      { id: '3', title: 'Lab Session', subject: 'Chemistry 200', time: '2:00 PM', borderColor: 'border-l-orange-500', bgColor: 'bg-orange-50', eventType: 'lab' }
    ]
  },
  {
    day: 'Tuesday',
    date: 'July 2',
    fullDate: new Date(2024, 6, 2),
    events: [
      { id: '4', title: 'Office Hours', subject: 'Statistics 301', time: '10:00 AM', borderColor: 'border-l-pink-500', bgColor: 'bg-pink-50', eventType: 'office-hours' },
      { id: '5', title: 'Review Session', subject: 'Biology 101', time: '4:00 PM', borderColor: 'border-l-purple-500', bgColor: 'bg-purple-50', eventType: 'review' }
    ]
  },
  {
    day: 'Wednesday',
    date: 'July 3',
    fullDate: new Date(2024, 6, 3),
    events: [
      { id: '6', title: 'Lecture', subject: 'Computer Science 301', time: '11:00 AM', borderColor: 'border-l-green-500', bgColor: 'bg-green-50', eventType: 'lecture' }
    ]
  },
  {
    day: 'Thursday',
    date: 'July 4',
    fullDate: new Date(2024, 6, 4),
    events: []
  },
  {
    day: 'Friday',
    date: 'July 5',
    fullDate: new Date(2024, 6, 5),
    events: [
      { id: '7', title: 'Lab Session', subject: 'Chemistry 200', time: '1:00 PM', borderColor: 'border-l-orange-500', bgColor: 'bg-orange-50', eventType: 'lab' }
    ]
  },
  {
    day: 'Saturday',
    date: 'July 6',
    fullDate: new Date(2024, 6, 6),
    events: []
  },
  {
    day: 'Sunday',
    date: 'July 7',
    fullDate: new Date(2024, 6, 7),
    events: []
  },
  // Week 2
  {
    day: 'Monday',
    date: 'July 8',
    fullDate: new Date(2024, 6, 8),
    events: [
      { id: '8', title: 'Study Group Meeting', subject: 'Biology 101', time: '9:00 AM', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-50', eventType: 'study-group' },
      { id: '9', title: 'Lecture', subject: 'Physics 201', time: '2:00 PM', borderColor: 'border-l-green-500', bgColor: 'bg-green-50', eventType: 'lecture' }
    ]
  },
  {
    day: 'Tuesday',
    date: 'July 9',
    fullDate: new Date(2024, 6, 9),
    events: [
      { id: '10', title: 'Lab Session', subject: 'Chemistry 200', time: '10:00 AM', borderColor: 'border-l-orange-500', bgColor: 'bg-orange-50', eventType: 'lab' }
    ]
  },
  {
    day: 'Wednesday',
    date: 'July 10',
    fullDate: new Date(2024, 6, 10),
    events: [
      { id: '11', title: 'Office Hours', subject: 'Mathematics 301', time: '3:00 PM', borderColor: 'border-l-pink-500', bgColor: 'bg-pink-50', eventType: 'office-hours' }
    ]
  },
  {
    day: 'Thursday',
    date: 'July 11',
    fullDate: new Date(2024, 6, 11),
    events: [
      { id: '12', title: 'Review Session', subject: 'Physics 201', time: '1:00 PM', borderColor: 'border-l-purple-500', bgColor: 'bg-purple-50', eventType: 'review' }
    ]
  },
  {
    day: 'Friday',
    date: 'July 12',
    fullDate: new Date(2024, 6, 12),
    events: [
      { id: '13', title: 'Lecture', subject: 'Computer Science 301', time: '11:00 AM', borderColor: 'border-l-green-500', bgColor: 'bg-green-50', eventType: 'lecture' }
    ]
  },
  {
    day: 'Saturday',
    date: 'July 13',
    fullDate: new Date(2024, 6, 13),
    events: []
  },
  {
    day: 'Sunday',
    date: 'July 14',
    fullDate: new Date(2024, 6, 14),
    events: []
  },
  // Continue with more weeks to fill the month...
  {
    day: 'Monday',
    date: 'July 15',
    fullDate: new Date(2024, 6, 15),
    events: [
      { id: '14', title: 'Study Group Meeting', subject: 'Statistics 301', time: '10:00 AM', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-50', eventType: 'study-group' }
    ]
  },
  {
    day: 'Tuesday',
    date: 'July 16',
    fullDate: new Date(2024, 6, 16),
    events: [
      { id: '15', title: 'Lab Session', subject: 'Biology 101', time: '2:00 PM', borderColor: 'border-l-orange-500', bgColor: 'bg-orange-50', eventType: 'lab' }
    ]
  },
  {
    day: 'Wednesday',
    date: 'July 17',
    fullDate: new Date(2024, 6, 17),
    events: []
  },
  {
    day: 'Thursday',
    date: 'July 18',
    fullDate: new Date(2024, 6, 18),
    events: [
      { id: '16', title: 'Lecture', subject: 'Mathematics 301', time: '9:00 AM', borderColor: 'border-l-green-500', bgColor: 'bg-green-50', eventType: 'lecture' },
      { id: '17', title: 'Office Hours', subject: 'Physics 201', time: '4:00 PM', borderColor: 'border-l-pink-500', bgColor: 'bg-pink-50', eventType: 'office-hours' }
    ]
  },
  {
    day: 'Friday',
    date: 'July 19',
    fullDate: new Date(2024, 6, 19),
    events: [
      { id: '18', title: 'Review Session', subject: 'Computer Science 301', time: '1:00 PM', borderColor: 'border-l-purple-500', bgColor: 'bg-purple-50', eventType: 'review' }
    ]
  },
  {
    day: 'Saturday',
    date: 'July 20',
    fullDate: new Date(2024, 6, 20),
    events: []
  },
  {
    day: 'Sunday',
    date: 'July 21',
    fullDate: new Date(2024, 6, 21),
    events: []
  }
];

const Schedule: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBackToDashboard = () => {
    navigate('/');
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

  const getAbbreviatedEvent = (event: Event) => {
    const typeAbbr = {
      'study-group': 'StudyG',
      'lecture': 'Lect',
      'lab': 'Lab',
      'office-hours': 'Office',
      'review': 'Review'
    };
    return `${typeAbbr[event.eventType]} ${event.time}`;
  };

  const generateCalendarDays = () => {
    const year = 2024;
    const month = 6; // July (0-indexed)
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayEvents = scheduleData.find(day => 
        day.fullDate.toDateString() === currentDate.toDateString()
      )?.events || [];

      days.push({
        date: currentDate,
        events: dayEvents,
        isCurrentMonth: currentDate.getMonth() === month
      });
    }
    return days;
  };

  const handleDayClick = (date: Date) => {
    setViewMode('list');
    // Here you could also scroll to the specific week containing this date
  };

  const renderCalendarView = () => {
    const calendarDays = generateCalendarDays();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`min-h-[120px] border rounded-lg p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              }`}
              onClick={() => handleDayClick(day.date)}
            >
              <div className={`text-sm font-medium mb-1 ${
                day.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
              }`}>
                {day.date.getDate()}
              </div>
              <div className="space-y-1">
                {day.events.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className={`text-xs p-1 rounded ${event.bgColor} ${event.borderColor} border-l-2 truncate`}
                  >
                    {getAbbreviatedEvent(event)}
                  </div>
                ))}
                {day.events.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{day.events.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-800"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous {viewMode === 'calendar' ? 'Month' : 'Week'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-800"
                >
                  Next {viewMode === 'calendar' ? 'Month' : 'Week'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              {/* Center: Date Range */}
              <div className="text-lg font-semibold text-gray-800">
                {viewMode === 'calendar' ? 'July 2024' : 'July 1-7, 2024'}
              </div>
              
              {/* Right: Add Event */}
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>
        </div>

        {/* Schedule Content */}
        {viewMode === 'calendar' ? (
          renderCalendarView()
        ) : (
          <div className="space-y-6">
            {scheduleData.slice(0, 7).map((dayData) => (
              <div
                key={`${dayData.day}-${dayData.date}`}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  {dayData.day}, {dayData.date}
                </h3>
                
                {dayData.events.length === 0 ? (
                  <p className="text-gray-500 italic py-4">No events scheduled</p>
                ) : (
                  <div className="space-y-3">
                    {dayData.events.map((event, index) => {
                      const nextEvent = dayData.events[index + 1];
                      const timeGap = nextEvent ? getTimeGap(event.time, nextEvent.time) : null;
                      
                      return (
                        <div key={event.id}>
                          <div
                            className={`flex items-center justify-between p-3 ${event.bgColor} rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border-l-4 ${event.borderColor}`}
                          >
                            <div className="flex items-center flex-1">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800">{event.title}</p>
                                <p className="text-sm text-gray-600">{event.subject}</p>
                              </div>
                            </div>
                            <span className="text-sm font-medium text-gray-700">{event.time}</span>
                          </div>
                          
                          {timeGap && (
                            <div className="text-xs text-gray-400 text-center py-2">
                              {timeGap}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {isModalOpen && (
        <ScheduleModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default Schedule;
