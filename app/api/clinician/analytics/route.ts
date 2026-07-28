import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/clinician/analytics: aggregate progress analytics for all of the therapist's patients
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

    const [
      totalStudentsRes,
      avgSessionsRes,
      allEntriesRes,
      monthlyAvgRes,
      goalsDistRes,
    ] = await Promise.all([
      // 1. Total students with patient files
      db.execute({
        sql: 'SELECT COUNT(*) as total_students FROM patient_files WHERE therapist_id = ?',
        args: [therapistId],
      }),

      // 2. Avg sessions per student
      db.execute({
        sql: `SELECT AVG(session_count) as avg_sessions FROM (
                SELECT COUNT(s.id) as session_count
                FROM patient_files pf
                LEFT JOIN sessions s ON s.patient_id = pf.patient_id AND s.therapist_id = pf.therapist_id
                WHERE pf.therapist_id = ?
                GROUP BY pf.id
              )`,
        args: [therapistId],
      }),

      // 3. All progress entries (compute first vs latest per patient in JS)
      db.execute({
        sql: `SELECT pe.patient_file_id, pe.entry_date, pe.wellbeing_score,
                     pe.academic_score, pe.attendance_rate, pe.behavioral_incidents,
                     p.full_name
              FROM progress_entries pe
              JOIN patient_files pf ON pe.patient_file_id = pf.id
              JOIN patients p ON p.id = pf.patient_id
              WHERE pf.therapist_id = ?
              ORDER BY pe.patient_file_id, pe.entry_date ASC`,
        args: [therapistId],
      }),

      // 4. Monthly averages for trend charts
      db.execute({
        sql: `SELECT strftime('%Y-%m', pe.entry_date) as month,
                     AVG(pe.wellbeing_score) as avg_wellbeing,
                     AVG(pe.academic_score) as avg_academic,
                     AVG(pe.attendance_rate) as avg_attendance
              FROM progress_entries pe
              JOIN patient_files pf ON pe.patient_file_id = pf.id
              WHERE pf.therapist_id = ?
              GROUP BY month
              ORDER BY month ASC`,
        args: [therapistId],
      }),

      // 5. Goals achievement distribution
      db.execute({
        sql: `SELECT status, COUNT(*) as count
              FROM patient_goals pg
              JOIN patient_files pf ON pg.patient_file_id = pf.id
              WHERE pf.therapist_id = ?
              GROUP BY status`,
        args: [therapistId],
      }),
    ]);

    const totalStudents = Number((totalStudentsRes.rows[0] as any)?.total_students ?? 0);
    const avgSessions = Number((avgSessionsRes.rows[0] as any)?.avg_sessions ?? 0);

    // Group entries by patient_file_id to compute per-student first vs latest
    const entriesByFile: Record<number, any[]> = {};
    for (const row of allEntriesRes.rows as any[]) {
      const fid = Number(row.patient_file_id);
      if (!entriesByFile[fid]) entriesByFile[fid] = [];
      entriesByFile[fid].push(row);
    }

    let wellbeingDeltaSum = 0;
    let wellbeingDeltaCount = 0;
    let studentsImprovingGrades = 0;
    const perStudentComparison: Array<{
      name: string;
      fileId: number;
      firstWellbeing: number | null;
      latestWellbeing: number | null;
      firstAcademic: number | null;
      latestAcademic: number | null;
      firstAttendance: number | null;
      latestAttendance: number | null;
      sessionsCount: number;
    }> = [];

    for (const [fidStr, entries] of Object.entries(entriesByFile)) {
      if (entries.length === 0) continue;
      const first = entries[0];
      const latest = entries[entries.length - 1];
      const name = first.full_name;

      const firstWellbeing = first.wellbeing_score != null ? Number(first.wellbeing_score) : null;
      const latestWellbeing = latest.wellbeing_score != null ? Number(latest.wellbeing_score) : null;
      const firstAcademic = first.academic_score != null ? Number(first.academic_score) : null;
      const latestAcademic = latest.academic_score != null ? Number(latest.academic_score) : null;
      const firstAttendance = first.attendance_rate != null ? Number(first.attendance_rate) : null;
      const latestAttendance = latest.attendance_rate != null ? Number(latest.attendance_rate) : null;

      if (firstWellbeing != null && latestWellbeing != null && entries.length >= 2) {
        wellbeingDeltaSum += latestWellbeing - firstWellbeing;
        wellbeingDeltaCount++;
      }
      if (firstAcademic != null && latestAcademic != null && entries.length >= 2) {
        if (latestAcademic > firstAcademic) studentsImprovingGrades++;
      }

      perStudentComparison.push({
        name,
        fileId: Number(fidStr),
        firstWellbeing,
        latestWellbeing,
        firstAcademic,
        latestAcademic,
        firstAttendance,
        latestAttendance,
        sessionsCount: 0, // filled below if needed
      });
    }

    const overallWellbeingImprovement =
      wellbeingDeltaCount > 0 ? Math.round((wellbeingDeltaSum / wellbeingDeltaCount) * 10) / 10 : 0;

    const monthlyTrend = (monthlyAvgRes.rows as any[]).map((r) => ({
      month: r.month,
      avg_wellbeing: r.avg_wellbeing != null ? Math.round(Number(r.avg_wellbeing) * 10) / 10 : null,
      avg_academic: r.avg_academic != null ? Math.round(Number(r.avg_academic) * 10) / 10 : null,
      avg_attendance: r.avg_attendance != null ? Math.round(Number(r.avg_attendance) * 10) / 10 : null,
    }));

    const goalsDistribution: Record<string, number> = { active: 0, achieved: 0, abandoned: 0 };
    for (const row of goalsDistRes.rows as any[]) {
      if (row.status in goalsDistribution) {
        goalsDistribution[row.status] = Number(row.count);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalStudents,
        avgSessionsPerStudent: Math.round(avgSessions * 10) / 10,
        overallWellbeingImprovement,
        studentsImprovingGrades,
        monthlyTrend,
        goalsDistribution,
        perStudentComparison,
      },
    });
  } catch (error) {
    console.error('GET analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
