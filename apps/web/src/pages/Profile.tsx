import React, { useEffect } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

export function ProfilePage() {
  const { user, fetchProfile } = useStore();

  useEffect(() => { fetchProfile(); }, []);

  const stats = (user as any)?.stats;

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="pt-14 pb-20 px-4">
      <h1 className="text-xl font-bold text-white mt-4 mb-4">Perfil</h1>

      {/* Identity */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl">
            😎
          </div>
          <div>
            <p className="text-white font-bold">@{user?.nickname ?? 'anon'}</p>
            <p className="text-slate-400 text-sm">{user?.email ?? ''}</p>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-4">
        <p className="text-xs text-slate-400 mb-1">Balance USDC</p>
        <p className="text-3xl font-black text-white">${(user?.balance_usdc ?? 0).toFixed(2)}</p>
        <div className="flex gap-2 mt-3">
          <a href="/wallet" className="flex-1 bg-emerald-500 text-white text-center py-2 rounded-xl text-sm font-bold">
            💳 Depositar
          </a>
          <a href="/wallet" className="flex-1 bg-slate-700 text-slate-300 text-center py-2 rounded-xl text-sm font-bold">
            💸 Retirar
          </a>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-4">
          <p className="text-xs text-slate-400 mb-3">📊 Estadísticas</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-white font-bold text-xl">{stats.total_bets}</p>
              <p className="text-slate-400 text-xs">Apuestas</p>
            </div>
            <div>
              <p className="text-emerald-400 font-bold text-xl">{(stats.win_rate * 100).toFixed(0)}%</p>
              <p className="text-slate-400 text-xs">Aciertos</p>
            </div>
            <div>
              <p className={`font-bold text-xl ${stats.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.pnl >= 0 ? '+' : ''}{stats.pnl.toFixed(2)}
              </p>
              <p className="text-slate-400 text-xs">P&L $</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={signOut}
          className="w-full bg-slate-800 border border-slate-700 text-rose-400 py-3 rounded-xl font-semibold hover:bg-slate-700 transition-colors"
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  );
}
