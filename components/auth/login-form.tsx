'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Stethoscope, Building2 } from 'lucide-react';

type LoginRole = 'patient' | 'therapist' | 'org_admin';

interface RoleOption {
  value: LoginRole;
  label: string;
  description: string;
  icon: typeof User;
}

const roles: RoleOption[] = [
  {
    value: 'patient',
    label: 'Patient / Client',
    description: 'Access your sessions, messages, and wellness journey',
    icon: User,
  },
  {
    value: 'therapist',
    label: 'Licensed Therapist',
    description: 'Manage your practice, schedule, and patients',
    icon: Stethoscope,
  },
  {
    value: 'org_admin',
    label: 'Organization',
    description: "Manage your team's access and billing",
    icon: Building2,
  },
];

interface LoginFormProps {
  preSelectedRole?: LoginRole;
}

export function LoginForm({ preSelectedRole }: LoginFormProps = {}) {
  const [selectedRole, setSelectedRole] = useState<LoginRole | null>(preSelectedRole || null);
  const [isStaffMode, setIsStaffMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading, error } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);

    try {
      // The picked card is enforced server-side as a real boundary — logging in
      // with the wrong account type is rejected rather than silently redirected.
      // Staff sign-in skips that check entirely (there's no public "Admin" card).
      await login(email, password, isStaffMode ? undefined : selectedRole ?? undefined);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  if (!selectedRole && !isStaffMode) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 mb-2">Select your account type to sign in</p>
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => setSelectedRole(role.value)}
              className="w-full flex items-start gap-4 text-left p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-gray-800 hover:bg-gray-50 transition-all group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <Icon className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-gray-800">
                  {role.label}
                </h3>
                <p className="text-sm text-gray-600">{role.description}</p>
              </div>
            </button>
          );
        })}
        <p className="text-center text-xs text-gray-500 pt-1">
          Are you an administrator?{' '}
          <button
            type="button"
            onClick={() => setIsStaffMode(true)}
            className="font-semibold text-gray-700 hover:text-gray-900 underline"
          >
            Staff sign in
          </button>
        </p>
      </div>
    );
  }

  const activeRole = selectedRole ? roles.find((r) => r.value === selectedRole)! : null;
  const ActiveIcon = activeRole?.icon;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-100">
        <div className="flex items-center gap-3">
          {activeRole && ActiveIcon ? (
            <>
              <ActiveIcon className="w-5 h-5 text-green-700 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600">Signing in as</p>
                <p className="font-semibold text-gray-900">{activeRole.label}</p>
              </div>
            </>
          ) : (
            <p className="font-semibold text-gray-900">Staff sign in</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedRole(null);
            setIsStaffMode(false);
          }}
          className="text-xs font-semibold text-gray-700 hover:text-gray-900"
        >
          Change
        </button>
      </div>

      {(error || localError) && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error || localError}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" requiredIndicator>
            Email address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" requiredIndicator>
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-black/70 transition hover:text-black"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-black/70">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="remember"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border border-black/30 text-black focus:ring-black"
            disabled={isLoading}
          />
          Remember me
        </label>
      </div>

      <Button
        type="submit"
        variant="secondary"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
}
