/**
 * Subject Preferences Component
 * Manage default subject selection and subject-specific settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Settings, Palette, Save, AlertCircle, FolderOpen } from 'lucide-react';
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
  const { user, updateSettings, loading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [authenticationReady, setAuthenticationReady] = useState(false);
  
  // Add debug logging
  console.log('📁 SubjectPreferences: Component rendered', { 
    userId: user?.id, 
    className, 
    authLoading, 
    authenticationReady 
  });

  // Authentication check - ensure user is loaded before proceeding
  useEffect(() => {
    if (!authLoading) {
      if (user?.id) {
        console.log('📁 SubjectPreferences: Authentication ready with user:', user.id);
        setAuthenticationReady(true);
      } else {
        console.log('📁 SubjectPreferences: No user found after auth loading complete');
        setAuthenticationReady(false);
        setError('Authentication required to load organization settings');
        setIsLoading(false);
      }
    }
  }, [authLoading, user?.id]);
  
  const [preferences, setPreferences] = useState<SubjectSettings>({
    defaultSubjectId: null,
    autoSelectSubject: true,
    showSubjectInTitle: false,
    groupNotesBySubject: true,
    subjectSpecificSettings: {}
  });

  // Test database connection
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      console.log('📁 SubjectPreferences: Testing database connection...');
      // Simple connection test - try to get subjects
      if (user?.id) {
        await getSubjects();
        console.log('📁 SubjectPreferences: Connection test successful');
        setConnectionStatus('connected');
        return true;
      }
      return false;
    } catch (error) {
      console.error('📁 SubjectPreferences: Connection test error:', error);
      setConnectionStatus('disconnected');
      return false;
    }
  }, [user?.id]);

  // Retry data loading with exponential backoff
  const retryWithBackoff = useCallback(async (attemptNumber: number): Promise<void> => {
    const delay = Math.min(1000 * Math.pow(2, attemptNumber), 10000); // Max 10 seconds
    console.log(`📁 SubjectPreferences: Retrying in ${delay}ms (attempt ${attemptNumber + 1})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    setRetryCount(attemptNumber + 1);
  }, []);

  // Enhanced data loading with connection testing and retry logic
  const loadDataWithRetry = useCallback(async (isRetry = false): Promise<void> => {
    if (!user?.id) {
      console.log('📁 SubjectPreferences: No user ID, skipping data load');
      return;
    }

    try {
      console.log('📁 SubjectPreferences: Starting enhanced data load', { 
        userId: user?.id, 
        isRetry, 
        retryCount: retryCount 
      });

      if (isRetry) {
        setIsRetrying(true);
      } else {
        setIsLoading(true);
        setRetryCount(0);
      }
      
      setError(null);

      // Test connection first
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to the database. Please check your internet connection.');
      }

      // Load subjects with timeout
      console.log('📁 SubjectPreferences: Loading subjects with timeout...');
      const subjectsPromise = getSubjects();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000);
      });

      const subjectsData = await Promise.race([subjectsPromise, timeoutPromise]) as Subject[];
      console.log('📁 SubjectPreferences: Subjects loaded successfully', { count: subjectsData?.length || 0 });
      setSubjects(subjectsData || []);

      // Load existing preferences from localStorage
      const savedPreferences = localStorage.getItem(`subject_preferences_${user.id}`);
      if (savedPreferences) {
        try {
          const parsed = JSON.parse(savedPreferences);
          console.log('📁 SubjectPreferences: Loaded saved preferences', parsed);
          setPreferences(prev => ({ ...prev, ...parsed }));
        } catch (parseError) {
          console.error('📁 SubjectPreferences: Failed to parse saved preferences:', parseError);
        }
      } else {
        console.log('📁 SubjectPreferences: No saved preferences found, using defaults');
      }

      setConnectionStatus('connected');
      console.log('📁 SubjectPreferences: Enhanced data load completed successfully');

    } catch (loadError) {
      console.error('📁 SubjectPreferences: Enhanced data load failed:', loadError);
      
      const errorMessage = loadError instanceof Error ? loadError.message : 'Failed to load subject preferences';
      setError(errorMessage);
      setConnectionStatus('disconnected');

      // Retry logic - up to 3 attempts
      if (!isRetry && retryCount < 3) {
        console.log(`📁 SubjectPreferences: Will retry after backoff (attempt ${retryCount + 1}/3)`);
        await retryWithBackoff(retryCount);
        return loadDataWithRetry(true);
      } else if (isRetry && retryCount < 3) {
        console.log(`📁 SubjectPreferences: Retrying again (attempt ${retryCount + 1}/3)`);
        await retryWithBackoff(retryCount);
        return loadDataWithRetry(true);
      } else {
        console.error('📁 SubjectPreferences: All retry attempts exhausted');
        toast({
          title: "Connection failed",
          description: "Unable to load subjects. Please check your connection and try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [user?.id, retryCount, testConnection, retryWithBackoff]);

  // Manual retry function
  const handleRetry = useCallback(async () => {
    setRetryCount(0);
    await loadDataWithRetry(false);
  }, [loadDataWithRetry]);

  // Load subjects and preferences - only when authentication is ready
  useEffect(() => {
    if (authenticationReady && user?.id) {
      console.log('📁 SubjectPreferences: Authentication ready, starting data load');
      loadDataWithRetry(false);
    } else if (!authLoading && !user?.id) {
      console.log('📁 SubjectPreferences: No user ID after auth complete, skipping data load');
      setIsLoading(false);
    }
  }, [authenticationReady, user?.id, loadDataWithRetry, authLoading]);

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

  // Show loading state while authentication is loading or data is loading
  if (authLoading || isLoading || isRetrying) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              {authLoading 
                ? 'Checking authentication...'
                : isRetrying 
                  ? `Retrying connection... (${retryCount}/3)` 
                  : 'Loading organization settings...'}
            </p>
            {isRetrying && (
              <p className="text-xs text-gray-500 mt-1">
                Please wait while we reconnect to the database.
              </p>
            )}
            {authLoading && (
              <p className="text-xs text-gray-500 mt-1">
                Please wait while we verify your access.
              </p>
            )}
          </div>
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
              
              <div className="flex items-center space-x-2 text-sm">
                <span>Connection status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  connectionStatus === 'connected' 
                    ? 'bg-green-100 text-green-700'
                    : connectionStatus === 'disconnected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {connectionStatus === 'connected' ? '● Connected' :
                   connectionStatus === 'disconnected' ? '● Disconnected' :
                   '● Unknown'}
                </span>
              </div>

              {retryCount >= 3 ? (
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRetry}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Try Again
                  </Button>
                </div>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>

        {/* Fallback content for when subjects can't be loaded */}
        <Card>
          <CardContent className="text-center py-8">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Organization Settings Unavailable</h3>
            <p className="text-gray-500 mb-4">
              We're having trouble connecting to load your subjects and organization preferences.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">You can try:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Checking your internet connection</li>
                <li>• Refreshing the page</li>
                <li>• Trying again in a few moments</li>
              </ul>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRetry}
              className="mt-4"
              disabled={isRetrying}
            >
              {isRetrying ? 'Retrying...' : 'Retry Connection'}
            </Button>
          </CardContent>
        </Card>
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