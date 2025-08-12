// src/components/auth/SignupSuccessHandler.tsx
import React, { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAutoTrial } from '@/hooks/useAutoTrial'
import { Loader2 } from 'lucide-react'

interface SignupSuccessHandlerProps {
  /** Whether to show loading state during trial creation */
  showLoading?: boolean
  /** Custom loading message */
  loadingMessage?: string
}

/**
 * Component to handle post-signup trial creation
 * Use this on signup success page or in signup flow
 */
export function SignupSuccessHandler({ 
  showLoading = true,
  loadingMessage = "Setting up your free trial..."
}: SignupSuccessHandlerProps) {
  const { user } = useAuth()
  const { isProcessing, success, error, canRetry, retryAutoTrial } = useAutoTrial({
    enabled: true,
    showSuccessMessage: true,
    onSuccess: (subscription) => {
      console.log('Trial created successfully:', subscription)
    },
    onError: (error) => {
      console.error('Trial creation failed:', error)
      // Could show manual trial option here
    }
  })

  if (!user) return null

  return (
    <div className="space-y-4">
      {/* Loading State */}
      {isProcessing && showLoading && (
        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
          <span className="text-blue-800 text-sm">{loadingMessage}</span>
        </div>
      )}

      {/* Error State with Retry */}
      {error && canRetry && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm mb-2">
            We couldn't set up your free trial automatically, but your account is ready!
          </p>
          <button
            onClick={retryAutoTrial}
            className="text-yellow-700 underline text-sm hover:text-yellow-900"
          >
            Try again
          </button>
          <span className="text-yellow-600 text-xs ml-2">
            or start your trial manually from the pricing page
          </span>
        </div>
      )}

      {/* Success State */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">
            Your free trial is ready! You now have full access to all features.
          </p>
        </div>
      )}
    </div>
  )
}