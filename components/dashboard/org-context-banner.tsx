'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

interface OrgContext {
  name: string;
  logo_url: string | null;
  slug: string;
  primary_color: string;
}

// Shown on the patient/clinician dashboards when the logged-in user belongs
// to an organization. Renders nothing for independent (non-org) users.
export function OrgContextBanner() {
  const { user, token } = useAuth();
  const [org, setOrg] = useState<OrgContext | null>(null);

  useEffect(() => {
    if (!user?.organization_id || !token) {
      setOrg(null);
      return;
    }
    fetch('/api/organization/context', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setOrg(data.organization))
      .catch(() => setOrg(null));
  }, [user?.organization_id, token]);

  if (!org) return null;

  return (
    <div
      className="flex items-center gap-3 px-8 py-3 border-b border-gray-200"
      style={{ backgroundColor: `${org.primary_color}0d` }}
    >
      {org.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={org.logo_url} alt={org.name} className="h-6 w-6 rounded-md object-cover flex-shrink-0" />
      ) : (
        <div
          className="h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
          style={{ backgroundColor: org.primary_color }}
        >
          {org.name[0]}
        </div>
      )}
      <p className="text-sm text-gray-700">
        You&apos;re accessing You Matter through{' '}
        <span className="font-semibold" style={{ color: org.primary_color }}>{org.name}</span>
      </p>
    </div>
  );
}
