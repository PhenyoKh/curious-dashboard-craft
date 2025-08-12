
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PageTransition from "./components/PageTransition";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";
import SettingsModal from "./components/SettingsModal";
import { AuthProvider } from "./contexts/AuthContext";
import { PWAProvider } from "./contexts/PWAContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { useSettings } from "./hooks/useSettings";
import { OnboardingTour } from "./components/onboarding/OnboardingTour";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useEditorPreferences } from "./hooks/useEditorPreferences";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PWAUpdateNotification from "./components/PWAUpdateNotification";
import OfflineIndicator from "./components/OfflineIndicator";
import { AutoTrialWrapper } from "./components/auth/AutoTrialWrapper";
import AuthScreen from "./pages/AuthScreen";
import RootRoute from "./components/RootRoute";
import PasswordReset from "./pages/PasswordReset";
import Pricing from "./pages/Pricing";
import Index from "./pages/Index";
import Note from "./pages/Note";
import Subjects from "./pages/Subjects";
import Schedule from "./pages/Schedule";
import Assignments from "./pages/Assignments";
import AuthCallback from "./pages/AuthCallback";
import PaymentCallback from "./pages/PaymentCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";
import HelpCenter from "./pages/HelpCenter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to load editor preferences globally
const EditorPreferencesLoader = () => {
  useEditorPreferences();
  return null;
};

const AppContent = () => {
  const { isSettingsOpen, closeSettings } = useSettings();

  return (
    <PWAProvider>
      <AuthProvider>
        <AutoTrialWrapper enabled={true} showWelcomeMessage={true}>
          <OnboardingProvider>
            <EditorPreferencesLoader />
            <OnboardingTour>
              <Toaster />
              <Sonner />
              <KeyboardShortcutsModal />
              <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
              <PWAInstallPrompt />
              <PWAUpdateNotification />
              <OfflineIndicator />
              <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<PageTransition><AuthScreen /></PageTransition>} />
                <Route path="/auth/callback" element={<PageTransition><AuthCallback /></PageTransition>} />
                <Route path="/reset-password" element={<PageTransition><PasswordReset /></PageTransition>} />
                <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
                <Route path="/payment/success" element={<PageTransition><PaymentCallback /></PageTransition>} />
                <Route path="/payment/failure" element={<PageTransition><PaymentCallback /></PageTransition>} />
                <Route path="/payment/callback" element={<PageTransition><PaymentCallback /></PageTransition>} />
                <Route path="/privacy-policy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
                <Route path="/terms-of-service" element={<PageTransition><TermsOfService /></PageTransition>} />
                <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
                <Route path="/help" element={<PageTransition><HelpCenter /></PageTransition>} />
                <Route path="/" element={<PageTransition><RootRoute /></PageTransition>} />
                <Route path="/note" element={
                  <ProtectedRoute requireEmailVerification={true}>
                    <PageTransition><Note /></PageTransition>
                  </ProtectedRoute>
                } />
                <Route path="/note/:id" element={
                  <ProtectedRoute requireEmailVerification={true}>
                    <PageTransition><Note /></PageTransition>
                  </ProtectedRoute>
                } />
                <Route path="/subjects" element={
                  <ProtectedRoute requireEmailVerification={true}>
                    <PageTransition><Subjects /></PageTransition>
                  </ProtectedRoute>
                } />
                <Route path="/schedule" element={
                  <ProtectedRoute requireEmailVerification={true}>
                    <PageTransition><Schedule /></PageTransition>
                  </ProtectedRoute>
                } />
                <Route path="/assignments" element={
                  <ProtectedRoute requireEmailVerification={true}>
                    <PageTransition><Assignments /></PageTransition>
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={
                  <ProtectedRoute>
                    <PageTransition><NotFound /></PageTransition>
                  </ProtectedRoute>
                } />
              </Routes>
            </BrowserRouter>
          </OnboardingTour>
        </OnboardingProvider>
        </AutoTrialWrapper>
      </AuthProvider>
    </PWAProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
