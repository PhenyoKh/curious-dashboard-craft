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

import React, { useState, useEffect } from 'react';
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
import { assignmentsService, subjectsService, semestersService } from '@/services/supabaseService';
import { assignmentTimeManager } from '@/services/assignmentTimeManager';
import { assignmentDetectionEngine } from '@/services/assignmentDetectionEngine';

import type { 
  AssignmentFormData,
  AssignmentType,
  SubmissionType,
  Priority,
  Subject,
  Semester,
  ReminderSchedule
} from '@/types/assignments';

interface EnhancedAssignmentModalProps {
  onClose: () => void;
  onSave?: (assignment: any) => void;
  editingAssignment?: any;
  mode?: 'create' | 'edit';
  suggestedData?: Partial<AssignmentFormData>;
}

interface SmartSuggestion {
  field: string;
  value: any;
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<number>(120);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form setup with enhanced validation
  const form = useSecureForm(assignmentSchema, {
    title: editingAssignment?.title || suggestedData?.title || '',
    description: editingAssignment?.description || suggestedData?.description || '',
    due_date: editingAssignment?.due_date ? new Date(editingAssignment.due_date) : 
              suggestedData?.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    assignment_type: editingAssignment?.assignment_type || suggestedData?.assignment_type || 'assignment',
    submission_type: editingAssignment?.submission_type || suggestedData?.submission_type || 'online',
    priority: editingAssignment?.priority || suggestedData?.priority || 'Medium',
    subject_id: editingAssignment?.subject_id || '',
    semester_id: editingAssignment?.semester_id || '',
    submission_url: editingAssignment?.submission_url || '',
    submission_instructions: editingAssignment?.submission_instructions || '',
    study_time_estimate: editingAssignment?.study_time_estimate || suggestedData?.study_time_estimate || 120,
    difficulty_rating: editingAssignment?.difficulty_rating || 3,
    tags: editingAssignment?.tags || suggestedData?.tags || []
  });

  // Advanced options state
  const [enableReminders, setEnableReminders] = useState(true);
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [generateStudySchedule, setGenerateStudySchedule] = useState(false);
  const [customReminders, setCustomReminders] = useState<ReminderSchedule['reminders']>([
    { id: '1', type: 'due_date', timing: 1440, enabled: true, method: 'push', message: '1 day before due date' },
    { id: '2', type: 'due_date', timing: 60, enabled: true, method: 'push', message: '1 hour before due date' }
  ]);

  // Load data on mount
  useEffect(() => {
    loadFormData();
    if (suggestedData) {
      generateSmartSuggestions();
    }
  }, []);

