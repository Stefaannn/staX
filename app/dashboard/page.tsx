"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const POPULAR_GAMES = [
  "League of Legends","Valorant","CS2","Dota 2","Fortnite",
  "Apex Legends","Overwatch 2","Rocket League","World of Warcraft",
  "Minecraft","PUBG","Rainbow Six Siege","Teamfight Tactics",
  "Hearthstone","Escape from Tarkov",
];

interface GameEntry { name: string; mode: '4fun' | 'ranked'; }

interface Hub {
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

export default function Dashboard() {
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [discordTag, setDiscordTag] = useState('');
  const [games, setGames] = useState<GameEntry[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);

  const [hubs, setHubs] = useState<Hub[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [memberships, setMemberships] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [hubsLoading, setHubsLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [filterGame, setFilterGame] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | '4fun' | 'ranked'>('all');
  const [hideFull, setHideFull] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');

  // Create hub modal
  const [showCreate, setShowCreate] = useState(false);
  const [hubName, setHubName] = useState('');
  const [hubGame, setHubGame] = useState('');
  const [hubMode, setHubMode] = useState<'4fun' | 'ranked'>('ranked');
  const [hubDesc, setHubDesc] = useState('');
  const [hubJoinType, setHubJoinType] = useState<'free' | 'request'>('free');
  const [hubMaxMembers, setHubMaxMembers] = useState(10);
  const [gameSuggestions, setGameSuggestions] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from('profiles').select('username, discord_tag, games').eq('id', session.user.id).single();
      if (profile) {
        setUsername(profile.username ?? '');
        setDiscordTag(profile.discord_tag ?? '');
        setGames(profile.games ?? []);
      }

      setLoading(false);
      await fetchAll(session.user.id);
    };
    init();
  }, [router]);

  const fetchAll = async (uid: string) => {
    setHubsLoading(true);

    // Sterge hub-urile goale de mai mult de 1 ora
    await supabase.from('hubs').delete()
      .not('empty_since', 'is', null)
      .lt('empty_since', new Date(Date.now() - 3600_000).toISOString());

    const [{ data: hubsData }, { data: allMembers }, { data: userMemberships }, { data: userRequests }] =
      await Promise.all([
        supabase.from('hubs').select('*').order('created_at', { ascending: false }),
        supabase.from('hub_members').select('hub_id'),
        supabase.from('hub_members').select('hub_id').eq('user_id', uid),
        supabase.from('hub_requests').select('hub_id').eq('user_id', uid).eq('status', 'pending'),
      ]);

    const counts: Record<string, number> = {};
    allMembers?.forEach(m => { counts[m.hub_id] = (counts[m.hub_id] ?? 0) + 1; });

    setHubs(hubsData ?? []);
    setMemberCounts(counts);
    setMemberships(new Set(userMemberships?.map(m => m.hub_id) ?? []));
    setPendingRequests(new Set(userRequests?.map(r => r.hub_id) ?? []));
    setHubsLoading(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleCreateHub = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hubName.trim() || !hubGame.trim()) return;
    setCreating(true);

    const { data } = await supabase.from('hubs').insert({
      name: hubName.trim(), game: hubGame.trim(), mode: hubMode,
      description: hubDesc.trim() || null, creator_id: userId,
      join_type: hubJoinType, max_members: hubMaxMembers,
    }).select().single();

    if (data) {
      await supabase.from('hub_members').insert({ hub_id: data.id, user_id: userId });
    }

    setHubName(''); setHubGame(''); setHubMode('ranked');
    setHubDesc(''); setHubJoinType('free'); setHubMaxMembers(10);
    setShowCreate(false);
    setCreating(false);
    fetchAll(userId);
  };

  const handleJoin = async (hub: Hub) => {
    setJoining(hub.id);
    if (hub.join_type === 'free') {
      await supabase.from('hub_members').insert({ hub_id: hub.id, user_id: userId });
    } else {
      await supabase.from('hub_requests').insert({ hub_id: hub.id, user_id: userId });
    }
    await fetchAll(userId);
    setJoining(null);
  };

  const handleDeleteHub = async (hubId: string) => {
    await supabase.from('hubs').delete().eq('id', hubId);
    fetchAll(userId);
  };

  const availableGames = [...new Set(hubs.map(h => h.game))].sort();
  const filteredSuggestions = POPULAR_GAMES.filter(g => g.toLowerCase().includes(hubGame.toLowerCase()));

