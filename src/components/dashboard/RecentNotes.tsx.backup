
import { FileText, Lightbulb, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const notes = [
  {
    id: 'sorting-algorithms',
    title: 'Sorting Algorithms',
    subject: 'cs301',
    subjectLabel: 'Computer Science 301',
    time: '10:30 AM',
    icon: FileText,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    id: 'cognitive-development',
    title: 'Cognitive Development',
    subject: 'psych201',
    subjectLabel: 'Psychology 201',
    time: '9:15 AM',
    icon: Lightbulb,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    id: 'regression-analysis',
    title: 'Regression Analysis',
    subject: 'stats301',
    subjectLabel: 'Statistics 301',
    time: '8:45 AM',
    icon: Target,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  }
];

export const RecentNotes = () => {
  const navigate = useNavigate();

  const handleNoteClick = (note: typeof notes[0]) => {
    console.log('Opening note:', note.id);
    
    // Navigate to note page with the note data
    navigate('/note', {
      state: {
        title: note.title,
        subject: note.subject,
        date: new Date() // Using current date since we don't have stored dates
      }
    });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Recent Notes</h2>
        <span className="text-sm text-muted-foreground">Today</span>
      </div>
      <p className="text-muted-foreground mb-4">Continue where you left off with your latest notes.</p>
      <div className="space-y-3">
        {notes.map((note) => {
          const IconComponent = note.icon;
          return (
            <div
              key={note.id}
              className="flex items-center p-3 bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => handleNoteClick(note)}
            >
              <div className={`w-10 h-10 ${note.bgColor} rounded-md flex items-center justify-center ${note.iconColor} mr-3`}>
                <IconComponent className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-medium truncate">{note.title}</p>
                <p className="text-sm text-muted-foreground">{note.subjectLabel}</p>
              </div>
              <span className="text-sm text-muted-foreground">{note.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
