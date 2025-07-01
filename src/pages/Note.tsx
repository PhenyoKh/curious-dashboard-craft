
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Note = () => {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('2025-07-01');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSave = () => {
    console.log('Saving note:', { subject, date, title, content });
    // After saving, navigate back to dashboard
    navigate('/');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4 md:p-8 font-inter-tight">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">New Note</h1>
          </div>
          <Button 
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Note
          </Button>
        </div>

        {/* Note Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cs301">Computer Science 301</SelectItem>
                  <SelectItem value="bio101">Biology 101</SelectItem>
                  <SelectItem value="stat301">Statistics 301</SelectItem>
                  <SelectItem value="psyc201">Psychology 201</SelectItem>
                  <SelectItem value="chem200">Chemistry 200</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-6">
            <Label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </Label>
            <Input
              type="text"
              placeholder="e.g., Lecture 13 - Graph Theory"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg"
            />
          </div>

          <div>
            <Label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </Label>
            <Textarea
              placeholder="Start writing your notes here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px] text-base leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Note;
