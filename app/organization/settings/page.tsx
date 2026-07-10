'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeading } from '@/components/ui/section-heading';

interface OrganizationSettings {
  id: number;
  name: string;
  domain: string | null;
  logo_url: string | null;
  billing_email: string | null;
  plan_tier: string;
  max_seats: number;
}

export default function OrganizationSettingsPage() {
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    fetch('/api/organization/settings', { credentials: 'include' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.success) throw new Error(body.error || 'Failed to load settings');
        const data: OrganizationSettings = body.data;
        setOrg(data);
        setName(data.name || '');
        setDomain(data.domain || '');
        setBillingEmail(data.billing_email || '');
        setLogoUrl(data.logo_url || '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed to upload logo');
      setLogoUrl(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus('idle');
    try {
      const response = await fetch('/api/organization/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, domain, billing_email: billingEmail, logo_url: logoUrl }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed to save settings');
      setSaveStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Unable to load organization settings.'}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <SectionHeading
        align="left"
        variant="light"
        title="Organization Settings"
        description={`${org.plan_tier.toUpperCase()} plan · ${org.max_seats} seats`}
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-black/20 bg-white p-6 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.2)]"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-black/10 bg-black/5">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Organization logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-black/40">Logo</span>
            )}
          </div>
          <div>
            <Label htmlFor="logo-upload">Logo</Label>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={uploadingLogo}
              className="mt-1 block text-sm text-black/70"
            />
            {uploadingLogo ? <p className="mt-1 text-xs text-black/50">Uploading...</p> : null}
          </div>
        </div>

        <div>
          <Label htmlFor="org-name" requiredIndicator>Organization Name</Label>
          <div className="mt-2">
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        </div>

        <div>
          <Label htmlFor="org-domain">Company Domain</Label>
          <div className="mt-2">
            <Input
              id="org-domain"
              placeholder="acme.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="org-billing-email">Billing Email</Label>
          <div className="mt-2">
            <Input
              id="org-billing-email"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
            />
          </div>
        </div>

        {saveStatus === 'success' ? (
          <p className="text-sm font-medium text-green-700">Settings saved.</p>
        ) : null}
        {saveStatus === 'error' && error ? (
          <p className="text-sm font-medium text-red-600">{error}</p>
        ) : null}

        <Button type="submit" disabled={saving || uploadingLogo}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}
