
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSecureForm } from '@/hooks/useSecureForm';
import { subjectSchema } from '@/schemas/validation';
import { sanitizeText } from '@/utils/security';
import { createSubject } from '../../services/supabaseService';
import { supabase } from '@/integrations/supabase/client';

interface SubjectModalProps {
  onClose: () => void;
}

const colors = [
  { name: 'blue', class: 'bg-blue-500', hex: '#3B82F6' },
  { name: 'green', class: 'bg-green-500', hex: '#10B981' },
  { name: 'purple', class: 'bg-purple-500', hex: '#8B5CF6' },
  { name: 'red', class: 'bg-red-500', hex: '#EF4444' },
  { name: 'yellow', class: 'bg-yellow-500', hex: '#F59E0B' },
  { name: 'pink', class: 'bg-pink-500', hex: '#EC4899' }
];

export const SubjectModal = ({ onClose }: SubjectModalProps) => {
  const form = useSecureForm(subjectSchema, {
    name: '',
    code: '',
    color: '#3B82F6'
  });

  const [selectedColor, setSelectedColor] = useState('blue');

  const handleSubmit = form.handleSubmit(
    form.submitSecurely(async (data) => {
      try {
        const sanitizedData = {
          label: sanitizeText(data.name),
          value: sanitizeText(data.name.toLowerCase().replace(/\s+/g, '_')),
          code: sanitizeText(data.name.substring(0, 10).toUpperCase()),
          subject_code: data.code && data.code.trim() ? sanitizeText(data.code.trim().toUpperCase()) : null,
          color: data.color || '#3B82F6'
        };
        
        const result = await createSubject(sanitizedData);
        
        onClose();
        window.location.reload();
      } catch (error) {
        console.error('Error creating subject:', error);
        // Let the error bubble up to be handled by the form's error handling
        throw error;
      }
    })
  );

  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName);
    const colorHex = colors.find(c => c.name === colorName)?.hex || '#3B82F6';
    form.setValue('color', colorHex);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="subjectName" className="block text-sm font-medium text-gray-700 mb-2">
          Subject Name
        </Label>
        <Input
          id="subjectName"
          type="text"
          placeholder="e.g., Advanced Mathematics 401"
          {...form.register('name')}
        />
        {form.formState.errors.name && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="subjectCode" className="block text-sm font-medium text-gray-700 mb-2">
          Subject Code <span className="text-gray-500 font-normal">(Optional)</span>
        </Label>
        <Input
          id="subjectCode"
          type="text"
          placeholder="e.g., MATH401, CS101, ENG200"
          {...form.register('code')}
          maxLength={10}
          style={{ textTransform: 'uppercase' }}
        />
        {form.formState.errors.code && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.code.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          2-10 characters, letters and numbers only
        </p>
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
              onClick={() => handleColorSelect(color.name)}
            />
          ))}
        </div>
        {form.formState.errors.color && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.color.message}</p>
        )}
      </div>
      <div className="flex items-center justify-end space-x-3 mt-8">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Creating...' : 'Create Subject'}
        </Button>
      </div>
    </div>
  );
};
