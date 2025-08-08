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
  const { handlePasswordRecovery, updatePassword, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});

  // Extract tokens from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const accessToken = urlParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token');
  const type = urlParams.get('type');

  // Initialize password recovery session
  useEffect(() => {
    const initializePasswordRecovery = async () => {
      if (accessToken && refreshToken && type === 'recovery') {
        try {
          const { error } = await handlePasswordRecovery(accessToken, refreshToken);
          if (error) {
            setErrors({ general: 'Invalid or expired reset link. Please request a new password reset.' });
          }
        } catch (error) {
          setErrors({ general: 'Failed to initialize password reset. Please try again.' });
        }
      } else if (!accessToken || !refreshToken || type !== 'recovery') {
        setErrors({ general: 'Invalid reset link. Please request a new password reset from the login page.' });
      }
    };

    initializePasswordRecovery();
  }, [accessToken, refreshToken, type, handlePasswordRecovery]);

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
      const { error } = await updatePassword(formData.password);
      
      if (error) {
        setErrors({ general: error.message });
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

  // Redirect to login if user navigates directly without tokens
  if (!accessToken || !refreshToken || type !== 'recovery') {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Invalid Reset Link
            </h1>
            <p className="text-gray-600">
              This password reset link is invalid or has expired. Please request a new password reset.
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
};

export default PasswordReset;