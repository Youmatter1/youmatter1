import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/clinician/patient-files/[id]: full patient file with entries and goals
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // File + patient info + session count (ownership enforced via therapist_id check)
    const fileRes = await db.execute({
      sql: `SELECT
              pf.id,
              pf.patient_id,
              pf.diagnoses_notes,
              pf.treatment_goals,
              pf.is_active,
              pf.created_at,
              pf.updated_at,
              p.full_name,
              p.profile_picture,
              p.date_of_birth,
              p.gender,
              COUNT(DISTINCT s.id) AS total_sessions
            FROM patient_files pf
            JOIN patients p ON p.id = pf.patient_id
            LEFT JOIN sessions s ON s.patient_id = pf.patient_id AND s.therapist_id = pf.therapist_id
            WHERE pf.id = ? AND pf.therapist_id = ?
            GROUP BY pf.id`,
      args: [fileId, therapistId],
    });

    if (fileRes.rows.length === 0) {
      return NextResponse.json({ error: 'Patient file not found' }, { status: 404 });
    }

    const [entriesRes, goalsRes] = await Promise.all([
      db.execute({
        sql: `SELECT id, entry_date, wellbeing_score, academic_score, attendance_rate,
                     behavioral_incidents, notes, created_at
              FROM progress_entries
              WHERE patient_file_id = ?
              ORDER BY entry_date ASC`,
        args: [fileId],
      }),
      db.execute({
        sql: `SELECT id, goal_text, status, target_date, created_at, updated_at
              FROM patient_goals
              WHERE patient_file_id = ?
              ORDER BY created_at ASC`,
        args: [fileId],
      }),
    ]);

    const rawFile = fileRes.rows[0] as any;
    const file = {
      id: Number(rawFile.id),
      patient_id: Number(rawFile.patient_id),
      diagnoses_notes: rawFile.diagnoses_notes,
      treatment_goals: rawFile.treatment_goals,
      is_active: Boolean(rawFile.is_active),
      created_at: rawFile.created_at,
      updated_at: rawFile.updated_at,
      full_name: rawFile.full_name,
      profile_picture: rawFile.profile_picture,
      date_of_birth: rawFile.date_of_birth,
      gender: rawFile.gender,
      total_sessions: Number(rawFile.total_sessions),
    };

    const entries = (entriesRes.rows as any[]).map((r) => ({
      id: Number(r.id),
      entry_date: r.entry_date,
      wellbeing_score: r.wellbeing_score != null ? Number(r.wellbeing_score) : null,
      academic_score: r.academic_score != null ? Number(r.academic_score) : null,
      attendance_rate: r.attendance_rate != null ? Number(r.attendance_rate) : null,
      behavioral_incidents: r.behavioral_incidents != null ? Number(r.behavioral_incidents) : null,
      notes: r.notes,
      created_at: r.created_at,
    }));

    const goals = (goalsRes.rows as any[]).map((r) => ({
      id: Number(r.id),
      goal_text: r.goal_text,
      status: r.status,
      target_date: r.target_date,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return NextResponse.json({ success: true, data: { file, entries, goals } });
  } catch (error) {
    console.error('GET patient-file detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/clinician/patient-files/[id]: update diagnoses_notes or treatment_goals
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await request.json();
    const { diagnoses_notes, treatment_goals } = body;

    if (diagnoses_notes === undefined && treatment_goals === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Verify ownership
    const ownerCheck = await db.execute({
      sql: 'SELECT id FROM patient_files WHERE id = ? AND therapist_id = ?',
      args: [fileId, therapistId],
    });
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Patient file not found' }, { status: 404 });
    }

    if (diagnoses_notes !== undefined && treatment_goals !== undefined) {
      await db.execute({
        sql: 'UPDATE patient_files SET diagnoses_notes = ?, treatment_goals = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [diagnoses_notes, treatment_goals, fileId],
      });
    } else if (diagnoses_notes !== undefined) {
      await db.execute({
        sql: 'UPDATE patient_files SET diagnoses_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [diagnoses_notes, fileId],
      });
    } else {
      await db.execute({
        sql: 'UPDATE patient_files SET treatment_goals = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [treatment_goals, fileId],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH patient-file error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
