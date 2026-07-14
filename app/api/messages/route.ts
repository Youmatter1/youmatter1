import { NextResponse } from 'next/server';
import { getUserFromRequest, assertSameOrg } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/messages — list conversations for the current user
export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role === 'patient') {
      const patientResult = await db.execute({
        sql: 'SELECT id FROM patients WHERE user_id = ?',
        args: [user.userId],
      });
      const patient = patientResult.rows[0] as unknown as { id: number } | undefined;
      if (!patient) return NextResponse.json({ conversations: [] });

      const result = await db.execute({
        sql: `SELECT
                c.id,
                c.last_message_at,
                t.full_name AS other_name,
                t.profile_picture AS other_picture,
                t.id AS therapist_id,
                (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = 0 AND sender_user_id != ?) AS unread_count
              FROM conversations c
              JOIN therapists t ON c.therapist_id = t.id
              WHERE c.patient_id = ?
              ORDER BY c.last_message_at DESC`,
        args: [user.userId, patient.id],
      });

      return NextResponse.json({ conversations: result.rows });
    }

    if (user.role === 'therapist') {
      const therapistResult = await db.execute({
        sql: 'SELECT id FROM therapists WHERE user_id = ?',
        args: [user.userId],
      });
      const therapist = therapistResult.rows[0] as unknown as { id: number } | undefined;
      if (!therapist) return NextResponse.json({ conversations: [] });

      const result = await db.execute({
        sql: `SELECT
                c.id,
                c.last_message_at,
                p.full_name AS other_name,
                p.profile_picture AS other_picture,
                p.id AS patient_id,
                (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = 0 AND sender_user_id != ?) AS unread_count
              FROM conversations c
              JOIN patients p ON c.patient_id = p.id
              WHERE c.therapist_id = ?
              ORDER BY c.last_message_at DESC`,
        args: [user.userId, therapist.id],
      });

      return NextResponse.json({ conversations: result.rows });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/messages — start or find a conversation
// Body: { therapist_id: number }  (called by patients only)
export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { therapist_id } = await request.json();
    if (!therapist_id) {
      return NextResponse.json({ error: 'therapist_id required' }, { status: 400 });
    }

    const patientResult = await db.execute({
      sql: 'SELECT id FROM patients WHERE user_id = ?',
      args: [user.userId],
    });
    const patient = patientResult.rows[0] as unknown as { id: number } | undefined;
    if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });

    const therapistResult = await db.execute({
      sql: `SELECT t.id, u.organization_id
            FROM therapists t JOIN users u ON t.user_id = u.id
            WHERE t.id = ?`,
      args: [parseInt(String(therapist_id))],
    });
    const therapistRow = therapistResult.rows[0] as unknown as { id: number; organization_id: number | null } | undefined;
    if (!therapistRow) {
      return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });
    }

    if (!assertSameOrg(user.organization_id ?? null, therapistRow.organization_id ?? null)) {
      return NextResponse.json(
        { error: 'You can only message therapists in your organization.' },
        { status: 403 }
      );
    }

    // Independent (B2C) patients must have booked a session with this
    // therapist before messaging them — prevents messaging before paying for
    // a session. Org-bound members are exempt (seats already cover access).
    if (!user.organization_id) {
      const sessionCheck = await db.execute({
        sql: 'SELECT id FROM sessions WHERE patient_id = ? AND therapist_id = ? LIMIT 1',
        args: [patient.id, therapistRow.id],
      });
      if (sessionCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Book a session with this therapist before sending a message.' },
          { status: 403 }
        );
      }
    }

    // Find existing or create new
    const existing = await db.execute({
      sql: 'SELECT id FROM conversations WHERE patient_id = ? AND therapist_id = ?',
      args: [patient.id, parseInt(String(therapist_id))],
    });

    if (existing.rows[0]) {
      const conv = existing.rows[0] as unknown as { id: number };
      return NextResponse.json({ conversation_id: conv.id });
    }

    const result = await db.execute({
      sql: 'INSERT INTO conversations (patient_id, therapist_id) VALUES (?, ?)',
      args: [patient.id, parseInt(String(therapist_id))],
    });

    return NextResponse.json({ conversation_id: Number(result.lastInsertRowid) }, { status: 201 });
  } catch (error) {
    console.error('POST /api/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
