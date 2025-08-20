
import { useState, useCallback, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { NoteMetadata, Subject } from '@/types/note';
import { Highlight } from '@/types/highlight';
import { calculateWordCount } from '@/utils/noteUtils';
import { htmlToText, getWordCountFromHtml } from '@/utils/htmlToText';
import { getSubjects, getNoteById, updateNoteById, createNote, deleteNote as deleteNoteService } from '@/services/supabaseService';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';

export const useNoteState = () => {
  const location = useLocation();
  const { id: noteId } = useParams<{ id: string }>();
  const initialNoteData = location.state as { 
    subject: string; 
    subjectId: string;
    date: Date; 
    title: string;
    isNewNote?: boolean;
  } | null;
  
  const [title, setTitle] = useState<string>(initialNoteData?.title || '');
  const [content, setContent] = useState<string>('');
  const [metadata, setMetadata] = useState<NoteMetadata>({
    subject: initialNoteData?.subjectId || '',
    createdAt: initialNoteData?.date || new Date(),
    modifiedAt: new Date()
  });
  const [isAutoSaved, setIsAutoSaved] = useState<boolean>(true);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [wordCount, setWordCount] = useState<number>(0);
  const [showPlaceholder, setShowPlaceholder] = useState<boolean>(true);
  const [subjects, setSubjects] = useState<Database['public']['Tables']['subjects']['Row'][]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!!noteId);
  
  // Load existing note if noteId is provided
  useEffect(() => {
    if (!noteId) return;
    
    const loadNote = async () => {
      try {
        setIsLoading(true);
        const note = await getNoteById(noteId);
        if (note) {
          setTitle(note.title || '');
          setContent(note.content || '');
          setMetadata({
            subject: note.subject_id || '',
            createdAt: new Date(note.created_at),
            modifiedAt: new Date(note.modified_at)
          });
          setWordCount(getWordCountFromHtml(note.content || ''));
          setShowPlaceholder((note.content || '').trim() === '' || note.content === '<br>');
        }
      } catch (error) {
        logger.error('Error loading note:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNote();
  }, [noteId]);
  
  // Fetch subjects from Supabase
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        logger.log('🔍 useNoteState: Fetching subjects from Supabase...');
        const data = await getSubjects();
        logger.log('🔍 useNoteState: Got subjects:', data);
        setSubjects(data || []);
      } catch (error) {
        logger.error('❌ useNoteState: Error fetching subjects:', error);
        setSubjects([]);
      }
    };
    
    fetchSubjects();
  }, []);

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    setWordCount(getWordCountFromHtml(newContent));
    setShowPlaceholder(newContent.trim() === '' || newContent === '<br>');
  }, []);

  const performAutoSave = useCallback(async () => {
    try {
      setIsAutoSaved(false);
      
      // Generate plain text version for search and export
      const contentText = htmlToText(content);
      
      const saveData = {
        title: title.trim() || 'Untitled Note',
        content: content,
        content_text: contentText,
        subject_id: metadata.subject || null,
        word_count: wordCount || 0
      };
      
      logger.log('🔍 performAutoSave: Saving data:', {
        title: saveData.title,
        contentLength: saveData.content.length,
        contentTextLength: saveData.content_text.length,
        wordCount: saveData.word_count,
        subjectId: saveData.subject_id
      });
      
      if (noteId) {
        // Update existing note
        const updatedNote = await updateNoteById(noteId, saveData);
        logger.log('✅ Note updated successfully:', {
          id: updatedNote.id,
          title: updatedNote.title,
          contentLength: updatedNote.content?.length || 0,
          contentTextLength: updatedNote.content_text?.length || 0,
          wordCount: updatedNote.word_count
        });
      } else {
        // Create new note and get the ID for future saves
        const newNote = await createNote(saveData);
        if (newNote && newNote.id) {
          logger.log('✅ New note created successfully:', {
            id: newNote.id,
            title: newNote.title,
            contentLength: newNote.content?.length || 0,
            contentTextLength: newNote.content_text?.length || 0,
            wordCount: newNote.word_count
          });
          // Update the URL to include the new note ID
          window.history.replaceState({}, '', `/note/${newNote.id}`);
        }
      }
      
      setMetadata(prev => ({ ...prev, modifiedAt: new Date() }));
      setIsAutoSaved(true);
    } catch (error) {
      logger.error('Error saving note:', error);
      setIsAutoSaved(true); // Reset UI state even on error
    }
  }, [noteId, title, content, metadata.subject, wordCount]);

  const deleteNote = useCallback(async (noteIdToDelete: string) => {
    const success = await deleteNoteService(noteIdToDelete);
    if (success) {
      logger.log('✅ Note deleted successfully from database');
      // If deleting current note, we could redirect or clear state
      if (noteId === noteIdToDelete) {
        logger.log('🔄 Deleted current note, consider redirecting');
        // You might want to redirect to dashboard here
        window.location.href = '/';
      }
    }
    return success;
  }, [noteId]);

  return {
    title,
    setTitle,
    content,
    metadata,
    setMetadata,
    isAutoSaved,
    showSearch,
    setShowSearch,
    wordCount,
    showPlaceholder,
    setShowPlaceholder,
    subjects,
    updateContent,
    performAutoSave,
    isLoading,
    noteId,
    deleteNote
  };
};
