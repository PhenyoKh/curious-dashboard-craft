
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NewNoteModalProps {
  onClose: () => void;
}

export const NewNoteModal = ({ onClose }: NewNoteModalProps) => {
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('2025-07-01');
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    console.log('Creating new note:', { subject, date, title });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
          Subject
        </Label>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger>
            <SelectValue placeholder="Select a subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cs301">Computer Science 301</SelectItem>
            <SelectItem value="bio101">Biology 101</SelectItem>
            <SelectItem value="stat301">Statistics 301</SelectItem>
            <SelectItem value="psyc201">Psychology 201</SelectItem>
            <SelectItem value="chem200">Chemistry 200</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
          Date
        </Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
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
        <Button onClick={handleSubmit}>
          Create Note
        </Button>
      </div>
    </div>
  );
};
