
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface ScheduleModalProps {
  onClose: () => void;
}

export const ScheduleModal = ({ onClose }: ScheduleModalProps) => {
  const [eventTitle, setEventTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('2025-07-01');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    console.log('Adding schedule event:', { eventTitle, subject, date, time, notes });
    onClose();
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
          onChange={(e) => setEventTitle(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
          Subject
        </Label>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger>
            <SelectValue placeholder="Select a subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bio101">Biology 101</SelectItem>
            <SelectItem value="cs301">Computer Science 301</SelectItem>
            <SelectItem value="stat301">Statistics 301</SelectItem>
            <SelectItem value="psyc201">Psychology 201</SelectItem>
            <SelectItem value="chem200">Chemistry 200</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          Date & Time
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Additional Notes
        </Label>
        <Textarea
          placeholder="Location, preparation needed, etc."
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex items-center justify-end space-x-3 mt-8">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          Add Event
        </Button>
      </div>
    </div>
  );
};
