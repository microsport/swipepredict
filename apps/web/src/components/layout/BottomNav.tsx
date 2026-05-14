import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const tabs = [
  { to: '/', label: 'Inicio', emoji: '🏠' },
  { to: '/mis-apuestas', label: 'Mis Apuestas', emoji: '📋' },
  { to: '/perfil', label: 'Perfil', emoji: '👤' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex">
      {tabs.map(({ to, label, emoji }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            clsx('flex-1 flex flex-col items-center justify-center py-2 text-xs gap-1 transition-colors',
              isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300')
          }
        >
          <span className="text-xl">{emoji}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
