import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Notebook, ListTree, LayoutList } from 'lucide-react';

const MarketingLanding: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  const handleFeedbackBoard = () => {
    window.open('https://Scola-Notes.userjot.com/', '_blank', 'noopener,noreferrer');
  };

  const handlePricing = () => {
    navigate('/pricing');
  };

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-30 px-6 py-6"></header>

      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Grid Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0 bg-grid-black/[0.2] bg-[length:20px_20px]"></div>
          <svg className="absolute top-0 left-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 0 10 L 40 10 M 10 0 L 10 40" stroke="black" strokeWidth="0.5" fill="none"></path>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"></rect>
          </svg>
        </div>

        <div className="container relative z-10 mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto">
            
            {/* Hero Section */}
            <div className="glass rounded-2xl shadow-2xl p-8 md:p-12 opacity-0 animate-slide-in-landing">
              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                <div className="w-full md:w-1/2 space-y-6">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight font-semibold text-black tracking-tight font-heading">
                    Organise Your Learning
                  </h1>
                  <p className="text-base md:text-lg lg:text-xl text-gray-700 opacity-0 animate-slide-in-delayed">
                    Effortlessly manage notes, events and subjects-all in one place.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 pt-4 opacity-0 animate-slide-in-more-delayed">
                    <button 
                      onClick={handleGetStarted}
                      className="px-8 py-3 bg-black text-white rounded-lg font-medium transition-all hover:bg-gray-800"
                    >
                      Get Started
                    </button>
                    <button 
                      onClick={handleLogin}
                      className="px-8 py-3 border border-black text-black rounded-lg font-medium transition-all hover:bg-black/5"
                    >
                      Login
                    </button>
                  </div>
                </div>
                <div className="w-full md:w-1/2 opacity-0 animate-slide-in-delayed">
                  <div className="aspect-video rounded-xl overflow-hidden shadow-xl">
                    <img 
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1064&q=80" 
                      alt="Abstract glass design" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 opacity-0 animate-slide-in-more-delayed">
              
              {/* Card 1: Effortless Capture */}
              <div className="glass p-6 rounded-xl shadow-xl">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4">
                  <Notebook className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold font-heading mb-2">Effortless Capture</h3>
                <p className="text-sm text-gray-600">
                  Quickly jot down ideas and class notes with simple, distraction-free tools.
                </p>
              </div>

              {/* Card 2: Stay Organised by Subject */}
              <div className="glass p-6 rounded-xl shadow-xl">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4">
                  <ListTree className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold font-heading mb-2">Stay Organised by Subject</h3>
                <p className="text-sm text-gray-600">
                  Group notes and events under customisable subjects for smarter, stress-free organisation.
                </p>
              </div>

              {/* Card 3: Seamless Events Management */}
              <div className="glass p-6 rounded-xl shadow-xl">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4">
                  <LayoutList className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold font-heading mb-2">Seamless Events Management</h3>
                <p className="text-sm text-gray-600">
                  Add, edit, and track events right alongside your notes—never miss an important date.
                </p>
              </div>

            </div>

            {/* Feature Sections */}
            <div className="space-y-6 mt-8 opacity-0 animate-slide-in-more-delayed">
              
              {/* Section 1: Your Notes, Organised */}
              <div className="glass md:p-8 flex flex-col md:flex-row gap-6 bg-neutral-50 rounded-2xl p-6 shadow-2xl items-center">
                <div className="w-full md:w-1/2 space-y-4">
                  <h3 className="text-2xl font-semibold tracking-tight font-heading">Your Notes, Organised</h3>
                  <p className="text-sm text-gray-600">
                    Focus on learning, not finding notes. Scola organises everything by subject—so your content is always clear, accessible, and ready to review.
                  </p>
                </div>
                <div className="w-full md:w-1/2">
                  <div className="aspect-video rounded-xl overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1621619856624-42fd193a0661?w=1600&q=80" 
                      alt="Workflow" 
                      className="w-full h-full object-cover bg-neutral-50"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Your Assignments, Under Control */}
              <div className="glass md:p-8 flex flex-col md:flex-row gap-6 bg-neutral-50 rounded-2xl p-6 shadow-2xl items-center">
                <div className="w-full md:w-1/2 space-y-4">
                  <h3 className="text-2xl font-semibold tracking-tight font-heading">Your Assignments, Under Control</h3>
                  <p className="text-sm text-gray-600">
                    Stay ahead without the stress. Scola tracks every due date and helps you prioritise, so you're always clear, focused, and ready.
                  </p>
                </div>
                <div className="w-full md:w-1/2">
                  <div className="aspect-video rounded-xl overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=1080&q=80" 
                      alt="Collaboration" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Your Study, Your Way */}
              <div className="glass md:p-8 flex flex-col md:flex-row gap-6 bg-neutral-50 rounded-2xl p-6 shadow-2xl items-center">
                <div className="w-full md:w-1/2 space-y-4">
                  <h3 className="text-2xl font-semibold tracking-tight font-heading">Your Study, Your Way</h3>
                  <p className="text-sm text-gray-600">
                    Whether you're a planner, a crammer, or somewhere in between—Scola adapts to your style, helping you stay focused, flexible, and in control.
                  </p>
                </div>
                <div className="w-full md:w-1/2">
                  <div className="aspect-video rounded-xl overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80" 
                      alt="Analytics" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="glass border-t border-black/10">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Primary Column */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Primary</h4>
              <ul className="space-y-2">
                <li><a href="/" className="text-sm text-gray-600 hover:text-gray-900 transition">Home</a></li>
                <li><button onClick={handleFeedbackBoard} className="text-sm text-gray-600 hover:text-gray-900 transition text-left">Feedback Board</button></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition">Help Center</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition">Support</a></li>
              </ul>
            </div>

            {/* Other Column */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Other</h4>
              <ul className="space-y-2">
                <li><button onClick={handlePricing} className="text-sm text-gray-600 hover:text-gray-900 transition text-left">Pricing</button></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition">Contact</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition">Terms of Service</a></li>
              </ul>
            </div>

            {/* Copyright Column */}
            <div className="flex md:justify-end items-start">
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} The Algorithm House (Pty) Ltd. All Rights Reserved
              </p>
            </div>

          </div>
        </div>
      </footer>
    </>
  );
};

export default MarketingLanding;