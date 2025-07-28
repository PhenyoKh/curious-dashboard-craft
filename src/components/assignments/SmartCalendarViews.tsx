/**
 * Smart Calendar Views
 * 
 * Advanced calendar components with intelligent features:
 * - Academic calendar integration
 * - Assignment deadline visualization
 * - Study schedule display
 * - Workload heatmap
 * - Timeline views
 * - Smart scheduling suggestions
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, Clock, Target, 
  BookOpen, AlertTriangle, CheckCircle, Brain, Zap,
  Filter, Settings, RefreshCw, PlusCircle, MapPin,
  Users, Star, Flame, TrendingUp, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Import services
import { assignmentTimeManager } from '@/services/assignmentTimeManager';
import { assignmentProgressTracker } from '@/services/assignmentProgressTracker';
import { assignmentsService } from '@/services/supabaseService';

import type { 
  EnhancedAssignment,
  TimeBlock,
  WorkloadAnalysis,
  SchedulingRecommendation,
  AssignmentProgressMetrics
} from '@/types/assignments';

interface CalendarDay {
  date: Date;
  assignments: EnhancedAssignment[];
  timeBlocks: TimeBlock[];
  workloadLevel: 'light' | 'moderate' | 'heavy' | 'overwhelming';
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

interface CalendarViewProps {
  assignments: EnhancedAssignment[];
  timeBlocks?: TimeBlock[];
  onDateSelect?: (date: Date) => void;
  onAssignmentSelect?: (assignment: EnhancedAssignment) => void;
  viewMode?: 'month' | 'week' | 'agenda' | 'timeline';
}

// Main Smart Calendar Component
export const SmartCalendarView: React.FC<CalendarViewProps> = ({
  assignments,
  timeBlocks = [],
  onDateSelect,
  onAssignmentSelect,
  viewMode = 'month'
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showWorkloadHeatmap, setShowWorkloadHeatmap] = useState(false);
  const [workloadAnalysis, setWorkloadAnalysis] = useState<WorkloadAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<SchedulingRecommendation[]>([]);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'agenda' | 'timeline'>(viewMode);

  // Generate calendar data
  const calendarData = useMemo(() => {
    return generateCalendarData(currentMonth, assignments, timeBlocks);
  }, [currentMonth, assignments, timeBlocks]);

  // Load analytics data
  useEffect(() => {
    loadCalendarAnalytics();
  }, [assignments]);

  const loadCalendarAnalytics = async () => {
    try {
      const [workload, recs] = await Promise.all([
        assignmentProgressTracker.analyzeWorkload('current-user-id'),
        assignmentTimeManager.generateSchedulingRecommendations('current-user-id')
      ]);
      setWorkloadAnalysis(workload);
      setRecommendations(recs.slice(0, 3));
    } catch (error) {
      console.error('Error loading calendar analytics:', error);
    }
  };

  const handleDateClick = (day: CalendarDay) => {
    setSelectedDate(day.date);
    onDateSelect?.(day.date);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const renderCalendarHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold">
          {currentMonth.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          })}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handlePreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <ToggleGroup 
          type="single" 
          value={calendarView} 
          onValueChange={(value) => value && setCalendarView(value as typeof calendarView)}
        >
          <ToggleGroupItem value="month" size="sm">Month</ToggleGroupItem>
          <ToggleGroupItem value="week" size="sm">Week</ToggleGroupItem>
          <ToggleGroupItem value="agenda" size="sm">Agenda</ToggleGroupItem>
          <ToggleGroupItem value="timeline" size="sm">Timeline</ToggleGroupItem>
        </ToggleGroup>

        {/* Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Options
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowWorkloadHeatmap(!showWorkloadHeatmap)}>
              {showWorkloadHeatmap ? 'Hide' : 'Show'} Workload Heatmap
            </DropdownMenuItem>
            <DropdownMenuItem>Show Study Blocks</DropdownMenuItem>
            <DropdownMenuItem>Filter by Subject</DropdownMenuItem>
            <DropdownMenuItem>Sync Calendar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const renderMonthView = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white rounded-lg border">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map(day => (
            <div key={day} className="p-4 text-center font-medium text-gray-600 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarData.map((day, index) => (
            <CalendarDayCell
              key={index}
              day={day}
              onClick={() => handleDateClick(day)}
              isSelected={selectedDate?.toDateString() === day.date.toDateString()}
              showWorkloadHeatmap={showWorkloadHeatmap}
              onAssignmentClick={onAssignmentSelect}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentMonth);
    startOfWeek.setDate(currentMonth.getDate() - currentMonth.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return calendarData.find(day => day.date.toDateString() === date.toDateString()) || {
        date,
        assignments: [],
        timeBlocks: [],
        workloadLevel: 'light' as const,
        isCurrentMonth: true,
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      };
    });

    return (
      <div className="bg-white rounded-lg border">
        <div className="grid grid-cols-7">
          {weekDays.map((day, index) => (
            <div key={index} className="border-r last:border-r-0">
              <div className="p-4 border-b bg-gray-50">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">
                    {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className={`text-lg font-bold ${
                    day.isToday ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {day.date.getDate()}
                  </p>
                </div>
              </div>
              <div className="p-2 min-h-[400px]">
                <WeekDaySchedule day={day} onAssignmentClick={onAssignmentSelect} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const upcomingAssignments = assignments
      .filter(a => new Date(a.due_date) >= new Date())
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 20);

    return (
      <div className="space-y-4">
        {upcomingAssignments.map((assignment) => (
          <AgendaAssignmentCard 
            key={assignment.id} 
            assignment={assignment}
            onClick={() => onAssignmentSelect?.(assignment)}
          />
        ))}
      </div>
    );
  };

  const renderTimelineView = () => {
    const timelineData = generateTimelineData(assignments, timeBlocks);
    
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="space-y-6">
          {timelineData.map((item, index) => (
            <TimelineItem key={index} item={item} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderCalendarHeader()}

      {/* Analytics Bar */}
      {workloadAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">This Week</p>
                  <p className="font-bold">{workloadAnalysis.due_this_week} due</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="font-bold text-red-600">{workloadAnalysis.overdue_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Est. Hours</p>
                  <p className="font-bold">{Math.round(workloadAnalysis.estimated_weekly_hours)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Workload</p>
                  <p className={`font-bold capitalize ${
                    workloadAnalysis.workload_level === 'overwhelming' ? 'text-red-600' :
                    workloadAnalysis.workload_level === 'heavy' ? 'text-orange-600' :
                    workloadAnalysis.workload_level === 'moderate' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {workloadAnalysis.workload_level}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5" />
              Smart Scheduling Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Zap className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{rec.recommendation}</p>
                    <p className="text-xs text-gray-600 mt-1">{rec.reasoning}</p>
                    <Badge variant="outline" className="text-xs mt-2">
                      {Math.round(rec.impact_score * 100)}% impact
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Calendar View */}
      <Tabs value={calendarView} onValueChange={(value) => setCalendarView(value as typeof calendarView)}>
        <TabsContent value="month">
          {renderMonthView()}
        </TabsContent>
        <TabsContent value="week">
          {renderWeekView()}
        </TabsContent>
        <TabsContent value="agenda">
          {renderAgendaView()}
        </TabsContent>
        <TabsContent value="timeline">
          {renderTimelineView()}
        </TabsContent>
      </Tabs>

      {/* Selected Date Details */}
      {selectedDate && (
        <DateDetailsPanel 
          date={selectedDate}
          assignments={assignments.filter(a => 
            new Date(a.due_date).toDateString() === selectedDate.toDateString()
          )}
          timeBlocks={timeBlocks.filter(tb => 
            tb.start_time.toDateString() === selectedDate.toDateString()
          )}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
};

// Calendar Day Cell Component
const CalendarDayCell: React.FC<{
  day: CalendarDay;
  onClick: () => void;
  isSelected: boolean;
  showWorkloadHeatmap: boolean;
  onAssignmentClick?: (assignment: EnhancedAssignment) => void;
}> = ({ day, onClick, isSelected, showWorkloadHeatmap, onAssignmentClick }) => {
  const getWorkloadColor = (level: string) => {
    switch (level) {
      case 'overwhelming': return 'bg-red-100 border-red-200';
      case 'heavy': return 'bg-orange-100 border-orange-200';
      case 'moderate': return 'bg-yellow-100 border-yellow-200';
      case 'light': return 'bg-green-100 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getDateClasses = () => {
    let classes = 'min-h-[120px] p-2 border-b border-r last:border-r-0 cursor-pointer hover:bg-gray-50 transition-colors ';
    
    if (!day.isCurrentMonth) classes += 'bg-gray-50 text-gray-400 ';
    if (day.isToday) classes += 'bg-blue-50 border-blue-200 ';
    if (isSelected) classes += 'ring-2 ring-blue-500 ';
    if (showWorkloadHeatmap) classes += getWorkloadColor(day.workloadLevel);
    
    return classes;
  };

  return (
    <div className={getDateClasses()} onClick={onClick}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${
          day.isToday ? 'text-blue-600' : 
          day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
        }`}>
          {day.date.getDate()}
        </span>
        {day.assignments.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {day.assignments.length}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        {day.assignments.slice(0, 3).map((assignment) => (
          <div
            key={assignment.id}
            className="text-xs p-1 rounded bg-white border-l-2 border-l-blue-500 truncate cursor-pointer hover:bg-blue-50"
            onClick={(e) => {
              e.stopPropagation();
              onAssignmentClick?.(assignment);
            }}
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

      {/* Time blocks indicator */}
      {day.timeBlocks.length > 0 && (
        <div className="mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3 text-blue-500" />
          <span className="text-xs text-blue-600">
            {day.timeBlocks.length} scheduled
          </span>
        </div>
      )}
    </div>
  );
};

// Week Day Schedule Component
const WeekDaySchedule: React.FC<{
  day: CalendarDay;
  onAssignmentClick?: (assignment: EnhancedAssignment) => void;
}> = ({ day, onAssignmentClick }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-1">
      {/* Assignments due this day */}
      {day.assignments.map((assignment) => (
        <div
          key={assignment.id}
          className="text-xs p-2 bg-blue-100 rounded border-l-2 border-l-blue-500 cursor-pointer hover:bg-blue-200"
          onClick={() => onAssignmentClick?.(assignment)}
        >
          <p className="font-medium truncate">{assignment.title}</p>
          <p className="text-gray-600">
            Due {new Date(assignment.due_date).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}
          </p>
        </div>
      ))}

      {/* Time blocks for this day */}
      {day.timeBlocks.map((block) => (
        <div
          key={block.id}
          className="text-xs p-2 bg-green-100 rounded border-l-2 border-l-green-500"
        >
          <p className="font-medium">{block.block_type}</p>
          <p className="text-gray-600">
            {block.start_time.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })} - {block.end_time.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}
          </p>
        </div>
      ))}
    </div>
  );
};

// Agenda Assignment Card Component
const AgendaAssignmentCard: React.FC<{
  assignment: EnhancedAssignment;
  onClick: () => void;
}> = ({ assignment, onClick }) => {
  const daysUntilDue = Math.ceil(
    (new Date(assignment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'border-l-red-500 bg-red-50';
    if (days <= 1) return 'border-l-orange-500 bg-orange-50';
    if (days <= 3) return 'border-l-yellow-500 bg-yellow-50';
    return 'border-l-green-500 bg-green-50';
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${getUrgencyColor(daysUntilDue)}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{assignment.title}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>{assignment.subject_name || 'No Subject'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(assignment.due_date).toLocaleDateString()}</span>
              </div>
            </div>
            {assignment.description && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {assignment.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={`${
              daysUntilDue < 0 ? 'bg-red-100 text-red-800' :
              daysUntilDue <= 1 ? 'bg-orange-100 text-orange-800' :
              daysUntilDue <= 3 ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {daysUntilDue < 0 
                ? `${Math.abs(daysUntilDue)} days overdue`
                : daysUntilDue === 0 
                ? 'Due today'
                : `${daysUntilDue} days left`
              }
            </Badge>
            {assignment.progress_percentage !== null && (
              <div className="text-right">
                <p className="text-sm font-medium">{assignment.progress_percentage}%</p>
                <Progress value={assignment.progress_percentage} className="w-16 h-2" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Timeline Item Component
const TimelineItem: React.FC<{
  item: any;
}> = ({ item }) => {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-16 text-sm text-gray-600 text-right">
        {item.time}
      </div>
      <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full mt-1"></div>
      <div className="flex-1">
        <h4 className="font-medium">{item.title}</h4>
        <p className="text-sm text-gray-600">{item.description}</p>
        {item.tags && (
          <div className="flex gap-1 mt-2">
            {item.tags.map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Date Details Panel Component
const DateDetailsPanel: React.FC<{
  date: Date;
  assignments: EnhancedAssignment[];
  timeBlocks: TimeBlock[];
  onClose: () => void;
}> = ({ date, assignments, timeBlocks, onClose }) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {date.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Assignments */}
          {assignments.length > 0 && (
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Assignments Due ({assignments.length})
              </h3>
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">{assignment.title}</h4>
                    <p className="text-sm text-gray-600">
                      {assignment.subject_name} • {assignment.assignment_type}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Study Blocks */}
          {timeBlocks.length > 0 && (
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Study Blocks ({timeBlocks.length})
              </h3>
              <div className="space-y-2">
                {timeBlocks.map((block) => (
                  <div key={block.id} className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium capitalize">{block.block_type}</h4>
                      <span className="text-sm text-gray-600">
                        {block.duration_minutes}min
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {block.start_time.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })} - {block.end_time.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assignments.length === 0 && timeBlocks.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No assignments or study blocks for this date</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper functions
const generateCalendarData = (
  currentMonth: Date,
  assignments: EnhancedAssignment[],
  timeBlocks: TimeBlock[]
): CalendarDay[] => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const days: CalendarDay[] = [];
  const today = new Date();

  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const dayAssignments = assignments.filter(assignment => 
      new Date(assignment.due_date).toDateString() === currentDate.toDateString()
    );

    const dayTimeBlocks = timeBlocks.filter(block =>
      block.start_time.toDateString() === currentDate.toDateString()
    );

    // Calculate workload level
    let workloadLevel: CalendarDay['workloadLevel'] = 'light';
    const totalItems = dayAssignments.length + dayTimeBlocks.length;
    if (totalItems >= 6) workloadLevel = 'overwhelming';
    else if (totalItems >= 4) workloadLevel = 'heavy';
    else if (totalItems >= 2) workloadLevel = 'moderate';

    days.push({
      date: currentDate,
      assignments: dayAssignments,
      timeBlocks: dayTimeBlocks,
      workloadLevel,
      isCurrentMonth: currentDate.getMonth() === month,
      isToday: currentDate.toDateString() === today.toDateString(),
      isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6
    });
  }

  return days;
};

const generateTimelineData = (assignments: EnhancedAssignment[], timeBlocks: TimeBlock[]) => {
  const items: any[] = [];

  // Add assignments
  assignments.forEach(assignment => {
    items.push({
      time: new Date(assignment.due_date).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      title: assignment.title,
      description: `${assignment.assignment_type} • ${assignment.subject_name}`,
      tags: [assignment.priority, assignment.status],
      type: 'assignment'
    });
  });

  // Add time blocks
  timeBlocks.forEach(block => {
    items.push({
      time: block.start_time.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      title: `Study Block - ${block.block_type}`,
      description: `${block.duration_minutes} minutes`,
      tags: ['study', block.block_type],
      type: 'timeblock'
    });
  });

  return items.sort((a, b) => a.time.localeCompare(b.time));
};