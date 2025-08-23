import React, { useEffect, useState, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { 
  X, 
  User, 
  Settings, 
  Bell, 
  Shield, 
  Calendar as CalendarIcon, 
  HelpCircle,
  Camera,
  Sun,
  Moon,
  Globe,
  Lock,
  Database as DatabaseIcon,
  ExternalLink,
  Mail,
  MessageSquare,
  BookOpen,
  AlertCircle,
  CheckCircle,
  FolderOpen,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import BasicSecuritySettings from '@/components/settings/BasicSecuritySettings';
import PasswordChangeSettings from '@/components/settings/PasswordChangeSettings';
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload';
import SubjectPreferences from '@/components/settings/SubjectPreferences';
import EditorPreferences from '@/components/settings/EditorPreferences';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import { SubscriptionTab } from '@/components/settings/SubscriptionTab';
import { UnifiedCalendarIntegrations } from '@/components/calendar/UnifiedCalendarIntegrations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useScrollLock } from '@/hooks/useScrollLock';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];
type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

// Error Boundary for Settings Tabs
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  tabName: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SettingsTabErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error in development only
    if (process.env.NODE_ENV === 'development') {
      logger.error(`Settings ${this.props.tabName} tab error:`, error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {this.props.tabName} Settings Unavailable
            </h3>
            <p className="text-gray-600 mb-4">
              There was an error loading the {this.props.tabName.toLowerCase()} settings. 
              Please try refreshing or contact support if the issue persists.
            </p>
            <Button 
              variant="outline" 
              onClick={() => this.setState({ hasError: false })}
              className="mr-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen = false, onClose }) => {
  const { user, profile, settings, updateProfile, updateSettings, signOut } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const modalIsOpen = isOpen || internalOpen;
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Use scroll lock hook to prevent scrollbar glitch
  const { lockScroll, unlockScroll } = useScrollLock();
  
  // Local form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    bio: '',
    avatar_url: ''
  });

  // Handle profile picture update
  const handleProfilePictureUpdate = useCallback((imageUrl: string | null) => {
    setProfileForm(prev => ({ ...prev, avatar_url: imageUrl || '' }));
  }, []);
  
  const [settingsForm, setSettingsForm] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'en',
    auto_save_notes: true,
    show_line_numbers: false,
    enable_spell_check: true
  });

  // Initialize form data when modal opens or data changes
  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (settings) {
      // Safely parse JSONB fields with fallback defaults
      const parseJsonbField = (field: unknown, defaultValue: unknown) => {
        if (typeof field === 'object' && field !== null) {
          return field;
        }
        try {
          return typeof field === 'string' ? JSON.parse(field) : defaultValue;
        } catch {
          return defaultValue;
        }
      };

      setSettingsForm({
        theme: (settings.theme as 'light' | 'dark' | 'system') || 'system',
        language: settings.language || 'en',
        auto_save_notes: settings.auto_save_notes ?? true,
        show_line_numbers: settings.show_line_numbers ?? false,
        enable_spell_check: settings.enable_spell_check ?? true
      });
    }
  }, [settings]);

  // Generate user initials
  const getUserInitials = () => {
    if (profileForm.full_name) {
      return profileForm.full_name
        .split(' ')
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Handle save changes with validation
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Validate inputs before saving
      if (profileForm.full_name && profileForm.full_name.length > 100) {
        throw new Error('Full name must be less than 100 characters');
      }
      
      if (profileForm.bio && profileForm.bio.length > 500) {
        throw new Error('Bio must be less than 500 characters');
      }

      // Update profile first
      if (profileForm.full_name !== (profile?.full_name || '') || 
          profileForm.bio !== (profile?.bio || '') ||
          profileForm.avatar_url !== (profile?.avatar_url || '')) {
        const profileUpdate: UserProfileUpdate = {
          full_name: profileForm.full_name || null,
          bio: profileForm.bio || null,
          avatar_url: profileForm.avatar_url || null
        };

        const { error: profileError } = await updateProfile(profileUpdate);
        if (profileError) {
          throw new Error(`Profile update failed: ${profileError.message}`);
        }
      }

      // Update only basic settings that exist in the current schema
      const settingsUpdate: UserSettingsUpdate = {
        theme: settingsForm.theme,
        language: settingsForm.language,
        auto_save_notes: settingsForm.auto_save_notes,
        show_line_numbers: settingsForm.show_line_numbers,
        enable_spell_check: settingsForm.enable_spell_check
      };

      const { error: settingsError } = await updateSettings(settingsUpdate);
      if (settingsError) {
        throw new Error(`Settings update failed: ${settingsError.message}`);
      }

      setSaveMessage({ type: 'success', message: 'Settings saved successfully!' });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
      
    } catch (error) {
      setSaveMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save settings' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      if (onClose) onClose();
    } catch (error) {
      logger.error('Error signing out:', error);
      setSaveMessage({ type: 'error', message: 'Failed to sign out' });
    }
  };

  // Handle Community Forum click - opens feedback board
  const handleCommunityForumClick = () => {
    window.open('https://feedback-scola.fider.io/', '_blank', 'noopener,noreferrer');
  };

  const tabs: SettingsTab[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <Settings className="w-4 h-4" /> },
    { id: 'organization', label: 'Organization', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'subscription', label: 'Subscription', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <CalendarIcon className="w-4 h-4" /> },
    { id: 'help', label: 'Help & Support', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  // Define closeModal function before it's used
  const closeModal = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        setInternalOpen(false);
      }
    }, 300);
  }, [onClose]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Close modal on Escape key
      if (event.key === 'Escape' && modalIsOpen) {
        event.preventDefault();
        closeModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalIsOpen, closeModal]);

  // Prevent body scroll when modal is open using scroll lock hook
  useEffect(() => {
    if (modalIsOpen) {
      lockScroll();
    } else {
      unlockScroll();
    }

    return () => {
      unlockScroll();
    };
  }, [modalIsOpen, lockScroll, unlockScroll]);

  // Handle animation when modal opens/closes
  useEffect(() => {
    if (modalIsOpen) {
      // Small timeout to ensure DOM is ready for animation
      setTimeout(() => {
        setIsAnimating(true);
      }, 10);
    } else {
      setIsAnimating(false);
    }
  }, [modalIsOpen]);

  const openModal = () => {
    setInternalOpen(true);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const handleCloseClick = () => {
    closeModal();
  };

  const renderTabContent = () => {
    try {
      switch (activeTab) {
        case 'profile':
          return (
            <SettingsTabErrorBoundary tabName="Profile">
              <div className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <ProfilePictureUpload
                    currentImageUrl={profileForm.avatar_url}
                    onImageUpdate={handleProfilePictureUpdate}
                    userInitials={getUserInitials()}
                  />
                  <h3 className="text-lg font-medium text-gray-800">
                    {profileForm.full_name || user?.email || 'User'}
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
                    <Input 
                      id="name" 
                      value={profileForm.full_name} 
                      onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="mt-1" 
                      placeholder="Enter your full name"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={user?.email || ''} 
                      className="mt-1 bg-gray-50" 
                      disabled
                      title="Email cannot be changed here"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio</Label>
                    <Textarea 
                      id="bio" 
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself..." 
                      className="mt-1" 
                      rows={3}
                      maxLength={500}
                    />
                  </div>
                </div>
              </div>
            </SettingsTabErrorBoundary>
          );
      
      case 'preferences':
        return (
          <SettingsTabErrorBoundary tabName="Preferences">
            <Tabs defaultValue="editor" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="mt-6">
                <SettingsTabErrorBoundary tabName="Editor">
                  <EditorPreferences />
                </SettingsTabErrorBoundary>
              </TabsContent>
              <TabsContent value="appearance" className="mt-6">
                <SettingsTabErrorBoundary tabName="Appearance">
                  <AppearanceSettings />
                </SettingsTabErrorBoundary>
              </TabsContent>
            </Tabs>
          </SettingsTabErrorBoundary>
        );
      
        case 'organization':
          return (
            <SettingsTabErrorBoundary tabName="Organization">
              {user ? (
                <SubjectPreferences />
              ) : (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-sm font-medium text-gray-700">
                      Loading organization settings...
                    </p>
                    <p className="text-xs text-gray-500">
                      Please wait while we verify your access.
                    </p>
                  </div>
                </div>
              )}
            </SettingsTabErrorBoundary>
          );
      
      case 'subscription':
        return (
          <SettingsTabErrorBoundary tabName="Subscription">
            <SubscriptionTab />
          </SettingsTabErrorBoundary>
        );
      
      case 'security':
        return (
          <SettingsTabErrorBoundary tabName="Security">
            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="file-security">File Security</TabsTrigger>
              </TabsList>
              <TabsContent value="password" className="mt-6">
                <SettingsTabErrorBoundary tabName="Password">
                  <PasswordChangeSettings />
                </SettingsTabErrorBoundary>
              </TabsContent>
              <TabsContent value="file-security" className="mt-6">
                <SettingsTabErrorBoundary tabName="File Security">
                  <BasicSecuritySettings />
                </SettingsTabErrorBoundary>
              </TabsContent>
            </Tabs>
          </SettingsTabErrorBoundary>
        );
      
      case 'integrations':
        return (
          <SettingsTabErrorBoundary tabName="Integrations">
            <UnifiedCalendarIntegrations />
          </SettingsTabErrorBoundary>
        );
      
      case 'help':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Resources</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="w-4 h-4 mr-2" />
                  User Guide
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  FAQ
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleCommunityForumClick}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Share Feedback
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Account</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Support
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-red-600 hover:text-red-700"
                  onClick={handleSignOut}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
                <div className="text-xs text-gray-500 text-center pt-2">
                  Version 1.0.0 • Last updated: Today
                </div>
              </div>
            </div>
          </div>
        );
      
        default:
          return (
            <div className="flex items-center justify-center p-8">
              <div className="text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-sm font-medium text-gray-700">
                  Settings tab not found
                </p>
              </div>
            </div>
          );
      }
    } catch (error) {
      // Fallback for any rendering errors
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm font-medium text-gray-700">
              Error loading settings
            </p>
            <Button variant="outline" onClick={() => setActiveTab('profile')}>
              Return to Profile
            </Button>
          </div>
        </div>
      );
    }
  };

  if (!modalIsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm transition-all duration-300 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleBackdropClick}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl border border-gray-200 transform transition-all duration-300 ease-out ${
          isAnimating 
            ? 'translate-y-0 opacity-100 scale-100' 
            : 'translate-y-8 opacity-0 scale-95'
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          willChange: 'transform, opacity, scale'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Settings</h2>
          <button
            onClick={handleCloseClick}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close settings modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-48 border-r border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-lg">
              {/* Save Message Alert */}
              {saveMessage && (
                <Alert className={`mb-4 ${saveMessage.type === 'success' ? 'border-green-200 bg-green-50' : ''}`}>
                  {saveMessage.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription className={saveMessage.type === 'success' ? 'text-green-800' : ''}>
                    {saveMessage.message}
                  </AlertDescription>
                </Alert>
              )}
              
              {renderTabContent()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={handleCloseClick}>
            Cancel
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
