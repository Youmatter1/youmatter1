'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface OrgLoginFormProps {
  slug: string;
  organizationName: string;
  logoUrl: string | null;
  primaryColor: string;
}

export function OrgLoginForm({ slug, organizationName, logoUrl, primaryColor }: OrgLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/org-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, slug }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login failed. Please try again.');
      }

      localStorage.setItem('token', data.token);
      window.location.href = data.redirect || '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={organizationName} className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover shadow-sm" />
          ) : (
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {organizationName[0]}
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-900">{organizationName}</h1>
          <p className="text-sm text-gray-600 mt-1">Sign in to your account</p>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-lg border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" requiredIndicator>Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" requiredIndicator>Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Enter your password"
              />
            </div>

            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={isLoading}
              style={{ backgroundColor: primaryColor }}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            Have an invitation?{' '}
            <Link href="/invite/accept" className="font-semibold text-gray-700 hover:text-gray-900 underline">
              Set up your account
            </Link>
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">Powered by You Matter</p>
      </div>
    </div>
  );
}
