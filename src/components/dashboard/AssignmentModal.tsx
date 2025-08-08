
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSecureForm } from '@/hooks/useSecureForm';
import { assignmentSchema } from '@/schemas/validation';
import { sanitizeText } from '@/utils/security';
import { createAssignment, getSubjects } from '../../services/supabaseService';
import type { Database } from '../../integrations/supabase/types';
import type { AssignmentType } from '@/types/assignments';

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
    priority: 'Medium' as const,
    subjectId: '',
    assignmentType: 'assignment' as const,
    submissionType: 'online' as const
  });

  const [subjects, setSubjects] = useState<Database['public']['Tables']['subjects']['Row'][]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

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

  const handleSubmit = form.handleSubmit(
    form.submitSecurely(async (data) => {
      try {
        const assignmentData = {
          title: sanitizeText(data.title),
          description: data.description ? sanitizeText(data.description) : null,
          due_date: data.dueDate.toISOString(),
          assignment_type: data.assignmentType,
          submission_type: data.submissionType,
          priority: data.priority,
          subject_id: data.subjectId || null,
          status: 'Not Started'
        };
        
        await createAssignment(assignmentData);
        onClose();
        
        // Optionally refresh the page to show the new assignment
        window.location.reload();
      } catch (error) {
        console.error('Error creating assignment:', error);
        // Could add toast notification here
      }
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
        <Select value={form.watch('priority')} onValueChange={(value) => form.setValue('priority', value as 'Low' | 'Medium' | 'High')}>
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.priority && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.priority.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="assignmentType" className="block text-sm font-medium text-gray-700 mb-2">
          Type
        </Label>
        <Select value={form.watch('assignmentType')} onValueChange={(value) => form.setValue('assignmentType', value as AssignmentType)}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="assignment">Assignment</SelectItem>
            <SelectItem value="exam">Exam</SelectItem>
            <SelectItem value="project">Project</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
            <SelectItem value="presentation">Presentation</SelectItem>
            <SelectItem value="lab">Lab</SelectItem>
            <SelectItem value="homework">Homework</SelectItem>
            <SelectItem value="paper">Paper</SelectItem>
            <SelectItem value="discussion">Discussion</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.assignmentType && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.assignmentType.message}</p>
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
            <SelectValue placeholder={loadingSubjects ? "Loading subjects..." : "Select a subject"} />
          </SelectTrigger>
          <SelectContent>
            {loadingSubjects ? (
              <SelectItem value="__loading__" disabled>Loading subjects...</SelectItem>
            ) : subjects.length === 0 ? (
              <SelectItem value="__loading__" disabled>No subjects available</SelectItem>
            ) : (
              subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.label}
                </SelectItem>
              ))
            )}
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
