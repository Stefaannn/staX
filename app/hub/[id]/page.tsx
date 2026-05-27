"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useHub } from '../../../hooks/useHub';

export default function HubPage() {
  const router = useRouter();
  const { id: hubId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const {
    loading, hub, isMember, messages, members, requests, sending, onCooldown,
    sendMessage, acceptRequest, rejectRequest, kickMember, leaveHub, promoteToOwner,
  } = useHub(hubId, user?.userId ?? '');

  const [newMessage, setNewMessage] = useState('');
  const [confirmPromote, setConfirmPromote] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    await sendMessage(newMessage);
    setNewMessage('');
  };

  const handlePromote = async (member: { user_id: string; joined_at: string; discord_tag?: string }) => {
    await promoteToOwner(member);
    setConfirmPromote(null);
  };

  if (authLoading || loading) {
    return <div className="h-screen bg-slate-950 flex items-center justify-center text-white">Se încarcă hub-ul...</div>;
  }

  if (!hub) return null;

  if (!isMember) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <p className="text-slate-400">Nu ești member al acestui hub.</p>
          <button onClick={() => router.push('/dashboard')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-all">
            ← Înapoi la Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isCreator = hub.creator_id === user?.userId;

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-white transition-colors text-sm shrink-0">
            ← Dashboard
          </button>
          <div className="w-px h-5 bg-slate-700 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-bold text-white truncate">{hub.name}</h1>
            <p className="text-xs text-slate-500 truncate">{hub.game}</p>
          </div>
          <span className={`shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-full border ${hub.mode === 'ranked' ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' : 'bg-green-600/20 text-green-400 border-green-600/30'}`}>
            {hub.mode === 'ranked' ? '🏆 Ranked' : '🎉 4Fun'}
          </span>
        </div>

        {!isCreator && (
          <button onClick={leaveHub} className="shrink-0 text-xs text-red-400 hover:text-white hover:bg-red-600 px-3 py-1.5 rounded-lg border border-red-600/40 transition-all">
            Părăsește
          </button>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-52 border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0 overflow-y-auto">

          {/* Pending requests */}
          {isCreator && requests.length > 0 && (
            <div className="p-3 border-b border-slate-800">
              <p className="text-xs font-semibold text-yellow-400 mb-2 uppercase tracking-wide">
                Cereri ({requests.length})
              </p>
              <ul className="space-y-2">
                {requests.map(req => (
                  <li key={req.id} className="bg-slate-800 rounded-xl p-2.5 space-y-2">
                    <p className="text-sm text-slate-200 truncate font-medium">{req.discord_tag ?? req.user_id.slice(0, 8)}</p>
                    <div className="flex gap-1.5">
                      <button onClick={() => acceptRequest(req)}
                        className="flex-1 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all">
                        ✓ Accept
                      </button>
                      <button onClick={() => rejectRequest(req.id)}
                        className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg border border-red-600/30 transition-all">
                        ✗
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isCreator && requests.length === 0 && (
            <div className="p-3 border-b border-slate-800">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cereri</p>
              <p className="text-xs text-slate-600 mt-1">Nicio cerere nouă</p>
            </div>
          )}

          {/* Members */}
          <div className="p-3 flex-1">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              Membri ({members.length}/{hub.max_members})
            </p>
            <ul className="space-y-1">
              {members.map(m => (
                <li key={m.user_id} className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors group">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-sm text-slate-300 truncate">
                      {m.discord_tag ?? m.user_id.slice(0, 8)}
                      {m.user_id === hub.creator_id && <span className="text-yellow-500 ml-1 text-xs">★</span>}
                    </span>
                  </div>
                  {isCreator && m.user_id !== user?.userId && (
                    confirmPromote === m.user_id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handlePromote(m)}
                          className="text-xs px-1.5 py-0.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-semibold transition-all"
                        >
                          Da
                        </button>
                        <button
                          onClick={() => setConfirmPromote(null)}
                          className="text-xs px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-all"
                        >
                          Nu
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <button
                          onClick={() => setConfirmPromote(m.user_id)}
                          title="Promovează la Owner"
                          className="text-slate-600 hover:text-yellow-400 transition-colors text-sm leading-none"
                        >
                          ★
                        </button>
                        <button
                          onClick={() => kickMember(m.user_id)}
                          title="Scoate din hub"
                          className="text-slate-600 hover:text-red-400 transition-colors text-base leading-none"
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {messages.length === 0 && (
              <div className="text-center text-slate-600 text-sm pt-10">
                Niciun mesaj încă. Fii primul care scrie!
              </div>
            )}
            {messages.map((msg, i) => {
              if (msg.content.startsWith('⚙️')) {
                return (
                  <div key={msg.id} className="flex justify-center py-2">
                    <span className="text-xs text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full">{msg.content}</span>
                  </div>
                );
              }
              const isOwn = msg.user_id === user?.userId;
              const showHeader = i === 0 || messages[i - 1].user_id !== msg.user_id;
              return (
                <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${showHeader && i > 0 ? 'mt-3' : ''}`}>
                  {showHeader && (
                    <span className="text-xs text-slate-500 mb-1 px-1">
                      {msg.discord_tag ?? msg.user_id.slice(0, 8)}
                      {msg.user_id === hub.creator_id && <span className="text-yellow-500 ml-1">★</span>}
                    </span>
                  )}
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isOwn ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  {(i === messages.length - 1 || messages[i + 1].user_id !== msg.user_id) && (
                    <span className="text-xs text-slate-600 mt-0.5 px-1">
                      {new Date(msg.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="border-t border-slate-800 px-4 py-3 flex flex-col gap-2 shrink-0 bg-slate-900/40">
            <div className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Scrie un mesaj..."
                maxLength={500}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending || onCooldown}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm shrink-0"
              >
                {onCooldown ? '⏳ 3s' : 'Trimite'}
              </button>
            </div>
            <div className="flex justify-end">
              <span className={`text-xs ${newMessage.length > 450 ? 'text-red-400' : 'text-slate-600'}`}>
                {newMessage.length}/500
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
