import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback,
  redirectTo 
}) => {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // If not loading and no user, show auth modal
    if (!loading && !user) {
      setShowAuthModal(true);
    } else if (user) {
      setShowAuthModal(false);
    }
  }, [user, loading]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // If user is authenticated, render children
  if (user) {
    return <>{children}</>;
  }

  // If not authenticated, show auth modal with backdrop
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      {/* Background content or placeholder */}
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">StudyFlow</h1>
        <p className="text-gray-600 mb-8">
          Your personal note-taking and study management platform
        </p>
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Features</h2>
          <ul className="text-left space-y-2 text-gray-600">
            <li>• Rich text note-taking with highlighting</li>
            <li>• Subject and assignment management</li>
            <li>• Calendar integration</li>
            <li>• Full-text search across all notes</li>
            <li>• Secure cloud synchronization</li>
          </ul>
        </div>
        <button
          onClick={() => setShowAuthModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Get Started
        </button>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          // Don't allow closing the modal when protecting a route
          // The user must authenticate to continue
        }}
        defaultTab="signin"
      />
    </div>
  );
};

export default ProtectedRoute;