import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Filter, ChevronDown, ArrowLeft, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAllNotesWithSubjects, getSubjects } from '../services/supabaseService';
import type { Database } from '../integrations/supabase/types';
import { logger } from '@/utils/logger';

type Note = Database['public']['Tables']['notes']['Row'] & {
  subject_name?: string;
  subject_color?: string;
};

type Subject = Database['public']['Tables']['subjects']['Row'];

const sortOptions = [
  { value: 'recent', label: 'Recent' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'subject', label: 'By Subject' }
];

const Subjects: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [sortBy, setSortBy] = useState('recent');
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notes and subjects data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [notesData, subjectsData] = await Promise.all([
          getAllNotesWithSubjects(),
          getSubjects()
        ]);
        
        setNotes(notesData || []);
        setSubjects(subjectsData || []);
      } catch (error) {
        logger.error('Error fetching data:', error);
        setError('Failed to load notes and subjects');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Set initial filter based on navigation state - with security validation
  useEffect(() => {
    if (location.state?.filterSubject) {
      const filterValue = location.state.filterSubject;
      
      // Validate and sanitize the filter value
      if (typeof filterValue === "string" && filterValue.length <= 100) {
        // Only allow alphanumeric characters, spaces, and common punctuation
        const sanitizedFilter = filterValue.replace(/[^a-zA-Z0-9 -_.]/g, "");
        
        // Prevent layout glitches by using requestAnimationFrame
        requestAnimationFrame(() => {
          setSelectedSubject(sanitizedFilter);
        });
      } else {
        logger.warn("Invalid filter value in navigation state");
      }
    }
  }, [location.state]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Updated just now';
    if (diffInHours === 1) return 'Updated 1 hour ago';
    if (diffInHours < 24) return `Updated ${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Updated 1 day ago';
    if (diffInDays < 7) return `Updated ${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: { border: 'border-l-blue-500', bg: 'bg-blue-50', badge: 'bg-blue-500' },
      green: { border: 'border-l-green-500', bg: 'bg-green-50', badge: 'bg-green-500' },
      purple: { border: 'border-l-purple-500', bg: 'bg-purple-50', badge: 'bg-purple-500' },
      red: { border: 'border-l-red-500', bg: 'bg-red-50', badge: 'bg-red-500' },
      yellow: { border: 'border-l-yellow-500', bg: 'bg-yellow-50', badge: 'bg-yellow-500' },
      pink: { border: 'border-l-pink-500', bg: 'bg-pink-50', badge: 'bg-pink-500' }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getSubjectCode = (note: Note) => {
    // Find the subject from our subjects array
    const subject = subjects.find(s => s.label === note.subject_name);
    if (subject?.value && subject.value.length >= 2) {
      return subject.value.substring(0, 6).toUpperCase(); // Use more characters for codes
    }
    
    // Fallback: generate from subject name
    if (note.subject_name) {
      const words = note.subject_name.split(' ').filter(word => word.length > 2);
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return note.subject_name.substring(0, 2).toUpperCase();
    }
    
    return 'NO';
  };

  // Create dynamic subjects list from actual data
  const subjectsList = useMemo(() => {
    const uniqueSubjects = Array.from(new Set(notes.map(note => note.subject_name).filter(Boolean)));
    return ['All Subjects', ...uniqueSubjects];
  }, [notes]);

  const filteredAndSortedNotes = useMemo(() => {
    let filtered = notes;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(note =>
        note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.subject_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by subject
    if (selectedSubject !== 'All Subjects') {
      filtered = filtered.filter(note => note.subject_name === selectedSubject);
    }

    // Sort
    switch (sortBy) {
      case 'alphabetical':
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'subject':
        filtered.sort((a, b) => {
          const subjectA = a.subject_name || '';
          const subjectB = b.subject_name || '';
          if (subjectA === subjectB) {
            return new Date(b.modified_at || '').getTime() - new Date(a.modified_at || '').getTime();
          }
          return subjectA.localeCompare(subjectB);
        });
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => 
          new Date(b.modified_at || '').getTime() - new Date(a.modified_at || '').getTime()
        );
        break;
    }

    return filtered;
  }, [notes, searchQuery, selectedSubject, sortBy]);

  const handleNoteClick = (noteId: string) => {
    navigate(`/note/${noteId}`);
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToDashboard}
              className="hover:bg-gray-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">Subjects</h1>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[140px] justify-between">
                    <Filter className="w-4 h-4 mr-2" />
                    {selectedSubject}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px]">
                  {subjectsList.map((subject) => (
                    <DropdownMenuItem
                      key={subject}
                      onClick={() => setSelectedSubject(subject)}
                      className={selectedSubject === subject ? 'bg-accent' : ''}
                    >
                      {subject}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[120px] justify-between">
                    {sortOptions.find(opt => opt.value === sortBy)?.label}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {sortOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={sortBy === option.value ? 'bg-accent' : ''}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading notes...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-2">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Notes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedNotes.map((note) => {
                const colorClasses = getColorClasses(note.subject_color || 'blue');
                const subjectCode = getSubjectCode(note);
                return (
                  <div
                    key={note.id}
                    onClick={() => handleNoteClick(note.id)}
                    className={`bg-white rounded-lg shadow-sm border-l-4 ${colorClasses.border} ${colorClasses.bg} hover:shadow-md transition-shadow cursor-pointer p-4 min-h-[180px] flex flex-col`}
                  >
                    {/* Note Title */}
                    <h3 className="font-semibold text-gray-800 text-lg mb-2 line-clamp-2">
                      {note.title || 'Untitled Note'}
                    </h3>

                    {/* Preview Text */}
                    <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3">
                      {truncateText(note.content_text || 'No content available', 80)}
                    </p>

                    {/* Footer */}
                    <div className="flex items-end justify-between mt-auto">
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(note.modified_at || note.created_at || '')}
                      </span>
                      <Badge 
                        className={`${colorClasses.badge} text-white text-xs px-2 py-1`}
                      >
                        {subjectCode}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !error && filteredAndSortedNotes.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No notes found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search terms' : 'No notes match the selected filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subjects;
