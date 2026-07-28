'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home, Clock, Users, BarChart2, MessageSquare, Calendar, Settings, LogOut,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface PerStudentComparison {
  name: string;
  fileId: number;
  firstWellbeing: number | null;
  latestWellbeing: number | null;
  firstAcademic: number | null;
  latestAcademic: number | null;
  firstAttendance: number | null;
  latestAttendance: number | null;
}

interface MonthlyPoint {
  month: string;
  avg_wellbeing: number | null;
  avg_academic: number | null;
  avg_attendance: number | null;
}

interface AnalyticsData {
  totalStudents: number;
  avgSessionsPerStudent: number;
  overallWellbeingImprovement: number;
  studentsImprovingGrades: number;
  monthlyTrend: MonthlyPoint[];
  goalsDistribution: { active: number; achieved: number; abandoned: number };
  perStudentComparison: PerStudentComparison[];
}

const PIE_COLORS = { active: '#596ee5', achieved: '#22c55e', abandoned: '#9ca3af' };

function formatMonth(ym: string): string {
  const [year, month] = ym.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function shortName(name: string): string {
  const parts = name.trim().split(' ');
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : name;
}

export default function AnalyticsPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    fetch('/api/clinician/analytics', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => { if (res.success) setData(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/clinician' },
    { icon: Clock, label: 'My Sessions', href: '/clinician/sessions' },
    { icon: Users, label: 'My Patients', href: '/clinician/patients' },
    { icon: BarChart2, label: 'Analytics', href: '/clinician/analytics' },
    { icon: MessageSquare, label: 'Messages', href: '/clinician/messages' },
    { icon: Calendar, label: 'Schedule', href: '/clinician/schedule' },
  ];

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#596ee5] border-r-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.profile?.full_name || user.email.split('@')[0];

  const hasData = data && data.totalStudents > 0;
  const hasEntries = data && data.monthlyTrend.length > 0;

  // Prep chart data
  const monthlyChartData = (data?.monthlyTrend ?? []).map((p) => ({
    month: formatMonth(p.month),
    'Avg Wellbeing': p.avg_wellbeing,
    'Avg Academic %': p.avg_academic,
    'Avg Attendance %': p.avg_attendance,
  }));

  const beforeAfterData = (data?.perStudentComparison ?? [])
    .filter((s) => s.firstAcademic != null || s.latestAcademic != null)
    .map((s) => ({
      name: shortName(s.name),
      Baseline: s.firstAcademic ?? 0,
      Latest: s.latestAcademic ?? 0,
    }));

  const goalsData = data
    ? [
        { name: 'Active', value: data.goalsDistribution.active },
        { name: 'Achieved', value: data.goalsDistribution.achieved },
        { name: 'Abandoned', value: data.goalsDistribution.abandoned },
      ].filter((d) => d.value > 0)
    : [];

  const wellbeingSign = (data?.overallWellbeingImprovement ?? 0) > 0 ? '+' : '';

  const statCards = [
    {
      label: 'Total Students Seen',
      value: data?.totalStudents ?? 0,
      icon: Users,
      color: 'text-[#596ee5] bg-[#596ee5]/10',
      sub: 'with patient files',
    },
    {
      label: 'Avg Sessions / Student',
      value: data?.avgSessionsPerStudent ?? 0,
      icon: Clock,
      color: 'text-blue-600 bg-blue-50',
      sub: 'sessions on average',
    },
    {
      label: 'Wellbeing Improvement',
      value: `${wellbeingSign}${data?.overallWellbeingImprovement ?? 0}`,
      icon: data && data.overallWellbeingImprovement > 0 ? TrendingUp : data && data.overallWellbeingImprovement < 0 ? TrendingDown : Minus,
      color: data && data.overallWellbeingImprovement > 0 ? 'text-green-600 bg-green-50' : 'text-gray-500 bg-gray-100',
      sub: 'avg score change (1–10)',
    },
    {
      label: 'Improving Grades',
      value: data?.studentsImprovingGrades ?? 0,
      icon: TrendingUp,
      color: 'text-green-600 bg-green-50',
      sub: `of ${data?.totalStudents ?? 0} students`,
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 sticky top-0 h-screen flex flex-col shadow-sm`}
      >
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#596ee5] to-[#4558d4] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">UM</span>
          </div>
          {sidebarOpen && <span className="font-bold text-lg text-gray-900">You Matter</span>}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/clinician/analytics';
            return (
              <Link key={item.label} href={item.href}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer group ${active ? 'bg-[#596ee5]/10 text-[#596ee5]' : 'hover:bg-[#596ee5]/5 text-gray-700 hover:text-[#596ee5]'}`}>
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#596ee5]' : 'group-hover:text-[#596ee5]'}`} />
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
          <div className="px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Program Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Holistic overview of student progress across your caseload</p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Hero Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{stat.label}</p>
                  <p className="text-xs text-gray-400">{stat.sub}</p>
                </div>
              );
            })}
          </div>

          {!hasData ? (
            <div className="rounded-2xl bg-white border border-gray-200 p-16 text-center shadow-sm">
              <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700">No data to display yet</p>
              <p className="text-sm text-gray-500 mt-2 mb-5">
                Create patient files and log progress entries to see analytics here.
              </p>
              <Link href="/clinician/patients">
                <button className="bg-[#596ee5] hover:bg-[#4558d4] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  Go to My Patients
                </button>
              </Link>
            </div>
          ) : (
            <>
              {/* Monthly Trend Chart */}
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-1">Monthly Average Progress: All Students</h2>
                <p className="text-xs text-gray-500 mb-5">Average metrics across all students per month</p>
                {!hasEntries ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-gray-400">No progress entries logged yet.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" domain={[0, 10]} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="Avg Wellbeing" stroke="#596ee5" strokeWidth={2} dot={{ r: 4 }} />
                      <Line yAxisId="right" type="monotone" dataKey="Avg Academic %" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                      <Line yAxisId="right" type="monotone" dataKey="Avg Attendance %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Before / After Academic Chart */}
                <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-base font-bold text-gray-900 mb-1">Academic Score: Baseline vs Latest</h2>
                  <p className="text-xs text-gray-500 mb-5">Per-student first entry vs most recent entry</p>
                  {beforeAfterData.length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                      <p className="text-sm text-gray-400">No academic data logged yet.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={beforeAfterData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Baseline" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Latest" fill="#596ee5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Goals Distribution */}
                <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-base font-bold text-gray-900 mb-1">Goals Achievement Rate</h2>
                  <p className="text-xs text-gray-500 mb-5">Distribution of all goals across students</p>
                  {goalsData.length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                      <p className="text-sm text-gray-400">No goals created yet.</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width="60%" height={220}>
                        <PieChart>
                          <Pie
                            data={goalsData}
                            cx="50%" cy="50%"
                            innerRadius={55} outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {goalsData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={PIE_COLORS[entry.name.toLowerCase() as keyof typeof PIE_COLORS]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-3 flex-1">
                        {goalsData.map((entry) => {
                          const total = goalsData.reduce((s, d) => s + d.value, 0);
                          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                          return (
                            <div key={entry.name} className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: PIE_COLORS[entry.name.toLowerCase() as keyof typeof PIE_COLORS] }}
                              />
                              <div className="flex-1">
                                <div className="flex justify-between text-xs">
                                  <span className="font-medium text-gray-700 capitalize">{entry.name}</span>
                                  <span className="text-gray-500">{entry.value} ({pct}%)</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Per-Student Impact Table */}
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">Per-Student Progress Summary</h2>
                  <p className="text-xs text-gray-500 mt-0.5">First recorded entry vs most recent entry</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs">Student</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Wellbeing (1st)</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Wellbeing (Latest)</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Change</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Academic (1st)</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Academic (Latest)</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.perStudentComparison.map((s, i) => {
                        const wDiff =
                          s.firstWellbeing != null && s.latestWellbeing != null
                            ? s.latestWellbeing - s.firstWellbeing
                            : null;
                        const aDiff =
                          s.firstAcademic != null && s.latestAcademic != null
                            ? s.latestAcademic - s.firstAcademic
                            : null;
                        return (
                          <tr key={s.fileId} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                            <td className="px-5 py-3 font-medium text-gray-800">
                              <Link href={`/clinician/patients/${s.fileId}`} className="hover:text-[#596ee5] hover:underline">
                                {s.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">{s.firstWellbeing ?? '-'}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{s.latestWellbeing ?? '-'}</td>
                            <td className="px-4 py-3 text-center">
                              {wDiff != null ? (
                                <span className={`text-xs font-semibold ${wDiff > 0 ? 'text-green-600' : wDiff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                  {wDiff > 0 ? '+' : ''}{wDiff}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">{s.firstAcademic != null ? `${s.firstAcademic}%` : '-'}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{s.latestAcademic != null ? `${s.latestAcademic}%` : '-'}</td>
                            <td className="px-4 py-3 text-center">
                              {aDiff != null ? (
                                <span className={`text-xs font-semibold ${aDiff > 0 ? 'text-green-600' : aDiff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                  {aDiff > 0 ? '+' : ''}{Math.round(aDiff * 10) / 10}%
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {data.perStudentComparison.length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-sm text-gray-400">No progress entries logged yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
