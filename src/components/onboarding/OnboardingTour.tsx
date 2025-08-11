/**
 * OnboardingTour.tsx
 * 
 * Interactive onboarding tour component using Reactour.
 * Provides step-by-step guidance for new users to learn essential features.
 */

import React, { useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS } from 'react-joyride';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';

// react-joyride handles all the UI and navigation automatically


// Main OnboardingTour component
interface OnboardingTourProps {
  children: React.ReactNode;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ children }) => {
  const { isTourOpen, steps, stopTour, markOnboardingCompleted } = useOnboarding();

  // Convert onboarding steps to joyride format
  const joyrideSteps = React.useMemo(() => {
    return steps.map((step, index) => ({
      target: step.target,
      content: (
        <div className="text-sm">
          <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
          <p className="text-gray-600 leading-relaxed">{step.content}</p>
        </div>
      ),
      placement: step.placement === 'center' ? 'center' : (step.placement || 'bottom'),
      disableBeacon: true, // Disable the pulsing beacon for cleaner look
    }));
  }, [steps]);

  // Handle joyride callback events
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type } = data;
    
    console.log('🎮 Joyride callback:', { status, type });

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      console.log('🎉 Tour completed or skipped');
      markOnboardingCompleted();
      stopTour();
    } else if (type === EVENTS.STEP_AFTER) {
      console.log('🔄 Step completed:', data.index);
    }
  }, [stopTour, markOnboardingCompleted]);


  return (
    <>
      <Joyride
        steps={joyrideSteps}
        run={isTourOpen}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#2563eb', // Blue-600 to match app theme
            zIndex: 10000,
          },
          tooltip: {
            fontSize: '14px',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          buttonNext: {
            backgroundColor: '#2563eb',
            color: 'white',
            fontSize: '14px',
            padding: '8px 16px',
            borderRadius: '6px',
          },
          buttonBack: {
            color: '#6b7280',
            fontSize: '14px',
            padding: '8px 16px',
          },
          buttonSkip: {
            color: '#6b7280',
            fontSize: '14px',
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip tour',
        }}
      />
      {children}
    </>
  );
};

// Onboarding trigger button component
export const OnboardingTrigger: React.FC<{
  variant?: 'button' | 'link';
  className?: string;
  children?: React.ReactNode;
}> = ({ 
  variant = 'button', 
  className = '',
  children = 'Take Tour'
}) => {
  const { startTour, isOnboardingCompleted } = useOnboarding();

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎯 OnboardingTrigger clicked - starting with react-joyride!', {
      isOnboardingCompleted,
      hasStartTour: typeof startTour === 'function'
    });
    
    if (typeof startTour === 'function') {
      startTour();
    } else {
      console.error('❌ startTour function not available');
    }
  }, [startTour, isOnboardingCompleted]);

  if (variant === 'link') {
    return (
      <button
        onClick={handleClick}
        className={`text-blue-600 hover:text-blue-700 text-sm underline ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      className={className}
    >
      {isOnboardingCompleted ? 'Retake Tour' : children}
    </Button>
  );
};

export default OnboardingTour;