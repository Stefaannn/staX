"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const POPULAR_GAMES = [
  "League of Legends","Valorant","CS2","Dota 2","Fortnite",
  "Apex Legends","Overwatch 2","Rocket League","World of Warcraft",
  "Minecraft","PUBG","Rainbow Six Siege","Teamfight Tactics",
  "Hearthstone","Escape from Tarkov",
];

type GameMode = "4fun" | "ranked";
interface GameEntry { name: string; mode: GameMode; }
interface SavedProfile { username: string; discordTag: string; games: GameEntry[]; }

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');

  // Current (editable) state
  const [username, setUsername] = useState('');
  const [discordTag, setDiscordTag] = useState('');
  const [games, setGames] = useState<GameEntry[]>([]);

  // Last saved snapshot (for undo)
  const [savedProfile, setSavedProfile] = useState<SavedProfile>({ username: '', discordTag: '', games: [] });

  // Username validation
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Add game
  const [newGameName, setNewGameName] = useState('');
  const [newGameMode, setNewGameMode] = useState<GameMode>('ranked');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hasChanges =
    username !== savedProfile.username ||
    discordTag !== savedProfile.discordTag ||
    JSON.stringify(games) !== JSON.stringify(savedProfile.games);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/'); return; }
    if (user) {
      setEmail(user.email);
      setUserId(user.userId);
      const snap: SavedProfile = {
        username: user.username,
        discordTag: user.discordTag,
        games: user.games,
      };
      setUsername(snap.username);
      setDiscordTag(snap.discordTag);
      setGames(snap.games);
      setSavedProfile(snap);
      setLoading(false);
    }
  }, [authLoading, user, router]);

  const checkUsername = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === savedProfile.username) { setUsernameError(''); return; }
    setCheckingUsername(true);
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', trimmed)
      .neq('id', userId)
      .maybeSingle();
    setCheckingUsername(false);
    setUsernameError(data ? 'Acest nume de utilizator este deja folosit.' : '');
  }, [savedProfile.username, userId]);

  const handleSave = async () => {
    if (usernameError || checkingUsername) return;
    setSaving(true);

    // Final uniqueness check before saving
    const trimmedUsername = username.trim();
    if (trimmedUsername && trimmedUsername !== savedProfile.username) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .neq('id', userId)
        .maybeSingle();
      if (data) {
        setUsernameError('Acest nume de utilizator este deja folosit.');
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      username: trimmedUsername,
      discord_tag: discordTag.trim(),
      games,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    if (!error) {
      const snap: SavedProfile = { username: trimmedUsername, discordTag: discordTag.trim(), games };
      setSavedProfile(snap);
      await refresh();
    }
  };

  const handleUndo = () => {
    setUsername(savedProfile.username);
    setDiscordTag(savedProfile.discordTag);
    setGames(savedProfile.games);
    setUsernameError('');
  };

  const addGame = () => {
    const match = POPULAR_GAMES.find(g => g.toLowerCase() === newGameName.trim().toLowerCase());
    if (!match || games.some(g => g.name.toLowerCase() === match.toLowerCase())) return;
    setGames(prev => [...prev, { name: match, mode: newGameMode }]);
    setNewGameName('');
    setNewGameMode('ranked');
    setShowSuggestions(false);
  };

  const removeGame = (index: number) => setGames(prev => prev.filter((_, i) => i !== index));

  const toggleMode = (index: number) =>
    setGames(prev => prev.map((g, i) => i === index ? { ...g, mode: g.mode === 'ranked' ? '4fun' : 'ranked' } : g));

  const filteredSuggestions = POPULAR_GAMES.filter(
    g => g.toLowerCase().includes(newGameName.toLowerCase()) &&
      !games.some(existing => existing.name.toLowerCase() === g.toLowerCase())
  );

  const avatarLetter = (username || email || '?')[0].toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Se încarcă profilul...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Top nav */}
      <div className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
        >
          ← Dashboard
        </button>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleUndo}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
            >
              Anulează
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges || !!usernameError || checkingUsername}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
              !hasChanges
                ? 'bg-slate-800 text-slate-500 cursor-default'
                : saving
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : usernameError || checkingUsername
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white active:scale-95'
            }`}
          >
            {saving ? 'Se salvează...' : hasChanges ? 'Salvează' : 'Salvat'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-12">

        {/* Profile hero */}
        <div className="pt-10 pb-8 flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-900/30">
              {avatarLetter}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-slate-950" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {username || <span className="text-slate-500 italic text-lg">fără username</span>}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">{email}</p>
          </div>
          {hasChanges && (
            <span className="text-xs text-amber-400/80 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
              Ai modificări nesalvate
            </span>
          )}
        </div>

        <div className="space-y-4">

          {/* Identity card */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/40">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Identitate</h2>
            </div>
            <div className="p-5 space-y-4">

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Nume utilizator</label>
                <p className="text-xs text-slate-500">Acesta e numele tău pe STAX, văzut de alți jucători</p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => {
                      const val = e.target.value.replace(/\s/g, '');
                      setUsername(val);
                      setUsernameError('');
                    }}
                    onBlur={e => checkUsername(e.target.value)}
                    placeholder="username"
                    className={`w-full bg-slate-950 border rounded-xl pl-8 pr-10 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-all ${
                      usernameError
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
                        : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/50'
                    }`}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {checkingUsername && (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {!checkingUsername && username && !usernameError && username !== savedProfile.username && (
                      <span className="text-green-400 text-sm">✓</span>
                    )}
                  </div>
                </div>
                {usernameError && (
                  <p className="text-red-400 text-xs flex items-center gap-1.5">
                    <span>⚠</span> {usernameError}
                  </p>
                )}
              </div>

              <div className="h-px bg-slate-800" />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <span className="text-[#5865F2] text-base">●</span> Discord
                </label>
                <p className="text-xs text-slate-500">Numele pe Discord</p>
                <input
                  type="text"
                  value={discordTag}
                  onChange={e => setDiscordTag(e.target.value)}
                  placeholder="ex: username"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2]/50 transition-all"
                />
              </div>
            </div>
          </section>

          {/* Games card */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/40 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Jocurile Mele</h2>
              <span className="text-xs text-slate-600">{games.length} joc{games.length !== 1 ? 'uri' : ''}</span>
            </div>

            <div className="p-5 space-y-5">
              {games.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {games.map((game, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${game.mode === 'ranked' ? 'bg-blue-400' : 'bg-green-400'}`} />
                        <span className="text-sm font-medium text-white truncate">{game.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <button
                          onClick={() => toggleMode(i)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                            game.mode === 'ranked'
                              ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white'
                              : 'bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white'
                          }`}
                        >
                          {game.mode === 'ranked' ? '🏆' : '🎉'}
                        </button>
                        <button
                          onClick={() => removeGame(i)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all text-lg leading-none"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 gap-2">
                  <p className="text-2xl">🎮</p>
                  <p className="text-slate-500 text-sm">Nu ai adăugat niciun joc încă</p>
                </div>
              )}

              <div className="border-t border-slate-800 pt-4">
                <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">Adaugă joc</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newGameName}
                      onChange={e => { setNewGameName(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onKeyDown={e => e.key === 'Enter' && addGame()}
                      placeholder="Caută joc..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm"
                    />
                    {showSuggestions && newGameName && filteredSuggestions.length > 0 && (
                      <ul className="absolute z-20 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                        {filteredSuggestions.slice(0, 5).map(g => (
                          <li
                            key={g}
                            onMouseDown={() => { setNewGameName(g); setShowSuggestions(false); }}
                            className="px-4 py-2.5 text-sm hover:bg-slate-700 cursor-pointer text-slate-200 transition-colors"
                          >
                            {g}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex rounded-xl overflow-hidden border border-slate-700">
                    {(['ranked', '4fun'] as GameMode[]).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNewGameMode(m)}
                        className={`px-3 py-2.5 text-xs font-semibold transition-all ${
                          newGameMode === m
                            ? m === 'ranked' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {m === 'ranked' ? '🏆' : '🎉'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={addGame}
                    disabled={!POPULAR_GAMES.some(g => g.toLowerCase() === newGameName.trim().toLowerCase())}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
