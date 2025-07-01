
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AssignmentModalProps {
  onClose: () => void;
}

export const AssignmentModal = ({ onClose }: AssignmentModalProps) => {
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = () => {
    console.log('Adding assignment:', { type, title, subject, dueDate, status });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
          Type
        </Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="assignment">Assignment</SelectItem>
            <SelectItem value="exam">Exam</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
            <SelectItem value="project">Project</SelectItem>
            <SelectItem value="lab-report">Lab Report</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </Label>
        <Input
          type="text"
          placeholder="e.g., Essay 3, Midterm Exam"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
          Subject
        </Label>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger>
            <SelectValue placeholder="Select a subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bio101">Biology 101</SelectItem>
            <SelectItem value="cs301">Computer Science 301</SelectItem>
            <SelectItem value="stat301">Statistics 301</SelectItem>
            <SelectItem value="psyc201">Psychology 201</SelectItem>
            <SelectItem value="chem200">Chemistry 200</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
          Due Date
        </Label>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not-started">Not Started</SelectItem>
            <SelectItem value="to-do">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="on-track">On Track</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-end space-x-3 mt-8">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          Add Assignment
        </Button>
      </div>
    </div>
  );
};
