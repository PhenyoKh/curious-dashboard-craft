import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdvancedAssignmentsDashboard } from '@/components/assignments/AdvancedAssignmentsDashboard';

const Assignments: React.FC = () => {
  const navigate = useNavigate();

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
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-8">
        <AdvancedAssignmentsDashboard />
      </div>
    </div>
  );
};

export default Assignments;