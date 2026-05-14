import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';

declare global {
  interface Window {
    solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }>; isPhantom?: boolean };
  }
}

type Tab = 'deposit' | 'withdraw';

export function WalletPage() {
  const { user, fetchProfile } = useStore();
  const [tab, setTab] = useState<Tab>('deposit');
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Deposit address = our master wallet (user sends to this)
  const DEPOSIT_ADDRESS = import.meta.env.VITE_DEPOSIT_ADDRESS ?? '7xKXtGpQwmNzRv9Qw2mExampleAddressHere';

  const copyAddress = () => {
    navigator.clipboard.writeText(DEPOSIT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const connectPhantom = async () => {
    if (!window.solana?.isPhantom) {
      window.open('https://phantom.app/', '_blank');
      return;
    }
    setConnecting(true);
    try {
      const { publicKey } = await window.solana.connect();
      const address = publicKey.toString();
      // Save wallet address to profile
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ wallet_address: address }),
        });
        await fetchProfile();
      }
    } catch (e) { console.error(e); }
    setConnecting(false);
  };

  return (
    <div className="pt-14 pb-20 px-4">
      <h1 className="text-xl font-bold text-white mt-4 mb-2">Wallet</h1>

      {/* Balance */}
      <div className="bg-gradient-to-br from-emerald-500/20 to-slate-800 rounded-2xl p-5 border border-emerald-500/20 mb-4">
        <p className="text-slate-400 text-sm mb-1">Balance disponible</p>
        <p className="text-4xl font-black text-white">${(user?.balance_usdc ?? 0).toFixed(2)}</p>
        <p className="text-slate-400 text-sm">USDC</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['deposit', 'withdraw'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('flex-1 py-2 rounded-xl text-sm font-semibold transition-colors', {
              'bg-emerald-500 text-white': tab === t,
              'bg-slate-800 text-slate-400': tab !== t,
            })}>
            {t === 'deposit' ? '💳 Depositar' : '💸 Retirar'}
          </button>
        ))}
      </div>

      {tab === 'deposit' && (
        <div className="space-y-4">
          {/* Phantom one-tap */}
          <button onClick={connectPhantom} disabled={connecting}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl font-bold text-base transition-colors flex items-center justify-center gap-3 disabled:opacity-60">
            <span>👻</span>
            <span>{connecting ? 'Conectando...' : 'Depositar con Phantom'}</span>
          </button>

          <div className="text-center text-slate-500 text-sm">— o envía manualmente —</div>

          {/* Manual address */}
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Dirección de depósito (Solana)</p>
            <div className="flex items-center gap-2 bg-slate-900 rounded-xl px-3 py-2">
              <code className="text-white text-xs flex-1 truncate">{DEPOSIT_ADDRESS}</code>
              <button onClick={copyAddress}
                className={clsx('text-xs px-2 py-1 rounded-lg font-medium transition-colors', copied ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')}>
                {copied ? '✓' : '📋'}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {['USDC', 'USDT', 'SOL'].map(t => (
                <span key={t} className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-lg">{t}</span>
              ))}
            </div>
            <p className="text-xs text-rose-400 mt-2">⚠️ Solo envía tokens en la red Solana</p>
          </div>
        </div>
      )}

      {tab === 'withdraw' && (
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm mb-4">
            {user?.wallet_address
              ? 'El retiro se enviará a tu wallet conectada.'
              : 'Conecta tu wallet Phantom primero.'}
          </p>
          {user?.wallet_address ? (
            <>
              <p className="text-xs text-slate-400 mb-1">Tu wallet</p>
              <code className="text-white text-xs block truncate mb-4">{user.wallet_address}</code>
              <p className="text-slate-500 text-xs">⏳ Retiros manuales en las próximas 24h — funcionalidad automática próximamente</p>
            </>
          ) : (
            <button onClick={connectPhantom} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold">
              👻 Conectar Phantom
            </button>
          )}
        </div>
      )}
    </div>
  );
}
