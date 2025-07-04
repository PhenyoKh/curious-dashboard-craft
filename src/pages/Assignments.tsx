
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Calendar, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  fullDate: Date;
  status: 'To Do' | 'In Progress' | 'On Track' | 'Overdue' | 'Not Started' | 'Completed';
  statusColor: string;
  type: 'assignment' | 'exam' | 'project';
  borderColor: string;
  bgColor: string;
}

interface DayAssignments {
  day: string;
  date: string;
  fullDate: Date;
  assignments: Assignment[];
}

// Extended test data covering the full month
const assignmentsData: DayAssignments[] = [
  // Week 1
  {
    day: 'Monday',
    date: 'July 1',
    fullDate: new Date(2024, 6, 1),
    assignments: [
      { id: '1', title: 'Research Paper', subject: 'Biology 101', dueDate: 'July 1, 2024', fullDate: new Date(2024, 6, 1), status: 'In Progress', statusColor: 'bg-yellow-100 text-yellow-800', type: 'assignment', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-50' }
    ]
  },
  {
    day: 'Tuesday',
    date: 'July 2',
    fullDate: new Date(2024, 6, 2),
    assignments: []
  },
  {
    day: 'Wednesday',
    date: 'July 3',
    fullDate: new Date(2024, 6, 3),
    assignments: [
      { id: '2', title: 'Quiz 1', subject: 'Statistics 301', dueDate: 'July 3, 2024', fullDate: new Date(2024, 6, 3), status: 'To Do', statusColor: 'bg-blue-100 text-blue-800', type: 'exam', borderColor: 'border-l-red-500', bgColor: 'bg-red-50' }
    ]
  },
  {
    day: 'Thursday',
    date: 'July 4',
    fullDate: new Date(2024, 6, 4),
    assignments: []
  },
  {
    day: 'Friday',
    date: 'July 5',
    fullDate: new Date(2024, 6, 5),
    assignments: [
      { id: '3', title: 'Essay 2', subject: 'Biology 101', dueDate: 'July 5, 2024', fullDate: new Date(2024, 6, 5), status: 'In Progress', statusColor: 'bg-yellow-100 text-yellow-800', type: 'assignment', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-50' },
      { id: '4', title: 'Lab Report', subject: 'Chemistry 200', dueDate: 'July 5, 2024', fullDate: new Date(2024, 6, 5), status: 'On Track', statusColor: 'bg-green-100 text-green-800', type: 'assignment', borderColor: 'border-l-green-500', bgColor: 'bg-green-50' }
    ]
  },
  {
    day: 'Saturday',
    date: 'July 6',
    fullDate: new Date(2024, 6, 6),
    assignments: []
  },
  {
    day: 'Sunday',
    date: 'July 7',
    fullDate: new Date(2024, 6, 7),
    assignments: []
  },
  // Week 2
  {
    day: 'Monday',
    date: 'July 8',
    fullDate: new Date(2024, 6, 8),
    assignments: [
      { id: '5', title: 'Midterm Exam', subject: 'Computer Science 301', dueDate: 'July 8, 2024', fullDate: new Date(2024, 6, 8), status: 'To Do', statusColor: 'bg-blue-100 text-blue-800', type: 'exam', borderColor: 'border-l-red-500', bgColor: 'bg-red-50' }
    ]
  },
  {
    day: 'Tuesday',
    date: 'July 9',
    fullDate: new Date(2024, 6, 9),
    assignments: []
  },
  {
    day: 'Wednesday',
    date: 'July 10',
    fullDate: new Date(2024, 6, 10),
    assignments: [
      { id: '6', title: 'Problem Set 2', subject: 'Mathematics 301', dueDate: 'July 10, 2024', fullDate: new Date(2024, 6, 10), status: 'Not Started', statusColor: 'bg-gray-100 text-gray-800', type: 'assignment', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-50' }
    ]
  },
  {
    day: 'Thursday',
    date: 'July 11',
    fullDate: new Date(2024, 6, 11),
    assignments: []
  },
  {
    day: 'Friday',
    date: 'July 12',
    fullDate: new Date(2024, 6, 12),
    assignments: [
      { id: '7', title: 'Problem Set 3', subject: 'Statistics 301', dueDate: 'July 12, 2024', fullDate: new Date(2024, 6, 12), status: 'On Track', statusColor: 'bg-green-100 text-green-800', type: 'assignment', borderColor: 'border-l-green-500', bgColor: 'bg-green-50' }
    ]
  },
  {
    day: 'Saturday',
    date: 'July 13',
    fullDate: new Date(2024, 6, 13),
    assignments: []
  },
  {
    day: 'Sunday',
    date: 'July 14',
    fullDate: new Date(2024, 6, 14),
    assignments: []
  },
  // Week 3
  {
    day: 'Monday',
    date: 'July 15',
    fullDate: new Date(2024, 6, 15),
    assignments: [
      { id: '8', title: 'Case Study', subject: 'Psychology 201', dueDate: 'July 15, 2024', fullDate: new Date(2024, 6, 15), status: 'In Progress', statusColor: 'bg-yellow-100 text-yellow-800', type: 'assignment', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-50' }
    ]
  },
  {
    day: 'Tuesday',
    date: 'July 16',
    fullDate: new Date(2024, 6, 16),
    assignments: []
  },
  {
    day: 'Wednesday',
    date: 'July 17',
    fullDate: new Date(2024, 6, 17),
    assignments: [
      { id: '9', title: 'Final Exam', subject: 'Physics 201', dueDate: 'July 17, 2024', fullDate: new Date(2024, 6, 17), status: 'To Do', statusColor: 'bg-blue-100 text-blue-800', type: 'exam', borderColor: 'border-l-red-500', bgColor: 'bg-red-50' }
    ]
  },
  {
    day: 'Thursday',
    date: 'July 18',
    fullDate: new Date(2024, 6, 18),
    assignments: []
  },
  {
    day: 'Friday',
    date: 'July 19',
    fullDate: new Date(2024, 6, 19),
    assignments: []
  },
  {
    day: 'Saturday',
    date: 'July 20',
    fullDate: new Date(2024, 6, 20),
    assignments: [
      { id: '10', title: 'Final Project', subject: 'Psychology 201', dueDate: 'July 20, 2024', fullDate: new Date(2024, 6, 20), status: 'Not Started', statusColor: 'bg-gray-100 text-gray-800', type: 'project', borderColor: 'border-l-purple-500', bgColor: 'bg-purple-50' }
    ]
  },
  {
    day: 'Sunday',
    date: 'July 21',
    fullDate: new Date(2024, 6, 21),
    assignments: []
  }
];

const Assignments: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const getAbbreviatedAssignment = (assignment: Assignment) => {
    const typeAbbr = {
      'assignment': 'Assgn',
      'exam': 'Exam',
      'project': 'Proj'
    };
    return `${typeAbbr[assignment.type]} ${assignment.dueDate.split(',')[0].replace('July ', '')}`;
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
      
      const dayAssignments = assignmentsData.find(day => 
        day.fullDate.toDateString() === currentDate.toDateString()
      )?.assignments || [];

      days.push({
        date: currentDate,
        assignments: dayAssignments,
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
                {day.assignments.slice(0, 3).map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`text-xs p-1 rounded ${assignment.bgColor} ${assignment.borderColor} border-l-2 truncate`}
                  >
                    {getAbbreviatedAssignment(assignment)}
                  </div>
                ))}
                {day.assignments.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{day.assignments.length - 3} more
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
            <h1 className="text-3xl font-bold text-gray-800">Assignments & Exams</h1>
            
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
              
              {/* Right: Add Assignment */}
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Assignment
              </Button>
            </div>
          </div>
        </div>

        {/* Assignments Content */}
        {viewMode === 'calendar' ? (
          renderCalendarView()
        ) : (
          <div className="space-y-6">
            {assignmentsData.slice(0, 7).map((dayData) => (
              <div
                key={`${dayData.day}-${dayData.date}`}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  {dayData.day}, {dayData.date}
                </h3>
                
                {dayData.assignments.length === 0 ? (
                  <p className="text-gray-500 italic py-4">No assignments or exams due</p>
                ) : (
                  <div className="space-y-3">
                    {dayData.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className={`flex items-center justify-between p-3 ${assignment.bgColor} rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border-l-4 ${assignment.borderColor}`}
                      >
                        <div className="flex items-center flex-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-800">{assignment.title}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 uppercase">
                                {assignment.type}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{assignment.subject}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`${assignment.statusColor} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                            {assignment.status}
                          </span>
                          <span className="text-sm font-medium text-gray-700">{assignment.dueDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Assignments;
