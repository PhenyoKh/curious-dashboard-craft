
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SubjectModalProps {
  onClose: () => void;
}

const colors = [
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'green', class: 'bg-green-500' },
  { name: 'purple', class: 'bg-purple-500' },
  { name: 'red', class: 'bg-red-500' },
  { name: 'yellow', class: 'bg-yellow-500' },
  { name: 'pink', class: 'bg-pink-500' }
];

export const SubjectModal = ({ onClose }: SubjectModalProps) => {
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [semester, setSemester] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');

  const handleSubmit = () => {
    console.log('Creating subject:', { subjectName, subjectCode, semester, selectedColor });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="subjectName" className="block text-sm font-medium text-gray-700 mb-2">
          Subject Name
        </Label>
        <Input
          type="text"
          placeholder="e.g., Advanced Mathematics 401"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="subjectCode" className="block text-sm font-medium text-gray-700 mb-2">
          Subject Code (Optional)
        </Label>
        <Input
          type="text"
          placeholder="e.g., MATH 401"
          value={subjectCode}
          onChange={(e) => setSubjectCode(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-2">
          Semester Label (Optional)
        </Label>
        <Input
          type="text"
          placeholder="e.g., Fall 2025, Semester 1"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
        />
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          Color
        </Label>
        <div className="flex space-x-2">
          {colors.map((color) => (
            <div
              key={color.name}
              className={`w-8 h-8 ${color.class} rounded-md cursor-pointer border-2 ${
                selectedColor === color.name ? `border-${color.name}-500` : 'border-transparent hover:border-gray-400'
              }`}
              onClick={() => setSelectedColor(color.name)}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end space-x-3 mt-8">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          Create Subject
        </Button>
      </div>
    </div>
  );
};
