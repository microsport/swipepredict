import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Bet, calcOdds } from '@swipepredict/shared';
import { apiFetch } from '../lib/supabase';
import { useStore } from '../lib/store';
import clsx from 'clsx';

interface Winner { amount_usdc: number; potential_win: number; side: string; users: { nickname: string } }

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { myBets } = useStore();
  const [card, setCard] = useState<Card | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [showWinners, setShowWinners] = useState(false);
  const myBet = myBets.find(b => b.card_id === id);

  useEffect(() => {
    if (!id) return;
    apiFetch<Card>(`/cards/${id}`).then(setCard);
  }, [id]);

  useEffect(() => {
    if (card?.status === 'settled' && showWinners) {
      apiFetch<Winner[]>(`/cards/${id}/winners`).then(setWinners);
    }
  }, [showWinners, card]);

  if (!card) return <div className="pt-20 flex justify-center text-slate-400 text-sm animate-pulse">Cargando...</div>;

  const { oddsYes, oddsNo } = calcOdds(card.pool_yes, card.pool_no);
  const totalPool = card.pool_yes + card.pool_no;
  const yesPercent = totalPool > 0 ? (card.pool_yes / totalPool) * 100 : 50;

  const statusLabel = card.status === 'open' ? '🟢 Abierto' : card.status === 'locked' ? '🔴 LIVE' : '✅ Terminado';

  return (
    <div className="pt-14 pb-20 px-4">
      <div className="mt-4 mb-6">
        <p className="text-xs text-slate-400 mb-1">{card.match_info}</p>
        <h1 className="text-xl font-bold text-white leading-tight">{card.question_text}</h1>
        <span className="inline-block mt-2 text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded-lg">{statusLabel}</span>
      </div>

      {/* Stats bar */}
      <div className="bg-slate-800 rounded-2xl p-4 mb-4 border border-slate-700">
        <p className="text-xs text-slate-400 mb-3 font-medium">📊 Distribución de apuestas</p>

        <div className="flex gap-2 text-sm mb-2">
          <span className="text-emerald-400 font-bold">SÍ {card.count_yes} usuarios • ${card.pool_yes.toFixed(2)}</span>
          <span className="ml-auto text-slate-400">NO {card.count_no} usuarios • ${card.pool_no.toFixed(2)}</span>
        </div>

        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${yesPercent}%` }} />
        </div>

        <div className="flex justify-between mt-3 text-sm">
          <div className="text-center">
            <p className="text-emerald-400 font-bold text-lg">×{oddsYes}</p>
            <p className="text-slate-400 text-xs">coef. SÍ</p>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">${totalPool.toFixed(2)}</p>
            <p className="text-slate-400 text-xs">pool total</p>
          </div>
          <div className="text-center">
            <p className="text-slate-300 font-bold text-lg">×{oddsNo}</p>
            <p className="text-slate-400 text-xs">coef. NO</p>
          </div>
        </div>
      </div>

      {/* My bet */}
      {myBet && (
        <div className={clsx('rounded-2xl p-4 mb-4 border', {
          'bg-emerald-500/10 border-emerald-500/30': myBet.status === 'won',
          'bg-rose-500/10 border-rose-500/30': myBet.status === 'lost',
          'bg-slate-800 border-slate-700': myBet.status === 'pending',
        })}>
          <p className="text-xs text-slate-400 mb-2 font-medium">💰 Tu apuesta</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white font-semibold">
                {myBet.side === 'yes' ? '✅ SÍ' : '❌ NO'} — ${myBet.amount_usdc.toFixed(2)}
              </p>
              <p className="text-slate-400 text-sm">
                {myBet.status === 'pending' ? `Ganancia posible: $${myBet.potential_win.toFixed(2)}` :
                  myBet.status === 'won' ? `¡Ganaste $${myBet.potential_win.toFixed(2)}! 🎉` :
                    'No fue esta vez 😤'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Winners table */}
      {card.status === 'settled' && (
        <div>
          <button
            onClick={() => setShowWinners(v => !v)}
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-semibold border border-slate-700 hover:bg-slate-700 transition-colors mb-3"
          >
            🏆 {showWinners ? 'Ocultar' : 'Ver'} tabla de ganadores
          </button>

          {showWinners && winners.length > 0 && (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 text-xs text-slate-400 flex justify-between">
                <span>Usuario</span><span>Apostó</span><span>Ganó</span>
              </div>
              {winners.map((w, i) => (
                <div key={i} className="px-4 py-3 border-b border-slate-800 flex justify-between text-sm last:border-0">
                  <span className="text-white">@{w.users.nickname}</span>
                  <span className="text-slate-400">${w.amount_usdc.toFixed(2)}</span>
                  <span className="text-emerald-400 font-bold">+${(w.potential_win - w.amount_usdc).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
