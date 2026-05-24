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
  creator_discord?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [discordTag, setDiscordTag] = useState('');
  const [games, setGames] = useState<GameEntry[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [hubs, setHubs] = useState<Hub[]>([]);
  const [hubsLoading, setHubsLoading] = useState(true);

  const [showCreateHub, setShowCreateHub] = useState(false);
  const [hubName, setHubName] = useState('');
  const [hubGame, setHubGame] = useState('');
  const [hubMode, setHubMode] = useState<'4fun' | 'ranked'>('ranked');
  const [hubDesc, setHubDesc] = useState('');
  const [hubGameSuggestions, setHubGameSuggestions] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('discord_tag, games')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setDiscordTag(profile.discord_tag ?? '');
        setGames(profile.games ?? []);
      }

      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    fetchHubs();
  }, []);

  const fetchHubs = async () => {
    setHubsLoading(true);
    const { data } = await supabase
      .from('hubs')
      .select('*')
      .order('created_at', { ascending: false });
    setHubs(data ?? []);
    setHubsLoading(false);
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
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

    await supabase.from('hubs').insert({
      name: hubName.trim(),
      game: hubGame.trim(),
      mode: hubMode,
      description: hubDesc.trim() || null,
      creator_id: userId,
    });

    setHubName(''); setHubGame(''); setHubMode('ranked'); setHubDesc('');
    setShowCreateHub(false);
    setCreating(false);
    fetchHubs();
  };

  const handleDeleteHub = async (hubId: string) => {
    await supabase.from('hubs').delete().eq('id', hubId);
    fetchHubs();
  };

  const filteredGameSuggestions = POPULAR_GAMES.filter(g =>
    g.toLowerCase().includes(hubGame.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Se încarcă...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            STAX
          </span>

          <div className="flex items-center gap-3">
            {/* My Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all text-sm font-medium"
              >
                <span className="text-slate-300">My Profile</span>
                {discordTag && (
                  <span className="text-[#5865F2] text-xs">{discordTag}</span>
                )}
                <span className={`text-slate-500 text-xs transition-transform ${profileOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 space-y-3">
                  {discordTag && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="text-[#5865F2]">⬡</span>
                      <span>{discordTag}</span>
                    </div>
                  )}

                  {games.length > 0 ? (
                    <ul className="space-y-1.5">
                      {games.map((g, i) => (
                        <li key={i} className="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-1.5 text-sm">
                          <span className="text-slate-200">{g.name}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            g.mode === 'ranked'
                              ? 'bg-blue-600/20 text-blue-400'
                              : 'bg-green-600/20 text-green-400'
                          }`}>
                            {g.mode === 'ranked' ? '🏆 Ranked' : '🎉 4Fun'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-xs">Niciun joc adăugat.</p>
                  )}

                  <button
                    onClick={() => { setProfileOpen(false); router.push('/profile'); }}
                    className="w-full py-2 text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-600/40 transition-all font-medium"
                  >
                    ✏️ Editează Profilul
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm text-red-400 hover:text-white hover:bg-red-600 border border-red-600/40 rounded-xl transition-all"
            >
              Delogare
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-6xl mx-auto w-full px-4 py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Hub-uri Active</h2>
            <p className="text-slate-500 text-sm mt-1">Găsește sau creează un grup de jucători</p>
          </div>
          <button
            onClick={() => setShowCreateHub(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all active:scale-95 text-sm"
          >
            + Creează Hub
          </button>
        </div>

        {hubsLoading ? (
          <div className="text-slate-500 text-center py-20">Se încarcă hub-urile...</div>
        ) : hubs.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <p className="text-slate-400 text-lg">Niciun hub activ momentan.</p>
            <p className="text-slate-600 text-sm">Fii primul care creează un hub!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hubs.map(hub => (
              <div key={hub.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-600 transition-all flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-lg leading-tight">{hub.name}</h3>
                  <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                    hub.mode === 'ranked'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                      : 'bg-green-600/20 text-green-400 border border-green-600/30'
                  }`}>
                    {hub.mode === 'ranked' ? '🏆 Ranked' : '🎉 4Fun'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>🎮</span>
                  <span className="font-medium text-slate-300">{hub.game}</span>
                </div>

                {hub.description && (
                  <p className="text-slate-500 text-sm leading-relaxed">{hub.description}</p>
                )}

                <div className="flex items-center justify-between pt-2 mt-auto border-t border-slate-800">
                  <span className="text-xs text-slate-600">
                    {new Date(hub.created_at).toLocaleDateString('ro-RO')}
                  </span>
                  {hub.creator_id === userId && (
                    <button
                      onClick={() => handleDeleteHub(hub.id)}
                      className="text-xs text-red-500/60 hover:text-red-400 transition-colors"
                    >
                      Șterge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Hub Modal */}
      {showCreateHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Creează Hub Nou</h2>
              <button onClick={() => setShowCreateHub(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>

            <form onSubmit={handleCreateHub} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nume Hub</label>
                <input
                  type="text"
                  value={hubName}
                  onChange={e => setHubName(e.target.value)}
                  placeholder="ex: Casual Valorant Squad"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Joc</label>
                <div className="relative">
                  <input
                    type="text"
                    value={hubGame}
                    onChange={e => { setHubGame(e.target.value); setHubGameSuggestions(true); }}
                    onFocus={() => setHubGameSuggestions(true)}
                    onBlur={() => setTimeout(() => setHubGameSuggestions(false), 150)}
                    placeholder="ex: Valorant"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  />
                  {hubGameSuggestions && hubGame && filteredGameSuggestions.length > 0 && (
                    <ul className="absolute z-10 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl">
                      {filteredGameSuggestions.slice(0, 5).map(g => (
                        <li
                          key={g}
                          onMouseDown={() => { setHubGame(g); setHubGameSuggestions(false); }}
                          className="px-4 py-2 text-sm hover:bg-slate-700 cursor-pointer text-slate-200"
                        >
                          {g}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Mod de joc</label>
                <div className="flex gap-3">
                  {(['ranked', '4fun'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setHubMode(m)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${
                        hubMode === m
                          ? m === 'ranked'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-green-600 text-white border-green-600'
                          : 'bg-slate-950 text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {m === 'ranked' ? '🏆 Ranked' : '🎉 4Fun'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Descriere <span className="text-slate-600">(opțional)</span></label>
                <textarea
                  value={hubDesc}
                  onChange={e => setHubDesc(e.target.value)}
                  placeholder="ex: Căutăm oameni chill pentru ranked climb..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={creating || !hubName.trim() || !hubGame.trim()}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-95"
              >
                {creating ? 'Se creează...' : 'Creează Hub'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
