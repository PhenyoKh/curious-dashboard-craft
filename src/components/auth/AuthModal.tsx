import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'signup';
}

interface FormData {
  email: string;
  password: string;
  fullName: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  fullName?: string;
  confirmPassword?: string;
  general?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultTab = 'signin' 
}) => {
  const { signIn, signUp, resetPassword, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});

  // Form validation
  const validateForm = (isSignUp: boolean): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
    }

    // Sign-up specific validations
    if (isSignUp) {
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full name is required';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle sign in
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(false)) return;
    
    setIsSubmitting(true);
    setErrors({});

    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        setErrors({ general: error.message });
      } else {
        onClose();
        resetForm();
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle sign up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(true)) return;
    
    setIsSubmitting(true);
    setErrors({});

    try {
      const { error } = await signUp(formData.email, formData.password, formData.fullName);
      
      if (error) {
        setErrors({ general: error.message });
      } else {
        // Show success message or redirect
        setErrors({ general: 'Check your email for a verification link!' });
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!formData.email) {
      setErrors({ email: 'Please enter your email address' });
      return;
    }

    setIsResettingPassword(true);
    setErrors({});

    try {
      const { error } = await resetPassword(formData.email);
      
      if (error) {
        setErrors({ general: error.message });
      } else {
        setResetEmailSent(true);
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      fullName: '',
      confirmPassword: '',
    });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    setResetEmailSent(false);
  };

  // Handle modal close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200">
        {/* Header */}
        <div className="p-6 pb-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            Welcome to Scola
          </h2>
          <p className="text-gray-600 text-center mt-2">
            Sign in to access your notes and assignments
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* General Error Alert */}
            {errors.general && (
              <Alert className="mb-4" variant={errors.general.includes('Check your email') ? 'default' : 'destructive'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Password Reset Success */}
            {resetEmailSent && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Password reset email sent! Check your inbox.
                </AlertDescription>
              </Alert>
            )}

            {/* Sign In Tab */}
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signin-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="Enter your email"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="Enter your password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || loading}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? 'Sending...' : 'Forgot your password?'}
                  </button>
                </div>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="signup-name">Full Name</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signup-name"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className={`pl-10 ${errors.fullName ? 'border-red-500' : ''}`}
                      placeholder="Enter your full name"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signup-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="Enter your email"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="Create a password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>

                <div>
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      placeholder="Confirm your password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || loading}
                >
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;