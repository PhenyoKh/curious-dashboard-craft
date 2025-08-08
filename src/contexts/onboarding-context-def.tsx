import { createContext } from 'react';

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

export interface OnboardingContextType {
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

export const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);