'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from '@/components/auth/auth-modal';
import { Button } from '@/components/ui/button';
import { Star, Clock, ChevronLeft, Heart, Badge } from 'lucide-react';
import Link from 'next/link';

interface TherapistProfile {
  id: number;
  full_name: string;
  bio: string;
  specialization?: string;
  credentials?: string;
  years_of_experience: number;
  profile_picture?: string;
  average_rating: number;
  total_reviews: number;
  consultation_fee?: number;
  session_types?: string[];
  languages?: string[];
  availability: string;
  is_verified: boolean | number;
  email?: string;
  phone?: string;
  recent_reviews?: Array<{
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    patient_name: string;
    patient_picture?: string;
  }>;
}

function PublicNav({ onAuth }: { onAuth: () => void }) {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/patient/find-therapist">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">You Matter</span>
          </Link>
        </div>
        <button
          onClick={onAuth}
          className="bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm px-5 py-2 font-semibold transition-colors"
        >
          Sign Up / Log In
        </button>
      </div>
    </nav>
  );
}

export default function TherapistProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<TherapistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const therapistId = params.id;

  useEffect(() => {
    if (therapistId) fetchProfile();
  }, [therapistId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/patient/clinician/${therapistId}`);
      if (!res.ok) throw new Error('Failed to fetch therapist profile');
      const data = await res.json();
      setProfile(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = () => {
    if (authLoading) return;
    if (user) {
      router.push(`/patient/book-session?therapist_id=${therapistId}`);
    } else {
      setAuthModalOpen(true);
    }
  };

  const handleMessage = () => {
    if (authLoading) return;
    if (user) {
      router.push(`/patient/messages?therapist_id=${therapistId}`);
    } else {
      setAuthModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNav onAuth={() => setAuthModalOpen(true)} />
        <div className="flex items-center justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} preSelectedRole="patient" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNav onAuth={() => setAuthModalOpen(true)} />
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-red-600 mb-4">{error || 'Therapist not found'}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} preSelectedRole="patient" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav onAuth={() => setAuthModalOpen(true)} />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — Main profile info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Header card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="flex gap-6 mb-6">
                {profile.profile_picture ? (
                  <img
                    src={profile.profile_picture}
                    alt={profile.full_name}
                    className="h-24 w-24 rounded-2xl object-cover border-2 border-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-2xl bg-green-100 flex items-center justify-center border-2 border-gray-200 flex-shrink-0">
                    <span className="text-4xl font-bold text-green-700">{profile.full_name[0]}</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
                    {profile.is_verified && (
                      <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  {profile.credentials && (
                    <p className="text-gray-600 text-sm mb-3">{profile.credentials}</p>
                  )}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className={star <= Math.round(profile.average_rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {profile.average_rating.toFixed(1)} ({profile.total_reviews} reviews)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 flex-wrap text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Clock size={16} className="text-gray-400" />
                  {profile.years_of_experience}+ years experience
                </span>
                <span className="bg-green-50 text-green-700 font-medium px-3 py-1 rounded-full text-xs">
                  {profile.availability}
                </span>
              </div>
            </div>

            {/* About */}
            {profile.bio && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700 leading-relaxed text-sm">{profile.bio}</p>
              </div>
            )}

            {/* Specialization */}
            {profile.specialization && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Specialization</h2>
                <span className="inline-flex items-center rounded-xl bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                  {profile.specialization}
                </span>
              </div>
            )}

            {/* Session Types */}
            {profile.session_types && profile.session_types.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Session Formats</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.session_types.map((type) => (
                    <span
                      key={type}
                      className="inline-flex items-center rounded-xl bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 capitalize"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {profile.recent_reviews && profile.recent_reviews.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Patient Reviews</h2>
                <div className="space-y-4">
                  {profile.recent_reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {review.patient_picture ? (
                            <img src={review.patient_picture} alt={review.patient_name} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs font-semibold text-gray-500">{review.patient_name[0]}</span>
                            </div>
                          )}
                          <span className="font-medium text-gray-900 text-sm">{review.patient_name}</span>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} size={13} className={star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Booking sidebar */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sticky top-24">
              {!user?.organization_id && (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Session Pricing</h3>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {profile.consultation_fee ? `$${profile.consultation_fee.toFixed(0)}` : 'Contact for pricing'}
                  </p>
                  {profile.consultation_fee && (
                    <p className="text-sm text-gray-500 mb-6">per session · Insurance accepted</p>
                  )}
                </>
              )}

              <Button
                onClick={handleBooking}
                disabled={authLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl h-12 mb-3"
              >
                {authLoading ? 'Loading...' : 'Book a Session'}
              </Button>

              <Button
                variant="secondary"
                onClick={handleMessage}
                disabled={authLoading}
                className="w-full rounded-xl h-12"
              >
                Send Message
              </Button>

              {!user && !authLoading && (
                <p className="text-xs text-gray-500 text-center mt-3">
                  You&apos;ll be asked to sign in or create a free account.
                </p>
              )}
            </div>

            {/* Quick Info */}
            {(profile.email || profile.phone) && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 mb-4">Contact</h3>
                <div className="space-y-3 text-sm">
                  {profile.email && (
                    <div>
                      <p className="text-gray-500 text-xs uppercase font-semibold mb-0.5">Email</p>
                      <a href={`mailto:${profile.email}`} className="text-green-600 hover:underline break-all">
                        {profile.email}
                      </a>
                    </div>
                  )}
                  {profile.phone && (
                    <div>
                      <p className="text-gray-500 text-xs uppercase font-semibold mb-0.5">Phone</p>
                      <a href={`tel:${profile.phone}`} className="text-green-600 hover:underline">
                        {profile.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        preSelectedRole="patient"
      />
    </div>
  );
}
