'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/layout/auth-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface InvitationDetails {
  organization: { name: string; logo_url: string | null; slug: string };
  email: string;
  name: string | null;
  org_role: 'therapist' | 'member';
}

const REASON_MESSAGES: Record<string, string> = {
  not_found: 'This invitation link is invalid.',
  expired: 'This invitation has expired.',
  used: 'This invitation has already been used.',
  org_inactive: 'This organization is no longer active.',
};

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [bio, setBio] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setInvalidReason('not_found');
      setLoading(false);
      return;
    }
    fetch(`/api/invite/validate?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setInvitation(data);
          if (data.name) setName(data.name);
        } else {
          setInvalidReason(data.reason || 'not_found');
        }
      })
      .catch(() => setInvalidReason('not_found'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (invitation?.org_role === 'therapist' && !specialization.trim()) {
      setError('Specialization is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { token, name, password };
      if (invitation?.org_role === 'therapist') {
        payload.therapist_profile = {
          specialization,
          license_number: licenseNumber || undefined,
          years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : undefined,
          bio: bio || undefined,
        };
      }

      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      localStorage.setItem('token', data.token);
      window.location.href = data.redirect || '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (invalidReason || !invitation) {
    return (
      <AuthShell
        title="Invitation Unavailable"
        subtitle="This link can't be used"
        footer={
          <Link href="/login" className="font-semibold text-green-700 hover:text-green-800">
            Back to login
          </Link>
        }
      >
        <p className="text-sm text-gray-600 text-center">
          {REASON_MESSAGES[invalidReason || 'not_found']} Please contact your administrator for a new invitation.
        </p>
      </AuthShell>
    );
  }

  const roleLabel = invitation.org_role === 'therapist' ? 'Therapist' : 'Member';

  return (
    <AuthShell
      title={`Join ${invitation.organization.name}`}
      subtitle={`You've been invited as a ${roleLabel}`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">{error}</div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" value={invitation.email} disabled className="bg-gray-50" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" requiredIndicator>Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={submitting} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" requiredIndicator>Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={submitting}
            placeholder="At least 8 characters"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" requiredIndicator>Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={submitting}
          />
        </div>

        {invitation.org_role === 'therapist' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="specialization" requiredIndicator>Specialization</Label>
              <Input
                id="specialization"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                required
                disabled={submitting}
                placeholder="e.g., Anxiety & Depression"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license_number">License number</Label>
                <Input
                  id="license_number"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="years_of_experience">Years of experience</Label>
                <Input
                  id="years_of_experience"
                  type="number"
                  min={0}
                  max={50}
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={submitting}
                rows={3}
                className="w-full rounded-2xl border border-black/20 bg-white px-4 py-3 text-sm text-black shadow-[0_12px_40px_-28px_rgba(0,0,0,0.2)] transition focus:border-black focus:outline-none focus:ring-2 focus:ring-black/80"
                placeholder="Tell your future patients about your experience..."
              />
            </div>
          </>
        )}

        <Button type="submit" variant="secondary" className="w-full" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <AcceptInviteContent />
    </Suspense>
  );
}
