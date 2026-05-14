import { create } from 'zustand';
import { User, Card, Bet, Sport, DEFAULT_BET } from '@swipepredict/shared';
import { supabase, apiFetch } from '../lib/supabase';

interface AppState {
  user: User | null;
  cards: Card[];
  myBets: Bet[];
  selectedSport: Sport;
  betAmount: number;
  loading: boolean;

  setUser: (u: User | null) => void;
  setCards: (cards: Card[]) => void;
  setMyBets: (bets: Bet[]) => void;
  setSelectedSport: (s: Sport) => void;
  setBetAmount: (a: number) => void;
  setLoading: (l: boolean) => void;

  fetchCards: () => Promise<void>;
  fetchMyBets: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  placeBet: (cardId: string, side: 'yes' | 'no') => Promise<void>;
  removeCard: (cardId: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  cards: [],
  myBets: [],
  selectedSport: 'football',
  betAmount: DEFAULT_BET,
  loading: false,

  setUser: (user) => set({ user }),
  setCards: (cards) => set({ cards }),
  setMyBets: (myBets) => set({ myBets }),
  setSelectedSport: (selectedSport) => set({ selectedSport }),
  setBetAmount: (betAmount) => set({ betAmount }),
  setLoading: (loading) => set({ loading }),

  fetchCards: async () => {
    const { selectedSport } = get();
    const data = await apiFetch<Card[]>(`/cards?sport=${selectedSport}&limit=30`);
    set({ cards: data });
  },

  fetchMyBets: async () => {
    const data = await apiFetch<Bet[]>('/bets/mine');
    set({ myBets: data });
  },

  fetchProfile: async () => {
    const data = await apiFetch<User>('/profile');
    set({ user: data });
  },

  placeBet: async (cardId, side) => {
    const { betAmount, user } = get();
    if (!user) return;
    const res = await apiFetch<{ bet: Bet; new_balance: number }>('/bets', {
      method: 'POST',
      body: JSON.stringify({ card_id: cardId, side, amount_usdc: betAmount }),
    });
    set({ user: { ...user, balance_usdc: res.new_balance } });
    get().removeCard(cardId);
  },

  removeCard: (cardId) =>
    set((state) => ({ cards: state.cards.filter((c) => c.id !== cardId) })),
}));
