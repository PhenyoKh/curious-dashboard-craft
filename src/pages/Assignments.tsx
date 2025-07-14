
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown, ArrowLeft, Calendar as CalendarIcon, List, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AssignmentModal } from '@/components/dashboard/AssignmentModal';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  subjectCode: string;
  dueDate: Date;
  type: 'assignment' | 'exam';
  status: 'To Do' | 'In Progress' | 'On Track' | 'Overdue' | 'Not Started' | 'Completed';
  statusColor: string;
  description?: string;
}

const mockAssignments: Assignment[] = [
  {
    id: '1',
    title: 'Essay 2',
    subject: 'Biology 101',
    subjectCode: 'BIO 101',
    dueDate: new Date('2025-07-05'),
    type: 'assignment',
    status: 'In Progress',
    statusColor: 'bg-yellow-100 text-yellow-800',
    description: 'Research essay on cellular respiration processes'
  },
  {
    id: '2',
    title: 'Midterm Exam',
    subject: 'Computer Science 301',
    subjectCode: 'CS 301',
    dueDate: new Date('2025-07-08'),
    type: 'exam',
    status: 'To Do',
    statusColor: 'bg-blue-100 text-blue-800',
    description: 'Covers data structures and algorithms'
  },
  {
    id: '3',
    title: 'Problem Set 3',
    subject: 'Statistics 301',
    subjectCode: 'STAT 301',
    dueDate: new Date('2025-07-12'),
    type: 'assignment',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-800',
    description: 'Probability distributions and hypothesis testing'
  },
  {
    id: '4',
    title: 'Lab Report',
    subject: 'Chemistry 200',
    subjectCode: 'CHEM 200',
    dueDate: new Date('2025-06-28'),
    type: 'assignment',
    status: 'Overdue',
    statusColor: 'bg-red-100 text-red-800',
    description: 'Organic chemistry synthesis lab results'
  },
  {
    id: '5',
    title: 'Final Project',
    subject: 'Psychology 201',
    subjectCode: 'PSYC 201',
    dueDate: new Date('2025-07-20'),
    type: 'assignment',
    status: 'Not Started',
    statusColor: 'bg-gray-100 text-foreground',
    description: 'Research project on cognitive behavioral therapy'
  }
];

const subjects = [
  'All Subjects',
  'Biology 101',
  'Computer Science 301',
  'Statistics 301',
  'Chemistry 200',
  'Psychology 201'
];

const types = [
  'All Types',
  'Assignments',
  'Exams'
];

const statusOptions = [
  'All Statuses',
  'To Do',
  'In Progress',
  'On Track',
  'Overdue',
  'Not Started',
  'Completed'
];

const sortOptions = [
  { value: 'dueDate', label: 'Due Date' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'status', label: 'By Status' }
];

