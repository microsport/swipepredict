import React, { useEffect } from 'react';
import { useStore } from '../lib/store';
import { SwipeCard } from '../components/cards/SwipeCard';
import { SPORTS } from '@swipepredict/shared';
import clsx from 'clsx';

export function HomePage() {
  const { cards, fetchCards, selectedSport, setSelectedSport, loading, setLoading } = useStore();

  useEffect(() => {
    setLoading(true);
    fetchCards().finally(() => setLoading(false));
  }, [selectedSport]);

  return (
    <div className="flex flex-col h-full">
      {/* Sport filter */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none mt-14">
        {SPORTS.map(sport => (
          <button
            key={sport.id}
            onClick={() => sport.available && setSelectedSport(sport.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              sport.available
                ? selectedSport === sport.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
            )}
          >
            <span>{sport.emoji}</span>
            <span>{sport.label}</span>
            {!sport.available && <span className="text-xs text-slate-600 ml-1">Pronto</span>}
          </button>
        ))}
      </div>

      {/* Card stack */}
      <div className="flex-1 flex items-center justify-center relative pb-20">
        {loading && (
          <div className="text-slate-400 text-sm animate-pulse">Cargando eventos...</div>
        )}

        {!loading && cards.length === 0 && (
          <div className="text-center text-slate-500 px-8">
            <div className="text-4xl mb-3">⚽</div>
            <p className="font-semibold text-slate-300">No hay eventos disponibles</p>
            <p className="text-sm mt-1">Vuelve pronto para nuevas predicciones</p>
          </div>
        )}

        {!loading && cards.length > 0 && (
          <div className="relative w-80 h-[480px]">
            {/* Render bottom 2 cards as background stack */}
            {cards.slice(1, 3).reverse().map((card, i) => (
              <div
                key={card.id}
                className="absolute inset-0 pointer-events-none"
                style={{ transform: `scale(${0.95 - i * 0.03}) translateY(${(i + 1) * 8}px)`, opacity: 0.5 - i * 0.15 }}
              >
                <div className="w-full h-full rounded-2xl bg-slate-800 border border-slate-700" />
              </div>
            ))}
            {/* Top card (swipeable) */}
            <SwipeCard card={cards[0]} isTop={true} />
          </div>
        )}
      </div>
    </div>
  );
}
