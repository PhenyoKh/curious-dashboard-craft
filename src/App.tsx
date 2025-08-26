
import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import PageTransition from "./components/PageTransition";
import ScrollToTop from "./components/ScrollToTop";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";
import SettingsModal from "./components/SettingsModal";
import { AuthProvider } from "./contexts/AuthContext";
import { PWAProvider } from "./contexts/PWAContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { PaymentIntentProvider } from "./contexts/PaymentIntentContext";
import { useSettings } from "./hooks/useSettings";
import { OnboardingTour } from "./components/onboarding/OnboardingTour";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useEditorPreferences } from "./hooks/useEditorPreferences";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PWAUpdateNotification from "./components/PWAUpdateNotification";
import OfflineIndicator from "./components/OfflineIndicator";
import { AutoTrialWrapper } from "./components/auth/AutoTrialWrapper";

// Critical pages - load immediately
import AuthScreen from "./pages/AuthScreen";
import RootRoute from "./components/RootRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Heavy pages - lazy load for code splitting
const Note = lazy(() => import('./pages/Note'));
const Subjects = lazy(() => import('./pages/Subjects'));
const Schedule = lazy(() => import('./pages/Schedule'));  
const Assignments = lazy(() => import('./pages/Assignments'));
const Pricing = lazy(() => import('./pages/Pricing'));

// Auth and callback pages - lazy load
const PasswordReset = lazy(() => import('./pages/PasswordReset'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const GoogleCallback = lazy(() => import('./pages/auth/GoogleCallback'));
const MicrosoftCallback = lazy(() => import('./pages/auth/MicrosoftCallback'));
const PaymentCallback = lazy(() => import('./pages/PaymentCallback'));

// Static pages - lazy load
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Contact = lazy(() => import('./pages/Contact'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));

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
        <SubscriptionProvider>
          <AutoTrialWrapper enabled={true} showWelcomeMessage={true}>
            <OnboardingProvider>
              <EditorPreferencesLoader />
              <OnboardingTour>
                <Toaster />
                <Sonner />
                <KeyboardShortcutsModal />
                <PWAInstallPrompt />
                <PWAUpdateNotification />
                <OfflineIndicator />
                <BrowserRouter>
                  <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
                  <PaymentIntentProvider>
                <ScrollToTop />
                <Routes>
                <Route path="/auth" element={<PageTransition><AuthScreen /></PageTransition>} />
                <Route path="/auth/callback" element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <AuthCallback />
                    </Suspense>
                  </PageTransition>
                } />
                <Route path="/auth/google/callback" element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <GoogleCallback />
                    </Suspense>
                  </PageTransition>
                } />
                <Route path="/auth/microsoft/callback" element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <MicrosoftCallback />
                    </Suspense>
                  </PageTransition>
                } />
                <Route path="/reset-password" element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <PasswordReset />
                    </Suspense>
                  </PageTransition>
                } />
                <Route path="/pricing" element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <Pricing />
                    </Suspense>
                  </PageTransition>
                } />
                <Route path="/payment/success" element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <PaymentCallback />
                    </Suspense>
                  </PageTransition>
                } />
                <Route path="/payment/failure" element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <PaymentCallback />
                    </Suspense>
                  </PageTransition>
                } />
                <Route path="/payment/callback" element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <PaymentCallback />
                    </Suspense>
                  </PageTransition>
                } />
                <Route path="/privacy-policy" element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <PrivacyPolicy />
                    </Suspense>
                  </PageTransition>
                } />
                <Route path="/terms-of-service" element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <TermsOfService />
                    </Suspense>
                  </PageTransition>
                } />
                <Route path="/contact" element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <Contact />
                    </Suspense>
                  </PageTransition>
                } />
                <Route path="/help" element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <HelpCenter />
                    </Suspense>
                  </PageTransition>
                } />
                <Route path="/" element={<PageTransition><RootRoute /></PageTransition>} />
                <Route path="/note" element={
                  <ProtectedRoute requireEmailVerification={true}>
                    <PageTransition>
                      <Suspense fallback={<div>Loading...</div>}>
                        <Note />
                      </Suspense>
                    </PageTransition>
                  </ProtectedRoute>
                } />
                <Route path="/note/:id" element={
                  <ProtectedRoute requireEmailVerification={true}>
                    <PageTransition>
                      <Suspense fallback={<div>Loading...</div>}>
                        <Note />
                      </Suspense>
                    </PageTransition>
                  </ProtectedRoute>
                } />
                <Route path="/subjects" element={
                  <ProtectedRoute requireEmailVerification={true}>
                    <PageTransition>
                      <Suspense fallback={<div>Loading...</div>}>
                        <Subjects />
                      </Suspense>
                    </PageTransition>
                  </ProtectedRoute>
                } />
                <Route path="/schedule" element={
                  <ProtectedRoute requireEmailVerification={true}>
                    <PageTransition>
                      <Suspense fallback={<div>Loading...</div>}>
                        <Schedule />
                      </Suspense>
                    </PageTransition>
                  </ProtectedRoute>
                } />
                <Route path="/assignments" element={
                  <ProtectedRoute requireEmailVerification={true}>
                    <PageTransition>
                      <Suspense fallback={<div>Loading...</div>}>
                        <Assignments />
                      </Suspense>
                    </PageTransition>
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={
                  <ProtectedRoute>
                    <PageTransition><NotFound /></PageTransition>
                  </ProtectedRoute>
                } />
              </Routes>
                  </PaymentIntentProvider>
            </BrowserRouter>
          </OnboardingTour>
        </OnboardingProvider>
        </AutoTrialWrapper>
        </SubscriptionProvider>
      </AuthProvider>
    </PWAProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <SettingsProvider>
            <AppContent />
          </SettingsProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
