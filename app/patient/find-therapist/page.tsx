'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, Star, Clock, DollarSign, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface Therapist {
  id: number;
  full_name: string;
  specialization: string;
  years_of_experience: number;
  bio: string;
  profile_picture: string | null;
  average_rating: number;
  total_reviews: number;
  consultation_fee: number;
  is_verified: boolean;
}

const specialties = ['Anxiety', 'Depression', 'Trauma', 'Relationships', 'PTSD', 'Life Transitions', 'ADHD', 'Grief'];
const therapyTypes = ['CBT', 'Psychodynamic', 'Couples Therapy', 'Family Therapy', 'EMDR', 'Mindfulness', 'Humanistic'];
const languages = ['English', 'Spanish', 'French', 'Yoruba', 'Swahili', 'Twi', 'Igbo', 'Arabic'];

function TherapistCard({ therapist, isOrgBound }: { therapist: Therapist; isOrgBound: boolean }) {
  return (
    <Link href={`/patient/clinician/${therapist.id}`}>
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden hover:shadow-lg hover:border-green-300 transition-all duration-300 h-full flex flex-col group cursor-pointer">
        {/* Image */}
        <div className="relative h-40 bg-gradient-to-br from-green-100 to-green-50 overflow-hidden">
          {therapist.profile_picture ? (
            <img src={therapist.profile_picture} alt={therapist.full_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-5xl font-bold text-gray-300">{therapist.full_name[0]}</div>
            </div>
          )}
          {therapist.is_verified && (
            <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              ✓ Verified
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors">
              {therapist.full_name}
            </h3>
            <p className="text-sm text-gray-600">{therapist.specialization || 'Mental Health Professional'}</p>
          </div>

          {/* Specialties */}
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg font-medium">
              {therapist.specialization}
            </span>
          </div>

          {/* Rating & Reviews */}
          <div className="mb-4 flex items-center gap-2 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-gray-900">{therapist.average_rating.toFixed(1)}</span>
              <span className="text-xs text-gray-600">({therapist.total_reviews})</span>
            </div>
          </div>

          {/* Info Row */}
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{therapist.years_of_experience} years experience</span>
            </div>
            {!isOrgBound && (
              <div className="flex items-center gap-2 text-gray-700">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span>${therapist.consultation_fee}/session</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-600"></span>
              {therapist.is_verified ? 'Verified & Available' : 'Pending Verification'}
            </div>
          </div>

          {/* Button */}
          <Button className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold h-10 mt-auto">
            View Profile
          </Button>
        </div>
      </div>
    </Link>
  );
}

export default function FindTherapistPage() {
  const { user, token } = useAuth();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedTherapyTypes, setSelectedTherapyTypes] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 200]);
  const [minRating, setMinRating] = useState(0);
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  const isOrgBound = Boolean(user?.organization_id);

  // Fetch therapists from database
  useEffect(() => {
    fetchTherapists();
  }, []);

  useEffect(() => {
    if (!user?.organization_id || !token) {
      setOrganizationName(null);
      return;
    }
    fetch('/api/organization/context', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setOrganizationName(data.organization?.name || null))
      .catch(() => setOrganizationName(null));
  }, [user?.organization_id, token]);

  const fetchTherapists = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/patient/therapists');
      if (!response.ok) throw new Error('Failed to fetch therapists');
      const data = await response.json();
      setTherapists(data.data || []);
    } catch (error) {
      console.error('Error fetching therapists:', error);
      setTherapists([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter therapists
  const filteredTherapists = therapists.filter((therapist) => {
    const matchesSearch =
      searchTerm === '' ||
      therapist.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (therapist.specialization && therapist.specialization.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSpecialties = selectedSpecialties.length === 0 || selectedSpecialties.some((s) => therapist.specialization?.toLowerCase().includes(s.toLowerCase()));
    const matchesPrice = therapist.consultation_fee >= priceRange[0] && therapist.consultation_fee <= priceRange[1];
    const matchesRating = therapist.average_rating >= minRating;

    return matchesSearch && matchesSpecialties && matchesPrice && matchesRating;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 animate-spin rounded-full border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading therapists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/patient">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {isOrgBound && organizationName ? `Your ${organizationName} Therapists` : 'Find Your Therapist'}
              </h1>
              <p className="text-gray-600 mt-1">Connect with licensed professionals ready to support you</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-lg px-4 py-2.5 font-medium transition-all ${
                showFilters
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4 mr-2 inline" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
        {/* Sidebar Filters */}
        {showFilters && (
          <div className="w-64 flex-shrink-0">
            <div className="rounded-xl bg-white border border-gray-200 p-6 sticky top-28 space-y-6">
              <h2 className="font-bold text-gray-900">Filters</h2>

              {/* Price Range — not relevant for org-covered sessions */}
              {!isOrgBound && (
                <div>
                  <label className="text-sm font-semibold text-gray-900 block mb-3">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      className="w-full"
                    />
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* Minimum Rating */}
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-3">Minimum Rating</label>
                <div className="space-y-2">
                  {[0, 3, 4, 4.5].map((rating) => (
                    <label key={rating} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="rating"
                        checked={minRating === rating}
                        onChange={() => setMinRating(rating)}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-sm text-gray-700">{rating === 0 ? 'Any Rating' : `${rating}★+`}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Specialties */}
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-3">Specialties</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {specialties.map((specialty) => (
                    <label key={specialty} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSpecialties.includes(specialty)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSpecialties([...selectedSpecialties, specialty]);
                          } else {
                            setSelectedSpecialties(selectedSpecialties.filter((s) => s !== specialty));
                          }
                        }}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{specialty}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Therapy Types */}
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-3">Therapy Types</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {therapyTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTherapyTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTherapyTypes([...selectedTherapyTypes, type]);
                          } else {
                            setSelectedTherapyTypes(selectedTherapyTypes.filter((t) => t !== type));
                          }
                        }}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-3">Languages</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {languages.map((language) => (
                    <label key={language} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLanguages.includes(language)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLanguages([...selectedLanguages, language]);
                          } else {
                            setSelectedLanguages(selectedLanguages.filter((l) => l !== language));
                          }
                        }}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{language}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <Button
                onClick={() => {
                  setSelectedSpecialties([]);
                  setSelectedTherapyTypes([]);
                  setSelectedLanguages([]);
                  setPriceRange([0, 200]);
                  setMinRating(0);
                  setSearchTerm('');
                }}
                className="w-full bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-lg font-medium py-2"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          {filteredTherapists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No therapists found</h3>
              <p className="text-gray-600 mb-6">Try adjusting your search criteria or filters</p>
              <Button
                onClick={() => {
                  setSelectedSpecialties([]);
                  setSelectedTherapyTypes([]);
                  setSelectedLanguages([]);
                  setPriceRange([0, 200]);
                  setMinRating(0);
                  setSearchTerm('');
                }}
                className="bg-green-600 text-white hover:bg-green-700 rounded-lg px-6 py-2 font-medium"
              >
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-6">
                Found <span className="font-semibold text-gray-900">{filteredTherapists.length}</span> therapist
                {filteredTherapists.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTherapists.map((therapist) => (
                  <TherapistCard key={therapist.id} therapist={therapist} isOrgBound={isOrgBound} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
