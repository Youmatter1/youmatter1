'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Calendar, Clock, Video, Phone, MessageSquare, ChevronLeft, Star, CheckCircle } from 'lucide-react';

interface Session {
  id: number;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  session_type: string | null;
  meeting_link: string | null;
  notes: string | null;
  therapist_name: string;
  therapist_email: string;
  has_feedback: number;
}

function FeedbackDialog({
  session,
  onClose,
  onSubmitted,
}: {
  session: Session;
  onClose: () => void;
  onSubmitted: (sessionId: number) => void;
}) {
  const { token } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('Please select a rating');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/patient/sessions/${session.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
          would_recommend: wouldRecommend === null ? undefined : wouldRecommend,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }
      onSubmitted(session.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent onClose={onClose}>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Leave Feedback</h2>
        <p className="text-sm text-gray-500 mb-6">Your session with {session.therapist_name}</p>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">{error}</div>
        )}

        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-900 mb-2">Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1"
              >
                <Star
                  className={`w-7 h-7 ${
                    star <= (hoverRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Comment <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            rows={3}
            maxLength={500}
            placeholder="How was your session?"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/500</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">Would you recommend this therapist?</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setWouldRecommend(true)}
              className={`flex-1 rounded-xl border-2 py-2 text-sm font-semibold transition ${
                wouldRecommend === true ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setWouldRecommend(false)}
              className={`flex-1 rounded-xl border-2 py-2 text-sm font-semibold transition ${
                wouldRecommend === false ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'
              }`}
            >
              No
            </button>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 font-semibold"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border border-blue-200',
  completed: 'bg-green-50 text-green-700 border border-green-200',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',
  no_show: 'bg-gray-100 text-gray-600 border border-gray-200',
};

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function SessionTypeIcon({ type }: { type: string | null }) {
  if (type === 'phone') return <Phone className="w-4 h-4" />;
  if (type === 'chat') return <MessageSquare className="w-4 h-4" />;
  return <Video className="w-4 h-4" />;
}

export default function PatientSessionsPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [feedbackSession, setFeedbackSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!token) return;

    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/patient/sessions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSessions(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [token]);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const today = new Date().toISOString().split('T')[0];
  const upcoming = sessions.filter(
    (s) => s.status === 'scheduled' && s.scheduled_date >= today
  );
  const past = sessions.filter(
    (s) => s.status !== 'scheduled' || s.scheduled_date < today
  );
  const displayed = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/patient">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Sessions</h1>
            <p className="text-sm text-gray-500">{sessions.length} total sessions</p>
          </div>
          <div className="ml-auto">
            <Link href="/patient/find-therapist">
              <Button className="bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">
                + Book New Session
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-6 flex gap-0 border-t border-gray-100">
          {(['upcoming', 'past'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-green-600 text-green-700'
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
            <p className="text-sm text-gray-500 mb-6">
              {tab === 'upcoming'
                ? 'Book a session with a therapist to get started.'
                : 'Your completed sessions will appear here.'}
            </p>
            {tab === 'upcoming' && (
              <Link href="/patient/find-therapist">
                <Button className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold">
                  Find a Therapist
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
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 font-bold text-lg">
                      {session.therapist_name.charAt(0)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{session.therapist_name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[session.status] ?? STATUS_STYLES.scheduled}`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{session.therapist_email}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(session.scheduled_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatTime(session.scheduled_time)} · {session.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1.5 capitalize">
                        <SessionTypeIcon type={session.session_type} />
                        {session.session_type || 'video'}
                      </span>
                    </div>

                    {session.notes && (
                      <p className="mt-3 text-sm text-gray-500 italic">&ldquo;{session.notes}&rdquo;</p>
                    )}
                  </div>
                </div>

                {/* Action */}
                {session.status === 'scheduled' && session.meeting_link && (
                  <a href={session.meeting_link} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                    <Button className="bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">
                      Join
                    </Button>
                  </a>
                )}
                {session.status === 'completed' && (
                  session.has_feedback ? (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-green-700 flex-shrink-0">
                      <CheckCircle className="w-4 h-4" />
                      Feedback submitted
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => setFeedbackSession(session)}
                      className="rounded-lg text-sm font-semibold flex-shrink-0"
                    >
                      Leave Feedback
                    </Button>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {feedbackSession && (
        <FeedbackDialog
          session={feedbackSession}
          onClose={() => setFeedbackSession(null)}
          onSubmitted={(sessionId) => {
            setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, has_feedback: 1 } : s)));
          }}
        />
      )}
    </div>
  );
}
