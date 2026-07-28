'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Check, AlertCircle, Clock } from 'lucide-react';

const DAYS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:00`);
}

interface DaySchedule {
  enabled: boolean;
  start_time: string;
  end_time: string;
}

const DEFAULT_SCHEDULE: Record<number, DaySchedule> = {
  0: { enabled: false, start_time: '09:00', end_time: '17:00' },
  1: { enabled: false, start_time: '09:00', end_time: '17:00' },
  2: { enabled: false, start_time: '09:00', end_time: '17:00' },
  3: { enabled: false, start_time: '09:00', end_time: '17:00' },
  4: { enabled: false, start_time: '09:00', end_time: '17:00' },
  5: { enabled: false, start_time: '09:00', end_time: '17:00' },
  6: { enabled: false, start_time: '09:00', end_time: '17:00' },
};

function formatDisplayTime(time: string) {
  const [h] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:00 ${suffix}`;
}

export default function ClinicianSchedulePage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>(
    JSON.parse(JSON.stringify(DEFAULT_SCHEDULE))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!token) return;

    const fetchSchedule = async () => {
      try {
        const res = await fetch('/api/clinician/availability', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.data && data.data.length > 0) {
          const loaded: Record<number, DaySchedule> = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
          for (const row of data.data) {
            loaded[row.day_of_week] = {
              enabled: true,
              start_time: row.start_time,
              end_time: row.end_time,
            };
          }
          setSchedule(loaded);
        }
      } catch (err) {
        console.error('Failed to load schedule:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [token]);

  const toggleDay = (day: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
    setSaveStatus('idle');
  };

  const updateTime = (day: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (!token) return;

    // Validate: end_time must be after start_time for enabled days
    for (const day of DAYS) {
      const s = schedule[day.value];
      if (s.enabled && s.start_time >= s.end_time) {
        setErrorMsg(`${day.label}: end time must be after start time.`);
        setSaveStatus('error');
        return;
      }
    }

    setSaving(true);
    setSaveStatus('idle');
    setErrorMsg('');

    const schedules = DAYS
      .filter((d) => schedule[d.value].enabled)
      .map((d) => ({
        day_of_week: d.value,
        start_time: schedule[d.value].start_time,
        end_time: schedule[d.value].end_time,
        is_available: true,
      }));

    try {
      const res = await fetch('/api/clinician/availability', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schedules }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed');
      setSaveStatus('error');
    } finally {
      setSaving(false);
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

  const enabledCount = DAYS.filter((d) => schedule[d.value].enabled).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/clinician">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">My Availability</h1>
            <p className="text-sm text-gray-500">
              {enabledCount === 0
                ? 'No days set: patients cannot book yet'
                : `Available ${enabledCount} day${enabledCount > 1 ? 's' : ''} per week`}
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-semibold px-5"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            <Check className="w-4 h-4 flex-shrink-0" />
            Availability saved. Patients can now see your real schedule.
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-600">
                Toggle a day on to mark it as available. Patients will see 1-hour slots between your start and end times.
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {DAYS.map((day) => {
              const s = schedule[day.value];
              const isWeekend = day.value === 0 || day.value === 6;

              return (
                <div
                  key={day.value}
                  className={`px-6 py-4 transition-colors ${s.enabled ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleDay(day.value)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        s.enabled ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                          s.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* Day name */}
                    <span
                      className={`w-24 text-sm font-semibold ${
                        s.enabled ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {day.label}
                      {isWeekend && (
                        <span className="ml-1.5 text-xs font-normal text-gray-400">Weekend</span>
                      )}
                    </span>

                    {/* Time pickers */}
                    {s.enabled ? (
                      <div className="flex items-center gap-2 flex-1">
                        <select
                          value={s.start_time}
                          onChange={(e) => updateTime(day.value, 'start_time', e.target.value)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {formatDisplayTime(t)}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm text-gray-400">to</span>
                        <select
                          value={s.end_time}
                          onChange={(e) => updateTime(day.value, 'end_time', e.target.value)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {formatDisplayTime(t)}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-gray-400 ml-1">
                          ({Math.max(0, parseInt(s.end_time) - parseInt(s.start_time))} slots)
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 flex-1">Unavailable</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-center text-gray-400 pb-4">
          Changes apply to all future bookings. Already scheduled sessions are not affected.
        </p>
      </div>
    </div>
  );
}
