'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Video, Phone, MessageSquare, ChevronLeft, User, Star } from 'lucide-react';

interface Session {
  id: number;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  meeting_link: string | null;
  notes: string | null;
  patient_name: string;
  patient_username: string;
  patient_picture: string | null;
  jitsi_room_id: string | null;
  feedback_rating: number | null;
  feedback_comment: string | null;
  feedback_would_recommend: number | null;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border border-blue-200',
  completed: 'bg-green-50 text-green-700 border border-green-200',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',
  no_show: 'bg-gray-100 text-gray-600 border border-gray-200',
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function ClinicianSessionsPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!token) return;
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/clinician/sessions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSessions(data.consultations || []);
        }
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [token]);

  const saveNotes = async (sessionId: number) => {
    setSavingNotes(true);
    try {
      await fetch('/api/clinician/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sessionId, notes: notesDraft }),
      });
      setSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, notes: notesDraft } : s)
      );
      setEditingNotes(null);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-black border-r-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const today = new Date().toISOString().split('T')[0];
  const upcoming = sessions.filter(s => s.status === 'scheduled' && s.scheduled_date >= today);
  const past = sessions.filter(s => s.status !== 'scheduled' || s.scheduled_date < today);
  const displayed = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/clinician">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Sessions</h1>
            <p className="text-sm text-gray-500">{sessions.length} total · {upcoming.length} upcoming</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-6 flex border-t border-gray-100">
          {(['upcoming', 'past'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Session List */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {displayed.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {tab === 'upcoming' ? 'No upcoming sessions' : 'No past sessions'}
            </h3>
            <p className="text-sm text-gray-500">
              {tab === 'upcoming'
                ? 'Patients will appear here once they book with you. Make sure your availability is set.'
                : 'Completed sessions will appear here.'}
            </p>
            {tab === 'upcoming' && (
              <Link href="/clinician/schedule" className="mt-4 inline-block">
                <Button className="bg-black hover:bg-gray-800 text-white rounded-lg font-semibold mt-4">
                  Set My Availability
                </Button>
              </Link>
            )}
          </div>
        ) : (
          displayed.map((session) => (
            <div
              key={session.id}
              className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {session.patient_picture ? (
                      <img src={session.patient_picture} alt={session.patient_name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{session.patient_name}</h3>
                      <span className="text-sm text-gray-400">@{session.patient_username}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[session.status] ?? STATUS_STYLES.scheduled}`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(session.scheduled_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatTime(session.scheduled_time)} · {session.duration_minutes} min
                      </span>
                    </div>

                    {session.notes && editingNotes !== session.id && (
                      <p className="mt-2 text-sm text-gray-500 italic">&ldquo;{session.notes}&rdquo;</p>
                    )}

                    {session.status === 'completed' && session.feedback_rating != null && (
                      <div className="mt-3 rounded-xl bg-yellow-50 border border-yellow-100 p-3">
                        <div className="flex items-center gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= session.feedback_rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                          {session.feedback_would_recommend != null && (
                            <span className="ml-2 text-xs font-medium text-gray-500">
                              {session.feedback_would_recommend ? 'Would recommend' : 'Would not recommend'}
                            </span>
                          )}
                        </div>
                        {session.feedback_comment && (
                          <p className="text-sm text-gray-600 italic">&ldquo;{session.feedback_comment}&rdquo;</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Join button for upcoming sessions */}
                {session.status === 'scheduled' && session.meeting_link && (
                  <a href={session.meeting_link} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                    <Button className="bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                      <Video className="w-4 h-4" /> Join
                    </Button>
                  </a>
                )}

                {/* Notes button for past sessions */}
                {session.status !== 'scheduled' && editingNotes !== session.id && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingNotes(session.id);
                      setNotesDraft(session.notes || '');
                    }}
                    className="flex-shrink-0 rounded-lg text-sm"
                  >
                    {session.notes ? 'Edit Notes' : 'Add Notes'}
                  </Button>
                )}
              </div>

              {/* Inline notes editor */}
              {editingNotes === session.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Session Notes</label>
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Add clinical notes, observations, or follow-up actions..."
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none resize-none"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => saveNotes(session.id)}
                      disabled={savingNotes}
                      className="bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-semibold"
                    >
                      {savingNotes ? 'Saving...' : 'Save Notes'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setEditingNotes(null)}
                      className="rounded-lg text-sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
