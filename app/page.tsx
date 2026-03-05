"use client";
import React from 'react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
      {/* Background Decorativ (opțional, pentru vibe de gaming) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full"></div>
      </div>

      {/* Continutul Principal */}
      <div className="relative z-10 text-center space-y-8">
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
            className="group relative px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            onClick={() => alert("Backend coming soon! 🚀")}
          >
            LOGIN / SIGN UP
          </button>
        </div>
      </div>

      {/* Footer mic */}
      <footer className="absolute bottom-8 text-slate-600 text-sm">
        &copy; 2026 STAX Platform. Built for gamers.
      </footer>
    </main>
  );
}