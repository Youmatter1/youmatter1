'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/layout/auth-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Circle } from 'lucide-react';

// Only ever navigate to an in-app relative path — the redirect value came
// through a URL query string, so treat it as untrusted.
function sanitizeRedirect(redirect: string | null): string {
  if (!redirect) return '/login';
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return '/login';
  return redirect;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const loginHref = sanitizeRedirect(searchParams.get('redirect'));

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const criteria = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
  const allCriteriaMet = Object.values(criteria).every(Boolean);

  if (!token) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 text-center">
        <p className="font-semibold mb-2">Invalid Link</p>
        <p>This password reset link is invalid or has expired.</p>
        <Link
          href={loginHref === '/login' ? '/forgot-password' : `/forgot-password?redirect=${encodeURIComponent(loginHref)}`}
          className="mt-4 inline-block underline font-medium"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allCriteriaMet) {
      setError('Please meet all password requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setIsSuccess(true);
      setTimeout(() => router.push(loginHref), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <h3 className="text-xl font-bold mb-2">Password Reset Successful</h3>
        <p className="text-gray-600 mb-6">
          Your password has been updated. Redirecting you to login...
        </p>
        <Button onClick={() => router.push(loginHref)} className="w-full">
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="password" requiredIndicator>New Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />

        {/* Password strength checklist */}
        {password.length > 0 && (
          <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">Password requirements:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { met: criteria.minLength, label: 'Minimum 8 characters' },
                { met: criteria.hasUpper, label: 'One uppercase letter' },
                { met: criteria.hasLower, label: 'One lowercase letter' },
                { met: criteria.hasNumber, label: 'One number' },
              ].map(({ met, label }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 text-xs ${met ? 'text-green-600 font-medium' : 'text-gray-500'}`}
                >
                  {met ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" requiredIndicator>Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading}
        />
        {confirmPassword.length > 0 && password !== confirmPassword && (
          <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
        )}
      </div>

      <Button
        type="submit"
        variant="secondary"
        className="w-full"
        disabled={isLoading || !allCriteriaMet || password !== confirmPassword}
      >
        {isLoading ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  );
}

function ResetPasswordShell() {
  const searchParams = useSearchParams();
  const loginHref = sanitizeRedirect(searchParams.get('redirect'));

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Create a new password"
      description="Please choose a strong password for your account."
      footer={
        <Link
          href={loginHref}
          className="inline-flex items-center text-sm font-semibold text-black hover:text-gray-700 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to login
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ResetPasswordShell />
    </Suspense>
  );
}
