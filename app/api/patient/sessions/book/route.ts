import { NextResponse } from 'next/server';
import { getUserFromRequest, assertSameOrg } from '@/lib/auth';
import db from '@/lib/db';

interface BookSessionRequest {
  therapist_id: number | string;
  scheduled_date: string;
  scheduled_time: string;
  session_type: string;
  notes?: string;
  payment_intent_id?: string;
}

// POST /api/patient/sessions/book - Book a session
export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body: BookSessionRequest = await request.json();
    const { therapist_id, scheduled_date, scheduled_time, session_type, notes, payment_intent_id } = body;

    if (!therapist_id || !scheduled_date || !scheduled_time) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Get patient record
    const patientResult = await db.execute({
      sql: 'SELECT id, full_name FROM patients WHERE user_id = ?',
      args: [user.userId],
    });
    const patient = patientResult.rows[0] as unknown as { id: number; full_name: string } | undefined;

    if (!patient?.id) {
      return NextResponse.json({ success: false, error: 'Patient profile not found' }, { status: 404 });
    }

    // Get therapist record
    const therapistResult = await db.execute({
      sql: `SELECT t.id, t.full_name, u.organization_id
            FROM therapists t JOIN users u ON t.user_id = u.id
            WHERE t.id = ?`,
      args: [parseInt(String(therapist_id))],
    });
    const therapist = therapistResult.rows[0] as unknown as { id: number; full_name: string; organization_id: number | null } | undefined;

    if (!therapist?.id) {
      return NextResponse.json({ success: false, error: 'Therapist not found' }, { status: 404 });
    }

    if (!assertSameOrg(user.organization_id ?? null, therapist.organization_id ?? null)) {
      return NextResponse.json(
        { success: false, error: 'You can only book sessions with therapists in your organization.' },
        { status: 403 }
      );
    }

    // Map form session types to DB enum (video/chat/phone)
    const sessionTypeMap: Record<string, string> = {
      individual: 'video',
      couple: 'video',
      family: 'video',
      video: 'video',
      chat: 'chat',
      phone: 'phone',
    };
    const dbSessionType = sessionTypeMap[session_type] ?? 'video';

    // Check for double booking
    const conflictCheck = await db.execute({
      sql: `SELECT id FROM sessions
            WHERE therapist_id = ? AND scheduled_date = ? AND scheduled_time = ? AND status = 'scheduled'
            LIMIT 1`,
      args: [therapist.id, scheduled_date, scheduled_time],
    });
    if (conflictCheck.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'This time slot has already been booked. Please choose another time.' },
        { status: 409 }
      );
    }

    // Generate Jitsi meeting link
    const roomId = `youmatter-${therapist_id}-${user.userId}-${Date.now()}`;
    const jitsiLink = `https://meet.jit.si/${roomId}`;

    // Insert session
    const result = await db.execute({
      sql: `INSERT INTO sessions
              (patient_id, therapist_id, scheduled_date, scheduled_time, duration_minutes, session_type, notes, meeting_link, status, organization_id)
            VALUES (?, ?, ?, ?, 60, ?, ?, ?, 'scheduled', ?)`,
      args: [
        patient.id,
        therapist.id,
        scheduled_date,
        scheduled_time,
        dbSessionType,
        notes || null,
        jitsiLink,
        user.organization_id ?? null,
      ],
    });

    // lastInsertRowid is BigInt — convert to Number for JSON serialization
    const sessionId = Number(result.lastInsertRowid);

    return NextResponse.json({
      success: true,
      data: {
        session_id: sessionId,
        status: 'scheduled',
        meeting_link: jitsiLink,
      },
    });
  } catch (error) {
    console.error('Error booking session:', error);
    return NextResponse.json({ success: false, error: 'Failed to book session' }, { status: 500 });
  }
}
