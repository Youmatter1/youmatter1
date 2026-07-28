import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getConversationAndVerify(conversationId: number, user: { userId: number; role: string }) {
  const result = await db.execute({
    sql: 'SELECT * FROM conversations WHERE id = ?',
    args: [conversationId],
  });
  const conv = result.rows[0] as unknown as {
    id: number;
    patient_id: number;
    therapist_id: number;
  } | undefined;

  if (!conv) return null;

  // Verify the current user is a participant
  if (user.role === 'patient') {
    const pr = await db.execute({ sql: 'SELECT id FROM patients WHERE user_id = ?', args: [user.userId] });
    const patient = pr.rows[0] as unknown as { id: number } | undefined;
    if (!patient || patient.id !== conv.patient_id) return null;
  } else if (user.role === 'therapist') {
    const tr = await db.execute({ sql: 'SELECT id FROM therapists WHERE user_id = ?', args: [user.userId] });
    const therapist = tr.rows[0] as unknown as { id: number } | undefined;
    if (!therapist || therapist.id !== conv.therapist_id) return null;
  } else {
    return null;
  }

  return conv;
}

// GET /api/messages/[conversationId]: fetch messages + mark incoming as read
export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId: convIdStr } = await params;
    const conversationId = parseInt(convIdStr);
    const conv = await getConversationAndVerify(conversationId, user);
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    // Mark all messages NOT sent by the current user as read
    await db.execute({
      sql: 'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_user_id != ? AND is_read = 0',
      args: [conversationId, user.userId],
    });

    const result = await db.execute({
      sql: `SELECT m.id, m.content, m.sender_user_id, m.is_read, m.created_at,
                   u.role AS sender_role
            FROM messages m
            JOIN users u ON m.sender_user_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC`,
      args: [conversationId],
    });

    return NextResponse.json({ messages: result.rows });
  } catch (error) {
    console.error('GET /api/messages/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/messages/[conversationId]: send a message
export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId: convIdStr } = await params;
    const conversationId = parseInt(convIdStr);
    const conv = await getConversationAndVerify(conversationId, user);
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 });
    }

    const result = await db.execute({
      sql: 'INSERT INTO messages (conversation_id, sender_user_id, content) VALUES (?, ?, ?)',
      args: [conversationId, user.userId, content.trim()],
    });

    // Update conversation timestamp
    await db.execute({
      sql: 'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [conversationId],
    });

    return NextResponse.json({
      id: Number(result.lastInsertRowid),
      conversation_id: conversationId,
      sender_user_id: user.userId,
      content: content.trim(),
      is_read: 0,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/messages/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
