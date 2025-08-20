import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { getSubjects } from '../../services/supabaseService';
import type { Database } from '../../integrations/supabase/types';
import { logger } from '@/utils/logger';

interface DocumentMetadataProps {
  noteTitle: string;
  onNoteTitleChange: (title: string) => void;
  selectedSubject?: string;
  onSubjectChange: (subject: string) => void;
}

const DocumentMetadata: React.FC<DocumentMetadataProps> = ({
  noteTitle,
  onNoteTitleChange,
  selectedSubject,
  onSubjectChange
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [subjects, setSubjects] = useState<Database['public']['Tables']['subjects']['Row'][]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Fetch subjects from database
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const data = await getSubjects();
        setSubjects(data || []);
      } catch (error) {
        logger.error('Error fetching subjects:', error);
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false);
    }
  };

  const handleSubjectSelect = (subjectId: string) => {
    onSubjectChange(subjectId);
    setIsDropdownOpen(false);
  };

  // Get the selected subject for display
  const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
  const selectedSubjectLabel = selectedSubjectData ? 
    (selectedSubjectData.subject_code ? 
      `${selectedSubjectData.subject_code} - ${selectedSubjectData.label}` : 
      selectedSubjectData.label
    ) : 'Select subject';

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-4">
        {/* Note Title */}
        <div className="flex-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => onNoteTitleChange(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-blue-500 outline-none w-full max-w-md"
              placeholder="Enter note title..."
              autoFocus
            />
          ) : (
            <button
              onClick={handleTitleClick}
              className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
            >
              {noteTitle || 'Untitled Note'}
            </button>
          )}
        </div>

        {/* Subject Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors bg-white"
            disabled={loadingSubjects}
          >
            <span className="text-sm text-gray-700">
              {loadingSubjects ? 'Loading...' : selectedSubjectLabel}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`} />
          </button>

          {isDropdownOpen && !loadingSubjects && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {subjects.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No subjects available</div>
              ) : (
                subjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => handleSubjectSelect(subject.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      selectedSubject === subject.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{subject.label}</span>
                      {subject.subject_code && (
                        <span className="text-xs text-blue-600 font-medium">{subject.subject_code}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Click outside handler */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default DocumentMetadata;