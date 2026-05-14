import React, { useState, useRef } from 'react';
import TinderCard from 'react-tinder-card';
import { Card, MIN_BET, MAX_BET } from '@swipepredict/shared';
import { useStore } from '../../lib/store';
import clsx from 'clsx';

interface SwipeCardProps {
  card: Card;
  isTop: boolean;
}

export function SwipeCard({ card, isTop }: SwipeCardProps) {
  const { placeBet, removeCard, betAmount, setBetAmount, user } = useStore();
  const [swiping, setSwiping] = useState<'left' | 'right' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef(0);
  const amountStart = useRef(betAmount);

  const matchDate = new Date(card.match_start_at);
  const isToday = matchDate.toDateString() === new Date().toDateString();
  const timeStr = matchDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const dateStr = isToday ? `Hoy ${timeStr}` : matchDate.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }) + ` ${timeStr}`;

  const notEnough = (user?.balance_usdc ?? 0) < betAmount;

  const onSwipe = (dir: string) => {
    if (dir === 'right') placeBet(card.id, 'yes');
    else if (dir === 'left') removeCard(card.id);
    setSwiping(null);
  };

  // Vertical drag on slider to change bet amount
  const onSliderMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    dragStart.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
    amountStart.current = betAmount;
  };

  const onSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current) return;
    const currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const delta = (dragStart.current - currentY) / 150; // 150px = full range
    const newAmount = Math.min(MAX_BET, Math.max(MIN_BET, amountStart.current + delta * (MAX_BET - MIN_BET)));
    setBetAmount(parseFloat(newAmount.toFixed(2)));
  };

  const onSliderEnd = () => { isDragging.current = false; };

  const sliderPercent = ((betAmount - MIN_BET) / (MAX_BET - MIN_BET)) * 100;

  return (
    <TinderCard
      onSwipe={onSwipe}
      onCardLeftScreen={() => setSwiping(null)}
      swipeRequirementType="position"
      swipeThreshold={80}
      preventSwipe={['up', 'down']}
      className="absolute w-full"
    >
      <div
        className={clsx(
          'relative mx-auto w-80 rounded-2xl overflow-hidden shadow-2xl select-none',
          'bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700',
          swiping === 'right' && 'border-emerald-400 shadow-emerald-400/30',
          swiping === 'left' && 'border-slate-500 shadow-slate-500/20',
        )}
        onMouseMove={onSliderMove}
        onMouseUp={onSliderEnd}
        onTouchMove={onSliderMove}
        onTouchEnd={onSliderEnd}
      >
        {/* Match header */}
        <div className="px-5 pt-5 pb-3 bg-slate-800/60">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>⚽</span>
            <span>Liga MX</span>
            <span>•</span>
            <span>{dateStr}</span>
          </div>
          <div className="text-white font-bold text-base">
            {card.team_home} vs {card.team_away}
          </div>
        </div>

        {/* Question */}
        <div className="px-5 py-6 flex gap-4 items-start">
          {/* Vertical stake slider */}
          <div
            ref={sliderRef}
            className="flex flex-col items-center gap-1 cursor-ns-resize"
            onMouseDown={onSliderMouseDown}
            onTouchStart={onSliderMouseDown}
          >
            <span className="text-xs text-emerald-400 font-bold">${betAmount.toFixed(2)}</span>
            <div className="relative w-4 h-28 bg-slate-700 rounded-full">
              <div
                className="absolute bottom-0 w-full bg-emerald-400 rounded-full transition-none"
                style={{ height: `${sliderPercent}%` }}
              />
              <div
                className="absolute w-5 h-5 bg-white rounded-full shadow-lg border-2 border-emerald-400 -left-0.5 transition-none"
                style={{ bottom: `calc(${sliderPercent}% - 10px)` }}
              />
            </div>
            <span className="text-xs text-slate-500">${MIN_BET}</span>
          </div>

          {/* Question text */}
          <div className="flex-1">
            <p className="text-white text-xl font-semibold leading-tight mb-4">
              {card.question_text}
            </p>

            <div className="flex gap-3 text-sm text-slate-400">
              <div className="flex flex-col items-center">
                <span className="text-emerald-400 font-bold text-base">×{card.odds_yes}</span>
                <span>Sí</span>
              </div>
              <div className="w-px bg-slate-700 self-stretch" />
              <div className="flex flex-col items-center">
                <span className="text-slate-300 font-bold text-base">×{card.odds_no}</span>
                <span>No</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA button */}
        <div className="px-5 pb-5">
          <button
            onClick={() => !notEnough && placeBet(card.id, 'yes')}
            disabled={notEnough}
            className={clsx(
              'w-full py-3 rounded-xl font-bold text-base transition-all',
              notEnough
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-white active:scale-95',
            )}
          >
            {notEnough ? 'Saldo insuficiente' : `💚 ¡SÍ! — $${betAmount.toFixed(2)}`}
          </button>
        </div>

        {/* Swipe hints */}
        <div className="flex justify-between px-5 pb-3 text-xs text-slate-600">
          <span>← Saltar</span>
          <span>Participar →</span>
        </div>

        {/* Pool stats */}
        <div className="px-5 pb-4 flex justify-between text-xs text-slate-500">
          <span>✅ {card.count_yes} apostaron Sí</span>
          <span>❌ {card.count_no} apostaron No</span>
        </div>
      </div>
    </TinderCard>
  );
}
