/**
 * OnboardingContext.tsx
 * 
 * Manages the user onboarding flow state and provides tour control functionality.
 * Integrates with the user's settings to track onboarding completion.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface OnboardingStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'highlight' | 'navigate';
  nextLabel?: string;
  prevLabel?: string;
  showSkip?: boolean;
  disableNext?: boolean;
}

interface OnboardingContextType {
  // State
  isTourOpen: boolean;
  isOnboardingCompleted: boolean;
  isFirstTime: boolean;
  
  // Tour controls (simplified - no step navigation)
  startTour: () => void;
  stopTour: () => void;
  
  // Settings
  markOnboardingCompleted: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  
  // Tour configuration
  steps: OnboardingStep[];
  totalSteps: number;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Define the 8-step onboarding flow
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    target: '[data-onboarding="dashboard-overview"]',
    title: 'Welcome to Scola! 📚',
    content: 'Your all-in-one study management dashboard. Let\'s get you started with the essential features in just a few quick steps.',
    placement: 'center',
    action: 'highlight',
    nextLabel: 'Let\'s start!',
    showSkip: true
  },
  {
    target: '[data-onboarding="new-note-button"]',
    title: 'Create Your First Note ✍️',
    content: 'Start by creating your first note. Click this button to open the rich text editor where you can capture your thoughts, study materials, and ideas.',
    placement: 'bottom',
    action: 'click',
    nextLabel: 'Got it!',
    showSkip: true
  },
  {
    target: '[data-onboarding="subjects-section"]',
    title: 'Organize with Subjects 📖',
    content: 'Organize your work by creating subjects or courses. This helps you categorize and find your notes easily. Click "Add Subject" to create your first one.',
    placement: 'top',
    action: 'highlight',
    nextLabel: 'Makes sense!',
    showSkip: true
  },
  {
    target: '[data-onboarding="assignments-section"]',
    title: 'Track Assignments 📝',
    content: 'Never miss a deadline! Add your assignments, exams, and projects to stay on top of your academic schedule.',
    placement: 'top',
    action: 'highlight',
    nextLabel: 'Very helpful!',
    showSkip: true
  },
  {
    target: '[data-onboarding="schedule-section"]',
    title: 'Manage Your Schedule 📅',
    content: 'Manage your time effectively by adding events, classes, study sessions, and appointments to your calendar.',
    placement: 'top',
    action: 'highlight',
    nextLabel: 'Perfect!',
    showSkip: true
  },
  {
    target: '[data-onboarding="recent-notes-section"]',
    title: 'Access Recent Work 📋',
    content: 'Your recently created and edited notes appear here for quick access. Click on any note to continue editing.',
    placement: 'top',
    action: 'highlight',
    nextLabel: 'Understood!',
    showSkip: true
  },
  {
    target: '[data-onboarding="settings-button"]',
    title: 'Customize Your Experience ⚙️',
    content: 'Customize your experience here! Update your profile, adjust preferences, manage subjects, and explore advanced features.',
    placement: 'bottom',
    action: 'highlight',
    nextLabel: 'Great!',
    showSkip: true
  },
  {
    target: '[data-onboarding="dashboard-overview"]',
    title: 'You\'re All Set! 🎉',
    content: 'You can always return to this dashboard to see your recent notes, upcoming assignments, and schedule at a glance. Ready to start your study journey?',
    placement: 'center',
    action: 'highlight',
    nextLabel: 'Let\'s go!',
    showSkip: false
  }
];

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { user, settings, updateSettings } = useAuth();
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Initialize onboarding state from user settings
  useEffect(() => {
    if (user && settings) {
      // Handle case where onboarding fields might not exist in database yet
      const completed = settings.onboarding_completed ?? false;
      const hasLoggedInBefore = settings.has_logged_in_before ?? false;
      const firstTime = !hasLoggedInBefore;
      
      console.log('🎯 Onboarding initialization:', {
        userId: user.id,
        completed,
        hasLoggedInBefore, 
        firstTime,
        settingsLoaded: !!settings,
        currentTourState: isTourOpen
      });
      
      setIsOnboardingCompleted(completed);
      setIsFirstTime(firstTime);
      
      // Auto-start tour for first-time users
      if (!completed && firstTime && !isTourOpen) {
        console.log('🚀 Auto-starting onboarding tour for first-time user');
        console.log('⏰ Setting timeout to open tour in 500ms...');
        
        // Small delay to ensure UI is ready (no cleanup to prevent interference)
        setTimeout(() => {
          console.log('⚡ Timeout executing - opening tour now!');
          setIsTourOpen(true);
          console.log('✅ setIsTourOpen(true) called from auto-start');
        }, 500); // Reduced from 1000ms to 500ms for faster response
      }
    } else if (user && !settings) {
      console.log('⏳ User loaded but settings not available yet:', { userId: user.id });
    }
  }, [user, settings]); // Removed isTourOpen to prevent infinite loop

  // Track tour state changes for debugging
  useEffect(() => {
    console.log('🎭 OnboardingContext: Tour state changed:', {
      isTourOpen,
      timestamp: new Date().toLocaleTimeString()
    });
    
    if (isTourOpen) {
      console.log('🎉 TOUR OPENED! State successfully updated to true');
      console.log('🔍 Verifying all conditions for tour display...');
    } else {
      console.log('🚪 Tour is closed/not opened yet');
    }
  }, [isTourOpen]); // Reverted to only depend on isTourOpen to prevent excessive re-renders

  const startTour = useCallback(() => {
    console.log('🎬 OnboardingContext: Starting onboarding tour manually');
    console.log('🔍 Current state before starting:', {
      isTourOpen,
      isOnboardingCompleted,
      isFirstTime,
      hasUser: !!user,
      hasSettings: !!settings
    });
    console.log('⚡ Calling setIsTourOpen(true) from manual trigger');
    setIsTourOpen(true);
    console.log('✅ OnboardingContext: Manual tour start completed');
  }, [isOnboardingCompleted, isFirstTime, user, settings]); // Removed isTourOpen to prevent unnecessary re-creations

  const stopTour = useCallback(() => {
    console.log('🛑 OnboardingContext: Stopping onboarding tour');
    setIsTourOpen(false);
    console.log('✅ OnboardingContext: Tour state set to false');
  }, []);

  const markOnboardingCompleted = useCallback(async () => {
    if (!user || !updateSettings) {
      console.warn('⚠️ Cannot mark onboarding complete: missing user or updateSettings');
      return;
    }

    try {
      console.log('📝 Marking onboarding as completed for user:', user.id);
      
      const updateData: any = {
        onboarding_completed: true,
        has_logged_in_before: true,
        updated_at: new Date().toISOString()
      };
      
      // Only add timestamp if the field exists (migration applied)
      if (settings && 'onboarding_completed_at' in settings) {
        updateData.onboarding_completed_at = new Date().toISOString();
      }
      
      const { error } = await updateSettings(updateData);
      
      if (error) {
        console.error('❌ Database error marking onboarding complete:', error);
        // Continue with local state update even if database fails
      }
      
      setIsOnboardingCompleted(true);
      setIsFirstTime(false);
      
      console.log('✅ Onboarding marked as completed successfully');
    } catch (error) {
      console.error('❌ Unexpected error marking onboarding complete:', error);
      // Update local state anyway to prevent user from being stuck
      setIsOnboardingCompleted(true);
      setIsFirstTime(false);
    }
  }, [user, updateSettings, settings]);

  const resetOnboarding = useCallback(async () => {
    if (!user || !updateSettings) {
      console.warn('⚠️ Cannot reset onboarding: missing user or updateSettings');
      return;
    }

    try {
      console.log('🔄 Resetting onboarding for user:', user.id);
      
      const updateData: any = {
        onboarding_completed: false,
        updated_at: new Date().toISOString()
      };
      
      // Only add timestamp fields if they exist (migration applied)
      if (settings && 'onboarding_completed_at' in settings) {
        updateData.onboarding_completed_at = null;
      }
      
      const { error } = await updateSettings(updateData);
      
      if (error) {
        console.error('❌ Database error resetting onboarding:', error);
        // Continue with local state update even if database fails
      }
      
      setIsOnboardingCompleted(false);
      
      console.log('✅ Onboarding reset successfully - user can take tour again');
    } catch (error) {
      console.error('❌ Unexpected error resetting onboarding:', error);
      // Update local state anyway
      setIsOnboardingCompleted(false);
    }
  }, [user, updateSettings, settings]);

  const contextValue: OnboardingContextType = React.useMemo(() => ({
    // State
    isTourOpen,
    isOnboardingCompleted,
    isFirstTime,
    
    // Tour controls (simplified)
    startTour,
    stopTour,
    
    // Settings
    markOnboardingCompleted,
    resetOnboarding,
    
    // Tour configuration
    steps: ONBOARDING_STEPS,
    totalSteps: ONBOARDING_STEPS.length
  }), [
    isTourOpen,
    isOnboardingCompleted,
    isFirstTime,
    startTour,
    stopTour, 
    markOnboardingCompleted,
    resetOnboarding
  ]);

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export default OnboardingContext;