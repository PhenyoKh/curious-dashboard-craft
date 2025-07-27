-- Add recurrence_pattern column to schedule_events table for storing recurring event patterns
-- This migration adds support for recurring events in the schedule system

-- Add the recurrence_pattern column to store JSON-formatted recurrence patterns
ALTER TABLE schedule_events 
ADD COLUMN recurrence_pattern TEXT;

-- Add a comment to explain the column purpose
COMMENT ON COLUMN schedule_events.recurrence_pattern IS 
'JSON-formatted recurrence pattern containing type, interval, daysOfWeek, endDate, etc. Used when is_recurring is true.';

-- Create an index on is_recurring for better query performance
CREATE INDEX idx_schedule_events_is_recurring ON schedule_events(is_recurring) 
WHERE is_recurring = true;

-- Add a check constraint to ensure recurrence_pattern is only set when is_recurring is true
ALTER TABLE schedule_events 
ADD CONSTRAINT check_recurrence_pattern_consistency 
CHECK (
  (is_recurring = true AND recurrence_pattern IS NOT NULL) OR 
  (is_recurring = false AND recurrence_pattern IS NULL) OR 
  (is_recurring IS NULL AND recurrence_pattern IS NULL)
);