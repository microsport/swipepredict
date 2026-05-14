import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-emerald-400 mb-2">SwipePredict</h1>
          <p className="text-slate-400">Predice el fútbol. Gana USDC.</p>
        </div>

        {sent ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
            <p className="text-emerald-400 font-bold text-xl mb-2">📬 ¡Revisa tu email!</p>
            <p className="text-slate-400 text-sm">
              Te enviamos un enlace mágico a <strong className="text-white">{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
            />
            {error && <p className="text-rose-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-2xl text-base transition-colors disabled:opacity-60"
            >
              {loading ? 'Enviando...' : '🚀 Entrar con email'}
            </button>
          </form>
        )}

        <p className="text-center text-slate-500 text-xs mt-6">
          Al entrar aceptas los términos de uso.
          <br />Solo para mayores de 18 años.
        </p>
      </div>
    </div>
  );
}
