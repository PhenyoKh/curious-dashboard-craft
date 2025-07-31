
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSecureForm } from '@/hooks/useSecureForm';
import { noteSchema } from '@/schemas/validation';
import { sanitizeText } from '@/utils/security';
import { createNote, getSubjects } from '../../services/supabaseService';
import type { Database } from '../../integrations/supabase/types';

interface NewNoteModalProps {
  onClose: () => void;
}

export const NewNoteModal = ({ onClose }: NewNoteModalProps) => {
  console.log("🔥 NEWNOTEMODAL IS DEFINITELY LOADING - THIS SHOULD APPEAR IMMEDIATELY");
  console.log('🚀 NewNoteModal COMPONENT MOUNTED at:', new Date().toISOString(), '- This is the UPDATED version with real Supabase data');
  console.log('🚀 NewNoteModal: Component is mounting, initializing state...');
  
  const navigate = useNavigate();
  const form = useSecureForm(noteSchema, {
    title: '',
    content: '',
    subjectId: '',
    tags: []
  });

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Today's date as default
  const [subjects, setSubjects] = useState<Database['public']['Tables']['subjects']['Row'][]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);

  console.log("🔥 NewNoteModal: Component starting render, subjects state:", subjects);

  useEffect(() => {
    const fetchSubjects = async () => {
      console.log('🔍 NewNoteModal: Starting to fetch subjects...');
      try {
        setLoadingSubjects(true);
        setSubjectsError(null);
        const data = await getSubjects();
        console.log('🔍 NewNoteModal: Got subjects data:', data);
        console.log('🔍 NewNoteModal: Number of subjects:', data?.length || 0);
        
        if (data && data.length > 0) {
          console.log('🔍 NewNoteModal: First subject example:', data[0]);
          console.log('🔍 NewNoteModal: Available subject fields:', Object.keys(data[0]));
          console.log('🔍 NewNoteModal: All subjects with labels:', data.map(s => ({ id: s.id, label: s.label, value: s.value })));
        } else {
          console.log('🔍 NewNoteModal: No subjects found in database for this user');
        }
        
        setSubjects(data || []);
        console.log('🔍 NewNoteModal: Subjects state updated');
      } catch (error) {
        console.error('❌ NewNoteModal: Error fetching subjects:', error);
        setSubjectsError('Failed to load subjects');
      } finally {
        setLoadingSubjects(false);
        console.log('🔍 NewNoteModal: Loading subjects finished');
      }
    };

    fetchSubjects();
  }, []);

  const handleSubmit = form.handleSubmit(
    form.submitSecurely(async (data) => {
      console.log('🔍 NewNoteModal: Starting note creation...');
      console.log('🔍 NewNoteModal: Form data:', data);
      console.log('🔍 NewNoteModal: Selected date:', date);
      
      try {
        const noteData = {
          title: sanitizeText(data.title) || 'Untitled Note',
          content: '', // Start with empty content like original
          content_text: '', // Start with empty text like original
          subject_id: data.subjectId || null,
          word_count: 0,
          highlights: [], // Always include highlights like original
          created_at: date
        };
        
        console.log('🔍 NewNoteModal: Prepared note data:', noteData);
        
        const result = await createNote(noteData);
        console.log('🔍 NewNoteModal: Note created successfully:', result);
        
        // Close modal immediately
        onClose();
        
        // Navigate to editor with note metadata pre-populated
        if (result && result.id) {
          // Find the selected subject for the metadata
          const selectedSubject = subjects.find(s => s.id === data.subjectId);
          
          // Navigate to the note editor with metadata passed via state
          navigate(`/note/${result.id}`, {
            state: {
              title: noteData.title,
              subject: selectedSubject?.label || '',
              subjectId: data.subjectId,
              date: new Date(date),
              isNewNote: true
            }
          });
        }
      } catch (error) {
        console.error('❌ NewNoteModal: Error creating note:', error);
        // Could add toast notification here
      }
    })
  );

  // Debug: Log subjects state right before render
  console.log("🔥 RENDERING WITH SUBJECTS:", subjects);
  console.log('🎨 NewNoteModal RENDER: About to render with subjects state:', subjects);
  console.log('🎨 NewNoteModal RENDER: Subjects array length:', subjects.length);
  console.log('🎨 NewNoteModal RENDER: LoadingSubjects:', loadingSubjects);
  console.log('🎨 NewNoteModal RENDER: SubjectsError:', subjectsError);
  if (subjects.length > 0) {
    console.log('🎨 NewNoteModal RENDER: First subject example:', subjects[0]);
    console.log('🎨 NewNoteModal RENDER: All subject IDs:', subjects.map(s => s.id));
  }

  return (
    <div className="space-y-4">
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
            ) : subjectsError ? (
              <SelectItem value="__loading__" disabled>Error loading subjects</SelectItem>
            ) : subjects.length === 0 ? (
              <SelectItem value="__loading__" disabled>No subjects available</SelectItem>
            ) : (() => {
              // Debug: Log raw subjects array
              console.log('🔍 NewNoteModal: Raw subjects array:', subjects);
              console.log('🔍 NewNoteModal: Raw subjects count:', subjects.length);
              
              // Filter subjects with valid IDs
              const filteredSubjects = subjects.filter((subject) => {
                // Debug: log each subject's ID value
                console.log('🔍 NewNoteModal: Checking subject ID:', subject.id, 'for subject:', subject);
                
                if (!subject.id || subject.id.trim() === '') {
                  console.warn('🚨 NewNoteModal: Found subject with invalid ID:', subject);
                  return false;
                }
                return true;
              });
              
              // Debug: Log filtered subjects array
              console.log('🔍 NewNoteModal: Filtered subjects array:', filteredSubjects);
              console.log('🔍 NewNoteModal: Filtered subjects count:', filteredSubjects.length);
              console.log('🔍 NewNoteModal: All filtered subject IDs:', filteredSubjects.map(s => s.id));
              
              return filteredSubjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.label}
                </SelectItem>
              ));
            })()}
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
