import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  subjectCode: string;
  subjectColor: string;
  updatedAt: Date;
}

// Mock data - in a real app, this would come from your data store
const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Introduction to Data Structures',
    content: 'Arrays are fundamental data structures that store elements in contiguous memory locations. They provide constant-time access to elements by index...',
    subject: 'Computer Science 301',
    subjectCode: 'CS 301',
    subjectColor: 'blue',
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  },
  {
    id: '2',
    title: 'Cell Biology Fundamentals',
    content: 'The cell membrane is a phospholipid bilayer that controls what enters and exits the cell. It maintains cellular homeostasis...',
    subject: 'Biology 101',
    subjectCode: 'BIO 101',
    subjectColor: 'green',
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
  },
  {
    id: '3',
    title: 'Probability Distributions',
    content: 'Normal distribution is a continuous probability distribution that is symmetric about the mean. It forms the foundation for many statistical tests...',
    subject: 'Statistics 301',
    subjectCode: 'STAT 301',
    subjectColor: 'purple',
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
  },
  {
    id: '4',
    title: 'Algorithm Complexity',
    content: 'Big O notation describes the computational complexity of algorithms. O(n) represents linear time complexity...',
    subject: 'Computer Science 301',
    subjectCode: 'CS 301',
    subjectColor: 'blue',
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
  },
  {
    id: '5',
    title: 'Photosynthesis Process',
    content: 'Photosynthesis converts light energy into chemical energy stored in glucose. The process occurs in two main stages: light-dependent and light-independent reactions...',
    subject: 'Biology 101',
    subjectCode: 'BIO 101',
    subjectColor: 'green',
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
  },
  {
    id: '6',
    title: 'Hypothesis Testing',
    content: 'Statistical hypothesis testing is a method for making decisions about population parameters based on sample data...',
    subject: 'Statistics 301',
    subjectCode: 'STAT 301',
    subjectColor: 'purple',
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
  }
];

const subjects = [
  'All Subjects',
  'Computer Science 301',
  'Biology 101',
  'Statistics 301'
];

const sortOptions = [
  { value: 'recent', label: 'Recent' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'subject', label: 'By Subject' }
];

const Subjects: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [sortBy, setSortBy] = useState('recent');

  const formatTimeAgo = (date: Date) => {
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

  const filteredAndSortedNotes = useMemo(() => {
    let filtered = mockNotes;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by subject
    if (selectedSubject !== 'All Subjects') {
      filtered = filtered.filter(note => note.subject === selectedSubject);
    }

    // Sort
    switch (sortBy) {
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'subject':
        filtered.sort((a, b) => {
          if (a.subject === b.subject) {
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          }
          return a.subject.localeCompare(b.subject);
        });
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        break;
    }

    return filtered;
  }, [searchQuery, selectedSubject, sortBy]);

  const handleNoteClick = (noteId: string) => {
    navigate('/note', { state: { noteId } });
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  return (
    <div className="subjects-container min-h-screen bg-gray-50 p-4 md:p-8">
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
                  {subjects.map((subject) => (
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

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedNotes.map((note) => {
            const colorClasses = getColorClasses(note.subjectColor);
            return (
              <div
                key={note.id}
                onClick={() => handleNoteClick(note.id)}
                className={`bg-white rounded-lg shadow-sm border-l-4 ${colorClasses.border} ${colorClasses.bg} hover:shadow-md transition-shadow cursor-pointer p-4 min-h-[180px] flex flex-col`}
              >
                {/* Note Title */}
                <h3 className="font-semibold text-gray-800 text-lg mb-2 line-clamp-2">
                  {note.title}
                </h3>

                {/* Preview Text */}
                <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3">
                  {truncateText(note.content, 80)}
                </p>

                {/* Footer */}
                <div className="flex items-end justify-between mt-auto">
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(note.updatedAt)}
                  </span>
                  <Badge 
                    className={`${colorClasses.badge} text-white text-xs px-2 py-1`}
                  >
                    {note.subjectCode}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAndSortedNotes.length === 0 && (
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
