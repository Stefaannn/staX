"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const POPULAR_GAMES = [
  "League of Legends",
  "Valorant",
  "CS2",
  "Dota 2",
  "Fortnite",
  "Apex Legends",
  "Overwatch 2",
  "Rocket League",
  "World of Warcraft",
  "Minecraft",
  "PUBG",
  "Rainbow Six Siege",
  "Teamfight Tactics",
  "Hearthstone",
  "Escape from Tarkov",
];

type GameMode = "4fun" | "ranked";

interface GameEntry {
  name: string;
  mode: GameMode;
}

interface Profile {
  discord_tag: string;
  games: GameEntry[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [discordTag, setDiscordTag] = useState('');
  const [games, setGames] = useState<GameEntry[]>([]);

  const [newGameName, setNewGameName] = useState('');
  const [newGameMode, setNewGameMode] = useState<GameMode>('ranked');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('discord_tag, games')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setDiscordTag(data.discord_tag ?? '');
        setGames(data.games ?? []);
      }

      setLoading(false);
    };

    init();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const profile: Profile = { discord_tag: discordTag, games };

    await supabase
      .from('profiles')
      .upsert({ id: session.user.id, ...profile, updated_at: new Date().toISOString() });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addGame = () => {
    const name = newGameName.trim();
    if (!name) return;
    if (games.some(g => g.name.toLowerCase() === name.toLowerCase())) return;
    setGames(prev => [...prev, { name, mode: newGameMode }]);
    setNewGameName('');
    setNewGameMode('ranked');
    setShowSuggestions(false);
  };

  const removeGame = (index: number) => {
    setGames(prev => prev.filter((_, i) => i !== index));
  };

  const toggleMode = (index: number) => {
    setGames(prev =>
      prev.map((g, i) =>
        i === index ? { ...g, mode: g.mode === 'ranked' ? '4fun' : 'ranked' } : g
      )
    );
  };

  const filteredSuggestions = POPULAR_GAMES.filter(
    g =>
      g.toLowerCase().includes(newGameName.toLowerCase()) &&
      !games.some(existing => existing.name.toLowerCase() === g.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Se încarcă profilul...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2"
          >
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Profilul Meu
          </h1>
          <div className="w-24" />
        </div>

        {/* Discord Tag */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <span className="text-[#5865F2]">⬡</span> Discord
          </h2>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Tag Discord</label>
            <input
              type="text"
              value={discordTag}
              onChange={e => setDiscordTag(e.target.value)}
              placeholder="exemplu: username#1234 sau username"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Games */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">🎮 Jocurile Mele</h2>

          {/* Existing games list */}
          {games.length > 0 && (
            <ul className="space-y-2">
              {games.map((game, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-4 py-3"
                >
                  <span className="font-medium text-white">{game.name}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleMode(i)}
                      className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${
                        game.mode === 'ranked'
                          ? 'bg-blue-600/20 text-blue-400 border-blue-600/50 hover:bg-blue-600 hover:text-white'
                          : 'bg-green-600/20 text-green-400 border-green-600/50 hover:bg-green-600 hover:text-white'
                      }`}
                    >
                      {game.mode === 'ranked' ? '🏆 Ranked' : '🎉 4Fun'}
                    </button>
                    <button
                      onClick={() => removeGame(i)}
                      className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {games.length === 0 && (
            <p className="text-slate-600 text-sm text-center py-4">
              Nu ai adăugat niciun joc încă.
            </p>
          )}

          {/* Add game */}
          <div className="pt-2 border-t border-slate-800">
            <p className="text-sm text-slate-400 mb-3">Adaugă un joc</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newGameName}
                  onChange={e => {
                    setNewGameName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Nume joc..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                />
                {showSuggestions && newGameName && filteredSuggestions.length > 0 && (
                  <ul className="absolute z-10 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl">
                    {filteredSuggestions.slice(0, 6).map(g => (
                      <li
                        key={g}
                        onMouseDown={() => {
                          setNewGameName(g);
                          setShowSuggestions(false);
                        }}
                        className="px-4 py-2 text-sm hover:bg-slate-700 cursor-pointer text-slate-200"
                      >
                        {g}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <select
                value={newGameMode}
                onChange={e => setNewGameMode(e.target.value as GameMode)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="ranked">🏆 Ranked</option>
                <option value="4fun">🎉 4Fun</option>
              </select>

              <button
                onClick={addGame}
                disabled={!newGameName.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
              >
                + Adaugă
              </button>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`w-full py-3 font-bold rounded-xl text-white transition-all ${
            saved
              ? 'bg-green-600'
              : saving
              ? 'bg-slate-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95'
          }`}
        >
          {saved ? '✓ Salvat!' : saving ? 'Se salvează...' : 'Salvează Profilul'}
        </button>

      </div>
    </main>
  );
}
