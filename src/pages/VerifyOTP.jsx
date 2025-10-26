import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ArrowLeft } from 'lucide-react';
// Logo is now served from public folder

export default function VerifyOTP() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    
    setOtp(newOtp);
    
    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits.');
      setLoading(false);
      return;
    }

    try {
      // Get the email from URL params
      const email = searchParams.get('email') || '';
      
      if (!email) {
        throw new Error('Email parameter is missing. Please start from the forgot password page.');
      }

      // Use custom OTP verification API
      // In development, call the Express server directly
      const apiUrl = import.meta.env.DEV 
        ? 'http://localhost:3000/api/verify-password-reset-otp'
        : '/api/verify-password-reset-otp';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email,
          otp: otpString
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify OTP');
      }

      setSuccess(true);
      // Redirect to reset password page with email and reset token
      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(result.resetToken)}`);
      }, 2000);
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError(null);

    try {
      const email = searchParams.get('email') || '';
      
      if (!email) {
        throw new Error('Email parameter is missing.');
      }

      // Use custom resend OTP API
      // In development, call the Express server directly
      const apiUrl = import.meta.env.DEV 
        ? 'http://localhost:3000/api/send-password-reset-otp'
        : '/api/send-password-reset-otp';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend OTP');
      }

      setError(null);
      // Show success message for resend
      alert('OTP has been resent to your email.');
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError(err.message || 'Failed to resend OTP. Please try again.');
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
              <h2 className="text-2xl font-bold" style={{ color: '#0064b0' }}>Verify OTP</h2>
              <p className="text-gray-600">Enter the 6-digit code sent to your email</p>
            </div>
            
            {/* Separator */}
            <div className="border-t border-gray-200 mt-6"></div>
          </CardHeader>

          <CardContent className="space-y-8 px-8 pb-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 text-center">{error}</p>
              </div>
            )}

            {success ? (
              <div className="text-center space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">OTP Verified!</h3>
                  <p className="text-sm text-green-700">
                    Redirecting to reset password page...
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="space-y-4">
                  <Label className="font-medium text-center block" style={{ color: '#0064b0' }}>
                    Enter 6-digit OTP
                  </Label>
                  
                  <div className="flex justify-center gap-3">
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className="w-12 h-12 text-center text-lg font-semibold border-2 focus:border-blue-500"
                        style={{ 
                          borderColor: digit ? '#0064b0' : '#d1d5db',
                          color: '#0064b0'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full h-14 text-base font-medium text-white"
                  style={{ backgroundColor: '#0064b0' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#0052a3'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#0064b0'}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    'Verify OTP'
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-sm hover:underline"
                    style={{ color: '#0064b0' }}
                  >
                    Didn't receive code? Resend
                  </button>
                </div>
              </form>
            )}

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
