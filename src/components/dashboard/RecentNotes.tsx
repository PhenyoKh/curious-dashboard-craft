
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, BookOpen, Brain, BarChart3, Loader2 } from 'lucide-react';
import { getRecentNotes } from '../../services/supabaseService';
import type { Database } from '../../integrations/supabase/types';

type NoteWithSubject = Database['public']['Tables']['notes']['Row'] & { subject_name?: string };

export const RecentNotes = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteWithSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getRecentNotes();
        setNotes(data || []);
      } catch (error) {
        console.error('Error fetching recent notes:', error);
        setError('Failed to load recent notes');
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  const getSubjectIcon = (subjectName: string) => {
    const name = subjectName.toLowerCase();
    if (name.includes('cs') || name.includes('computer') || name.includes('programming') || name.includes('software')) return FileText;
    if (name.includes('psych') || name.includes('psychology')) return Brain;
    if (name.includes('stats') || name.includes('statistic') || name.includes('math') || name.includes('data')) return BarChart3;
    return BookOpen;
  };

  const getSubjectColors = (subjectName: string) => {
    const name = subjectName.toLowerCase();
    if (name.includes('cs') || name.includes('computer') || name.includes('programming') || name.includes('software')) 
      return { bg: 'bg-blue-100', icon: 'text-blue-600' };
    if (name.includes('psych') || name.includes('psychology')) 
      return { bg: 'bg-green-100', icon: 'text-green-600' };
    if (name.includes('stats') || name.includes('statistic') || name.includes('math') || name.includes('data')) 
      return { bg: 'bg-purple-100', icon: 'text-purple-600' };
    return { bg: 'bg-orange-100', icon: 'text-orange-600' };
  };

  const handleNoteClick = (note: NoteWithSubject) => {
    console.log('Opening note:', note.id);
    
    // Navigate to note page with the note ID
    navigate(`/note/${note.id}`);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Recent Notes</h2>
        <span className="text-sm text-muted-foreground">Today</span>
      </div>
      <p className="text-muted-foreground mb-4">Continue where you left off with your latest notes.</p>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading notes...</span>
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
      ) : notes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No recent notes found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="max-h-[240px] overflow-y-auto pr-2">
            {notes.map((note) => {
              const IconComponent = getSubjectIcon(note.subject_name || '');
              const colors = getSubjectColors(note.subject_name || '');
              const timeFormatted = note.created_at 
                ? new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              
              return (
                <div
                  key={note.id}
                  className="flex items-center p-3 bg-muted/50 hover:bg-muted cursor-pointer transition-colors rounded-lg mb-2"
                  onClick={() => handleNoteClick(note)}
                >
                  <div className={`w-10 h-10 ${colors.bg} rounded-md flex items-center justify-center ${colors.icon} mr-3`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium truncate">{note.title}</p>
                    <p className="text-sm text-muted-foreground">{note.subject_name || 'No subject'}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{timeFormatted}</span>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t border-gray-200">
            <button 
              onClick={() => navigate('/notes')}
              className="w-full text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium py-1"
            >
              View all notes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
