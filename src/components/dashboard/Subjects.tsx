import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { getSubjects } from '../../services/supabaseService';
import type { Database } from '../../integrations/supabase/types';

interface SubjectsProps {
  onAddSubject: () => void;
}

export const Subjects = ({ onAddSubject }: SubjectsProps) => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Database['public']['Tables']['subjects']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      console.log('🔍 Subjects Component: Starting to fetch subjects...');
      try {
        setLoading(true);
        setError(null);
        console.log('🔍 Subjects Component: Calling getSubjects()...');
        const data = await getSubjects();
        console.log('🔍 Subjects Component: Got data from getSubjects():', data);
        console.log('🔍 Subjects Component: Data type:', typeof data, 'Length:', data?.length);
        setSubjects(data || []);
        console.log('🔍 Subjects Component: State updated with subjects');
      } catch (error) {
        console.error('❌ Subjects Component: Error fetching subjects:', error);
        setError('Failed to load subjects');
      } finally {
        setLoading(false);
        console.log('🔍 Subjects Component: Loading finished');
      }
    };

    fetchSubjects();
  }, []);

  const getSubjectColors = (subject: Database['public']['Tables']['subjects']['Row']) => {
    // Use the subject's color if available, otherwise hash-based generation
    if (subject.color) {
      // Convert hex color to CSS classes with pastel backgrounds and bold filled rectangles
      const colorMap: { [key: string]: { bg: string; text: string; hover: string; labelBg: string; labelText: string } } = {
        '#3B82F6': { bg: 'bg-blue-100', text: 'text-gray-800', hover: 'hover:bg-blue-200', labelBg: 'bg-blue-500', labelText: 'text-white' },
        '#10B981': { bg: 'bg-green-100', text: 'text-gray-800', hover: 'hover:bg-green-200', labelBg: 'bg-green-500', labelText: 'text-white' },
        '#8B5CF6': { bg: 'bg-purple-100', text: 'text-gray-800', hover: 'hover:bg-purple-200', labelBg: 'bg-purple-500', labelText: 'text-white' },
        '#EF4444': { bg: 'bg-red-100', text: 'text-gray-800', hover: 'hover:bg-red-200', labelBg: 'bg-red-500', labelText: 'text-white' },
        '#F59E0B': { bg: 'bg-yellow-100', text: 'text-gray-800', hover: 'hover:bg-yellow-200', labelBg: 'bg-yellow-500', labelText: 'text-white' },
        '#EC4899': { bg: 'bg-pink-100', text: 'text-gray-800', hover: 'hover:bg-pink-200', labelBg: 'bg-pink-500', labelText: 'text-white' },
      };
      
      if (colorMap[subject.color]) {
        return colorMap[subject.color];
      }
    }
    
    // Fallback to hash-based color generation
    const hash = subject.label.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colors = [
      { bg: 'bg-blue-100', text: 'text-gray-800', hover: 'hover:bg-blue-200', labelBg: 'bg-blue-500', labelText: 'text-white' },
      { bg: 'bg-green-100', text: 'text-gray-800', hover: 'hover:bg-green-200', labelBg: 'bg-green-500', labelText: 'text-white' },
      { bg: 'bg-purple-100', text: 'text-gray-800', hover: 'hover:bg-purple-200', labelBg: 'bg-purple-500', labelText: 'text-white' },
      { bg: 'bg-orange-100', text: 'text-gray-800', hover: 'hover:bg-orange-200', labelBg: 'bg-orange-500', labelText: 'text-white' },
      { bg: 'bg-red-100', text: 'text-gray-800', hover: 'hover:bg-red-200', labelBg: 'bg-red-500', labelText: 'text-white' },
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  const getSubjectCode = (subject: Database['public']['Tables']['subjects']['Row']) => {
    // Use the subject_code field if available (new feature)
    if (subject.subject_code && subject.subject_code.trim()) {
      return subject.subject_code.toUpperCase();
    }
    
    // Fallback to generated code for backward compatibility
    // Use the first 2 characters of the value field if available, otherwise generate from label
    if (subject.value && subject.value.length >= 2) {
      return subject.value.substring(0, 2).toUpperCase();
    }
    
    const words = subject.label.split(' ').filter(word => word.length > 2);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return subject.label.substring(0, 2).toUpperCase();
  };

  const handleSubjectClick = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    console.log('Opening subject:', subjectId);
    navigate('/subjects', { state: { filterSubject: subject?.label } });
  };

  const handleViewAllSubjects = () => {
    navigate('/subjects');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-800">Subjects</h2>
          <Button
            variant="ghost"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium p-1"
            onClick={handleViewAllSubjects}
          >
            View All
          </Button>
        </div>
        <Button
          variant="ghost"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          onClick={onAddSubject}
        >
          + New Subject
        </Button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your subjects...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-2">No subjects found.</p>
          <Button
            variant="outline"
            onClick={onAddSubject}
            className="text-sm"
          >
            Create your first subject
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="max-h-[320px] overflow-y-auto pr-2">
            {subjects.map((subject) => {
              const colors = getSubjectColors(subject);
              const code = getSubjectCode(subject);
              const lastActivity = subject.created_at 
                ? new Date(subject.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })
                : 'No activity';
              
              return (
                <div
                  key={subject.id}
                  className={`flex items-center justify-between p-3 ${colors.bg} ${colors.hover} rounded-lg cursor-pointer transition-all duration-200 mb-2 shadow-sm hover:shadow-md`}
                  onClick={() => handleSubjectClick(subject.id)}
                >
                  <div className="flex-1">
                    <div className="mb-0.5">
                      <span className={`text-base font-semibold px-2 py-1 ${colors.labelBg} ${colors.labelText} rounded-md inline-block`}>
                        {subject.label}
                      </span>
                    </div>
                    <p className={`text-xs font-medium opacity-90 ${colors.text}`}>
                      {subject.subject_code || code}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs opacity-75 ${colors.text}`}>
                      {lastActivity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
