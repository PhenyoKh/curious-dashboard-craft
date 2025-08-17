import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handlePrivacyPolicyClick = () => {
    navigate('/privacy-policy');
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
              <div className="space-y-8">
                
                {/* Title */}
                <div className="text-center">
                  <h1 className="text-4xl md:text-5xl leading-tight font-semibold text-black tracking-tight font-heading mb-2">
                    Terms of Service
                  </h1>
                  <p className="text-sm text-gray-500 mt-2">
                    Last updated: 6 August 2025
                  </p>
                </div>

                {/* Content */}
                <div className="prose prose-gray max-w-none space-y-6">
                  
                  {/* 1. Introduction */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">1. Introduction</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Welcome to Scola notes application ("the App", "we", "us", "our"), provided by The Algorithm House (Pty) Ltd, headquartered in South Africa. By accessing or using Scola notes application app, you ("User") agree to these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use the App.
                    </p>
                  </section>

                  {/* 2. Eligibility */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">2. Eligibility</h2>
                    <p className="text-gray-700 leading-relaxed">
                      You must be at least 18 years old or have legal guardian consent to use Scola notes application. By creating an account, you confirm that you meet these requirements, as outlined in our{' '}
                      <button 
                        onClick={handlePrivacyPolicyClick}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Privacy Policy
                      </button>.
                    </p>
                  </section>

                  {/* 3. User Accounts */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">3. User Accounts</h2>
                    <p className="text-gray-700 leading-relaxed">
                      To access features, you must register an account using a valid email address. You are responsible for maintaining the confidentiality of your login credentials and all activities under your account. Please notify us immediately of unauthorized use or security breaches.
                    </p>
                  </section>

                  {/* 4. Acceptable Use */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">4. Acceptable Use</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      You agree to use Scola notes application only for lawful, academic purposes and not to:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>
                        Violate any laws or regulations (including POPIA and other South African laws);{' '}
                        <button 
                          onClick={handlePrivacyPolicyClick}
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          Privacy Policy
                        </button>
                      </li>
                      <li>Upload harmful, unlawful, or offensive content;</li>
                      <li>Attempt unauthorized access, disrupt our services, or misuse our platform;</li>
                      <li>Infringe upon intellectual property rights.</li>
                    </ul>
                  </section>

                  {/* 5. Payment & Subscriptions */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">5. Payment & Subscriptions</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Payments for premium features and subscriptions are processed securely via PayFast. Payment and billing information are handled directly by PayFast and used only for payment processing. By making a payment, you agree to PayFast's terms and any applicable South African laws.{' '}
                      <button 
                        onClick={handlePrivacyPolicyClick}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Privacy Policy
                      </button>
                    </p>
                  </section>

                  {/* 6. Data & Privacy */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">6. Data & Privacy</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      The information you provide is collected, stored, and processed per our{' '}
                      <button 
                        onClick={handlePrivacyPolicyClick}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Privacy Policy
                      </button>{' '}
                      and the South African Protection of Personal Information Act ("POPIA"). Your data may include:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Account and contact details;</li>
                      <li>Notes, schedules, and academic content;</li>
                      <li>Usage analytics.</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mt-4">
                      We never sell your personal information and limit sharing to trusted providers (e.g., Supabase hosting, PayFast for payments, as described in our{' '}
                      <button 
                        onClick={handlePrivacyPolicyClick}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Privacy Policy
                      </button>).
                    </p>
                  </section>

                  {/* 7. Intellectual Property */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">7. Intellectual Property</h2>
                    <p className="text-gray-700 leading-relaxed">
                      All rights in Scola notes application, except for your own notes and content, are owned by The Algorithm House (Pty) Ltd and its licensors. You may not copy, reverse-engineer, or distribute any part of the App unless expressly permitted.
                    </p>
                  </section>

                  {/* 8. Third-Party Services & Integrations */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">8. Third-Party Services & Integrations</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Calendar Integrations:</h3>
                        <p className="text-gray-700 leading-relaxed mb-2">
                          You may optionally connect your Google Calendar and/or Microsoft Calendar to Scola. When connected:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                          <li>We will access your calendar data as authorized by you</li>
                          <li>We may create, modify, or delete events in your connected calendars</li>
                          <li>Changes made in Scola may appear in your external calendars and vice versa</li>
                          <li>You can disconnect these integrations at any time</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Third-Party Terms:</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          <li>Use of Google Calendar integration is subject to Google's Terms of Service and Privacy Policy</li>
                          <li>Use of Microsoft Calendar integration is subject to Microsoft's Terms of Service and Privacy Policy</li>
                          <li>We are not responsible for third-party service outages, data issues, or policy changes</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Data Responsibility:</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          <li>You are responsible for the accuracy of calendar data you choose to sync</li>
                          <li>We recommend backing up important calendar data before connecting integrations</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* 9. Service Availability */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">9. Service Availability</h2>
                    <p className="text-gray-700 leading-relaxed">
                      We strive to keep Scola notes application available and error-free but do not guarantee uninterrupted service. Features may change, and we may suspend or terminate accounts that violate these Terms.
                    </p>
                  </section>

                  {/* 10. Security */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">10. Security</h2>
                    <p className="text-gray-700 leading-relaxed">
                      We employ enterprise-grade security, including data encryption at rest, secure API endpoints, and regular audits. However, no system is perfectly secure. Notify us promptly of suspected security issues.{' '}
                      <button 
                        onClick={handlePrivacyPolicyClick}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Privacy Policy
                      </button>
                    </p>
                  </section>

                  {/* 11. User Rights */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">11. User Rights</h2>
                    <p className="text-gray-700 leading-relaxed">
                      You hold rights under POPIA, including access, correction, and deletion of your personal information, as detailed in our{' '}
                      <button 
                        onClick={handlePrivacyPolicyClick}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Privacy Policy
                      </button>. Contact us to exercise these rights.
                    </p>
                  </section>

                  {/* 12. Termination */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">12. Termination</h2>
                    <p className="text-gray-700 leading-relaxed">
                      We may suspend or terminate your account for violations of these Terms or as required by law. You may terminate your account at any time.
                    </p>
                  </section>

                  {/* 13. Limitation of Liability */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">13. Limitation of Liability</h2>
                    <p className="text-gray-700 leading-relaxed">
                      To the extent allowed by law, The Algorithm House (Pty) Ltd is not liable for any indirect, incidental, or consequential damages arising from your use of the App.
                    </p>
                  </section>

                  {/* 14. Changes to Terms */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">14. Changes to Terms</h2>
                    <p className="text-gray-700 leading-relaxed">
                      We may update these Terms periodically. Material changes will be communicated via the App and/or email. Continued use after updates constitutes acceptance.
                    </p>
                  </section>

                  {/* 15. Jurisdiction */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">15. Jurisdiction</h2>
                    <p className="text-gray-700 leading-relaxed">
                      These Terms are governed by the laws of South Africa. Disputes will be resolved in South African courts.
                    </p>
                  </section>

                  {/* 16. Contact */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">16. Contact</h2>
                    <p className="text-gray-700 leading-relaxed">
                      For questions or concerns, please contact:<br />
                      <strong>Email:</strong> support@scola.co.za
                    </p>
                  </section>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsOfService;