
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSecureForm } from '@/hooks/useSecureForm';
import { assignmentSchema } from '@/schemas/validation';
import { sanitizeText } from '@/utils/security';

interface AssignmentModalProps {
  onClose: () => void;
}

export const AssignmentModal = ({ onClose }: AssignmentModalProps) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const form = useSecureForm(assignmentSchema, {
    title: '',
    description: '',
    dueDate: tomorrow,
    priority: 'medium' as const,
    subjectId: ''
  });

  const handleSubmit = form.handleSubmit(
    form.submitSecurely(async (data) => {
      console.log('Adding assignment:', data);
      onClose();
    })
  );

  const handleDateChange = (dateString: string) => {
    if (dateString) {
      const date = new Date(dateString);
      form.setValue('dueDate', date);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
          Priority
        </Label>
        <Select value={form.watch('priority')} onValueChange={(value) => form.setValue('priority', value as 'low' | 'medium' | 'high')}>
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.priority && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.priority.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </Label>
        <Input
          type="text"
          placeholder="e.g., Essay 3, Midterm Exam"
          {...form.register('title')}
        />
        {form.formState.errors.title && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
          Subject
        </Label>
        <Select value={form.watch('subjectId')} onValueChange={(value) => form.setValue('subjectId', value)}>
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
        {form.formState.errors.subjectId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.subjectId.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
          Due Date
        </Label>
        <Input
          type="date"
          defaultValue={tomorrow.toISOString().split('T')[0]}
          onChange={(e) => handleDateChange(sanitizeText(e.target.value))}
        />
        {form.formState.errors.dueDate && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.dueDate.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description (Optional)
        </Label>
        <Input
          type="text"
          placeholder="e.g., Research paper on machine learning algorithms"
          {...form.register('description')}
        />
        {form.formState.errors.description && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
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
          {form.formState.isSubmitting ? 'Adding...' : 'Add Assignment'}
        </Button>
      </div>
    </div>
  );
};
