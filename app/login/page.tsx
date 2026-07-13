'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/layout/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

const VALID_ROLES = ['patient', 'therapist', 'org_admin'] as const;
type ValidRole = (typeof VALID_ROLES)[number];

function LoginContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const preSelectedRole = VALID_ROLES.includes(roleParam as ValidRole)
    ? (roleParam as ValidRole)
    : undefined;

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
      <LoginForm preSelectedRole={preSelectedRole} />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginContent />
    </Suspense>
  );
}
