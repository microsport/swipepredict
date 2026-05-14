import { createClient } from '@supabase/supabase-js';
import { calcOdds } from '@swipepredict/shared';
import { getLiveFixtures, getFixtureEvents, resolveEventResult } from './football.js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateResultDescription(questionText: string, result: boolean, goals: number): Promise<string> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Genera una descripción corta y emocionante en español mexicano del resultado de esta predicción de fútbol.
Pregunta: "${questionText}"
Resultado: ${result ? 'SÍ ocurrió' : 'NO ocurrió'}
Goles en el partido: ${goals}
Máximo 100 caracteres, usa emojis, tono festivo o dramático.`,
    }],
    max_tokens: 80,
    temperature: 0.9,
  });
  return res.choices[0].message.content ?? (result ? '¡Acertaste! 🎉' : 'No fue esta vez 😤');
}

export async function settleFinishedEvents(): Promise<void> {
  const liveFixtures = await getLiveFixtures();

  // Also check fixtures that started > 2h ago and are not settled
  const { data: pendingCards } = await supabase
    .from('cards')
    .select('*')
    .eq('status', 'open')
    .lt('match_start_at', new Date(Date.now() - 100 * 60 * 1000).toISOString()); // started 100min ago

  if (!pendingCards || pendingCards.length === 0) return;

  const liveIds = new Set(liveFixtures.map((f: any) => f.fixture.id));

  for (const card of pendingCards) {
    // Lock cards that are live (stop new bets)
    if (liveIds.has(card.match_id) && card.status === 'open') {
      await supabase.from('cards').update({ status: 'locked' }).eq('id', card.id);
      continue;
    }

    // Settle finished matches
    if (!liveIds.has(card.match_id)) {
      const events = await getFixtureEvents(card.match_id);
      const result = resolveEventResult(events, card.event_type, 0);
      if (result === null) continue;

      const goalsCount = events.filter((e: any) => e.type === 'Goal').length;
      const description = await generateResultDescription(card.question_text, result, goalsCount);

      // Settle card
      await supabase.from('cards').update({
        status: 'settled',
        result,
        question_text: `${card.question_text}\n\n${description}`,
      }).eq('id', card.id);

      // Pay winners
      const winningSide = result ? 'yes' : 'no';
      const winPool = result ? card.pool_yes : card.pool_no;
      const totalPool = card.pool_yes + card.pool_no;
      const payoutPool = totalPool * 0.95; // 5% commission

      const { data: winningBets } = await supabase
        .from('bets')
        .select('*')
        .eq('card_id', card.id)
        .eq('side', winningSide)
        .eq('status', 'pending');

      if (winningBets && winningBets.length > 0) {
        for (const bet of winningBets) {
          const winAmount = winPool > 0 ? (bet.amount_usdc / winPool) * payoutPool : 0;
          await supabase.from('users').update({
            balance_usdc: supabase.raw(`balance_usdc + ${winAmount}`),
          }).eq('id', bet.user_id);

          await supabase.from('bets').update({ status: 'won', potential_win: winAmount }).eq('id', bet.id);
          await supabase.from('transactions').insert({ user_id: bet.user_id, type: 'win', amount_usdc: winAmount });
        }
      }

      // Mark losing bets
      await supabase.from('bets')
        .update({ status: 'lost' })
        .eq('card_id', card.id)
        .eq('side', winningSide === 'yes' ? 'no' : 'yes')
        .eq('status', 'pending');

      // Recalculate and update odds on remaining open cards for same match
      const { data: openCards } = await supabase
        .from('cards')
        .select('*')
        .eq('match_id', card.match_id)
        .eq('status', 'open');

      if (openCards) {
        for (const oc of openCards) {
          const { oddsYes, oddsNo } = calcOdds(oc.pool_yes, oc.pool_no);
          await supabase.from('cards').update({ odds_yes: oddsYes, odds_no: oddsNo }).eq('id', oc.id);
        }
      }
    }
  }
}
