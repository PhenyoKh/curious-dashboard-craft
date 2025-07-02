
import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { NoteMetadata, Subject } from '@/types/note';
import { calculateWordCount } from '@/utils/noteUtils';

export const useNoteState = () => {
  const location = useLocation();
  const initialNoteData = location.state as { subject: string; date: Date; title: string } | null;
  
  const [title, setTitle] = useState<string>(initialNoteData?.title || '');
  const [content, setContent] = useState<string>('');
  const [metadata, setMetadata] = useState<NoteMetadata>({
    subject: initialNoteData?.subject || '',
    createdAt: initialNoteData?.date || new Date(),
    modifiedAt: new Date()
  });
  const [isAutoSaved, setIsAutoSaved] = useState<boolean>(true);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [wordCount, setWordCount] = useState<number>(0);
  const [showPlaceholder, setShowPlaceholder] = useState<boolean>(true);
  
  const subjects: Subject[] = [
    { value: '', label: 'Select subject' },
    { value: 'cs301', label: 'Computer Science 301' },
    { value: 'bio101', label: 'Biology 101' },
    { value: 'stats301', label: 'Statistics 301' },
    { value: 'psych201', label: 'Psychology 201' },
    { value: 'chem200', label: 'Chemistry 200' }
  ];

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    setWordCount(calculateWordCount(newContent));
    setShowPlaceholder(newContent.trim() === '' || newContent === '<br>');
  }, []);

  const performAutoSave = useCallback(() => {
    setIsAutoSaved(false);
    setTimeout(() => {
      setMetadata(prev => ({ ...prev, modifiedAt: new Date() }));
      setTimeout(() => {
        setIsAutoSaved(true);
      }, 200);
    }, 100);
  }, []);

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
    performAutoSave
  };
};
