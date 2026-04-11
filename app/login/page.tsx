'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { setCookie } from 'cookies-next';
import { Eye, EyeOff, ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import AppBrand from '@/components/AppBrand';

type LoginResponse = {
  success?: boolean;
  otpRequired?: boolean;
  challengeToken?: string;
  otpDelivery?: {
    email?: boolean;
    sms?: boolean;
  };
  otpExpiresAt?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    phoneNumber?: string | null;
    role: string;
    businessId: string | null;
    business?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
  error?: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [challengeToken, setChallengeToken] = useState('');
  const [otpDelivery, setOtpDelivery] = useState<LoginResponse['otpDelivery'] | null>(null);
  const router = useRouter();

  const handleCredentialSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      if (data.token) {
        setCookie('admin_session', data.token, { maxAge: 60 * 60 * 24 });
        router.push('/');
        router.refresh();
        return;
      }

      if (!data.otpRequired || !data.challengeToken) {
        throw new Error('OTP challenge was not created');
      }

      setChallengeToken(data.challengeToken);
      setOtpDelivery(data.otpDelivery || null);
      setOtp('');
      setStep('otp');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOtpLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken,
          otp,
        }),
      });

      const data: LoginResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      if (!data.token) {
        throw new Error('Session token missing');
      }

      setCookie('admin_session', data.token, { maxAge: 60 * 60 * 24 });
      router.push('/');
      router.refresh();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!email || !password) {
      setError('Enter your email and password again to resend the code.');
      return;
    }

    await handleCredentialSubmit({
      preventDefault: () => undefined,
    } as FormEvent<HTMLFormElement>);
  };

  const resetToCredentials = () => {
    setStep('credentials');
    setChallengeToken('');
    setOtpDelivery(null);
    setOtp('');
    setError('');
  };

  const deliveryText = [
    otpDelivery?.email ? 'email' : null,
    otpDelivery?.sms ? 'SMS' : null,
  ].filter(Boolean).join(' and ');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f1117', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ flex: 1, backgroundColor: '#161922', padding: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ marginBottom: '40px' }}>
          <AppBrand size="lg" />
        </div>
        <h1 style={{ fontSize: '48px', fontWeight: 600, marginBottom: '24px' }}>Hi, welcome back</h1>
        <p style={{ color: '#94a3b8', fontSize: '18px', lineHeight: 1.6, maxWidth: '420px' }}>
          Experience the next level of airtime management with integrated business intelligence.
          Monitor performance, track distribution trends, and unlock granular analytics to scale with confidence.
        </p>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px' }}>
            {step === 'credentials' ? 'Sign in' : 'Verify your code'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: '32px' }}>
            {step === 'credentials'
              ? 'Enter your account details to receive a one-time login code.'
              : `We sent a code to your ${deliveryText || 'registered contact channels'}.`}
          </p>

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid #334155', color: '#fff', outline: 'none' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Password</label>
                  <span style={{ fontSize: '12px', color: '#94a3b8', cursor: 'pointer' }}>Forgot password?</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      paddingRight: '45px',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      border: '1px solid #334155',
                      color: '#fff',
                      outline: 'none',
                    }}
                    placeholder="6+ characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error ? <p style={{ color: '#f87171', fontSize: '14px' }}>{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  color: '#000',
                  fontWeight: 700,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '8px',
                }}
              >
                {loading ? 'Sending code...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>One-time code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid #334155',
                    color: '#fff',
                    outline: 'none',
                    letterSpacing: '0.3em',
                    textAlign: 'center',
                    fontSize: '18px',
                  }}
                />
              </div>

              {error ? <p style={{ color: '#f87171', fontSize: '14px' }}>{error}</p> : null}

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={resetToCredentials}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: '#cbd5e1',
                    border: '1px solid #334155',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void resendOtp()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: '#cbd5e1',
                    border: '1px solid #334155',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={16} />
                  Resend code
                </button>
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  color: '#000',
                  fontWeight: 700,
                  border: 'none',
                  cursor: otpLoading ? 'not-allowed' : 'pointer',
                  marginTop: '4px',
                }}
              >
                {otpLoading ? 'Verifying...' : 'Verify and sign in'}
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.18)',
                color: '#d1fae5',
                fontSize: 13,
              }}>
                <ShieldCheck size={16} />
                The code expires in 10 minutes and only works once.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
