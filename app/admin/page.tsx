'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { Home, Users, UserCheck, Star, LogOut, Settings, Building2 } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.profile?.full_name || user.email.split('@')[0];

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/admin' },
    { icon: Users, label: 'Users', href: '/admin/users' },
    { icon: Building2, label: 'Organizations', href: '/admin/organizations' },
    { icon: UserCheck, label: 'Therapist Approvals', href: '/admin/therapist' },
    { icon: Star, label: 'Testimonials', href: '/admin/testimonials' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 sticky top-0 h-screen flex flex-col shadow-sm`}
      >
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">UM</span>
          </div>
          {sidebarOpen && <span className="font-bold text-lg text-gray-900">You Matter</span>}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-green-50 text-gray-700 hover:text-green-700 transition-colors cursor-pointer group">
                  <Icon className="w-5 h-5 group-hover:text-green-600 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-1">
          <Link href="/admin/settings">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer">
              <Settings className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">Settings</span>}
            </div>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 text-gray-700 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span className="text-lg">{sidebarOpen ? '‹' : '›'}</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Platform Administration</h1>
              <p className="text-sm text-gray-500 mt-0.5">Monitor users, sessions, and therapist approvals</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-semibold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <AdminDashboard />
        </div>
      </main>
    </div>
  );
}
