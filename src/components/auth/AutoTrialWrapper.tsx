// src/components/auth/AutoTrialWrapper.tsx
import React from 'react'
import { useAutoTrial } from '@/hooks/useAutoTrial'
import { TrialWelcomeMessage } from './TrialWelcomeMessage'

interface AutoTrialWrapperProps {
  children: React.ReactNode
  /** Whether auto-trial is enabled */
  enabled?: boolean
  /** Show welcome message after trial creation */
  showWelcomeMessage?: boolean
}

/**
 * Wrapper component that handles auto-trial creation and welcome message
 * Place this high in your component tree (e.g., in main layout or auth provider)
 */
export function AutoTrialWrapper({ 
  children, 
  enabled = true, 
  showWelcomeMessage = true 
}: AutoTrialWrapperProps) {
  const { shouldShowWelcome } = useAutoTrial({
    enabled,
    showSuccessMessage: false // We'll show custom welcome message instead
  })

  return (
    <>
      {children}
      {showWelcomeMessage && (
        <TrialWelcomeMessage 
          visible={shouldShowWelcome}
          autoDismiss={12000} // 12 seconds
        />
      )}
    </>
  )
}