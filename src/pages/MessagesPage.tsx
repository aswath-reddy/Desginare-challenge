import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { Flag, Lock, MessageSquare, Send } from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { EditorialImage, UserAvatar } from '@/src/components/EditorialImage';
import { EmptyState } from '@/src/components/EmptyState';
import { PageSkeleton } from '@/src/components/Skeletons';
import { ReportModal } from '@/src/components/ReportModal';
import { sendGroupMessage } from '@/src/lib/api';
import { formatRelativeTime } from '@/src/lib/date';
import { db, getUserFriendlyError } from '@/src/lib/firebase';
import { useAuth } from '@/src/context/AuthContext';
import type {
  ActivityRoster,
  ChatMessage,
  Conversation,
  Participant,
} from '@/src/types/plusone';

export function MessagesPage() {
  const { activityId: activeChatId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { firebaseUser, publicProfile } = useAuth();

  const [approvedMemberships, setApprovedMemberships] = useState<Participant[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roster, setRoster] = useState<ActivityRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(
      collection(db, 'participants'),
      where('userId', '==', firebaseUser.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const approved = snap.docs
          .map((d) => d.data() as Participant)
          .filter((p) => p.membershipStatus === 'approved');
        setApprovedMemberships(approved);
        if (approved.length === 0) setLoading(false);
      },
      (err) => {
        setSendError(getUserFriendlyError(err, 'Unable to load group chats.'));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  useEffect(() => {
    if (approvedMemberships.length === 0) {
      setConversations([]);
      return;
    }
    const convMap = new Map<string, Conversation>();
    const unsubs = approvedMemberships.map((m) =>
      onSnapshot(
        doc(db, 'conversations', m.activityId),
        (snap) => {
          if (snap.exists()) {
            convMap.set(m.activityId, snap.data() as Conversation);
          } else {
            convMap.delete(m.activityId);
          }
          const sorted = Array.from(convMap.values()).sort(
            (a, b) =>
              (b.lastMessageAt?.toMillis() ?? Date.now()) -
              (a.lastMessageAt?.toMillis() ?? Date.now())
          );
          setConversations(sorted);
          setLoading(false);
        },
        () => {
          convMap.delete(m.activityId);
          setLoading(false);
        }
      )
    );
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [approvedMemberships]);

  const selectedConversation = useMemo(() => {
    if (activeChatId) {
      return conversations.find((c) => c.conversationId === activeChatId) || null;
    }
    return conversations[0] || null;
  }, [activeChatId, conversations]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setRoster(null);
      return;
    }
    const convId = selectedConversation.conversationId;
    const unsubMsgs = onSnapshot(
      query(
        collection(db, 'conversations', convId, 'messages'),
        orderBy('createdAt', 'asc')
      ),
      (snap) => {
        setMessages(snap.docs.map((d) => d.data() as ChatMessage));
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      },
      (err) => {
        setSendError(getUserFriendlyError(err, 'Unable to load chat messages.'));
      }
    );

    const unsubRoster = onSnapshot(
      doc(db, 'activityRosters', convId),
      (snap) => setRoster(snap.exists() ? (snap.data() as ActivityRoster) : null),
      () => setRoster(null)
    );

    return () => {
      unsubMsgs();
      unsubRoster();
    };
  }, [selectedConversation]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConversation || !publicProfile || !messageText.trim() || sending) return;
    setSending(true);
    setSendError('');
    const text = messageText;
    try {
      await sendGroupMessage(selectedConversation.activityId, publicProfile, text, 'user');
      setMessageText('');
    } catch (err) {
      setSendError(getUserFriendlyError(err, 'Unable to send message.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#747474] mb-1">
              Group Chats
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em]">
              Messages
            </h1>
          </div>
          <p className="hidden sm:flex items-center gap-1.5 text-xs text-[#747474]">
            <Lock className="w-3.5 h-3.5" />
            Activity-only group chats · Approved members only
          </p>
        </div>

        {loading ? (
          <PageSkeleton />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No group chats yet"
            description="Group chats unlock automatically once a host approves your join request or when you publish a plan."
            actionLabel="Discover activities"
            onAction={() => navigate('/discover')}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[540px]">
            {/* Conversation List */}
            <aside className="lg:col-span-4 bg-white border border-[#E5E3DD] rounded-[20px] p-3 space-y-1.5 overflow-y-auto max-h-[600px]">
              {conversations.map((conv) => {
                const isSelected =
                  selectedConversation?.conversationId === conv.conversationId;
                return (
                  <button
                    key={conv.conversationId}
                    type="button"
                    onClick={() => navigate(`/messages/${conv.conversationId}`)}
                    className={`w-full text-left rounded-xl p-3 flex items-center gap-3 transition-colors ${
                      isSelected
                        ? 'bg-[#080808] text-[#F8F6F0]'
                        : 'hover:bg-[#F0EEE8]/70 text-[#080808]'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#F0EEE8] shrink-0">
                      <EditorialImage
                        src={conv.coverImageURL}
                        alt={conv.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-semibold truncate">
                        {conv.title}
                      </p>
                      <p
                        className={`text-xs truncate ${
                          isSelected ? 'text-[#F8F6F0]/70' : 'text-[#747474]'
                        }`}
                      >
                        {conv.lastMessagePreview || 'Open conversation'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </aside>

            {/* Active Chat Panel */}
            {selectedConversation && (
              <section className="lg:col-span-8 bg-white border border-[#E5E3DD] rounded-[20px] flex flex-col overflow-hidden h-[520px] sm:h-[600px]">
                <header className="px-5 py-4 border-b border-[#E5E3DD] flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      to={`/activities/${selectedConversation.activityId}`}
                      className="font-display font-semibold text-base hover:underline truncate block"
                    >
                      {selectedConversation.title}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-1">
                      {(roster?.previews || []).slice(0, 5).map((p) => (
                        <UserAvatar
                          key={p.uid}
                          src={p.photoURL}
                          name={p.displayName}
                          size="xs"
                        />
                      ))}
                      <span className="text-[11px] text-[#747474] ml-1 tabular-nums">
                        {roster?.previews.length || 1} in group
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/activities/${selectedConversation.activityId}`}
                    className="rounded-full border border-[#E5E3DD] px-3.5 py-1.5 text-xs font-medium hover:bg-[#F0EEE8] whitespace-nowrap"
                  >
                    View plan
                  </Link>
                </header>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 bg-[#F8F6F0]/40">
                  {messages.map((msg) => {
                    const isMine = msg.senderId === firebaseUser?.uid;
                    if (msg.messageType === 'system') {
                      return (
                        <div key={msg.messageId} className="text-center py-1">
                          <span className="text-[11px] text-[#747474] bg-[#F0EEE8] px-3 py-1 rounded-full">
                            {msg.messageText}
                          </span>
                        </div>
                      );
                    }
                    if (msg.messageType === 'announcement') {
                      return (
                        <div
                          key={msg.messageId}
                          className="bg-[#080808] text-[#F8F6F0] rounded-2xl p-4 text-xs space-y-1"
                        >
                          <p className="font-semibold">
                            Host Announcement · {msg.senderName}
                          </p>
                          <p className="leading-relaxed">{msg.messageText}</p>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={msg.messageId}
                        className={`flex items-end gap-2.5 group ${
                          isMine ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        {!isMine && (
                          <UserAvatar
                            src={msg.senderPhotoURL}
                            name={msg.senderName}
                            size="xs"
                          />
                        )}
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm space-y-1 ${
                            isMine
                              ? 'bg-[#080808] text-[#F8F6F0]'
                              : 'bg-white border border-[#E5E3DD] text-[#080808]'
                          }`}
                        >
                          {!isMine && (
                            <p className="text-[11px] font-semibold text-[#747474]">
                              {msg.senderName}
                            </p>
                          )}
                          <p className="leading-relaxed break-words">{msg.messageText}</p>
                          <p
                            className={`text-[10px] tabular-nums ${
                              isMine ? 'text-[#F8F6F0]/60' : 'text-[#747474]'
                            }`}
                          >
                            {formatRelativeTime(msg.createdAt)}
                          </p>
                        </div>
                        {!isMine && (
                          <button
                            type="button"
                            onClick={() => setReportTarget(msg)}
                            aria-label="Report message"
                            className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 p-1.5 text-[#747474] hover:text-[#991B1B] transition-opacity cursor-pointer"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {sendError && (
                  <p className="px-4 py-2 text-xs text-[#991B1B] bg-[#FEE2E2] border-t border-[#FECACA]">
                    {sendError}
                  </p>
                )}

                <form
                  onSubmit={handleSend}
                  className="p-3.5 border-t border-[#E5E3DD] bg-white flex items-center gap-2.5"
                >
                  <input
                    type="text"
                    maxLength={1500}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Coordinate meeting spot or say hello..."
                    aria-label="Write a message"
                    className="flex-1 rounded-full border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-2.5 text-sm focus:bg-white focus:border-[#080808] focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageText.trim()}
                    aria-label="Send message"
                    className="w-10 h-10 rounded-full bg-[#080808] text-[#F8F6F0] flex items-center justify-center hover:bg-[#222] active:scale-95 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </section>
            )}
          </div>
        )}
      </div>

      {reportTarget && selectedConversation && (
        <ReportModal
          isOpen={Boolean(reportTarget)}
          onClose={() => setReportTarget(null)}
          targetType="message"
          targetId={reportTarget.messageId}
          targetLabel={`Message from ${reportTarget.senderName}`}
          activityId={selectedConversation.activityId}
        />
      )}
    </AppShell>
  );
}
