-- SwipePredict Database Schema
-- Run in Supabase SQL Editor

-- Users (extended from Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT UNIQUE NOT NULL,
    wallet_address TEXT,
    balance_usdc DECIMAL(12,6) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Cards (prediction events)
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id INTEGER NOT NULL,
    sport TEXT NOT NULL DEFAULT 'football',
    event_type TEXT NOT NULL,
    question_text TEXT NOT NULL,
    match_info TEXT NOT NULL,
    team_home TEXT NOT NULL,
    team_away TEXT NOT NULL,
    match_start_at TIMESTAMPTZ NOT NULL,
    odds_yes DECIMAL(6,2) NOT NULL DEFAULT 1.90,
    odds_no DECIMAL(6,2) NOT NULL DEFAULT 1.90,
    pool_yes DECIMAL(12,6) DEFAULT 0 NOT NULL,
    pool_no DECIMAL(12,6) DEFAULT 0 NOT NULL,
    count_yes INTEGER DEFAULT 0 NOT NULL,
    count_no INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open','locked','settled')),
    result BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_cards_status ON public.cards(status);
CREATE INDEX idx_cards_match_start ON public.cards(match_start_at);
CREATE INDEX idx_cards_sport ON public.cards(sport);

-- Public read access to cards
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cards are public" ON public.cards FOR SELECT USING (true);

-- Bets
CREATE TABLE IF NOT EXISTS public.bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('yes','no')),
    amount_usdc DECIMAL(12,6) NOT NULL,
    potential_win DECIMAL(12,6) NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending','won','lost','refunded')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, card_id)
);

CREATE INDEX idx_bets_user ON public.bets(user_id);
CREATE INDEX idx_bets_card ON public.bets(card_id);
CREATE INDEX idx_bets_status ON public.bets(status);

-- RLS for bets
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bets" ON public.bets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bets" ON public.bets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit','withdraw','bet','win','refund')),
    amount_usdc DECIMAL(12,6) NOT NULL,
    tx_signature TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_transactions_user ON public.transactions(user_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- Function: place_bet (atomic balance deduction + bet creation)
CREATE OR REPLACE FUNCTION public.place_bet(
    p_user_id UUID,
    p_card_id UUID,
    p_side TEXT,
    p_amount DECIMAL,
    p_potential_win DECIMAL
) RETURNS public.bets AS $$
DECLARE
    v_bet public.bets;
    v_balance DECIMAL;
BEGIN
    -- Lock user row and check balance
    SELECT balance_usdc INTO v_balance FROM public.users WHERE id = p_user_id FOR UPDATE;
    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Deduct balance
    UPDATE public.users SET balance_usdc = balance_usdc - p_amount WHERE id = p_user_id;

    -- Create bet
    INSERT INTO public.bets (user_id, card_id, side, amount_usdc, potential_win)
    VALUES (p_user_id, p_card_id, p_side, p_amount, p_potential_win)
    RETURNING * INTO v_bet;

    -- Update card pools
    IF p_side = 'yes' THEN
        UPDATE public.cards SET pool_yes = pool_yes + p_amount, count_yes = count_yes + 1 WHERE id = p_card_id;
    ELSE
        UPDATE public.cards SET pool_no = pool_no + p_amount, count_no = count_no + 1 WHERE id = p_card_id;
    END IF;

    -- Record transaction
    INSERT INTO public.transactions (user_id, type, amount_usdc) VALUES (p_user_id, 'bet', -p_amount);

    RETURN v_bet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
