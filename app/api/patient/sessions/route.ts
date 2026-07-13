import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import db from '@/lib/db';

// GET /api/patient/sessions - Get sessions for the patient
export async function GET(request: Request) {
  try {
    const currentUser = getUserFromRequest(request);

    if (!currentUser || !hasRole(currentUser, 'patient')) {
      return NextResponse.json(
        { error: 'Unauthorized. Patient access required.' },
        { status: 403 }
      );
    }

    const patientRes = await db.execute({
      sql: 'SELECT id FROM patients WHERE user_id = ?',
      args: [currentUser.userId]
    });
    const patient = patientRes.rows[0] as unknown as { id: number } | undefined;

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient profile not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    let query = `
      SELECT 
        s.id,
        s.scheduled_date,
        s.scheduled_time,
        s.duration_minutes,
        s.status,
        s.meeting_link,
        s.notes,
        t.full_name as therapist_name,
        u.email as therapist_email
      FROM sessions s
      JOIN therapists t ON s.therapist_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE s.patient_id = ?
    `;

    const params: any[] = [patient.id];

    if (currentUser.organization_id) {
      query += ' AND s.organization_id = ?';
      params.push(currentUser.organization_id);
    }

    if (date) {
      query += ' AND s.scheduled_date = ?';
      params.push(date);
    }

    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }

    query += ' ORDER BY s.scheduled_date ASC, s.scheduled_time ASC';

    const sessionsRes = await db.execute({
      sql: query,
      args: params
    });

    return NextResponse.json({
      success: true,
      data: sessionsRes.rows,
    });
  } catch (error) {
    console.error('Get patient sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}