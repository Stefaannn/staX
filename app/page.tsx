"use client";

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation'; 

export default function Home() {
  const router = useRouter(); 
  
  const [showModal, setShowModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true); // Aici controlăm dacă suntem pe Logare sau Creare cont
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoading(true);

    if (isLoginMode) {
      // === MODUL DE LOGARE (SIGN IN) ===
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        alert("Eroare la logare: " + error.message);
      } else {
        router.push('/dashboard'); 
      }

    } else {
      // === MODUL DE CREARE CONT (SIGN UP) ===
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        alert("Eroare la creare: " + error.message);
      } else {
        alert("Cont creat cu succes! Acum te poți loga.");
        setIsLoginMode(true); // Îl trecem automat înapoi pe modul de logare
        setPassword(''); // Îi ștergem parola din căsuță pentru siguranță
      }
    }
    
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full"></div>
      </div>

      <div className={`relative z-10 text-center space-y-8 transition-all duration-500 ${showModal ? 'blur-sm scale-95' : ''}`}>
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
          STAX
        </h1>
        
        <div className="space-y-2">
          <p className="text-slate-400 text-lg font-medium tracking-wide uppercase">
            Find your perfect duo
          </p>
          <div className="h-1 w-12 bg-blue-600 mx-auto rounded-full"></div>
        </div>

        <div className="pt-8">
          <button 
            onClick={() => setShowModal(true)}
            className="group relative px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            START MATCHMAKING
          </button>
        </div>
      </div>

      {showModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl relative transition-all">
            
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold"
            >
              ✕
            </button>

            {/* Titlul se schimbă dinamic */}
            <h2 className="text-2xl font-bold mb-6 text-center">
              {isLoginMode ? 'Intră în cont' : 'Creează cont nou'}
            </h2>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="nume@exemplu.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Parolă (min. 6 caractere)</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {/* Butonul principal care se schimbă */}
              <button 
                type="submit"
                disabled={loading}
                className={`w-full py-3 mt-4 text-white font-bold rounded-lg transition-colors ${loading ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {loading ? 'Se procesează...' : (isLoginMode ? 'Loghează-te' : 'Creează Cont')}
              </button>
            </form>

            {/* Butonul care schimbă între Login și Sign Up */}
            <div className="mt-6 text-center">
              <button 
                type="button"
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {isLoginMode 
                  ? "Nu ai un cont? Apasă aici să creezi unul." 
                  : "Ai deja cont? Loghează-te aici."}
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}