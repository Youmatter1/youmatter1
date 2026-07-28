import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// PATCH /api/clinician/patient-files/[id]/progress/[entryId]: update a progress entry
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
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
    const { id, entryId } = await params;

    // Verify ownership via JOIN: never trust URL params alone
    const ownerCheck = await db.execute({
      sql: `SELECT pe.id FROM progress_entries pe
            JOIN patient_files pf ON pe.patient_file_id = pf.id
            WHERE pe.id = ? AND pf.id = ? AND pf.therapist_id = ?`,
      args: [Number(entryId), Number(id), therapistId],
    });
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Progress entry not found' }, { status: 404 });
    }

    const body = await request.json();
    const { entry_date, wellbeing_score, academic_score, attendance_rate, behavioral_incidents, notes } = body;

    if (wellbeing_score != null && (wellbeing_score < 1 || wellbeing_score > 10)) {
      return NextResponse.json({ error: 'wellbeing_score must be between 1 and 10' }, { status: 400 });
    }
    if (academic_score != null && (academic_score < 0 || academic_score > 100)) {
      return NextResponse.json({ error: 'academic_score must be between 0 and 100' }, { status: 400 });
    }
    if (attendance_rate != null && (attendance_rate < 0 || attendance_rate > 100)) {
      return NextResponse.json({ error: 'attendance_rate must be between 0 and 100' }, { status: 400 });
    }
    if (behavioral_incidents != null && behavioral_incidents < 0) {
      return NextResponse.json({ error: 'behavioral_incidents must be 0 or greater' }, { status: 400 });
    }

    await db.execute({
      sql: `UPDATE progress_entries SET
              entry_date = COALESCE(?, entry_date),
              wellbeing_score = COALESCE(?, wellbeing_score),
              academic_score = COALESCE(?, academic_score),
              attendance_rate = COALESCE(?, attendance_rate),
              behavioral_incidents = COALESCE(?, behavioral_incidents),
              notes = COALESCE(?, notes)
            WHERE id = ?`,
      args: [
        entry_date ?? null,
        wellbeing_score ?? null,
        academic_score ?? null,
        attendance_rate ?? null,
        behavioral_incidents ?? null,
        notes ?? null,
        Number(entryId),
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH progress entry error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/clinician/patient-files/[id]/progress/[entryId]: delete a progress entry
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
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
    const { id, entryId } = await params;

    // Verify ownership via JOIN
    const ownerCheck = await db.execute({
      sql: `SELECT pe.id FROM progress_entries pe
            JOIN patient_files pf ON pe.patient_file_id = pf.id
            WHERE pe.id = ? AND pf.id = ? AND pf.therapist_id = ?`,
      args: [Number(entryId), Number(id), therapistId],
    });
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Progress entry not found' }, { status: 404 });
    }

    await db.execute({
      sql: 'DELETE FROM progress_entries WHERE id = ?',
      args: [Number(entryId)],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE progress entry error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
