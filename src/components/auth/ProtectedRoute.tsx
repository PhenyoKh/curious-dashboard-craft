
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import EmailVerificationPrompt from './EmailVerificationPrompt';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  allowGuest?: boolean;
  requireEmailVerification?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback,
  allowGuest = false,
  requireEmailVerification = true
}) => {
  const { user, loading, isEmailVerified } = useAuth();
  const navigate = useNavigate();
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);

  useEffect(() => {
    // Only redirect if we're not loading and there's no user
    if (!loading && !user && !allowGuest) {
      navigate('/landing', { replace: true });
    } else if (!loading && !user && allowGuest) {
      setShowGuestPrompt(true);
    } else if (!loading && user && requireEmailVerification && !isEmailVerified) {
      setShowVerificationPrompt(true);
    } else {
      setShowGuestPrompt(false);
      setShowVerificationPrompt(false);
    }
  }, [user, loading, navigate, allowGuest, requireEmailVerification, isEmailVerified]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // If user is authenticated and email verification is required but not verified, show verification prompt
  if (user && requireEmailVerification && !isEmailVerified && showVerificationPrompt) {
    return (
      <EmailVerificationPrompt 
        onDismiss={() => setShowVerificationPrompt(false)} 
      />
    );
  }

  // If user is authenticated, render children
  if (user) {
    return <>{children}</>;
  }

  // If guest access is allowed and user is not authenticated, show guest prompt
  if (allowGuest && showGuestPrompt) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Scola!</h2>
          <p className="text-gray-600 mb-6">
            You're browsing as a guest. Sign in to access all features like saving notes, creating subjects, and more.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/auth')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Sign In / Sign Up
            </button>
            <button
              onClick={() => setShowGuestPrompt(false)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If guest access is allowed and prompt is dismissed, render children
  if (allowGuest && !showGuestPrompt) {
    return <>{children}</>;
  }

  // If not authenticated and not loading, return null (redirect will happen via useEffect)
  return null;
};

export default ProtectedRoute;
