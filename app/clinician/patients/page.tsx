'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home, Clock, Users, BarChart2, MessageSquare, Calendar, Settings, LogOut,
  TrendingUp, TrendingDown, Minus, Plus, Search, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PatientFile {
  id: number;
  patient_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  full_name: string;
  profile_picture: string | null;
  date_of_birth: string | null;
  total_sessions: number;
  total_entries: number;
  last_entry_date: string | null;
  wellbeing_trend: 'up' | 'down' | 'flat' | null;
}

interface AvailablePatient {
  id: number;
  full_name: string;
  profile_picture: string | null;
}

function calcAge(dob: string | null): string {
  if (!dob) return '-';
  const birth = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  return `${age} yrs`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No entries yet';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function PatientsPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [availablePatients, setAvailablePatients] = useState<AvailablePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    fetchFiles();
  }, []);

  async function fetchFiles() {
    try {
      const res = await fetch('/api/clinician/patient-files', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setFiles(data.data.files);
        setAvailablePatients(data.data.available_patients);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFile() {
    if (!selectedPatientId) return;
    setCreating(true);
    try {
      const res = await fetch('/api/clinician/patient-files', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatientId }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setSelectedPatientId(null);
        router.push(`/clinician/patients/${data.data.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  const filtered = files.filter((f) =>
    f.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
              <p className="text-sm text-gray-500 mt-0.5">{files.length} student file{files.length !== 1 ? 's' : ''}</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#596ee5] hover:bg-[#4558d4] text-white rounded-xl flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Patient File
            </Button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#596ee5]/20 focus:border-[#596ee5]"
            />
          </div>

          {/* Patient Files Grid */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center shadow-sm">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700">No patient files yet</p>
              <p className="text-sm text-gray-500 mt-1 mb-6">
                Create a patient file to start tracking student progress.
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#596ee5] hover:bg-[#4558d4] text-white rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Patient File
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((file) => (
                <div
                  key={file.id}
                  className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-[#596ee5]/20 transition-all"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#596ee5]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {file.profile_picture ? (
                        <img src={file.profile_picture} alt={file.full_name} className="w-12 h-12 object-cover" />
                      ) : (
                        <span className="text-[#596ee5] font-bold text-lg">{file.full_name[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{file.full_name}</p>
                      <p className="text-xs text-gray-500">{calcAge(file.date_of_birth)}</p>
                    </div>
                    {file.wellbeing_trend === 'up' && (
                      <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                    {file.wellbeing_trend === 'down' && (
                      <TrendingDown className="w-5 h-5 text-red-400 flex-shrink-0" />
                    )}
                    {file.wellbeing_trend === 'flat' && (
                      <Minus className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Sessions</p>
                      <p className="text-lg font-bold text-gray-900">{file.total_sessions}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Progress Entries</p>
                      <p className="text-lg font-bold text-gray-900">{file.total_entries}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      Last entry: {formatDate(file.last_entry_date)}
                    </span>
                  </div>

                  <Link href={`/clinician/patients/${file.id}`}>
                    <Button variant="secondary" className="w-full rounded-xl text-sm">
                      View Patient File
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Patient File Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">New Patient File</h2>
            <p className="text-sm text-gray-500 mb-5">Select a student to create a progress file for.</p>

            {availablePatients.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">
                  All students with sessions already have patient files, or no sessions have been booked yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
                {availablePatients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                      selectedPatientId === p.id
                        ? 'border-[#596ee5] bg-[#596ee5]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#596ee5]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.profile_picture ? (
                        <img src={p.profile_picture} alt={p.full_name} className="w-9 h-9 object-cover" />
                      ) : (
                        <span className="text-[#596ee5] font-semibold text-sm">{p.full_name[0]}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{p.full_name}</span>
                    {selectedPatientId === p.id && (
                      <span className="ml-auto w-4 h-4 rounded-full bg-[#596ee5] flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => { setShowCreateModal(false); setSelectedPatientId(null); }}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFile}
                disabled={!selectedPatientId || creating}
                className="flex-1 bg-[#596ee5] hover:bg-[#4558d4] text-white rounded-xl"
              >
                {creating ? 'Creating...' : 'Create File'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
