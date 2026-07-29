import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

function jitsiRoomFromLink(meetingLink?: string | null): string | null {
  if (!meetingLink) return null;
  try {
    const url = new URL(meetingLink);
    const room = url.pathname.split('/').filter(Boolean).pop();
    return room || null;
  } catch {
    const parts = meetingLink.split('/').filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : null;
  }
}

// GET /api/therapist/sessions - Sessions for logged-in therapist
export async function GET(request: Request) {
  try {
    const currentUser = getUserFromRequest(request);

    if (!currentUser || !hasRole(currentUser, 'therapist')) {
      return NextResponse.json(
        { error: 'Unauthorized. Therapist access required.' },
        { status: 403 }
      );
    }

    const therapistRes = await db.execute({
      sql: 'SELECT id FROM therapists WHERE user_id = ?',
      args: [currentUser.userId],
    });
    const therapist = therapistRes.rows[0] as unknown as { id: number } | undefined;

    if (!therapist?.id) {
      return NextResponse.json(
        { error: 'Therapist profile not found' },
        { status: 404 }
      );
    }

    const sessionsRes = await db.execute({
      sql: `SELECT
              s.id,
              s.scheduled_date,
              s.scheduled_time,
              s.duration_minutes,
              s.status,
              s.meeting_link,
              s.notes,
              p.full_name as patient_name,
              p.username as patient_username,
              p.profile_picture as patient_picture,
              sf.rating as feedback_rating,
              sf.comment as feedback_comment,
              sf.would_recommend as feedback_would_recommend
            FROM sessions s
            JOIN patients p ON s.patient_id = p.id
            LEFT JOIN session_feedback sf ON sf.session_id = s.id
            WHERE s.therapist_id = ?
            ORDER BY s.scheduled_date ASC, s.scheduled_time ASC`,
      args: [therapist.id],
    });

    const consultations = sessionsRes.rows.map((row: any) => ({
      ...row,
      jitsi_room_id: jitsiRoomFromLink(row.meeting_link),
      therapist_name: undefined,
      professional_name: undefined,
    }));

    // Meeting page expects { consultations: [...] }
    return NextResponse.json({
      success: true,
      consultations,
    });
  } catch (error) {
    console.error('therapist sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/clinician/sessions - Update session notes or status
export async function PATCH(request: Request) {
  try {
    const currentUser = getUserFromRequest(request);

    if (!currentUser || !hasRole(currentUser, 'therapist')) {
      return NextResponse.json(
        { error: 'Unauthorized. Therapist access required.' },
        { status: 403 }
      );
    }

    const therapistRes = await db.execute({
      sql: 'SELECT id FROM therapists WHERE user_id = ?',
      args: [currentUser.userId],
    });
    const therapist = therapistRes.rows[0] as unknown as { id: number } | undefined;

    if (!therapist?.id) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { session_id, notes, status } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    // Confirm the session belongs to this therapist
    const sessionRes = await db.execute({
      sql: 'SELECT id FROM sessions WHERE id = ? AND therapist_id = ?',
      args: [session_id, therapist.id],
    });
    if (sessionRes.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (notes !== undefined && status !== undefined) {
      await db.execute({
        sql: 'UPDATE sessions SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [notes, status, session_id],
      });
    } else if (notes !== undefined) {
      await db.execute({
        sql: 'UPDATE sessions SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [notes, session_id],
      });
    } else if (status !== undefined) {
      await db.execute({
        sql: 'UPDATE sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [status, session_id],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

