import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
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
              <div className="space-y-8">
                
                {/* Title */}
                <div className="text-center">
                  <h1 className="text-4xl md:text-5xl leading-tight font-semibold text-black tracking-tight font-heading mb-2">
                    Privacy Policy
                  </h1>
                  <p className="text-gray-600">
                    Company: The Algorithm House (Pty) Ltd<br />
                    Product Name: Scola Note-Taking & Scheduling Application
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Last updated: 29/07/2025
                  </p>
                </div>

                {/* Content */}
                <div className="prose prose-gray max-w-none space-y-6">
                  
                  {/* 1. Introduction */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">1. INTRODUCTION</h2>
                    <p className="text-gray-700 leading-relaxed">
                      This Privacy Notice explains how The Algorithm House (Pty) Ltd ("we," "us," or "our") collects, uses, and protects your personal information in accordance with the South African Protection of Personal Information Act ("POPIA").
                    </p>
                    <p className="text-gray-700 leading-relaxed mt-4">
                      We are committed to protecting your privacy and ensuring your personal information is processed lawfully, reasonably, and transparently.
                    </p>
                  </section>

                  {/* 2. Information Officer Details */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">2. INFORMATION OFFICER DETAILS</h2>
                    <div className="text-gray-700 leading-relaxed space-y-2">
                      <p><strong>Information Officer:</strong> Phenyo Khunou (Managing Director)</p>
                      <p><strong>Deputy Information Officer:</strong> [To be appointed - interim contact: support@scola.co.za]</p>
                      <p><strong>Company Address:</strong> 7 on Middle, 7 Middle Rd, Morningside, Sandton, Gauteng, 2057.</p>
                      <p><strong>Email:</strong> support@scola.co.za</p>
                    </div>
                  </section>

                  {/* 3. What Information We Collect */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">3. WHAT INFORMATION WE COLLECT</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We collect the following types of personal information:
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Account Information:</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          <li>Full name and email address (mandatory for account creation)</li>
                          <li>Password (encrypted and stored securely)</li>
                          <li>Phone number (optional for account recovery)</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Subscription Information:</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          <li>Billing address and payment details</li>
                          <li>Payment history and subscription status</li>
                          <li>Company name (for business accounts)</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Application Data:</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          <li>Notes and content you create within the app</li>
                          <li>Schedule entries and calendar data</li>
                          <li>Usage analytics and app performance data</li>
                          <li>Device information and IP address</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* 4. Purpose for Processing */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">4. PURPOSE FOR PROCESSING</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We process your personal information for the following purposes:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Providing note-taking and scheduling services (contractual basis)</li>
                      <li>Processing subscription payments (contractual basis)</li>
                      <li>Improving app functionality and user experience (legitimate interest)</li>
                      <li>Communicating service updates and support (contractual basis)</li>
                      <li>Complying with legal obligations including tax and financial reporting (legal obligation)</li>
                      <li>Preventing fraud and ensuring account security (legitimate interest)</li>
                    </ul>
                  </section>

                  {/* 5. Lawful Basis for Processing */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">5. LAWFUL BASIS FOR PROCESSING</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">We process your information based on:</p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Your consent where explicitly given</li>
                      <li>Performance of our subscription contract with you</li>
                      <li>Compliance with legal obligations (FICA, tax law, POPIA)</li>
                      <li>Our legitimate business interests (service improvement, security)</li>
                    </ul>
                  </section>

                  {/* 6. How We Collect Information */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">6. HOW WE COLLECT INFORMATION</h2>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Directly from you during account registration and app usage</li>
                      <li>Automatically through your use of our services</li>
                      <li>From payment processors when processing subscriptions</li>
                      <li>From Supabase (our backend provider) system logs</li>
                    </ul>
                  </section>

                  {/* 6.5. Calendar Integration Services */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">6.5. CALENDAR INTEGRATION SERVICES</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Google Calendar Integration:</h3>
                        <p className="text-gray-700 leading-relaxed mb-2">
                          When you choose to connect your Google Calendar, we access and process:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                          <li>Your Google Calendar events and details</li>
                          <li>Calendar metadata (calendar names, colors, time zones)</li>
                          <li>Event creation, modification, and deletion capabilities</li>
                        </ul>
                        <p className="text-gray-700 leading-relaxed mt-3 mb-2">
                          We use this information to:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                          <li>Display your Google Calendar events alongside your Scola schedule</li>
                          <li>Create events in your Google Calendar from Scola</li>
                          <li>Provide unified calendar viewing and management</li>
                          <li>Sync changes bidirectionally between services</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Microsoft Calendar Integration:</h3>
                        <p className="text-gray-700 leading-relaxed mb-2">
                          When you choose to connect your Microsoft Outlook/365 Calendar, we access and process:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                          <li>Your Microsoft Calendar events and details</li>
                          <li>Calendar metadata and settings</li>
                          <li>Event creation, modification, and deletion capabilities</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Data Sharing with Calendar Providers:</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          <li>Google: We share calendar event data you create in Scola with Google Calendar API</li>
                          <li>Microsoft: We share calendar event data you create in Scola with Microsoft Graph API</li>
                          <li>This sharing occurs only when you explicitly connect these services</li>
                          <li>You can disconnect these integrations at any time through your account settings</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Token Storage and Security:</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          <li>OAuth tokens for calendar access are encrypted and stored securely</li>
                          <li>Tokens are automatically refreshed to maintain connection</li>
                          <li>We never store your Google or Microsoft account passwords</li>
                          <li>Disconnecting removes all stored tokens immediately</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Your Control:</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          <li>Calendar integration is entirely optional</li>
                          <li>You can connect/disconnect at any time</li>
                          <li>Disconnecting stops all data sharing with the respective service</li>
                          <li>Your Scola data remains unaffected by disconnection</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* 7. Data Sharing and Transfers */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">7. DATA SHARING AND TRANSFERS</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">We share your information only with:</p>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Service Providers:</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          <li>Supabase (database hosting - EU/SA regions only)</li>
                          <li>Paystack (payment processing - FICA-compliant KYC sharing)</li>
                          <li>Analytics providers (anonymized data only)</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Legal Requirements:</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          <li>South African Revenue Service (for tax compliance)</li>
                          <li>Information Regulator (if requested)</li>
                          <li>Law enforcement (when legally required)</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">International Transfers:</h3>
                        <p className="text-gray-700 leading-relaxed">
                          Some data may be processed in EU data centers (Supabase). These transfers are protected by Standard Contractual Clauses and adequate protection standards.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* 8. Your Rights Under POPIA */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">8. YOUR RIGHTS UNDER POPIA</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">You have the right to:</p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Access your personal information</li>
                      <li>Request correction of inaccurate information</li>
                      <li>Request deletion of your information (subject to legal retention requirements)</li>
                      <li>Object to processing for direct marketing</li>
                      <li>Withdraw consent (where consent is the processing basis)</li>
                      <li>Lodge a complaint with the Information Regulator</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mt-4">
                      To exercise these rights, email support@scola.co.za
                    </p>
                  </section>

                  {/* 9. Data Retention */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">9. DATA RETENTION</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">We retain your information for:</p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Account data: Until account deletion + 5 years (FICA requirement)</li>
                      <li>Payment records: 5 years after last transaction (FICA/tax law)</li>
                      <li>Notes and schedules: Until account deletion (unless you export/delete earlier)</li>
                      <li>Analytics data: 24 months maximum</li>
                    </ul>
                  </section>

                  {/* 10. Security Measures */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">10. SECURITY MEASURES</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">We protect your information through:</p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>AES-256 encryption at rest and TLS 1.3 in transit</li>
                      <li>Multi-factor authentication on admin accounts</li>
                      <li>Regular security audits and penetration testing</li>
                      <li>Row-level security on all user data</li>
                      <li>SOC 2 Type II compliant infrastructure</li>
                    </ul>
                  </section>

                  {/* 11. Children's Privacy */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">11. CHILDREN'S PRIVACY</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Our service is not intended for children under 18. We do not knowingly collect information from minors without parental consent.
                    </p>
                  </section>

                  {/* 12. Breach Notification */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">12. BREACH NOTIFICATION</h2>
                    <p className="text-gray-700 leading-relaxed">
                      In the event of a data breach, we will notify the Information Regulator and affected users as soon as reasonably possible, in accordance with POPIA requirements.
                    </p>
                  </section>

                  {/* 13. Contact Information */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">13. CONTACT INFORMATION</h2>
                    <div className="text-gray-700 leading-relaxed space-y-2">
                      <p><strong>For privacy-related questions or complaints:</strong></p>
                      <p><strong>Email:</strong> support@scola.co.za</p>
                      <p><strong>Physical Address:</strong> 7 on Middle, 7 Middle Rd, Morningside, Sandton, Gauteng, 2057.</p>
                      <p><strong>Information Regulator:</strong> <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://inforegulator.org.za</a></p>
                    </div>
                  </section>

                  {/* 14. Changes to This Policy */}
                  <section>
                    <h2 className="text-2xl font-semibold font-heading text-black mb-4">14. CHANGES TO THIS POLICY</h2>
                    <p className="text-gray-700 leading-relaxed">
                      We may update this policy from time to time. We will notify you of material changes by email or through the app, and post the updated policy on our website.
                    </p>
                    <p className="text-gray-700 leading-relaxed mt-4">
                      This policy is effective as of 29/07/2025.
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

export default PrivacyPolicy;