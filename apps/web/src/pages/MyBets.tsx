import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Bet } from '@swipepredict/shared';
import clsx from 'clsx';

type Tab = 'active' | 'finished';

function BetRow({ bet }: { bet: Bet }) {
  const card = bet.card;
  const isWon = bet.status === 'won';
  const isLost = bet.status === 'lost';
  const isPending = bet.status === 'pending';

  return (
    <Link to={`/evento/${bet.card_id}`} className="block">
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 mb-1">{card?.match_info}</p>
            <p className="text-white text-sm font-medium leading-snug line-clamp-2">{card?.question_text}</p>
          </div>
          <div className={clsx('text-xs font-bold px-2 py-1 rounded-lg shrink-0', {
            'bg-emerald-500/20 text-emerald-400': isWon,
            'bg-rose-500/20 text-rose-400': isLost,
            'bg-slate-700 text-slate-300': isPending,
          })}>
            {isWon ? '✅ Ganaste' : isLost ? '❌ Perdiste' : '⏳ Activa'}
          </div>
        </div>

        <div className="flex gap-4 mt-3 text-xs">
          <span className="text-slate-400">
            Aposté <span className="text-white font-semibold">{bet.side === 'yes' ? 'SÍ' : 'NO'}</span> — ${bet.amount_usdc.toFixed(2)}
          </span>
          {isWon && (
            <span className="text-emerald-400 font-bold">+${(bet.potential_win - bet.amount_usdc).toFixed(2)}</span>
          )}
          {isPending && (
            <span className="text-slate-500">Posible: ${bet.potential_win.toFixed(2)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function MyBetsPage() {
  const { myBets, fetchMyBets } = useStore();
  const [tab, setTab] = useState<Tab>('active');

  useEffect(() => { fetchMyBets(); }, []);

  const active = myBets.filter(b => b.status === 'pending');
  const finished = myBets.filter(b => b.status !== 'pending');
  const shown = tab === 'active' ? active : finished;

  return (
    <div className="pt-14 pb-20 px-4">
      <h1 className="text-xl font-bold text-white mt-4 mb-4">Mis Apuestas</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['active', 'finished'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-colors', {
              'bg-emerald-500 text-white': tab === t,
              'bg-slate-800 text-slate-400': tab !== t,
            })}
          >
            {t === 'active' ? `Activas (${active.length})` : `Terminadas (${finished.length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {shown.length === 0 ? (
        <div className="text-center text-slate-500 mt-12">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">
            {tab === 'active' ? 'No tienes apuestas activas' : 'No tienes apuestas terminadas'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map(bet => <BetRow key={bet.id} bet={bet} />)}
        </div>
      )}
    </div>
  );
}
