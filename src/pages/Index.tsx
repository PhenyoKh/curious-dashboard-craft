
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, FileText, BookOpen, Target, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RecentNotes } from '@/components/dashboard/RecentNotes';
import { WeeklySchedule } from '@/components/dashboard/WeeklySchedule';
import { Subjects } from '@/components/dashboard/Subjects';
import { AssignmentsTable } from '@/components/dashboard/AssignmentsTable';
import { ScheduleModal } from '@/components/dashboard/ScheduleModal';
import { SubjectModal } from '@/components/dashboard/SubjectModal';
import { AssignmentModal } from '@/components/dashboard/AssignmentModal';

const Index = () => {
  const navigate = useNavigate();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);

  const handleNewNote = () => {
    navigate('/note');
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4 md:p-8 font-inter-tight">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">StudyFlow</h1>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleNewNote}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium border-0 shadow-sm text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
              JS
            </div>
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
            <WeeklySchedule onAddEvent={() => setScheduleOpen(true)} />
          </div>
          
          {/* Subjects */}
          <div className="lg:col-span-3">
            <Subjects onAddSubject={() => setSubjectOpen(true)} />
          </div>
          
          {/* Assignments & Exams */}
          <div className="lg:col-span-3">
            <AssignmentsTable onAddAssignment={() => setAssignmentOpen(true)} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Schedule Event</DialogTitle>
          </DialogHeader>
          <ScheduleModal onClose={() => setScheduleOpen(false)} />
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
          <AssignmentModal onClose={() => setAssignmentOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
