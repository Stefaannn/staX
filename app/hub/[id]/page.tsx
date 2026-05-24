"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

interface Hub {
  id: string;
  name: string;
  game: string;
  mode: '4fun' | 'ranked';
  description: string | null;
  creator_id: string;
  join_type: 'free' | 'request';
  max_members: number;
}

interface Message {
  id: string;
  hub_id: string;
  user_id: string;
  content: string;
  created_at: string;
  discord_tag?: string;
}

interface Member {
  user_id: string;
  joined_at: string;
  discord_tag?: string;
}

interface HubRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  discord_tag?: string;
}

export default function HubPage() {
  const router = useRouter();
  const { id: hubId } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [hub, setHub] = useState<Hub | null>(null);
  const [isMember, setIsMember] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<HubRequest[]>([]);

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const profileCacheRef = useRef<Record<string, string>>({});

  const resolveTag = async (uid: string): Promise<string> => {
    if (profileCacheRef.current[uid]) return profileCacheRef.current[uid];
    const { data } = await supabase.from('profiles').select('discord_tag').eq('id', uid).single();
    const tag = data?.discord_tag ?? uid.slice(0, 8);
    profileCacheRef.current[uid] = tag;
    return tag;
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const uid = session.user.id;
      setUserId(uid);

      const { data: hubData } = await supabase.from('hubs').select('*').eq('id', hubId).single();
      if (!hubData) { router.push('/dashboard'); return; }
      setHub(hubData);

      const { data: membership } = await supabase
        .from('hub_members').select('user_id').eq('hub_id', hubId).eq('user_id', uid).single();

      const isCreator = uid === hubData.creator_id;

      // Auto-add creator to hub_members if missing (e.g. hub created before this table existed)
      if (isCreator && !membership) {
        await supabase.from('hub_members').insert({ hub_id: hubId, user_id: uid });
      }

      const member = !!membership || isCreator;
      setIsMember(member);

      if (!member) { setLoading(false); return; }

      // Fetch members, messages in parallel
      const [{ data: membersData }, { data: messagesData }] = await Promise.all([
        supabase.from('hub_members').select('user_id, joined_at').eq('hub_id', hubId),
        supabase.from('hub_messages').select('*').eq('hub_id', hubId).order('created_at', { ascending: true }),
      ]);

      // Resolve all profiles at once
      const allUids = [...new Set([
        ...(membersData?.map(m => m.user_id) ?? []),
        ...(messagesData?.map(m => m.user_id) ?? []),
      ])];

      if (allUids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, discord_tag').in('id', allUids);
        profiles?.forEach(p => { profileCacheRef.current[p.id] = p.discord_tag ?? p.id.slice(0, 8); });
      }

      setMembers(membersData?.map(m => ({ ...m, discord_tag: profileCacheRef.current[m.user_id] })) ?? []);
      setMessages(messagesData?.map(m => ({ ...m, discord_tag: profileCacheRef.current[m.user_id] })) ?? []);

      // Fetch pending requests for creator
      if (uid === hubData.creator_id) {
        const { data: reqData } = await supabase
          .from('hub_requests').select('*').eq('hub_id', hubId).eq('status', 'pending');

        const reqUids = reqData?.map(r => r.user_id) ?? [];
        if (reqUids.length > 0) {
          const { data: reqProfiles } = await supabase.from('profiles').select('id, discord_tag').in('id', reqUids);
          reqProfiles?.forEach(p => { profileCacheRef.current[p.id] = p.discord_tag ?? p.id.slice(0, 8); });
        }
        setRequests(reqData?.map(r => ({ ...r, discord_tag: profileCacheRef.current[r.user_id] })) ?? []);
      }

      setLoading(false);

      // Real-time subscription
      channelRef.current = supabase
        .channel(`hub-${hubId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'hub_messages',
          filter: `hub_id=eq.${hubId}`,
        }, async (payload) => {
          const msg = payload.new as Message;
          const tag = await resolveTag(msg.user_id);
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, discord_tag: tag }]);
        })
        .subscribe();
    };

    init();
    return () => { channelRef.current?.unsubscribe(); };
  }, [hubId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);
    await supabase.from('hub_messages').insert({ hub_id: hubId, user_id: userId, content: newMessage.trim() });
    setNewMessage('');
    setSending(false);
  };

  const handleAccept = async (req: HubRequest) => {
    await supabase.from('hub_requests').update({ status: 'accepted' }).eq('id', req.id);
    await supabase.from('hub_members').insert({ hub_id: hubId, user_id: req.user_id });
    setRequests(prev => prev.filter(r => r.id !== req.id));
    setMembers(prev => [...prev, { user_id: req.user_id, joined_at: new Date().toISOString(), discord_tag: req.discord_tag }]);
  };

  const handleReject = async (reqId: string) => {
    await supabase.from('hub_requests').update({ status: 'rejected' }).eq('id', reqId);
    setRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const handleLeave = async () => {
    await supabase.from('hub_members').delete().eq('hub_id', hubId).eq('user_id', userId);
    router.push('/dashboard');
  };

  if (loading) {
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

  const isCreator = hub.creator_id === userId;

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
          <button onClick={handleLeave} className="shrink-0 text-xs text-red-400 hover:text-white hover:bg-red-600 px-3 py-1.5 rounded-lg border border-red-600/40 transition-all">
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
                      <button onClick={() => handleAccept(req)}
                        className="flex-1 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all">
                        ✓ Accept
                      </button>
                      <button onClick={() => handleReject(req.id)}
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
                <li key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="text-sm text-slate-300 truncate">
                    {m.discord_tag ?? m.user_id.slice(0, 8)}
                    {m.user_id === hub.creator_id && <span className="text-yellow-500 ml-1 text-xs">★</span>}
                  </span>
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
              const isOwn = msg.user_id === userId;
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
          <form onSubmit={handleSend} className="border-t border-slate-800 px-4 py-3 flex gap-3 shrink-0 bg-slate-900/40">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Scrie un mesaj..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm shrink-0"
            >
              Trimite
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
