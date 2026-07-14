'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Send, ChevronLeft, User, MessageSquare } from 'lucide-react';

interface Conversation {
  id: number;
  other_name: string;
  other_picture: string | null;
  therapist_id: number;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: number;
  content: string;
  sender_user_id: number;
  sender_role: string;
  is_read: number;
  created_at: string;
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMessageTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function PatientMessagesPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initTherapistId = searchParams.get('therapist_id');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoadingConvs(false);
    }
  }, [token]);

  const fetchMessages = useCallback(async (convId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/messages/${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    if (token) fetchConversations();
  }, [token, fetchConversations]);

  // If redirected here from therapist profile with ?therapist_id=X, start/find conversation
  useEffect(() => {
    if (!token || !initTherapistId || loadingConvs) return;
    const existing = conversations.find(c => String(c.therapist_id) === initTherapistId);
    if (existing) {
      setActiveConvId(existing.id);
      return;
    }
    // Create new conversation
    setStartError(null);
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ therapist_id: parseInt(initTherapistId) }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setStartError(data.error || 'Unable to start conversation.');
          return;
        }
        if (data.conversation_id) {
          fetchConversations();
          setActiveConvId(data.conversation_id);
        }
      })
      .catch(() => setStartError('Unable to start conversation.'));
  }, [token, initTherapistId, loadingConvs]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId || !token) return;
    setLoadingMsgs(true);
    fetchMessages(activeConvId).finally(() => setLoadingMsgs(false));

    // Poll every 3 seconds
    pollRef.current = setInterval(() => {
      fetchMessages(activeConvId);
      fetchConversations();
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeConvId, token, fetchMessages, fetchConversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConvId || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    try {
      const res = await fetch(`/api/messages/${activeConvId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        await fetchMessages(activeConvId);
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-black border-r-transparent" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar: conversation list */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-200 flex items-center gap-3">
          <Link href="/patient">
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Messages</h1>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-black border-r-transparent" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              No conversations yet. Visit a therapist&apos;s profile to start chatting.
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full text-left px-4 py-4 flex items-start gap-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  activeConvId === conv.id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {conv.other_picture ? (
                    <img src={conv.other_picture} alt={conv.other_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm text-gray-900 truncate">{conv.other_name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{formatTime(conv.last_message_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 truncate">{conv.last_message || 'No messages yet'}</p>
                    {conv.unread_count > 0 && (
                      <span className="ml-1 flex-shrink-0 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main: message thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConv ? (
          <>
            {/* Thread header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                {activeConv.other_picture ? (
                  <img src={activeConv.other_picture} alt={activeConv.other_name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{activeConv.other_name}</p>
                <p className="text-xs text-gray-500">Therapist</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-black border-r-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-12">
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map(msg => {
                  const isOwn = msg.sender_user_id === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isOwn
                            ? 'bg-black text-white rounded-br-sm'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-gray-300' : 'text-gray-400'}`}>
                          {formatMessageTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 px-4 py-3">
              <div className="flex items-end gap-3 max-w-3xl mx-auto">
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200/50"
                  style={{ maxHeight: '120px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="flex-shrink-0 w-10 h-10 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : startError ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-500 px-6 text-center">
            <MessageSquare className="w-12 h-12 text-gray-200" />
            <p className="text-sm font-medium text-gray-700">{startError}</p>
            <Link href="/patient/find-therapist" className="text-sm font-semibold text-green-700 hover:text-green-800 underline">
              Find a therapist to book with
            </Link>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400">
            <MessageSquare className="w-12 h-12 text-gray-200" />
            <p className="text-sm">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientMessagesPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-black border-r-transparent" />
      </div>
    }>
      <PatientMessagesPage />
    </Suspense>
  );
}