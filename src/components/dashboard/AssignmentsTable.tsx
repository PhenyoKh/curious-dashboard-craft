import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getAssignmentsWithDetails } from '../../services/supabaseService';
import type { Database } from '../../integrations/supabase/types';

interface AssignmentsTableProps {
  onAddAssignment: () => void;
  refreshKey?: number;
}

export const AssignmentsTable = ({ onAddAssignment, refreshKey }: AssignmentsTableProps) => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<(Database['public']['Tables']['assignments']['Row'] & { subject_name?: string; subject_code?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAssignmentsWithDetails();
        setAssignments(data || []);
      } catch (error) {
        console.error('Error fetching assignments:', error);
        setError('Failed to load assignments');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [refreshKey]);

  const getStatusColor = (status: string, dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    
    if (due < today && status !== 'Completed') {
      return 'bg-red-100 text-red-800';
    }
    
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'to do':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-foreground';
    }
  };

  const handleViewAllAssignments = () => {
    navigate('/assignments');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">Assignments & Exams</h2>
          <Button
            variant="ghost"
            className="text-primary hover:text-primary/80 text-sm font-medium p-1"
            onClick={handleViewAllAssignments}
          >
            View All
          </Button>
        </div>
        <Button
          variant="ghost"
          className="text-primary hover:text-primary/80 text-sm font-medium"
          onClick={onAddAssignment}
        >
          + Add Assignment
        </Button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading assignments...</span>
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
      ) : assignments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-2">No assignments found.</p>
          <Button
            variant="outline"
            onClick={onAddAssignment}
            className="text-sm"
          >
            Add your first assignment
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="text-left text-muted-foreground border-b">
                <TableHead className="pb-3 font-medium">Assignment/Exam</TableHead>
                <TableHead className="pb-3 font-medium">Subject</TableHead>
                <TableHead className="pb-3 font-medium">Due Date</TableHead>
                <TableHead className="pb-3 font-medium">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const formattedDueDate = assignment.due_date 
                  ? new Date(assignment.due_date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric'
                    })
                  : 'No due date';
                const statusColor = getStatusColor(assignment.status || '', assignment.due_date || '');
                
                return (
                  <TableRow key={assignment.id} className="border-b">
                    <TableCell className="py-3">{assignment.title}</TableCell>
                    <TableCell className="py-3">{assignment.subject_name || 'No subject'}</TableCell>
                    <TableCell className="py-3">{formattedDueDate}</TableCell>
                    <TableCell className="py-3">
                      <span className={`${statusColor} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                        {assignment.status || 'No status'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
