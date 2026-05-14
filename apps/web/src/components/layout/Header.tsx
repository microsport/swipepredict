import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import clsx from 'clsx';

export function Header() {
  const { user, betAmount } = useStore();
  const balance = user?.balance_usdc ?? 0;
  const wouldBeAfter = balance - betAmount;
  const isLow = wouldBeAfter < betAmount;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 h-14 flex items-center justify-between">
      <span className="text-emerald-400 font-black text-lg tracking-tight">SwipePredict</span>
      <div className="flex items-center gap-2">
        <span className={clsx('font-bold text-sm tabular-nums', isLow ? 'text-rose-400' : 'text-white')}>
          💰 ${balance.toFixed(2)}
        </span>
        <Link
          to="/wallet"
          className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          +
        </Link>
      </div>
    </header>
  );
}
