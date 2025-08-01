import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdvancedAssignmentsDashboard } from '@/components/assignments/AdvancedAssignmentsDashboard';
import { AssignmentCalendarView } from '@/components/assignments/AssignmentCalendarView';

const Assignments: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleBackToDashboard = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToDashboard}
            className="hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Assignments & Exams</h1>
          
          {/* View Toggle */}
          <div className="ml-auto flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <List className="w-4 h-4 mr-2" />
              List View
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-sm ${
                viewMode === 'calendar' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendar View
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-8">
        {viewMode === 'list' ? (
          <AdvancedAssignmentsDashboard />
        ) : (
          <AssignmentCalendarView />
        )}
      </div>
    </div>
  );
};

export default Assignments;