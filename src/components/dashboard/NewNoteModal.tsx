
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSecureForm } from '@/hooks/useSecureForm';
import { noteSchema } from '@/schemas/validation';
import { sanitizeText } from '@/utils/security';

interface NewNoteModalProps {
  onClose: () => void;
}

export const NewNoteModal = ({ onClose }: NewNoteModalProps) => {
  const form = useSecureForm(noteSchema, {
    title: '',
    content: '',
    subjectId: '',
    tags: []
  });

  const [date, setDate] = useState('2025-07-01');

  const handleSubmit = form.handleSubmit(
    form.submitSecurely(async (data) => {
      console.log('Creating new note:', { 
        ...data, 
        date: sanitizeText(date) 
      });
      onClose();
    })
  );

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
          Subject
        </Label>
        <Select value={form.watch('subjectId')} onValueChange={(value) => form.setValue('subjectId', value)}>
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
        {form.formState.errors.subjectId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.subjectId.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
          Date
        </Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(sanitizeText(e.target.value))}
        />
      </div>
      <div>
        <Label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </Label>
        <Input
          type="text"
          placeholder="e.g., Lecture 13 - Graph Theory"
          {...form.register('title')}
        />
        {form.formState.errors.title && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>
        )}
      </div>
      <div className="flex items-center justify-end space-x-3 mt-8">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={form.formState.isSubmitting || !form.formState.isValid}
        >
          {form.formState.isSubmitting ? 'Creating...' : 'Create Note'}
        </Button>
      </div>
    </div>
  );
};
