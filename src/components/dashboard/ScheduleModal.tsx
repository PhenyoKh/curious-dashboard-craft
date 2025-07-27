
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Clock, Lightbulb, Repeat } from 'lucide-react';
import { createScheduleEvent, updateScheduleEvent, getSubjects, checkEventConflicts, findAvailableSlots } from '../../services/supabaseService';
import { sanitizeText } from '@/utils/security';
import type { Database } from '../../integrations/supabase/types';
import { RecurrenceType, WeekDay, RecurrencePattern, MonthlyRecurrenceBy, WeekOfMonth, SeriesPreview } from '../../types/recurrence';
import { RecurrenceService } from '../../services/recurrenceService';
import { TimezoneService, UserTimezonePreferences } from '../../services/timezoneService';
import { UserPreferencesService, CalendarSettings } from '../../services/userPreferencesService';
import { useAuth } from '../../contexts/AuthContext';

interface ScheduleModalProps {
  onClose: (shouldRefresh?: boolean) => void;
  editingEvent?: Database['public']['Tables']['schedule_events']['Row'] | null;
}

export const ScheduleModal = ({ onClose, editingEvent }: ScheduleModalProps) => {
  const { user } = useAuth();
  const [eventTitle, setEventTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [eventType, setEventType] = useState('');
  const [date, setDate] = useState('2025-07-01');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [subjects, setSubjects] = useState<Database['public']['Tables']['subjects']['Row'][]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Timezone state
  const [userPreferences, setUserPreferences] = useState<CalendarSettings | null>(null);
  const [userTimezone, setUserTimezone] = useState<string>('UTC');
  const [eventTimezone, setEventTimezone] = useState<string>('UTC');
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  
  // Conflict detection state
  const [conflicts, setConflicts] = useState<Database['public']['Tables']['schedule_events']['Row'][]>([]);
  const [suggestions, setSuggestions] = useState<{ start: string; end: string }[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  
  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(RecurrenceType.WEEKLY);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [selectedWeekDays, setSelectedWeekDays] = useState<WeekDay[]>([]);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'date' | 'count'>('never');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(10);
  const [workdaysOnly, setWorkdaysOnly] = useState(false);
  
  // Advanced monthly/yearly state
  const [monthlyBy, setMonthlyBy] = useState<MonthlyRecurrenceBy>(MonthlyRecurrenceBy.DAY_OF_MONTH);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [weekOfMonth, setWeekOfMonth] = useState<WeekOfMonth>(WeekOfMonth.FIRST);
  const [weekDay, setWeekDay] = useState<WeekDay>(WeekDay.MONDAY);
  const [yearlyBy, setYearlyBy] = useState<MonthlyRecurrenceBy>(MonthlyRecurrenceBy.DAY_OF_MONTH);
  const [month, setMonth] = useState(1);
  
  // Series preview state
  const [seriesPreview, setSeriesPreview] = useState<SeriesPreview | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await getSubjects();
        setSubjects(data || []);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  // Load user preferences and timezone
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user?.id) return;
      
      try {
        setLoadingPreferences(true);
        const preferences = await UserPreferencesService.getUserPreferences(user.id);
        setUserPreferences(preferences);
        setUserTimezone(preferences.user_timezone);
        setEventTimezone(preferences.user_timezone); // Default event timezone to user's timezone
      } catch (error) {
        console.error('Error loading user preferences:', error);
        // Fallback to detected timezone
        const detectedTimezone = TimezoneService.getUserTimezone();
        setUserTimezone(detectedTimezone);
        setEventTimezone(detectedTimezone);
      } finally {
        setLoadingPreferences(false);
      }
    };

    loadUserPreferences();
  }, [user?.id]);

  // Pre-populate form when editing an event
  useEffect(() => {
    if (editingEvent && userTimezone) {
      setEventTitle(editingEvent.title || '');
      setSubject(editingEvent.subject_id || '');
      setEventType(editingEvent.event_type || '');
      setNotes(editingEvent.description || '');
      
      if (editingEvent.start_time) {
        // Convert from UTC storage to user's local timezone for display
        const localStartTime = TimezoneService.fromUTC(editingEvent.start_time, userTimezone);
        const localEndTime = editingEvent.end_time ? 
          TimezoneService.fromUTC(editingEvent.end_time, userTimezone) : localStartTime;
        
        const startDate = new Date(localStartTime);
        const endDate = new Date(localEndTime);
        
        setDate(startDate.toISOString().split('T')[0]);
        setStartTime(startDate.toTimeString().substring(0, 5));
        setEndTime(endDate.toTimeString().substring(0, 5));
        
        // Set event timezone if available (fallback to user timezone)
        setEventTimezone(userTimezone); // TODO: Get from event record when column is available
      }
    } else if (!editingEvent) {
      // Reset form for new event
      setEventTitle('');
      setSubject('');
      setEventType('');
      
      // Set default date to today in user's timezone
      const today = new Date();
      setDate(today.toISOString().split('T')[0]);
      
      // Set default times based on user preferences
      if (userPreferences) {
        const now = new Date();
        const roundedHour = new Date(now.getTime() + userPreferences.default_event_duration * 60000);
        roundedHour.setMinutes(0, 0, 0); // Round to hour
        
        setStartTime(roundedHour.toTimeString().substring(0, 5));
        
        const endTime = new Date(roundedHour.getTime() + userPreferences.default_event_duration * 60000);
        setEndTime(endTime.toTimeString().substring(0, 5));
      } else {
        setStartTime('');
        setEndTime('');
      }
      
      setNotes('');
      
      // Reset recurrence state
      setIsRecurring(false);
      setRecurrenceType(RecurrenceType.WEEKLY);
      setRecurrenceInterval(1);
      setSelectedWeekDays([]);
      setRecurrenceEndType('never');
      setRecurrenceEndDate('');
      setRecurrenceOccurrences(10);
      setWorkdaysOnly(false);
      
      // Reset advanced settings
      setMonthlyBy(MonthlyRecurrenceBy.DAY_OF_MONTH);
      setDayOfMonth(1);
      setWeekOfMonth(WeekOfMonth.FIRST);
      setWeekDay(WeekDay.MONDAY);
      setYearlyBy(MonthlyRecurrenceBy.DAY_OF_MONTH);
      setMonth(1);
      setSeriesPreview(null);
      
      // Reset event timezone to user's timezone
      setEventTimezone(userTimezone || TimezoneService.getUserTimezone());
    }
  }, [editingEvent, userTimezone, userPreferences]);

  // Check for conflicts when date/time changes
  const checkConflicts = useCallback(async () => {
    if (!date || !startTime || !endTime) {
      setConflicts([]);
      setSuggestions([]);
      return;
    }

    try {
      setIsCheckingConflicts(true);
      
      const startDateTime = `${date}T${startTime}:00`;
      const endDateTime = `${date}T${endTime}:00`;
      
      // Check for conflicts
      const conflictingEvents = await checkEventConflicts(
        startDateTime, 
        endDateTime, 
        editingEvent?.id
      );
      setConflicts(conflictingEvents);

      // If there are conflicts, suggest alternative times
      if (conflictingEvents.length > 0) {
        const startDate = new Date(startDateTime);
        const endDate = new Date(endDateTime);
        const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
        
        const availableSlots = await findAvailableSlots(date, durationMinutes);
        setSuggestions(availableSlots.slice(0, 3)); // Show top 3 suggestions
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setIsCheckingConflicts(false);
    }
  }, [date, startTime, endTime, editingEvent?.id]);

  // Debounced conflict checking
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkConflicts();
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [checkConflicts]);

  // Apply suggested time slot
  const applySuggestion = (suggestion: { start: string; end: string }) => {
    const startDate = new Date(suggestion.start);
    const endDate = new Date(suggestion.end);
    
    setStartTime(startDate.toTimeString().substring(0, 5));
    setEndTime(endDate.toTimeString().substring(0, 5));
  };

  // Handle weekday selection for weekly recurrence
  const toggleWeekDay = (day: WeekDay) => {
    setSelectedWeekDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  // Helper to get weekday name
  const getWeekDayName = (day: WeekDay): string => {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return names[day];
  };

  // Auto-populate settings when switching recurrence types
  useEffect(() => {
    if (!date) return;
    
    const eventDate = new Date(date);
    
    if (recurrenceType === RecurrenceType.WEEKLY && selectedWeekDays.length === 0) {
      const weekDay = eventDate.getDay() as WeekDay;
      setSelectedWeekDays([weekDay]);
    } else if (recurrenceType === RecurrenceType.MONTHLY) {
      setDayOfMonth(eventDate.getDate());
      setWeekDay(eventDate.getDay() as WeekDay);
      setWeekOfMonth(Math.ceil(eventDate.getDate() / 7) as WeekOfMonth);
    } else if (recurrenceType === RecurrenceType.YEARLY) {
      setDayOfMonth(eventDate.getDate());
      setMonth(eventDate.getMonth() + 1); // getMonth() is 0-based
      setWeekDay(eventDate.getDay() as WeekDay);
      setWeekOfMonth(Math.ceil(eventDate.getDate() / 7) as WeekOfMonth);
    }
  }, [recurrenceType, selectedWeekDays.length, date]);

  // Generate series preview when recurrence settings change
  useEffect(() => {
    if (!isRecurring || !eventTitle || !date || !startTime || !endTime) {
      setSeriesPreview(null);
      return;
    }

    try {
      const pattern: RecurrencePattern = {
        type: recurrenceType,
        interval: recurrenceInterval,
        daysOfWeek: recurrenceType === RecurrenceType.WEEKLY ? selectedWeekDays : undefined,
        monthlyBy: recurrenceType === RecurrenceType.MONTHLY ? monthlyBy : undefined,
        dayOfMonth: (recurrenceType === RecurrenceType.MONTHLY || recurrenceType === RecurrenceType.YEARLY) && 
                   (monthlyBy === MonthlyRecurrenceBy.DAY_OF_MONTH || yearlyBy === MonthlyRecurrenceBy.DAY_OF_MONTH) 
                   ? dayOfMonth : undefined,
        weekOfMonth: (recurrenceType === RecurrenceType.MONTHLY || recurrenceType === RecurrenceType.YEARLY) && 
                    (monthlyBy === MonthlyRecurrenceBy.DAY_OF_WEEK || yearlyBy === MonthlyRecurrenceBy.DAY_OF_WEEK) 
                    ? weekOfMonth : undefined,
        weekDay: (recurrenceType === RecurrenceType.MONTHLY || recurrenceType === RecurrenceType.YEARLY) && 
                (monthlyBy === MonthlyRecurrenceBy.DAY_OF_WEEK || yearlyBy === MonthlyRecurrenceBy.DAY_OF_WEEK) 
                ? weekDay : undefined,
        yearlyBy: recurrenceType === RecurrenceType.YEARLY ? yearlyBy : undefined,
        month: recurrenceType === RecurrenceType.YEARLY ? month : undefined,
        endDate: recurrenceEndType === 'date' ? recurrenceEndDate : undefined,
        occurrences: recurrenceEndType === 'count' ? recurrenceOccurrences : undefined,
        workdaysOnly: recurrenceType === RecurrenceType.DAILY ? workdaysOnly : undefined
      };

      const baseEvent = {
        title: eventTitle,
        start_time: `${date}T${startTime}:00`,
        end_time: `${date}T${endTime}:00`
      };

      const preview = RecurrenceService.getSeriesPreview(pattern, baseEvent);
      setSeriesPreview(preview);
    } catch (error) {
      console.warn('Failed to generate series preview:', error);
      setSeriesPreview(null);
    }
  }, [
    isRecurring, eventTitle, date, startTime, endTime, 
    recurrenceType, recurrenceInterval, selectedWeekDays,
    monthlyBy, dayOfMonth, weekOfMonth, weekDay,
    yearlyBy, month, recurrenceEndType, recurrenceEndDate, 
    recurrenceOccurrences, workdaysOnly
  ]);

  const handleSubmit = async () => {
    if (!eventTitle.trim() || !date || !startTime || !endTime) {
      alert('Please fill in all required fields (title, date, start time, and end time)');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Combine date with start/end times to create proper datetime strings in event timezone
      const localStartDateTime = `${date}T${startTime}:00`;
      const localEndDateTime = `${date}T${endTime}:00`;
      
      // Convert to UTC for storage
      const startDateTime = TimezoneService.toUTC(localStartDateTime, eventTimezone);
      const endDateTime = TimezoneService.toUTC(localEndDateTime, eventTimezone);
      
      // Create recurrence pattern if event is recurring
      let recurrencePattern: RecurrencePattern | null = null;
      if (isRecurring) {
        recurrencePattern = {
          type: recurrenceType,
          interval: recurrenceInterval,
          daysOfWeek: recurrenceType === RecurrenceType.WEEKLY ? selectedWeekDays : undefined,
          monthlyBy: recurrenceType === RecurrenceType.MONTHLY ? monthlyBy : undefined,
          dayOfMonth: (recurrenceType === RecurrenceType.MONTHLY || recurrenceType === RecurrenceType.YEARLY) && 
                     (monthlyBy === MonthlyRecurrenceBy.DAY_OF_MONTH || yearlyBy === MonthlyRecurrenceBy.DAY_OF_MONTH) 
                     ? dayOfMonth : undefined,
          weekOfMonth: (recurrenceType === RecurrenceType.MONTHLY || recurrenceType === RecurrenceType.YEARLY) && 
                      (monthlyBy === MonthlyRecurrenceBy.DAY_OF_WEEK || yearlyBy === MonthlyRecurrenceBy.DAY_OF_WEEK) 
                      ? weekOfMonth : undefined,
          weekDay: (recurrenceType === RecurrenceType.MONTHLY || recurrenceType === RecurrenceType.YEARLY) && 
                  (monthlyBy === MonthlyRecurrenceBy.DAY_OF_WEEK || yearlyBy === MonthlyRecurrenceBy.DAY_OF_WEEK) 
                  ? weekDay : undefined,
          yearlyBy: recurrenceType === RecurrenceType.YEARLY ? yearlyBy : undefined,
          month: recurrenceType === RecurrenceType.YEARLY ? month : undefined,
          endDate: recurrenceEndType === 'date' ? recurrenceEndDate : undefined,
          occurrences: recurrenceEndType === 'count' ? recurrenceOccurrences : undefined,
          workdaysOnly: recurrenceType === RecurrenceType.DAILY ? workdaysOnly : undefined
        };
      }

      const eventData = {
        title: sanitizeText(eventTitle),
        subject_id: subject || null,
        event_type: eventType || null,
        start_time: startDateTime,
        end_time: endDateTime,
        description: notes ? sanitizeText(notes) : null,
        is_recurring: isRecurring,
        recurrence_pattern: recurrencePattern ? JSON.stringify(recurrencePattern) : null,
        event_timezone: eventTimezone,
        reminder_minutes: userPreferences?.default_reminder_minutes || 15
      };
      
      if (editingEvent) {
        // Update existing event
        await updateScheduleEvent(editingEvent.id, eventData);
      } else {
        // Create new event
        await createScheduleEvent(eventData);
      }
      
      onClose(true); // Close modal and refresh schedule
    } catch (error) {
      console.error('Error saving schedule event:', error);
      alert(`Failed to ${editingEvent ? 'update' : 'create'} event. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="eventTitle" className="block text-sm font-medium text-gray-700 mb-2">
          Event Title
        </Label>
        <Input
          type="text"
          placeholder="e.g., Study Group Meeting"
          value={eventTitle}
          onChange={(e) => setEventTitle(sanitizeText(e.target.value))}
          required
        />
      </div>
      <div>
        <Label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-2">
          Event Type
        </Label>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger>
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lecture">Lecture</SelectItem>
            <SelectItem value="lab">Lab Session</SelectItem>
            <SelectItem value="office hours">Office Hours</SelectItem>
            <SelectItem value="exam">Exam</SelectItem>
            <SelectItem value="study group">Study Group</SelectItem>
            <SelectItem value="review session">Review Session</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
          Subject (Optional)
        </Label>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger>
            <SelectValue placeholder={loadingSubjects ? "Loading subjects..." : "Select a subject"} />
          </SelectTrigger>
          <SelectContent>
            {loadingSubjects ? (
              <SelectItem value="__loading__" disabled>Loading subjects...</SelectItem>
            ) : subjects.length === 0 ? (
              <SelectItem value="__loading__" disabled>No subjects available</SelectItem>
            ) : (
              subjects.map((subjectItem) => (
                <SelectItem key={subjectItem.id} value={subjectItem.id}>
                  {subjectItem.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          Date
        </Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(sanitizeText(e.target.value))}
          required
        />
      </div>
      
      {/* Timezone Selection */}
      {!loadingPreferences && (
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </Label>
          <Select value={eventTimezone} onValueChange={setEventTimezone}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TimezoneService.getPopularTimezones().map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label} {tz.offset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {eventTimezone !== userTimezone && (
            <p className="text-xs text-orange-600 mt-1">
              ⚠️ Event timezone differs from your timezone ({TimezoneService.getTimezoneInfo(userTimezone).abbreviation})
            </p>
          )}
        </div>
      )}
      
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          Time {userPreferences?.show_timezone_in_events && eventTimezone ? 
            `(${TimezoneService.getTimezoneInfo(eventTimezone).abbreviation})` : ''}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="block text-xs text-gray-500 mb-1">Start Time</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(sanitizeText(e.target.value))}
              required
            />
          </div>
          <div>
            <Label className="block text-xs text-gray-500 mb-1">End Time</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(sanitizeText(e.target.value))}
              required
            />
          </div>
        </div>
      </div>
      <div>
        <Label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Additional Notes (Optional)
        </Label>
        <Textarea
          placeholder="Location, preparation needed, etc."
          rows={3}
          value={notes}
          onChange={(e) => setNotes(sanitizeText(e.target.value))}
        />
      </div>

      {/* Recurrence Settings */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="recurring"
            checked={isRecurring}
            onCheckedChange={setIsRecurring}
          />
          <Label htmlFor="recurring" className="flex items-center text-sm font-medium text-gray-700">
            <Repeat className="h-4 w-4 mr-1" />
            Make this a recurring event
          </Label>
        </div>

        {isRecurring && (
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            {/* Recurrence Type */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat
              </Label>
              <Select 
                value={recurrenceType} 
                onValueChange={(value) => setRecurrenceType(value as RecurrenceType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RecurrenceType.DAILY}>Daily</SelectItem>
                  <SelectItem value={RecurrenceType.WEEKLY}>Weekly</SelectItem>
                  <SelectItem value={RecurrenceType.MONTHLY}>Monthly</SelectItem>
                  <SelectItem value={RecurrenceType.YEARLY}>Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recurrence Interval */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Every
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="1"
                  max="52"
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <span className="text-sm text-gray-600">
                  {recurrenceType}{recurrenceInterval > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Weekly: Day Selection */}
            {recurrenceType === RecurrenceType.WEEKLY && (
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  On these days
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[WeekDay.SUNDAY, WeekDay.MONDAY, WeekDay.TUESDAY, WeekDay.WEDNESDAY, WeekDay.THURSDAY, WeekDay.FRIDAY, WeekDay.SATURDAY].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeekDay(day)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        selectedWeekDays.includes(day)
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      } border`}
                    >
                      {getWeekDayName(day)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Daily: Workdays Only */}
            {recurrenceType === RecurrenceType.DAILY && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="workdaysOnly"
                  checked={workdaysOnly}
                  onCheckedChange={setWorkdaysOnly}
                />
                <Label htmlFor="workdaysOnly" className="text-sm text-gray-700">
                  Weekdays only (Mon-Fri)
                </Label>
              </div>
            )}

            {/* Monthly: Advanced Options */}
            {recurrenceType === RecurrenceType.MONTHLY && (
              <div className="space-y-3">
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Repeat by
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="monthlyByDay"
                      name="monthlyBy"
                      checked={monthlyBy === MonthlyRecurrenceBy.DAY_OF_MONTH}
                      onChange={() => setMonthlyBy(MonthlyRecurrenceBy.DAY_OF_MONTH)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <Label htmlFor="monthlyByDay" className="text-sm text-gray-700 mr-2">
                      Day of month
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                      disabled={monthlyBy !== MonthlyRecurrenceBy.DAY_OF_MONTH}
                      className="w-16"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="monthlyByWeek"
                      name="monthlyBy"
                      checked={monthlyBy === MonthlyRecurrenceBy.DAY_OF_WEEK}
                      onChange={() => setMonthlyBy(MonthlyRecurrenceBy.DAY_OF_WEEK)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <Label htmlFor="monthlyByWeek" className="text-sm text-gray-700 mr-2">
                      Day of week
                    </Label>
                    <Select 
                      value={weekOfMonth.toString()} 
                      onValueChange={(value) => setWeekOfMonth(parseInt(value) as WeekOfMonth)}
                      disabled={monthlyBy !== MonthlyRecurrenceBy.DAY_OF_WEEK}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st</SelectItem>
                        <SelectItem value="2">2nd</SelectItem>
                        <SelectItem value="3">3rd</SelectItem>
                        <SelectItem value="4">4th</SelectItem>
                        <SelectItem value="-1">Last</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={weekDay.toString()} 
                      onValueChange={(value) => setWeekDay(parseInt(value) as WeekDay)}
                      disabled={monthlyBy !== MonthlyRecurrenceBy.DAY_OF_WEEK}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Yearly: Advanced Options */}
            {recurrenceType === RecurrenceType.YEARLY && (
              <div className="space-y-3">
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Repeat by
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="yearlyByDate"
                      name="yearlyBy"
                      checked={yearlyBy === MonthlyRecurrenceBy.DAY_OF_MONTH}
                      onChange={() => setYearlyBy(MonthlyRecurrenceBy.DAY_OF_MONTH)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <Label htmlFor="yearlyByDate" className="text-sm text-gray-700 mr-2">
                      Date
                    </Label>
                    <Select 
                      value={month.toString()} 
                      onValueChange={(value) => setMonth(parseInt(value))}
                      disabled={yearlyBy !== MonthlyRecurrenceBy.DAY_OF_MONTH}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Jan</SelectItem>
                        <SelectItem value="2">Feb</SelectItem>
                        <SelectItem value="3">Mar</SelectItem>
                        <SelectItem value="4">Apr</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">Jun</SelectItem>
                        <SelectItem value="7">Jul</SelectItem>
                        <SelectItem value="8">Aug</SelectItem>
                        <SelectItem value="9">Sep</SelectItem>
                        <SelectItem value="10">Oct</SelectItem>
                        <SelectItem value="11">Nov</SelectItem>
                        <SelectItem value="12">Dec</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                      disabled={yearlyBy !== MonthlyRecurrenceBy.DAY_OF_MONTH}
                      className="w-16"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="yearlyByWeek"
                      name="yearlyBy"
                      checked={yearlyBy === MonthlyRecurrenceBy.DAY_OF_WEEK}
                      onChange={() => setYearlyBy(MonthlyRecurrenceBy.DAY_OF_WEEK)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <Label htmlFor="yearlyByWeek" className="text-sm text-gray-700 mr-2">
                      Day of week
                    </Label>
                    <Select 
                      value={weekOfMonth.toString()} 
                      onValueChange={(value) => setWeekOfMonth(parseInt(value) as WeekOfMonth)}
                      disabled={yearlyBy !== MonthlyRecurrenceBy.DAY_OF_WEEK}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st</SelectItem>
                        <SelectItem value="2">2nd</SelectItem>
                        <SelectItem value="3">3rd</SelectItem>
                        <SelectItem value="4">4th</SelectItem>
                        <SelectItem value="-1">Last</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={weekDay.toString()} 
                      onValueChange={(value) => setWeekDay(parseInt(value) as WeekDay)}
                      disabled={yearlyBy !== MonthlyRecurrenceBy.DAY_OF_WEEK}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">in</span>
                    <Select 
                      value={month.toString()} 
                      onValueChange={(value) => setMonth(parseInt(value))}
                      disabled={yearlyBy !== MonthlyRecurrenceBy.DAY_OF_WEEK}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Jan</SelectItem>
                        <SelectItem value="2">Feb</SelectItem>
                        <SelectItem value="3">Mar</SelectItem>
                        <SelectItem value="4">Apr</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">Jun</SelectItem>
                        <SelectItem value="7">Jul</SelectItem>
                        <SelectItem value="8">Aug</SelectItem>
                        <SelectItem value="9">Sep</SelectItem>
                        <SelectItem value="10">Oct</SelectItem>
                        <SelectItem value="11">Nov</SelectItem>
                        <SelectItem value="12">Dec</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* End Condition */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Ends
              </Label>
              <div className="space-y-3">
                {/* Never */}
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="never"
                    name="endType"
                    checked={recurrenceEndType === 'never'}
                    onChange={() => setRecurrenceEndType('never')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <Label htmlFor="never" className="text-sm text-gray-700">
                    Never
                  </Label>
                </div>

                {/* On Date */}
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="endDate"
                    name="endType"
                    checked={recurrenceEndType === 'date'}
                    onChange={() => setRecurrenceEndType('date')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <Label htmlFor="endDate" className="text-sm text-gray-700 mr-2">
                    On
                  </Label>
                  <Input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    disabled={recurrenceEndType !== 'date'}
                    className="flex-1"
                  />
                </div>

                {/* After Count */}
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="endCount"
                    name="endType"
                    checked={recurrenceEndType === 'count'}
                    onChange={() => setRecurrenceEndType('count')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <Label htmlFor="endCount" className="text-sm text-gray-700 mr-2">
                    After
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={recurrenceOccurrences}
                    onChange={(e) => setRecurrenceOccurrences(parseInt(e.target.value) || 1)}
                    disabled={recurrenceEndType !== 'count'}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-600">occurrences</span>
                </div>
              </div>
            </div>

            {/* Series Preview */}
            {seriesPreview && (
              <div className="bg-green-50 p-3 rounded-md">
                <p className="text-sm font-medium text-green-800 mb-2">
                  📅 Upcoming occurrences ({seriesPreview.totalCount} total)
                </p>
                <div className="space-y-1 text-sm text-green-700">
                  {seriesPreview.nextOccurrences.slice(0, 5).map((instance, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{new Date(`${instance.date}T${instance.startTime}`).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}</span>
                      <span>{instance.startTime} - {instance.endTime}</span>
                    </div>
                  ))}
                  {seriesPreview.nextOccurrences.length > 5 && (
                    <p className="text-xs text-green-600 italic">
                      ... and {seriesPreview.nextOccurrences.length - 5} more in the next year
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Recurrence Summary */}
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Summary:</strong> Repeats {recurrenceInterval > 1 ? `every ${recurrenceInterval} ` : ''}
                {recurrenceType}
                {recurrenceType === RecurrenceType.WEEKLY && selectedWeekDays.length > 0 && 
                  ` on ${selectedWeekDays.map(d => getWeekDayName(d)).join(', ')}`
                }
                {recurrenceType === RecurrenceType.DAILY && workdaysOnly && ' (weekdays only)'}
                {recurrenceEndType === 'date' && ` until ${recurrenceEndDate}`}
                {recurrenceEndType === 'count' && ` for ${recurrenceOccurrences} times`}
                {recurrenceEndType === 'never' && ' indefinitely'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Conflict Detection Results */}
      {(conflicts.length > 0 || isCheckingConflicts) && (
        <div className="space-y-3">
          {/* Checking indicator */}
          {isCheckingConflicts && (
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Checking for scheduling conflicts...
              </AlertDescription>
            </Alert>
          )}

          {/* Conflict warnings */}
          {conflicts.length > 0 && !isCheckingConflicts && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="space-y-2">
                  <p className="font-medium">
                    ⚠️ Time conflict detected with {conflicts.length} existing event{conflicts.length > 1 ? 's' : ''}:
                  </p>
                  <ul className="space-y-1 text-sm">
                    {conflicts.map((conflict) => (
                      <li key={conflict.id} className="flex items-center justify-between">
                        <span>• {conflict.title}</span>
                        <span className="text-xs">
                          {new Date(conflict.start_time).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} - {new Date(conflict.end_time).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Time suggestions */}
          {suggestions.length > 0 && !isCheckingConflicts && (
            <Alert className="border-green-200 bg-green-50">
              <Lightbulb className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-3">
                  <p className="font-medium">💡 Suggested available times:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => applySuggestion(suggestion)}
                        className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-md text-sm transition-colors"
                      >
                        {new Date(suggestion.start).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} - {new Date(suggestion.end).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </button>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="flex items-center justify-end space-x-3 mt-8">
        <Button variant="ghost" onClick={() => onClose(false)} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !eventTitle.trim() || !date || !startTime || !endTime}
        >
          {isSubmitting 
            ? (editingEvent ? 'Updating...' : 'Adding...') 
            : (editingEvent ? 'Update Event' : 'Add Event')
          }
        </Button>
      </div>
    </div>
  );
};