  // Watch form changes for smart suggestions
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'title' || name === 'description') {
        generateSmartSuggestions();
      }
      if (name === 'assignment_type') {
        updateTimeEstimate(value.assignment_type);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const loadFormData = async () => {
    try {
      const [subjectsData, semestersData] = await Promise.all([
        subjectsService.getUserSubjects('current-user-id'),
        semestersService.getUserSemesters('current-user-id')
      ]);
      
      setSubjects(subjectsData);
      setSemesters(semestersData);
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  const generateSmartSuggestions = async () => {
    if (isAnalyzing) return;
    
    const title = form.getValues('title');
    const description = form.getValues('description');
    
    if (!title && !description) return;

    setIsAnalyzing(true);
    try {
      // Use our detection engine to analyze the input
      const detectionResult = await assignmentDetectionEngine.detectAssignmentFromCalendarEvent({
        id: 'temp',
        title: title || 'Assignment',
        description: description,
        start: form.getValues('due_date'),
        end: form.getValues('due_date'),
        calendar_source: 'manual_input'
      });

      if (detectionResult.detected && detectionResult.suggested_data) {
        const suggestions: SmartSuggestion[] = [];
        
        if (detectionResult.suggested_data.assignment_type && 
            detectionResult.suggested_data.assignment_type !== form.getValues('assignment_type')) {
          suggestions.push({
            field: 'assignment_type',
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
            field: 'study_time_estimate',
            value: detectionResult.suggested_data.study_time_estimate,
            reason: 'Estimated based on assignment type and complexity',
            confidence: detectionResult.confidence * 0.7
          });
          setEstimatedTime(detectionResult.suggested_data.study_time_estimate);
        }

        if (detectionResult.suggested_data.tags?.length) {
          suggestions.push({
            field: 'tags',
            value: detectionResult.suggested_data.tags,
            reason: 'Extracted relevant keywords and topics',
            confidence: detectionResult.confidence * 0.6
          });
        }

        setSmartSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateTimeEstimate = (assignmentType: AssignmentType) => {
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
    form.setValue('study_time_estimate', estimate);
  };

  const applySuggestion = (suggestion: SmartSuggestion) => {
    form.setValue(suggestion.field as any, suggestion.value);
    setSmartSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const handleSubmit = form.handleSubmit(
    form.submitSecurely(async (data) => {
      try {
        const assignmentData = {
          title: sanitizeText(data.title),
          description: data.description ? sanitizeText(data.description) : null,
          due_date: data.due_date.toISOString(),
          assignment_type: data.assignment_type,
          submission_type: data.submission_type,
          priority: data.priority,
          subject_id: data.subject_id || null,
          semester_id: data.semester_id || null,
          submission_url: data.submission_url || null,
          submission_instructions: data.submission_instructions || null,
          study_time_estimate: data.study_time_estimate,
          difficulty_rating: data.difficulty_rating,
          tags: data.tags,
          status: editingAssignment?.status || 'Not Started',
          reminder_schedule: enableReminders ? {
            reminders: customReminders,
            default_enabled: true
          } : null,
          academic_metadata: {
            sync_to_calendar: syncToCalendar,
            generate_schedule: generateStudySchedule,
            estimated_difficulty: data.difficulty_rating,
            source: 'manual_creation'
          }
        };

        let savedAssignment;
        if (mode === 'edit' && editingAssignment) {
          savedAssignment = await assignmentsService.updateAssignment(
            editingAssignment.id,
            assignmentData,
            'current-user-id'
          );
        } else {
          savedAssignment = await assignmentsService.createAssignment({
            ...assignmentData,
            user_id: 'current-user-id'
          });
        }

        // Generate study schedule if requested
        if (generateStudySchedule) {
          await assignmentTimeManager.generateOptimalSchedule('current-user-id');
        }

        onSave?.(savedAssignment);
        onClose();
        
        // Refresh page to show changes
        window.location.reload();
      } catch (error) {
        console.error('Error saving assignment:', error);
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
            value={form.watch('assignment_type')} 
            onValueChange={(value) => form.setValue('assignment_type', value as AssignmentType)}
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
            value={form.watch('subject_id')} 
            onValueChange={(value) => form.setValue('subject_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Calendar className="w-4 h-4" />
            Semester
          </Label>
          <Select 
            value={form.watch('semester_id')} 
            onValueChange={(value) => form.setValue('semester_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((semester) => (
                <SelectItem key={semester.id} value={semester.id}>
                  {semester.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          value={form.watch('due_date').toISOString().slice(0, 16)}
          onChange={(e) => form.setValue('due_date', new Date(e.target.value))}
        />
        {form.formState.errors.due_date && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.due_date.message}</p>
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
              value={form.watch('submission_type')} 
              onValueChange={(value) => form.setValue('submission_type', value as SubmissionType)}
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
              {...form.register('submission_url')}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Submission Instructions</Label>
            <Textarea
              placeholder="Special instructions for submission..."
              {...form.register('submission_instructions')}
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
                form.setValue('study_time_estimate', value[0]);
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
              Difficulty Rating: {form.watch('difficulty_rating')}/5
            </Label>
            <Slider
              value={[form.watch('difficulty_rating')]}
              onValueChange={(value) => form.setValue('difficulty_rating', value[0])}
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

      {/* Tags */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Tags</Label>
        <Input
          placeholder="Add tags separated by commas..."
          value={form.watch('tags')?.join(', ') || ''}
          onChange={(e) => {
            const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
            form.setValue('tags', tags);
          }}
        />
        <p className="text-xs text-gray-500 mt-1">
          Tags help organize and search your assignments
        </p>
      </div>
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
    <div className="max-w-2xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          {renderBasicTab()}
        </TabsContent>

        <TabsContent value="advanced">
          {renderAdvancedTab()}
        </TabsContent>

        <TabsContent value="settings">
          {renderSettingsTab()}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
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