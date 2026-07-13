'use client';

import { useState, useEffect } from 'react';
import { Bell, Settings, LogOut, MessageSquare, Home, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { OrgContextBanner } from '@/components/dashboard/org-context-banner';

interface Session {
  id: number;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  meeting_link: string | null;
  therapist_name: string;
  therapist_email: string;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
}

export default function PatientDashboard() {
  const { user, token, logout, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!token) return;

    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/patient/sessions?status=scheduled', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSessions(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchSessions();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const displayName =
    user.profile?.full_name || user.profile?.username || user.email.split('@')[0];

  const upcomingSession = sessions[0] ?? null;

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

        <nav className="flex-1 p-4 space-y-2">
          {[
            { icon: Home, label: 'Dashboard', href: '/patient' },
            { icon: Bell, label: 'My Sessions', href: '/patient/sessions' },
            { icon: MessageSquare, label: 'Messages', href: '/patient/messages' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-green-50 text-gray-700 hover:text-green-700 transition-colors cursor-pointer group">
                  <Icon className="w-5 h-5 group-hover:text-green-600" />
                  {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <Link href="/patient/profile">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer">
              <Settings className="w-5 h-5" />
              {sidebarOpen && <span className="text-sm font-medium">My Profile</span>}
            </div>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 text-gray-700 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
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
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {displayName}!
            </h1>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-6 h-6 text-gray-600" />
              </button>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-semibold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <OrgContextBanner />

        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Next Session Card */}
              {sessionsLoading ? (
                <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm animate-pulse h-48" />
              ) : upcomingSession ? (
                <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Next Session</h2>
                    <span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      {formatDate(upcomingSession.scheduled_date)}
                    </span>
                  </div>

                  <div className="flex gap-4 mb-6 pb-6 border-b border-gray-200">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-700 font-bold text-xl">
                        {upcomingSession.therapist_name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {upcomingSession.therapist_name}
                      </h3>
                      <p className="text-sm text-gray-600">{upcomingSession.therapist_email}</p>
                      <p className="text-sm font-medium text-gray-900 mt-2">
                        {formatDate(upcomingSession.scheduled_date)} at{' '}
                        <span className="text-green-600">{formatTime(upcomingSession.scheduled_time)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {upcomingSession.meeting_link ? (
                      <a href={upcomingSession.meeting_link} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold h-11">
                          Join Video Session
                        </Button>
                      </a>
                    ) : (
                      <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold h-11" disabled>
                        Link not available yet
                      </Button>
                    )}
                    <Button variant="secondary" className="flex-1 rounded-lg">
                      Reschedule
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm text-center">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">No Upcoming Sessions</h2>
                  <p className="text-gray-600 mb-4">Book a session with a therapist to get started on your wellness journey.</p>
                  <Link href="/patient/find-therapist">
                    <Button className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold">
                      Find a Therapist
                    </Button>
                  </Link>
                </div>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4">
                <Link href="/patient/find-therapist">
                  <div className="rounded-2xl bg-white border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer text-center">
                    <Plus className="w-8 h-8 text-green-600 mx-auto mb-3" />
                    <p className="font-semibold text-gray-900">Book New Session</p>
                  </div>
                </Link>
                <Link href="/patient/messages">
                  <div className="rounded-2xl bg-white border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer text-center">
                    <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <p className="font-semibold text-gray-900">Message Therapist</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Upcoming Sessions List */}
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Sessions</h3>
                {sessionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-gray-500">No upcoming sessions scheduled.</p>
                ) : (
                  <div className="space-y-4">
                    {sessions.slice(0, 3).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 font-semibold text-sm">
                            {s.therapist_name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{s.therapist_name}</p>
                          <p className="text-xs text-gray-600">
                            {formatDate(s.scheduled_date)} at {formatTime(s.scheduled_time)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Journey Stats */}
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Journey</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Sessions Booked</p>
                    <p className="text-2xl font-bold text-green-600">{sessions.length}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Account</p>
                    <span className="text-sm font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">Active</span>
                  </div>
                </div>
              </div>

              {/* Crisis Support Card */}
              <div className="rounded-2xl bg-red-50 border border-red-200 p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-3">Need Help Now?</h3>
                <p className="text-sm text-red-700 mb-4">If you&apos;re in crisis, please reach out immediately. Help is available 24/7.</p>
                <a href="tel:988" className="block">
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold h-10">
                    Call 988 Crisis Line
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
