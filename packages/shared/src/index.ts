export interface User {
  id: string;
  email: string;
  nickname: string;
  wallet_address: string | null;
  balance_usdc: number;
  created_at: string;
}

export interface Card {
  id: string;
  match_id: number;
  sport: Sport;
  event_type: EventType;
  question_text: string;
  match_info: string;
  team_home: string;
  team_away: string;
  match_start_at: string;
  odds_yes: number;
  odds_no: number;
  pool_yes: number;
  pool_no: number;
  count_yes: number;
  count_no: number;
  status: CardStatus;
  result: boolean | null;
  created_at: string;
}

export interface Bet {
  id: string;
  user_id: string;
  card_id: string;
  side: 'yes' | 'no';
  amount_usdc: number;
  potential_win: number;
  status: BetStatus;
  created_at: string;
  card?: Card;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount_usdc: number;
  tx_signature: string | null;
  created_at: string;
}

export type Sport = 'football' | 'basketball' | 'tennis' | 'baseball';
export type CardStatus = 'open' | 'locked' | 'settled';
export type BetStatus = 'pending' | 'won' | 'lost' | 'refunded';
export type TransactionType = 'deposit' | 'withdraw' | 'bet' | 'win' | 'refund';

export type EventType =
  | 'goal_first_half'
  | 'goal_second_half'
  | 'goal_both_teams'
  | 'card_before_30'
  | 'first_goal_home'
  | 'first_goal_away'
  | 'over_2_5_goals'
  | 'corner_over_9'
  | 'penalty'
  | 'clean_sheet_home'
  | 'clean_sheet_away';

export interface PlaceBetRequest {
  card_id: string;
  side: 'yes' | 'no';
  amount_usdc: number;
}

export interface PlaceBetResponse {
  bet: Bet;
  new_balance: number;
}

export const COMMISSION_RATE = 0.05;
export const MIN_BET = 0.1;
export const MAX_BET = 100;
export const DEFAULT_BET = 0.5;

export const SPORTS: { id: Sport; label: string; emoji: string; available: boolean }[] = [
  { id: 'football', label: 'Fútbol', emoji: '⚽', available: true },
  { id: 'basketball', label: 'Basket', emoji: '🏀', available: false },
  { id: 'tennis', label: 'Tenis', emoji: '🎾', available: false },
  { id: 'baseball', label: 'Béisbol', emoji: '⚾', available: false },
];

export function calcOdds(poolYes: number, poolNo: number): { oddsYes: number; oddsNo: number } {
  const total = poolYes + poolNo;
  if (total === 0) return { oddsYes: 1.9, oddsNo: 1.9 };
  const payout = total * (1 - COMMISSION_RATE);
  return {
    oddsYes: poolYes > 0 ? parseFloat((payout / poolYes).toFixed(2)) : 1.9,
    oddsNo: poolNo > 0 ? parseFloat((payout / poolNo).toFixed(2)) : 1.9,
  };
}

export function calcPotentialWin(amount: number, odds: number): number {
  return parseFloat((amount * odds).toFixed(2));
}
