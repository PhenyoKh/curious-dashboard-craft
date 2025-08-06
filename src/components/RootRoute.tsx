import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { shouldShowMarketingPage } from '@/utils/pwaUtils';
import MarketingLanding from '@/pages/MarketingLanding';
import ProtectedRoute from './auth/ProtectedRoute';
import Index from '@/pages/Index';

const RootRoute: React.FC = () => {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show the main app
  if (user) {
    return (
      <ProtectedRoute allowGuest={true}>
        <Index />
      </ProtectedRoute>
    );
  }

  // If user is not authenticated, decide based on PWA vs Browser
  const showMarketing = shouldShowMarketingPage();
  
  if (showMarketing) {
    // Browser users: Show marketing landing page
    return <MarketingLanding />;
  } else {
    // PWA users: Redirect to auth screen
    return <Navigate to="/auth" replace />;
  }
};

export default RootRoute;