/**
 * Subject Preferences Component
 * Manage default subject selection and subject-specific settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Save, AlertCircle, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getSubjects } from '@/services/supabaseService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';

type Subject = Database['public']['Tables']['subjects']['Row'];

interface SubjectPreferencesProps {
  className?: string;
}

interface SubjectSettings {
  defaultSubjectId: string | null;
  autoSelectSubject: boolean;
  groupNotesBySubject: boolean;
}

const SubjectPreferences: React.FC<SubjectPreferencesProps> = ({
  className = ''
}) => {
  const { user, loading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Component state logging (simplified)
  if (process.env.NODE_ENV === 'development') {
    logger.log('SubjectPreferences: Rendered', { userId: user?.id });
  }
  
  const [preferences, setPreferences] = useState<SubjectSettings>({
    defaultSubjectId: null,
    autoSelectSubject: true,
    groupNotesBySubject: true
  });

  // Simple subject loading function - defined before useEffect
  const loadSubjects = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const subjectsData = await getSubjects();
      // Filter out invalid subjects and ensure we have valid data
      const validSubjects = (subjectsData || []).filter(subject => 
        subject && subject.id && typeof subject.id === 'string'
      );
      setSubjects(validSubjects);

      // Load saved preferences
      const savedPreferences = localStorage.getItem(`subject_preferences_${user.id}`);
      if (savedPreferences) {
        try {
          const parsed = JSON.parse(savedPreferences);
          if (typeof parsed === 'object' && parsed !== null) {
            setPreferences(prev => ({ ...prev, ...parsed }));
          }
        } catch (parseError) {
          // Silently fall back to defaults
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load subjects');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load data when user is ready - now with proper dependencies
  useEffect(() => {
    if (!authLoading && user?.id) {
      loadSubjects();
    } else if (!authLoading && !user?.id) {
      setError('Authentication required to load organization settings');
      setIsLoading(false);
    }
  }, [authLoading, user?.id, loadSubjects]);

  // Manual retry function
  const handleRetry = useCallback(async () => {
    await loadSubjects();
  }, [loadSubjects]);

  // Save preferences with validation
  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsSaving(true);

      // Validate preferences before saving
      if (preferences.defaultSubjectId && !subjects.find(s => s && s.id === preferences.defaultSubjectId)) {
        throw new Error('Selected default subject no longer exists');
      }

      // Save to localStorage
      localStorage.setItem(`subject_preferences_${user.id}`, JSON.stringify(preferences));

      toast({
        title: "Preferences saved",
        description: "Your subject preferences have been saved successfully.",
      });

    } catch (saveError) {
      toast({
        title: "Save failed",
        description: saveError instanceof Error ? saveError.message : "Failed to save subject preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [preferences, user?.id, subjects]);

  // Update preference
  const updatePreference = useCallback(<K extends keyof SubjectSettings>(
    key: K,
    value: SubjectSettings[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);


  // Get best available display name for subject
  const getSubjectDisplayName = useCallback((subject: Subject) => {
    return subject.name || subject.label || subject.code || subject.subject_code || `Subject ${subject.id.slice(0, 8)}`;
  }, []);

  // Get subject colors for display (null-safe)
  const getSubjectColors = useCallback((label: string | null | undefined) => {
    // Provide fallback for null/undefined labels
    const safeLabel = label || 'default';
    
    const hash = safeLabel.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colors = [
      { badge: 'bg-blue-500' },
      { badge: 'bg-green-500' },
      { badge: 'bg-purple-500' },
      { badge: 'bg-pink-500' },
      { badge: 'bg-orange-500' },
      { badge: 'bg-red-500' },
    ];
    
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-gray-700">
            {authLoading ? 'Checking authentication...' : 'Loading organization settings...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-3">
              <div>
                <strong>Unable to load organization settings</strong>
                <p className="mt-1">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
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
                {subjects.filter(subject => subject && subject.id).map((subject) => {
                  const displayName = getSubjectDisplayName(subject);
                  const colors = getSubjectColors(displayName);
                  return (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${colors.badge}`}></div>
                        <span>{displayName}</span>
                      </div>
                    </SelectItem>
                  );
                })}
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


      {/* No Subjects Message */}
      {subjects.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Found</h3>
            <p className="text-gray-500 mb-4">
              Create some subjects first to configure organization preferences.
            </p>
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