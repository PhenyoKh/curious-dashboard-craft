import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface FormData {
  name: string;
  email: string;
  message: string;
}

const Contact: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Please enter your email address');
      return false;
    }
    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (!formData.message.trim()) {
      toast.error('Please enter your message');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Create mailto URL with form data
    const subject = encodeURIComponent(`Contact Form Submission from ${formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\n` +
      `Email: ${formData.email}\n\n` +
      `Message:\n${formData.message}\n\n` +
      `---\nSent via Scola Contact Form`
    );
    
    const mailtoUrl = `mailto:support@scola.co.za?subject=${subject}&body=${body}`;
    
    // Open email client
    window.location.href = mailtoUrl;
    
    // Show success message and reset form
    setTimeout(() => {
      toast.success('Email client opened! Your message has been prepared.');
      setFormData({ name: '', email: '', message: '' });
      setIsSubmitting(false);
    }, 1000);
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
                  <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight font-semibold text-black tracking-tight font-heading mb-4">
                    Contact us
                  </h1>
                  <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                    Have a question or need assistance? We'd love to hear from you. Send us a message and we'll get back to you as soon as possible.
                  </p>
                </div>

                {/* Contact Form */}
                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                  
                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                      Name *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className="w-full"
                      required
                    />
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email address"
                      className="w-full"
                      required
                    />
                  </div>

                  {/* Message Field */}
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-sm font-medium text-gray-700">
                      Message *
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us how we can help you..."
                      className="w-full min-h-[120px] resize-y"
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-black text-white hover:bg-gray-800 transition-all py-3 text-base font-medium"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Opening Email Client...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Send Message
                        </div>
                      )}
                    </Button>
                  </div>

                  {/* Help Text */}
                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      * Required fields. Your email client will open with the message pre-filled.
                    </p>
                  </div>

                </form>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;