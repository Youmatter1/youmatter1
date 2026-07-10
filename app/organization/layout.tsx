'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { orgAdminNav } from '@/lib/navigation';

export default function OrganizationLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/login?redirect=/organization');
      return;
    }
    if (user.role !== 'org_admin') {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'org_admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
      </div>
    );
  }

  const activeItem = orgAdminNav.find(
    (item) => pathname === item.href || (item.href !== '/organization' && pathname.startsWith(`${item.href}/`))
  );
  const title = activeItem?.label ?? 'Dashboard';

  return (
    <DashboardShell title={title} navItems={orgAdminNav}>
      {children}
    </DashboardShell>
  );
}
