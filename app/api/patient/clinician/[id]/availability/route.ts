import { NextResponse } from 'next/server';
import { getUserFromRequest, assertSameOrg } from '@/lib/auth';
import db from '@/lib/db';

function generateSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [startH] = startTime.split(':').map(Number);
  const [endH] = endTime.split(':').map(Number);
  for (let h = startH; h < endH; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return slots;
}

// GET /api/patient/clinician/[id]/availability
// Returns real available time slots for the next 14 days based on the therapist's schedule,
// excluding slots already booked by other patients.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const therapistId = parseInt(id);

    if (!therapistId) {
      return NextResponse.json({ error: 'Invalid therapist ID' }, { status: 400 });
    }

    // Verify therapist exists and is verified
    const therapistRes = await db.execute({
      sql: `SELECT t.id, t.is_verified, u.organization_id
            FROM therapists t JOIN users u ON t.user_id = u.id
            WHERE t.id = ?`,
      args: [therapistId],
    });
    const therapist = therapistRes.rows[0] as unknown as { id: number; is_verified: number; organization_id: number | null } | undefined;

    if (!therapist) {
      return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });
    }

    const currentUser = getUserFromRequest(request);
    if (!assertSameOrg(currentUser?.organization_id ?? null, therapist.organization_id ?? null)) {
      return NextResponse.json({ error: 'You do not have access to this therapist' }, { status: 403 });
    }

    // Get therapist's weekly schedule
    const schedulesRes = await db.execute({
      sql: `SELECT day_of_week, start_time, end_time
            FROM availability_schedules
            WHERE therapist_id = ? AND is_available = 1
            ORDER BY day_of_week, start_time`,
      args: [therapistId],
    });

    const schedules = schedulesRes.rows as unknown as Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
    }>;

    // If no schedule set, return empty — no fake data
    if (schedules.length === 0) {
      return NextResponse.json({ success: true, data: [], noSchedule: true });
    }

    // Get existing booked sessions for this therapist in the next 14 days
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 14);

    const todayStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const bookedRes = await db.execute({
      sql: `SELECT scheduled_date, scheduled_time
            FROM sessions
            WHERE therapist_id = ?
              AND scheduled_date >= ?
              AND scheduled_date <= ?
              AND status = 'scheduled'`,
      args: [therapistId, todayStr, endDateStr],
    });

    const bookedSet = new Set(
      (bookedRes.rows as unknown as Array<{ scheduled_date: string; scheduled_time: string }>).map(
        (r) => `${r.scheduled_date}|${r.scheduled_time}`
      )
    );

    // Build day_of_week → slots map from schedule
    const scheduleMap = new Map<number, string[]>();
    for (const s of schedules) {
      const existing = scheduleMap.get(s.day_of_week) || [];
      scheduleMap.set(s.day_of_week, [...existing, ...generateSlots(s.start_time, s.end_time)]);
    }

    // Generate available slots for the next 14 days
    const availableSlots: Array<{ date: string; time: string; available: boolean }> = [];

    for (let day = 1; day <= 14; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);

      const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
      const dateStr = date.toISOString().split('T')[0];

      const slots = scheduleMap.get(dayOfWeek);
      if (!slots) continue;

      for (const time of slots) {
        const key = `${dateStr}|${time}`;
        availableSlots.push({
          date: dateStr,
          time,
          available: !bookedSet.has(key),
        });
      }
    }

    return NextResponse.json({ success: true, data: availableSlots });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}
