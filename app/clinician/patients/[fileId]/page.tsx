'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Home, Clock, Users, BarChart2, MessageSquare, Calendar, Settings, LogOut,
  ArrowLeft, Plus, TrendingUp, TrendingDown, Minus, Pencil, Trash2, CheckCircle,
  XCircle, Target, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface ProgressEntry {
  id: number;
  entry_date: string;
  wellbeing_score: number | null;
  academic_score: number | null;
  attendance_rate: number | null;
  behavioral_incidents: number | null;
  notes: string | null;
  created_at: string;
}

interface Goal {
  id: number;
  goal_text: string;
  status: 'active' | 'achieved' | 'abandoned';
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

interface PatientFile {
  id: number;
  patient_id: number;
  diagnoses_notes: string | null;
  treatment_goals: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  full_name: string;
  profile_picture: string | null;
  date_of_birth: string | null;
  gender: string | null;
  total_sessions: number;
}

type Tab = 'overview' | 'log' | 'goals' | 'notes';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'log', label: 'Progress Log' },
  { id: 'goals', label: 'Goals' },
  { id: 'notes', label: 'Case Notes' },
];

function calcAge(dob: string | null): string {
  if (!dob) return '';
  const birth = new Date(dob);
  const today = new Date();
  return `${today.getFullYear() - birth.getFullYear()} years old`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function delta(first: number | null, latest: number | null, invert = false) {
  if (first == null || latest == null) return null;
  const diff = latest - first;
  const pct = first !== 0 ? Math.round((diff / first) * 100) : 0;
  const positive = invert ? diff < 0 : diff > 0;
  return { diff: Math.round(diff * 10) / 10, pct, positive };
}

function MetricCard({
  label, first, latest, unit = '', invert = false,
}: {
  label: string; first: number | null; latest: number | null; unit?: string; invert?: boolean;
}) {
  const d = delta(first, latest, invert);
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      {latest == null ? (
        <p className="text-2xl font-bold text-gray-400">-</p>
      ) : (
        <p className="text-2xl font-bold text-gray-900">{latest}{unit}</p>
      )}
      {d && first !== latest ? (
        <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${d.positive ? 'text-green-600' : 'text-red-500'}`}>
          {d.positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {d.diff > 0 ? '+' : ''}{d.diff}{unit} from baseline
        </div>
      ) : first != null && latest != null && first === latest ? (
        <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-gray-400">
          <Minus className="w-3.5 h-3.5" /> No change
        </div>
      ) : first != null ? (
        <p className="text-xs text-gray-400 mt-1">Baseline: {first}{unit}</p>
      ) : null}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-blue-50 text-blue-700 border-blue-200',
  achieved: 'bg-green-50 text-green-700 border-green-200',
  abandoned: 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function StudentFilePage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const fileId = params.fileId as string;

  const [file, setFile] = useState<PatientFile | null>(null);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Entry modal state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProgressEntry | null>(null);
  const [entryForm, setEntryForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    wellbeing_score: '',
    academic_score: '',
    attendance_rate: '',
    behavioral_incidents: '',
    notes: '',
  });
  const [savingEntry, setSavingEntry] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<number | null>(null);

  // Goal state
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  // Case notes state
  const [caseNotes, setCaseNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  const fetchFile = useCallback(async () => {
    try {
      const res = await fetch(`/api/clinician/patient-files/${fileId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setFile(data.data.file);
        setEntries(data.data.entries);
        setGoals(data.data.goals);
        setCaseNotes(data.data.file.diagnoses_notes || '');
      } else {
        router.push('/clinician/patients');
      }
    } catch {
      router.push('/clinician/patients');
    } finally {
      setLoading(false);
    }
  }, [fileId, router]);

  useEffect(() => {
    fetchFile();
  }, [fetchFile]);

  function openAddEntry() {
    setEditingEntry(null);
    setEntryForm({
      entry_date: new Date().toISOString().split('T')[0],
      wellbeing_score: '', academic_score: '', attendance_rate: '',
      behavioral_incidents: '', notes: '',
    });
    setShowEntryModal(true);
  }

  function openEditEntry(entry: ProgressEntry) {
    setEditingEntry(entry);
    setEntryForm({
      entry_date: entry.entry_date,
      wellbeing_score: entry.wellbeing_score?.toString() ?? '',
      academic_score: entry.academic_score?.toString() ?? '',
      attendance_rate: entry.attendance_rate?.toString() ?? '',
      behavioral_incidents: entry.behavioral_incidents?.toString() ?? '',
      notes: entry.notes ?? '',
    });
    setShowEntryModal(true);
  }

  async function handleSaveEntry() {
    setSavingEntry(true);
    try {
      const payload = {
        entry_date: entryForm.entry_date,
        wellbeing_score: entryForm.wellbeing_score ? Number(entryForm.wellbeing_score) : null,
        academic_score: entryForm.academic_score ? Number(entryForm.academic_score) : null,
        attendance_rate: entryForm.attendance_rate ? Number(entryForm.attendance_rate) : null,
        behavioral_incidents: entryForm.behavioral_incidents ? Number(entryForm.behavioral_incidents) : null,
        notes: entryForm.notes || null,
      };

      const url = editingEntry
        ? `/api/clinician/patient-files/${fileId}/progress/${editingEntry.id}`
        : `/api/clinician/patient-files/${fileId}/progress`;
      const method = editingEntry ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowEntryModal(false);
        await fetchFile();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEntry(false);
    }
  }

  async function handleDeleteEntry(entryId: number) {
    try {
      await fetch(`/api/clinician/patient-files/${fileId}/progress/${entryId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setDeleteEntryId(null);
      await fetchFile();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddGoal() {
    if (!goalText.trim()) return;
    setSavingGoal(true);
    try {
      const res = await fetch(`/api/clinician/patient-files/${fileId}/goals`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_text: goalText, target_date: goalTargetDate || null }),
      });
      if (res.ok) {
        setShowGoalForm(false);
        setGoalText('');
        setGoalTargetDate('');
        await fetchFile();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleUpdateGoalStatus(goalId: number, status: 'active' | 'achieved' | 'abandoned') {
    try {
      await fetch(`/api/clinician/patient-files/${fileId}/goals/${goalId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await fetchFile();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteGoal(goalId: number) {
    try {
      await fetch(`/api/clinician/patient-files/${fileId}/goals/${goalId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await fetchFile();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await fetch(`/api/clinician/patient-files/${fileId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnoses_notes: caseNotes }),
      });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  }

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

  if (!user || !file) return null;

  const first = entries[0] ?? null;
  const latest = entries[entries.length - 1] ?? null;

  // Chart data
  const chartData = entries.map((e) => ({
    date: formatDate(e.entry_date),
    Wellbeing: e.wellbeing_score,
    'Academic Score': e.academic_score,
    'Attendance %': e.attendance_rate,
  }));

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
            const active = item.href === '/clinician/patients';
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
          <div className="px-8 py-4 flex items-center gap-4">
            <Link href="/clinician/patients">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-[#596ee5]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {file.profile_picture ? (
                  <img src={file.profile_picture} alt={file.full_name} className="w-10 h-10 object-cover" />
                ) : (
                  <span className="text-[#596ee5] font-bold">{file.full_name[0]}</span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{file.full_name}</h1>
                <p className="text-xs text-gray-500">
                  {calcAge(file.date_of_birth)}
                  {file.date_of_birth && file.total_sessions > 0 ? ' · ' : ''}
                  {file.total_sessions} session{file.total_sessions !== 1 ? 's' : ''} · File opened {formatDate(file.created_at)}
                </p>
              </div>
            </div>
            <Button
              onClick={openAddEntry}
              className="bg-[#596ee5] hover:bg-[#4558d4] text-white rounded-xl flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Progress Entry
            </Button>
          </div>

          {/* Tabs */}
          <div className="px-8 flex gap-1 border-t border-gray-100">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#596ee5] text-[#596ee5]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              {/* Metric Delta Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Wellbeing Score (1–10)"
                  first={first?.wellbeing_score ?? null}
                  latest={latest?.wellbeing_score ?? null}
                />
                <MetricCard
                  label="Academic Score"
                  first={first?.academic_score ?? null}
                  latest={latest?.academic_score ?? null}
                  unit="%"
                />
                <MetricCard
                  label="Attendance Rate"
                  first={first?.attendance_rate ?? null}
                  latest={latest?.attendance_rate ?? null}
                  unit="%"
                />
                <MetricCard
                  label="Behavioral Incidents"
                  first={first?.behavioral_incidents ?? null}
                  latest={latest?.behavioral_incidents ?? null}
                  invert
                />
              </div>

              {/* Progress Chart */}
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-5">Progress Over Time</h2>
                {entries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <BarChart2 className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-sm font-semibold text-gray-600">No progress data yet</p>
                    <p className="text-xs text-gray-400 mt-1 mb-4">Add the first entry to start tracking trends.</p>
                    <Button onClick={openAddEntry} className="bg-[#596ee5] hover:bg-[#4558d4] text-white rounded-xl text-sm">
                      <Plus className="w-4 h-4 mr-1" /> Add First Entry
                    </Button>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" domain={[0, 10]} tick={{ fontSize: 11 }} label={{ value: 'Wellbeing', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11 } }} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: '%', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: 11 } }} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="Wellbeing" stroke="#596ee5" strokeWidth={2} dot={{ r: 4 }} />
                      <Line yAxisId="right" type="monotone" dataKey="Academic Score" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                      <Line yAxisId="right" type="monotone" dataKey="Attendance %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}

          {/* PROGRESS LOG TAB */}
          {activeTab === 'log' && (
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">Progress Log</h2>
                <Button onClick={openAddEntry} className="bg-[#596ee5] hover:bg-[#4558d4] text-white rounded-xl text-sm flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add Entry
                </Button>
              </div>
              {entries.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-sm text-gray-500">No entries yet. Add the first progress entry above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs">Date</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Wellbeing</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Academic</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Attendance</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Incidents</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Notes</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {[...entries].reverse().map((entry, i) => (
                        <tr key={entry.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                          <td className="px-5 py-3 font-medium text-gray-800 whitespace-nowrap">{formatDate(entry.entry_date)}</td>
                          <td className="px-4 py-3 text-center">
                            {entry.wellbeing_score != null ? (
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${entry.wellbeing_score >= 7 ? 'bg-green-50 text-green-700' : entry.wellbeing_score >= 4 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600'}`}>
                                {entry.wellbeing_score}
                              </span>
                            ) : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">{entry.academic_score != null ? `${entry.academic_score}%` : <span className="text-gray-300">-</span>}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{entry.attendance_rate != null ? `${entry.attendance_rate}%` : <span className="text-gray-300">-</span>}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{entry.behavioral_incidents != null ? entry.behavioral_incidents : <span className="text-gray-300">-</span>}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{entry.notes || <span className="text-gray-300">-</span>}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditEntry(entry)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                <Pencil className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                              <button onClick={() => setDeleteEntryId(entry.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* GOALS TAB */}
          {activeTab === 'goals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Treatment Goals</h2>
                <Button
                  onClick={() => setShowGoalForm(true)}
                  className="bg-[#596ee5] hover:bg-[#4558d4] text-white rounded-xl text-sm flex items-center gap-1.5"
                >
                  <Target className="w-4 h-4" /> Add Goal
                </Button>
              </div>

              {showGoalForm && (
                <div className="rounded-2xl bg-white border border-[#596ee5]/30 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-gray-800 mb-3">New Goal</p>
                  <textarea
                    value={goalText}
                    onChange={(e) => setGoalText(e.target.value)}
                    placeholder="Describe the goal for this student..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#596ee5]/20 focus:border-[#596ee5] resize-none mb-3"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Target date (optional)</label>
                      <input
                        type="date"
                        value={goalTargetDate}
                        onChange={(e) => setGoalTargetDate(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#596ee5]/20 focus:border-[#596ee5]"
                      />
                    </div>
                    <div className="flex gap-2 mt-5">
                      <Button variant="secondary" onClick={() => { setShowGoalForm(false); setGoalText(''); setGoalTargetDate(''); }} className="rounded-xl">Cancel</Button>
                      <Button onClick={handleAddGoal} disabled={!goalText.trim() || savingGoal} className="bg-[#596ee5] hover:bg-[#4558d4] text-white rounded-xl">
                        {savingGoal ? 'Saving...' : 'Save Goal'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {goals.length === 0 && !showGoalForm ? (
                <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center shadow-sm">
                  <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No goals set yet. Add treatment goals to track progress toward outcomes.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {goals.map((goal) => (
                    <div key={goal.id} className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm flex items-start gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 mt-0.5 ${STATUS_STYLES[goal.status]}`}>
                        {goal.status}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm text-gray-800 ${goal.status === 'abandoned' ? 'line-through text-gray-400' : ''}`}>
                          {goal.goal_text}
                        </p>
                        {goal.target_date && (
                          <p className="text-xs text-gray-400 mt-1">Target: {formatDate(goal.target_date)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {goal.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleUpdateGoalStatus(goal.id, 'achieved')}
                              title="Mark achieved"
                              className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </button>
                            <button
                              onClick={() => handleUpdateGoalStatus(goal.id, 'abandoned')}
                              title="Abandon"
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4 text-gray-400" />
                            </button>
                          </>
                        )}
                        {goal.status !== 'active' && (
                          <button
                            onClick={() => handleUpdateGoalStatus(goal.id, 'active')}
                            title="Reactivate"
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <ChevronDown className="w-4 h-4 text-blue-400 rotate-180" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CASE NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Case Notes & Clinical Observations</h2>
                {notesSaved && (
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">Saved</span>
                )}
              </div>
              <textarea
                value={caseNotes}
                onChange={(e) => { setCaseNotes(e.target.value); setNotesSaved(false); }}
                placeholder="Enter clinical observations, diagnoses impressions, treatment notes, and other relevant information about this student..."
                rows={16}
                className="w-full rounded-xl border border-gray-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#596ee5]/20 focus:border-[#596ee5] resize-none font-mono leading-relaxed"
              />
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="bg-[#596ee5] hover:bg-[#4558d4] text-white rounded-xl"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Progress Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              {editingEntry ? 'Edit Progress Entry' : 'Add Progress Entry'}
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Record a snapshot of {file.full_name}&apos;s progress metrics.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Date *</label>
                <input
                  type="date"
                  value={entryForm.entry_date}
                  onChange={(e) => setEntryForm({ ...entryForm, entry_date: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#596ee5]/20 focus:border-[#596ee5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Wellbeing Score (1–10)</label>
                  <input
                    type="number" min="1" max="10" step="1"
                    value={entryForm.wellbeing_score}
                    onChange={(e) => setEntryForm({ ...entryForm, wellbeing_score: e.target.value })}
                    placeholder="e.g. 7"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#596ee5]/20 focus:border-[#596ee5]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Academic Score (%)</label>
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={entryForm.academic_score}
                    onChange={(e) => setEntryForm({ ...entryForm, academic_score: e.target.value })}
                    placeholder="e.g. 82.5"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#596ee5]/20 focus:border-[#596ee5]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Attendance Rate (%)</label>
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={entryForm.attendance_rate}
                    onChange={(e) => setEntryForm({ ...entryForm, attendance_rate: e.target.value })}
                    placeholder="e.g. 95"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#596ee5]/20 focus:border-[#596ee5]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Behavioral Incidents</label>
                  <input
                    type="number" min="0" step="1"
                    value={entryForm.behavioral_incidents}
                    onChange={(e) => setEntryForm({ ...entryForm, behavioral_incidents: e.target.value })}
                    placeholder="e.g. 2"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#596ee5]/20 focus:border-[#596ee5]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Notes (optional)</label>
                <textarea
                  value={entryForm.notes}
                  onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                  placeholder="Any observations for this entry..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#596ee5]/20 focus:border-[#596ee5] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowEntryModal(false)} className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleSaveEntry}
                disabled={!entryForm.entry_date || savingEntry}
                className="flex-1 bg-[#596ee5] hover:bg-[#4558d4] text-white rounded-xl"
              >
                {savingEntry ? 'Saving...' : editingEntry ? 'Update Entry' : 'Add Entry'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Entry Confirm */}
      {deleteEntryId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-2">Delete Entry?</h2>
            <p className="text-sm text-gray-500 mb-5">This progress entry will be permanently deleted and cannot be recovered.</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setDeleteEntryId(null)} className="flex-1 rounded-xl">Cancel</Button>
              <Button
                onClick={() => handleDeleteEntry(deleteEntryId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
