import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/clinician/patient-files/[id]/progress: add a progress entry
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
    const { entry_date, wellbeing_score, academic_score, attendance_rate, behavioral_incidents, notes } = body;

    if (!entry_date) {
      return NextResponse.json({ error: 'entry_date is required' }, { status: 400 });
    }

    // Validate ranges
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

    const result = await db.execute({
      sql: `INSERT INTO progress_entries
              (patient_file_id, entry_date, wellbeing_score, academic_score, attendance_rate, behavioral_incidents, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        fileId,
        entry_date,
        wellbeing_score ?? null,
        academic_score ?? null,
        attendance_rate ?? null,
        behavioral_incidents ?? 0,
        notes ?? null,
      ],
    });

    return NextResponse.json({ success: true, data: { id: Number(result.lastInsertRowid) } }, { status: 201 });
  } catch (error) {
    console.error('POST progress entry error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
