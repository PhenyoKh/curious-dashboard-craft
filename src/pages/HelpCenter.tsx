import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, FileText, Calendar, BookOpen, Target, Monitor } from 'lucide-react';

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-30 px-6 py-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all bg-white rounded-lg px-3 py-2 shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all bg-white rounded-lg px-3 py-2 shadow-sm hover:shadow-md"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm">Home</span>
          </button>
        </div>
      </header>

      <div className="relative min-h-screen flex items-start justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 pt-24">
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
          <div className="max-w-4xl mx-auto">
            
            {/* Main Content */}
            <div className="glass rounded-2xl shadow-2xl p-8 md:p-12">
              <div className="space-y-12">
                
                {/* Title */}
                <div className="text-center">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight font-semibold text-black tracking-tight font-heading mb-6">
                    Help Center
                  </h1>
                  <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                    Everything you need to know about using Scola effectively
                  </p>
                </div>

                {/* Welcome Section */}
                <div className="space-y-8">
                  
                  {/* What is Scola */}
                  <section className="space-y-4">
                    <h2 className="text-2xl font-semibold font-heading text-black">What is Scola?</h2>
                    <p className="text-gray-700 leading-relaxed text-lg">
                      Scola is a Notes and Events management app designed to help people organise their notes and manage their schedule.
                    </p>
                  </section>

                  {/* Why does this app exist */}
                  <section className="space-y-4">
                    <h2 className="text-2xl font-semibold font-heading text-black">Why does this app exist?</h2>
                    <p className="text-gray-700 leading-relaxed text-lg">
                      It's simple and easy to use. That's it! We wanted to make organisation as easy as possible so that you focus on what matters most, learning.
                    </p>
                  </section>

                  {/* Who should use Scola */}
                  <section className="space-y-4">
                    <h2 className="text-2xl font-semibold font-heading text-black">Who Should use Scola?</h2>
                    <p className="text-gray-700 leading-relaxed text-lg">
                      If you are someone who wants to have your notes and schedule organised in one environment, Scola is a great solution.
                    </p>
                  </section>

                </div>

                {/* Features Section */}
                <div className="space-y-8">
                  <h2 className="text-3xl font-semibold font-heading text-black text-center">Features</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Notes */}
                    <div className="space-y-4 p-6 bg-white/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-black">Notes</h3>
                      </div>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Write notes that save automatically</li>
                        <li>• Search across all your notes</li>
                        <li>• Group notes by subject</li>
                        <li>• Format text with headers and lists</li>
                      </ul>
                    </div>

                    {/* Schedule */}
                    <div className="space-y-4 p-6 bg-white/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-black">Schedule</h3>
                      </div>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Add events to your calendar</li>
                        <li>• View events in calendar or list format</li>
                        <li>• Connect Google Calendar or Outlook</li>
                        <li>• Access schedule offline</li>
                      </ul>
                    </div>

                    {/* Subjects */}
                    <div className="space-y-4 p-6 bg-white/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-black">Subjects</h3>
                      </div>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Create subjects with custom colors</li>
                        <li>• Filter notes by subject</li>
                        <li>• Sort notes by date or name</li>
                        <li>• See all subjects at once</li>
                      </ul>
                    </div>

                    {/* Assignments */}
                    <div className="space-y-4 p-6 bg-white/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-black">Assignments</h3>
                      </div>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Track due dates</li>
                        <li>• View upcoming deadlines</li>
                        <li>• Mark assignments complete</li>
                        <li>• Set recurring assignments</li>
                      </ul>
                    </div>

                    {/* Organization */}
                    <div className="space-y-4 p-6 bg-white/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                          <Monitor className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-black">Organization</h3>
                      </div>
                      <ul className="space-y-2 text-gray-700">
                        <li>• See recent notes on dashboard</li>
                        <li>• View weekly schedule overview</li>
                        <li>• Check assignment deadlines</li>
                        <li>• Quick access to all features</li>
                      </ul>
                    </div>


                  </div>
                </div>

                {/* Getting Started Section */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-semibold font-heading text-black text-center">Getting Started</h2>
                  
                  <div className="space-y-6">
                    
                    <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                      <h3 className="text-lg font-semibold text-black mb-3">1. Create your first note</h3>
                      <p className="text-gray-700">
                        Click the "+" button on your dashboard to start writing. Your notes save automatically as you type.
                      </p>
                    </div>

                    <div className="p-6 bg-green-50 rounded-xl border border-green-100">
                      <h3 className="text-lg font-semibold text-black mb-3">2. Organize with subjects</h3>
                      <p className="text-gray-700">
                        Create subjects to group related notes. Assign colors to make them easy to identify.
                      </p>
                    </div>

                    <div className="p-6 bg-purple-50 rounded-xl border border-purple-100">
                      <h3 className="text-lg font-semibold text-black mb-3">3. Add your schedule</h3>
                      <p className="text-gray-700">
                        Add events and deadlines to stay on track. Connect your existing calendar for seamless planning.
                      </p>
                    </div>

                    <div className="p-6 bg-orange-50 rounded-xl border border-orange-100">
                      <h3 className="text-lg font-semibold text-black mb-3">4. Track assignments</h3>
                      <p className="text-gray-700">
                        Keep track of homework and exams. Set due dates and mark tasks complete when finished.
                      </p>
                    </div>

                  </div>
                </div>

                {/* Tips Section */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-semibold font-heading text-black text-center">Tips</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-black mb-2">Use search to find anything</h4>
                      <p className="text-gray-700 text-sm">Type keywords in the search box to quickly locate notes across all subjects.</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-black mb-2">Color-code your subjects</h4>
                      <p className="text-gray-700 text-sm">Choose distinct colors for each subject to quickly identify content at a glance.</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-black mb-2">Install as an app</h4>
                      <p className="text-gray-700 text-sm">Add Scola to your homescreen for quick access.</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-black mb-2">Export important notes</h4>
                      <p className="text-gray-700 text-sm">Save notes as PDF files for sharing, printing, or backup purposes.</p>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HelpCenter;