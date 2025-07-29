/**
 * Simple Assignment Modal - Debug Version
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSecureForm } from '@/hooks/useSecureForm';
import { assignmentSchema } from '@/schemas/validation';
import { sanitizeText } from '@/utils/security';
import { getSubjects, createAssignment, updateAssignment } from '@/services/supabaseService';
import type { Database } from '@/integrations/supabase/types';

type Assignment = Database['public']['Tables']['assignments']['Row'];

interface SimpleAssignmentModalProps {
  onClose: () => void;
  onSave?: (assignment: Assignment) => void;
  editingAssignment?: Assignment | null;
  mode?: 'create' | 'edit';
}

export const SimpleAssignmentModal: React.FC<SimpleAssignmentModalProps> = ({
  onClose,
  onSave,
  editingAssignment,
  mode = 'create'
}) => {
  const [subjects, setSubjects] = useState<Database['public']['Tables']['subjects']['Row'][]>([]);
  
  // Create a default date 7 days from now, formatted for datetime-local input
  const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const defaultDateString = defaultDate.toISOString().slice(0, 16);

  const form = useSecureForm(assignmentSchema, {
    title: editingAssignment?.title || '',
    description: editingAssignment?.description || '',
    dueDate: editingAssignment?.due_date ? new Date(editingAssignment.due_date) : defaultDate,
    assignmentType: editingAssignment?.assignment_type || 'assignment' as const,
    submissionType: editingAssignment?.submission_type || 'online' as const,
    priority: editingAssignment?.priority || 'Medium' as const,
    subjectId: editingAssignment?.subject_id || '__no_subject__',
    semesterId: '', // Add missing semesterId field for schema compatibility
    semester: editingAssignment?.semester || '',
    submissionUrl: editingAssignment?.submission_url || '',
    submissionInstructions: editingAssignment?.submission_instructions || '',
    studyTimeEstimate: editingAssignment?.study_time_estimate ? editingAssignment.study_time_estimate * 60 : 120, // Convert hours to minutes
    difficultyRating: editingAssignment?.difficulty_rating || 3,
    tags: editingAssignment?.tags || []
  });

  // Separate state for the datetime-local input string
  const editingDateString = editingAssignment?.due_date ? 
    new Date(editingAssignment.due_date).toISOString().slice(0, 16) : 
    defaultDateString;
  const [dateInputValue, setDateInputValue] = useState(editingDateString);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        console.log('🔍 Loading subjects...');
        const subjectsData = await getSubjects();
        console.log('🔍 Subjects loaded:', subjectsData);
        setSubjects(subjectsData);
      } catch (error) {
        console.error('❌ Error loading subjects:', error);
      }
    };
    loadSubjects();
  }, []);

  const handleSubmit = form.handleSubmit(
    form.submitSecurely(async (data) => {
      console.log('🟡 handleSubmit called with data:', data);
      
      try {
        console.log('🟡 Inside try block - starting submission...');
        console.log('🟡 dueDate type:', typeof data.dueDate);
        console.log('🟡 dueDate value:', data.dueDate);
        console.log('🟡 dueDate instanceof Date:', data.dueDate instanceof Date);
        
        const assignmentData = {
          title: sanitizeText(data.title),
          description: data.description ? sanitizeText(data.description) : null,
          due_date: data.dueDate instanceof Date && !isNaN(data.dueDate.getTime()) 
            ? data.dueDate.toISOString() 
            : new Date(dateInputValue).toISOString(),
          priority: data.priority,
          subject_id: (data.subjectId && data.subjectId !== '__no_subject__') ? data.subjectId : null,
          estimated_hours: Math.round(data.studyTimeEstimate / 60), // Convert minutes to hours
          status: 'Not Started'
        };

        console.log('🟡 Assignment data prepared:', assignmentData);

        let savedAssignment;
        if (mode === 'edit' && editingAssignment) {
          console.log('🟡 Calling updateAssignment...');
          savedAssignment = await updateAssignment(editingAssignment.id, assignmentData);
          console.log('🟡 Assignment updated successfully:', savedAssignment);
        } else {
          console.log('🟡 Calling createAssignment...');
          savedAssignment = await createAssignment(assignmentData);
          console.log('🟡 Assignment created successfully:', savedAssignment);
        }

        console.log('🟡 Calling onSave callback...');
        onSave?.(savedAssignment);
        
        console.log('🟡 Calling onClose...');
        onClose();
      } catch (error) {
        console.error('🔴 Error in handleSubmit:', error);
        console.error('🔴 Error stack:', error.stack);
        alert('Error creating assignment: ' + (error.message || 'Unknown error'));
      }
    }),
    (errors) => {
      console.log('🔴 Form validation failed with errors:', errors);
      console.log('🔴 Detailed validation errors:');
      Object.keys(errors).forEach(field => {
        console.log(`🔴   ${field}:`, errors[field]);
      });
      alert('Form validation failed. Please check the required fields.');
    }
  );

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">
        {mode === 'edit' ? 'Edit Assignment' : 'Add Assignment'}
      </h2>
      
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          placeholder="Assignment title"
          {...form.register('title')}
        />
        {form.formState.errors.title && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="assignmentType">Type</Label>
        <Select 
          value={form.watch('assignmentType')} 
          onValueChange={(value) => form.setValue('assignmentType', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="assignment">Assignment</SelectItem>
            <SelectItem value="exam">Exam</SelectItem>
            <SelectItem value="project">Project</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="priority">Priority</Label>
        <Select 
          value={form.watch('priority')} 
          onValueChange={(value) => form.setValue('priority', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="subject">Subject</Label>
        <Select 
          value={form.watch('subjectId')} 
          onValueChange={(value) => form.setValue('subjectId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__no_subject__">No subject</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.label || 'Unnamed Subject'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="semester">Semester</Label>
        <Input
          placeholder="e.g., Fall 2024"
          {...form.register('semester')}
        />
      </div>

      <div>
        <Label htmlFor="dueDate">Due Date</Label>
        <Input
          type="datetime-local"
          value={dateInputValue}
          onChange={(e) => {
            console.log('📅 Date input changed to:', e.target.value);
            setDateInputValue(e.target.value);
            
            if (e.target.value) {
              const dateObject = new Date(e.target.value);
              console.log('📅 Created date object:', dateObject);
              console.log('📅 Is valid date:', !isNaN(dateObject.getTime()));
              form.setValue('dueDate', dateObject);
            }
          }}
        />
        {form.formState.errors.dueDate && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.dueDate.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={() => {
            console.log('🔴 Button clicked!');
            console.log('🔴 Form state:', {
              isSubmitting: form.formState.isSubmitting,
              isValid: form.formState.isValid,
              errors: form.formState.errors
            });
            console.log('🔴 Form values:', form.getValues());
            console.log('🔴 Form errors details:');
            Object.keys(form.formState.errors).forEach(field => {
              console.log(`🔴   ${field}:`, form.formState.errors[field]);
            });
            handleSubmit();
          }}
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Saving...' : 
           mode === 'edit' ? 'Update Assignment' : 'Create Assignment'}
        </Button>
      </div>
      
    </div>
  );
};