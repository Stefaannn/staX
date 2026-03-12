"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase'; // Importăm cu ../../ pentru că suntem mai adânc în foldere

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Acest 'useEffect' rulează automat când se deschide pagina
  useEffect(() => {
    const checkUser = async () => {
      // Îl întrebăm pe Supabase: "Avem vreun user logat acum?"
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Dacă nu avem sesiune (nu e logat), îl dăm afară pe pagina principală!
        router.push('/');
      } else {
        // Dacă e logat, oprim ecranul de încărcare și îi arătăm pagina
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  // Funcția pentru butonul de Delogare
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/'); // Îl trimitem înapoi la login
  };

  // Cât timp verificăm dacă e logat, arătăm un ecran negru de încărcare
  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Se încarcă datele secrete... 🔒</div>;
  }

  // Asta e pagina pe care o vede DOAR dacă e logat
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Ai intrat în Bază!
        </h1>
        <p className="text-slate-400">
          Aceasta este o pagină protejată. Ești conectat cu succes și nimeni nu poate vedea acest ecran fără să se logheze.
        </p>
        
        {/* Aici vei adăuga tu mai târziu selecția de jocuri, rank-uri etc. */}
        <div className="h-32 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500">
          (Zona pentru Profilul de Gamer)
        </div>

        <button 
          onClick={handleLogout}
          className="px-6 py-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-all border border-red-600/50"
        >
          Delogare
        </button>
      </div>
    </main>
  );
}