
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SubjectsProps {
  onAddSubject: () => void;
}

const subjects = [
  {
    id: 'cs301',
    name: 'Computer Science 301',
    code: 'CS',
    notes: 12,
    lastActivity: '2 hours ago',
    bgColor: 'bg-blue-50',
    badgeColor: 'bg-blue-500',
    borderColor: 'border-blue-500'
  },
  {
    id: 'bio101',
    name: 'Biology 101',
    code: 'BI',
    notes: 8,
    lastActivity: '3 hours ago',
    bgColor: 'bg-gray-50',
    badgeColor: 'bg-green-500',
    borderColor: 'border-transparent'
  },
  {
    id: 'stat301',
    name: 'Statistics 301',
    code: 'ST',
    notes: 6,
    lastActivity: 'Yesterday',
    bgColor: 'bg-gray-50',
    badgeColor: 'bg-purple-500',
    borderColor: 'border-transparent'
  }
];

export const Subjects = ({ onAddSubject }: SubjectsProps) => {
  const navigate = useNavigate();

  const handleSubjectClick = (subjectId: string) => {
    console.log('Opening subject:', subjectId);
    navigate('/subjects');
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
      <div className="space-y-3">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className={`flex items-center justify-between p-3 ${subject.bgColor} rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border-l-4 ${subject.borderColor}`}
            onClick={() => handleSubjectClick(subject.id)}
          >
            <div className="flex items-center">
              <div className={`w-10 h-10 ${subject.badgeColor} rounded-md flex items-center justify-center text-white mr-3`}>
                <span className="text-sm font-medium">{subject.code}</span>
              </div>
              <div>
                <p className="font-medium">{subject.name}</p>
                <p className="text-sm text-gray-500">{subject.notes} notes</p>
              </div>
            </div>
            <span className="text-xs text-gray-500">{subject.lastActivity}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
