
import React from 'react';
import { NoteMetadata, Subject } from '@/types/note';

interface NoteMetadataBarProps {
  title: string;
  metadata: NoteMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<NoteMetadata>>;
  subjects: Subject[];
}

const NoteMetadataBar: React.FC<NoteMetadataBarProps> = ({
  title,
  metadata,
  setMetadata,
  subjects
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Mini Title - Fixed width constraints */}
          <div className="text-sm font-medium text-gray-900 truncate max-w-[200px] md:max-w-[300px] lg:max-w-[400px]" title={title || 'Untitled Note'}>
            {title || 'Untitled Note'}
          </div>
          
          {/* Subject Dropdown */}
          <select
            value={metadata.subject}
            onChange={(e) => setMetadata(prev => ({ ...prev, subject: e.target.value }))}
            className="text-sm bg-white border border-gray-200 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {subjects.map(subject => (
              <option key={subject.value} value={subject.value}>
                {subject.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Timestamps */}
        <div className="hidden sm:flex items-center gap-6 text-xs text-gray-500">
          <span>Created: {formatDate(metadata.createdAt)}</span>
          <span>Modified: {formatDate(metadata.modifiedAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default NoteMetadataBar;
