
import React, { createContext, useContext, useState } from 'react';
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
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PWAUpdateNotification from "./components/PWAUpdateNotification";
import OfflineIndicator from "./components/OfflineIndicator";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Note from "./pages/Note";
import Subjects from "./pages/Subjects";
import Schedule from "./pages/Schedule";
import Assignments from "./pages/Assignments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

interface SettingsContextType {
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

const App = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PWAProvider>
          <AuthProvider>
            <SettingsContext.Provider value={{ isSettingsOpen, openSettings, closeSettings }}>
              <Toaster />
              <Sonner />
              <KeyboardShortcutsModal />
              <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
              <PWAInstallPrompt />
              <PWAUpdateNotification />
              <OfflineIndicator />
              <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<PageTransition><Landing /></PageTransition>} />
                <Route path="/landing" element={<PageTransition><Landing /></PageTransition>} />
                <Route path="/" element={
                  <ProtectedRoute allowGuest={true}>
                    <PageTransition><Index /></PageTransition>
                  </ProtectedRoute>
                } />
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
            </SettingsContext.Provider>
          </AuthProvider>
        </PWAProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
