import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export interface Hub {
  id: string;
  name: string;
  game: string;
  mode: '4fun' | 'ranked';
  description: string | null;
  creator_id: string;
  join_type: 'free' | 'request';
  max_members: number;
}

export interface Message {
  id: string;
  hub_id: string;
  user_id: string;
  content: string;
  created_at: string;
  discord_tag?: string;
}

export interface Member {
  user_id: string;
  joined_at: string;
  discord_tag?: string;
}

export interface HubRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  discord_tag?: string;
}

export function useHub(hubId: string, userId: string) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hub, setHub] = useState<Hub | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<HubRequest[]>([]);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const profileCacheRef = useRef<Record<string, string>>({});

  const resolveTag = useCallback(async (uid: string): Promise<string> => {
    if (profileCacheRef.current[uid]) return profileCacheRef.current[uid];
    const { data } = await supabase.from('profiles').select('username, discord_tag').eq('id', uid).single();
    const tag = data?.username || data?.discord_tag || uid.slice(0, 8);
    profileCacheRef.current[uid] = tag;
    return tag;
  }, []);

  useEffect(() => {
    if (!userId || !hubId) return;

    const init = async () => {
      const { data: hubData } = await supabase.from('hubs').select('*').eq('id', hubId).single();
      if (!hubData) { router.push('/dashboard'); return; }
      setHub(hubData);

      const { data: membership } = await supabase
        .from('hub_members').select('user_id').eq('hub_id', hubId).eq('user_id', userId).single();

      const isCreator = userId === hubData.creator_id;
      if (isCreator && !membership) {
        await supabase.from('hub_members').insert({ hub_id: hubId, user_id: userId });
      }

      const member = !!membership || isCreator;
      setIsMember(member);
      if (!member) { setLoading(false); return; }

      const [{ data: membersData }, { data: messagesData }] = await Promise.all([
        supabase.from('hub_members').select('user_id, joined_at').eq('hub_id', hubId),
        supabase.from('hub_messages').select('*').eq('hub_id', hubId).order('created_at', { ascending: true }),
      ]);

      const allUids = [...new Set([
        ...(membersData?.map(m => m.user_id) ?? []),
        ...(messagesData?.map(m => m.user_id) ?? []),
      ])];

      if (allUids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, username, discord_tag').in('id', allUids);
        profiles?.forEach(p => { profileCacheRef.current[p.id] = p.username || p.discord_tag || p.id.slice(0, 8); });
      }

      setMembers(membersData?.map(m => ({ ...m, discord_tag: profileCacheRef.current[m.user_id] })) ?? []);
      setMessages(messagesData?.map(m => ({ ...m, discord_tag: profileCacheRef.current[m.user_id] })) ?? []);

      if (userId === hubData.creator_id) {
        const { data: reqData } = await supabase
          .from('hub_requests').select('*').eq('hub_id', hubId).eq('status', 'pending');

        const reqUids = reqData?.map(r => r.user_id) ?? [];
        if (reqUids.length > 0) {
          const { data: reqProfiles } = await supabase.from('profiles').select('id, username, discord_tag').in('id', reqUids);
          reqProfiles?.forEach(p => { profileCacheRef.current[p.id] = p.username || p.discord_tag || p.id.slice(0, 8); });
        }
        setRequests(reqData?.map(r => ({ ...r, discord_tag: profileCacheRef.current[r.user_id] })) ?? []);
      }

      setLoading(false);

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
  }, [hubId, userId, router, resolveTag]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || sending || cooldown > 0) return;
    setSending(true);
    await supabase.from('hub_messages').insert({ hub_id: hubId, user_id: userId, content: content.trim() });
    setSending(false);
    setCooldown(3);
    const interval = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const acceptRequest = async (req: HubRequest) => {
    await supabase.from('hub_requests').update({ status: 'accepted' }).eq('id', req.id);
    await supabase.from('hub_members').insert({ hub_id: hubId, user_id: req.user_id });
    setRequests(prev => prev.filter(r => r.id !== req.id));
    setMembers(prev => [...prev, { user_id: req.user_id, joined_at: new Date().toISOString(), discord_tag: req.discord_tag }]);
  };

  const rejectRequest = async (reqId: string) => {
    await supabase.from('hub_requests').update({ status: 'rejected' }).eq('id', reqId);
    setRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const kickMember = async (memberId: string) => {
    await supabase.from('hub_members').delete().eq('hub_id', hubId).eq('user_id', memberId);
    setMembers(prev => prev.filter(m => m.user_id !== memberId));
  };

  const leaveHub = async () => {
    const tag = await resolveTag(userId);
    await supabase.from('hub_messages').insert({
      hub_id: hubId,
      user_id: userId,
      content: `⚙️ ${tag} a părăsit hub-ul.`,
    });
    await supabase.from('hub_members').delete().eq('hub_id', hubId).eq('user_id', userId);
    router.push('/dashboard');
  };

  const promoteToOwner = async (member: Member) => {
    const newOwnerTag = member.discord_tag ?? member.user_id.slice(0, 8);
    await supabase.from('hubs').update({ creator_id: member.user_id }).eq('id', hubId);
    await supabase.from('hub_messages').insert({
      hub_id: hubId,
      user_id: userId,
      content: `⚙️ ${newOwnerTag} a fost promovat la Hub Owner!`,
    });
    setHub(prev => prev ? { ...prev, creator_id: member.user_id } : prev);
  };

  return {
    loading, hub, isMember, messages, members, requests, sending, cooldown,
    sendMessage, acceptRequest, rejectRequest, kickMember, leaveHub, promoteToOwner,
  };
}
