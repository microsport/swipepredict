import OpenAI from 'openai';
import { EventType, calcOdds } from '@swipepredict/shared';
import { createClient } from '@supabase/supabase-js';
import { getUpcomingFixtures } from './football.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const EVENT_TYPES: EventType[] = [
  'goal_first_half',
  'goal_both_teams',
  'first_goal_home',
  'card_before_30',
  'over_2_5_goals',
  'penalty',
];

interface CardTemplate {
  event_type: EventType;
  question_text: string;
}

async function generateCardTexts(teamHome: string, teamAway: string, eventTypes: EventType[]): Promise<CardTemplate[]> {
  const prompt = `Genera preguntas cortas en español para una app de predicciones de fútbol.
Partido: ${teamHome} vs ${teamAway}
Genera una pregunta por cada tipo de evento. Responde SOLO con JSON array.

Tipos de eventos:
${eventTypes.map(t => `- ${t}`).join('\n')}

Formato de respuesta:
[{"event_type": "goal_first_half", "question_text": "¿${teamHome} marcará en la primera mitad? ⚽"}]

Reglas:
- Máximo 60 caracteres
- Tono conversacional mexicano
- Incluye emoji relevante al final`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 500,
  });

  const content = res.choices[0].message.content ?? '{"cards":[]}';
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : (parsed.cards ?? []);
  } catch {
    return [];
  }
}

export async function generateCardsForUpcomingMatches(): Promise<number> {
  const fixtures = await getUpcomingFixtures(262, 5); // Liga MX, next 5 matches
  let created = 0;

  for (const fixture of fixtures) {
    // Check if cards already exist for this match
    const { data: existing } = await supabase
      .from('cards')
      .select('id')
      .eq('match_id', fixture.fixture.id)
      .limit(1);

    if (existing && existing.length > 0) continue;

    const teamHome = fixture.teams.home.name;
    const teamAway = fixture.teams.away.name;
    const matchInfo = `${teamHome} vs ${teamAway} • ${new Date(fixture.fixture.date).toLocaleString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`;

    // Pick 3 random event types per match
    const selectedTypes = EVENT_TYPES.sort(() => Math.random() - 0.5).slice(0, 3);
    const templates = await generateCardTexts(teamHome, teamAway, selectedTypes);

    for (const template of templates) {
      const { oddsYes, oddsNo } = calcOdds(0, 0); // Initial balanced odds
      const { error } = await supabase.from('cards').insert({
        match_id: fixture.fixture.id,
        sport: 'football',
        event_type: template.event_type,
        question_text: template.question_text,
        match_info: matchInfo,
        team_home: teamHome,
        team_away: teamAway,
        match_start_at: fixture.fixture.date,
        odds_yes: oddsYes,
        odds_no: oddsNo,
      });

      if (!error) created++;
    }
  }

  return created;
}
