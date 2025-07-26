
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, Lightbulb } from 'lucide-react';
import { createScheduleEvent, updateScheduleEvent, getSubjects, checkEventConflicts, findAvailableSlots } from '../../services/supabaseService';
import { sanitizeText } from '@/utils/security';
import type { Database } from '../../integrations/supabase/types';

interface ScheduleModalProps {
  onClose: (shouldRefresh?: boolean) => void;
  editingEvent?: Database['public']['Tables']['schedule_events']['Row'] | null;
}

export const ScheduleModal = ({ onClose, editingEvent }: ScheduleModalProps) => {
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
  
  // Conflict detection state
  const [conflicts, setConflicts] = useState<Database['public']['Tables']['schedule_events']['Row'][]>([]);
  const [suggestions, setSuggestions] = useState<{ start: string; end: string }[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

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

  // Pre-populate form when editing an event
  useEffect(() => {
    if (editingEvent) {
      setEventTitle(editingEvent.title || '');
      setSubject(editingEvent.subject_id || '');
      setEventType(editingEvent.event_type || '');
      setNotes(editingEvent.description || '');
      
      if (editingEvent.start_time) {
        const startDate = new Date(editingEvent.start_time);
        const endDate = editingEvent.end_time ? new Date(editingEvent.end_time) : startDate;
        
        setDate(startDate.toISOString().split('T')[0]);
        setStartTime(startDate.toTimeString().substring(0, 5));
        setEndTime(endDate.toTimeString().substring(0, 5));
      }
    } else {
      // Reset form for new event
      setEventTitle('');
      setSubject('');
      setEventType('');
      setDate('2025-07-01');
      setStartTime('');
      setEndTime('');
      setNotes('');
    }
  }, [editingEvent]);

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

  const handleSubmit = async () => {
    if (!eventTitle.trim() || !date || !startTime || !endTime) {
      alert('Please fill in all required fields (title, date, start time, and end time)');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Combine date with start/end times to create proper datetime strings
      const startDateTime = `${date}T${startTime}:00`;
      const endDateTime = `${date}T${endTime}:00`;
      
      const eventData = {
        title: sanitizeText(eventTitle),
        subject_id: subject || null,
        event_type: eventType || null,
        start_time: startDateTime,
        end_time: endDateTime,
        description: notes ? sanitizeText(notes) : null
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
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          Time
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