const Assignments: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [sortBy, setSortBy] = useState('dueDate');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 6)); // July 2025

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  const filteredAndSortedAssignments = useMemo(() => {
    let filtered = mockAssignments;

    if (searchQuery) {
      filtered = filtered.filter(assignment =>
        assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedSubject !== 'All Subjects') {
      filtered = filtered.filter(assignment => assignment.subject === selectedSubject);
    }

    if (selectedType !== 'All Types') {
      const typeFilter = selectedType === 'Assignments' ? 'assignment' : 'exam';
      filtered = filtered.filter(assignment => assignment.type === typeFilter);
    }

    if (selectedStatus !== 'All Statuses') {
      filtered = filtered.filter(assignment => assignment.status === selectedStatus);
    }

    switch (sortBy) {
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'status':
        filtered.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case 'dueDate':
      default:
        filtered.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
        break;
    }

    return filtered;
  }, [searchQuery, selectedSubject, selectedType, selectedStatus, sortBy]);

  const assignmentsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    
    return filteredAndSortedAssignments.filter(assignment => {
      const assignmentDate = new Date(assignment.dueDate);
      return assignmentDate.toDateString() === selectedDate.toDateString();
    });
  }, [filteredAndSortedAssignments, selectedDate]);

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayAssignments = filteredAndSortedAssignments.filter(assignment => 
        assignment.dueDate.toDateString() === currentDate.toDateString()
      );

      days.push({
        date: currentDate,
        assignments: dayAssignments,
        isCurrentMonth: currentDate.getMonth() === month
      });
    }
    return days;
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const getAbbreviatedAssignment = (assignment: Assignment) => {
    return `${assignment.title.substring(0, 10)}${assignment.title.length > 10 ? '...' : ''} ${assignment.dueDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}`;
  };

  const renderCalendarView = () => {
    const calendarDays = generateCalendarDays();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="space-y-6">
        {/* Navigation Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            {/* Left: Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousMonth}
                className="text-gray-600 hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous Month
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="text-gray-600 hover:text-foreground"
              >
                Next Month
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            {/* Center: Month/Year */}
            <div className="text-lg font-semibold text-foreground">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            
            {/* Right: Add Assignment */}
            <Dialog open={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/80 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Assignment</DialogTitle>
                </DialogHeader>
                <AssignmentModal onClose={() => setIsAssignmentModalOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Calendar Grid */}
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
                onClick={() => setSelectedDate(day.date)}
              >
                <div className={`text-sm font-medium mb-1 ${
                  day.isCurrentMonth ? 'text-foreground' : 'text-gray-400'
                }`}>
                  {day.date.getDate()}
                </div>
                <div className="space-y-1">
                  {day.assignments.slice(0, 3).map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`text-xs p-1 rounded ${assignment.statusColor} border-l-2 border-l-blue-500 truncate`}
                      title={assignment.title}
                    >
                      {assignment.title}
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
              className="hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Assignments & Exams</h1>
            {viewMode === 'list' && (
              <Dialog open={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/80 text-white ml-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add New Assignment</DialogTitle>
                  </DialogHeader>
                  <AssignmentModal onClose={() => setIsAssignmentModalOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[120px] justify-between">
                    <Filter className="w-4 h-4 mr-2" />
                    {selectedSubject}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {subjects.map((subject) => (
                    <DropdownMenuItem
                      key={subject}
                      onClick={() => setSelectedSubject(subject)}
                      className={selectedSubject === subject ? 'bg-accent' : ''}
                    >
                      {subject}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[100px] justify-between">
                    {selectedType}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {types.map((type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={selectedType === type ? 'bg-accent' : ''}
                    >
                      {type}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[120px] justify-between">
                    {sortOptions.find(opt => opt.value === sortBy)?.label}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {sortOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={sortBy === option.value ? 'bg-accent' : ''}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex justify-end">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'list' | 'calendar')}>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="w-4 h-4 mr-2" />
                List
              </ToggleGroupItem>
              <ToggleGroupItem value="calendar" aria-label="Calendar view">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendar
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedAssignments.map((assignment) => (
              <Card key={assignment.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-foreground line-clamp-2">
                      {assignment.title}
                    </CardTitle>
                    <Badge className={`${assignment.statusColor} text-xs px-2 py-1 ml-2`}>
                      {assignment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {assignment.subjectCode}
                      </Badge>
                      <Badge variant={assignment.type === 'exam' ? 'default' : 'secondary'} className="text-xs">
                        {assignment.type === 'exam' ? 'Exam' : 'Assignment'}
                      </Badge>
                    </div>
                    
                    {assignment.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {assignment.description}
                      </p>
                    )}
                    
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium text-gray-700">
                        {formatDate(assignment.dueDate)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getDaysUntilDue(assignment.dueDate)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          renderCalendarView()
        )}

        {/* Empty State */}
        {filteredAndSortedAssignments.length === 0 && viewMode === 'list' && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No assignments found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search terms' : 'No assignments match the selected filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assignments;
