'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from '@/components/auth/auth-modal';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, AlertCircle, ChevronLeft } from 'lucide-react';
import { BookingPaymentModal } from '@/components/booking/booking-payment-modal';
import Link from 'next/link';

interface AvailableSlot {
  date: string;
  time: string;
  available: boolean;
}

interface therapist {
  id: number;
  full_name: string;
  specialization?: string;
  specializations?: string[];
  consultation_fee?: number;
  session_price?: number;
}

export default function BookSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const therapistId = searchParams.get('therapist_id');
  const { user, isLoading: authLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [therapist, settherapist] = useState<therapist | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [sessionType, setSessionType] = useState<'video' | 'chat' | 'phone'>('video');
  const [notes, setNotes] = useState('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      setAuthModalOpen(true);
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (therapistId) {
      fetchtherapistInfo();
      fetchAvailableSlots();
    } else {
      setError('No therapist selected');
      setLoading(false);
    }
  }, [therapistId]);

  const fetchtherapistInfo = async () => {
    try {
      const response = await fetch(`/api/patient/clinician/${therapistId}`);
      if (!response.ok) throw new Error('Failed to load therapist info');
      const data = await response.json();
      settherapist(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load therapist');
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const response = await fetch(`/api/patient/clinician/${therapistId}/availability`);
      if (!response.ok) throw new Error('Failed to load availability');
      const data = await response.json();
      setAvailableSlots(data.data || []);
    } catch (err) {
      console.error('Error loading availability:', err);
    } finally {
      setLoading(false);
    }
  };

  const isOrgBound = Boolean(user?.organization_id);

  const bookSession = async (paymentIntentId?: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/patient/sessions/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          therapist_id: therapistId,
          scheduled_date: selectedDate,
          scheduled_time: selectedTime,
          session_type: sessionType,
          notes,
          ...(paymentIntentId ? { payment_intent_id: paymentIntentId } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to book session');
      }

      router.push('/patient/sessions?booked=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time');
      return;
    }

    // Org-covered sessions skip payment entirely — the organization already
    // pays for this via seats/subscription, so book directly.
    if (isOrgBound) {
      bookSession();
      return;
    }

    // Independent (B2C) sessions require payment first — session is only
    // created after successful payment.
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setShowPaymentModal(false);
    await bookSession(paymentIntentId);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader therapistName={null} />
        <div className="flex items-center justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} preSelectedRole="patient" />
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader therapistName={null} />
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className="text-red-600 mb-4">{error || 'Therapist not found'}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} preSelectedRole="patient" />
      </div>
    );
  }

  const formatPrice = (consultationFee?: number, sessionPrice?: number) => {
    const price = consultationFee || sessionPrice;
    if (!price) return 'Contact for pricing';
    // If price > 1000, assume it's in cents; otherwise it's already in dollars
    return price > 1000 ? `$${(price / 100).toFixed(2)}` : `$${price.toFixed(2)}`;
  };

  const getAvailableTimesForDate = (date: string) => {
    return availableSlots
      .filter((slot) => slot.date === date && slot.available)
      .map((slot) => slot.time);
  };

  const availableDates = Array.from(new Set(availableSlots.map((s) => s.date))).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader therapistName={therapist.full_name} />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session Type */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <label className="block text-sm font-semibold text-black mb-4">
                Session Type
              </label>
              <div className="space-y-2">
                {([
                  { value: 'video', label: 'Video Session' },
                  { value: 'chat', label: 'Chat / Messaging' },
                  { value: 'phone', label: 'Phone Call' },
                ] as const).map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="session_type"
                      value={value}
                      checked={sessionType === value}
                      onChange={() => setSessionType(value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-black">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Selection */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <label className="block text-sm font-semibold text-black mb-4">
                <Calendar className="inline h-4 w-4 mr-2" />
                Select Date *
              </label>
              {availableDates.length === 0 ? (
                <p className="text-gray-600 text-sm">This therapist has not set their availability yet. Please check back later or contact them directly.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableDates.map((date) => (
                    <button
                      key={date}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedTime('');
                      }}
                      className={`p-3 rounded-2xl border-2 font-medium text-sm transition ${
                        selectedDate === date
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-white text-black hover:border-gray-300'
                      }`}
                    >
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div className="rounded-3xl border border-gray-200 bg-white p-6">
                <label className="block text-sm font-semibold text-black mb-4">
                  <Clock className="inline h-4 w-4 mr-2" />
                  Select Time *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {getAvailableTimesForDate(selectedDate).map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={`p-3 rounded-2xl border-2 font-medium text-sm transition ${
                        selectedTime === time
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-white text-black hover:border-gray-300'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <label className="block text-sm font-semibold text-black mb-3">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information you'd like to share with your therapist?"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300/20 resize-none"
                rows={4}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting || !selectedDate || !selectedTime}
              className="w-full bg-black hover:bg-gray-800 text-white font-semibold rounded-2xl h-12"
            >
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </Button>
          </form>
        </div>

        {/* Sidebar - Summary */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 h-fit sticky top-24">
          <h3 className="text-lg font-semibold text-black mb-4">Booking Summary</h3>

          <div className="space-y-4 border-b border-gray-200 pb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Therapist</p>
              <p className="font-medium text-black">{therapist.full_name}</p>
            </div>

            {(therapist.specialization || (therapist.specializations && therapist.specializations.length > 0)) && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Specialization</p>
                <p className="text-sm text-gray-700">
                  {therapist.specialization || (therapist.specializations?.slice(0, 2).join(', '))}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 py-4 border-b border-gray-200">
            {selectedDate && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Selected Date</p>
                <p className="font-medium text-black">
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}

            {selectedTime && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Selected Time</p>
                <p className="font-medium text-black">{selectedTime}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Session Type</p>
              <p className="font-medium text-black">
                {sessionType === 'video' ? 'Video Session' : sessionType === 'chat' ? 'Chat / Messaging' : 'Phone Call'}
              </p>
            </div>
          </div>

          {!isOrgBound && (
            <div className="pt-4">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Total Price</p>
              <p className="text-2xl font-bold text-black">
                {formatPrice(therapist.consultation_fee, therapist.session_price)}
              </p>
            </div>
          )}
        </div>
      </div>

      {therapist && !isOrgBound && (
        <BookingPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={(therapist.consultation_fee || therapist.session_price || 80) * 100}
          therapistName={therapist.full_name}
          therapistId={therapist.id}
          onSuccess={handlePaymentSuccess}
        />
      )}
      </div>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} preSelectedRole="patient" />
    </div>
  );
}

function PageHeader({ therapistName }: { therapistName: string | null }) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
        <Link href={therapistName ? '/patient/find-therapist' : '/'}>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Book a Session</h1>
          {therapistName && (
            <p className="text-sm text-gray-500">Schedule with {therapistName}</p>
          )}
        </div>
      </div>
    </div>
  );
}
