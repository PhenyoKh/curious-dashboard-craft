/**
 * Enhanced Assignment Modal
 * 
 * Advanced assignment creation/editing modal with:
 * - Academic-specific fields
 * - Smart defaults and suggestions
 * - Progress tracking setup
 * - Calendar integration
 * - Time estimation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, BookOpen, Target, Zap, Brain,
  FileText, Users, MapPin, Link, Tag, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useSecureForm } from '@/hooks/useSecureForm';
import { assignmentSchema } from '@/schemas/validation';
import { sanitizeText } from '@/utils/security';

// Import services
import { getSubjects, createAssignment } from '@/services/supabaseService';
// Temporarily disabled to debug blank screen issues
// import { assignmentTimeManager } from '@/services/assignmentTimeManager';
// import { assignmentDetectionEngine } from '@/services/assignmentDetectionEngine';

import type { 
  AssignmentFormData,
  AssignmentType,
  SubmissionType,
  Priority,
  ReminderSchedule
} from '@/types/assignments';
import type { Database } from '@/integrations/supabase/types';

type Assignment = Database['public']['Tables']['assignments']['Row'];

interface EnhancedAssignmentModalProps {
  onClose: () => void;
  onSave?: (assignment: Assignment) => void;
  editingAssignment?: Assignment;
  mode?: 'create' | 'edit';
  suggestedData?: Partial<AssignmentFormData>;
}

interface SmartSuggestion {
  field: keyof AssignmentFormData;
  value: string | number | Date | AssignmentType | SubmissionType | Priority | string[];
  reason: string;
  confidence: number;
}

export const EnhancedAssignmentModal: React.FC<EnhancedAssignmentModalProps> = ({
  onClose,
  onSave,
  editingAssignment,
  mode = 'create',
  suggestedData
}) => {
  // Form state
  const [activeTab, setActiveTab] = useState('basic');
  const [subjects, setSubjects] = useState<Database['public']['Tables']['subjects']['Row'][]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<number>(120);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form setup with enhanced validation
  const form = useSecureForm(assignmentSchema, {
    title: editingAssignment?.title || suggestedData?.title || '',
    description: editingAssignment?.description || suggestedData?.description || '',
    dueDate: editingAssignment?.due_date ? new Date(editingAssignment.due_date) : 
              suggestedData?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    assignmentType: editingAssignment?.assignment_type || suggestedData?.assignmentType || 'assignment',
    submissionType: editingAssignment?.submission_type || suggestedData?.submissionType || 'online',
    priority: editingAssignment?.priority || suggestedData?.priority || 'Medium',
    subjectId: editingAssignment?.subject_id || '',
    semester: editingAssignment?.semester || suggestedData?.semester || '',
    submissionUrl: editingAssignment?.submission_url || '',
    submissionInstructions: editingAssignment?.submission_instructions || '',
    studyTimeEstimate: editingAssignment?.study_time_estimate || suggestedData?.studyTimeEstimate || 120,
    difficultyRating: editingAssignment?.difficulty_rating || 3,
    tags: [] // Empty array since we removed tags UI but schema expects it
  });

  // Advanced options state
  const [enableReminders, setEnableReminders] = useState(true);
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [generateStudySchedule, setGenerateStudySchedule] = useState(false);
  const [customReminders, setCustomReminders] = useState<ReminderSchedule['reminders']>([
    { id: '1', type: 'due_date', timing: 1440, enabled: true, method: 'push', message: '1 day before due date' },
    { id: '2', type: 'due_date', timing: 60, enabled: true, method: 'push', message: '1 hour before due date' }
  ]);

  // Function definitions (moved before useEffect hooks to avoid temporal dead zone)
  const loadFormData = useCallback(async () => {
    try {
      console.log('🔍 EnhancedAssignmentModal: Loading subjects...');
      const subjectsData = await getSubjects();
      console.log('🔍 EnhancedAssignmentModal: Subjects loaded:', subjectsData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('❌ EnhancedAssignmentModal: Error loading subjects:', error);
    }
  }, []);

  const updateTimeEstimate = useCallback((assignmentType: AssignmentType) => {
    const estimates = {
      'assignment': 120,
      'exam': 300,
      'project': 480,
      'quiz': 60,
      'presentation': 240,
      'lab': 180,
      'homework': 90,
      'paper': 360,
      'discussion': 45
    };
    
    const estimate = estimates[assignmentType] || 120;
    setEstimatedTime(estimate);
    form.setValue('studyTimeEstimate', estimate);
  }, [form]);

  // Load data on mount
  useEffect(() => {
    loadFormData();
    // if (suggestedData) {
    //   generateSmartSuggestions();
    // }
  }, [loadFormData]);

  // Watch form changes for smart suggestions
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'title' || name === 'description') {
        // generateSmartSuggestions(); // Disabled for now
      }
      if (name === 'assignmentType') {
        updateTimeEstimate(value.assignmentType);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, updateTimeEstimate]);

  const generateSmartSuggestions = useCallback(async () => {
    if (isAnalyzing) return;
    
    const title = form.getValues('title');
    const description = form.getValues('description');
    
    if (!title && !description) return;

    setIsAnalyzing(true);
    try {
      // Use our detection engine to analyze the input
      // Temporarily disabled for debugging
      // const detectionResult = await assignmentDetectionEngine.detectAssignmentFromCalendarEvent({
      //   id: 'temp',
      //   title: title || 'Assignment',
      //   description: description,
      //   start: form.getValues('dueDate'),
      //   end: form.getValues('dueDate'),
      //   calendar_source: 'manual_input'
      // });

      // Temporarily disable detection results
      const detectionResult = { detected: false, suggested_data: null };
      if (detectionResult.detected && detectionResult.suggested_data) {
        const suggestions: SmartSuggestion[] = [];
        
        if (detectionResult.suggested_data.assignment_type && 
            detectionResult.suggested_data.assignment_type !== form.getValues('assignmentType')) {
          suggestions.push({
            field: 'assignmentType',
            value: detectionResult.suggested_data.assignment_type,
            reason: 'Detected from title/description keywords',
            confidence: detectionResult.confidence
          });
        }

        if (detectionResult.suggested_data.priority && 
            detectionResult.suggested_data.priority !== form.getValues('priority')) {
          suggestions.push({
            field: 'priority',
            value: detectionResult.suggested_data.priority,
            reason: 'Based on assignment type and keywords',
            confidence: detectionResult.confidence * 0.8
          });
        }

        if (detectionResult.suggested_data.study_time_estimate) {
          suggestions.push({
            field: 'studyTimeEstimate',
            value: detectionResult.suggested_data.study_time_estimate,
            reason: 'Estimated based on assignment type and complexity',
            confidence: detectionResult.confidence * 0.7
          });
          setEstimatedTime(detectionResult.suggested_data.study_time_estimate);
        }


        setSmartSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [form, isAnalyzing]);

  const applySuggestion = (suggestion: SmartSuggestion) => {
    // Type assertion is safe here since SmartSuggestion.field is keyof AssignmentFormData
    form.setValue(suggestion.field, suggestion.value as never);
    setSmartSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const handleSubmit = form.handleSubmit(
    form.submitSecurely(async (data) => {
      try {
        console.log('Form data:', data); // Debug log
        
        const assignmentData = {
          title: sanitizeText(data.title),
          description: data.description ? sanitizeText(data.description) : null,
          due_date: data.dueDate.toISOString(),
          assignment_type: data.assignmentType,
          submission_type: data.submissionType,
          priority: data.priority,
          subject_id: data.subjectId || null,
          semester: data.semester || null,
          submission_url: data.submissionUrl || null,
          submission_instructions: data.submissionInstructions || null,
          study_time_estimate: data.studyTimeEstimate,
          difficulty_rating: data.difficultyRating,
          tags: data.tags || [],
          status: editingAssignment?.status || 'Not Started'
        };

        console.log('Assignment data to save:', assignmentData); // Debug log

        let savedAssignment;
        if (mode === 'edit' && editingAssignment) {
          // For now, we'll just create - update functionality can be added later
          savedAssignment = await createAssignment(assignmentData);
        } else {
          savedAssignment = await createAssignment(assignmentData);
        }

        console.log('Assignment saved:', savedAssignment); // Debug log

        // Generate study schedule if requested
        // if (generateStudySchedule) {
        //   await assignmentTimeManager.generateOptimalSchedule('current-user-id');
        // }

        onSave?.(savedAssignment);
        onClose();
        
        // Refresh page to show changes
        window.location.reload();
      } catch (error) {
        console.error('Error saving assignment:', error);
        alert('Error creating assignment: ' + error.message); // User feedback
      }
    })
  );

  const renderBasicTab = () => (
    <div className="space-y-6">
      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Smart Suggestions
              {isAnalyzing && <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {smartSuggestions.map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize">{suggestion.field.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-600">{suggestion.reason}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={suggestion.confidence * 100} className="w-16 h-1" />
                    <span className="text-xs text-gray-500">{Math.round(suggestion.confidence * 100)}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {Array.isArray(suggestion.value) 
                      ? suggestion.value.join(', ')
                      : String(suggestion.value)
                    }
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applySuggestion(suggestion)}
                    className="text-xs"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Title */}
      <div>
        <Label htmlFor="title" className="flex items-center gap-2 text-sm font-medium mb-2">
          <FileText className="w-4 h-4" />
          Assignment Title
        </Label>
        <Input
          placeholder="e.g., Research Paper on Climate Change"
          {...form.register('title')}
          className="text-base"
        />
        {form.formState.errors.title && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>
        )}
      </div>

      {/* Type and Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Tag className="w-4 h-4" />
            Type
          </Label>
          <Select 
            value={form.watch('assignmentType')} 
            onValueChange={(value) => form.setValue('assignmentType', value as AssignmentType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assignment">Assignment</SelectItem>
              <SelectItem value="exam">Exam</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
              <SelectItem value="presentation">Presentation</SelectItem>
              <SelectItem value="lab">Lab</SelectItem>
              <SelectItem value="homework">Homework</SelectItem>
              <SelectItem value="paper">Paper</SelectItem>
              <SelectItem value="discussion">Discussion</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Target className="w-4 h-4" />
            Priority
          </Label>
          <Select 
            value={form.watch('priority')} 
            onValueChange={(value) => form.setValue('priority', value as Priority)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Subject and Semester */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="flex items-center gap-2 text-sm font-medium mb-2">
            <BookOpen className="w-4 h-4" />
            Subject
          </Label>
          <Select 
            value={form.watch('subjectId')} 
            onValueChange={(value) => form.setValue('subjectId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent className="z-50">
              {subjects.length === 0 ? (
                <SelectItem value="__no_subjects__" disabled>
                  {subjects.length === 0 ? 'No subjects available - add one first' : 'Loading subjects...'}
                </SelectItem>
              ) : (
                <>
                  <SelectItem value="">No subject</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.label || subject.name || 'Unnamed Subject'}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Calendar className="w-4 h-4" />
            Semester
          </Label>
          <Input
            placeholder="e.g., Fall 2024, Spring 2025"
            {...form.register('semester')}
          />
          {form.formState.errors.semester && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.semester.message}</p>
          )}
        </div>
      </div>

      {/* Due Date */}
      <div>
        <Label className="flex items-center gap-2 text-sm font-medium mb-2">
          <Clock className="w-4 h-4" />
          Due Date
        </Label>
        <Input
          type="datetime-local"
          value={form.watch('dueDate').toISOString().slice(0, 16)}
          onChange={(e) => form.setValue('dueDate', new Date(e.target.value))}
        />
        {form.formState.errors.dueDate && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.dueDate.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Description</Label>
        <Textarea
          placeholder="Detailed description of the assignment..."
          {...form.register('description')}
          className="min-h-[100px]"
        />
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="space-y-6">
      {/* Submission Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submission Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Submission Type</Label>
            <Select 
              value={form.watch('submissionType')} 
              onValueChange={(value) => form.setValue('submissionType', value as SubmissionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="paper">Paper</SelectItem>
                <SelectItem value="presentation">Presentation</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="in_person">In Person</SelectItem>
                <SelectItem value="upload">File Upload</SelectItem>
                <SelectItem value="quiz_platform">Quiz Platform</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Submission URL</Label>
            <Input
              type="url"
              placeholder="https://..."
              {...form.register('submissionUrl')}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Submission Instructions</Label>
            <Textarea
              placeholder="Special instructions for submission..."
              {...form.register('submissionInstructions')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Time and Difficulty */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Planning & Difficulty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Estimated Study Time: {Math.round(estimatedTime / 60)}h {estimatedTime % 60}m
            </Label>
            <Slider
              value={[estimatedTime]}
              onValueChange={(value) => {
                setEstimatedTime(value[0]);
                form.setValue('studyTimeEstimate', value[0]);
              }}
              max={600}
              min={30}
              step={15}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>30min</span>
              <span>10h</span>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Difficulty Rating: {form.watch('difficultyRating')}/5
            </Label>
            <Slider
              value={[form.watch('difficultyRating')]}
              onValueChange={(value) => form.setValue('difficultyRating', value[0])}
              max={5}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Easy</span>
              <span>Very Hard</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Integration Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integration & Automation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Sync to Calendar</Label>
              <p className="text-xs text-gray-500">Automatically add to your calendar</p>
            </div>
            <Switch
              checked={syncToCalendar}
              onCheckedChange={setSyncToCalendar}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Generate Study Schedule</Label>
              <p className="text-xs text-gray-500">Create optimal study time blocks</p>
            </div>
            <Switch
              checked={generateStudySchedule}
              onCheckedChange={setGenerateStudySchedule}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Smart Reminders</Label>
              <p className="text-xs text-gray-500">Intelligent reminder notifications</p>
            </div>
            <Switch
              checked={enableReminders}
              onCheckedChange={setEnableReminders}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reminder Configuration */}
      {enableReminders && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reminder Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customReminders.map((reminder, index) => (
              <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={reminder.enabled}
                    onCheckedChange={(checked) => {
                      const updated = [...customReminders];
                      updated[index].enabled = checked;
                      setCustomReminders(updated);
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{reminder.message}</p>
                    <p className="text-xs text-gray-500">
                      {reminder.timing > 60 
                        ? `${Math.round(reminder.timing / 60)} hours before`
                        : `${reminder.timing} minutes before`
                      }
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {reminder.method}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto max-h-[80vh] flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-3 shrink-0">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="basic" className="h-full overflow-y-auto p-1">
            {renderBasicTab()}
          </TabsContent>

          <TabsContent value="advanced" className="h-full overflow-y-auto p-1">
            {renderAdvancedTab()}
          </TabsContent>

          <TabsContent value="settings" className="h-full overflow-y-auto p-1">
            {renderSettingsTab()}
          </TabsContent>
        </div>
      </Tabs>
      
      {/* Action Buttons - Fixed positioning within modal */}
      <div className="flex items-center justify-between pt-4 border-t mt-4 bg-white px-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        
        <div className="flex items-center gap-3">
          {mode === 'create' && (
            <Button
              variant="outline"
              onClick={() => {
                // Save as draft functionality
                console.log('Save as draft');
              }}
            >
              Save as Draft
            </Button>
          )}
          
          <Button 
            onClick={handleSubmit}
            disabled={form.formState.isSubmitting || !form.formState.isValid}
            className="min-w-[120px]"
          >
            {form.formState.isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            ) : mode === 'edit' ? (
              'Update Assignment'
            ) : (
              'Create Assignment'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};