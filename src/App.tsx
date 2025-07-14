
import React, { createContext, useContext, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PageTransition from "./components/PageTransition";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";
import SettingsModal from "./components/SettingsModal";
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
        <SettingsContext.Provider value={{ isSettingsOpen, openSettings, closeSettings }}>
          <Toaster />
          <Sonner />
          <KeyboardShortcutsModal />
          <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<PageTransition><Index /></PageTransition>} />
              <Route path="/note" element={<PageTransition><Note /></PageTransition>} />
              <Route path="/subjects" element={<PageTransition><Subjects /></PageTransition>} />
              <Route path="/schedule" element={<PageTransition><Schedule /></PageTransition>} />
              <Route path="/assignments" element={<PageTransition><Assignments /></PageTransition>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
            </Routes>
          </BrowserRouter>
        </SettingsContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
