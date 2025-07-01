
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AssignmentsTableProps {
  onAddAssignment: () => void;
}

const assignments = [
  {
    title: 'Essay 2',
    subject: 'Biology 101',
    dueDate: 'July 5, 2025',
    status: 'In Progress',
    statusColor: 'bg-yellow-100 text-yellow-800'
  },
  {
    title: 'Midterm Exam',
    subject: 'CS 301',
    dueDate: 'July 8, 2025',
    status: 'To Do',
    statusColor: 'bg-blue-100 text-blue-800'
  },
  {
    title: 'Problem Set 3',
    subject: 'Statistics 301',
    dueDate: 'July 12, 2025',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-800'
  },
  {
    title: 'Lab Report',
    subject: 'Chemistry 200',
    dueDate: 'June 28, 2025',
    status: 'Overdue',
    statusColor: 'bg-red-100 text-red-800'
  },
  {
    title: 'Final Project',
    subject: 'Psychology 201',
    dueDate: 'July 20, 2025',
    status: 'Not Started',
    statusColor: 'bg-gray-100 text-gray-800'
  }
];

export const AssignmentsTable = ({ onAddAssignment }: AssignmentsTableProps) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Assignments & Exams</h2>
        <Button
          variant="ghost"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          onClick={onAddAssignment}
        >
          + Add Assignment
        </Button>
      </div>
      <div className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="text-left text-gray-500 border-b">
              <TableHead className="pb-3 font-medium">Assignment/Exam</TableHead>
              <TableHead className="pb-3 font-medium">Subject</TableHead>
              <TableHead className="pb-3 font-medium">Due Date</TableHead>
              <TableHead className="pb-3 font-medium">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment, index) => (
              <TableRow key={index} className="border-b">
                <TableCell className="py-3">{assignment.title}</TableCell>
                <TableCell className="py-3">{assignment.subject}</TableCell>
                <TableCell className="py-3">{assignment.dueDate}</TableCell>
                <TableCell className="py-3">
                  <span className={`${assignment.statusColor} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                    {assignment.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
