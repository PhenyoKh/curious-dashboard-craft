
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/App';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Plus, FileText, BookOpen, Target, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RecentNotes } from '@/components/dashboard/RecentNotes';
import { WeeklySchedule } from '@/components/dashboard/WeeklySchedule';
import { Subjects } from '@/components/dashboard/Subjects';
import { WeeklyAssignments } from '@/components/dashboard/WeeklyAssignments';
import { ScheduleModal } from '@/components/dashboard/ScheduleModal';
import { SubjectModal } from '@/components/dashboard/SubjectModal';
import { SimpleAssignmentModal } from '@/components/assignments/SimpleAssignmentModal';
import { NewNoteModal } from '@/components/dashboard/NewNoteModal';
import SecurityNotificationCenter from '@/components/security/SecurityNotificationCenter';
import { deleteScheduleEvent } from '@/services/supabaseService';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

const Index = () => {
  const navigate = useNavigate();
  const { openSettings } = useSettings();
  const { user, profile } = useAuth();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
  const [editingEvent, setEditingEvent] = useState<Database['public']['Tables']['schedule_events']['Row'] | null>(null);

  // Function to refresh schedule events
  const refreshSchedule = () => {
    setScheduleRefreshKey(prev => prev + 1);
  };

  // Handle schedule modal close with refresh
  const handleScheduleClose = (shouldRefresh = false) => {
    setScheduleOpen(false);
    setEditingEvent(null); // Clear editing state
    if (shouldRefresh) {
      refreshSchedule();
    }
  };

  // Handle edit event
  const handleEditEvent = (event: Database['public']['Tables']['schedule_events']['Row']) => {
    setEditingEvent(event);
    setScheduleOpen(true);
  };

  // Handle delete event
  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteScheduleEvent(eventId);
      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted.",
      });
      refreshSchedule();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the event. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Generate user initials
  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [createNoteOpen, setCreateNoteOpen] = useState(false);
  const [assignmentRefreshKey, setAssignmentRefreshKey] = useState(0);



  const handleNewNote = () => {
    setCreateNoteOpen(true);
  };

  // Function to refresh assignments
  const refreshAssignments = () => {
    setAssignmentRefreshKey(prev => prev + 1);
  };


  return (
    <div className="bg-gray-100 min-h-screen p-4 md:p-8 font-inter-tight">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Scola</h1>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleNewNote}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium border-0 shadow-sm text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>
            <SecurityNotificationCenter />
            <button
              onClick={openSettings}
              className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium hover:bg-blue-600 transition-colors cursor-pointer"
              aria-label="Open settings"
              title={profile?.full_name || user?.email || 'User settings'}
            >
              {getUserInitials()}
            </button>
          </div>
        </div>
        
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          {/* Recent Notes */}
          <div className="lg:col-span-3">
            <RecentNotes />
          </div>
          
          {/* Weekly Schedule */}
          <div className="lg:col-span-3">
            <WeeklySchedule 
              onAddEvent={() => setScheduleOpen(true)} 
              onEditEvent={handleEditEvent}
              onDeleteEvent={handleDeleteEvent}
              refreshKey={scheduleRefreshKey}
            />
          </div>
          
          {/* Subjects */}
          <div className="lg:col-span-3">
            <Subjects onAddSubject={() => setSubjectOpen(true)} />
          </div>
          
          {/* Assignments & Exams */}
          <div className="lg:col-span-3">
            <WeeklyAssignments 
              onAddAssignment={() => setAssignmentOpen(true)} 
              refreshKey={assignmentRefreshKey}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Schedule Event' : 'Add Schedule Event'}</DialogTitle>
          </DialogHeader>
          <ScheduleModal 
            onClose={handleScheduleClose} 
            editingEvent={editingEvent}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={subjectOpen} onOpenChange={setSubjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Subject</DialogTitle>
          </DialogHeader>
          <SubjectModal onClose={() => setSubjectOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Assignment/Exam</DialogTitle>
          </DialogHeader>
          <SimpleAssignmentModal 
            onClose={() => setAssignmentOpen(false)}
            onSave={() => {
              setAssignmentOpen(false);
              refreshAssignments();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={createNoteOpen} onOpenChange={setCreateNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <NewNoteModal onClose={() => setCreateNoteOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