  const filteredHubs = hubs
    .filter(hub => {
      if (searchName && !hub.name.toLowerCase().includes(searchName.toLowerCase())) return false;
      if (filterGame && hub.game !== filterGame) return false;
      if (filterMode !== 'all' && hub.mode !== filterMode) return false;
      if (hideFull && (memberCounts[hub.id] ?? 0) >= hub.max_members) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return (memberCounts[b.id] ?? 0) - (memberCounts[a.id] ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Se încarcă...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">STAX</span>

          <div className="flex items-center gap-3">
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all text-sm font-medium"
              >
                <span className="text-slate-300 font-semibold">{username ? `@${username}` : 'My Profile'}</span>
                {discordTag && <span className="text-[#5865F2] text-xs hidden sm:inline">{discordTag}</span>}
                <span className={`text-slate-500 text-xs transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 space-y-3">
                  {username && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <span className="text-slate-500">@</span><span>{username}</span>
                    </div>
                  )}
                  {discordTag && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span className="text-[#5865F2]">●</span><span>{discordTag}</span>
                    </div>
                  )}
                  {games.length > 0 ? (
                    <ul className="space-y-1.5">
                      {games.map((g, i) => (
                        <li key={i} className="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-1.5 text-sm">
                          <span className="text-slate-200">{g.name}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${g.mode === 'ranked' ? 'bg-blue-600/20 text-blue-400' : 'bg-green-600/20 text-green-400'}`}>
                            {g.mode === 'ranked' ? '🏆 Ranked' : '🎉 4Fun'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-slate-500 text-xs">Niciun joc adăugat.</p>}
                  <button
                    onClick={() => { setProfileOpen(false); router.push('/profile'); }}
                    className="w-full py-2 text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-600/40 transition-all font-medium"
                  >
                    ✏️ Editează Profilul
                  </button>
                </div>
              )}
            </div>

            <button onClick={handleLogout} className="px-3 py-2 text-sm text-red-400 hover:text-white hover:bg-red-600 border border-red-600/40 rounded-xl transition-all">
              Delogare
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto w-full px-4 py-6 flex-1 space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Hub-uri Active</h2>
            <p className="text-slate-500 text-sm mt-0.5">Găsește sau creează un grup de jucători</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all active:scale-95 text-sm"
          >
            + Creează Hub
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3">
          <span className="text-slate-400 text-sm font-medium shrink-0">Filtre:</span>

          <input
            type="text"
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            placeholder="Caută după nume..."
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all w-48"
          />

          <select
            value={filterGame}
            onChange={e => setFilterGame(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
          >
            <option value="">Toate jocurile</option>
            {availableGames.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            {(['all', 'ranked', '4fun'] as const).map(m => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className={`px-3 py-1.5 text-xs font-semibold transition-all ${filterMode === m ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {m === 'all' ? 'Toate' : m === 'ranked' ? '🏆 Ranked' : '🎉 4Fun'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setHideFull(v => !v)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${hideFull ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
          >
            {hideFull ? '✓ Ascund pline' : 'Ascunde pline'}
          </button>

          <div className="flex rounded-lg overflow-hidden border border-slate-700 ml-auto">
            {(['newest', 'popular'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 text-xs font-semibold transition-all ${sortBy === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {s === 'newest' ? '🕐 Cele mai noi' : '🔥 Cele mai populare'}
              </button>
            ))}
          </div>
        </div>

        {/* Hub grid */}
        {hubsLoading ? (
          <div className="text-slate-500 text-center py-20">Se încarcă hub-urile...</div>
        ) : filteredHubs.length === 0 ? (
          <div className="text-center py-24 space-y-2">
            <p className="text-slate-400 text-lg">Niciun hub găsit.</p>
            <p className="text-slate-600 text-sm">Schimbă filtrele sau creează un hub nou.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHubs.map(hub => {
              const count = memberCounts[hub.id] ?? 0;
              const isMember = memberships.has(hub.id);
              const isCreator = hub.creator_id === userId;
              const isPending = pendingRequests.has(hub.id);
              const isFull = count >= hub.max_members;

              return (
                <div key={hub.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-600 transition-all flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-lg leading-tight">{hub.name}</h3>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${hub.mode === 'ranked' ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' : 'bg-green-600/20 text-green-400 border-green-600/30'}`}>
                        {hub.mode === 'ranked' ? '🏆 Ranked' : '🎉 4Fun'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${hub.join_type === 'free' ? 'bg-slate-800 text-slate-400' : 'bg-yellow-600/20 text-yellow-400'}`}>
                        {hub.join_type === 'free' ? 'Free Join' : '🔒 Cerere'}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400">🎮 <span className="text-slate-300 font-medium">{hub.game}</span></p>

                  {hub.description && (
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{hub.description}</p>
                  )}

                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <span>👥 {count} / {hub.max_members} membri</span>
                    {isFull && <span className="text-red-400 font-medium">• Plin</span>}
                  </div>

                  <div className="flex items-center gap-2 pt-2 mt-auto border-t border-slate-800">
                    {isMember || isCreator ? (
                      <button
                        onClick={() => router.push(`/hub/${hub.id}`)}
                        className="flex-1 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                      >
                        {isCreator ? '⚙️ Gestionează' : '💬 Chat'}
                      </button>
                    ) : isPending ? (
                      <button disabled className="flex-1 py-2 text-sm bg-slate-800 text-slate-500 rounded-lg cursor-not-allowed">
                        ⏳ Cerere Trimisă
                      </button>
                    ) : isFull ? (
                      <button disabled className="flex-1 py-2 text-sm bg-slate-800 text-slate-500 rounded-lg cursor-not-allowed">
                        Hub Plin
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoin(hub)}
                        disabled={joining === hub.id}
                        className="flex-1 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-60"
                      >
                        {joining === hub.id ? '...' : hub.join_type === 'free' ? '+ Alătură-te' : '📩 Cere Acces'}
                      </button>
                    )}
                    {isCreator && (
                      confirmDelete === hub.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">Sigur?</span>
                          <button
                            onClick={() => { handleDeleteHub(hub.id); setConfirmDelete(null); }}
                            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all"
                          >
                            Da
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
                          >
                            Nu
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(hub.id)} className="px-3 py-2 text-xs text-red-500/50 hover:text-red-400 transition-colors">
                          Șterge
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Hub Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Creează Hub Nou</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>

            <form onSubmit={handleCreateHub} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nume Hub</label>
                <input type="text" value={hubName} onChange={e => setHubName(e.target.value)}
                  placeholder="ex: Casual Valorant Squad" required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm" />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Joc</label>
                <div className="relative">
                  <input type="text" value={hubGame}
                    onChange={e => { setHubGame(e.target.value); setGameSuggestions(true); }}
                    onFocus={() => setGameSuggestions(true)}
                    onBlur={() => setTimeout(() => setGameSuggestions(false), 150)}
                    placeholder="ex: Valorant" required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm" />
                  {gameSuggestions && hubGame && filteredSuggestions.length > 0 && (
                    <ul className="absolute z-10 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl">
                      {filteredSuggestions.slice(0, 5).map(g => (
                        <li key={g} onMouseDown={() => { setHubGame(g); setGameSuggestions(false); }}
                          className="px-4 py-2 text-sm hover:bg-slate-700 cursor-pointer text-slate-200">{g}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Mod de joc</label>
                <div className="flex gap-3">
                  {(['ranked', '4fun'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setHubMode(m)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${hubMode === m
                        ? m === 'ranked' ? 'bg-blue-600 text-white border-blue-600' : 'bg-green-600 text-white border-green-600'
                        : 'bg-slate-950 text-slate-400 border-slate-700 hover:border-slate-500'}`}>
                      {m === 'ranked' ? '🏆 Ranked' : '🎉 4Fun'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Tip de intrare</label>
                <div className="flex gap-3">
                  {(['free', 'request'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setHubJoinType(t)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${hubJoinType === t
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-slate-950 text-slate-400 border-slate-700 hover:border-slate-500'}`}>
                      {t === 'free' ? '🔓 Free Join' : '🔒 Cu Cerere'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Membri maximi: <span className="text-white font-medium">{hubMaxMembers}</span>
                </label>
                <input type="range" min={2} max={50} value={hubMaxMembers}
                  onChange={e => setHubMaxMembers(Number(e.target.value))}
                  className="w-full accent-blue-500" />
                <div className="flex justify-between text-xs text-slate-600 mt-1"><span>2</span><span>50</span></div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Descriere <span className="text-slate-600">(opțional)</span></label>
                <textarea value={hubDesc} onChange={e => setHubDesc(e.target.value)}
                  placeholder="ex: Căutăm oameni chill pentru ranked climb..." rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm resize-none" />
              </div>

              <button type="submit" disabled={creating || !hubName.trim() || !hubGame.trim()}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all">
                {creating ? 'Se creează...' : 'Creează Hub'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
