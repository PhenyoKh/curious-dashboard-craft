
import { Button } from '@/components/ui/button';

interface WeeklyScheduleProps {
  onAddEvent: () => void;
}

const scheduleData = [
  {
    day: 'Monday, July 1',
    events: [
      { title: 'Study Group Meeting', subject: 'Biology 101', time: '9:00 AM', bgColor: 'bg-blue-50' },
      { title: 'Lecture', subject: 'CS 301', time: '11:00 AM', bgColor: 'bg-blue-50' },
      { title: 'Lab Session', subject: 'Chemistry 200', time: '2:00 PM', bgColor: 'bg-green-50' }
    ]
  },
  {
    day: 'Tuesday, July 2',
    events: [
      { title: 'Office Hours', subject: 'Statistics 301', time: '10:00 AM', bgColor: 'bg-purple-50' },
      { title: 'Review Session', subject: 'Biology 101', time: '4:00 PM', bgColor: 'bg-green-50' }
    ]
  },
  {
    day: 'Wednesday, July 3',
    events: [
      { title: 'Lecture', subject: 'CS 301', time: '11:00 AM', bgColor: 'bg-blue-50' }
    ]
  }
];

export const WeeklySchedule = ({ onAddEvent }: WeeklyScheduleProps) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">This Week's Schedule</h2>
        <Button
          variant="ghost"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          onClick={onAddEvent}
        >
          + Add Event
        </Button>
      </div>
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {scheduleData.map((day) => (
          <div key={day.day}>
            <h3 className="font-medium text-gray-800 mb-2">{day.day}</h3>
            <div className="space-y-2 ml-4">
              {day.events.map((event, index) => (
                <div key={index} className={`flex items-center justify-between p-2 ${event.bgColor} rounded-lg`}>
                  <span className="text-sm font-medium">{event.title}</span>
                  <span className="text-sm text-gray-600">{event.subject}</span>
                  <span className="text-sm text-gray-500">{event.time}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
