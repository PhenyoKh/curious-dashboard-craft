
import { FileText, Lightbulb, Target } from 'lucide-react';

const notes = [
  {
    id: 'sorting-algorithms',
    title: 'Sorting Algorithms',
    subject: 'Computer Science 301',
    time: '10:30 AM',
    icon: FileText,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    id: 'cognitive-development',
    title: 'Cognitive Development',
    subject: 'Psychology 201',
    time: '9:15 AM',
    icon: Lightbulb,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    id: 'regression-analysis',
    title: 'Regression Analysis',
    subject: 'Statistics 301',
    time: '8:45 AM',
    icon: Target,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  }
];

export const RecentNotes = () => {
  const handleNoteClick = (noteId: string) => {
    console.log('Opening note:', noteId);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Recent Notes</h2>
        <span className="text-sm text-gray-500">Today</span>
      </div>
      <p className="text-gray-600 mb-4">Continue where you left off with your latest notes.</p>
      <div className="space-y-3">
        {notes.map((note) => {
          const IconComponent = note.icon;
          return (
            <div
              key={note.id}
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => handleNoteClick(note.id)}
            >
              <div className={`w-10 h-10 ${note.bgColor} rounded-md flex items-center justify-center ${note.iconColor} mr-3`}>
                <IconComponent className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{note.title}</p>
                <p className="text-sm text-gray-500">{note.subject}</p>
              </div>
              <span className="text-sm text-gray-400">{note.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
