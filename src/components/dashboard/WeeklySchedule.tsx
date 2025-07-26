
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getThisWeeksScheduleEvents } from '../../services/supabaseService';
import type { Database } from '../../integrations/supabase/types';

interface WeeklyScheduleProps {
  onAddEvent: () => void;
  refreshKey?: number;
}

export const WeeklySchedule = ({ onAddEvent, refreshKey }: WeeklyScheduleProps) => {
  const navigate = useNavigate();
  const [scheduleEvents, setScheduleEvents] = useState<Database['public']['Tables']['schedule_events']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScheduleEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getThisWeeksScheduleEvents();
      setScheduleEvents(data || []);
    } catch (error) {
      console.error('Error fetching schedule events:', error);
      setError('Failed to load schedule events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleEvents();
  }, []);

  // Refresh when refreshKey changes
  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      fetchScheduleEvents();
    }
  }, [refreshKey]);

  // Function to refresh events (can be called after creating new events)
  const refreshEvents = () => {
    fetchScheduleEvents();
  };

  const getEventColors = (eventType: string) => {
    switch (eventType?.toLowerCase()) {
      case 'lecture':
        return 'bg-blue-50';
      case 'lab':
      case 'lab session':
        return 'bg-green-50';
      case 'office hours':
        return 'bg-purple-50';
      case 'exam':
        return 'bg-red-50';
      case 'study group':
        return 'bg-yellow-50';
      default:
        return 'bg-gray-50';
    }
  };

  const groupEventsByDay = () => {
    const groupedEvents: { [key: string]: typeof scheduleEvents } = {};
    
    scheduleEvents.forEach(event => {
      if (event.start_time) {
        const date = new Date(event.start_time);
        const dayKey = date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        });
        
        if (!groupedEvents[dayKey]) {
          groupedEvents[dayKey] = [];
        }
        groupedEvents[dayKey].push(event);
      }
    });

    // Sort events within each day by start time
    Object.keys(groupedEvents).forEach(day => {
      groupedEvents[day].sort((a, b) => {
        if (!a.start_time || !b.start_time) return 0;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      });
    });

    return groupedEvents;
  };

  const handleViewAllSchedule = () => {
    navigate('/schedule');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-800">This Week's Schedule</h2>
          <Button
            variant="ghost"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium p-1"
            onClick={handleViewAllSchedule}
          >
            View All
          </Button>
        </div>
        <Button
          variant="ghost"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          onClick={onAddEvent}
        >
          + Add Event
        </Button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading schedule...</span>
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
      ) : scheduleEvents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-2">No events scheduled this week.</p>
          <Button
            variant="outline"
            onClick={onAddEvent}
            className="text-sm"
          >
            Add your first event
          </Button>
        </div>
      ) : (
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {Object.entries(groupEventsByDay()).map(([day, events]) => (
            <div key={day}>
              <h3 className="font-medium text-gray-800 mb-2">{day}</h3>
              <div className="space-y-2 ml-4">
                {events.map((event) => {
                  const bgColor = getEventColors(event.event_type || '');
                  const startTime = event.start_time 
                    ? new Date(event.start_time).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : 'No time';
                  const endTime = event.end_time 
                    ? new Date(event.end_time).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : '';
                  const timeRange = endTime ? `${startTime} - ${endTime}` : startTime;
                  
                  return (
                    <div key={event.id} className={`grid grid-cols-3 gap-4 items-center p-2 ${bgColor} rounded-lg`}>
                      <span className="text-sm font-medium">{event.title}</span>
                      <span className="text-sm text-gray-600 text-center">{event.subject_id || 'No subject'}</span>
                      <span className="text-sm text-gray-500 text-right">{timeRange}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
