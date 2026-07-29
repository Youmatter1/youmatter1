import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { feedbackQueries } from '@/lib/db';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseJsonArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string') as string[];
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

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
      sql: `SELECT t.*, u.email
            FROM therapists t
            JOIN users u ON t.user_id = u.id
            WHERE t.user_id = ?`,
      args: [currentUser.userId],
    });
    const therapist = therapistRes.rows[0] as any;

    if (!therapist) {
      return NextResponse.json(
        { error: 'Therapist profile not found' },
        { status: 404 }
      );
    }

    const therapistId = Number(therapist.id);

    const [
      totalSessionsRes,
      scheduledSessionsRes,
      completedSessionsRes,
      cancelledSessionsRes,
      activePatientsRes,
      todaysSessionsRes,
      todaySessionsRes,
      upcomingSessionsRes,
      feedbackStatsRes,
    ] = await Promise.all([
      db.execute({ sql: `SELECT COUNT(*) as count FROM sessions WHERE therapist_id = ?`, args: [therapistId] }),
      db.execute({ sql: `SELECT COUNT(*) as count FROM sessions WHERE therapist_id = ? AND status = 'scheduled'`, args: [therapistId] }),
      db.execute({ sql: `SELECT COUNT(*) as count FROM sessions WHERE therapist_id = ? AND status = 'completed'`, args: [therapistId] }),
      db.execute({ sql: `SELECT COUNT(*) as count FROM sessions WHERE therapist_id = ? AND status = 'cancelled'`, args: [therapistId] }),
      db.execute({ sql: `SELECT COUNT(DISTINCT patient_id) as count FROM sessions WHERE therapist_id = ?`, args: [therapistId] }),
      db.execute({ sql: `SELECT COUNT(*) as count FROM sessions WHERE therapist_id = ? AND scheduled_date = date('now')`, args: [therapistId] }),
      db.execute({
        sql: `SELECT 
                s.id,
                s.scheduled_date,
                s.scheduled_time,
                s.duration_minutes,
                s.status,
                s.meeting_link,
                p.full_name as patient_name,
                p.username as patient_username,
                p.profile_picture as patient_picture
              FROM sessions s
              JOIN patients p ON s.patient_id = p.id
              WHERE s.therapist_id = ?
                AND s.scheduled_date = date('now')
              ORDER BY s.scheduled_time ASC`,
        args: [therapistId],
      }),
      db.execute({
        sql: `SELECT 
                s.id,
                s.scheduled_date,
                s.scheduled_time,
                s.duration_minutes,
                s.status,
                s.meeting_link,
                p.full_name as patient_name,
                p.username as patient_username,
                p.profile_picture as patient_picture
              FROM sessions s
              JOIN patients p ON s.patient_id = p.id
              WHERE s.therapist_id = ?
                AND s.scheduled_date >= date('now')
                AND s.status = 'scheduled'
              ORDER BY s.scheduled_date ASC, s.scheduled_time ASC
              LIMIT 20`,
        args: [therapistId],
      }),
      feedbackQueries.getAggregateForTherapist(currentUser.userId),
    ]);

    const specializations =
      parseJsonArray(therapist.specializations_json).length > 0
        ? parseJsonArray(therapist.specializations_json)
        : therapist.specialization
          ? [String(therapist.specialization)]
          : [];

    const feedbackStats = feedbackStatsRes as any;
    const totalReviews = Number(feedbackStats?.total_reviews || 0);
    const recommendResponses = Number(feedbackStats?.recommend_responses || 0);

    return NextResponse.json({
      success: true,
      data: {
        therapist: {
          id: therapistId,
          name: therapist.full_name,
          specializations,
          credentials: therapist.credentials || therapist.license_number || undefined,
          experience: therapist.years_of_experience || 0,
          rating: therapist.average_rating || 0,
          total_reviews: therapist.total_reviews || 0,
          stripe_account_id: therapist.stripe_account_id || undefined,
        },
        stats: {
          totalSessions: Number((totalSessionsRes.rows[0] as any)?.count || 0),
          scheduledSessions: Number((scheduledSessionsRes.rows[0] as any)?.count || 0),
          completedSessions: Number((completedSessionsRes.rows[0] as any)?.count || 0),
          cancelledSessions: Number((cancelledSessionsRes.rows[0] as any)?.count || 0),
          activePatients: Number((activePatientsRes.rows[0] as any)?.count || 0),
          todaysSessions: Number((todaysSessionsRes.rows[0] as any)?.count || 0),
        },
        feedback: {
          averageRating: totalReviews > 0 ? Number(Number(feedbackStats.average_rating).toFixed(1)) : 0,
          totalReviews,
          recommendPercent: recommendResponses > 0
            ? Math.round((Number(feedbackStats.recommend_count) / recommendResponses) * 100)
            : null,
        },
        todaySessions: todaySessionsRes.rows,
        upcomingSessions: upcomingSessionsRes.rows,
      },
    });
  } catch (error) {
    console.error('therapist dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

