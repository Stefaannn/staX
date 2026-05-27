import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Hub {
  id: string;
  name: string;
  game: string;
  mode: '4fun' | 'ranked';
  description: string | null;
  creator_id: string;
  created_at: string;
  join_type: 'free' | 'request';
  max_members: number;
}

export interface CreateHubData {
  name: string;
  game: string;
  mode: '4fun' | 'ranked';
  description: string;
  joinType: 'free' | 'request';
  maxMembers: number;
}

export function useHubs(userId: string) {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [memberships, setMemberships] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    await supabase.from('hubs').delete()
      .not('empty_since', 'is', null)
      .lt('empty_since', new Date(Date.now() - 3600_000).toISOString());

    const [{ data: hubsData }, { data: allMembers }, { data: userMemberships }, { data: userRequests }] =
      await Promise.all([
        supabase.from('hubs').select('*').order('created_at', { ascending: false }),
        supabase.from('hub_members').select('hub_id'),
        supabase.from('hub_members').select('hub_id').eq('user_id', userId),
        supabase.from('hub_requests').select('hub_id').eq('user_id', userId).eq('status', 'pending'),
      ]);

    const counts: Record<string, number> = {};
    allMembers?.forEach(m => { counts[m.hub_id] = (counts[m.hub_id] ?? 0) + 1; });

    setHubs(hubsData ?? []);
    setMemberCounts(counts);
    setMemberships(new Set(userMemberships?.map(m => m.hub_id) ?? []));
    setPendingRequests(new Set(userRequests?.map(r => r.hub_id) ?? []));
    setLoading(false);
  }, [userId]);

  const createHub = async (data: CreateHubData) => {
    const { data: created } = await supabase.from('hubs').insert({
      name: data.name,
      game: data.game,
      mode: data.mode,
      description: data.description || null,
      creator_id: userId,
      join_type: data.joinType,
      max_members: data.maxMembers,
    }).select().single();

    if (created) {
      await supabase.from('hub_members').insert({ hub_id: created.id, user_id: userId });
    }
    await fetchAll();
  };

  const joinHub = async (hub: Hub) => {
    setJoining(hub.id);
    if (hub.join_type === 'free') {
      await supabase.from('hub_members').insert({ hub_id: hub.id, user_id: userId });
    } else {
      await supabase.from('hub_requests').insert({ hub_id: hub.id, user_id: userId });
    }
    await fetchAll();
    setJoining(null);
  };

  const deleteHub = async (hubId: string) => {
    await supabase.from('hubs').delete().eq('id', hubId);
    await fetchAll();
  };

  return { hubs, memberCounts, memberships, pendingRequests, loading, joining, fetchAll, createHub, joinHub, deleteHub };
}
