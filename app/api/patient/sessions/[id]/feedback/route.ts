import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { feedbackQueries } from '@/lib/db';
import { validateRequest, sessionFeedbackSchema } from '@/lib/validation';
import db from '@/lib/db';

// POST /api/patient/sessions/[id]/feedback: patient leaves feedback on a
// completed session. One feedback row per session.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const sessionId = parseInt(id);

    const validation = await validateRequest(request, sessionFeedbackSchema);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }
    const { rating, comment, would_recommend } = validation.data;

    // Resolve the session and confirm it belongs to this patient
    const sessionRes = await db.execute({
      sql: `SELECT s.id, s.status, s.organization_id, p.user_id as patient_user_id, t.user_id as therapist_user_id
            FROM sessions s
            JOIN patients p ON s.patient_id = p.id
            JOIN therapists t ON s.therapist_id = t.id
            WHERE s.id = ?`,
      args: [sessionId],
    });
    const session = sessionRes.rows[0] as unknown as {
      id: number;
      status: string;
      organization_id: number | null;
      patient_user_id: number;
      therapist_user_id: number;
    } | undefined;

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (Number(session.patient_user_id) !== Number(user.userId)) {
      return NextResponse.json({ error: 'This session does not belong to you' }, { status: 403 });
    }
    if (session.status !== 'completed') {
      return NextResponse.json({ error: 'Feedback can only be left on completed sessions' }, { status: 400 });
    }

    const existing = await feedbackQueries.getBySessionId(sessionId);
    if (existing) {
      return NextResponse.json({ error: 'Feedback has already been submitted for this session' }, { status: 409 });
    }

    await feedbackQueries.createFeedback(
      sessionId,
      session.patient_user_id,
      session.therapist_user_id,
      session.organization_id,
      rating,
      comment || null,
      would_recommend === undefined ? null : would_recommend
    );

    return NextResponse.json({ success: true, message: 'Feedback submitted successfully' }, { status: 201 });
  } catch (error) {
    console.error('POST session feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/patient/sessions/[id]/feedback: retrieve feedback for a session.
// Accessible to either the patient or the therapist of that session.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const sessionId = parseInt(id);

    const sessionRes = await db.execute({
      sql: `SELECT s.id, p.user_id as patient_user_id, t.user_id as therapist_user_id
            FROM sessions s
            JOIN patients p ON s.patient_id = p.id
            JOIN therapists t ON s.therapist_id = t.id
            WHERE s.id = ?`,
      args: [sessionId],
    });
    const session = sessionRes.rows[0] as unknown as { id: number; patient_user_id: number; therapist_user_id: number } | undefined;

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (Number(session.patient_user_id) !== Number(user.userId) && Number(session.therapist_user_id) !== Number(user.userId)) {
      return NextResponse.json({ error: 'You do not have access to this session' }, { status: 403 });
    }

    const feedback = await feedbackQueries.getBySessionId(sessionId);
    return NextResponse.json({ success: true, data: feedback || null });
  } catch (error) {
    console.error('GET session feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
