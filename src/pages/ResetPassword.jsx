import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
// Logo is now served from public folder

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check for required parameters on mount
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');
    
    if (!emailParam || !tokenParam) {
      setError('Invalid reset link. Please start from the forgot password page.');
      return;
    }
    
    setEmail(emailParam);
    setResetToken(tokenParam);
  }, [searchParams]);

  const validatePassword = (pwd) => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(pwd)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      if (!email || !resetToken) {
        throw new Error('Missing reset information. Please start from the forgot password page.');
      }

      // Extract info from reset token
      const [tokenEmail, otp, timestamp] = resetToken.split(':');
      
      if (tokenEmail !== email) {
        throw new Error('Invalid reset token.');
      }

      // Check if token is not too old (1 hour max)
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenAge > 60 * 60 * 1000) { // 1 hour in milliseconds
        throw new Error('Reset token has expired. Please start the password reset process again.');
      }

      // Update password using custom API (OTP was already verified)
      // In development, call the Express server directly
      const apiUrl = import.meta.env.DEV 
        ? 'http://localhost:3000/api/update-password-after-otp'
        : '/api/update-password-after-otp';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email,
          resetToken: resetToken,
          newPassword: password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update password');
      }

      setSuccess(true);
      // Redirect to login after successful password reset
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="shadow-lg border-0 min-h-[600px]">
          <CardHeader className="pb-8 pt-8">
            {/* Header with Logo */}
            <div className="flex items-center justify-center mb-8">
              <img src="/main_logo.svg" alt="GC21 Logo" className="w-80 h-auto" />
            </div>

            {/* Welcome Section */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: '#0064b0' }}>Reset Password</h2>
              <p className="text-gray-600">Enter your new password</p>
            </div>
            
            {/* Separator */}
            <div className="border-t border-gray-200 mt-6"></div>
          </CardHeader>

          <CardContent className="space-y-8 px-8 pb-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

            {success ? (
              <div className="text-center space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Password Updated!</h3>
                  <p className="text-sm text-green-700">
                    Your password has been successfully updated. Redirecting to login...
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-medium" style={{ color: '#0064b0' }}>New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    <p>Password must contain:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li className={password.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
                        At least 8 characters
                      </li>
                      <li className={/(?=.*[a-z])/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                        One lowercase letter
                      </li>
                      <li className={/(?=.*[A-Z])/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                        One uppercase letter
                      </li>
                      <li className={/(?=.*\d)/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                        One number
                      </li>
                      <li className={/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                        One special character
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-medium" style={{ color: '#0064b0' }}>Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 h-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-600">Passwords do not match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                  className="w-full h-14 text-base font-medium text-white"
                  style={{ backgroundColor: '#0064b0' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#0052a3'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#0064b0'}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating Password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            )}

            {/* Security Notice */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 text-center">
                <strong>Security Notice:</strong> Your password will be encrypted and stored securely. 
                Make sure to use a strong, unique password.
              </p>
            </div>

            {/* Action Links */}
            <div className="flex justify-center text-sm">
              <span 
                className="hover:underline cursor-pointer" 
                style={{ color: '#0064b0' }}
                onClick={() => navigate('/login')}
              >
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Back to Login
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Footer Security Message */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">Protected by enterprise-grade security</p>
        </div>
      </div>
    </div>
  );
}
