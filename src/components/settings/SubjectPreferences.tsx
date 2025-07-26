/**
 * Subject Preferences Component
 * Manage default subject selection and subject-specific settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Settings, Palette, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { getSubjects } from '@/services/supabaseService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Subject = Database['public']['Tables']['subjects']['Row'];

interface SubjectPreferencesProps {
  className?: string;
}

interface SubjectSettings {
  defaultSubjectId: string | null;
  autoSelectSubject: boolean;
  showSubjectInTitle: boolean;
  groupNotesBySubject: boolean;
  subjectSpecificSettings: Record<string, {
    defaultTemplate: string;
    autoSave: boolean;
    customColor: string;
  }>;
}

const SubjectPreferences: React.FC<SubjectPreferencesProps> = ({
  className = ''
}) => {
  const { user, updateSettings } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [preferences, setPreferences] = useState<SubjectSettings>({
    defaultSubjectId: null,
    autoSelectSubject: true,
    showSubjectInTitle: false,
    groupNotesBySubject: true,
    subjectSpecificSettings: {}
  });

  // Load subjects and preferences
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load subjects
        const subjectsData = await getSubjects();
        setSubjects(subjectsData || []);

        // Load existing preferences from user settings
        // For now, we'll use localStorage until we extend the user_settings table
        const savedPreferences = localStorage.getItem(`subject_preferences_${user?.id}`);
        if (savedPreferences) {
          try {
            const parsed = JSON.parse(savedPreferences);
            setPreferences(prev => ({ ...prev, ...parsed }));
          } catch (parseError) {
            console.error('Failed to parse saved preferences:', parseError);
          }
        }

      } catch (loadError) {
        console.error('Failed to load subjects or preferences:', loadError);
        setError('Failed to load subject preferences');
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  // Save preferences
  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsSaving(true);

      // Save to localStorage for now
      localStorage.setItem(`subject_preferences_${user.id}`, JSON.stringify(preferences));

      // TODO: When we extend the user_settings table, save to database
      // await updateSettings({ subject_preferences: preferences });

      toast({
        title: "Preferences saved",
        description: "Your subject preferences have been saved successfully.",
      });

    } catch (saveError) {
      console.error('Failed to save preferences:', saveError);
      toast({
        title: "Save failed",
        description: "Failed to save subject preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [preferences, user?.id]);

  // Update preference
  const updatePreference = useCallback(<K extends keyof SubjectSettings>(
    key: K,
    value: SubjectSettings[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update subject-specific setting
  const updateSubjectSetting = useCallback((
    subjectId: string,
    setting: keyof SubjectSettings['subjectSpecificSettings'][string],
    value: any
  ) => {
    setPreferences(prev => ({
      ...prev,
      subjectSpecificSettings: {
        ...prev.subjectSpecificSettings,
        [subjectId]: {
          ...prev.subjectSpecificSettings[subjectId],
          [setting]: value
        }
      }
    }));
  }, []);

  // Get subject name by ID
  const getSubjectName = useCallback((subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Unknown Subject';
  }, [subjects]);

  // Generate color for subject
  const getSubjectColors = useCallback((label: string) => {
    const hash = label.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colors = [
      { bg: 'bg-blue-50', badge: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-700' },
      { bg: 'bg-green-50', badge: 'bg-green-500', border: 'border-green-500', text: 'text-green-700' },
      { bg: 'bg-purple-50', badge: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-700' },
      { bg: 'bg-pink-50', badge: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-700' },
      { bg: 'bg-orange-50', badge: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-700' },
      { bg: 'bg-red-50', badge: 'bg-red-500', border: 'border-red-500', text: 'text-red-700' },
    ];
    
    return colors[Math.abs(hash) % colors.length];
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-600">Loading subject preferences...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* General Subject Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>General Preferences</span>
          </CardTitle>
          <CardDescription>
            Configure default behavior for subjects and notes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Default Subject Selection */}
          <div className="space-y-2">
            <Label htmlFor="default-subject">Default Subject for New Notes</Label>
            <Select
              value={preferences.defaultSubjectId || 'none'}
              onValueChange={(value) => updatePreference('defaultSubjectId', value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No default subject</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getSubjectColors(subject.name).badge}`}></div>
                      <span>{subject.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-select Subject */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-select Default Subject</Label>
              <p className="text-sm text-gray-500">
                Automatically select the default subject when creating new notes
              </p>
            </div>
            <Switch
              checked={preferences.autoSelectSubject}
              onCheckedChange={(checked) => updatePreference('autoSelectSubject', checked)}
            />
          </div>

          {/* Show Subject in Title */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Subject in Note Titles</Label>
              <p className="text-sm text-gray-500">
                Display subject name as a prefix in note titles
              </p>
            </div>
            <Switch
              checked={preferences.showSubjectInTitle}
              onCheckedChange={(checked) => updatePreference('showSubjectInTitle', checked)}
            />
          </div>

          {/* Group Notes by Subject */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Group Notes by Subject</Label>
              <p className="text-sm text-gray-500">
                Organize notes in subject groups on the dashboard
              </p>
            </div>
            <Switch
              checked={preferences.groupNotesBySubject}
              onCheckedChange={(checked) => updatePreference('groupNotesBySubject', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Subject-Specific Settings */}
      {subjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Subject-Specific Settings</span>
            </CardTitle>
            <CardDescription>
              Configure individual settings for each subject
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjects.slice(0, 5).map((subject, index) => {
              const colors = getSubjectColors(subject.name);
              const subjectSettings = preferences.subjectSpecificSettings[subject.id] || {
                defaultTemplate: 'standard',
                autoSave: true,
                customColor: colors.badge
              };

              return (
                <div key={subject.id}>
                  {index > 0 && <Separator className="my-4" />}
                  
                  <div className="space-y-3">
                    {/* Subject Header */}
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${colors.badge}`}></div>
                      <h4 className="font-medium text-gray-900">{subject.name}</h4>
                      <span className="text-xs text-gray-500">
                        {subject.color ? `Color: ${subject.color}` : 'No color set'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-7">
                      {/* Default Template */}
                      <div className="space-y-1">
                        <Label className="text-sm">Default Template</Label>
                        <Select
                          value={subjectSettings.defaultTemplate}
                          onValueChange={(value) => updateSubjectSetting(subject.id, 'defaultTemplate', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard Note</SelectItem>
                            <SelectItem value="lecture">Lecture Notes</SelectItem>
                            <SelectItem value="assignment">Assignment</SelectItem>
                            <SelectItem value="research">Research Notes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Auto-save for this subject */}
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Auto-save</Label>
                        <Switch
                          checked={subjectSettings.autoSave}
                          onCheckedChange={(checked) => updateSubjectSetting(subject.id, 'autoSave', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {subjects.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Configure More Subjects ({subjects.length - 5} remaining)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Subjects Message */}
      {subjects.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Found</h3>
            <p className="text-gray-500 mb-4">
              Create some subjects first to configure subject-specific preferences.
            </p>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Subject
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SubjectPreferences;