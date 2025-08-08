import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter';
import { calculatePasswordStrength } from '@/lib/password-utils';

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

interface PasswordChangeSettingsProps {
  className?: string;
}

const PasswordChangeSettings: React.FC<PasswordChangeSettingsProps> = ({
  className = ''
}) => {
  const { signIn, updatePassword, user } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const strength = calculatePasswordStrength(formData.newPassword);

    // Current password validation
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    // New password validation
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'New password must be at least 8 characters';
    } else if (!strength.requirements.lowercase || !strength.requirements.uppercase || !strength.requirements.number) {
      newErrors.newPassword = 'New password must contain at least one lowercase letter, one uppercase letter, and one number';
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
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

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user?.email) return;
    
    setIsSubmitting(true);
    setErrors({});

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await signIn(user.email, formData.currentPassword);
      
      if (signInError) {
        setErrors({ currentPassword: 'Current password is incorrect' });
        return;
      }

      // If current password is correct, update to new password
      const { error: updateError } = await updatePassword(formData.newPassword);
      
      if (updateError) {
        setErrors({ general: updateError.message });
      } else {
        // Success - show toast and reset form
        toast({
          title: "Password changed successfully",
          description: "Your password has been updated. You remain signed in.",
        });
        
        // Reset form
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrors({});
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span>Change Password</span>
          </CardTitle>
          <CardDescription>
            Update your account password. You'll remain signed in after changing your password.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          
          {/* General Error Alert */}
          {errors.general && (
            <Alert className="mb-6" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            
            {/* Current Password */}
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  className={`pl-10 pr-10 ${errors.currentPassword ? 'border-red-500' : ''}`}
                  placeholder="Enter your current password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>}
            </div>

            {/* New Password */}
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  className={`pl-10 pr-10 ${errors.newPassword ? 'border-red-500' : ''}`}
                  placeholder="Enter your new password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
              
              {/* Password Strength Meter */}
              <PasswordStrengthMeter password={formData.newPassword} />
            </div>

            {/* Confirm New Password */}
            <div>
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="confirm-new-password"
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

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Change Password</span>
                  </div>
                )}
              </Button>
            </div>
          </form>

        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Notice:</strong> After changing your password, you'll remain signed in on this device, 
          but you'll need to sign in again on other devices with your new password.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PasswordChangeSettings;