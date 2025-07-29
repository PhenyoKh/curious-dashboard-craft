import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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

  const getSubjectColors = (label: string) => {
    const hash = label.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colors = [
      { bg: 'bg-blue-50', badge: 'bg-blue-500', border: 'border-blue-500' },
      { bg: 'bg-green-50', badge: 'bg-green-500', border: 'border-green-500' },
      { bg: 'bg-purple-50', badge: 'bg-purple-500', border: 'border-purple-500' },
      { bg: 'bg-orange-50', badge: 'bg-orange-500', border: 'border-orange-500' },
      { bg: 'bg-red-50', badge: 'bg-red-500', border: 'border-red-500' },
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  const getSubjectCode = (label: string, value: string) => {
    // Use the first 2 characters of the value field if available, otherwise generate from label
    if (value && value.length >= 2) {
      return value.substring(0, 2).toUpperCase();
    }
    
    const words = label.split(' ').filter(word => word.length > 2);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return label.substring(0, 2).toUpperCase();
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
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading subjects...</span>
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
              const colors = getSubjectColors(subject.label);
              const code = getSubjectCode(subject.label, subject.value);
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
                  className={`flex items-center justify-between p-3 ${colors.bg} rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border-l-4 ${colors.border} mb-2`}
                  onClick={() => handleSubjectClick(subject.id)}
                >
                  <div className="flex items-center">
                    <div className={`w-10 h-10 ${colors.badge} rounded-md flex items-center justify-center text-white mr-3`}>
                      <span className="text-sm font-medium">{code}</span>
                    </div>
                    <div>
                      <p className="font-medium">{subject.label}</p>
                      <p className="text-sm text-gray-500">{subject.value}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{lastActivity}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
