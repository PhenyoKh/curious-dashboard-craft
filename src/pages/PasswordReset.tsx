import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter';
import { calculatePasswordStrength } from '@/lib/password-utils';

interface FormData {
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const PasswordReset: React.FC = () => {
  const { 
    handlePasswordRecovery, 
    updatePassword, 
    resetPassword, 
    signOut, 
    loading,
    isRecoveryMode,
    recoveryTokens,
    isInvalidResetAttempt,
    completePasswordRecovery,
    exitRecoveryMode
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Inline reset functionality states
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});

  // Extract errors from URL parameters (both search and hash)
  const searchParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace('#', ''));
  
  // Get errors from hash params (Supabase error format)  
  const urlError = hashParams.get('error') || searchParams.get('error');
  const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
  const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

  // Check if we're in duplicate tab scenario
  const isAlreadyProcessing = sessionStorage.getItem('password-recovery-processing');
  const isDuplicateTab = isAlreadyProcessing && !isRecoveryMode && !recoveryTokens;
  

  // Handle error states and cleanup on mount
  useEffect(() => {
    const handleInitialState = async () => {
      // First, check for URL errors (expired OTP, access denied, etc.)
      if (urlError || errorCode) {
        // Clear any partial authentication that might have occurred
        try {
          await signOut();
          exitRecoveryMode();
        } catch (error) {
          // Ignore signout errors in this context
        }
        
        return;
      }
      
      // Check if this is a duplicate tab scenario
      if (isDuplicateTab) {
        return;
      }
    };

    handleInitialState();
  }, [urlError, errorCode, errorDescription, isDuplicateTab, signOut, exitRecoveryMode]);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const strength = calculatePasswordStrength(formData.password);

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!strength.requirements.lowercase || !strength.requirements.uppercase || !strength.requirements.number) {
      newErrors.password = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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

  // Handle password reset
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});

    try {
      // Use the new completePasswordRecovery method
      const { error } = await completePasswordRecovery(formData.password);
      
      if (error) {
        setErrors({ general: error.message || 'Failed to reset password. Please try again.' });
      } else {
        setIsSuccess(true);
        
        // Clear URL parameters for security
        window.history.replaceState({}, document.title, '/reset-password');
        
        // Redirect to dashboard after successful reset
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle inline password reset request
  const handleRequestNewReset = async () => {
    if (!resetEmail) {
      setErrors({ general: 'Please enter your email address' });
      return;
    }

    setIsResettingPassword(true);
    setErrors({});

    try {
      const { error } = await resetPassword(resetEmail);
      
      if (error) {
        setErrors({ general: error.message });
      } else {
        setResetEmailSent(true);
        setShowEmailInput(false);
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Handle back to login with proper cleanup
  const handleBackToLogin = async () => {
    try {
      exitRecoveryMode();
      await signOut();
    } catch (error) {
      // Ignore signout errors
    }
    navigate('/auth', { replace: true });
  };

  // Get appropriate error message based on error type
  const getErrorMessage = () => {
    if (errorCode === 'otp_expired') {
      return {
        title: 'Password Reset Link Expired',
        message: 'Your password reset link has expired. Links are valid for 24 hours for security.',
        description: 'Please request a new password reset link to continue.'
      };
    } else if (urlError === 'access_denied') {
      return {
        title: 'Invalid Reset Link',
        message: 'This reset link is invalid or has already been used.',
        description: 'Each reset link can only be used once. If you need to reset your password, please request a new link.'
      };
    } else {
      return {
        title: 'Reset Link Problem',
        message: 'There was a problem with your reset link.',
        description: 'Please request a new password reset link to continue.'
      };
    }
  };

  // Show error UI if URL contains errors
  if (urlError || errorCode) {
    const errorInfo = getErrorMessage();
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {errorInfo.title}
            </h1>
            <p className="text-gray-600 mb-2">
              {errorInfo.message}
            </p>
            <p className="text-sm text-gray-500">
              {errorInfo.description}
            </p>
          </div>
          
          {/* Success message for new reset request */}
          {resetEmailSent && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                New password reset email sent! Check your inbox.
              </AlertDescription>
            </Alert>
          )}

          {/* Error messages */}
          {errors.general && (
            <Alert className="mb-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {!showEmailInput && !resetEmailSent && (
              <Button
                onClick={() => setShowEmailInput(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Request New Reset
              </Button>
            )}
            
            {showEmailInput && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email Address</label>
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="mt-1"
                    disabled={isResettingPassword}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRequestNewReset}
                    disabled={isResettingPassword}
                    className="flex-1"
                  >
                    {isResettingPassword ? 'Sending...' : 'Send Reset Email'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEmailInput(false);
                      setResetEmail('');
                      setErrors({});
                    }}
                    variant="outline"
                    disabled={isResettingPassword}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation options */}
            <div className="flex gap-2 pt-2">
              {errorCode === 'otp_expired' && (
                <Button
                  onClick={handleBackToLogin}
                  variant="outline"
                  className="flex-1"
                >
                  Back to Login
                </Button>
              )}
              {urlError === 'access_denied' && (
                <>
                  <Button
                    onClick={handleBackToLogin}
                    variant="outline"
                    className="flex-1"
                  >
                    Try Login
                  </Button>
                  {!showEmailInput && !resetEmailSent && (
                    <Button
                      onClick={() => setShowEmailInput(true)}
                      variant="outline"
                      className="flex-1"
                    >
                      New Reset
                    </Button>
                  )}
                </>
              )}
              {!errorCode && urlError && (
                <Button
                  onClick={handleBackToLogin}
                  variant="outline"
                  className="w-full"
                >
                  Back to Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show duplicate tab UI
  if (isDuplicateTab) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Password Reset In Progress
            </h1>
            <p className="text-gray-600">
              Password reset is already being processed in another tab. Please complete the process there or close this tab.
            </p>
          </div>
          
          <Button
            onClick={handleBackToLogin}
            className="w-full"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Password Reset Successful
            </h1>
            <p className="text-gray-600 mb-6">
              Your password has been updated successfully. You will be redirected to your dashboard in a few seconds.
            </p>
            
            <Button
              onClick={() => navigate('/')}
              className="w-full"
            >
              Continue to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show password reset form when in recovery mode
  if (isRecoveryMode && !isSuccess) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-4">
        {/* Scola Title */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
            Reset Password
          </h1>
          <p className="text-lg text-gray-600">
            Choose a new password for your account
          </p>
        </div>

        {/* Password Reset Form */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          
          {/* General Error Alert */}
          {errors.general && (
            <Alert className="mb-6" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePasswordResetSubmit} className="space-y-6">
            
            {/* New Password */}
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Enter your new password"
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
              
              {/* Password Strength Meter */}
              <PasswordStrengthMeter password={formData.password} />
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  placeholder="Confirm your new password"
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
              {isSubmitting ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="text-sm text-blue-600 hover:text-blue-700"
              disabled={isSubmitting}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show invalid reset attempt UI
  if (isInvalidResetAttempt) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Invalid Reset Link
            </h1>
            <p className="text-gray-600 mb-4">
              This password reset link is invalid or has expired. Please request a new password reset.
            </p>
          </div>
          
          {/* Success message for new reset request */}
          {resetEmailSent && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                New password reset email sent! Check your inbox.
              </AlertDescription>
            </Alert>
          )}

          {/* Error messages */}
          {errors.general && (
            <Alert className="mb-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {!showEmailInput && !resetEmailSent && (
              <Button
                onClick={() => setShowEmailInput(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Request New Reset
              </Button>
            )}
            
            {showEmailInput && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email Address</label>
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="mt-1"
                    disabled={isResettingPassword}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRequestNewReset}
                    disabled={isResettingPassword}
                    className="flex-1"
                  >
                    {isResettingPassword ? 'Sending...' : 'Send Reset Email'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEmailInput(false);
                      setResetEmail('');
                      setErrors({});
                    }}
                    variant="outline"
                    disabled={isResettingPassword}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <Button
              onClick={() => navigate('/auth')}
              variant="outline"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: redirect to login for any other scenarios
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        <div className="text-center mb-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Unable to Reset Password
          </h1>
          <p className="text-gray-600">
            Unable to process password reset. Please try again.
          </p>
        </div>
        
        <Button
          onClick={() => navigate('/auth')}
          className="w-full"
        >
          Back to Login
        </Button>
      </div>
    </div>
  );
};

export default PasswordReset;