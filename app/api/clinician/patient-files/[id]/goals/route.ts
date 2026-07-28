import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/clinician/patient-files/[id]/goals: add a goal
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || !hasRole(currentUser, 'therapist')) {
      return NextResponse.json({ error: 'Unauthorized. Therapist access required.' }, { status: 403 });
    }

    const therapistRes = await db.execute({
      sql: 'SELECT id FROM therapists WHERE user_id = ?',
      args: [currentUser.userId],
    });
    const therapist = therapistRes.rows[0] as unknown as { id: number } | undefined;
    if (!therapist?.id) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }
    const therapistId = Number(therapist.id);
    const { id } = await params;
    const fileId = Number(id);

    // Verify ownership
    const ownerCheck = await db.execute({
      sql: 'SELECT id FROM patient_files WHERE id = ? AND therapist_id = ?',
      args: [fileId, therapistId],
    });
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Patient file not found' }, { status: 404 });
    }

    const body = await request.json();
    const { goal_text, target_date } = body;
    if (!goal_text?.trim()) {
      return NextResponse.json({ error: 'goal_text is required' }, { status: 400 });
    }

    const result = await db.execute({
      sql: 'INSERT INTO patient_goals (patient_file_id, goal_text, target_date) VALUES (?, ?, ?)',
      args: [fileId, goal_text.trim(), target_date ?? null],
    });

    return NextResponse.json({ success: true, data: { id: Number(result.lastInsertRowid) } }, { status: 201 });
  } catch (error) {
    console.error('POST goal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
