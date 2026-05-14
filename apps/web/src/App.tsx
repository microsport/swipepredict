import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useStore } from './lib/store';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { HomePage } from './pages/Home';
import { MyBetsPage } from './pages/MyBets';
import { EventDetailPage } from './pages/EventDetail';
import { WalletPage } from './pages/Wallet';
import { ProfilePage } from './pages/Profile';
import { AuthPage } from './pages/Auth';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const { fetchProfile, fetchCards } = useStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setBooting(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) { fetchProfile(); fetchCards(); }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-emerald-400 text-2xl font-black animate-pulse">SwipePredict</div>
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-white max-w-md mx-auto relative">
        <Header />
        <main className="min-h-screen">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/mis-apuestas" element={<MyBetsPage />} />
            <Route path="/evento/:id" element={<EventDetailPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
