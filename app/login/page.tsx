'use client';

import Link from 'next/link';
import { AuthShell } from '@/components/layout/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your account"
      footer={
        <span>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-black hover:text-gray-700 transition">
            Sign up
          </Link>
        </span>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
