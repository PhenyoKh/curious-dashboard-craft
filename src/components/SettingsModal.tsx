import React, { useEffect, useState } from 'react';
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
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import SecuritySettings from '@/components/security/SecuritySettings';
import type { Database } from '@/integrations/supabase/types';

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

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen = false, onClose }) => {
  const { user, profile, settings, updateProfile, updateSettings, signOut } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const modalIsOpen = isOpen || internalOpen;
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Local form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    bio: '',
    avatar_url: ''
  });
  
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
      const parseJsonbField = (field: any, defaultValue: any) => {
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

  // Handle save changes
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Update profile first
      if (profileForm.full_name !== (profile?.full_name || '') || 
          profileForm.bio !== (profile?.bio || '')) {
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
      console.error('Error saving settings:', error);
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
      console.error('Error signing out:', error);
      setSaveMessage({ type: 'error', message: 'Failed to sign out' });
    }
  };

  const tabs: SettingsTab[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <Settings className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'help', label: 'Help & Support', icon: <HelpCircle className="w-4 h-4" /> },
  ];

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
  }, [modalIsOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (modalIsOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalIsOpen]);

  const openModal = () => {
    setInternalOpen(true);
    setTimeout(() => {
      setIsAnimating(true);
    }, 10);
  };

  const closeModal = () => {
    setIsAnimating(false);
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        setInternalOpen(false);
      }
    }, 300);
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
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-xl">
                  {getUserInitials()}
                </div>
                <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-gray-200 transition-colors">
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>
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
                />
              </div>
            </div>
          </div>
        );
      
      case 'preferences':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Appearance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Sun className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Theme</span>
                  </div>
                  <Select 
                    value={settingsForm.theme} 
                    onValueChange={(value: 'light' | 'dark' | 'system') => 
                      setSettingsForm(prev => ({ ...prev, theme: value }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Globe className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Language</span>
                  </div>
                  <Select 
                    value={settingsForm.language} 
                    onValueChange={(value: string) => 
                      setSettingsForm(prev => ({ ...prev, language: value }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Editor</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Auto-save notes</span>
                  <Switch 
                    checked={settingsForm.auto_save_notes}
                    onCheckedChange={(checked) => 
                      setSettingsForm(prev => ({ ...prev, auto_save_notes: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Show line numbers</span>
                  <Switch 
                    checked={settingsForm.show_line_numbers}
                    onCheckedChange={(checked) => 
                      setSettingsForm(prev => ({ ...prev, show_line_numbers: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Enable spell check</span>
                  <Switch 
                    checked={settingsForm.enable_spell_check}
                    onCheckedChange={(checked) => 
                      setSettingsForm(prev => ({ ...prev, enable_spell_check: checked }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'security':
        return <SecuritySettings />;
      
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
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Community Forum
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
        return null;
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
