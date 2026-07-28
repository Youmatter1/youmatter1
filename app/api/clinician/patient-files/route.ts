import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/clinician/patient-files: list all patient files for the authed therapist
export async function GET(request: Request) {
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

    // All patient files with patient info, session count, and last entry date
    const filesRes = await db.execute({
      sql: `SELECT
              pf.id,
              pf.patient_id,
              pf.is_active,
              pf.created_at,
              pf.updated_at,
              p.full_name,
              p.profile_picture,
              p.date_of_birth,
              COUNT(DISTINCT s.id) AS total_sessions,
              COUNT(DISTINCT pe.id) AS total_entries,
              MAX(pe.entry_date) AS last_entry_date
            FROM patient_files pf
            JOIN patients p ON p.id = pf.patient_id
            LEFT JOIN sessions s ON s.patient_id = pf.patient_id AND s.therapist_id = pf.therapist_id
            LEFT JOIN progress_entries pe ON pe.patient_file_id = pf.id
            WHERE pf.therapist_id = ?
            GROUP BY pf.id
            ORDER BY p.full_name ASC`,
      args: [therapistId],
    });

    // Fetch last 2 wellbeing scores per file to compute trend direction
    const trendRes = await db.execute({
      sql: `SELECT pe.patient_file_id, pe.wellbeing_score, pe.entry_date
            FROM progress_entries pe
            JOIN patient_files pf ON pe.patient_file_id = pf.id
            WHERE pf.therapist_id = ?
            ORDER BY pe.patient_file_id, pe.entry_date DESC`,
      args: [therapistId],
    });

    // Build trend map: fileId -> 'up' | 'down' | 'flat' | null
    const trendMap: Record<number, string | null> = {};
    const seenCounts: Record<number, number[]> = {};
    for (const row of trendRes.rows as any[]) {
      const fid = Number(row.patient_file_id);
      if (!seenCounts[fid]) seenCounts[fid] = [];
      if (seenCounts[fid].length < 2 && row.wellbeing_score != null) {
        seenCounts[fid].push(Number(row.wellbeing_score));
      }
    }
    for (const [fid, scores] of Object.entries(seenCounts)) {
      if (scores.length < 2) {
        trendMap[Number(fid)] = null;
      } else {
        // scores[0] = latest, scores[1] = second latest
        trendMap[Number(fid)] = scores[0] > scores[1] ? 'up' : scores[0] < scores[1] ? 'down' : 'flat';
      }
    }

    // Fetch patients who have sessions with this therapist but no file yet (for create modal)
    const availableRes = await db.execute({
      sql: `SELECT DISTINCT p.id, p.full_name, p.profile_picture
            FROM sessions s
            JOIN patients p ON p.id = s.patient_id
            WHERE s.therapist_id = ?
              AND p.id NOT IN (
                SELECT patient_id FROM patient_files WHERE therapist_id = ?
              )
            ORDER BY p.full_name ASC`,
      args: [therapistId, therapistId],
    });

    const files = (filesRes.rows as any[]).map((row) => ({
      id: Number(row.id),
      patient_id: Number(row.patient_id),
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
      full_name: row.full_name,
      profile_picture: row.profile_picture,
      date_of_birth: row.date_of_birth,
      total_sessions: Number(row.total_sessions),
      total_entries: Number(row.total_entries),
      last_entry_date: row.last_entry_date,
      wellbeing_trend: trendMap[Number(row.id)] ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        files,
        available_patients: (availableRes.rows as any[]).map((r) => ({
          id: Number(r.id),
          full_name: r.full_name,
          profile_picture: r.profile_picture,
        })),
      },
    });
  } catch (error) {
    console.error('GET patient-files error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/clinician/patient-files: create a new patient file
export async function POST(request: Request) {
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

    const body = await request.json();
    const { patient_id } = body;
    if (!patient_id) {
      return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
    }

    // Verify patient exists
    const patientRes = await db.execute({
      sql: 'SELECT id FROM patients WHERE id = ?',
      args: [patient_id],
    });
    if (patientRes.rows.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // INSERT OR IGNORE handles the UNIQUE constraint gracefully
    await db.execute({
      sql: 'INSERT OR IGNORE INTO patient_files (therapist_id, patient_id) VALUES (?, ?)',
      args: [therapistId, patient_id],
    });

    const fileRes = await db.execute({
      sql: 'SELECT id FROM patient_files WHERE therapist_id = ? AND patient_id = ?',
      args: [therapistId, patient_id],
    });
    const file = fileRes.rows[0] as any;

    return NextResponse.json({ success: true, data: { id: Number(file.id) } }, { status: 201 });
  } catch (error) {
    console.error('POST patient-files error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
