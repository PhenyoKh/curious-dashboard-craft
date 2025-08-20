import React, { useState } from 'react';
import { Mail, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';

interface EmailVerificationPromptProps {
  onDismiss?: () => void;
}

const EmailVerificationPrompt: React.FC<EmailVerificationPromptProps> = ({ onDismiss }) => {
  const { user, resendVerificationEmail, signOut } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResendEmail = async () => {
    setIsResending(true);
    setError(null);
    
    try {
      const { error } = await resendVerificationEmail();
      
      if (error) {
        setError(error.message);
      } else {
        setResendSuccess(true);
        // Hide success message after 5 seconds
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err) {
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Email</h2>
          <p className="text-gray-600">
            We've sent a verification link to <strong>{user?.email}</strong>. 
            Please check your email and click the link to verify your account.
          </p>
        </div>

        {/* Success Message */}
        {resendSuccess && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Verification email sent successfully! Check your inbox.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleResendEmail}
            disabled={isResending}
            className="w-full"
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </Button>
          
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full"
          >
            Sign Out
          </Button>
          
          {onDismiss && (
            <Button
              onClick={onDismiss}
              variant="ghost"
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Continue without verification (limited access)
            </Button>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>Didn't receive the email? Check your spam folder or try resending.</p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPrompt;