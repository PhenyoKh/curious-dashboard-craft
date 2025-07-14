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
  Database,
  ExternalLink,
  Mail,
  MessageSquare,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
  const [internalOpen, setInternalOpen] = useState(false);
  const modalIsOpen = isOpen || internalOpen;
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const tabs: SettingsTab[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <Settings className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy & Data', icon: <Shield className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-4 h-4" /> },
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
                  JS
                </div>
                <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-gray-200 transition-colors">
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <h3 className="text-lg font-medium text-gray-800">John Smith</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
                <Input id="name" defaultValue="John Smith" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                <Input id="email" type="email" defaultValue="john.smith@example.com" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio</Label>
                <Textarea id="bio" placeholder="Tell us about yourself..." className="mt-1" rows={3} />
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
                  <Select defaultValue="system">
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
                  <Select defaultValue="en">
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
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Show line numbers</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Enable spell check</span>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Email Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Assignment reminders</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Schedule updates</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Weekly summary</span>
                  <Switch />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Push Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Study reminders</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Break reminders</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Achievement notifications</span>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Privacy Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Lock className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Make profile private</span>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Database className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Analytics tracking</span>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Data Management</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Export my data
                </Button>
                <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                  <Database className="w-4 h-4 mr-2" />
                  Delete my account
                </Button>
              </div>
            </div>
          </div>
        );
      
      case 'calendar':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Calendar Integration</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Sync with Google Calendar</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Sync with Outlook</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Show weekends</span>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Default Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Default view</span>
                  <Select defaultValue="week">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Week starts on</span>
                  <Select defaultValue="monday">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
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
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Community Forum
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Contact Support</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Support
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
              {renderTabContent()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={handleCloseClick}>
            Cancel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;