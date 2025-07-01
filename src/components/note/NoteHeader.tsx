
import React from 'react';
import { NoteMetadata, Subject } from '@/types/note';
import { formatDate } from '@/utils/noteUtils';

interface NoteHeaderProps {
  title: string;
  setTitle: (title: string) => void;
  metadata: NoteMetadata;
  setMetadata: (metadata: NoteMetadata | ((prev: NoteMetadata) => NoteMetadata)) => void;
  subjects: Subject[];
}

const NoteHeader: React.FC<NoteHeaderProps> = ({
  title,
  setTitle,
  metadata,
  setMetadata,
  subjects
}) => {
  return (
    <div className="bg-white rounded-xl p-6 mb-5 border border-gray-200">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled Note"
        className="w-full text-3xl font-semibold border-none outline-none bg-transparent text-gray-900 placeholder-gray-400 mb-4"
      />
      
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">Subject:</span>
          <select
            value={metadata.subject}
            onChange={(e) => setMetadata(prev => ({ ...prev, subject: e.target.value }))}
            className="bg-gray-100 border-none px-3 py-1 rounded-full text-gray-700 cursor-pointer"
          >
            {subjects.map(subject => (
              <option key={subject.value} value={subject.value}>
                {subject.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">Created:</span>
          <span className="text-gray-600">{formatDate(metadata.createdAt)}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">Modified:</span>
          <span className="text-gray-600">{formatDate(metadata.modifiedAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default NoteHeader;
