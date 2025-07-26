
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createScheduleEvent, updateScheduleEvent, getSubjects } from '../../services/supabaseService';
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
