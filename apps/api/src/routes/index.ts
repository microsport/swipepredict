import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { calcOdds, calcPotentialWin, MIN_BET, MAX_BET } from '@swipepredict/shared';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function cardRoutes(app: FastifyInstance): Promise<void> {
  // GET /cards — feed with optional sport filter
  app.get<{ Querystring: { sport?: string; limit?: string; offset?: string } }>('/cards', async (req, reply) => {
    const { sport = 'football', limit = '20', offset = '0' } = req.query;

    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('sport', sport)
      .eq('status', 'open')
      .order('match_start_at', { ascending: true })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send(data);
  });

  // GET /cards/:id — single card with bet stats
  app.get<{ Params: { id: string } }>('/cards/:id', async (req, reply) => {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return reply.status(404).send({ error: 'Not found' });

    const { oddsYes, oddsNo } = calcOdds(data.pool_yes, data.pool_no);
    return reply.send({ ...data, odds_yes: oddsYes, odds_no: oddsNo });
  });

  // GET /cards/:id/winners — top winners for settled card
  app.get<{ Params: { id: string } }>('/cards/:id/winners', async (req, reply) => {
    const { data, error } = await supabase
      .from('bets')
      .select('amount_usdc, potential_win, side, status, users(nickname)')
      .eq('card_id', req.params.id)
      .eq('status', 'won')
      .order('potential_win', { ascending: false })
      .limit(50);

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send(data);
  });
}

export async function betRoutes(app: FastifyInstance): Promise<void> {
  // POST /bets — place a bet (requires auth)
  app.post<{ Body: { card_id: string; side: 'yes' | 'no'; amount_usdc: number } }>(
    '/bets',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { card_id, side, amount_usdc } = req.body;
      const user_id = req.user.id;

      if (amount_usdc < MIN_BET || amount_usdc > MAX_BET) {
        return reply.status(400).send({ error: `Bet must be between ${MIN_BET} and ${MAX_BET} USDC` });
      }
      if (!['yes', 'no'].includes(side)) {
        return reply.status(400).send({ error: 'Side must be yes or no' });
      }

      // Verify card is still open
      const { data: card } = await supabase.from('cards').select('*').eq('id', card_id).single();
      if (!card || card.status !== 'open') {
        return reply.status(400).send({ error: 'Card is not open for betting' });
      }

      const { oddsYes, oddsNo } = calcOdds(card.pool_yes, card.pool_no);
      const odds = side === 'yes' ? oddsYes : oddsNo;
      const potential_win = calcPotentialWin(amount_usdc, odds);

      // Atomic bet placement via DB function
      const { data, error } = await supabase.rpc('place_bet', {
        p_user_id: user_id,
        p_card_id: card_id,
        p_side: side,
        p_amount: amount_usdc,
        p_potential_win: potential_win,
      });

      if (error) return reply.status(400).send({ error: error.message });

      const { data: user } = await supabase.from('users').select('balance_usdc').eq('id', user_id).single();
      return reply.status(201).send({ bet: data, new_balance: user?.balance_usdc ?? 0 });
    }
  );

  // GET /bets/mine — user's bets
  app.get<{ Querystring: { status?: string } }>(
    '/bets/mine',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { status } = req.query;
      let query = supabase
        .from('bets')
        .select('*, cards(*)')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) return reply.status(500).send({ error: error.message });
      return reply.send(data);
    }
  );

  // PATCH /bets/:id/raise — raise stake on pending bet
  app.patch<{ Params: { id: string }; Body: { extra_amount: number } }>(
    '/bets/:id/raise',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { extra_amount } = req.body;
      if (extra_amount < MIN_BET) return reply.status(400).send({ error: 'Minimum raise is 0.10 USDC' });

      const { data: bet } = await supabase
        .from('bets')
        .select('*, cards(*)')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

      if (!bet || bet.status !== 'pending' || bet.cards.status !== 'open') {
        return reply.status(400).send({ error: 'Cannot raise this bet' });
      }

      const { data: card } = await supabase.from('cards').select('*').eq('id', bet.card_id).single();
      const { oddsYes, oddsNo } = calcOdds(card.pool_yes + (bet.side === 'yes' ? extra_amount : 0),
        card.pool_no + (bet.side === 'no' ? extra_amount : 0));
      const newOdds = bet.side === 'yes' ? oddsYes : oddsNo;
      const newTotal = bet.amount_usdc + extra_amount;
      const newPotential = calcPotentialWin(newTotal, newOdds);

      // Atomic via RPC reuse
      const { error: balErr } = await supabase.rpc('place_bet', {
        p_user_id: req.user.id,
        p_card_id: bet.card_id,
        p_side: bet.side,
        p_amount: extra_amount,
        p_potential_win: 0, // dummy, we update below
      });
      if (balErr) return reply.status(400).send({ error: balErr.message });

      await supabase.from('bets').update({
        amount_usdc: newTotal,
        potential_win: newPotential,
      }).eq('id', req.params.id);

      return reply.send({ amount_usdc: newTotal, potential_win: newPotential });
    }
  );
}

export async function walletRoutes(app: FastifyInstance): Promise<void> {
  // GET /wallet — balance + address
  app.get('/wallet', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { data, error } = await supabase
      .from('users')
      .select('balance_usdc, wallet_address')
      .eq('id', req.user.id)
      .single();

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send(data);
  });

  // GET /wallet/transactions
  app.get('/wallet/transactions', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send(data);
  });
}

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  // GET /profile
  app.get('/profile', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) return reply.status(500).send({ error: error.message });

    const { data: stats } = await supabase
      .from('bets')
      .select('status, amount_usdc, potential_win')
      .eq('user_id', req.user.id);

    const totalBets = stats?.length ?? 0;
    const won = stats?.filter(b => b.status === 'won').length ?? 0;
    const pnl = stats?.reduce((acc, b) => {
      if (b.status === 'won') return acc + (b.potential_win - b.amount_usdc);
      if (b.status === 'lost') return acc - b.amount_usdc;
      return acc;
    }, 0) ?? 0;

    return reply.send({ ...data, stats: { total_bets: totalBets, won, win_rate: totalBets > 0 ? won / totalBets : 0, pnl: parseFloat(pnl.toFixed(2)) } });
  });

  // PATCH /profile
  app.patch<{ Body: { nickname?: string; wallet_address?: string } }>(
    '/profile',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { nickname, wallet_address } = req.body;
      const updates: Record<string, string> = {};
      if (nickname) updates.nickname = nickname;
      if (wallet_address) updates.wallet_address = wallet_address;

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', (req.user as { id: string }).id)
        .select()
        .single();

      if (error) return reply.status(400).send({ error: error.message });
      return reply.send(data);
    }
  );
}
