
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Subject } from '@/types/note';

interface CreateNoteModalProps {
  onClose: () => void;
  onCreateNote: (noteData: { subject: string; date: Date; title: string }) => void;
  subjects: Subject[];
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  onClose,
  onCreateNote,
  subjects
}) => {
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (!subject || !title.trim()) {
      return;
    }
    
    onCreateNote({ subject, date, title });
    onClose();
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
          Subject
        </Label>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger>
            <SelectValue placeholder="Select a subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.filter(s => s.value !== '').map(subjectOption => (
              <SelectItem key={subjectOption.value} value={subjectOption.value}>
                {subjectOption.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
          Date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "MM/dd/yyyy") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(selectedDate) => selectedDate && setDate(selectedDate)}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </Label>
        <Input
          type="text"
          placeholder="e.g., Lecture 13 - Graph Theory"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end space-x-3 mt-8">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!subject || !title.trim()}
        >
          Create Note
        </Button>
      </div>
    </div>
  );
};
