import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// PATCH /api/clinician/patient-files/[id]/goals/[goalId]: update goal text, status, or target_date
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
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
    const { id, goalId } = await params;

    // Verify ownership via JOIN
    const ownerCheck = await db.execute({
      sql: `SELECT pg.id FROM patient_goals pg
            JOIN patient_files pf ON pg.patient_file_id = pf.id
            WHERE pg.id = ? AND pf.id = ? AND pf.therapist_id = ?`,
      args: [Number(goalId), Number(id), therapistId],
    });
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const body = await request.json();
    const { goal_text, status, target_date } = body;

    const validStatuses = ['active', 'achieved', 'abandoned'];
    if (status != null && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'status must be active, achieved, or abandoned' }, { status: 400 });
    }

    await db.execute({
      sql: `UPDATE patient_goals SET
              goal_text = COALESCE(?, goal_text),
              status = COALESCE(?, status),
              target_date = COALESCE(?, target_date),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [goal_text ?? null, status ?? null, target_date ?? null, Number(goalId)],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH goal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/clinician/patient-files/[id]/goals/[goalId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
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
    const { id, goalId } = await params;

    const ownerCheck = await db.execute({
      sql: `SELECT pg.id FROM patient_goals pg
            JOIN patient_files pf ON pg.patient_file_id = pf.id
            WHERE pg.id = ? AND pf.id = ? AND pf.therapist_id = ?`,
      args: [Number(goalId), Number(id), therapistId],
    });
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await db.execute({
      sql: 'DELETE FROM patient_goals WHERE id = ?',
      args: [Number(goalId)],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE goal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
