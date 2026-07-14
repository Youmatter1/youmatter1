
'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/layout/auth-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle } from 'lucide-react';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  // Where "back to login" / the emailed reset link should return to — lets
  // org-bound users end up back on their own branded /org/[slug]/login
  // instead of the generic one.
  const redirect = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirect }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="Password reset link sent"
        description={`We have sent a password reset link to ${email}. Please check your inbox and click the link to reset your password.`}
        footer={
          <Link
            href={redirect || '/login'}
            className="inline-flex items-center text-sm font-semibold text-black hover:text-gray-700 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to login
          </Link>
        }
      >
        <div className="flex justify-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Reset your password"
      description="Enter the email address associated with your account and we'll send you a link to reset your password."
      footer={
        <Link
          href={redirect || '/login'}
          className="inline-flex items-center text-sm font-semibold text-black hover:text-gray-700 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" requiredIndicator>
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Sending link...' : 'Send reset link'}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
