'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Home, Calendar, MessageSquare, Clock, User, LogOut, Settings, Video, Users, CheckCircle, BarChart2,
} from 'lucide-react';
import { OrgContextBanner } from '@/components/dashboard/org-context-banner';

interface Session {
  id: number;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  meeting_link?: string;
  patient_name: string;
  patient_username: string;
  patient_picture?: string;
}

interface DashboardData {
  therapist: {
    id: number;
    name: string;
    specializations: string[];
    credentials?: string;
    experience: number;
    rating: number;
    total_reviews: number;
    stripe_account_id?: string;
  };
  stats: {
    totalSessions: number;
    scheduledSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    activePatients: number;
    todaysSessions: number;
  };
  todaySessions: Session[];
  upcomingSessions: Session[];
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ClinicianDashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    fetch('/api/clinician/dashboard', { credentials: 'include' })
      .then(r => r.json())
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = data?.therapist.name || user.profile?.full_name || user.email.split('@')[0];

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/clinician' },
    { icon: Clock, label: 'My Sessions', href: '/clinician/sessions' },
    { icon: Users, label: 'My Patients', href: '/clinician/patients' },
    { icon: BarChart2, label: 'Analytics', href: '/clinician/analytics' },
    { icon: MessageSquare, label: 'Messages', href: '/clinician/messages' },
    { icon: Calendar, label: 'Schedule', href: '/clinician/schedule' },
  ];

  const stats = data?.stats;

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
          <Link href="/clinician/profile">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer">
              <Settings className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">My Profile</span>}
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
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {displayName}!</h1>
            <div className="flex items-center gap-4">
              <Link href="/clinician/messages">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MessageSquare className="w-6 h-6 text-gray-600" />
                </button>
              </Link>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-semibold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <OrgContextBanner />

        <div className="p-8 space-y-8">
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Sessions', value: stats?.totalSessions ?? 0, icon: BarChart2, color: 'text-green-600 bg-green-50' },
              { label: 'Scheduled', value: stats?.scheduledSessions ?? 0, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
              { label: 'Completed', value: stats?.completedSessions ?? 0, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
              { label: 'Active Patients', value: stats?.activePatients ?? 0, icon: Users, color: 'text-purple-600 bg-purple-50' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Today's Sessions */}
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">
                  Today&apos;s Sessions
                  {stats && stats.todaysSessions > 0 && (
                    <span className="ml-2 text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      {stats.todaysSessions}
                    </span>
                  )}
                </h2>
                <Link href="/clinician/sessions">
                  <Button variant="secondary" className="text-xs rounded-lg h-8">View All</Button>
                </Link>
              </div>

              {!data || data.todaySessions.length === 0 ? (
                <p className="text-sm text-gray-500">No sessions scheduled for today.</p>
              ) : (
                <div className="space-y-3">
                  {data.todaySessions.map((session) => (
                    <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        {session.patient_picture ? (
                          <img src={session.patient_picture} alt={session.patient_name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-green-700 font-semibold text-sm">{session.patient_name[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{session.patient_name}</p>
                        <p className="text-xs text-gray-500">{formatTime(session.scheduled_time)} · {session.duration_minutes} min</p>
                      </div>
                      {session.meeting_link && (
                        <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                          <Button className="bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs h-8 px-3">
                            <Video className="w-3.5 h-3.5 mr-1" /> Join
                          </Button>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Sessions */}
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">Upcoming Sessions</h2>
                <Link href="/clinician/sessions">
                  <Button variant="secondary" className="text-xs rounded-lg h-8">View All</Button>
                </Link>
              </div>

              {!data || data.upcomingSessions.length === 0 ? (
                <p className="text-sm text-gray-500">No upcoming sessions scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {data.upcomingSessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        {session.patient_picture ? (
                          <img src={session.patient_picture} alt={session.patient_name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-green-700 font-semibold text-sm">{session.patient_name[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{session.patient_name}</p>
                        <p className="text-xs text-gray-500">{formatDate(session.scheduled_date)} at {formatTime(session.scheduled_time)}</p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700 whitespace-nowrap">
                        Scheduled
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Update Schedule', href: '/clinician/schedule', icon: Calendar },
              { label: 'View Messages', href: '/clinician/messages', icon: MessageSquare },
              { label: 'My Patients', href: '/clinician/patients', icon: Users },
              { label: 'Program Analytics', href: '/clinician/analytics', icon: BarChart2 },
              { label: 'All Sessions', href: '/clinician/sessions', icon: Clock },
              { label: 'Edit Profile', href: '/clinician/profile', icon: User },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <div className="rounded-2xl bg-white border border-gray-200 p-5 hover:shadow-md hover:border-green-200 transition-all cursor-pointer text-center group">
                    <Icon className="w-7 h-7 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
